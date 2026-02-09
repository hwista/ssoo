# BigInt handling guide (backend)

- DB: Prisma schema keeps bigint for IDs and numeric keys.
- Service/Repo: keep bigint type in logic; avoid coercing to number.
- API responses: stringify IDs before returning (helpers in common/utils/bigint.util.ts).
- Request DTOs: accept string for IDs, convert to bigint at controller/service boundary.
- Cross-package types: @ssoo/types models expose string ids for transport; server maps to bigint internally.
- Testing: verify JSON serialization of bigint-sensitive endpoints; ensure no TypeError: Do not know how to serialize a BigInt.
- Migration note: when adding new models, keep id BigInt and add serializer where exposed.

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

