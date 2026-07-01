# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

Email **security@stipulate.io** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment
4. Suggested remediation (if any)

You SHOULD receive an acknowledgment within 48 hours. Critical issues are triaged within 24 hours.

## Scope

In scope:

- `@stipulate/api` — authentication, authorization, rate limits, webhook verification
- `@stipulate/web` — session handling, consumer auth cookies
- `@stipulate/mobile` — secure storage of session credentials
- Infrastructure secrets and CI workflows

Out of scope:

- Third-party services (Stripe, Plaid, OpenAI) — report directly to those vendors
- Social engineering attacks against individuals

## Secure development practices

- Production env validation at API startup (`apps/api/src/config/env.ts`)
- Request body size limits (`apps/api/src/middleware/body-limit.ts`)
- Fail-closed rate limiting when Redis is unavailable in production
- Stripe webhook signature verification before processing billing events
- GDPR export and scheduled deletion for consumer accounts

## Dependency updates

Security audits run weekly via `.github/workflows/security-audit.yml`. Critical CVEs in production dependencies MUST be patched within 7 days.
