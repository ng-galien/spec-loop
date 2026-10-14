<!-- source: "/anchors" template: "templates/anchors.hbs" -->

<!-- nav -->
[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Anchoring

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · [Acceptance](criteria.md) · **Anchoring** · [Verification](verification.md) · Decisions

---
<!-- /nav -->

_Document of the closed Anchoring phase; the current phase is Verification: [verification.md](verification.md)._

# Anchoring: HTTP connector for Maket structured workspaces

Each anchor names the place in the code that realises one or more requirements.

<!-- id: ANC-01 -->
- **ANC-01** · `packages/server/src/services/item-sources/http-item-source.ts`, symbol `createHttpItemSource` (symbol, addition). Realises REQ-001, REQ-009. New factory next to createLocalItemSource: it implements ItemSource without changing it. capabilities() returns readOnly true, without create, put or delete, when the configuration declares neither an ETag nor a revision field; writing is then refused as read_only by sourceWrite.
<!-- id: ANC-02 -->
- **ANC-02** · `packages/server/src/services/item-sources/http-item-source.ts`, symbol `HttpItemSource.refresh` (symbol, addition). Realises REQ-004, REQ-006. list and get are synchronous in ItemSource: refresh calls the API (cursor listing and search, at most 500 items per batch, total when the API gives it; single item with its revision) and fills the memory that list and get then serve.
<!-- id: ANC-03 -->
- **ANC-03** · `packages/server/src/services/item-sources/http-item-source.ts`, symbol `HttpItemSource.put` (symbol, addition). Realises REQ-007, REQ-008. Sends PUT with If-Match carrying the expected revision; on 412, reads the item again and raises stale_revision with currentRevision and the current data.
<!-- id: ANC-04 -->
- **ANC-04** · `packages/server/src/services/item-sources/http-item-source.ts`, symbol `HttpItemSource.create` (symbol, addition). Realises REQ-010. Sends POST and returns the identity and revision assigned by the API, read at the declared JSON pointers.
<!-- id: ANC-05 -->
- **ANC-05** · `packages/server/src/services/item-sources/http-item-source.ts`, symbol `HttpItemSource.delete` (symbol, addition). Realises REQ-011. Sends DELETE with If-Match carrying the expected revision; a 412 answer becomes stale_revision.
<!-- id: ANC-06 -->
- **ANC-06** · `packages/server/src/services/item-sources/http-pagination.ts`, symbol `httpPageCursor` (module, addition). Realises REQ-005. Converts the API's pagination (page number, Link header or next-cursor pointer) into the workspace's opaque cursor, encoded like the local source's one.
<!-- id: ANC-07 -->
- **ANC-07** · `packages/server/src/services/item-sources/http-request.ts`, symbol `requestApi` (symbol, addition). Realises REQ-003, REQ-014, REQ-015. Only network call site: reads the secret from process.env under the configured name and sends it with every request without ever writing it; aborts the request at the configured timeout with an AbortSignal; returns source_unreachable with retryAfter on a network error, a 5xx or a timeout, without retrying.
<!-- id: ANC-08 -->
- **ANC-08** · `packages/server/src/services/item-sources/http-polling.ts`, symbol `startHttpPolling` (symbol, addition). Realises REQ-012. Reads the list again at the configured interval, compares the revisions with the last read and emits structured-workspace:source-changed on the bus when one differs; stopped by close().
<!-- id: ANC-09 -->
- **ANC-09** · `packages/server/src/routes/connector-webhook.routes.ts`, symbol `createConnectorWebhookRouter` (route, addition). Realises REQ-013. Optional route that receives the API's webhook calls and emits the same structured-workspace:source-changed as polling; mounted through ROUTER_NAMES in packages/server/src/routes/index.ts and registered in bootstrap.ts.
<!-- id: ANC-10 -->
- **ANC-10** · `packages/server/src/services/item-sources/item-sources.ts`, symbol `createItemSources` (symbol, modification). Realises REQ-001, REQ-017, REQ-018. The registry opens createHttpItemSource when the definition declares an HTTP source, createLocalItemSource otherwise; it gains the state of each connector (reachable, read-only, last refresh, last error) and a connection test that performs a single list read without writing.
<!-- id: ANC-11 -->
- **ANC-11** · `packages/shared/src/structured-workspace.ts`, symbol `StructuredWorkspaceRepresentationSchema` (schema, modification). Realises REQ-002, REQ-016. Adds source, of type StructuredWorkspaceHttpSource: base URL, name of the secret's environment variable, JSON pointers for the list, next cursor, identity and revision (ETag or field), polling interval, timeout. It is stored with the definition, with no repository change.
<!-- id: ANC-12 -->
- **ANC-12** · `packages/shared/src/structured-workspace.ts`, symbol `diagnoseStructuredWorkspaceDefinition` (symbol, modification). Realises REQ-016, REQ-020, REQ-003. Adds the check of the source to the same check as the rest of the definition; a secret value (secret, token or password key, or header value) is refused with a correction that points to the name of the environment variable.
<!-- id: ANC-13 -->
- **ANC-13** · `packages/server/src/tools/structured-workspaces.ts`, symbol `RepresentationSchema` (schema, modification). Realises REQ-016, REQ-020. The zod schema of representation_schema accepts source, written by create and update_definition; the tool description says that only the name of the secret's variable is given there.
<!-- id: ANC-14 -->
- **ANC-14** · `packages/server/src/tools/structured-workspaces.ts`, symbol `failureAnswer` (symbol, modification). Realises REQ-008, REQ-009, REQ-014, REQ-015. Returns to the agent stale_revision with the current revision and data, read_only with its reason, source_unreachable with the status, the API's message and the delay before a retry; today only request refusals are translated.
<!-- id: ANC-15 -->
- **ANC-15** · `packages/server/src/tools/structured-workspaces.ts`, symbol `runDeleteItem` (symbol, modification). Realises REQ-011. Passes expected_revision to deleteItem; expected_revision also accepts a text revision (ETag) for update_item and delete_item.
<!-- id: ANC-16 -->
- **ANC-16** · `packages/server/src/services/structured-workspaces.ts`, symbol `updateItem` (symbol, modification). Realises REQ-007, REQ-008. Passes the source's revision as is to put; staleItemRevision no longer converts currentRevision to a number and attaches the data read again after a 412.
<!-- id: ANC-17 -->
- **ANC-17** · `packages/server/src/services/structured-workspaces.ts`, symbol `deleteItem` (symbol, modification). Realises REQ-011. Receives the expected revision and passes it to the source's delete, which sends it in If-Match.
<!-- id: ANC-18 -->
- **ANC-18** · `packages/server/src/services/structured-workspaces.ts`, symbol `materializeRepresentation` (symbol, modification). Realises REQ-016. Keeps source from the entered representation in the materialised definition, for create as for update_definition.
<!-- id: ANC-19 -->
- **ANC-19** · `packages/server/src/services/structured-workspaces.ts`, symbol `workspaceView` (symbol, modification). Realises REQ-017, REQ-019. Attaches to each view the connector state read in ItemSources, broadcast by structured_workspaces_changed at every state change.
<!-- id: ANC-20 -->
- **ANC-20** · `packages/shared/src/structured-workspace.ts`, symbol `StructuredWorkspaceView` (schema, modification). Realises REQ-017, REQ-019. Adds sourceStatus: kind, base URL, variable name, reachable or unreachable since a date, read-only, last refresh, last error; never the secret's value.
<!-- id: ANC-21 -->
- **ANC-21** · `packages/shared/src/ws.ts`, symbol `TestConnectorCommand` (schema, addition). Realises REQ-018. New command test_connector and its result signal connector_test_result (reachable, or status, message and advised delay), added to the WorkspaceCommand and WorkspaceSignal unions.
<!-- id: ANC-22 -->
- **ANC-22** · `packages/server/src/services/ws-handler/structured-workspace-commands.ts`, symbol `handleTestConnector` (symbol, addition). Realises REQ-018. Handles test_connector: calls the registry's connection test and answers the client; plugged into the switch of createWsHandler.
<!-- id: ANC-23 -->
- **ANC-23** · `packages/client/src/components/ConnectorsTab.tsx`, symbol `ConnectorsTab` (module, addition). Realises REQ-017, REQ-018, REQ-020. Connectors screen of wireframe ART-03: one row per source with kind, workspace, base URL, variable name, reachable, read-only, last refresh, last error and a Test button; no field to enter a secret.
<!-- id: ANC-24 -->
- **ANC-24** · `packages/client/src/components/LibraryPanel.tsx`, symbol `LibraryView` (symbol, modification). Realises REQ-017. Adds the connectors view to the library bar, next to structured-workspaces, which shows ConnectorsTab.
<!-- id: ANC-25 -->
- **ANC-25** · `packages/client/src/store/ws.ts`, symbol `sendTestConnector` (symbol, addition). Realises REQ-018. Sends test_connector for a workspace and stores the result received for the Connectors screen.
<!-- id: ANC-26 -->
- **ANC-26** · `packages/client/src/components/StructuredCollectionWorkspace.tsx`, symbol `ConnectorStatusIndicator` (symbol, addition). Realises REQ-019. Indicator of wireframe ART-04 placed in CollectionDocument above the index search: reachable with the refresh date, unreachable since a date with the last error, or read-only, with a link to the Connectors screen.
<!-- id: ANC-27 -->
- **ANC-27** · `packages/client/src/i18n/fr.json` (configuration, modification). Realises REQ-017, REQ-019. French labels of the Connectors screen and of the indicator; the same keys in English in packages/client/src/i18n/en.json.

<!-- nav -->

---

[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Anchoring

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · [Acceptance](criteria.md) · **Anchoring** · [Verification](verification.md) · Decisions

← Previous: [Acceptance](criteria.md) · Next: [Verification](verification.md) →
<!-- /nav -->
