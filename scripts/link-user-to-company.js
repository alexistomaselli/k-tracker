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
const companyIdArg = process.argv[3]

if (!email) {
  console.error('Usage: node scripts/link-user-to-company.js <email> [company_id]')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function findUserByEmail(targetEmail) {
  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email === targetEmail)
    if (match) return match
    if (!data.users.length) return null
    page++
  }
}

async function discoverCompanyId() {
  if (companyIdArg) return companyIdArg
  const candidates = ['company', 'companies', 'empresa', 'empresas', 'organization', 'organizations']
  for (const t of candidates) {
    const { data, error } = await supabase.from(t).select('id').limit(1)
    if (!error && data && data.length) return data[0].id
  }
  return null
}

;(async () => {
  const user = await findUserByEmail(email)
  if (!user) {
    console.error('User not found:', email)
    process.exit(2)
  }
  const companyId = await discoverCompanyId()
  if (!companyId) {
    console.error('No company id found, provide explicitly as second argument')
    process.exit(3)
  }

  const { data: existing, error: selErr } = await supabase
    .from('participants')
    .select('id, user_id, company_id')
    .or(`email.eq.${email},user_id.eq.${user.id}`)
    .limit(1)

  if (selErr) {
    console.error('Select participants error:', selErr.message)
    process.exit(4)
  }

  if (!existing || existing.length === 0) {
    const names = (email.split('@')[0] || 'Usuario').split('.')
    const first = names[0] || 'Usuario'
    const last = names[1] || 'Admin'
    const { error: insErr } = await supabase
      .from('participants')
      .insert({ first_name: first, last_name: last, email, company_id: companyId, user_id: user.id })
    if (insErr) {
      console.error('Insert participants error:', insErr.message)
      process.exit(5)
    }
    console.log('Participant inserted and linked', email)
  } else {
    const pid = existing[0].id
    const patch = { user_id: existing[0].user_id ?? user.id, company_id: existing[0].company_id ?? companyId }
    const { error: upErr } = await supabase.from('participants').update(patch).eq('id', pid)
    if (upErr) {
      console.error('Update participants error:', upErr.message)
      process.exit(6)
    }
    console.log('Participant updated and linked', email)
  }
  // Also update user metadata with company_id for frontend resolution
  const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { company_id: companyId },
  })
  if (updErr) {
    console.error('Update user metadata error:', updErr.message)
    process.exit(7)
  }
  console.log('User metadata updated with company_id')
  console.log('Done')
})()
