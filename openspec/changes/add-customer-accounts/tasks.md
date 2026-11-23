# Tasks

## 1. Data model and fixtures

- [x] 1.1 Add `CustomerUser`, `CustomerSession`, and `EmailToken` models plus nullable `Ticket.customerId`, its index, and the partial unique index for one active ticket per customer/business/day; verify `prisma migrate deploy` applies and `psql` shows all three indexes and the foreign keys
- [x] 1.2 Add customer, session, and email-token fixtures for tests; verify a fixture session resolves to its customer and an expired fixture does not

## 2. Customer signup and sessions

- [x] 2.1 Implement signup with trimmed/lowercased email, Argon2id hashing, and the 8-character rule; verify tests cover success, duplicate email, weak password, and normalization
- [x] 2.2 Implement login, logout, and customer session resolution with a 30-day expiry and extension below 23 days; verify tests cover valid and invalid credentials, expiry, extension, and sign-out
- [x] 2.3 Issue the customer cookie as `HttpOnly; Secure; SameSite=Lax` under its own name; verify a customer session is rejected by a staff calling endpoint
- [x] 2.4 Add per-IP fixed-window limits to signup, login, and reset requests; verify a test receives 429 after the threshold and that login failures stay generic

## 3. Email verification and reset

- [x] 3.1 Implement the mail sender with `SMTP_URL`/`MAIL_FROM` and a development log fallback, plus hashed tokens with purpose and expiry; verify tests assert hashes are stored, links log in development, and tokens expire
- [x] 3.2 Send a verification email at signup and implement verify plus resend; verify tests cover a valid link, expired link, reused link, and that unverified accounts can still take tickets
- [x] 3.3 Implement reset request and reset completion; verify tests cover identical responses for known and unknown emails, a 1-hour expiry, single use, and invalidation of existing sessions
- [x] 3.4 Document the SMTP variables and the development log fallback in the README; verify the documented local flow produces a working verification link

## 4. Account-owned tickets

- [x] 4.1 Make issuance require a customer session and store `customerId`, resolving session, business day, sequence, and insert in one statement; verify tests cover unauthenticated rejection, ownership, and numbering
- [x] 4.2 Implement the one-active-ticket rule with partial-index race handling; verify tests cover a repeated request returning the existing ticket without advancing the sequence, a different business, the next business day, and concurrent duplicates producing one ticket
- [x] 4.3 Gate `/t/[token]` on the owning session with a sign-in redirect and a `next` return path; verify tests cover owner access, no session, another customer returning 404, and an unknown token
- [x] 4.4 Implement the authenticated ticket detail API keyed by ticket id and session; verify tests cover status, position, and counter for the owner, plus unauthorized and other-customer responses
- [x] 4.5 Implement the account ticket list for active tickets and the last 30 days across businesses; verify tests cover active inclusion, 31-day exclusion, and cross-account isolation
- [x] 4.6 Verify a legacy ticket with `customerId = NULL` cannot be opened by any customer session and that no token-only route bypasses ownership

## 5. Account UI

- [x] 5.1 Build signup, login, forgot-password, and reset pages with inline validation and error states; verify a browser smoke signs up, signs out, and signs back in
- [x] 5.2 Gate the queue page and build the account dashboard and account ticket detail page; verify a two-tab browser smoke covers signup, issue, staff call, and staff serve with the status updating in the account ticket page
- [x] 5.3 Add the unverified-email notice and resend action; verify the notice appears after signup and clears after the logged verification link is opened
- [x] 5.4 Verify the account, auth, and ticket pages at 390 px and 1280 px with no horizontal overflow and visible focus states
- [x] 5.5 Build the signed-in `/q` queue directory and replace the demo-only landing CTA; verify tests cover business listing, active-ticket mapping, cross-customer isolation, and the no-session case

## 6. Documentation and end-to-end

- [x] 6.1 Update the README for mandatory accounts, the new routes, SMTP configuration, and the breaking change to anonymous ticket links; verify every documented command runs as written
- [x] 6.2 Add an end-to-end test with two customer accounts and two businesses covering ownership isolation, duplicate issuance, account listing, and staff call/serve; verify the test passes
- [x] 6.3 Document the rollout order (migration then app) and the rollback steps; verify the migration applies cleanly to a fresh database and the rollback statement list matches the added objects

## 7. Verification

- [x] 7.1 Run `npm run lint`, `npm run build`, and the full test suite; verify all pass
- [x] 7.2 Run the app against the configured database and verify signup, sign-in, issuance, duplicate handling, ticket polling, and reset links work end to end
- [x] 7.3 Run `openspec validate add-customer-accounts --strict`; verify the change reports valid

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived main specs include the removed anonymous-ticket requirements.
