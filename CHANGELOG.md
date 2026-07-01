# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-26

### Added

- Card benefit intelligence API with routing (`POST /v1/route`) and enrichment (`POST /v1/enrich`)
- 210-card catalog with LLM benefit parsing pipeline
- Consumer wallet (web + mobile) with Plaid bank linking
- Stripe billing for SaaS orgs and Consumer Premium
- Stripe Issuing virtual cards, proxy-pay, and authorization ledger
- TypeScript and Python SDKs with OpenAPI 3.1 spec
- GDPR export, scheduled deletion, and daily purge worker
- Benefit alerts, weekly digest, and push notifications
- Production deployment on Fly.io (API), Vercel (web), EAS (mobile)
- Formal platform specification (README), architecture spec, and security policy
- Production env validation, request body limits, and security audit CI
- Git author enforcement and Cursor co-authorship rejection hooks

### Security

- Fail-closed rate limiting in production when Redis is unavailable
- Production CORS wildcard rejection at startup
- Database SSL requirement in production
- Sentry DSN required in production

[0.1.0]: https://github.com/ddvhegde100/meridian/releases/tag/v0.1.0
