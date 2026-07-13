import {
  LayoutDashboard,
  DoorOpen,
  CheckSquare,
  LogOut,
  UtensilsCrossed,
  ClipboardEdit,
  ShieldCheck,
} from 'lucide-react'
import type { Role, NavItem } from '@/types'

export const NAV_CONFIG: Record<Role, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Exit Pass', href: '/gate-pass', icon: DoorOpen },
    { label: 'Food Menu', href: '/food-menu', icon: UtensilsCrossed },
  ],
  warden: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Exit Pass Approval', href: '/gate-pass/approvals', icon: CheckSquare },
    { label: 'Food Menu', href: '/food-menu', icon: UtensilsCrossed },
  ],
  security: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Student Checkout', href: '/checkout', icon: ShieldCheck },
    { label: 'Food Menu', href: '/food-menu', icon: UtensilsCrossed },
  ],
  mess_manager: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Food Menu', href: '/food-menu', icon: UtensilsCrossed },
    { label: 'Manage Menu', href: '/food-menu/manage', icon: ClipboardEdit },
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  warden: 'Warden',
  security: 'Security',
  mess_manager: 'Mess Manager',
}

/** Routes that are only accessible to specific roles. */
export const ROLE_PROTECTED_ROUTES: Record<string, Role[]> = {
  '/gate-pass': ['student'],
  '/gate-pass/approvals': ['warden'],
  '/checkout': ['security'],
  '/food-menu/manage': ['mess_manager'],
}
