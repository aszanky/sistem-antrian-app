# queue/ticketing Specification

## Purpose

Lets customers take a numbered place in a business's shared queue and follow their ticket's status from a recoverable account.

## Requirements

### Requirement: Ticket issuance

A visitor SHALL obtain a ticket by requesting a number on the business's public queue page. Each successful request SHALL create exactly one anonymous ticket with status WAITING and the next number for the current business day. Numbers SHALL be zero-padded to three digits and SHALL grow beyond 999 without truncation.

#### Scenario: Visitor requests a number

- **WHEN** a visitor requests a ticket and the last number issued today is 007
- **THEN** the system issues a WAITING ticket numbered 008 and returns its ticket URL

#### Scenario: Issuance requires no personal data

- **WHEN** a visitor requests a ticket
- **THEN** no name, phone number, or email address is requested or stored

### Requirement: Unique sequential numbering

Numbers SHALL be unique and strictly increasing within a business day, including when requests arrive simultaneously. The first ticket of each business day SHALL be 001.

#### Scenario: Concurrent requests

- **WHEN** ten visitors request tickets at the same moment
- **THEN** ten distinct consecutive numbers are issued with no duplicates

#### Scenario: Daily reset

- **WHEN** the business day rolls over at the configured local midnight
- **THEN** the next issued ticket is numbered 001

### Requirement: Daily ticket validity

A ticket SHALL be callable only on the business day it was issued. After rollover, an unserved ticket SHALL display as expired and SHALL NOT be callable, while tickets that were already served SHALL remain readable.

#### Scenario: Unserved ticket after rollover

- **WHEN** a WAITING ticket from a previous business day is opened
- **THEN** its page shows it as expired and it is never returned by a call-next request

#### Scenario: Served ticket after rollover

- **WHEN** a ticket served during its business day is opened after rollover
- **THEN** its page still shows the served state and completion time

### Requirement: Ticket URL is the credential

Each ticket SHALL be accessible only through a ticket URL containing a randomly generated, unguessable token. Possession of the URL SHALL be sufficient to view that ticket, and no other authentication SHALL be required.

#### Scenario: Valid ticket URL

- **WHEN** a visitor opens the ticket URL returned at issuance
- **THEN** the system shows that ticket's number, status, and position

#### Scenario: Unknown ticket token

- **WHEN** a request presents a token that matches no ticket
- **THEN** the system responds with not found and reveals no queue state

### Requirement: Status and position display

The ticket page SHALL show the ticket number, its status, its position among waiting tickets, and, once called, the counter that called it. Position SHALL equal the number of WAITING tickets for the same business day issued before it.

#### Scenario: Position advances as earlier tickets are served

- **WHEN** a ticket is waiting behind two WAITING tickets and one of them is served
- **THEN** the ticket's displayed position becomes 1

#### Scenario: Ticket is called

- **WHEN** staff call the ticket from a counter
- **THEN** its page shows status CALLED and the name of that counter

### Requirement: Polling updates

The ticket page SHALL refresh its status at least every 5 seconds while the ticket is WAITING or CALLED. It SHALL stop refreshing once the ticket is SERVED or expired.

#### Scenario: Status change appears within one refresh interval

- **WHEN** the ticket's status changes on the server
- **THEN** the ticket page reflects the new status within 5 seconds without a manual reload

#### Scenario: Polling stops at terminal state

- **WHEN** the ticket becomes SERVED or expired
- **THEN** the page stops scheduling further status refreshes
