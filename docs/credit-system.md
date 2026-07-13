# Credit System

This application distributes Cursor Kenya credits as Cursor referral codes. A
"credit" is not a numeric balance or wallet entry; it is one row in the
`referral_codes` table with a referral `code` and redeemable `url`.

## Core concepts

| Concept | Implementation | Notes |
| --- | --- | --- |
| Credit | `referral_codes` row | Stores the code, URL, event slug, and optional claim data. |
| Event | `events` row | A campaign or meetup that owns a set of eligible emails and referral codes. |
| Allowed email | `allowed_emails` row | The email whitelist for one event. Attendees must redeem with this email. |
| Claim | `claimed_by_email` and `claimed_at` on `referral_codes` | Marks a referral code as assigned to one eligible email. |
| Pool | `referral_codes.event_slug = '_pool'` | Reserved inventory bucket for unassigned codes. `_pool` is not created as a normal event. |

## Database model

The main schema is defined in `lib/db/schema.ts`.

### `events`

Stores public disbursement events.

- `slug`: primary key and URL segment, for example `/cursor-kenya-meetup`.
- `name`: display name.
- `created_at`: creation timestamp.

### `allowed_emails`

Stores the RSVP or eligibility list per event.

- `email`: normalized lowercase email.
- `name`: optional attendee name used in redemption emails.
- `event_slug`: event this email belongs to.
- Primary key: `(email, event_slug)`.

The same email may be eligible for multiple events, but only once per event.

### `referral_codes`

Stores code inventory and claim state.

- `id`: primary key.
- `code`: Cursor referral code value.
- `url`: referral URL.
- `claimed_by_email`: email that claimed the code, or `null` when available.
- `claimed_at`: timestamp of the claim, or `null` when available.
- `event_slug`: event that owns the code, or `_pool` for unassigned inventory.

Important constraints:

- `code` is unique per `event_slug`.
- `unique_claim_per_event` allows only one claimed code for a given
  `(claimed_by_email, event_slug)` pair.

## Admin workflow

Admin actions live in `app/admin/actions.ts` and require a valid admin session.

1. Create an event.
   - `createEvent` slugifies the event name.
   - The reserved `_pool` slug cannot be used as a normal event.
2. Add eligible attendees.
   - `upsertAllowedEmail` adds or updates one email.
   - `uploadEmailsCsv` bulk imports emails and optional names.
   - The upload can merge with existing emails or replace the event list.
3. Add referral codes.
   - Codes can be uploaded directly to an event with `uploadCodesCsv` or
     `pasteCodesRaw`.
   - Codes can be uploaded to the shared pool with `uploadCodesToPool` or
     `pasteCodesToPool`.
   - Inputs may be full referral URLs or bare code values. The app builds URLs
     in the form `https://cursor.com/referral?code=<code>`.
4. Move codes from the pool to events.
   - `assignBatchToEvent` moves selected pool codes to a real event.
   - The action requires assigning between 5 and 50 selected codes.
   - Codes already present in the target event are skipped.
5. Return unused codes to the pool.
   - `syncUnclaimedToPool` moves unclaimed event codes back to `_pool`.
   - If the pool already has the same code, the event copy is deleted.

Deleting an event removes that event's allowed emails and referral codes before
deleting the event row.

## Redemption flow

Public redemption uses the server action in `app/actions/redeem.ts`.

1. The attendee visits `/<event-slug>`.
2. `app/[slug]/page.tsx` loads the event and renders `RedeemForm`.
3. The attendee submits an email address.
4. `redeemCode` normalizes the email and validates that:
   - the email looks valid,
   - the event slug is present,
   - the email exists in `allowed_emails` for that event.
5. If the email already claimed a code for that event, redemption stops and the
   previous URL is returned.
6. The action selects one unclaimed `referral_codes` row for the event.
7. It conditionally updates that row only if it is still unclaimed:
   - sets `claimed_by_email` to the normalized email,
   - sets `claimed_at` to the current time.
8. The claim loop retries up to three times to handle concurrent submissions.
9. The app sends the attendee a redemption email.
10. The page shows the assigned URL and code.

If no unclaimed code is available, the attendee receives a "No codes available"
message. If the email is not on the event whitelist, the attendee receives a
"not eligible" message.

## Email behavior

Successful claims call `sendRedemptionEmail` in `lib/email.ts`, which renders
the React email template in `emails/redemption.tsx`.

Email delivery is best effort:

- If sending succeeds, the attendee receives the referral link by email.
- If sending fails, the error is logged and the code remains claimed.
- The page still shows the assigned code and URL after a successful database
  claim.

## Analytics and exports

Admin analytics are served by `app/api/admin/analytics/route.ts`.

For a given event slug, the endpoint returns:

- total referral codes,
- redeemed count,
- available count,
- allowed email count,
- per-code claim status,
- allowed email list.

The admin UI uses this data to display event status and export available codes.

## Operational notes

- The actual Cursor credit activation happens on `cursor.com` through the
  referral URL. This app only assigns and tracks the referral code.
- The pool is a reserved `event_slug` value on referral-code rows. It does not
  need a matching `events` row.
- Database writes use the Neon HTTP driver through Drizzle. Some multi-step
  admin operations run sequentially because the current driver setup does not
  use transactions.
- Checked-in SQL migrations are older than the current Drizzle schema. They do
  not currently include all tables and columns used by the application, such as
  `events`, `admin_users`, `event_slug`, and the per-event uniqueness rules.
  Use the current schema as the source of truth and generate/apply migrations
  before provisioning a fresh database from SQL files alone.

## Important files

| Area | Path |
| --- | --- |
| Database schema | `lib/db/schema.ts` |
| Pool constant | `lib/pool.ts` |
| Redemption server action | `app/actions/redeem.ts` |
| Attendee redemption form | `app/[slug]/redeem-form.tsx` |
| Event page | `app/[slug]/page.tsx` |
| Admin actions | `app/admin/actions.ts` |
| Admin analytics API | `app/api/admin/analytics/route.ts` |
| Email sender | `lib/email.ts` |
| Redemption email template | `emails/redemption.tsx` |
