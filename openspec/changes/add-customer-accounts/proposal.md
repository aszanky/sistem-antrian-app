# Proposal

## Why

Visitors currently receive a bearer ticket URL, so closing the tab, changing phones, or clearing the browser loses the ticket with no recovery path. Giving visitors an account makes queue participation durable and gives them a single place to see active and recent tickets.

## What Changes

- **BREAKING** Introduce mandatory customer accounts for ticket issuance. Anonymous issuance is removed; a business's public queue page requires sign-in.
- Add customer signup and sign-in with email and password, a 30-day browser session, non-blocking email verification, and password reset by email.
- **BREAKING** Require the owning customer session to view a ticket. The ticket token remains in the URL for deep links, but possession alone no longer grants access.
- Store a required `customerId` on new tickets; list a customer's active tickets and the last 30 days of served or expired tickets at `/account`.
- Add a signed-in queue directory at `/q` that lists businesses and links to each queue or to the customer's existing active ticket there.
- Allow at most one active ticket per customer per business per business day. A repeat request returns the existing ticket instead of issuing another number.
- Send verification and password-reset emails through a configurable SMTP transport; development logs the link instead.
- Keep staff authentication and actions unchanged, using a separate session cookie and table so customer sessions can never authorize staff operations.

## Capabilities

### New Capabilities

- `customer/accounts`: signup, sign-in, sessions, email verification, password reset, and own-ticket listing.

### Modified Capabilities

- `queue/ticketing`: issuance requires an owning account, one active ticket per business day, and ticket access checks the signed-in customer.

## Out of Scope

Phone/SMS or OAuth sign-in, passkeys, push/email notifications when called, account deletion or data export, staff visibility into customer email, claiming pre-existing anonymous tickets, self-serve business signup and billing, preventing one person from creating multiple accounts beyond basic rate limits, and localization.

## Impact

Adds `CustomerUser`, `CustomerSession`, and `EmailToken` tables plus a nullable `Ticket.customerId` for existing rows and a partial unique index for active tickets. New auth routes and pages (`/account/login`, `/account/signup`, `/account`, `/account/verify`, `/account/reset`), gated queue issuance, and ownership checks on the ticket page and API. Adds an SMTP dependency with a development log fallback. Existing anonymous ticket links stop working; legacy tickets remain unowned.
