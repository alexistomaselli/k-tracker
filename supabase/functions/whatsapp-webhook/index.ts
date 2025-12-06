import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const N8N_TRANSCRIPTION_WEBHOOK_URL = Deno.env.get('N8N_TRANSCRIPTION_WEBHOOK_URL') || 'https://kai-pro-n8n.3znlkb.easypanel.host/webhook/transcribe'
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || 'https://kai-pro-evolution-api.3znlkb.easypanel.host'
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook Payload:', JSON.stringify(payload))

    let userId = ''
    let userMessage = ''
    let userName = ''
    let instanceNameFromPayload = ''
    let remoteJid = ''
    let phone = ''
    let messageType = 'text' // Default

    // 1. Check for Standardized Payload (from n8n)
    if (payload.userId && payload.text) {
      console.log('Received Standardized Payload from n8n')
      userId = payload.userId
      userMessage = payload.text
      userName = payload.name || 'Usuario'

      // Map standardized fields to legacy variables used downstream
      remoteJid = userId
      phone = remoteJid.split('@')[0]

      // Try to get instance from originalPayload if available, or top level
      if (payload.originalPayload) {
        instanceNameFromPayload = payload.originalPayload.instance || payload.originalPayload.data?.instance || ''
      }
      if (!instanceNameFromPayload) {
        instanceNameFromPayload = payload.instance || ''
      }

    }
    // 2. Fallback: Legacy Evolution API Parsing (Direct Webhook)
    else if (payload.data && payload.data.key) {
      console.log('Received Direct Evolution API Payload')
      const { data } = payload

      // Robustly extract instance name
      instanceNameFromPayload = payload.instance || payload.data?.instance || payload.instanceName || ''

      remoteJid = data.key.remoteJid
      phone = remoteJid.split('@')[0]
      userName = data.pushName || 'Usuario'
      messageType = data.messageType

      if (messageType === 'conversation') {
        userMessage = data.message.conversation
      } else if (messageType === 'extendedTextMessage') {
        userMessage = data.message.extendedTextMessage.text
      } else if (messageType === 'audioMessage') {
        console.log('Audio message received directly. Please update Evolution API Webhook URL to point to n8n.')
        userMessage = 'SISTEMA: Por favor actualiza la URL del Webhook en Evolution API para procesar audios.'
      }
    } else {
      console.log('Unknown payload format')
      return new Response('Unknown payload', { status: 400 })
    }

    console.log(`Processing message from ${userName} (${userId}): "${userMessage}"`)

    if (!userMessage) {
      console.log('No text content found. Skipping.')
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
      const messageId = payload.originalPayload?.data?.key?.id || payload.data?.key?.id || ''
      await sendWhatsAppMessage(remoteJid, debugInfo, instanceNameFromPayload, messageId)
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
          company_id: (extraMetadata?.company_id),
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
      .select('*, company(*)')
      .or(orQuery)
      .single()

    if (userError || !participant) {
      console.log('User not found:', phone, userError)

      // Log failure
      await logToDB('unauthorized', userError ? userError.message : 'User not found', { candidates, userError })

      // Check if we should reply to unknown users
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
      const messageId = payload.originalPayload?.data?.key?.id || payload.data?.key?.id || ''
      await sendWhatsAppMessage(remoteJid, "Lo siento, no estás registrado en K-Tracker. Contacta a tu administrador.", instanceNameFromPayload, messageId)
      return new Response(JSON.stringify({ status: 'unauthorized' }), { headers: { "Content-Type": "application/json" } })
    }

    const user = participant
    const company = user.company
    const role = user.role === 'admin' ? 'admin' : 'participant'
    const instanceName = company.evolution_instance_name

    // Log success identification
    await logToDB('processing', 'User identified', { role, company_id: company.id })

    // 4. Define System Prompt & Tools
    const systemPrompt = role === 'admin'
      ? `You are K-Tracker Admin Assistant for ${user.first_name}. You manage projects for ${company.name}.
             Capabilities: Query ALL projects, create tasks, check overdue items.
             Current Date: ${new Date().toISOString()}`
      : `You are K-Tracker Assistant for ${user.first_name}. You work at ${company.name}.
             Capabilities:
              - List YOUR tasks (MUST show Status, Priority, Due Date).
              - Use 🚨 if the task is OVERDUE (Due Date < Today).
              - Use ⚠️ if the task is DUE SOON (Due Date is within the next 3 days).
              - For 'available' or 'my tasks' queries, ALWAYS filter by status='pending,in_progress' unless the user explicitly asks for history or completed tasks.
             - Update YOUR task status.
             - Add comments to tasks.
             - List projects you are in (Read-only).
             - List minutes you attended (Read-only).
             
             IMPORTANT: If the user asks to modify a task (comment/status) by NAME, use the 'get_tasks' tool with the 'search' parameter to find it first. DO NOT ask for an ID. Find the ID yourself.
             
             TONE AND STYLE:
             - Be concise and human-like.
             - Do NOT be repetitive. Do NOT repeat the full content of what you just did (e.g., if adding a comment, just say "Listo, comentario agregado" or "Registrado", do NOT repeat the comment text).
             - Use natural language, like a helpful colleague.
             
             Current Date: ${new Date().toISOString()}`

    const tools = [
      {
        type: "function",
        function: {
          name: "get_tasks",
          description: "Get tasks. Admins see all. Participants see theirs. Returns status and due_date. Use 'search' to find by name.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Status filter. Can be a single status or comma-separated (e.g., 'pending,in_progress'). Enum values: pending, in_progress, completed, blocked" },
              project_id: { type: "string" },
              search: { type: "string", description: "Search term for task title (fuzzy match)" }
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
              task_id: { type: "string", description: "The ID of the task" },
              status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] },
              notes: { type: "string", description: "Optional notes" }
            },
            required: ["task_id", "status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_task_comment",
          description: "Add a text comment to a task.",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              content: { type: "string" }
            },
            required: ["task_id", "content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_my_projects",
          description: "List projects the user is participating in.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "get_my_minutes",
          description: "List minutes the user attended.",
          parameters: { type: "object", properties: {} }
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

    // 5. Agentic Loop (Multi-step tool execution)
    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]

    let finalResponseText = ""
    let iterations = 0
    const MAX_ITERATIONS = 5

    while (iterations < MAX_ITERATIONS) {
      iterations++
      console.log(`Iteration ${iterations}: Calling OpenAI...`)

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
      })

      const responseMessage = completion.choices[0].message

      // If no tool calls, we are done. The model has generated the final response.
      if (!responseMessage.tool_calls) {
        finalResponseText = responseMessage.content
        break
      }

      // If there are tool calls, execute them and continue the loop
      messages.push(responseMessage) // Add the assistant's tool call message to history
      const toolCalls = responseMessage.tool_calls

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)
        let functionResult = ""

        console.log(`Calling tool: ${functionName}`, functionArgs)

        try {
          if (functionName === "get_tasks") {
            let query = supabase.from('tasks').select('*, project(name), participants(first_name)')

            if (role !== 'admin') {
              query = query.eq('assignee_id', user.id)
            }
            if (functionArgs.status) {
              if (functionArgs.status.includes(',')) {
                const statuses = functionArgs.status.split(',').map((s: string) => s.trim())
                query = query.in('status', statuses)
              } else {
                query = query.eq('status', functionArgs.status)
              }
            }
            if (functionArgs.project_id) query = query.eq('project_id', functionArgs.project_id)
            if (functionArgs.search) query = query.ilike('description', `%${functionArgs.search}%`)

            const { data: tasks, error } = await query.limit(5)
            if (error) functionResult = `Error: ${error.message}`
            else functionResult = JSON.stringify(tasks)
          }
          else if (functionName === "add_task_comment") {
            if (!user.user_id) {
              functionResult = "Error: User not linked to an account for comments."
            } else {
              const { error } = await supabase
                .from('task_comments')
                .insert({
                  task_id: functionArgs.task_id,
                  content: functionArgs.content,
                  user_id: user.user_id,
                  company_id: company.id
                })
              if (error) functionResult = `Error adding comment: ${error.message}`
              else functionResult = "Comment added successfully."
            }
          }
          else if (functionName === "get_my_projects") {
            const { data, error } = await supabase
              .from('project_participants')
              .select('project(*)')
              .eq('participant_id', user.id)

            if (error) functionResult = `Error: ${error.message}`
            else functionResult = JSON.stringify(data.map((d: any) => d.project))
          }
          else if (functionName === "get_my_minutes") {
            const { data, error } = await supabase
              .from('minute_attendance')
              .select('minutes(*)')
              .eq('participant_id', user.id)

            if (error) functionResult = `Error: ${error.message}`
            else functionResult = JSON.stringify(data.map((d: any) => d.minutes))
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
                  description: functionArgs.title,
                  project_id: functionArgs.project_id,
                  assignee_id: functionArgs.assignee_id,
                  status: 'pending',
                  company_id: company.id
                })
                .select()

              if (error) functionResult = `Error creating task: ${error.message}`
              else functionResult = `Task created: ${newTask[0].description}`
            }
          } else {
            functionResult = "Error: Tool not found"
          }
        } catch (err: any) {
          functionResult = `Error executing tool: ${err.message}`
        }

        // Add tool result to messages
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResult,
        } as any)
      }
    } // End of while loop

    // Send the final response to WhatsApp
    if (finalResponseText) {
      const messageId = payload.originalPayload?.data?.key?.id || payload.data?.key?.id || ''
      await sendWhatsAppMessage(remoteJid, finalResponseText, instanceNameFromPayload, messageId)

      // Log success
      await logToDB('replied', 'Response sent', { role, company_id: company.id })
    } else {
      // Fallback if loop finished without text (unlikely but possible)
      await sendWhatsAppMessage(remoteJid, "Lo siento, no pude procesar tu solicitud.", instanceName)
      await logToDB('error', 'No final response generated', { company_id: company.id })
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

async function markAsRead(remoteJid: string, instanceName: string, messageId: string) {
  const url = `${EVOLUTION_API_URL}/chat/markMessageAsRead/${instanceName}`
  const body = {
    readMessages: [
      {
        remoteJid: remoteJid,
        fromMe: false,
        id: messageId
      }
    ]
  }

  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error('Error marking as read:', error)
  }
}

async function sendPresence(remoteJid: string, instanceName: string) {
  const url = `${EVOLUTION_API_URL}/chat/sendPresence/${instanceName}`
  const body = {
    number: remoteJid,
    presence: "composing",
    delay: 1200 // Internal Evolution delay, we handle main delay in code
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error('Error sending presence:', error)
  }
}

async function sendWhatsAppMessage(remoteJid: string, text: string, instanceName: string, messageId: string) {
  if (!instanceName) {
    console.error('No instance name provided for reply')
    return
  }

  // 1. Mark as Read (Blue Ticks)
  if (messageId) {
    await markAsRead(remoteJid, instanceName, messageId)
  }

  // 2. Send "Typing..." status immediately
  await sendPresence(remoteJid, instanceName)

  // 3. Calculate dynamic delay based on text length
  // 80ms per character, min 4s, max 25s
  const delay = Math.min(Math.max(text.length * 80, 4000), 25000)

  // 4. Wait for the calculated delay
  await new Promise(resolve => setTimeout(resolve, delay))

  // 5. Send the actual message
  const url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`
  const body = {
    number: remoteJid,
    options: {
      linkPreview: false
    },
    text: text,
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
