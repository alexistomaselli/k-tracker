import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function main() {
  const env = loadEnv()
  const url = env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Supabase no configurado en .env')
    process.exit(1)
  }
  const supabase = createClient(url, key)
  const { data: comp, error: compErr } = await supabase.from('company').select('id').limit(1).single()
  if (compErr || !comp?.id) {
    console.error('No se encontró company para asignar')
    process.exit(1)
  }
  const today = new Date()
  const start = today.toISOString().slice(0, 10)
  const endDate = new Date(today)
  endDate.setMonth(endDate.getMonth() + 1)
  const end = endDate.toISOString().slice(0, 10)
  const payload = {
    company_id: comp.id,
    name: 'Proyecto demo',
    code: 'PRJ-DEMO',
    status: 'active',
    start_date: start,
    estimated_end_date: end,
    budget: 1000000,
  }
  const { data, error } = await supabase.from('project').insert(payload).select().single()
  if (error) {
    console.error('Error creando proyecto:', error.message)
    process.exit(1)
  }
  console.log('Proyecto creado:', { id: data.id, code: data.code, name: data.name })
}

main()