import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

let url = process.env.VITE_SUPABASE_URL
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const raw = fs.readFileSync(envPath, 'utf8')
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=\s*(.*)$/)
      if (m) {
        const key = m[1].trim()
        const val = m[2].trim()
        if (!(key in process.env)) process.env[key] = val
      }
    })
    url = process.env.VITE_SUPABASE_URL
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  } catch {}
}

if (!url || !serviceKey) {
  console.error('Missing env VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node scripts/create-user.js <email> <password>')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

;(async () => {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) {
    console.error('Create user error:', error.message)
    process.exit(2)
  }
  console.log('User created:', data.user?.id)
})()