---
name: OpenAPI codegen and Zod compatibility
description: The workspace's generated Zod client targets the installed Zod 3 API surface.
---

Keep OpenAPI numeric fields as `number` and email fields as plain `string` in this workspace's contracts unless the generator configuration and Zod dependency are upgraded together.

**Why:** The current Orval output emitted `zod.int()` and `zod.email()` for `integer` and `format: email`, but the installed Zod version does not expose those top-level helpers, causing shared-library typechecks to fail.

**How to apply:** Enforce integer and email semantics in route handlers or app-level validation while keeping generated schemas compatible.