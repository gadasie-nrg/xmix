---
name: Permanent institution codes
description: Why institution join codes must remain stable across all enrollment and sharing flows.
---

Each institution has one permanent join code created with the institution. Showing, copying, or requesting sharing details must return that stored code without generating a replacement.

**Why:** Institution managers distribute the code to new users over time. Rotating it from an invite or sharing action makes previously distributed instructions fail and obscures where managers should find the code.

**How to apply:** Display the code prominently in institution and user-enrollment views. Any compatibility endpoint that returns invite details must be idempotent and must not update the stored code.