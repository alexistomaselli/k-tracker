/// <reference lib="deno.ns" />
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import OpenAI from 'npm:openai@4.24.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const N8N_TRANSCRIPTION_WEBHOOK_URL = Deno.env.get('N8N_TRANSCRIPTION_WEBHOOK_URL') || 'https://kai-pro-n8n.3znlkb.easypanel.host/webhook/whatsapp-bot'
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  try {
    const payload: any = await req.json()
    console.log('Webhook Payload:', JSON.stringify(payload))

    // FETCH PLATFORM SETTINGS
    const { data: allSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['evolution_api_url', 'openai_api_key'])

    const evolutionApiUrl = allSettings?.find((s: any) => s.key === 'evolution_api_url')?.value || Deno.env.get('EVOLUTION_API_URL') || 'https://kai-pro-evolution-api.3znlkb.easypanel.host'
    const dbOpenAiKey = allSettings?.find((s: any) => s.key === 'openai_api_key')?.value || OPENAI_API_KEY

    // Initialize OpenAI with the best available key for this request
    const openai = new OpenAI({ apiKey: dbOpenAiKey })


    let userId = ''
    let userMessage = ''
    let userName = ''
    let instanceNameFromPayload = ''
    let remoteJid = ''
    let phone = ''
    let messageType = 'text' // Default
    let attachments: any[] = []

    // 1. Check for Standardized Payload (from n8n)
    if (payload.userId && payload.text) {
      console.log('Received Standardized Payload from n8n')
      userId = payload.userId
      userMessage = payload.text
      userName = payload.name || 'Usuario'
      attachments = payload.attachments || []

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

      // ROUTER LOGIC: Forward Media (Audio) to n8n
      if (messageType === 'audioMessage') {
        console.log(`Processing ${messageType} for n8n forwarding...`)

        // 1. Check if Base64 is present. If not, FETCH IT using Evolution API.
        // We reuse the existing fetch helper which hits /chat/getBase64FromMediaMessage
        let base64Data = payload.data?.message?.audioMessage?.base64 || payload.data?.base64

        if (!base64Data) {
          console.log('Audio Base64 missing in payload. Fetching from Evolution API...')
          try {
            // Evolution API expects the full data object or message object depending on version, 
            // but our helper sends payload.data which works.
            base64Data = await fetchImageBase64(payload.data, instanceNameFromPayload, evolutionApiUrl)
            console.log('Audio fetched successfully.')

            // INJECT into payload structure where n8n expects it
            if (!payload.data.message) payload.data.message = {}
            if (!payload.data.message.base64) payload.data.message.base64 = base64Data

          } catch (fetchErr) {
            console.error('Failed to fetch audio Base64:', fetchErr)
            // Determine if we should fail or forward anyway (n8n will likely fail)
          }
        }

        try {
          // Fire and forget (or wait?) - Let's wait to ensure it sends.
          await fetch(N8N_TRANSCRIPTION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          console.log('Forwarded to n8n successfully.')
          return new Response(JSON.stringify({ status: 'forwarded_to_n8n', type: messageType }), { headers: { "Content-Type": "application/json" } })
        } catch (err) {
          console.error('Failed to forward to n8n:', err)
          // Fallback? If failed, maybe try to process text if possible? No, media needs n8n.
          return new Response(JSON.stringify({ status: 'error_forwarding', error: String(err) }), { status: 500 })
        }
      }

      if (messageType === 'conversation') {
        userMessage = data.message.conversation
      } else if (messageType === 'extendedTextMessage') {
        userMessage = data.message.extendedTextMessage.text
      } else if (messageType === 'imageMessage') {
        // Set temporary message content to pass the "empty check"
        // If caption exists, use it. If not, use a placeholder.
        userMessage = data.message.imageMessage.caption || "[PROCESSING IMAGE]"
      }
    } else {
      console.log('Unknown payload format')
      return new Response('Unknown payload', { status: 400 })
    }

    console.log(`Processing message from ${userName} (${userId}): "${userMessage}"`)

    if (!userMessage && attachments.length === 0) {
      console.log('No text content or attachments found. Skipping.')
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no content found' }), { headers: { "Content-Type": "application/json" } })
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
      await sendWhatsAppMessage(remoteJid, debugInfo, instanceNameFromPayload, messageId, evolutionApiUrl)
      return new Response(JSON.stringify({ status: 'debug_replied' }), { headers: { "Content-Type": "application/json" } })
    }

    // Helper to log to DB
    const logToDB = async (status: string, details?: string | null, extraMetadata?: any) => {
      try {
        // If it's a bot reply, the 'details' argument contains the actual response text.
        // Otherwise, 'details' is just a log message (like "User identified") and we save the global 'userMessage'.
        const contentToSave = status === 'bot_reply' ? details : userMessage
        const errorDetailsToSave = status === 'bot_reply' ? null : details

        const { error } = await supabase.from('whatsapp_logs').insert({
          instance_name: instanceNameFromPayload,
          remote_jid: remoteJid,
          phone: phone,
          message_content: contentToSave,
          status,
          error_details: errorDetailsToSave,
          company_id: (extraMetadata?.company_id),
          participant_id: (extraMetadata?.participant?.id), // Ensure participant_id is saved if available
          metadata: {
            messageType,
            candidates: extraMetadata?.candidates,
            hasAttachments: attachments.length > 0,
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
      await sendWhatsAppMessage(remoteJid, "Lo siento, no estás registrado en K-Tracker. Contacta a tu administrador.", instanceNameFromPayload, messageId, evolutionApiUrl)
      return new Response(JSON.stringify({ status: 'unauthorized' }), { headers: { "Content-Type": "application/json" } })
    }

    const user = participant
    const company = user.company
    const role = user.role === 'admin' ? 'admin' : 'participant'
    const instanceName = company.evolution_instance_name

    // Log success identification
    await logToDB('processing', 'User identified', { role, company_id: company.id, participant: user })

    // --- HANDLE IMAGE MESSAGES ---
    let imageUrl = ''
    if (messageType === 'imageMessage') {
      const messageId = payload.data?.key?.id
      if (messageId) {
        try {
          console.log('Processing image...')

          // Try to get Base64 directly from payload (if Webhook Base64 is enabled)
          let base64Data = payload.data?.base64 || payload.data?.message?.base64 || payload.base64

          // Fallback: Fetch from API if not present
          if (!base64Data) {
            // Log payload keys to debug "Webhook Base64"
            console.log('Payload Data Keys:', Object.keys(payload.data || {}))

            console.log('Base64 not in payload. Fetching from Evolution API...')
            try {
              // Pass the FULL payload.data object (which has key, message, etc.) not just message
              // Evolution API expects the full WAMessage structure for serialization/parsing
              base64Data = await fetchImageBase64(payload.data, instanceName, evolutionApiUrl)
            } catch (fetchErr) {
              console.error('Fetch failed:', fetchErr)
              // Don't throw yet, check if we can proceed or fail gracefully
            }
          }

          if (base64Data) {
            const fileName = `${company.id}/${Date.now()}_${userId}.jpg`
            imageUrl = await uploadBase64ToStorage(base64Data, fileName)
            console.log('Image uploaded to Storage:', imageUrl)

            // Add to attachments for the tool
            attachments.push({ type: 'image', url: imageUrl })

            // If there is a caption, that is the userMessage. If not, set a placeholder.
            if (payload.data.message.imageMessage.caption) {
              userMessage = payload.data.message.imageMessage.caption
            } else {
              userMessage = "[USUARIO ENVIÓ UNA IMAGEN]"
            }
          } else {
            throw new Error('Could not retrieve image base64 from Payload or API')
          }
        } catch (e) {
          console.error('Error handling image:', e)
          await sendWhatsAppMessage(remoteJid, "Tuve un problema obteniendo tu imagen.", instanceName, payload.data?.key?.id, evolutionApiUrl)
          // Continue execution? No, usually if image fails we might want to stop or just process text.
          // Return 200 to stop Evolution API from retrying endlessly
          return new Response(JSON.stringify({ status: 'error_image_fail', error: String(e) }), { headers: { "Content-Type": "application/json" } })
        }
      }
    }

    // --- FETCH CONVERSATION HISTORY (MEMORY) ---
    // Fetch last 6 messages (limit to keep context window manageable)
    const { data: historyData } = await supabase
      .from('whatsapp_logs')
      .select('status, message_content, created_at, metadata')
      .or(`remote_jid.eq.${remoteJid},phone.eq.${phone}`)
      .order('created_at', { ascending: false })
      .limit(6) // Fetch more to ensure we get actual conversation turns

    let chatHistory: any[] = []
    if (historyData) {
      // Filter out the current incoming message if it was already logged
      const filteredHistory = historyData.filter(log => !(log.status === 'processing' && log.message_content === userMessage && log.created_at > new Date(Date.now() - 5000).toISOString()));

      // Reverse to chronological order
      const chronological = filteredHistory.reverse()

      chatHistory = chronological.map((log: any) => {
        const time = new Date(log.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        if (log.status === 'bot_reply') return { role: 'assistant', content: `[${time}] ${log.message_content}` }
        if (log.status === 'processing' || log.status === 'unauthorized' || log.status === 'ignored') return { role: 'user', content: `[${time}] ${log.message_content}` }
        return null
      }).filter(Boolean)
    }


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
             - Add comments to tasks (supports basic text and Photo/Image attachments).
             - List projects you are in (Read-only).
             - List minutes you attended (Read-only).
             
             MEMORY & CONTEXT:
             You have access to the recent conversation history with TIMESTAMPS [HH:MM].
             
             CRITICAL - DETECT STALE CONTEXT:
             1. Check the time difference between the last message in history and NOW (${new Date().toLocaleTimeString('es-AR')}).
             2. If the gap is > 5 minutes, the conversation is **STALE**.
             
             RULES FOR STALE CONVERSATIONS:
             - DO NOT assume the user is still talking about the previous task.
             - If the user sends an image (with or without caption):
                 - DO NOT execute 'add_task_comment' immediately.
                 - You MUST ASK the user for clarification first.
                 - Example: "He notado que ha pasado un tiempo. ¿Esta imagen es para la tarea anterior '[Nombre Tarea]' o para una nueva?"
                 - Only exception: If the caption is EXTREMELY specific and matches a DIFFERENT task name perfectly.

             RULES FOR ACTIVE CONVERSATIONS (< 5 mins):
             - If the user sends an image without a caption:
                 - You may assume it's for the current active task.
             - If the user sends an image WITH a caption:
                 - Use the caption to find the task.
                 - Execute 'add_task_comment' immediately.
             
             IMPORTANT: If the user asks to modify a task (comment/status) by NAME, use the 'get_tasks' tool with the 'search' parameter to find it first. DO NOT ask for an ID. Find the ID yourself.
             IMPORTANT: If the user message contains an attachment (Check instructions) or if the user says "here is the photo", use 'add_task_comment' and include the attachment data if available.

             TONE AND STYLE:
             - Be concise and human-like.
             - Do NOT be repetitive. Do NOT repeat the full content of what you just did.
             - Use natural language, like a helpful colleague.
             - MANAGE AMBIGUITY PROACTIVELY:
               - If a user sends a task name that you cannot find, DO NOT just say "I can't find it". Instead, say: "Mmm no encuentro esa tarea. ¿Quieres que te liste tus tareas pendientes para ver cuál es?" or "No me suena esa tarea. ¿Es nueva o quizas tiene otro nombre? Si quieres te ayudo a buscarla."
               - If the user's message is unclear or poorly written, try to infer the intent but ASK for confirmation if it involves an action.
               - If you are unsure which task an image belongs to, ask: "¿A qué tarea corresponde esta imagen? (O si quieres que te muestre tus tareas avísame)".
             
             (IMPORTANT: The timestamps [HH:MM] in the chat history are for YOUR context awareness only. DO NOT include a timestamp in your actual response to the user. Start your message directly with text.)
             
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
          description: "Add a comment to a task. Can be text and/or attachments.",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              content: { type: "string" },
              attachments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    url: { type: "string" },
                    name: { type: "string" }
                  }
                },
                description: "List of attachments (e.g. images)"
              }
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
    // If we have attachments, we'll hint the model about them in the context or simply allow it to use them if needed.
    // To make it easy for the model, if there are attachments in the payload, we should inject them into the 'user' message or context so the model knows they exist and should pass them to 'add_task_comment'.

    let userContent = userMessage
    if (attachments && attachments.length > 0) {
      userContent += `\n\n[SYSTEM: The user has attached ${attachments.length} file(s). You MUST pass these 'attachments' to the 'add_task_comment' tool if the user is adding a comment from this.]`
    }

    let messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory, // Inject History
      { role: "user", content: userContent }
    ]

    // If we have an image URL, we can send it as a multimodal message to GPT-4o if supported, 
    // OR just rely on the context text "[USUARIO ENVIÓ UNA IMAGEN]" + the 'attachments' array available to the tool.
    // To make sure the tool uses it, we will forcefully hint it.
    if (imageUrl) {
      messages[messages.length - 1].content += `\n\n[SYSTEM: Available Attachment: ${imageUrl}. If adding a task comment, you MUST include this in the 'attachments' array with type='image' and a descriptive name.]`
    }

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
        // SYSTEM FIX: Aggressively strip timestamps from the start of the message
        // Pattern matches: [09:02 p. m.] or [09:02] or [09:02 PM] etc.
        finalResponseText = finalResponseText.replace(/^\[\s*\d{1,2}:\d{2}.*?\]\s*/i, '')
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
              // Use args OR fallback to current session image (if any)
              let attachmentsToSave = functionArgs.attachments || []

              // Fallback: If no attachments provided by AI but we have an image in context, use it
              if (attachmentsToSave.length === 0 && imageUrl) {
                attachmentsToSave = [{ type: 'image', url: imageUrl, name: 'Imagen adjunta.jpg' }]
              }

              // Ensure all attachments have a name (Front-end requires it)
              attachmentsToSave = attachmentsToSave.map((att: any) => ({
                ...att,
                name: att.name || (att.url ? att.url.split('/').pop().split('?')[0] : 'archivo_adjunto')
              }))

              console.log('Saving comment with attachments:', attachmentsToSave)

              const { error } = await supabase
                .from('task_comments')
                .insert({
                  task_id: functionArgs.task_id,
                  content: functionArgs.content,
                  user_id: user.user_id,
                  company_id: company.id,
                  attachments: attachmentsToSave
                })
              if (error) functionResult = `Error adding comment: ${error.message}`
              else functionResult = "Comment and Image added successfully."
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
            // Use RPC to ensure proper logging of WHO updated the task
            const { error } = await supabase.rpc('update_task_status', {
              p_task_id: functionArgs.task_id,
              p_status: functionArgs.status,
              p_user_id: user.user_id, // Pass the real user ID
              p_notes: functionArgs.notes || null
            })

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
      await sendWhatsAppMessage(remoteJid, finalResponseText, instanceNameFromPayload, messageId, evolutionApiUrl)

      // LOG BOT REPLY TO DB FOR HISTORY
      await logToDB('bot_reply', finalResponseText, { role, company_id: company.id, participant: user })
    } else {
      // Fallback if loop finished without text (unlikely but possible)
      await sendWhatsAppMessage(remoteJid, "Lo siento, no pude procesar tu solicitud.", instanceName, '', evolutionApiUrl)
      await logToDB('error', 'No final response generated', { company_id: company.id, participant: user })
    }

    return new Response(JSON.stringify({ status: 'success' }), { headers: { "Content-Type": "application/json" } })

  } catch (error: any) {
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

// --- HELPER FUNCTIONS ---

async function fetchImageBase64(messageObject: any, instanceName: string, apiUrl: string) {
  // Use /chat/getBase64FromMediaMessage which is standard for converting media messages
  const url = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`
  const body = {
    message: messageObject, // Must be the full message object (e.g. data.message)
    convertToMp4: false
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch image base64: ${response.status} ${response.statusText} - ${errorText}`)
  }
  const data = await response.json()
  return data.base64
}

async function uploadBase64ToStorage(base64: string, path: string) {
  // Convert Base64 to ArrayBuffer
  // Removes header if present "data:image/jpeg;base64,..."
  const base64Clean = base64.replace(/^data:image\/\w+;base64,/, "")
  const binaryString = atob(base64Clean)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const { data, error } = await supabase.storage
    .from('task-attachments')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(path)

  return publicUrl
}

async function markAsRead(remoteJid: string, instanceName: string, messageId: string, apiUrl: string) {
  const url = `${apiUrl}/chat/markMessageAsRead/${instanceName}`
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

async function sendPresence(remoteJid: string, instanceName: string, apiUrl: string) {
  const url = `${apiUrl}/chat/sendPresence/${instanceName}`
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

async function sendWhatsAppMessage(remoteJid: string, text: string, instanceName: string, messageId: string = '', apiUrl: string) {
  if (!instanceName) {
    console.error('No instance name provided for reply')
    return
  }

  // 1. Mark as Read (Blue Ticks)
  if (messageId) {
    await markAsRead(remoteJid, instanceName, messageId, apiUrl)
  }

  // 2. Send "Typing..." status immediately
  await sendPresence(remoteJid, instanceName, apiUrl)

  // 3. Calculate dynamic delay based on text length
  // 80ms per character, min 4s, max 25s
  const delay = Math.min(Math.max(text.length * 80, 4000), 25000)

  // 4. Wait for the calculated delay
  await new Promise(resolve => setTimeout(resolve, delay))

  // 5. Send the actual message
  const url = `${apiUrl}/message/sendText/${instanceName}`
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

