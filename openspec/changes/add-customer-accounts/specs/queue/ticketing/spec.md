# Spec Delta

## ADDED Requirements

### Requirement: Account ticket issuance

An authenticated customer SHALL obtain a ticket by requesting a number on the business's queue page. Each successful request SHALL create one ticket owned by that customer with status WAITING and the next number for the current business day. Numbers SHALL be zero-padded to three digits and SHALL grow beyond 999 without truncation.

#### Scenario: Customer requests a number

- **WHEN** a signed-in customer requests a ticket and the last number issued today is 007
- **THEN** the system issues a WAITING ticket numbered 008 owned by that customer and returns its ticket URL

#### Scenario: Ticket is owned by the requesting customer

- **WHEN** a signed-in customer requests a ticket
- **THEN** the ticket is linked to that customer and appears in their account ticket list

#### Scenario: Unauthenticated visitor requests a number

- **WHEN** a visitor without a customer session requests a ticket
- **THEN** the system sends them to sign in and creates no ticket

### Requirement: One active ticket per business day

The system SHALL allow at most one WAITING or CALLED ticket per customer per business for a given business day. A repeated request for the same business day SHALL return that ticket and SHALL NOT allocate a new number.

#### Scenario: Repeated request at the same business

- **WHEN** a customer with a WAITING ticket at a business requests another number there
- **THEN** the system returns the existing ticket and the daily sequence does not advance

#### Scenario: Same customer at a different business

- **WHEN** a customer with an active ticket at one business requests a number at a different business
- **THEN** the system issues a separate ticket for that business

#### Scenario: Next business day

- **WHEN** a customer with a previously active ticket requests a number after the business day rolls over
- **THEN** the system issues a new ticket for the new business day

### Requirement: Account-scoped ticket access

Each ticket SHALL be viewable only by the customer account that owns it. The ticket token SHALL identify the ticket for deep links, but possession alone SHALL NOT grant access. An unauthenticated request SHALL be sent to sign in, and a request from a different customer SHALL return not found.

#### Scenario: Owner views the ticket

- **WHEN** the signed-in owner opens their ticket URL
- **THEN** the system shows the ticket's number, status, and position

#### Scenario: No session

- **WHEN** a ticket URL is opened without a customer session
- **THEN** the system sends the visitor to sign in and returns them to the ticket afterwards

#### Scenario: Another customer opens the ticket URL

- **WHEN** a signed-in customer opens a ticket URL owned by a different customer
- **THEN** the system responds with not found and reveals no ticket data

#### Scenario: Unknown ticket token

- **WHEN** a request presents a token that matches no ticket
- **THEN** the system responds with not found and reveals no queue state

## REMOVED Requirements

### Requirement: Ticket issuance

**Reason**: Accounts are now mandatory for issuance, so anonymous ticket creation no longer exists.

**Migration**: Visitors create or sign in to a customer account from the queue page, then request a number; the new account issuance requirement defines the behavior.

### Requirement: Ticket URL is the credential

**Reason**: A bearer URL no longer grants ticket access; only the owning customer session does.

**Migration**: Ticket links still open the ticket, but visitors must sign in with the owning account.
