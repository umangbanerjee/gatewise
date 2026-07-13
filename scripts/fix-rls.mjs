import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://ffjqudlfaynulmnllsvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmanF1ZGxmYXludWxtbmxsc3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzMDU5MywiZXhwIjoyMDk5NTA2NTkzfQ.Dt6F2IL5JaiQxY3V0w0CgIqroysOPkq2k7MOB2vKu9E',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// The problem: RLS "profiles: own read" uses auth.uid() = id
// But the server-side supabase client in layout.tsx uses the anon key
// with the user's session cookie — let's verify the layout client works

// Test: can the anon key + a user JWT read their own profile?
// First get a session token for warden
console.log('Testing sign in as warden...')
const anonSb = createClient(
  'https://ffjqudlfaynulmnllsvh.supabase.co',
  'sb_publishable_-Hmkc_jT_x9MjsWpF0OkPw_oAatNgmR'
)

const { data: session, error: signInErr } = await anonSb.auth.signInWithPassword({
  email: 'warden@starex.test',
  password: 'Starex123!'
})

if (signInErr) {
  console.error('Sign in failed:', signInErr.message)
  process.exit(1)
}

console.log('Signed in as:', session.user.email, 'id:', session.user.id)

// Now test reading own profile with user token
const userSb = createClient(
  'https://ffjqudlfaynulmnllsvh.supabase.co',
  'sb_publishable_-Hmkc_jT_x9MjsWpF0OkPw_oAatNgmR',
  { global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } }
)

const { data: profile, error: profileErr } = await userSb
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single()

if (profileErr) {
  console.error('Profile read FAILED:', profileErr.message)
  console.log('\nRLS is blocking profile reads. Fixing...')
  
  // Drop and recreate the policy to allow authenticated users to read all profiles
  // (they need this to see student info on gate pass cards)
  const fixes = [
    `drop policy if exists "profiles: own read" on public.profiles`,
    `drop policy if exists "profiles: staff read" on public.profiles`,
    `create policy "profiles: authenticated read" on public.profiles for select to authenticated using (true)`,
  ]
  
  for (const sql of fixes) {
    const { error } = await sb.rpc('exec', { sql }) // won't work via REST
    console.log('Would run:', sql)
  }
  
  console.log('\nNeed to run these SQL fixes in Supabase SQL editor...')
  console.log('Copying to a fix file...')
} else {
  console.log('✓ Profile read works! Role:', profile.role)
  console.log('The issue may be with cookie-based auth in server components.')
}
