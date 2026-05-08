# One Household per User

A **User** belongs to exactly zero or one **Household**. A Household has many Users. Enforced at the schema level via `HouseholdMember.@@unique([userId])`.

We considered allowing multi-Household membership (with the user picking an active Household at login or via a header), but it added round-trips, JWT complexity, and a "switch Household" surface area that no MVP user story actually needs. The schema still uses the `HouseholdMember` table (rather than collapsing membership onto `User`) so role and join-date have a natural home and a future "transfer ownership" or "switch Household" feature has somewhere to land without a structural migration.

## Consequences

- The JWT carries a single `householdId: string | null` — never a list, never an "active" pointer.
- Registration cannot auto-create a Household, because that would conflict with users who later receive an invite and need to join a different Household. Users register Householdless and explicitly create a Household via `POST /v1/households` (or accept an invite, in a later branch).
- An existing User accepting an invite while already in a Household is rejected (`household.already_member`). "Switching Households" is a deliberate future feature, not a side effect of clicking an invite link.
