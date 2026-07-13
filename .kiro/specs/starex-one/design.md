# Design Document — Starex One MVP

## Overview

Starex One is a single Next.js 14 App Router application deployed on Vercel. It serves four roles (student, warden, security, mess_manager) from one URL with a shared layout shell. The backend is implemented as Next.js Route Handlers under `app/api/**`, so the entire product ships as one Vercel project. Supabase provides Postgres, Auth, and Row Level Security. Zod schemas are shared between client forms and server handlers. Pino emits structured JSON logs per route.

---

## System Architecture

```
Browser
  └── Next.js App (Vercel)
        ├── app/(auth)/login          – public, no layout
        ├── app/(dashboard)/layout    – shared shell, requires session
        │     ├── dashboard
        │     ├── gate-pass
        │     ├── gate-pass/approvals
        │     ├── checkout
        │     ├── food-menu
        │     └── food-menu/manage
        └── app/api/
              ├── auth/callback       – Supabase OAuth redirect handler
              ├── gate-passes/        – POST (create), GET (list)
              ├── gate-passes/[id]/   – PATCH (approve/deny/checkout/checkin)
              ├── food-menu/          – GET (list by date)
              └── food-menu/[id]/     – PUT (upsert)

Supabase (managed Postgres + Auth)
  ├── auth.users             – managed by Supabase Auth
  ├── public.profiles        – RLS-enabled, mirrors auth.users
  ├── public.gate_passes     – RLS-enabled
  └── public.food_menu       – RLS-enabled
```

**Request flow for an authenticated Route Handler:**

```
Client → Next.js Route Handler
  1. createServerClient(supabase) with cookies
  2. requireRole(supabase, allowedRoles)   → 403 if role not permitted
  3. zodSchema.parse(body)                 → 400 if invalid
  4. supabase.from(table)...               → Postgres (RLS applied at DB layer)
  5. logger.child({ route }).info(...)     → structured log
  6. Return JSON response
```

---

## Directory Structure

```
/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  ← shared shell (sidebar + topbar)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── gate-pass/
│   │   │   ├── page.tsx                ← student view
│   │   │   └── approvals/
│   │   │       └── page.tsx            ← warden view
│   │   ├── checkout/
│   │   │   └── page.tsx                ← security view
│   │   ├── food-menu/
│   │   │   ├── page.tsx                ← read-only, all roles
│   │   │   └── manage/
│   │   │       └── page.tsx            ← mess_manager only
│   │   └── access-denied/
│   │       └── page.tsx
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts
│       ├── gate-passes/
│       │   ├── route.ts                ← GET list, POST create
│       │   └── [id]/
│       │       └── route.ts            ← PATCH approve/deny/checkout/checkin
│       ├── food-menu/
│       │   └── route.ts                ← GET list by date
│       └── food-menu/[id]/
│           └── route.ts                ← PUT upsert
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── nav-config.ts               ← role → nav items mapping
│   ├── gate-pass/
│   │   ├── GatePassCard.tsx
│   │   ├── GatePassForm.tsx
│   │   ├── StatusTracker.tsx
│   │   ├── DenyDialog.tsx
│   │   └── GatePassHistoryTable.tsx
│   ├── checkout/
│   │   └── CheckoutCard.tsx
│   ├── food-menu/
│   │   ├── MealCard.tsx
│   │   └── MealCardEditor.tsx
│   └── dashboard/
│       └── WardenStats.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← browser client
│   │   ├── server.ts                   ← server/RSC client
│   │   └── middleware.ts               ← middleware client
│   ├── auth/
│   │   └── require-role.ts             ← requireRole helper
│   ├── logger.ts                       ← pino root logger
│   └── schemas/
│       ├── gate-pass.schema.ts
│       ├── food-menu.schema.ts
│       └── denial.schema.ts
├── types/
│   └── index.ts                        ← shared TS types (Role, GatePass, FoodMenu, Profile)
├── middleware.ts                       ← Next.js edge middleware
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Database Schema

### `public.profiles`

```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  enrollment_no text,
  role         text not null default 'student'
                 check (role in ('student','warden','security','mess_manager')),
  avatar_url   text,
  phone        text,
  hostel_room  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

A `handle_new_user` trigger on `auth.users` inserts a row into `profiles` on signup with `role = 'student'`.

### `public.gate_passes`

```sql
create table public.gate_passes (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  from_location    text not null default 'Starex University',
  to_location      text not null,
  exit_datetime    timestamptz not null,
  return_datetime  timestamptz not null,
  description      text not null,
  status           text not null default 'pending'
                     check (status in ('pending','approved','denied','checked_out','checked_in')),
  approved_by      uuid references public.profiles(id),
  approved_at      timestamptz,
  denied_reason    text,
  checked_out_at   timestamptz,
  checked_out_by   uuid references public.profiles(id),
  checked_in_at    timestamptz,
  checked_in_by    uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
```

### `public.food_menu`

```sql
create table public.food_menu (
  id          uuid primary key default gen_random_uuid(),
  menu_date   date not null,
  meal_type   text not null
                check (meal_type in ('breakfast','lunch','snacks','dinner')),
  items       text[] not null default '{}',
  start_time  time not null,
  end_time    time not null,
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (menu_date, meal_type)
);
```

---

## Row Level Security Policies

RLS is **enabled** on `profiles`, `gate_passes`, and `food_menu`. Service-role key is never exposed client-side.

### `profiles`

```sql
-- Users can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- Warden and security can read all profiles (for student lookup)
create policy "profiles: staff read"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid())
    in ('warden', 'security')
  );
```

### `gate_passes`

```sql
-- Students: insert own only
create policy "gate_passes: student insert"
  on public.gate_passes for insert
  with check (auth.uid() = student_id
    and (select role from public.profiles where id = auth.uid()) = 'student');

-- Students: select own only
create policy "gate_passes: student select"
  on public.gate_passes for select
  using (auth.uid() = student_id
    and (select role from public.profiles where id = auth.uid()) = 'student');

-- Wardens: full access
create policy "gate_passes: warden all"
  on public.gate_passes for all
  using ((select role from public.profiles where id = auth.uid()) = 'warden')
  with check ((select role from public.profiles where id = auth.uid()) = 'warden');

-- Security: select all
create policy "gate_passes: security select"
  on public.gate_passes for select
  using ((select role from public.profiles where id = auth.uid()) = 'security');

-- Security: update checkout/checkin fields only
-- Enforced by limiting which columns are touched in the route handler;
-- the RLS policy permits the update row-level, column-level restriction
-- is handled by the route handler's requireRole + explicit field allowlist.
create policy "gate_passes: security update"
  on public.gate_passes for update
  using ((select role from public.profiles where id = auth.uid()) = 'security');
```

> Note: Postgres RLS does not support per-column UPDATE restrictions natively. Column-level enforcement for security (only `status`, `checked_out_*`, `checked_in_*`) is handled in the Route Handler — the handler constructs the update object with an explicit field allowlist. The RLS policy provides the row-level permission; the route handler enforces the column-level restriction.

### `food_menu`

```sql
-- All authenticated users can read
create policy "food_menu: authenticated read"
  on public.food_menu for select
  using (auth.role() = 'authenticated');

-- Only mess_manager can insert
create policy "food_menu: mess_manager insert"
  on public.food_menu for insert
  with check ((select role from public.profiles where id = auth.uid()) = 'mess_manager');

-- Only mess_manager can update
create policy "food_menu: mess_manager update"
  on public.food_menu for update
  using ((select role from public.profiles where id = auth.uid()) = 'mess_manager')
  with check ((select role from public.profiles where id = auth.uid()) = 'mess_manager');
```

---

## Authentication Flow

```
/login page
  ├── Email + Password
  │     └── supabase.auth.signInWithPassword()
  │           ├── success → redirect /dashboard
  │           └── error   → inline form error
  ├── "Sign in with Google"
  │     └── supabase.auth.signInWithOAuth({ provider: 'google' })
  │           └── redirect → /api/auth/callback → /dashboard
  └── "Forgot Password"
        └── supabase.auth.resetPasswordForEmail()
              └── always show confirmation (no email enumeration)

Middleware (middleware.ts)
  ├── supabase.auth.getSession()
  ├── no session → redirect /login
  └── has session → attach user to request, continue
```

The `auth/callback` route handler exchanges the OAuth code for a session cookie:

```typescript
// app/api/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createServerClient(...)
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## Shared Zod Schemas

Located in `lib/schemas/` — imported by both client forms (React Hook Form + zodResolver) and Route Handlers.

### `gate-pass.schema.ts`

```typescript
export const createGatePassSchema = z.object({
  to_location:      z.string().min(1, 'Destination is required'),
  exit_datetime:    z.string().datetime().refine(v => new Date(v) > new Date(), {
                      message: 'Exit time must be in the future'
                    }),
  return_datetime:  z.string().datetime(),
  description:      z.string().min(1, 'Description is required'),
  declaration:      z.literal(true, { errorMap: () => ({ message: 'You must accept the declaration' }) }),
}).refine(d => new Date(d.return_datetime) > new Date(d.exit_datetime), {
  message: 'Return time must be after exit time',
  path: ['return_datetime'],
})
```

### `food-menu.schema.ts`

```typescript
export const upsertFoodMenuSchema = z.object({
  menu_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type:  z.enum(['breakfast', 'lunch', 'snacks', 'dinner']),
  items:      z.array(z.string().min(1)).min(1, 'At least one item is required'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time:   z.string().regex(/^\d{2}:\d{2}$/),
}).refine(d => d.end_time > d.start_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
})
```

### `denial.schema.ts`

```typescript
export const denyGatePassSchema = z.object({
  denied_reason: z.string().min(10, 'Reason must be at least 10 characters'),
})
```

---

## `requireRole` Helper

```typescript
// lib/auth/require-role.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export type Role = 'student' | 'warden' | 'security' | 'mess_manager'

export async function requireRole(
  supabase: SupabaseClient,
  allowedRoles: Role[]
): Promise<{ userId: string; role: Role }> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !allowedRoles.includes(profile.role as Role)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  return { userId: user.id, role: profile.role as Role }
}
```

Route handlers wrap execution in a try/catch that converts thrown errors to JSON responses:

```typescript
export async function POST(request: Request) {
  const log = logger.child({ route: '/api/gate-passes' })
  const supabase = createRouteHandlerClient()
  try {
    const { userId } = await requireRole(supabase, ['student'])
    const body = createGatePassSchema.parse(await request.json())
    // ... db insert
    log.info({ status: 201 }, 'gate pass created')
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    log.error({ err, status: err.status ?? 500 }, 'handler error')
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
```

---

## API Route Design

### Gate Passes

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/api/gate-passes` | student, warden, security | List passes. Student gets own; warden/security get all. Query params: `status`, `search` |
| `POST` | `/api/gate-passes` | student | Create a new gate pass |
| `PATCH` | `/api/gate-passes/[id]` | warden, security | Update status. Body `action`: `approve` / `deny` / `checkout` / `checkin` |

**PATCH action dispatch:**

```
action = "approve"  → requireRole(['warden'])  → set status=approved, approved_by, approved_at
action = "deny"     → requireRole(['warden'])  → validate denySchema → set status=denied, denied_reason
action = "checkout" → requireRole(['security']) → set status=checked_out, checked_out_by/at
action = "checkin"  → requireRole(['security']) → set status=checked_in, checked_in_by/at
```

The update object for `checkout` / `checkin` uses an **explicit field allowlist** (never spreads the request body) to satisfy the column-level restriction requirement.

### Food Menu

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/api/food-menu?date=YYYY-MM-DD` | all authenticated | Returns up to 4 records for the given date |
| `PUT` | `/api/food-menu` | mess_manager | Upsert a single meal record |

### Dashboard Stats (Warden)

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | warden | Returns `{ pending, outCampus, inCampus, todayMeals }` |

---

## Component Design

### `AppSidebar` + `nav-config.ts`

Navigation is driven by a static config keyed by role:

```typescript
// components/layout/nav-config.ts
export const NAV_CONFIG: Record<Role, NavItem[]> = {
  student:      [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
                 { label: 'Gate Pass',  href: '/gate-pass',  icon: DoorOpen },
                 { label: 'Food Menu',  href: '/food-menu',  icon: UtensilsCrossed }],
  warden:       [{ label: 'Dashboard',          href: '/dashboard',          icon: LayoutDashboard },
                 { label: 'Pass Approvals',      href: '/gate-pass/approvals', icon: CheckSquare },
                 { label: 'Food Menu',           href: '/food-menu',           icon: UtensilsCrossed }],
  security:     [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
                 { label: 'Checkout',  href: '/checkout',  icon: LogOut },
                 { label: 'Food Menu', href: '/food-menu', icon: UtensilsCrossed }],
  mess_manager: [{ label: 'Dashboard',     href: '/dashboard',       icon: LayoutDashboard },
                 { label: 'Food Menu',     href: '/food-menu',       icon: UtensilsCrossed },
                 { label: 'Manage Menu',   href: '/food-menu/manage', icon: ClipboardEdit }],
}
```

The `AppSidebar` reads the user's role from the server session (passed via layout props) and renders only its role's nav items. No client-side role check in the sidebar; the layout server component fetches the session once.

### `StatusTracker`

```typescript
// components/gate-pass/StatusTracker.tsx
// Props: status: GatePassStatus, deniedReason?: string
// Steps array: ['Gate Pass Generated', "Warden's Approval", 'Check Out', 'Check In']
// stepIndex for "current" step:
//   pending      → 1  (step 2 active)
//   approved     → 2  (step 3 active)
//   denied       → 1  (step 2 denied variant)
//   checked_out  → 3  (step 4 active)
//   checked_in   → 4  (all complete)
```

### `GatePassCard` (Warden view)

Displays: avatar placeholder, enrollment_no, full_name, route badge (Starex → destination), exit/return datetimes, "More Info" button (opens shadcn Dialog), Deny + Approve buttons. Optimistic UI: on action success, calls `onActionComplete(id)` which removes the card from the parent list.

### `CheckoutCard` (Security view)

Same visual shape as `GatePassCard` but with a single action button ("Check Out" or "Check In") and an "Approved" / "Checked Out" status badge.

### `MealCardEditor` (Mess Manager)

Wraps shadcn `Card` with a `Form` containing: time inputs for start/end, a dynamic item list (add/remove with `+` / `×` buttons), and a Save button. On submit, calls `PUT /api/food-menu`. Shows Skeleton while loading.

### `MealCard` (Read-only)

Renders meal name, time window, and item list. Shows "No menu set for this meal." empty state if no record. Highlights the card whose time window currently contains `now()`.

---

## Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/callback']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Page-level role enforcement is done in each server component (fetch session → check role → return 403 page). This is in addition to middleware, not a replacement.

---

## Dashboard Variants

| Role | Dashboard content |
|---|---|
| **student** | Welcome card with name, today's 4 meal time windows, link to Gate Pass |
| **warden** | Stat cards: Pending Approvals, Out of Campus, In Campus. Today's meal times row. Quick link to Approvals. |
| **security** | Today's meal times. Quick link to Checkout. Active checked-out count. |
| **mess_manager** | Today's meal cards (read-only). Link to Manage Menu. |

---

## Supabase Client Instantiation

Three distinct clients, never mixed:

| Client | File | Used in |
|---|---|---|
| Browser client | `lib/supabase/client.ts` | Client Components (form submit, real-time if added later) |
| Server / RSC client | `lib/supabase/server.ts` | Server Components, Route Handlers |
| Middleware client | `lib/supabase/middleware.ts` | `middleware.ts` only |

All three use `@supabase/ssr` (the recommended package for Next.js App Router) with cookie-based session management.

---

## Pino Logger Setup

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token'],
})
```

Usage in a route handler:

```typescript
const log = logger.child({ route: '/api/gate-passes/[id]' })
log.info({ method: 'PATCH', gatePassId: id }, 'handling request')
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only, never exposed to browser

# App
NEXT_PUBLIC_APP_URL=            # used for OAuth redirect URLs

# Logging
LOG_LEVEL=info                  # debug in dev, info in prod
```

---

## Key Design Decisions & Rationale

1. **Single route group `(dashboard)` with one `layout.tsx`** — avoids duplicating the shell across roles. The layout fetches the session server-side, derives the role, and passes it as props. No client-side role check in the layout.

2. **`PATCH /api/gate-passes/[id]` with `action` discriminator** — a single endpoint handles all four state transitions. The `action` field acts as a discriminated union so each transition can enforce its own role and field allowlist without separate route files.

3. **Explicit field allowlist for security updates** — Postgres RLS cannot restrict which columns are updated. The route handler constructs the update payload manually (`{ status, checked_out_by, checked_out_at }`) and never spreads the request body, providing the column-level restriction that RLS cannot.

4. **Zod schemas in `lib/schemas/`** — imported on both sides. Client uses `zodResolver` from `@hookform/resolvers/zod`. Server calls `.parse()` / `.safeParse()`. Same file, no duplication.

5. **`requireRole` throws, not returns** — the helper throws an error with a `.status` property. The route handler's catch block converts it to a `NextResponse.json()`. This keeps the happy path linear and the error path consistent.

6. **No real-time subscriptions in MVP** — UI updates after actions use optimistic local state mutations (remove card from list on success). Server state is refetched on tab focus via standard React patterns. This keeps the MVP simple; Supabase Realtime can be layered in post-MVP.

7. **Google OAuth redirect** — `NEXT_PUBLIC_APP_URL/api/auth/callback` is registered in Supabase and Google Cloud Console. The callback route exchanges the code for a session cookie and redirects to `/dashboard`.
