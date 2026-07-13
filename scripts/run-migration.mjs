/**
 * Run this AFTER you've pasted the migration SQL into Supabase SQL editor.
 * This script creates the 4 test users and seeds today's food menu.
 *
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ffjqudlfaynulmnllsvh.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmanF1ZGxmYXludWxtbmxsc3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzkzMDU5MywiZXhwIjoyMDk5NTA2NTkzfQ.Dt6F2IL5JaiQxY3V0w0CgIqroysOPkq2k7MOB2vKu9E'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const USERS = [
  { email: 'student@starex.test',  password: 'Starex123!', full_name: 'Arjun Sharma',   role: 'student',      enrollment_no: '230001', hostel_room: 'A-101' },
  { email: 'warden@starex.test',   password: 'Starex123!', full_name: 'Dr. Priya Singh', role: 'warden',       enrollment_no: null,     hostel_room: null },
  { email: 'security@starex.test', password: 'Starex123!', full_name: 'Rajesh Kumar',    role: 'security',     enrollment_no: null,     hostel_room: null },
  { email: 'mess@starex.test',     password: 'Starex123!', full_name: 'Sunita Devi',     role: 'mess_manager', enrollment_no: null,     hostel_room: null },
]

async function main() {
  console.log('🚀 Starex One — Creating users & seeding data\n')

  // Check tables exist
  const { error: tableCheck } = await supabase.from('profiles').select('id').limit(1)
  if (tableCheck) {
    console.error('❌ profiles table not found!\n')
    console.error('You must run the SQL migration first:\n')
    console.error('1. Go to: https://supabase.com/dashboard/project/ffjqudlfaynulmnllsvh/sql/new')
    console.error('2. Paste contents of: supabase/migrations/001_initial.sql')
    console.error('3. Click Run')
    console.error('4. Then re-run this script\n')
    process.exit(1)
  }

  // Create / update users
  for (const u of USERS) {
    let userId

    // Try create
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name }
    })

    if (error) {
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const existing = list?.users?.find(x => x.email === u.email)
        userId = existing?.id
        console.log(`  ↩  ${u.email} already exists`)
      } else {
        console.error(`  ✗  ${u.email} — ${error.message}`)
        continue
      }
    } else {
      userId = data.user.id
      console.log(`  ✓  Created ${u.email}`)
    }

    if (!userId) continue

    // Upsert profile
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: u.full_name,
      role: u.role,
      enrollment_no: u.enrollment_no,
      hostel_room: u.hostel_room,
    }, { onConflict: 'id' })

    if (pErr) {
      console.error(`      Profile error: ${pErr.message}`)
    } else {
      console.log(`      Profile → role: ${u.role}`)
    }
  }

  // Seed today's food menu
  console.log('\n🍽  Seeding today\'s food menu...')
  const today = new Date().toISOString().split('T')[0]

  const { data: mgr } = await supabase.from('profiles').select('id').eq('role','mess_manager').single()

  const meals = [
    { meal_type:'breakfast', items:['Poha','Boiled Eggs','Bread & Butter','Tea / Coffee'], start_time:'07:30', end_time:'09:30' },
    { meal_type:'lunch',     items:['Rice','Dal Makhani','Mix Veg','Chapati','Salad','Curd'], start_time:'12:30', end_time:'14:00' },
    { meal_type:'snacks',    items:['Samosa','Tea / Coffee','Biscuits'], start_time:'16:30', end_time:'17:30' },
    { meal_type:'dinner',    items:['Rice','Dal Tadka','Paneer Butter Masala','Chapati','Kheer'], start_time:'19:30', end_time:'21:00' },
  ]

  for (const meal of meals) {
    const { error } = await supabase.from('food_menu').upsert(
      { ...meal, menu_date: today, updated_by: mgr?.id ?? null },
      { onConflict: 'menu_date,meal_type' }
    )
    console.log(error ? `  ✗ ${meal.meal_type}: ${error.message}` : `  ✓ ${meal.meal_type}`)
  }

  console.log('\n✅ Done! Login at http://localhost:3000\n')
  console.log('  student      → student@starex.test   / Starex123!')
  console.log('  warden       → warden@starex.test    / Starex123!')
  console.log('  security     → security@starex.test  / Starex123!')
  console.log('  mess manager → mess@starex.test      / Starex123!')
}

main().catch(console.error)
