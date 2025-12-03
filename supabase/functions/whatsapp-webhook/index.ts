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

    // DEBUG MODE: Reply with debug info if message is "debug"
    if (userMessage.trim().toLowerCase() === 'debug') {
      const candidates = [phone, `+${phone}`]
      if (phone.startsWith('549') && phone.length > 10) {
        const withoutNine = '54' + phone.substring(3)
        candidates.push(withoutNine)
        candidates.push(`+${withoutNine}`)
      }
      const debugInfo = `Debug Info:\nRemoteJid: ${remoteJid}\nPhone: ${phone}\nCandidates: ${JSON.stringify(candidates)}\nInstance: ${instanceNameFromPayload}`
      await sendWhatsAppMessage(remoteJid, debugInfo, instanceNameFromPayload)
      return new Response(JSON.stringify({ status: 'debug_replied' }), { headers: { "Content-Type": "application/json" } })
    }

    // Helper to log to DB
    const logToDB = async (status: string, details?: string, extraMetadata?: any) => {
      try {
        const { error } = await supabase.from('whatsapp_logs').insert({
          instance_name: instanceNameFromPayload,
          remote_jid: remoteJid,
          phone: phone,
          message_content: userMessage,
          status,
          error_details: details,
          company_id: (extraMetadata?.company_id || company?.id),
          participant_id: participant?.id,
          metadata: {
            messageType,
            candidates: extraMetadata?.candidates,
            ...extraMetadata
          }
        })
        if (error) console.error('Supabase Insert Error:', error)
      } catch (err) {
        console.error('Failed to log to DB:', err)
      }
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

    // Construct OR query with URL encoding for special chars like '+'
    const orQuery = candidates.map(c => `phone.eq.${encodeURIComponent(c)}`).join(',')

    const { data: participant, error: userError } = await supabase
      .from('participants')
      .select('*, companies(*)')
      .or(orQuery)
      .single()

    if (userError || !participant) {
      console.log('User not found:', phone, userError)

      // Log failure
      await logToDB('unauthorized', userError ? userError.message : 'User not found', { candidates, userError })

      // Check if we should reply to unknown users
      // We need to find the company associated with this instance to know the setting.
      // Since we don't have the company ID from the user, we must rely on the instance name.
      // But wait, the instance name is unique to the company.
      // So we can query the company by instance name.

      if (instanceNameFromPayload) {
        const { data: companyData } = await supabase
          .from('company')
          .select('bot_unknown_reply_enabled, id')
          .eq('evolution_instance_name', instanceNameFromPayload)
          .single()

        if (companyData && companyData.bot_unknown_reply_enabled === false) {
          console.log('Bot is in Human Mode (Silent) for unknown users. Ignoring.')
          await logToDB('ignored', 'Human Mode enabled for unknown user', { company_id: companyData.id })
          return new Response(JSON.stringify({ status: 'ignored', reason: 'human_mode' }), { headers: { "Content-Type": "application/json" } })
        }
      }

      // Append debug info to the message for visibility
      const debugMsg = `\n\n(Debug: Buscamos: ${candidates.join(', ')}. Error: ${userError?.message || 'None'})`
      await sendWhatsAppMessage(remoteJid, "Lo siento, no estás registrado en K-Tracker. Contacta a tu administrador." + debugMsg, instanceNameFromPayload)
      return new Response(JSON.stringify({ status: 'unauthorized' }), { headers: { "Content-Type": "application/json" } })
    }

    const user = participant
    const company = user.companies
    const role = user.role === 'admin' ? 'admin' : 'participant'
    const instanceName = company.evolution_instance_name

    // Log success identification
    await logToDB('processing', 'User identified', { role })

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
          name: "get_tasks",
          description: "Get tasks. Admins see all project tasks. Participants see only their assigned tasks.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] },
              project_id: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_task_status",
          description: "Update a task's status.",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "The ID of the task to update" },
              status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] },
              notes: { type: "string", description: "Optional notes about the update" }
            },
            required: ["task_id", "status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a new task (Admin only).",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              project_id: { type: "string" },
              assignee_id: { type: "string" },
              description: { type: "string" }
            },
            required: ["title", "project_id"]
          }
        }
      }
    ]

    // 5. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      tools: tools,
      tool_choice: "auto",
    })

    const responseMessage = completion.choices[0].message

    // 6. Handle Tool Calls
    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls
      let finalResponseText = ""

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)
        let functionResult = ""

        console.log(`Calling tool: ${functionName}`, functionArgs)

        if (functionName === "get_tasks") {
          let query = supabase.from('tasks').select('*, projects(name), participants(first_name)')

          if (role !== 'admin') {
            query = query.eq('assigned_to', user.id)
          }
          if (functionArgs.status) query = query.eq('status', functionArgs.status)
          if (functionArgs.project_id) query = query.eq('project_id', functionArgs.project_id)

          const { data: tasks, error } = await query.limit(5)
          if (error) functionResult = `Error: ${error.message}`
          else functionResult = JSON.stringify(tasks)
        }
        else if (functionName === "update_task_status") {
          const { error } = await supabase
            .from('tasks')
            .update({ status: functionArgs.status })
            .eq('id', functionArgs.task_id)

          if (error) functionResult = `Error updating task: ${error.message}`
          else functionResult = `Task status updated to ${functionArgs.status}`
        }
        else if (functionName === "create_task") {
          if (role !== 'admin') {
            functionResult = "Error: Only admins can create tasks."
          } else {
            const { data: newTask, error } = await supabase
              .from('tasks')
              .insert({
                title: functionArgs.title,
                project_id: functionArgs.project_id,
                assigned_to: functionArgs.assignee_id,
                description: functionArgs.description,
                status: 'pending',
                company_id: company.id
              })
              .select()

            if (error) functionResult = `Error creating task: ${error.message}`
            else functionResult = `Task created: ${newTask[0].title}`
          }
        }

        // Second call to OpenAI with tool result
        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
            responseMessage,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResult,
            },
          ],
        })

        finalResponseText += secondResponse.choices[0].message.content + "\n"
      }

      await sendWhatsAppMessage(remoteJid, finalResponseText, instanceName)
      await logToDB('success', 'Tool executed and replied', { toolCalls: responseMessage.tool_calls })

    } else {
      // Regular response
      const reply = responseMessage.content
      await sendWhatsAppMessage(remoteJid, reply, instanceName)
      await logToDB('success', 'Replied with text')
    }

    return new Response(JSON.stringify({ status: 'success' }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error('Error:', error)
    // Try to log error to DB if possible (might fail if payload parsing failed)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from('whatsapp_logs').insert({
        status: 'error',
        error_details: error.message || String(error),
        metadata: { stack: error.stack }
      })
    } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})

async function sendWhatsAppMessage(remoteJid: string, text: string, instanceName: string) {
  if (!instanceName) {
    console.error('No instance name provided for reply')
    return
  }

  const url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`
  const body = {
    number: remoteJid,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: false
    },
    textMessage: {
      text: text
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    })
    const data = await response.json()
    console.log('WhatsApp Reply Sent:', data)
  } catch (error) {
    console.error('Error sending WhatsApp reply:', error)
  }
}
