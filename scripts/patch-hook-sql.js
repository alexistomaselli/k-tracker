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

const sql = `
create or replace view public.user_company as
select p.user_id, p.company_id
from public.participants p
where p.user_id is not null;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql as $$
declare
  uid uuid := (event->>'user_id')::uuid;
  claims jsonb := event;
  comp uuid;
begin
  begin
    select company_id into comp from public.user_company where user_id = uid limit 1;
  exception when others then
    comp := null;
  end;
  if comp is not null then
    claims := jsonb_set(claims, '{claims,company_id}', to_jsonb(comp::text), true);
  end if;
  return claims;
end $$;
`

const metaEndpoint = url.replace(/\/$/, '') + '/postgres/v1/query'

;(async () => {
  try {
    const res = await fetch(metaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Meta query failed:', res.status, text)
      process.exit(2)
    }
    const data = await res.json()
    console.log('Meta query success:', JSON.stringify(data))
  } catch (e) {
    console.error('Failed:', e.message)
    process.exit(3)
  }
})()