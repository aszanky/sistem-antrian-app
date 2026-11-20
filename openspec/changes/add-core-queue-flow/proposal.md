# Proposal

## Why

Walk-in queues today run on paper slips and shouted names, which loses tickets, hides queue position, and cannot serve more than one counter reliably. A browser-based queue lets each business issue, track, and call numbers without dedicated hardware or installed software.

## What Changes

- Introduce multi-tenant queue management: each business owns one shared daily queue, its staff accounts, and its counters.
- Public ticket issuance: a visitor opens `/q/<business-slug>` and receives the next number. The ticket page is the credential (random token in the URL) and shows the number, current position, and status, refreshed by polling.
- Staff console: email + password login scoped to one business; staff select the counter they are operating, call the next waiting ticket, and mark it served.
- Ticket lifecycle: `WAITING → CALLED → SERVED`. A counter must mark its current ticket served before calling another.
- Numbering: plain sequential `001`, reset daily at the business's local midnight; uniqueness is `(business, date)`.
- Atomic call-next: with multiple counters calling concurrently, each call claims exactly one distinct waiting ticket.

## Capabilities

### New Capabilities

- `queue/ticketing`: anonymous ticket issuance, daily reset numbering, ticket status and position polling.
- `queue/calling`: staff authentication, counter selection, call-next, and mark-served.
- `tenancy`: business scoping of queues, staff accounts, and daily numbering.

### Modified Capabilities

- None.

## Out of Scope

Kiosk or tablet issuance, printed tickets, recall, no-show/skip, hold/resume, transfers between counters, priority/VIP/appointment queues, estimated wait times, push/SMS/WhatsApp notifications, in-location display screens, multiple locations or multiple queues per business, self-serve signup and billing, analytics, offline operation, and abuse prevention beyond basic per-session throttling.

## Impact

Greenfield Next.js/React/TypeScript app using the App Router. New data model for `Business`, `StaffUser`, `Counter`, and `Ticket`; public and authenticated route handlers; three UI surfaces (public ticket page, staff login, staff console). No existing code or specs are modified.
