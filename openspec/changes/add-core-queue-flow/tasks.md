# Tasks

## 1. Project setup

- [ ] 1.1 Scaffold a Next.js App Router project with TypeScript, ESLint, and a minimal stylesheet; verify `npm run build` succeeds on the empty app
- [ ] 1.2 Add Prisma and the PostgreSQL driver, create `.env.example` with `DATABASE_URL`; verify `npx prisma validate` accepts the initial schema
- [ ] 1.3 Write README local-setup instructions (database, migrate, seed, run); verify the documented commands work from a clean checkout

## 2. Data model and tenancy foundation

- [ ] 2.1 Model `Business`, `StaffUser`, `Counter`, `Ticket`, `DailySequence`, and `StaffSession` with the design's unique and partial indexes; verify the migration applies and the partial unique index exists in `psql`
- [ ] 2.2 Add a seed script creating two demo businesses with counters and staff accounts; verify re-running the seed is idempotent and both logins resolve
- [ ] 2.3 Implement business lookup by slug plus the timezone-based `serviceDate` helper; verify unit tests cover a DST transition and a non-UTC business timezone
- [ ] 2.4 Implement tenant-scoped data access helpers that require a business id; verify an integration test cannot read or write a second business's rows through them

## 3. Staff authentication and console shell

- [ ] 3.1 Implement password hashing and login/logout route handlers with a hashed session token cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 12h); verify tests cover valid login, wrong password, and cookie flags
- [ ] 3.2 Implement session resolution with expiry and business scoping for staff routes; verify an expired session and a session from another business are rejected
- [ ] 3.3 Implement counter selection stored on the session and build the staff login and console shell pages; verify tests reject a counter belonging to another business and that the selection persists across requests
- [ ] 3.4 Document staff login and counter-selection behavior in the README; verify the described flow works in the running app

## 4. Ticket issuance

- [ ] 4.1 Implement atomic daily sequence allocation and ticket creation with a 128-bit public token stored as SHA-256; verify tests cover increments, three-digit padding, and numbers above 999
- [ ] 4.2 Implement the public queue page and issuance endpoint for a slug; verify an unknown slug returns not found with no queue data and the page collects no personal fields
- [ ] 4.3 Verify concurrent issuance with a test firing ten simultaneous requests and asserting ten distinct consecutive numbers
- [ ] 4.4 Verify the daily reset with an injectable clock across a business-local midnight and assert the next number is 001

## 5. Ticket page and polling

- [ ] 5.1 Implement the ticket view endpoint by token hash returning number, status, position, counter name, and timestamps; verify tests cover a valid token, an unknown token, and a prior-day unserved ticket reported as expired
- [ ] 5.2 Implement the ticket page with 3-second polling that stops at terminal states and pauses when the tab is hidden; verify a component test asserts polling stops after SERVED
- [ ] 5.3 Set `Cache-Control: no-store` and `Referrer-Policy: no-referrer` on ticket responses; verify the headers on a live request

## 6. Calling and serving

- [ ] 6.1 Implement call-next as the design's single-claim update with counter-busy rejection and unique-violation mapping; verify tests cover FIFO order, empty queue, counter busy, two counters claiming distinct tickets, and one ticket claimed once
- [ ] 6.2 Implement mark-served restricted to the counter holding the ticket; verify tests cover success, another counter rejected, double serve rejected, and the counter becoming free for the next call
- [ ] 6.3 Build the staff console with current ticket, waiting count, call-next, serve, and polling; verify a two-browser smoke test drives issue → call → serve and shows the visitor's page updating
- [ ] 6.4 Write the operator runbook for provisioning a business, staff, and counters; verify every command in it runs as written

## 7. End-to-end verification

- [ ] 7.1 Run an end-to-end test across two seeded businesses: issue, call, serve, and confirm tickets and counters never cross tenants
- [ ] 7.2 Assert database invariants after the end-to-end run: unique `(business, serviceDate, seq)`, at most one CALLED ticket per counter, and no ticket reachable by a guessed token
- [ ] 7.3 Run lint, `npm run build`, and the full test suite; verify all pass
