# Safety boundaries

MedRelay preserves patient wording and prepares a clinician-review draft. It never provides a confirmed condition, probability, prescription, dose, treatment change, completed clinician review, automatic appointment, or emergency dispatch.

Deterministic warning-sign screening runs only over patient-authored messages and always runs before a provider call. A deterministic emergency result bypasses GPT and returns generic guidance to seek emergency care or contact local emergency services. Model urgency cannot downgrade that result.

Untrusted fields are injection-screened and delimited as data. Structured model output is parsed with Zod, checked for semantic boundary violations, and linked to real patient message IDs. This reduces risk but is not claimed to provide perfect prompt-injection immunity or clinical validation.
