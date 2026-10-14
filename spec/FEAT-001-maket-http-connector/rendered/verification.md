<!-- source: "/tests" template: "templates/tests.hbs" -->

<!-- nav -->
[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Verification

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · [Acceptance](criteria.md) · [Anchoring](anchors.md) · **Verification** · Decisions

---
<!-- /nav -->

# Verification: HTTP connector for Maket structured workspaces

<!-- ptr: /tests -->
## Tests

<!-- ptr: /tests/0 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-001.1 A workspace plugged into a test API" (vitest, unit, test). Verifies AC-001.1. Status: **to write**.
<!-- ptr: /tests/1 -->
- `packages/server/src/tools/structured-workspaces.test.ts`: "AC-002.1 Reading the configuration" (vitest, integration, test). Verifies AC-002.1. Status: **to write**.
<!-- ptr: /tests/2 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-003.1 The secret is sent, never written" (vitest, unit, test). Verifies AC-003.1. Status: **to write**.
<!-- ptr: /tests/3 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-004.1 A batch with cursor and total" (vitest, unit, test). Verifies AC-004.1. Status: **to write**.
<!-- ptr: /tests/4 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-004.2 The batch is bounded" (vitest, unit, test). Verifies AC-004.2. Status: **to write**.
<!-- ptr: /tests/5 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-005.1 Pagination by Link header" (vitest, unit, test). Verifies AC-005.1. Status: **to write**.
<!-- ptr: /tests/6 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-006.1 Reading by identity" (vitest, unit, test). Verifies AC-006.1. Status: **to write**.
<!-- ptr: /tests/7 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-007.1 Write with the known revision" (vitest, unit, test). Verifies AC-007.1. Status: **to write**.
<!-- ptr: /tests/8 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-008.1 Revision conflict" (vitest, unit, test). Verifies AC-008.1. Status: **to write**.
<!-- ptr: /tests/9 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-009.1 Source without revision" (vitest, unit, test). Verifies AC-009.1. Status: **to write**.
<!-- ptr: /tests/10 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-010.1 Creating an item" (vitest, unit, test). Verifies AC-010.1. Status: **to write**.
<!-- ptr: /tests/11 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-011.1 Deletion with revision" (vitest, unit, test). Verifies AC-011.1. Status: **to write**.
<!-- ptr: /tests/12 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-012.1 Periodic polling" (vitest, unit, test). Verifies AC-012.1. Status: **to write**.
<!-- ptr: /tests/13 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-013.1 Webhook" (vitest, unit, test). Verifies AC-013.1. Status: **to write**.
<!-- ptr: /tests/14 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-014.1 Unreachable API" (vitest, unit, test). Verifies AC-014.1. Status: **to write**.
<!-- ptr: /tests/15 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts`: "AC-015.1 Timeout exceeded" (vitest, unit, test). Verifies AC-015.1. Status: **to write**.
<!-- ptr: /tests/16 -->
- `packages/server/src/tools/structured-workspaces.test.ts`: "AC-016.1 Configuration checked with the definition" (vitest, integration, test). Verifies AC-016.1. Status: **to write**.
<!-- ptr: /tests/17 -->
- `packages/client/e2e/connectors.spec.ts`: "AC-017.1 Connectors screen" (playwright, end to end, test). Verifies AC-017.1. Status: **to write**.
<!-- ptr: /tests/18 -->
- `packages/client/e2e/connectors.spec.ts`: "AC-018.1 Connection test" (playwright, end to end, test). Verifies AC-018.1. Status: **to write**.
<!-- ptr: /tests/19 -->
- `packages/client/e2e/connectors.spec.ts`: "AC-018.2 Failed connection test" (playwright, end to end, test). Verifies AC-018.2. Status: **to write**.
<!-- ptr: /tests/20 -->
- `packages/client/e2e/connectors.spec.ts`: "AC-019.1 Indicator in the workspace" (playwright, end to end, test). Verifies AC-019.1. Status: **to write**.
<!-- ptr: /tests/21 -->
- `packages/server/src/tools/structured-workspaces.test.ts`: "AC-020.1 Secret refused" (vitest, integration, test). Verifies AC-020.1. Status: **to write**.

## Coverage

| Criterion | Tests | Status |
| --- | --- | --- |
| AC-001.1 | 1 | to write |
| AC-002.1 | 1 | to write |
| AC-003.1 | 1 | to write |
| AC-004.1 | 1 | to write |
| AC-004.2 | 1 | to write |
| AC-005.1 | 1 | to write |
| AC-006.1 | 1 | to write |
| AC-007.1 | 1 | to write |
| AC-008.1 | 1 | to write |
| AC-009.1 | 1 | to write |
| AC-010.1 | 1 | to write |
| AC-011.1 | 1 | to write |
| AC-012.1 | 1 | to write |
| AC-013.1 | 1 | to write |
| AC-014.1 | 1 | to write |
| AC-015.1 | 1 | to write |
| AC-016.1 | 1 | to write |
| AC-017.1 | 1 | to write |
| AC-018.1 | 1 | to write |
| AC-018.2 | 1 | to write |
| AC-019.1 | 1 | to write |
| AC-020.1 | 1 | to write |
| **Total** | 22 | 0 of 22 criteria verified |

<!-- nav -->

---

[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Verification

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · [Acceptance](criteria.md) · [Anchoring](anchors.md) · **Verification** · Decisions

← Previous: [Anchoring](anchors.md)
<!-- /nav -->
