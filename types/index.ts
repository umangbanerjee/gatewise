export type Role = 'student' | 'warden' | 'security' | 'mess_manager'

export type GatePassStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'checked_out'
  | 'checked_in'

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner'

export interface Profile {
  id: string
  full_name: string
  enrollment_no: string | null
  role: Role
  avatar_url: string | null
  phone: string | null
  hostel_room: string | null
  created_at: string
  updated_at: string
}

export interface GatePass {
  id: string
  student_id: string
  from_location: string
  to_location: string
  exit_datetime: string
  return_datetime: string
  description: string
  status: GatePassStatus
  approved_by: string | null
  approved_at: string | null
  denied_reason: string | null
  checked_out_at: string | null
  checked_out_by: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
  updated_at: string
  // joined
  student?: Pick<Profile, 'full_name' | 'enrollment_no' | 'avatar_url'>
}

export interface FoodMenu {
  id: string
  menu_date: string
  meal_type: MealType
  items: string[]
  start_time: string
  end_time: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  pending: number
  outCampus: number
  inCampus: number
  todayMeals: FoodMenu[]
}

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}
