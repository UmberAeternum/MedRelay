# Audit report

The submission surface was reduced to MedRelay. Legacy diagnosis, directory, prescription, telemedicine, analytics, and simulated-chat routes were removed from routing; remaining compatibility modules are inert and unimported.

Implemented controls: strict bounded inputs, server history, cryptographic sessions, expiration/reset/eviction, deterministic patient-only safety screening, injection screening, provider bypass on emergency wording, strict structured output, semantic checks, evidence resolution, generic errors, small request limits, origin checks, rate limiting, and honest offline state.

See `VERIFICATION_REPORT.md` for command evidence and remaining limitations.
