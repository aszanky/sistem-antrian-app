# Queue management

Multi-tenant walk-in queue. Visitors take a number from a business's public
page; staff sign in, pick a counter, call the next number, and mark it served.
One deployment serves many businesses, one shared daily queue per business.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4, PostgreSQL, Prisma.

## Local setup

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
npm install
createdb antrian_dev
cp .env.example .env        # set DATABASE_URL to your database
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open:

- Public queue: <http://localhost:3000/q/demo-teller>
- Staff sign in: <http://localhost:3000/staff/login>

Seeded demo accounts (both use password `password123`):

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

## Staff flow

1. Sign in at `/staff/login`. The account belongs to exactly one business.
2. Pick a counter from the dropdown. The selected counter is stored on the
   server-side session and used for every call in that session.
3. Press **Call next**. The oldest waiting ticket for the business's current
   day becomes CALLED and is attributed to that counter and staff member. A
   counter must mark its current ticket served before calling again.
4. Press **Mark served** after the visitor is done.

The console refreshes every 1 second. Visitors keep their ticket page open;
it polls every 1 second, shows their position, the counter that called them,
and stops refreshing once served or expired. Both pages are server-rendered
with their initial state, so content appears before the first poll.

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
