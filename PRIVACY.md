# Privacy

Public demo content is held only in a bounded in-memory server session, expires after 30 minutes, and can be deleted with Reset demo. It is not intentionally logged or written to MySQL. The OpenAI request uses `store: false` and a non-identifying HMAC safety identifier.

The demo is for synthetic data. In-memory state is local to one server instance and is not durable. This repository makes no regulatory, privacy-certification, or medical-production-readiness claim.
