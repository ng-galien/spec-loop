<!-- source: "/criteria" template: "templates/criteria.hbs" -->

<!-- nav -->
[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Acceptance

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · **Acceptance** · [Anchoring](anchors.md) · [Verification](verification.md) · Decisions

---
<!-- /nav -->

_Document of the closed Acceptance phase; the current phase is Verification: [verification.md](verification.md)._

# Acceptance criteria: HTTP connector for Maket structured workspaces

Each requirement becomes a rule; each criterion is an example of that rule.

<!-- id: REQ-001 -->
## Rule REQ-001 · ItemSource over REST

_The connector SHALL implement the ItemSource interface of Maket (list, get, create, put, delete, refresh) over a REST API described by the workspace configuration._

<!-- id: AC-001.1 -->
### Example AC-001.1: A workspace plugged into a test API

- **Given** A test REST API with 3 customers under /items
- **When** the agent creates a structured workspace whose source is the HTTP connector of that API
- **Then** the 3 customers appear in the workspace index,
- **And** the workspace's MCP view returns a batch of 3 items with their identity and revision

<!-- id: REQ-002 -->
## Rule REQ-002 · Workspace configuration

_The connector SHALL read the base URL, the environment variable name holding the secret, and the JSON Pointer mapping (list path, next cursor path, identity path, revision path) from the workspace configuration._

<!-- id: AC-002.1 -->
### Example AC-002.1: Reading the configuration

- **Given** A workspace definition with baseUrl https://api.example.com/v1, secretEnv CRM_TOKEN, the pointers /data for the list, /next for the cursor, /id for the identity, /etag for the revision
- **When** the connector starts
- **Then** it reads these five values and invents no other
- **And** a definition without the identity pointer is refused by the workspace check with the name of the missing field

<!-- id: REQ-003 -->
## Rule REQ-003 · Secret from an environment variable

_The connector SHALL send the secret read from the configured environment variable in every request, and SHALL never write the secret into the configuration or the workspace._

<!-- id: AC-003.1 -->
### Example AC-003.1: The secret is sent, never written

- **Given** The environment variable CRM_TOKEN is s3cret and the definition holds only its name
- **When** the connector calls the API
- **Then** every request carries the Authorization header with s3cret
- **And** neither the definition, nor the workspace, nor the logs contain the string s3cret

<!-- id: REQ-004 -->
## Rule REQ-004 · Cursor listing

_When the workspace asks for a batch of items, the connector SHALL call the list endpoint with the cursor and search parameters of the API and SHALL return items, the next opaque cursor and the total when the API gives one; a batch never exceeds 500 items._

<!-- id: AC-004.1 -->
### Example AC-004.1: A batch with cursor and total

- **Given** An API that paginates by cursor with 120 items and a total
- **When** the workspace asks for a first batch of 50
- **Then** the connector returns 50 items, an opaque next cursor and the total 120
- **And** a batch asked with that cursor returns the next 50 without duplicates

<!-- id: AC-004.2 -->
### Example AC-004.2: The batch is bounded

- **Given** An API that accepts a batch size of 1000
- **When** the workspace asks for a batch of 1000
- **Then** the connector asks the API for at most 500 and returns at most 500

<!-- id: REQ-005 -->
## Rule REQ-005 · Pagination conversion

_When the API paginates by page number or by a Link header, the connector SHALL convert that pagination into the opaque cursor of the workspace._

<!-- id: AC-005.1 -->
### Example AC-005.1: Pagination by Link header

- **Given** An API that paginates by a Link rel=next header
- **When** the workspace asks for the next batch with the cursor it received
- **Then** the connector follows the URL of the Link header
- **And** the workspace never sees the URL, only an opaque cursor

<!-- id: REQ-006 -->
## Rule REQ-006 · Reading an item

_When the workspace asks for one item by its identity, the connector SHALL call the get endpoint and SHALL return the item data with its revision._

<!-- id: AC-006.1 -->
### Example AC-006.1: Reading by identity

- **Given** An item with identity 42 and the ETag W/"7"
- **When** the workspace asks for item 42
- **Then** the connector returns the item's data and the revision W/"7"

<!-- id: REQ-007 -->
## Rule REQ-007 · Write with If-Match

_When the workspace writes an item with a known revision, the connector SHALL send PUT with the If-Match header carrying that revision._

<!-- id: AC-007.1 -->
### Example AC-007.1: Write with the known revision

- **Given** Item 42 read with the revision W/"7"
- **When** the workspace writes item 42 with that revision
- **Then** the PUT /items/42 request carries If-Match: W/"7"
- **And** the API answers 200 and the connector returns the new revision

<!-- id: REQ-008 -->
## Rule REQ-008 · Stale revision (412)

_If the API answers 412 Precondition Failed to a write, then the connector SHALL refuse the write as a stale revision and SHALL return the current item data read again from the API._

<!-- id: AC-008.1 -->
### Example AC-008.1: Revision conflict

- **Given** Item 42 changed in the API since it was read, revision moved from W/"7" to W/"8"
- **When** the workspace writes item 42 with the revision W/"7"
- **Then** the API answers 412
- **And** the connector refuses with the reason stale_revision and returns the current data with W/"8"
- **And** Maket's form reloads with that data

<!-- id: REQ-009 -->
## Rule REQ-009 · Read-only without revision

_While the API gives neither an ETag nor a declared revision field, the connector SHALL declare the source read-only and SHALL refuse every write with the reason read_only._

<!-- id: AC-009.1 -->
### Example AC-009.1: Source without revision

- **Given** An API that returns neither an ETag nor a declared revision field
- **When** the workspace tries to write an item
- **Then** the connector refuses with the reason read_only
- **And** the workspace is marked read-only in its index

<!-- id: REQ-010 -->
## Rule REQ-010 · Creation with POST

_When the workspace creates an item, the connector SHALL send POST and SHALL return the identity and revision assigned by the API._

<!-- id: AC-010.1 -->
### Example AC-010.1: Creating an item

- **Given** An API that accepts POST /items and returns the identity 43 and the ETag W/"1"
- **When** the workspace creates an item
- **Then** the connector returns the identity 43 and the revision W/"1"
- **And** item 43 appears in the next batch

<!-- id: REQ-011 -->
## Rule REQ-011 · Deletion with If-Match

_When the workspace deletes an item with a known revision, the connector SHALL send DELETE with the If-Match header and SHALL report 412 as a stale revision._

<!-- id: AC-011.1 -->
### Example AC-011.1: Deletion with revision

- **Given** Item 43 read with the revision W/"1"
- **When** the workspace deletes item 43 with that revision
- **Then** the DELETE /items/43 request carries If-Match: W/"1"
- **And** a 412 answer is returned as stale_revision

<!-- id: REQ-012 -->
## Rule REQ-012 · Periodic polling

_While a polling interval is configured, the connector SHALL re-read the list at that interval and SHALL emit a source-changed signal when any item revision differs from the last read._

<!-- id: AC-012.1 -->
### Example AC-012.1: Periodic polling

- **Given** An interval of 60 seconds configured, and an item changed in the API after the last read
- **When** the interval expires
- **Then** the connector reads the list again and emits a source-changed signal
- **And** the workspace index shows the item's new revision

<!-- id: REQ-013 -->
## Rule REQ-013 · Optional webhook

_Where the API offers a webhook, the connector MAY accept its calls and SHALL emit the same source-changed signal as polling._

<!-- id: AC-013.1 -->
### Example AC-013.1: Webhook

- **Given** An API that calls the declared webhook when an item changes
- **When** the API calls the webhook for item 42
- **Then** the connector emits the same source-changed signal as periodic polling

<!-- id: REQ-014 -->
## Rule REQ-014 · Unreachable API

_If the API is unreachable or answers with a server error, then the connector SHALL report source_unreachable with the retry delay and SHALL NOT retry silently._

<!-- id: AC-014.1 -->
### Example AC-014.1: Unreachable API

- **Given** An API that answers 503 with Retry-After: 30
- **When** the workspace asks for a batch
- **Then** the connector reports source_unreachable with a delay of 30 seconds
- **And** no new request is sent before that delay
- **And** the index keeps its last window, dated

<!-- id: REQ-015 -->
## Rule REQ-015 · Timeout exceeded

_When a request to the API exceeds the configured timeout, the connector SHALL abort it and SHALL report source_unreachable with the timeout as retry delay._

<!-- id: AC-015.1 -->
### Example AC-015.1: Timeout exceeded

- **Given** A timeout of 5 seconds configured and an API that does not answer
- **When** the workspace asks for a batch
- **Then** the request is aborted after 5 seconds
- **And** the connector reports source_unreachable with 5 seconds as the retry delay

<!-- id: REQ-016 -->
## Rule REQ-016 · Configuration in the definition

_The connector configuration (base URL, environment variable name, JSON Pointer mapping, polling interval, timeout) SHALL be part of the workspace definition written through the structured workspace definition tool, and SHALL be validated by the same check as the rest of the definition._

<!-- id: AC-016.1 -->
### Example AC-016.1: Configuration checked with the definition

- **Given** A workspace definition whose connector has a polling interval of -1
- **When** the agent checks the workspace
- **Then** the check reports the invalid interval with its pointer and a correction

<!-- id: REQ-017 -->
## Rule REQ-017 · Connectors screen

_The Maket application SHALL show a Connectors screen listing every data source in use with its kind, the workspace using it, the base URL, the environment variable name, whether it is reachable, whether it is read-only, the last refresh date and the last error._

<!-- id: AC-017.1 -->
### Example AC-017.1: Connectors screen

- **Given** Three workspaces plugged into three APIs, one of them unreachable since 9:15 with a 503 error
- **When** the owner opens the Connectors screen
- **Then** he sees three rows with the kind, the workspace, the URL, the variable name, reachable or not, read-only or not, the last refresh and the last error
- **And** the unreachable row shows "no, since 09:15" and "503"

<!-- id: REQ-018 -->
## Rule REQ-018 · Connection test

_When the owner asks to test a connector from the Connectors screen, the connector SHALL perform one list request with the configured secret and SHALL report reachable or the error received, without changing any item._

<!-- id: AC-018.1 -->
### Example AC-018.1: Connection test

- **Given** A connector configured towards an API that answers 200 to the list
- **When** the owner clicks Test
- **Then** the screen shows "reachable" with the date
- **And** no item is created, changed or deleted in the API

<!-- id: AC-018.2 -->
### Example AC-018.2: Failed connection test

- **Given** A connector configured towards an API that answers 401
- **When** the owner clicks Test
- **Then** the screen shows the 401 error and the environment variable to check

<!-- id: REQ-019 -->
## Rule REQ-019 · Status indicator in the workspace

_The workspace index SHALL show a connector status indicator (reachable, unreachable since a date, read-only) visible without opening the Connectors screen._

<!-- id: AC-019.1 -->
### Example AC-019.1: Indicator in the workspace

- **Given** A workspace whose source has been unreachable since 9:15
- **When** the owner opens the workspace
- **Then** the index shows the indicator "source unreachable since 09:15" without opening the Connectors screen
- **And** the indicator leads to the Connectors screen

<!-- id: REQ-020 -->
## Rule REQ-020 · No secret entry

_If any screen or tool of Maket receives a secret value for a connector, then Maket SHALL refuse it and SHALL point at the environment variable name instead._

<!-- id: AC-020.1 -->
### Example AC-020.1: Secret refused

- **Given** An agent that passes the value s3cret in the connector definition
- **When** the agent checks or saves the definition
- **Then** Maket refuses and asks for the name of an environment variable instead
- **And** the value s3cret is written nowhere

<!-- nav -->

---

[All features](../../README.md) › [FEAT-001 · HTTP connector for Maket structured workspaces](index.md) › Acceptance

[Index](index.md) · [Framing](framing.md) · [Requirements](requirements.md) · **Acceptance** · [Anchoring](anchors.md) · [Verification](verification.md) · Decisions

← Previous: [Requirements](requirements.md) · Next: [Anchoring](anchors.md) →
<!-- /nav -->
