# Security and data-protection operations

## Production configuration

- Keep `AUTH_REQUIRED=1`, `COOKIE_SECURE=1`, and `APP_ENV=production`.
- Store `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `APP_USERS` only in the hosting provider's secret manager.
- Generate account hashes with `python backend/hash_password.py`. Use a unique, 12+ character password for every account and store only the resulting `password_hash` in `APP_USERS`.
- Production rejects legacy plaintext `password` entries by default. For short-term operational migration only, set `ALLOW_LEGACY_PLAINTEXT_PASSWORDS=1`. Existing six-character accounts additionally require `LEGACY_PLAINTEXT_MIN_LENGTH=6`; the default remains 12. Remove both overrides after every account has a `password_hash`.
- Grant the `admin` role only to staff who are authorized to view all users' generated images and prompts.
- Set `CORS_ORIGINS` only when a separate trusted frontend is required. Use exact HTTPS origins; wildcards are rejected.
- Provider calls time out after 180 seconds by default (`PROVIDER_TIMEOUT_SECONDS`) so a stalled vendor cannot occupy generation capacity forever.

Example account configuration:

```json
[
  {"username":"designer","password_hash":"pbkdf2_sha256$600000$...","role":"user"},
  {"username":"security-admin","password_hash":"pbkdf2_sha256$600000$...","role":"admin"}
]
```

### Temporary legacy-password migration

The compatibility override keeps authentication enabled and converts plaintext values to PBKDF2 hashes immediately when the process starts, but the original values still remain in Render's secret configuration. Treat it as a time-limited exception: restrict access to the Render environment, migrate each account to a unique 12+ character password hash, remove the `password` fields, delete both override variables, and redeploy.

## Data handling

Uploaded images and prompts are sent to the selected AI provider to fulfill each request. Do not upload client or agency material unless its disclosure to that provider is authorized under the applicable contract and privacy policy.

Personal browser history is held only in the current React session. Admin history is held only in server memory and is bounded by both entry count and total image bytes; it resets on restart. Set `GENERATION_LOG_MAX=0` to disable admin retention completely.

## Incident response

If a credential may have leaked, rotate the provider key or account password immediately, restart the service to invalidate every in-memory session, and review provider usage. Client-facing provider errors contain a short reference ID but never the upstream response body.
