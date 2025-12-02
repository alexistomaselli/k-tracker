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

const supabase = createClient(url, serviceKey)
const candidates = ['company', 'companies', 'empresa', 'empresas', 'organization', 'organizations']

;(async () => {
  for (const t of candidates) {
    const { data, error } = await supabase.from(t).select('id,name').limit(1)
    if (!error && data && data.length) {
      console.log('Found company table:', t)
      console.log('Company id:', data[0].id)
      console.log('Company name:', data[0].name)
      process.exit(0)
    }
  }
  console.error('No company-like table found')
  process.exit(2)
})()