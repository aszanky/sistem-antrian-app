# Spec Delta

## Purpose

Lets visitors keep their queue tickets under a recoverable account so a closed tab, a new device, or a forgotten password no longer loses their place in line.

## ADDED Requirements

### Requirement: Customer signup

An unauthenticated visitor SHALL create a customer account with an email address and password. The email SHALL be normalized and unique across all businesses, and passwords SHALL be at least 8 characters. The account SHALL be usable immediately after signup.

#### Scenario: Visitor signs up

- **WHEN** a visitor submits a new email and a password of at least 8 characters
- **THEN** the system creates the account, starts a customer session, and sends a verification email

#### Scenario: Email already registered

- **WHEN** a visitor signs up with an email that already has an account
- **THEN** the system rejects the signup and tells the visitor to sign in instead

#### Scenario: Weak password

- **WHEN** a visitor submits a password shorter than 8 characters
- **THEN** the system rejects the signup and creates no account

### Requirement: Sign in and session

Customers SHALL sign in with email and password. A successful sign-in SHALL start a customer session that lasts 30 days and persists across browser restarts. Customer sessions SHALL be distinct from staff sessions.

#### Scenario: Valid credentials

- **WHEN** a customer signs in with the correct email and password
- **THEN** the system starts a 30-day customer session and shows their tickets

#### Scenario: Invalid credentials

- **WHEN** a customer submits an unknown email or a wrong password
- **THEN** the system rejects the sign-in without revealing which field was wrong

#### Scenario: Customer session cannot act as staff

- **WHEN** a request carries only a customer session and attempts a staff calling action
- **THEN** the system rejects it as unauthorized

#### Scenario: Sign out

- **WHEN** a customer signs out
- **THEN** the current customer session can no longer access their tickets

### Requirement: Email verification

Signup SHALL send a single-use verification link. Unverified customers SHALL still sign in and take tickets. The account page SHALL show whether the email is verified. A verification link SHALL expire after 24 hours.

#### Scenario: Verifying an email

- **WHEN** a customer opens a valid verification link within 24 hours
- **THEN** the account is marked verified and the dashboard stops showing the unverified notice

#### Scenario: Expired verification link

- **WHEN** a customer opens a verification link older than 24 hours
- **THEN** the system reports it as invalid and the account stays unverified

#### Scenario: Unverified customer takes a ticket

- **WHEN** an unverified customer requests a queue number
- **THEN** the ticket is issued and the dashboard continues to show the unverified notice

### Requirement: Password reset

A customer SHALL request a password reset by email. The request SHALL respond the same way whether or not an account exists. A valid reset link SHALL expire after 1 hour, be single-use, and set a new password.

#### Scenario: Reset request for a known or unknown email

- **WHEN** a visitor requests a password reset
- **THEN** the system accepts the request without revealing whether the email is registered

#### Scenario: Completing a reset

- **WHEN** a customer opens a valid reset link and submits a new password of at least 8 characters
- **THEN** the password changes and all existing customer sessions are invalidated

#### Scenario: Reusing a reset link

- **WHEN** a reset link is opened a second time
- **THEN** the system rejects it and does not change the password

### Requirement: Own ticket list

An authenticated customer SHALL see their active tickets and tickets from the last 30 days across all businesses. They SHALL NOT see another customer's tickets.

#### Scenario: Active and recent tickets

- **WHEN** a customer opens their account page
- **THEN** the page lists every WAITING or CALLED ticket plus tickets served or expired in the last 30 days

#### Scenario: Another customer's ticket

- **WHEN** a customer requests a ticket belonging to a different account
- **THEN** the system responds with not found and reveals no ticket data

### Requirement: Queue directory

An authenticated customer SHALL see every available business in a queue directory. For each business the directory SHALL show the customer's active WAITING or CALLED ticket for the current business day, when one exists, and SHALL otherwise offer a way to take a number there. The directory SHALL NOT reflect another customer's tickets.

#### Scenario: Customer already has an active ticket

- **WHEN** the directory includes a business where the customer holds a WAITING or CALLED ticket for the current business day
- **THEN** that business shows the ticket number and links to the ticket instead of offering a new number

#### Scenario: Customer has no active ticket

- **WHEN** the directory includes a business with no active ticket for the customer
- **THEN** the business offers a link to that business's queue page

#### Scenario: Another customer's ticket

- **WHEN** a different customer holds an active ticket at a business
- **THEN** the directory does not show it to this customer and still offers a number

#### Scenario: No customer session

- **WHEN** a visitor opens the directory without a customer session
- **THEN** the system sends them to sign in and returns them to the directory afterwards
