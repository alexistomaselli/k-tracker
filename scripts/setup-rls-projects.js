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
do $$
begin
  begin
    alter table public.participants enable row level security;
    alter table public.participants force row level security;
  exception when others then null; end;

  begin
    create policy participants_select_self on public.participants
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy participants_insert_self on public.participants
      for insert with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy participants_update_self on public.participants
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    alter table public.project enable row level security;
    alter table public.project force row level security;
  exception when others then null; end;

  begin
    create policy project_select_by_company on public.project
      for select using (
        exists (
          select 1 from public.participants p
          where p.user_id = auth.uid() and p.company_id = project.company_id
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy project_insert_by_company on public.project
      for insert with check (
        exists (
          select 1 from public.participants p
          where p.user_id = auth.uid() and p.company_id = project.company_id
        )
      );
  exception when duplicate_object then null; end;
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
    console.log('RLS setup success:', JSON.stringify(data))
  } catch (e) {
    console.error('Failed:', e.message)
    process.exit(3)
  }
})()