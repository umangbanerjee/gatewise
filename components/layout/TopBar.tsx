import { ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ROLE_LABELS } from './nav-config'
import type { Profile } from '@/types'

interface TopBarProps {
  profile: Profile
}

export function TopBar({ profile }: TopBarProps) {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-16 items-center justify-end border-b bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {profile.enrollment_no ?? ROLE_LABELS[profile.role]}
          </p>
        </div>
        <Avatar className="h-9 w-9">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
