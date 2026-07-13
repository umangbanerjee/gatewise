import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://ffjqudlfaynulmnllsvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmanF1ZGxmYXludWxtbmxsc3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzMDU5MywiZXhwIjoyMDk5NTA2NTkzfQ.Dt6F2IL5JaiQxY3V0w0CgIqroysOPkq2k7MOB2vKu9E',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const USERS = [
  { email: 'student@starex.test',  full_name: 'Arjun Sharma',    role: 'student',      enrollment_no: '230001', hostel_room: 'A-101' },
  { email: 'warden@starex.test',   full_name: 'Dr. Priya Singh',  role: 'warden',       enrollment_no: null,     hostel_room: null },
  { email: 'security@starex.test', full_name: 'Rajesh Kumar',     role: 'security',     enrollment_no: null,     hostel_room: null },
  { email: 'mess@starex.test',     full_name: 'Sunita Devi',      role: 'mess_manager', enrollment_no: null,     hostel_room: null },
]

console.log('Fetching auth users...')
const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 200 })
if (listErr) { console.error(listErr); process.exit(1) }

console.log(`Found ${users.length} auth users`)

const { data: profiles } = await sb.from('profiles').select('id, role, full_name')
console.log(`Found ${profiles?.length ?? 0} profiles\n`)

for (const u of USERS) {
  const authUser = users.find(x => x.email === u.email)
  if (!authUser) {
    console.log(`✗ No auth user for ${u.email}`)
    continue
  }

  const existing = profiles?.find(p => p.id === authUser.id)
  
  if (existing) {
    // Update role if needed
    const { error } = await sb.from('profiles').update({
      full_name: u.full_name,
      role: u.role,
      enrollment_no: u.enrollment_no,
      hostel_room: u.hostel_room,
    }).eq('id', authUser.id)
    console.log(error ? `✗ Update ${u.email}: ${error.message}` : `✓ Updated ${u.email} → role: ${u.role}`)
  } else {
    // Insert missing profile
    const { error } = await sb.from('profiles').insert({
      id: authUser.id,
      full_name: u.full_name,
      role: u.role,
      enrollment_no: u.enrollment_no,
      hostel_room: u.hostel_room,
    })
    console.log(error ? `✗ Insert ${u.email}: ${error.message}` : `✓ Created profile ${u.email} → role: ${u.role}`)
  }
}

// Also seed food menu
console.log('\nSeeding food menu...')
const today = new Date().toISOString().split('T')[0]
const mgr = users.find(x => x.email === 'mess@starex.test')

const meals = [
  { meal_type:'breakfast', items:['Poha','Boiled Eggs','Bread & Butter','Tea / Coffee'], start_time:'07:30', end_time:'09:30' },
  { meal_type:'lunch',     items:['Rice','Dal Makhani','Mix Veg','Chapati','Salad','Curd'], start_time:'12:30', end_time:'14:00' },
  { meal_type:'snacks',    items:['Samosa','Tea / Coffee','Biscuits'], start_time:'16:30', end_time:'17:30' },
  { meal_type:'dinner',    items:['Rice','Dal Tadka','Paneer Butter Masala','Chapati','Kheer'], start_time:'19:30', end_time:'21:00' },
]

for (const meal of meals) {
  const { error } = await sb.from('food_menu').upsert(
    { ...meal, menu_date: today, updated_by: mgr?.id ?? null },
    { onConflict: 'menu_date,meal_type' }
  )
  console.log(error ? `✗ ${meal.meal_type}: ${error.message}` : `✓ ${meal.meal_type}`)
}

console.log('\n✅ All profiles fixed. Try logging in now at http://localhost:3000')
console.log('\nCredentials:')
console.log('  student@starex.test   / Starex123!')
console.log('  warden@starex.test    / Starex123!')
console.log('  security@starex.test  / Starex123!')
console.log('  mess@starex.test      / Starex123!')
