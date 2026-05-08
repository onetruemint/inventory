# HIBP fail-closed on register

Registration calls HaveIBeenPwned's Pwned Passwords k-anonymity API to reject known-breached passwords. When the HIBP request fails (timeout, 5xx, network error), registration **fails closed**: the User receives 503 `auth.password_check_unavailable` and must retry, rather than being allowed through with an unverified password.

The conventional choice is fail-open — accept the password, log the failure, prefer availability over a transient security check. We picked fail-closed because the cost of a slipped breached password (an account quietly takable over via credential stuffing the day it lands) outweighs the cost of an HIBP outage blocking new signups for a few minutes. HIBP itself has high uptime; a 3-second per-request timeout caps the worst-case latency we'd inflict on legitimate users.

## Consequences

- HIBP outages block new registration. Existing users are unaffected (the check runs on register only, not login).
- Successful HIBP responses are cached in Redis for one hour, so retries within a session are instant and a brief HIBP blip rarely surfaces to a user typing a common password.
- The check is intentionally not run on login. Doing so would force legacy users with weak passwords through a password-change flow mid-login, which doesn't exist in MVP.
- The wrapper exposes a single interface (`passwordPolicy.check`) so swapping HIBP for a local bloom filter (a future "remove the HIBP dependency" project) doesn't ripple through route handlers.
