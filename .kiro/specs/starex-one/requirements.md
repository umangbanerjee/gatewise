# Requirements Document

## Introduction

Starex One is a single web application for Starex University's student hostel that serves four roles — student, warden, security, and mess_manager — through one shared URL and a role-aware dashboard shell. The MVP covers two features: a Gate Pass lifecycle (student creates → warden approves/denies → security checks out/in) and a Food Menu board (mess manager publishes meals; everyone else views read-only). The stack is Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth + RLS), Zod, Pino, deployed on Vercel.

---

## Glossary

- **System**: The Starex One web application as a whole.
- **Student**: An authenticated user with `profiles.role = 'student'`.
- **Warden**: An authenticated user with `profiles.role = 'warden'`.
- **Security**: An authenticated user with `profiles.role = 'security'`.
- **Mess_Manager**: An authenticated user with `profiles.role = 'mess_manager'`.
- **Gate_Pass**: A record in the `gate_passes` table representing a student's request to exit the hostel premises.
- **Gate_Pass_Status**: The enum value on `gate_passes.status`; one of `pending`, `approved`, `denied`, `checked_out`, `checked_in`.
- **Food_Menu**: A record in the `food_menu` table representing the items and time window for a single meal on a single date.
- **Meal_Type**: The enum value on `food_menu.meal_type`; one of `breakfast`, `lunch`, `snacks`, `dinner`.
- **Dashboard_Shell**: The shared Next.js layout component that renders the sidebar and top bar, with navigation items that vary by role.
- **Route_Handler**: A Next.js API route under `app/api/**` that processes server-side requests.
- **RLS**: Supabase Row Level Security policies applied to Postgres tables.
- **RequireRole**: A server-side helper function called at the start of every Route_Handler to verify the authenticated user's role against the set of permitted roles.
- **Zod_Schema**: A Zod validation schema shared between client-side forms and Route_Handlers.
- **Pino_Logger**: A structured JSON logger (pino) with one child logger instantiated per Route_Handler.
- **Declaration_Checkbox**: A required checkbox on the gate-pass creation form that the Student must tick to confirm the accuracy of the submitted information.
- **Status_Tracker**: The four-step visual progress indicator on the student's gate-pass detail view: Gate Pass Generated → Warden's Approval → Check Out → Check In.
- **In_Campus_Count**: The count of students whose most recent Gate_Pass has `status = 'checked_out'` (they have left) subtracted from total students — i.e., the number currently on campus.
- **Out_Campus_Count**: The count of Gate_Pass records with `status = 'checked_out'` at the time of dashboard load.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As any user (student, warden, security, or mess_manager), I want to sign in with my email/password or Google account, so that I can access the features permitted to my role.

#### Acceptance Criteria

1. THE System SHALL render a `/login` page containing an email/password form and a "Sign in with Google" button.
2. WHEN a user submits valid email and password credentials, THE System SHALL authenticate the user via Supabase Auth and redirect the authenticated user to `/dashboard`.
3. WHEN a user clicks "Sign in with Google", THE System SHALL initiate the Supabase Google OAuth flow and redirect the authenticated user to `/dashboard` upon successful OAuth callback.
4. IF a user submits an email/password combination that does not match any Supabase Auth record, THEN THE System SHALL display an inline error message on the login form without redirecting.
5. WHEN a user clicks "Forgot Password", THE System SHALL trigger a password-reset email via Supabase Auth to the provided email address and display a confirmation message; password-reset emails SHALL only be triggered by an explicit user click on "Forgot Password" and not by any other automated or administrative process.
6. IF the email service fails when sending a password-reset email, THEN THE System SHALL still display the same confirmation message to the user.
7. IF a password-reset email is requested for an email address not present in Supabase Auth, THEN THE System SHALL display the same confirmation message as for a valid address, so that email addresses are not enumerated.
8. WHILE a user is unauthenticated, THE System SHALL redirect any request to a route other than `/login` to `/login`.
9. WHILE a user is authenticated, THE System SHALL redirect a request to `/login` to `/dashboard`.
10. THE System SHALL assign `profiles.role = 'student'` to every new user created via public sign-up, without allowing self-serve role escalation.

---

### Requirement 2: Role-Aware Dashboard Shell

**User Story:** As any authenticated user, I want a consistent application shell with navigation that reflects my role, so that I can only access the pages relevant to my permissions.

#### Acceptance Criteria

1. THE Dashboard_Shell SHALL render a sidebar and top bar as a shared Next.js layout that wraps all authenticated routes.
2. THE Dashboard_Shell SHALL display navigation items according to the following role-to-route mapping:
   - Student: Dashboard, Gate Pass
   - Warden: Dashboard, Gate Pass Approvals
   - Security: Dashboard, Checkout
   - Mess_Manager: Dashboard, Food Menu, Food Menu Manage
   - All roles: Food Menu (read-only view)
3. WHEN an authenticated user requests a route not permitted for their role, THE System SHALL return an HTTP 403 response and render an "Access Denied" page; WHEN an authenticated user requests a route that is permitted for their role but does not exist in the application, THE System SHALL return an HTTP 404 response.
4. THE Dashboard_Shell SHALL display the authenticated user's full name and role on every page.
5. WHEN a user clicks the sign-out control in the Dashboard_Shell, THE System SHALL call Supabase Auth sign-out and redirect the user to `/login`.

---

### Requirement 3: Middleware Route Protection

**User Story:** As the system operator, I want all routes to be protected server-side by role, so that unauthenticated or insufficiently privileged users cannot access any protected resource.

#### Acceptance Criteria

1. THE System SHALL include a Next.js middleware file that runs on every request to protected routes.
2. WHEN the middleware processes a request from an unauthenticated session, THE System SHALL redirect the request to `/login`.
3. THE RequireRole helper SHALL accept a Route_Handler context and an array of permitted roles, and SHALL throw an HTTP 403 error if the authenticated user's role is not in the permitted array.
4. EVERY Route_Handler SHALL invoke RequireRole at the start of its execution before performing any database operation.
5. THE System SHALL enforce role-based access at two independent layers: the Route_Handler (via RequireRole) and Postgres (via RLS), so that bypassing one layer does not grant access.

---

### Requirement 4: Gate Pass Creation (Student)

**User Story:** As a student, I want to submit a gate-pass request with my travel details and a declaration, so that I can get warden approval before leaving the hostel.

#### Acceptance Criteria

1. THE System SHALL render a `/gate-pass` page for authenticated Students containing an "On-Going" tab and a "History" tab.
2. THE System SHALL render a gate-pass creation form on the `/gate-pass` page accessible to Students only.
3. THE gate-pass creation form SHALL include the following fields: destination (to_location), exit date and time (exit_datetime), return date and time (return_datetime), description, and Declaration_Checkbox.
4. THE System SHALL pre-populate the `from_location` field with the value "Starex University" and SHALL NOT allow the Student to edit it.
5. WHEN a Student submits the gate-pass creation form, THE System SHALL validate all fields against the Gate_Pass Zod_Schema on both client and server before persisting any data.
6. IF the Declaration_Checkbox is unchecked when the Student submits the form, THEN THE System SHALL display a validation error and SHALL NOT submit the form.
7. IF `exit_datetime` is not before `return_datetime`, THEN THE System SHALL display a validation error and SHALL NOT submit the form.
8. IF `exit_datetime` is before the current server time, THEN THE System SHALL display a validation error and SHALL NOT submit the form.
9. WHEN a valid gate-pass creation form is submitted, THE System SHALL insert a Gate_Pass record with `status = 'pending'` and `student_id` set to the authenticated Student's user id.
10. WHEN a Gate_Pass record is successfully created, THE System SHALL display a success toast notification and update the "On-Going" tab to show the new Gate_Pass.
11. THE System SHALL enforce via RLS that a Student can only insert Gate_Pass records where `student_id` matches their own user id.
12. THE System SHALL enforce via RLS that a Student can only read Gate_Pass records where `student_id` matches their own user id.

---

### Requirement 5: Gate Pass Status Tracker (Student View)

**User Story:** As a student, I want to see the current status of each of my gate passes with a step-by-step tracker, so that I know where my request stands in the approval lifecycle.

#### Acceptance Criteria

1. THE System SHALL display a Status_Tracker for each Gate_Pass on the Student's `/gate-pass` page showing four steps in order: "Gate Pass Generated", "Warden's Approval", "Check Out", "Check In".
2. THE Status_Tracker SHALL visually mark completed steps as complete and the current active step as active based on the Gate_Pass_Status value, according to this mapping:
   - `pending` → step 1 complete, step 2 active
   - `approved` → steps 1–2 complete, step 3 active
   - `denied` → steps 1–2 shown with "Denied" indicator, steps 3–4 inactive
   - `checked_out` → steps 1–3 complete, step 4 active
   - `checked_in` → all four steps complete
3. WHEN a Gate_Pass has `status = 'denied'`, THE System SHALL display the `denied_reason` text beneath the Status_Tracker.
4. THE System SHALL show Gate_Pass records with `status` in (`pending`, `approved`, `checked_out`) in the "On-Going" tab.
5. THE System SHALL show Gate_Pass records with `status` in (`denied`, `checked_in`) in the "History" tab.

---

### Requirement 6: Gate Pass Approval (Warden)

**User Story:** As a warden, I want to review pending gate-pass requests and approve or deny them with a reason, so that students can proceed to security check-out.

#### Acceptance Criteria

1. THE System SHALL render a `/gate-pass/approvals` page accessible to Wardens only, containing a "Pending" tab and a "History" tab.
2. THE System SHALL display all Gate_Pass records with `status = 'pending'` in the "Pending" tab as individual cards, each showing: enrollment number, student full name, from_location → to_location route, exit_datetime, return_datetime, and description.
3. THE System SHALL display a "More Info" control on each pending Gate_Pass card that, WHEN clicked, opens a detail view showing all Gate_Pass fields.
4. WHEN a Warden clicks "Approve" on a Gate_Pass card, THE System SHALL update the Gate_Pass record: set `status = 'approved'`, set `approved_by` to the Warden's user id, and set `approved_at` to the current server timestamp.
5. WHEN a Warden clicks "Deny" on a Gate_Pass card, THE System SHALL display a dialog prompting the Warden to enter a denial reason before confirming.
6. WHEN a Warden confirms denial with a non-empty reason, THE System SHALL update the Gate_Pass record: set `status = 'denied'`, set `approved_by` to the Warden's user id, set `approved_at` to the current server timestamp, and set `denied_reason` to the entered text.
7. IF a Warden confirms denial with an empty reason, THEN THE System SHALL display a validation error and SHALL NOT update the Gate_Pass record.
8. THE System SHALL display all Gate_Pass records with `status` in (`approved`, `denied`, `checked_out`, `checked_in`) in the "History" tab for Wardens, with columns: ID, Student Name, Out Time, Location, Status.
9. THE System SHALL enforce via RLS that Wardens have SELECT and UPDATE access to all Gate_Pass records.
10. WHEN the Gate_Pass status is updated, THE System SHALL remove the card from the "Pending" tab and add it to the appropriate list in the "History" tab without requiring a full page reload.

---

### Requirement 7: Gate Pass Check-Out and Check-In (Security)

**User Story:** As a security officer, I want to search for a student's approved gate pass and record their departure and return, so that the hostel has an accurate record of who is on campus.

#### Acceptance Criteria

1. THE System SHALL render a `/checkout` page; WHEN an authenticated user whose role is not `security` requests `/checkout`, THE System SHALL deny access and return an HTTP 403 response. THE System SHALL render a "Check Out" tab and a "Check In" tab on the `/checkout` page for authenticated Security users.
2. THE System SHALL display a search input on both tabs that filters Gate_Pass records by student full name or enrollment number as the Security user types, with results appearing within 300ms of the last keystroke.
3. THE "Check Out" tab SHALL display Gate_Pass records with `status = 'approved'` that match the current search query.
4. THE "Check In" tab SHALL display Gate_Pass records with `status = 'checked_out'` that match the current search query.
5. WHEN a Security user clicks "Check Out" on an approved Gate_Pass card, THE System SHALL update the Gate_Pass record: set `status = 'checked_out'`, set `checked_out_by` to the Security user's user id, and set `checked_out_at` to the current server timestamp.
6. WHEN a Security user clicks "Check In" on a checked-out Gate_Pass card, THE System SHALL update the Gate_Pass record: set `status = 'checked_in'`, set `checked_in_by` to the Security user's user id, and set `checked_in_at` to the current server timestamp.
7. THE System SHALL enforce via RLS that Security users have SELECT access to all Gate_Pass records and UPDATE access only to the fields `status`, `checked_out_at`, `checked_out_by`, `checked_in_at`, `checked_in_by`.
8. IF a Security user attempts to update any Gate_Pass field outside the permitted set, THEN THE System SHALL return an HTTP 403 error.
9. WHEN a Gate_Pass status is updated by the Security user, THE System SHALL remove the card from its current tab and update the display without requiring a full page reload.

---

### Requirement 8: Warden Dashboard Counts

**User Story:** As a warden, I want to see a summary of pending approvals and campus occupancy on my dashboard, so that I can quickly assess the current hostel situation.

#### Acceptance Criteria

1. THE System SHALL display on the Warden's `/dashboard` page: the count of Gate_Pass records with `status = 'pending'` ("Pending Approvals"), the Out_Campus_Count, and the In_Campus_Count.
2. THE System SHALL calculate Out_Campus_Count as the count of Gate_Pass records with `status = 'checked_out'` at the time the dashboard page is loaded.
3. THE System SHALL calculate In_Campus_Count as the count of students whose last gate pass does not have `status = 'checked_out'` (i.e., total enrolled students minus Out_Campus_Count).
4. THE System SHALL display today's four meal time windows (start_time and end_time for each Meal_Type) on the Warden's `/dashboard` page.

---

### Requirement 9: Food Menu View (All Roles)

**User Story:** As any authenticated user, I want to view the food menu for any date, so that I know what meals are being served and when.

#### Acceptance Criteria

1. THE System SHALL render a `/food-menu` page accessible to all authenticated roles.
2. THE System SHALL display four meal cards on the `/food-menu` page, one per Meal_Type (Breakfast, Lunch, Snacks, Dinner), for the currently selected date.
3. EACH meal card SHALL display: the Meal_Type label, the start_time and end_time of the meal window, and the list of items.
4. THE System SHALL provide a date picker on the `/food-menu` page that allows the user to select any date; WHEN a new date is selected, THE System SHALL update all four meal cards to reflect the Food_Menu records for that date.
5. IF no Food_Menu record exists for a given Meal_Type on the selected date, THEN THE System SHALL display an empty state message on that meal card (e.g., "No menu set for this meal.").
6. THE System SHALL enforce via RLS that all authenticated users have SELECT access to all Food_Menu records.
7. THE System SHALL enforce via RLS that only Mess_Manager users have INSERT and UPDATE access to Food_Menu records; all other roles SHALL be explicitly denied INSERT and UPDATE access to Food_Menu records via RLS.

---

### Requirement 10: Food Menu Management (Mess Manager)

**User Story:** As a mess manager, I want to set and update the items and time window for each meal on any given date, so that students and staff always see an accurate menu.

#### Acceptance Criteria

1. THE System SHALL render a `/food-menu/manage` page accessible to Mess_Manager users only.
2. THE `/food-menu/manage` page SHALL display the same four meal cards as `/food-menu` for the selected date, but with each card in an editable state.
3. EACH editable meal card SHALL contain: a start_time input, an end_time input, and an items list editor that allows the Mess_Manager to add, edit, and remove individual item strings.
4. WHEN a Mess_Manager submits an edited meal card, THE System SHALL validate the Food_Menu fields against the Food_Menu Zod_Schema on both client and server before persisting data.
5. IF `start_time` is not before `end_time` for a meal card, THEN THE System SHALL display a validation error and SHALL NOT persist the record.
6. WHEN valid meal data is submitted, THE System SHALL upsert the Food_Menu record using `(menu_date, meal_type)` as the unique key, set `updated_by` to the Mess_Manager's user id, and return the updated record.
7. WHEN a Food_Menu record is successfully upserted, THE System SHALL display a success toast notification and update the meal card to reflect the saved data.
8. THE RequireRole helper SHALL reject any request to the Food_Menu write Route_Handler where the authenticated user's role is not `mess_manager` with an HTTP 403 error.

---

### Requirement 11: Structured Logging

**User Story:** As a system operator, I want every API route to emit structured JSON logs, so that I can trace requests and diagnose issues in production.

#### Acceptance Criteria

1. THE System SHALL use Pino_Logger as the logging library for all Route_Handlers.
2. EACH Route_Handler SHALL instantiate a child Pino_Logger with a `route` field set to the handler's path (e.g., `{ route: '/api/gate-passes' }`).
3. WHEN a Route_Handler begins processing a request, THE Pino_Logger SHALL emit an `info`-level log entry containing the HTTP method and route path.
4. WHEN a Route_Handler completes successfully, THE Pino_Logger SHALL emit an `info`-level log entry containing the HTTP status code and response time in milliseconds.
5. WHEN a Route_Handler encounters an error, THE Pino_Logger SHALL emit an `error`-level log entry containing the error message, error stack, and HTTP status code returned to the client.

---

### Requirement 12: Input Validation with Shared Zod Schemas

**User Story:** As a developer, I want all user inputs validated by the same schema on both client and server, so that invalid data cannot reach the database regardless of client-side bypass.

#### Acceptance Criteria

1. THE System SHALL define a Zod_Schema for Gate_Pass creation that validates: `to_location` (non-empty string), `exit_datetime` (ISO 8601 datetime, must be after current time), `return_datetime` (ISO 8601 datetime, must be after `exit_datetime`), `description` (non-empty string), `declaration` (boolean, must be `true`).
2. THE System SHALL define a Zod_Schema for Food_Menu upsert that validates: `menu_date` (valid calendar date string), `meal_type` (one of the four Meal_Type enum values), `items` (array of non-empty strings, minimum one item), `start_time` (valid time string), `end_time` (valid time string, must be after `start_time`).
3. THE System SHALL define a Zod_Schema for Warden denial that validates: `denied_reason` (non-empty string, minimum 10 characters).
4. WHEN client-side form validation fails, THE System SHALL display field-level error messages adjacent to the invalid field without submitting the request to the Route_Handler.
5. WHEN server-side Zod validation fails on a Route_Handler, THE System SHALL return an HTTP 400 response containing a structured error payload that maps each invalid field to its error message.
6. THE same Zod_Schema definition SHALL be imported and used by both the client-side form and the corresponding Route_Handler to ensure a single source of truth.

---

### Requirement 13: UI Component Library Constraints

**User Story:** As a developer, I want all interactive UI elements built with shadcn/ui primitives, so that the application has a consistent visual language and accessible components.

#### Acceptance Criteria

1. THE System SHALL use shadcn/ui Button for all clickable action elements (approve, deny, submit, sign-in, etc.).
2. THE System SHALL use shadcn/ui Card for all gate-pass request cards and food-menu meal cards.
3. THE System SHALL use shadcn/ui Dialog for the denial-reason prompt and any confirmation modals.
4. THE System SHALL use shadcn/ui Tabs for the On-Going/History, Pending/History, and Check Out/Check In tab groups.
5. THE System SHALL use shadcn/ui Calendar and Popover for all date picker interactions.
6. THE System SHALL use shadcn/ui Skeleton for loading state placeholders on all data-fetching views.
7. THE System SHALL use Sonner (via shadcn/ui integration) for all toast notifications (success and error).
8. THE System SHALL use shadcn/ui Badge for all Gate_Pass_Status indicators in tables and cards.
9. THE System SHALL use shadcn/ui Table for the gate-pass history view with columns: ID, Student Name, Out Time, Location, Action, Status.
10. THE System SHALL use shadcn/ui Form, Input, Textarea, and Checkbox components for all form fields.
