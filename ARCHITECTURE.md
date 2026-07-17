# Architecture

The submission exposes only `/`, `/medrelay`, the health query, and MedRelay session endpoints.

Request order: validate bounded patient input → append to server-controlled ephemeral session → deterministic patient-only safety scan → injection screen → OpenAI Responses API (`store: false`) when configured → strict Zod parse → semantic/cross-field validation → deterministic urgency reconciliation → evidence resolution → validated UI response.

The browser sends only a new patient statement plus an opaque session ID/token. Assistant and system history are reconstructed on the server. Demo sessions use a bounded, expiring in-memory store; this is single-instance hackathon infrastructure, not durable production storage.
