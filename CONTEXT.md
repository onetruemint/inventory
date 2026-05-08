# Home Inventory

A multi-tenant home inventory app. Tenancy is per-**Household**; every domain entity is scoped to exactly one.

## Language

**Household**:
The tenancy boundary. All inventory, reminders, and notifications belong to one Household.
_Avoid_: Account, group, family, tenant

**User**:
An authenticated identity. Belongs to zero or one **Household**.
_Avoid_: Member (reserved for the membership row), account

**HouseholdMember**:
The membership row recording a User's role in a Household. Exactly one row per User (the "one Household per User" invariant).
_Avoid_: Membership, role-assignment

**Owner**:
A **HouseholdMember** role. Created the Household or had ownership transferred to them.
_Avoid_: Admin

**Member**:
A **HouseholdMember** role for non-owner participants.
_Avoid_: Guest, user (overloaded)

## Relationships

- A **User** belongs to **zero or one** **Household** (via **HouseholdMember**)
- A **Household** has **one or more** **Users**
- A freshly-registered **User** has no **Household** until they create one or accept an invite
- A **User** cannot accept an invite while they already belong to a **Household**

## Example dialogue

> **Dev:** "If Alice signs up and then Bob invites her to his **Household**, what happens?"
> **Domain expert:** "Alice can't accept — she's already in her own **Household**. She'd have to leave first, and we haven't built that flow."
> **Dev:** "And if Alice signs up but never creates a **Household**?"
> **Domain expert:** "Then she has no inventory, no reminders, nothing household-scoped. The app prompts her to create one or paste an invite token."

## Flagged ambiguities

- "account" was used informally for both **User** and **Household** — resolved: these are distinct. A User has credentials; a Household holds inventory.
