# Tasks — Starex One MVP

## Task 1: Repo Scaffold & Tooling Setup
- [x] 1.1 Initialise Next.js 14 project with TypeScript, Tailwind CSS, and App Router (`create-next-app`)
- [x] 1.2 Install core dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`, `pino`, `sonner`, `lucide-react`
- [x] 1.3 Initialise shadcn/ui and add required components: button, card, dialog, tabs, calendar, popover, skeleton, badge, table, form, input, textarea, checkbox, separator, avatar, sheet
- [x] 1.4 Create `.env.local.example` with all required env var keys
- [x] 1.5 Set up `lib/logger.ts` (pino root logger with redact config)
- [x] 1.6 Create `types/index.ts` with shared TypeScript types (Role, GatePass, FoodMenu, Profile)
- [x] 1.7 Create three Supabase client files: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`

## Task 2: Database Migration & RLS
- [x] 2.1 Write `supabase/migrations/001_initial.sql` with `profiles`, `gate_passes`, `food_menu` table DDL
- [x] 2.2 Add `handle_new_user` trigger that inserts into `profiles` on `auth.users` insert with `role = 'student'`
- [x] 2.3 Enable RLS on all three tables
- [x] 2.4 Write all RLS policies (profiles own/staff read; gate_passes student/warden/security; food_menu authenticated read / mess_manager write)
- [x] 2.5 Add `updated_at` auto-update triggers for `profiles`, `gate_passes`, `food_menu`

## Task 3: Zod Schemas
- [x] 3.1 Create `lib/schemas/gate-pass.schema.ts` (createGatePassSchema with all field + cross-field validations)
- [x] 3.2 Create `lib/schemas/food-menu.schema.ts` (upsertFoodMenuSchema)
- [x] 3.3 Create `lib/schemas/denial.schema.ts` (denyGatePassSchema, min 10 chars)

## Task 4: Auth & Middleware
- [x] 4.1 Create `middleware.ts` — session check, redirect unauthenticated → /login, redirect authenticated /login → /dashboard
- [x] 4.2 Create `app/api/auth/callback/route.ts` — OAuth code exchange
- [x] 4.3 Create `lib/auth/require-role.ts` — requireRole helper (throws 401/403)

## Task 5: Login Page
- [x] 5.1 Create `app/(auth)/login/page.tsx` — split-pane layout (campus photo left, form right)
- [x] 5.2 Implement email/password sign-in form (shadcn Form + Input) with inline error display
- [x] 5.3 Implement "Sign in with Google" button (shadcn Button) triggering Supabase OAuth
- [x] 5.4 Implement "Forgot Password" link → password reset email → confirmation message (no email enumeration)

## Task 6: Dashboard Shell
- [x] 6.1 Create `components/layout/nav-config.ts` — role → NavItem[] mapping
- [x] 6.2 Create `components/layout/AppSidebar.tsx` — shadcn Sidebar, role-filtered nav, Starex University logo, sign-out button
- [x] 6.3 Create `components/layout/TopBar.tsx` — user full name, role badge, avatar
- [x] 6.4 Create `app/(dashboard)/layout.tsx` — server component, fetches session, derives role, renders AppSidebar + TopBar
- [x] 6.5 Create `app/(dashboard)/access-denied/page.tsx` — 403 page

## Task 7: Dashboard Pages (all roles)
- [x] 7.1 Create `app/api/dashboard/stats/route.ts` — GET, warden only, returns pending/outCampus/inCampus/todayMeals
- [x] 7.2 Create `components/dashboard/WardenStats.tsx` — three stat cards + today's meal time rows
- [x] 7.3 Create `app/(dashboard)/dashboard/page.tsx` — role-aware: warden uses WardenStats; student/security/mess_manager show welcome card + today's meals

## Task 8: Gate Pass API Routes
- [x] 8.1 Create `app/api/gate-passes/route.ts` — GET (role-scoped list with optional `status`/`search` params) + POST (create, student only)
- [x] 8.2 Create `app/api/gate-passes/[id]/route.ts` — PATCH with `action` discriminator (approve/deny/checkout/checkin); explicit field allowlist for security actions

## Task 9: Gate Pass — Student UI
- [x] 9.1 Create `components/gate-pass/GatePassForm.tsx` — shadcn Form with all fields, declaration checkbox, date/time pickers
- [x] 9.2 Create `components/gate-pass/StatusTracker.tsx` — 4-step tracker, status → step mapping, denied_reason display
- [x] 9.3 Create `app/(dashboard)/gate-pass/page.tsx` — On-Going / History tabs; form on On-Going tab; StatusTracker per pass

## Task 10: Gate Pass — Warden UI
- [x] 10.1 Create `components/gate-pass/GatePassCard.tsx` — enrollment no, name, route, dates, Deny/Approve buttons, More Info button
- [x] 10.2 Create `components/gate-pass/DenyDialog.tsx` — shadcn Dialog with denial reason input (min 10 chars validation)
- [x] 10.3 Create `components/gate-pass/GatePassHistoryTable.tsx` — shadcn Table with columns: ID, Student Name, Out Time, Location, Status badge
- [x] 10.4 Create `app/(dashboard)/gate-pass/approvals/page.tsx` — Pending / History tabs; card grid + optimistic removal on action

## Task 11: Checkout — Security UI
- [x] 11.1 Create `components/checkout/CheckoutCard.tsx` — same shape as GatePassCard, single action button, status badge
- [x] 11.2 Create `app/(dashboard)/checkout/page.tsx` — Check Out / Check In tabs, search input (debounced 300ms), card grid

## Task 12: Food Menu API Routes
- [x] 12.1 Create `app/api/food-menu/route.ts` — GET by date (all authenticated), PUT upsert (mess_manager only)

## Task 13: Food Menu — Read-only UI (all roles)
- [x] 13.1 Create `components/food-menu/MealCard.tsx` — meal name, time window, item list, empty state, highlights current meal
- [x] 13.2 Create `app/(dashboard)/food-menu/page.tsx` — date picker (shadcn Calendar + Popover), four MealCard components, loading skeletons

## Task 14: Food Menu — Manage UI (mess_manager)
- [x] 14.1 Create `components/food-menu/MealCardEditor.tsx` — editable Card with time inputs, dynamic item list (add/remove), Save button
- [x] 14.2 Create `app/(dashboard)/food-menu/manage/page.tsx` — date picker, four MealCardEditor components, role guard (403 if not mess_manager)

## Task 15: End-to-End Verification
- [x] 15.1 Manually trace full gate-pass lifecycle: student creates → warden approves → security checks out → security checks in
- [x] 15.2 Verify mess_manager edit to today's menu is immediately visible on the read-only /food-menu page
- [x] 15.3 Verify a student cannot hit `/api/gate-passes` PATCH approve action (expect 403 from route handler)
- [x] 15.4 Verify RLS blocks student from reading another student's gate pass directly via Supabase client
- [x] 15.5 Add `.env.local` with real Supabase project credentials and verify app boots
