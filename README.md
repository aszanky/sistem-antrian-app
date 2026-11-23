# Queue management

Multi-tenant walk-in queue. Visitors create an account, take a number from a
business's public page, and follow the ticket from any device. Staff sign in,
pick a counter, call the next number, and mark it served. One deployment
serves many businesses, one shared daily queue per business.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4, PostgreSQL, Prisma.

## Local setup

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
npm install
createdb antrian_dev
cp .env.example .env        # set DATABASE_URL, DIRECT_URL, and APP_URL
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open:

- Customer sign up: <http://localhost:3000/account/signup>
- Customer sign in: <http://localhost:3000/account/login>
- Browse queues: <http://localhost:3000/q>
- My tickets: <http://localhost:3000/account>
- Public queue (requires sign-in): <http://localhost:3000/q/demo-teller>
- Staff sign in: <http://localhost:3000/staff/login>

Seeded **staff** accounts (both use password `password123`). Customers create
their own accounts from `/account/signup`:

| Business | Queue page | Email |
| --- | --- | --- |
| Demo Teller | `/q/demo-teller` | `teller@example.test` |
| Demo Clinic | `/q/demo-clinic` | `clinic@example.test` |

`npm run db:seed` is idempotent; it updates the demo businesses and staff
credentials without creating duplicates.

## Supabase / managed Postgres

Use the session pooler URL and keep `directUrl` for migrations:

```env
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres?connection_limit=5&connect_timeout=10"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres"
```

Do not add `pgbouncer=true` to the session-pooler URL. Prisma's pgbouncer mode costs several extra protocol round trips per query; on a remote database that turns a 245 ms query into 1.3 s. If you must use the transaction pooler (port 6543), benchmark it before enabling that flag.

## Customer accounts

Visitors must be signed in before taking a number. The queue page redirects to
`/account/login` and returns to the queue afterwards.

- Sign up with email and password; passwords have at least 8 characters.
- Sessions last 30 days and are stored in a separate `customer_session` cookie,
  never accepted by staff routes.
- Email verification is non-blocking. Signup sends a link; the dashboard shows
  an unverified notice with a resend action until it is opened.
- Password reset always answers the same way, sends a 1-hour single-use link,
  and signs out existing sessions.
- One active ticket is allowed per customer, per business, per business day.
  Asking again returns the existing ticket without consuming a number.
- `/q` lists every business. A business where the customer already has an
  active ticket today links to that ticket; otherwise it links to the queue.
- `/account` lists active tickets plus anything served or expired in the last
  30 days. `/account/tickets/<id>` shows live status.

Email delivery uses Nodemailer over `SMTP_URL` with `MAIL_FROM`. `APP_URL` is
used to build verification and reset links. With no `SMTP_URL`, the app logs
`[mail:dev] ...` with the link instead of sending mail, which is enough for
local development. Verification links expire in 24 hours.

**Breaking:** anonymous ticket links no longer grant access. The ticket token
still routes a deep link, but only the owning customer session can view it.
Legacy tickets have no owner and are unreachable.

## Staff flow

1. Sign in at `/staff/login`. The account belongs to exactly one business.
2. Pick a counter from the dropdown. The selected counter is stored on the
   server-side session and used for every call in that session.
3. Press **Call next**. The oldest waiting ticket for the business's current
   day becomes CALLED and is attributed to that counter and staff member. A
   counter must mark its current ticket served before calling again.
4. Press **Mark served** after the visitor is done.

The console refreshes every 1 second. Customers open their ticket from
`/account` or the original link; the ticket page polls every 1 second, shows
their position and the counter that called them, and stops refreshing once
served or expired. Both pages are server-rendered with their initial state, so
content appears before the first poll.

## Provision a business

Operator runbook. Every flag is required; repeat `--counter` for each counter:

```bash
npm run db:provision -- \
  --slug cafe-melati \
  --name "Cafe Melati" \
  --timezone Asia/Jakarta \
  --counter "Front desk" \
  --counter "Pickup" \
  --staff-email owner@cafe.test \
  --staff-password 'change-me'
```

The command fails if the slug or staff email already exists. It prints the
queue page path and the staff login. Add further staff accounts by running the
same provisioning flow for a new business or with a dedicated admin task; there
is no self-serve signup in this version.

## Tests

Use a separate database:

```bash
createdb antrian_test
DATABASE_URL=postgresql://localhost:5432/antrian_test npx prisma migrate deploy
DATABASE_URL=postgresql://localhost:5432/antrian_test npm test
```

The suite covers timezone/day rollover, ticket issuance and concurrency,
tenant isolation, authentication, calling/serving concurrency, expiry, and the
polling stop condition.

```bash
npm run lint
npm run build
```

## Migrations and rollback

Apply the migration before deploying the app:

```bash
npx prisma migrate deploy
npm run db:seed
```

Rollback (no ticket rows are deleted):

```sql
DROP INDEX IF EXISTS "Ticket_one_active_per_customer_day";
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_customerId_fkey";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "customerId";
DROP TABLE IF EXISTS "EmailToken";
DROP TABLE IF EXISTS "CustomerSession";
DROP TABLE IF EXISTS "CustomerUser";
DROP TYPE IF EXISTS "EmailTokenPurpose";
```

## Behavior notes

- Tickets are anonymous. The ticket URL contains a random 128-bit token and is
  the only credential; responses are `no-store` with `no-referrer`.
- Numbers are `001`, `002`, … and reset at local midnight in the business's
  configured IANA timezone.
- A ticket can only be called on its issue day. Unserved prior-day tickets show
  as expired; served tickets remain readable.
- Out of scope: kiosks, printing, recall, no-show/skip, transfers, priorities,
  notifications, display screens, multiple queues per business, signup and
  billing.
