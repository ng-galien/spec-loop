<!-- source: "/tests" template: "templates/tests.hbs" -->

<!-- nav -->
[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Vérification

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · [Acceptation](criteres.md) · [Ancrage](ancrage.md) · **Vérification** · Décisions

---
<!-- /nav -->

# Vérification : Connecteur HTTP pour les espaces structurés de Maket

<!-- ptr: /tests -->
## Tests

<!-- ptr: /tests/0 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-001.1 Un espace branché sur une API de test » (vitest, unit, test). Vérifie AC-001.1. Statut : **à écrire**.
<!-- ptr: /tests/1 -->
- `packages/server/src/tools/structured-workspaces.test.ts` : « AC-002.1 Lecture de la configuration » (vitest, integration, test). Vérifie AC-002.1. Statut : **à écrire**.
<!-- ptr: /tests/2 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-003.1 Le secret part, jamais écrit » (vitest, unit, test). Vérifie AC-003.1. Statut : **à écrire**.
<!-- ptr: /tests/3 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-004.1 Un lot avec curseur et total » (vitest, unit, test). Vérifie AC-004.1. Statut : **à écrire**.
<!-- ptr: /tests/4 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-004.2 Le lot est borné » (vitest, unit, test). Vérifie AC-004.2. Statut : **à écrire**.
<!-- ptr: /tests/5 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-005.1 Pagination par en-tête Link » (vitest, unit, test). Vérifie AC-005.1. Statut : **à écrire**.
<!-- ptr: /tests/6 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-006.1 Lecture par identité » (vitest, unit, test). Vérifie AC-006.1. Statut : **à écrire**.
<!-- ptr: /tests/7 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-007.1 Écriture avec la révision connue » (vitest, unit, test). Vérifie AC-007.1. Statut : **à écrire**.
<!-- ptr: /tests/8 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-008.1 Conflit de révision » (vitest, unit, test). Vérifie AC-008.1. Statut : **à écrire**.
<!-- ptr: /tests/9 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-009.1 Source sans révision » (vitest, unit, test). Vérifie AC-009.1. Statut : **à écrire**.
<!-- ptr: /tests/10 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-010.1 Création d'un élément » (vitest, unit, test). Vérifie AC-010.1. Statut : **à écrire**.
<!-- ptr: /tests/11 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-011.1 Suppression avec révision » (vitest, unit, test). Vérifie AC-011.1. Statut : **à écrire**.
<!-- ptr: /tests/12 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-012.1 Interrogation périodique » (vitest, unit, test). Vérifie AC-012.1. Statut : **à écrire**.
<!-- ptr: /tests/13 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-013.1 Webhook » (vitest, unit, test). Vérifie AC-013.1. Statut : **à écrire**.
<!-- ptr: /tests/14 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-014.1 API injoignable » (vitest, unit, test). Vérifie AC-014.1. Statut : **à écrire**.
<!-- ptr: /tests/15 -->
- `packages/server/src/services/item-sources/http-item-source.test.ts` : « AC-015.1 Délai dépassé » (vitest, unit, test). Vérifie AC-015.1. Statut : **à écrire**.
<!-- ptr: /tests/16 -->
- `packages/server/src/tools/structured-workspaces.test.ts` : « AC-016.1 Configuration vérifiée avec la définition » (vitest, integration, test). Vérifie AC-016.1. Statut : **à écrire**.
<!-- ptr: /tests/17 -->
- `packages/client/e2e/connectors.spec.ts` : « AC-017.1 Écran Connecteurs » (playwright, e2e, test). Vérifie AC-017.1. Statut : **à écrire**.
<!-- ptr: /tests/18 -->
- `packages/client/e2e/connectors.spec.ts` : « AC-018.1 Test de connexion » (playwright, e2e, test). Vérifie AC-018.1. Statut : **à écrire**.
<!-- ptr: /tests/19 -->
- `packages/client/e2e/connectors.spec.ts` : « AC-018.2 Test de connexion en échec » (playwright, e2e, test). Vérifie AC-018.2. Statut : **à écrire**.
<!-- ptr: /tests/20 -->
- `packages/client/e2e/connectors.spec.ts` : « AC-019.1 Indicateur dans l'espace » (playwright, e2e, test). Vérifie AC-019.1. Statut : **à écrire**.
<!-- ptr: /tests/21 -->
- `packages/server/src/tools/structured-workspaces.test.ts` : « AC-020.1 Secret refusé » (vitest, integration, test). Vérifie AC-020.1. Statut : **à écrire**.

## Couverture

| Critère | Tests |
| --- | --- |
| AC-001.1 | 1 |
| AC-002.1 | 1 |
| AC-003.1 | 1 |
| AC-004.1 | 1 |
| AC-004.2 | 1 |
| AC-005.1 | 1 |
| AC-006.1 | 1 |
| AC-007.1 | 1 |
| AC-008.1 | 1 |
| AC-009.1 | 1 |
| AC-010.1 | 1 |
| AC-011.1 | 1 |
| AC-012.1 | 1 |
| AC-013.1 | 1 |
| AC-014.1 | 1 |
| AC-015.1 | 1 |
| AC-016.1 | 1 |
| AC-017.1 | 1 |
| AC-018.1 | 1 |
| AC-018.2 | 1 |
| AC-019.1 | 1 |
| AC-020.1 | 1 |

<!-- nav -->

---

[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Vérification

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · [Acceptation](criteres.md) · [Ancrage](ancrage.md) · **Vérification** · Décisions

← Précédent : [Ancrage](ancrage.md)
<!-- /nav -->
