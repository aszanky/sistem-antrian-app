# tenancy Specification

## Purpose

Partitions every queue, counter, staff account, and ticket by business so a single deployment can serve many independent businesses without data leaking between them.

## Requirements

### Requirement: Business-scoped isolation

Every queue operation SHALL be evaluated within exactly one business. Staff and visitors SHALL NOT be able to read or modify another business's queue, counters, tickets, or staff data.

#### Scenario: Staff member requests another business's data

- **WHEN** an authenticated staff member of business A requests a queue, counter, or ticket belonging to business B
- **THEN** the system denies the request and returns no ticket or queue data

#### Scenario: Public queue route resolves one business

- **WHEN** a visitor opens the public queue route for a business slug
- **THEN** the page and its polling endpoint expose only that business's queue state

### Requirement: Business configuration

Each business SHALL have a unique public slug and a configured IANA timezone. The slug SHALL route visitors to that business's public queue, and the timezone SHALL define the business day used for numbering and ticket validity.

#### Scenario: Unknown business slug

- **WHEN** a visitor opens a public queue route whose slug does not exist
- **THEN** the system responds with not found and reveals no queue state

#### Scenario: Business day follows configured timezone

- **WHEN** the configured timezone reaches midnight while the server's own timezone does not
- **THEN** the business's numbering and ticket validity roll over at that local midnight

### Requirement: Staff accounts scoped to one business

A staff member SHALL authenticate with an email and password that belong to exactly one business. A valid session SHALL authorize staff actions only for that business, and email addresses SHALL be unique across the deployment so login is unambiguous.

#### Scenario: Invalid credentials

- **WHEN** a staff member submits an unknown email or an incorrect password
- **THEN** the system rejects the login without revealing which field was wrong

#### Scenario: Session authorizes only its business

- **WHEN** a logged-in staff member attempts a calling action scoped to a different business
- **THEN** the system rejects the action as unauthorized
