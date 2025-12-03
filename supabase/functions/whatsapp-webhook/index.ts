import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || 'https://kai-pro-evolution-api.3znlkb.easypanel.host'
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook Payload:', JSON.stringify(payload))

    // Robustly extract instance name
    const instanceNameFromPayload = payload.instance || payload.data?.instance || payload.instanceName || ''

    const { data } = payload

    // 1. Extract Basic Info
    const remoteJid = data.key.remoteJid
    const phone = remoteJid.split('@')[0]
    const messageType = data.messageType
    let userMessage = ''

    // 2. Handle Audio vs Text
    if (messageType === 'audioMessage') {
      const audioUrl = data.message.audioMessage.url
      console.log(`Downloading audio from: ${audioUrl}`)

      // Download Audio
      const audioResponse = await fetch(audioUrl)
      const audioBlob = await audioResponse.blob()
      const audioFile = new File([audioBlob], "voice.mp3", { type: "audio/mp3" })

      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      })
      userMessage = transcription.text
      console.log(`Transcribed text: ${userMessage}`)
    } else {
      userMessage = data.message.conversation || data.message.extendedTextMessage?.text || ''
    }

    if (!userMessage) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no text found' }), { headers: { "Content-Type": "application/json" } })
    }

    // 3. Identify User & Role
    // Generate potential phone number formats to match against DB
    const candidates = [phone, `+${phone}`]

    // Special handling for Argentina (54) - WhatsApp adds a 9 after 54 for mobiles
    if (phone.startsWith('549') && phone.length > 10) {
      const withoutNine = '54' + phone.substring(3)
      candidates.push(withoutNine)
      candidates.push(`+${withoutNine}`)
    }

    // Construct OR query
    const orQuery = candidates.map(c => `phone.eq.${c}`).join(',')

    const { data: participant, error: userError } = await supabase
      .from('participants')
      .select('*, companies(*)')
      .or(orQuery)
      .single()

    if (userError || !participant) {
      console.log('User not found:', phone)

      // Check if we should reply to unknown users
      // We need to find the company associated with this instance to know the setting.
      // Since we don't have the company ID from the user, we must rely on the instance name.
      // But wait, the instance name is unique to the company.
      // So we can query the company by instance name.

      if (instanceNameFromPayload) {
        const { data: companyData } = await supabase
          .from('company')
          .select('bot_unknown_reply_enabled')
          .eq('evolution_instance_name', instanceNameFromPayload)
          .single()

        if (companyData && companyData.bot_unknown_reply_enabled === false) {
          console.log('Bot is in Human Mode (Silent) for unknown users. Ignoring.')
          return new Response(JSON.stringify({ status: 'ignored', reason: 'human_mode' }), { headers: { "Content-Type": "application/json" } })
        }
      }

      await sendWhatsAppMessage(remoteJid, "Lo siento, no estás registrado en K-Tracker. Contacta a tu administrador.", instanceNameFromPayload)
      return new Response(JSON.stringify({ status: 'unauthorized' }), { headers: { "Content-Type": "application/json" } })
    }

    const user = participant
    const company = user.companies
    const role = user.role === 'admin' ? 'admin' : 'participant'
    const instanceName = company.evolution_instance_name

    // 4. Define System Prompt & Tools
    const systemPrompt = role === 'admin'
      ? `You are K-Tracker Admin Assistant for ${user.first_name}. You manage projects for ${company.name}.
         Capabilities: Query ALL projects, create tasks, check overdue items.
         Current Date: ${new Date().toISOString()}`
      : `You are K-Tracker Assistant for ${user.first_name}. You work at ${company.name}.
         Capabilities: List YOUR tasks, update YOUR task status, report blockers.
         Current Date: ${new Date().toISOString()}`

    const tools = [
      {
        type: "function",
        function: {
          name: "get_projects",
          description: "Get a list of all projects in the company.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "get_my_tasks",
          description: "Get tasks assigned to the current user (pending/in_progress).",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a new task in a project.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              project_id: { type: "string" },
              description: { type: "string" },
              assigned_to: { type: "string", description: "User ID to assign to" }
            },
            required: ["title", "project_id"]
          }
        }
      }
    ]

    // 5. AI Execution Loop
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      tools: tools as any,
      tool_choice: "auto",
    })

    const responseMessage = completion.choices[0].message
    let finalReply = responseMessage.content

    // 6. Handle Tool Calls
    if (responseMessage.tool_calls) {
      messages.push(responseMessage as any) // Add assistant's tool call request to history

      for (const toolCall of responseMessage.tool_calls) {
        const fnName = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)
        let toolResult = ''

        console.log(`Executing tool: ${fnName}`)

        if (fnName === 'get_projects') {
          const { data: projects } = await supabase.from('projects').select('*').eq('company_id', company.id).limit(5)
          toolResult = JSON.stringify(projects)
        } else if (fnName === 'get_my_tasks') {
          const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', user.user_id).neq('status', 'completed').limit(5)
          toolResult = JSON.stringify(tasks)
        } else if (fnName === 'create_task') {
          // Admin only check could be here
          const { data: newTask, error } = await supabase.from('tasks').insert({
            ...args,
            company_id: company.id,
            status: 'pending',
            created_by: user.user_id
          }).select().single()
          toolResult = error ? `Error: ${error.message}` : `Task created: ${newTask.id}`
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        })
      }

      // 7. Get Final Answer after Tool Execution
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
      })
      finalReply = secondResponse.choices[0].message.content
    }

    // 8. Send WhatsApp Reply
    if (finalReply) {
      await sendWhatsAppMessage(remoteJid, finalReply, instanceName)
    }

    return new Response(JSON.stringify({ status: 'success' }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})

async function sendWhatsAppMessage(remoteJid: string, text: string, instanceName: string) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: remoteJid,
      text: text
    })
  })
}
