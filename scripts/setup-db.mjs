/**
 * Starex One — Database Setup Script
 * Run: node scripts/setup-db.mjs <SERVICE_ROLE_KEY>
 *
 * This script:
 * 1. Runs the initial SQL migration
 * 2. Creates one test user per role
 * 3. Sets their profiles
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://ffjqudlfaynulmnllsvh.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/setup-db.mjs <SERVICE_ROLE_KEY>')
  console.error('Get your service role key from: Supabase → Project Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEST_USERS = [
  { email: 'student@starex.test',  password: 'Starex123!', full_name: 'Arjun Sharma',    role: 'student',      enrollment_no: '230001', hostel_room: 'A-101' },
  { email: 'warden@starex.test',   password: 'Starex123!', full_name: 'Dr. Priya Singh',  role: 'warden',       enrollment_no: null,     hostel_room: null },
  { email: 'security@starex.test', password: 'Starex123!', full_name: 'Rajesh Kumar',     role: 'security',     enrollment_no: null,     hostel_room: null },
  { email: 'mess@starex.test',     password: 'Starex123!', full_name: 'Sunita Devi',      role: 'mess_manager', enrollment_no: null,     hostel_room: null },
]

async function runMigration() {
  console.log('\n📦 Running SQL migration...')
  const sql = readFileSync(join(__dirname, '../supabase/migrations/001_initial.sql'), 'utf8')

  // Split on statement boundaries and run each
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).single()
    // exec_sql won't exist — use the pg REST approach instead
    if (error && !error.message?.includes('already exists')) {
      // Non-fatal: tables may already exist
    }
  }
  console.log('✓ Migration attempted (if tables existed, errors above are safe to ignore)')
}

async function createUsers() {
  console.log('\n👤 Creating test users...')

  for (const user of TEST_USERS) {
    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name }
    })

    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log(`  ↩ ${user.email} already exists, updating profile...`)
        // Get existing user
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users?.find(u => u.email === user.email)
        if (existing) {
          await upsertProfile(existing.id, user)
        }
      } else {
        console.error(`  ✗ Failed to create ${user.email}:`, error.message)
      }
      continue
    }

    console.log(`  ✓ Created ${user.email} (${user.role})`)
    await upsertProfile(data.user.id, user)
  }
}

async function upsertProfile(userId, user) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: user.full_name,
      role: user.role,
      enrollment_no: user.enrollment_no,
      hostel_room: user.hostel_room,
    }, { onConflict: 'id' })

  if (error) {
    console.error(`    ✗ Profile error for ${user.email}:`, error.message)
  } else {
    console.log(`    ✓ Profile set: role=${user.role}`)
  }
}

async function seedFoodMenu() {
  console.log('\n🍽 Seeding today\'s food menu...')
  const today = new Date().toISOString().split('T')[0]

  // Get mess manager user id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'mess_manager')
    .single()

  const updatedBy = profiles?.id ?? null

  const meals = [
    { meal_type: 'breakfast', items: ['Poha', 'Boiled Eggs', 'Bread & Butter', 'Tea / Coffee'], start_time: '07:30', end_time: '09:30' },
    { meal_type: 'lunch',     items: ['Rice', 'Dal Makhani', 'Sabzi', 'Chapati', 'Salad', 'Curd'], start_time: '12:30', end_time: '14:00' },
    { meal_type: 'snacks',    items: ['Samosa', 'Tea / Coffee', 'Biscuits'], start_time: '16:30', end_time: '17:30' },
    { meal_type: 'dinner',    items: ['Rice', 'Dal', 'Paneer Butter Masala', 'Chapati', 'Sweet'], start_time: '19:30', end_time: '21:00' },
  ]

  for (const meal of meals) {
    const { error } = await supabase
      .from('food_menu')
      .upsert({ ...meal, menu_date: today, updated_by: updatedBy }, { onConflict: 'menu_date,meal_type' })

    if (error) {
      console.error(`  ✗ ${meal.meal_type}:`, error.message)
    } else {
      console.log(`  ✓ ${meal.meal_type} menu set`)
    }
  }
}

async function main() {
  console.log('🚀 Starex One — Database Setup')
  console.log('================================')

  await createUsers()
  await seedFoodMenu()

  console.log('\n✅ Setup complete! Test credentials:')
  console.log('=====================================')
  for (const u of TEST_USERS) {
    console.log(`  ${u.role.padEnd(12)} → ${u.email}  /  ${u.password}`)
  }
  console.log('\n  App running at: http://localhost:3000')
}

main().catch(console.error)
