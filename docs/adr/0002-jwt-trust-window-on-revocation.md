# JWT trust window on revocation

The `requireAuth` middleware trusts a valid access token until it expires. There is no per-request database check that the User still exists, that their Household membership is unchanged, or that an admin hasn't revoked their session. Access tokens are 15 minutes; revocations therefore take effect within 15 minutes, never sooner.

This is the conventional JWT trade-off: stateless verification (no DB hit per request) costs you immediate revocation. We considered re-checking membership on every request — it would close the window — but it adds a query to every authenticated route forever, which is the wrong default for a small API where revocation is rare.

## Consequences

- Removing a User or changing their Household role does not kick their existing access token. The next refresh (≤ 15 min later) sees the change.
- Refresh tokens are revocable instantly via Redis, including the bulk-revoke path through the per-User generation counter. So the worst-case staleness for "user is fully out" is one access-token TTL.
- If a future requirement needs faster revocation (compromised account runbook, abusive user kick-out), the right place to add it is a Redis "revoked users" set checked in `requireAuth`, not a Postgres lookup. Don't bake DB checks into the auth path.
