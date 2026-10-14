<!-- source: "/anchors" template: "templates/anchors.hbs" -->

<!-- nav -->
[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Ancrage

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · [Acceptation](criteres.md) · **Ancrage** · [Vérification](verification.md) · Décisions

---
<!-- /nav -->

_Document de la phase Ancrage, close ; la phase actuelle est Vérification : [verification.md](verification.md)._

# Ancrage : Connecteur HTTP pour les espaces structurés de Maket

Chaque ancre désigne l'endroit du code qui réalise une ou plusieurs exigences.

<!-- id: ANC-01 -->
- **ANC-01** · `packages/server/src/services/item-sources/http-item-source.ts`, symbole `createHttpItemSource` (symbol, ajout). Réalise REQ-001, REQ-009. Nouvelle fabrique à côté de createLocalItemSource : elle implémente ItemSource sans la modifier. capabilities() rend readOnly vrai, sans create, put ni delete, quand la configuration ne déclare ni ETag ni champ de révision ; l'écriture est alors refusée en read_only par sourceWrite.
<!-- id: ANC-02 -->
- **ANC-02** · `packages/server/src/services/item-sources/http-item-source.ts`, symbole `HttpItemSource.refresh` (symbol, ajout). Réalise REQ-004, REQ-006. list et get sont synchrones dans ItemSource : refresh appelle l'API (liste par curseur et recherche, au plus 500 éléments par lot, total si l'API le donne ; élément seul avec sa révision) et remplit la mémoire que list et get servent ensuite.
<!-- id: ANC-03 -->
- **ANC-03** · `packages/server/src/services/item-sources/http-item-source.ts`, symbole `HttpItemSource.put` (symbol, ajout). Réalise REQ-007, REQ-008. Envoie PUT avec If-Match portant la révision attendue ; sur 412, relit l'élément et lève stale_revision avec currentRevision et les données courantes.
<!-- id: ANC-04 -->
- **ANC-04** · `packages/server/src/services/item-sources/http-item-source.ts`, symbole `HttpItemSource.create` (symbol, ajout). Réalise REQ-010. Envoie POST et rend l'identité et la révision attribuées par l'API, lues aux pointeurs JSON déclarés.
<!-- id: ANC-05 -->
- **ANC-05** · `packages/server/src/services/item-sources/http-item-source.ts`, symbole `HttpItemSource.delete` (symbol, ajout). Réalise REQ-011. Envoie DELETE avec If-Match portant la révision attendue ; une réponse 412 devient stale_revision.
<!-- id: ANC-06 -->
- **ANC-06** · `packages/server/src/services/item-sources/http-pagination.ts`, symbole `httpPageCursor` (module, ajout). Réalise REQ-005. Convertit la pagination de l'API (numéro de page, en-tête Link ou pointeur du curseur suivant) en curseur opaque de l'espace, encodé comme celui de la source locale.
<!-- id: ANC-07 -->
- **ANC-07** · `packages/server/src/services/item-sources/http-request.ts`, symbole `requestApi` (symbol, ajout). Réalise REQ-003, REQ-014, REQ-015. Seul point d'appel réseau : lit le secret dans process.env sous le nom configuré et l'envoie à chaque requête sans jamais l'écrire ; coupe la requête au délai configuré par AbortSignal ; rend source_unreachable avec retryAfter sur erreur réseau, 5xx ou délai dépassé, sans nouvel essai.
<!-- id: ANC-08 -->
- **ANC-08** · `packages/server/src/services/item-sources/http-polling.ts`, symbole `startHttpPolling` (symbol, ajout). Réalise REQ-012. Relit la liste à l'intervalle configuré, compare les révisions à la dernière lecture et émet structured-workspace:source-changed sur le bus quand l'une diffère ; arrêté par close().
<!-- id: ANC-09 -->
- **ANC-09** · `packages/server/src/routes/connector-webhook.routes.ts`, symbole `createConnectorWebhookRouter` (route, ajout). Réalise REQ-013. Route optionnelle qui reçoit les appels du webhook de l'API et émet le même structured-workspace:source-changed que l'interrogation ; montée par ROUTER_NAMES dans packages/server/src/routes/index.ts et enregistrée dans bootstrap.ts.
<!-- id: ANC-10 -->
- **ANC-10** · `packages/server/src/services/item-sources/item-sources.ts`, symbole `createItemSources` (symbol, modification). Réalise REQ-001, REQ-017, REQ-018. Le registre ouvre createHttpItemSource quand la définition déclare une source HTTP, createLocalItemSource sinon ; il gagne l'état de chaque connecteur (joignable, lecture seule, dernier rafraîchissement, dernière erreur) et un test de connexion qui fait une seule lecture de liste sans écrire.
<!-- id: ANC-11 -->
- **ANC-11** · `packages/shared/src/structured-workspace.ts`, symbole `StructuredWorkspaceRepresentationSchema` (schema, modification). Réalise REQ-002, REQ-016. Ajoute source, de type StructuredWorkspaceHttpSource : URL de base, nom de la variable d'environnement du secret, pointeurs JSON de liste, curseur suivant, identité et révision (ETag ou champ), intervalle d'interrogation, délai. Elle est stockée avec la définition, sans changement de dépôt.
<!-- id: ANC-12 -->
- **ANC-12** · `packages/shared/src/structured-workspace.ts`, symbole `diagnoseStructuredWorkspaceDefinition` (symbol, modification). Réalise REQ-016, REQ-020, REQ-003. Ajoute la vérification de la source au même contrôle que le reste de la définition ; une valeur de secret (clé secret, token, password ou valeur d'en-tête) est refusée avec une correction qui renvoie au nom de la variable d'environnement.
<!-- id: ANC-13 -->
- **ANC-13** · `packages/server/src/tools/structured-workspaces.ts`, symbole `RepresentationSchema` (schema, modification). Réalise REQ-016, REQ-020. Le schéma zod de representation_schema accepte source, écrite par create et update_definition ; la description de l'outil dit qu'on n'y donne que le nom de la variable du secret.
<!-- id: ANC-14 -->
- **ANC-14** · `packages/server/src/tools/structured-workspaces.ts`, symbole `failureAnswer` (symbol, modification). Réalise REQ-008, REQ-009, REQ-014, REQ-015. Rend à l'agent stale_revision avec la révision et les données courantes, read_only avec sa raison, source_unreachable avec le statut, le message de l'API et le délai avant nouvel essai ; aujourd'hui seuls les refus de requête sont traduits.
<!-- id: ANC-15 -->
- **ANC-15** · `packages/server/src/tools/structured-workspaces.ts`, symbole `runDeleteItem` (symbol, modification). Réalise REQ-011. Transmet expected_revision à deleteItem ; expected_revision accepte aussi une révision texte (ETag) pour update_item et delete_item.
<!-- id: ANC-16 -->
- **ANC-16** · `packages/server/src/services/structured-workspaces.ts`, symbole `updateItem` (symbol, modification). Réalise REQ-007, REQ-008. Passe la révision de la source telle quelle au put ; staleItemRevision ne convertit plus currentRevision en nombre et joint les données relues après un 412.
<!-- id: ANC-17 -->
- **ANC-17** · `packages/server/src/services/structured-workspaces.ts`, symbole `deleteItem` (symbol, modification). Réalise REQ-011. Reçoit la révision attendue et la passe à delete de la source, qui l'envoie en If-Match.
<!-- id: ANC-18 -->
- **ANC-18** · `packages/server/src/services/structured-workspaces.ts`, symbole `materializeRepresentation` (symbol, modification). Réalise REQ-016. Conserve source de la représentation saisie dans la définition matérialisée, pour create comme pour update_definition.
<!-- id: ANC-19 -->
- **ANC-19** · `packages/server/src/services/structured-workspaces.ts`, symbole `workspaceView` (symbol, modification). Réalise REQ-017, REQ-019. Joint à chaque vue l'état du connecteur lu dans ItemSources, diffusé par structured_workspaces_changed à chaque changement d'état.
<!-- id: ANC-20 -->
- **ANC-20** · `packages/shared/src/structured-workspace.ts`, symbole `StructuredWorkspaceView` (schema, modification). Réalise REQ-017, REQ-019. Ajoute sourceStatus : type, URL de base, nom de la variable, joignable ou injoignable depuis une date, lecture seule, dernier rafraîchissement, dernière erreur ; jamais la valeur du secret.
<!-- id: ANC-21 -->
- **ANC-21** · `packages/shared/src/ws.ts`, symbole `TestConnectorCommand` (schema, ajout). Réalise REQ-018. Nouvelle commande test_connector et son signal de résultat connector_test_result (joignable, ou statut, message et délai conseillé), ajoutés aux unions WorkspaceCommand et WorkspaceSignal.
<!-- id: ANC-22 -->
- **ANC-22** · `packages/server/src/services/ws-handler/structured-workspace-commands.ts`, symbole `handleTestConnector` (symbol, ajout). Réalise REQ-018. Traite test_connector : appelle le test de connexion du registre et répond au client ; branché dans le switch de createWsHandler.
<!-- id: ANC-23 -->
- **ANC-23** · `packages/client/src/components/ConnectorsTab.tsx`, symbole `ConnectorsTab` (module, ajout). Réalise REQ-017, REQ-018, REQ-020. Écran Connecteurs de la maquette ART-03 : une ligne par source avec type, espace, URL de base, nom de la variable, joignable, lecture seule, dernier rafraîchissement, dernière erreur et un bouton Tester ; aucun champ de saisie de secret.
<!-- id: ANC-24 -->
- **ANC-24** · `packages/client/src/components/LibraryPanel.tsx`, symbole `LibraryView` (symbol, modification). Réalise REQ-017. Ajoute la vue connectors à la barre de la bibliothèque, à côté de structured-workspaces, qui affiche ConnectorsTab.
<!-- id: ANC-25 -->
- **ANC-25** · `packages/client/src/store/ws.ts`, symbole `sendTestConnector` (symbol, ajout). Réalise REQ-018. Envoie test_connector pour un espace et range le résultat reçu pour l'écran Connecteurs.
<!-- id: ANC-26 -->
- **ANC-26** · `packages/client/src/components/StructuredCollectionWorkspace.tsx`, symbole `ConnectorStatusIndicator` (symbol, ajout). Réalise REQ-019. Indicateur de la maquette ART-04 placé dans CollectionDocument au-dessus de la recherche de l'index : joignable avec la date de rafraîchissement, injoignable depuis une date avec la dernière erreur, ou lecture seule, avec un lien vers l'écran Connecteurs.
<!-- id: ANC-27 -->
- **ANC-27** · `packages/client/src/i18n/fr.json` (config, modification). Réalise REQ-017, REQ-019. Libellés français de l'écran Connecteurs et de l'indicateur ; les mêmes clés en anglais dans packages/client/src/i18n/en.json.

<!-- nav -->

---

[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Ancrage

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · [Acceptation](criteres.md) · **Ancrage** · [Vérification](verification.md) · Décisions

← Précédent : [Acceptation](criteres.md) · Suivant : [Vérification](verification.md) →
<!-- /nav -->
