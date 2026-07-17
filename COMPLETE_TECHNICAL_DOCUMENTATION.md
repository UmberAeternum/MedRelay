# Technical documentation

## Runtime

React/Vite renders `/` and `/medrelay`. tRPC exposes `system.health` and `medrelay.{status,start,continue,handoff,reset}`. Express applies 1 MB JSON limits and same-origin checks to mutations. Demo generation is IP-rate-limited.

## Model

`server/_core/openai.ts` uses the OpenAI Responses API with model `OPENAI_MEDICAL_MODEL` (default `gpt-5.6`), `store: false`, server-held developer instructions, an HMAC `safety_identifier`, and `zodTextFormat`. The API key and raw provider errors remain server-side. A production process rejects an absent or short safety salt.

## Validation and evidence

`server/medrelay/schemas.ts` defines strict reply, appointment, handoff, and evidence schemas. `semanticValidation.ts` rejects prohibited conclusions/actions. `evidence.ts` ensures IDs exist and direct quotes resolve to patient text. `service.ts` owns pipeline order and deterministic precedence.

## Storage

`sessionStore.ts` generates UUIDs and 256-bit access tokens, enforces owner/token checks and message bounds, expires sessions, evicts oldest sessions at capacity, and permanently deletes a demo session on reset. The Drizzle files remain as historical schema source but are not required or accessed by the submission demo.
