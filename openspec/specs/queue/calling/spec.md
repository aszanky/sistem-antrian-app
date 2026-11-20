# queue/calling Specification

## Purpose

Lets authenticated staff operate a counter and move a business's shared queue forward in arrival order.

## Requirements

### Requirement: Counter selection

Authenticated staff SHALL select one of their business's counters when starting a console session. Every call made in that session SHALL be attributed to the selected counter and the staff member. A calling request without a selected counter SHALL be rejected.

#### Scenario: Staff selects a counter

- **WHEN** a staff member selects counter 2 and calls the next ticket
- **THEN** the called ticket is attributed to counter 2 and to that staff member

#### Scenario: Calling before selecting a counter

- **WHEN** a staff member requests the next ticket without having selected a counter
- **THEN** the request is rejected and no ticket changes state

### Requirement: Call next in arrival order

Calling next SHALL claim the oldest WAITING ticket issued on the current business day, change it to CALLED, and return its number and counter. If no WAITING ticket exists, the request SHALL fail without changing any ticket.

#### Scenario: Oldest waiting ticket is called

- **WHEN** tickets 001, 002, and 003 are WAITING and a counter calls next
- **THEN** ticket 001 becomes CALLED and is returned to the counter

#### Scenario: Empty queue

- **WHEN** a counter calls next and no ticket is WAITING
- **THEN** the request reports that the queue is empty and no ticket changes state

### Requirement: Concurrent calls claim distinct tickets

Simultaneous call-next requests from different counters SHALL never return the same ticket, and each request SHALL claim at most one ticket.

#### Scenario: Two counters call at the same time

- **WHEN** two counters call next simultaneously with three tickets WAITING
- **THEN** each counter receives a different CALLED ticket and one ticket remains WAITING

#### Scenario: One ticket, two counters

- **WHEN** two counters call next simultaneously with exactly one ticket WAITING
- **THEN** exactly one counter receives the ticket and the other reports an empty queue

### Requirement: One active ticket per counter

A counter SHALL have at most one CALLED ticket at a time. Calling next while that ticket remains unserved SHALL be rejected and SHALL leave the queue unchanged.

#### Scenario: Second call is rejected

- **WHEN** a counter that already called ticket 001 calls next before serving it
- **THEN** the request is rejected, ticket 001 stays CALLED, and ticket 002 stays WAITING

#### Scenario: Counter is free after serving

- **WHEN** the counter marks ticket 001 as SERVED and then calls next
- **THEN** ticket 002 becomes CALLED at that counter

### Requirement: Mark served

Only the counter that called a ticket SHALL be able to mark it SERVED. Serving SHALL record the completion time and free the counter. A ticket that is not currently CALLED at that counter SHALL NOT be markable as served.

#### Scenario: Serving the counter's ticket

- **WHEN** the counter that called ticket 001 marks it served
- **THEN** ticket 001 becomes SERVED with a completion time and the counter has no active ticket

#### Scenario: Another counter attempts to serve

- **WHEN** a different counter attempts to mark ticket 001 served
- **THEN** the request is rejected and ticket 001 stays CALLED

#### Scenario: Serving a ticket twice

- **WHEN** a SERVED ticket is marked served again
- **THEN** the request is rejected and the original completion time is unchanged
