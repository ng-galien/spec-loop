# spec-loop vocabulary research

Status: research input for `schema/feature.schema.json` and the skills. Date: 2026-10-14.

Goal: pick, at each level of granularity, the term an agent already knows from training with the narrowest meaning, so that a model reading the feature JSON knows exactly what kind of object it is handling, what it references, and how it is proven.

Evidence marks: **[V]** verified on the cited page on 2026-10-14; **[R]** recalled from memory, not confirmed on a primary page in this session.

---

## 1. State of the art

| Source | Names well | Ambiguous / confused by models |
|---|---|---|
| **ISO/IEC/IEEE 29148:2018** (replaces IEEE 830-1998) | Characteristics of a requirement: necessary, appropriate, unambiguous, complete, singular, feasible, verifiable, correct, conforming; attributes rationale, priority, trace to source/parent, verification method (test, demonstration, inspection, analysis) [V, secondary: [arXiv 2408.10886](https://arxiv.org/pdf/2408.10886), [Sparx](https://sparxsystems.com/enterprise_architect_user_guide/13.5/model_domains/characteristics_of_good_requirements.html)]. shall/should/may = binding/goal/permitted [R]. | Paywalled; models sometimes add "traceable" as a tenth characteristic. Stakeholder/system/software layering is useless for one feature. |
| **IEEE 830-1998** (legacy SRS) | "functional / non-functional requirement". | Models still emit document-shaped SRS section trees. |
| **RFC 2119 + 8174** (BCP 14) | MUST, SHALL, SHOULD, MAY…; meaning applies "only when they appear in all capitals" (RFC 8174, May 2017) [V, [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)]. | Lowercase "should" is read either way. MUST and SHALL are synonyms; using both invites invented nuance. |
| **User story + INVEST** (Wake 2003) | As a / I want / so that; Independent…Testable [R]. | A planning unit, not a behaviour. Models conflate story, requirement, task, ticket. |
| **Gherkin / BDD** | Feature, **Rule** ("one business rule", Gherkin 6), Example, Given/When/Then, Background, Scenario Outline + Examples, `@` tags [V, [Cucumber](https://cucumber.io/docs/gherkin/reference/)]; "`Scenario` is a synonym of the keyword `Example`" [V]. | Models skip `Rule`. "Examples" (table) vs "Example" (scenario). |
| **Acceptance criteria** | Rule-oriented checklist or example-oriented Given/When/Then [R]. | One word for both the rule and its examples. |
| **Definition of Done** (Scrum Guide 2020) | Quality gate for every increment [R]. | Mixed up with item-specific acceptance criteria. |
| **Use cases** (Cockburn 2000) | Actor, precondition, trigger, main success scenario, extensions, postcondition [R]. | "Scenario" again; "extension" read as plugin. Keep only *actor*. |
| **DDD** (Evans 2003) | Bounded context, ubiquitous language, aggregate, invariant [R]. | Aggregates over-applied. *Invariant* and *glossary* are worth keeping. |
| **C4 model** | System, container ("a runtime boundary around some code… or some data", "Not Docker!"), component, code; dynamic and deployment diagrams [V, [c4model.com](https://c4model.com/abstractions/container)]. | Container read as Docker; component collides with UI components. |
| **ADR** (Nygard, 2011-11-15) | Title, Status, Context, Decision, Consequences; proposed/accepted/superseded; numbers never reused [V, [Cognitect](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)]. | Univocal. |
| **Traceability** | Forward/backward trace, traceability matrix, coverage [R]. | "Coverage" read as code coverage. |
| **GitHub spec-kit** | `/speckit-constitution`, `-specify`, `-plan`, `-tasks`, `-implement` [V, [README](https://github.com/github/spec-kit)]; spec has "User Story N (Priority: P1)" with Given/When/Then "Acceptance Scenarios", `FR-001` "System MUST", Key Entities, `SC-001` Success Criteria, Assumptions, `[NEEDS CLARIFICATION]` [V, [spec-template.md](https://github.com/github/spec-kit/blob/main/templates/spec-template.md)]; tasks `T001 [P] [US1]` with file paths [V, [tasks-template.md](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md)]. | **SC = Success Criterion, not scenario.** Scenarios hang off stories, not FR ids: FR→test coverage is not computable. |
| **Kiro** (AWS) | `requirements.md` (or `bugfix.md`), `design.md`, `tasks.md` [V, [docs](https://kiro.dev/docs/specs/)]; EARS "WHEN [condition/event] THE SYSTEM SHALL [expected behavior]" [V, [feature specs](https://kiro.dev/docs/specs/feature-specs/)]; design = architecture, sequences, data models, interfaces, error handling, testing strategy [V]. | AC numbering `1.1` and task lines `_Requirements: 1.1_` are [R], not on fetched pages. Story and EARS criterion mixed in one list. |
| **OpenSpec** | `specs/` = current truth, `changes/<id>/` with proposal, design, tasks, `## ADDED Requirements`, `### Requirement:` with SHALL, `#### Scenario:` with WHEN/THEN, `/opsx:archive` [V, [README](https://github.com/Fission-AI/OpenSpec)]. | Best requirement→scenario binding, but identified by heading text, no stable id. |
| **BMAD** | Roles producing brief, PRD, architecture, epics, story files [R]; v6.12 stable, v7 alpha [V, [README](https://github.com/bmad-code-org/BMAD-METHOD)]. | Story file = task brief, not requirement. |

**Observations that drive the recommendation.**
1. Every kit converges on the same chain: requirement (SHALL/MUST) → criterion as Given/When/Then or WHEN/THEN → task → code. None makes the requirement → criterion → test link computable by stable ids end to end.
2. The prefixes models have seen most for this chain are `FR-001` (spec-kit), `REQ-` (generic RE tools) and `AC` (Agile). `SC` is already taken by spec-kit for Success Criterion.
3. The most overloaded words are *spec*, *story*, *scenario*, *task*, *design*, *component*, *criteria* (plural used as singular).

## 2. EARS as the requirement syntax

EARS was published in 2009 by Alistair Mavin and colleagues at Rolls-Royce [V, [alistairmavin.com/ears](https://alistairmavin.com/ears/)]. Clause order is fixed: preconditions, trigger, system name, response; zero or more preconditions, zero or one trigger, one or more responses [V].

| Pattern | Template [V] | spec-loop `pattern` value |
|---|---|---|
| Ubiquitous | The <system> shall <response> | `ubiquitous` |
| State-driven | **While** <precondition>, the <system> shall <response> | `state` |
| Event-driven | **When** <trigger>, the <system> shall <response> | `event` |
| Optional feature | **Where** <feature is included>, the <system> shall <response> | `optional` |
| Unwanted behaviour | **If** <trigger>, **then** the <system> shall <response> | `unwanted` |
| Complex | **While** … **when** … the <system> shall … | `complex` |

**Why it fits.** The keyword tells the agent what kind of test to write: `event` → act then assert; `state` → arrange the state, assert for every relevant action; `unwanted` → inject the fault; `optional` → configure the variant. The subject is always the system, which forbids user-centred phrasing ("the user can…") that hides what the code must do. Kiro adopted it as its requirement notation, so recent models have seen many examples [V].

**Limits.**
- Only behavioural requirements. Quality constraints (latency, accessibility, security) fit `ubiquitous` with a measurable response but lose the trigger information; data definitions do not fit at all. Those go to `constraints` or to the glossary.
- "Response" can carry several outcomes; 29148 asks each requirement to be singular. Rule: one EARS sentence, one observable response, otherwise split.
- EARS states the rule, not the data. It needs examples (criteria) to be testable with concrete values.
- Kiro's form drops "the <system>" for "THE SYSTEM" and capitalises keywords; the original uses lowercase "shall". spec-loop stores the pattern in a field and keeps the sentence in plain case, with SHALL capitalised under RFC 8174.

**Decision.** A requirement is one EARS sentence plus a `pattern` field. The Gherkin `Rule` is its Markdown rendering for the owner; the two are the same object.

## 3. Recommended vocabulary by level

JSON keys are English. Labels are the French rendering in the Markdown projection. A feature is identified by a kebab-case slug (`maket-http-connector`); every inner id is local to the feature and becomes global as `<feature>/<id>`.

### 3.1 Feature framing (`framing`, « Cadrage »)

| Key | Label | Definition | Id / cardinality | Why this word |
|---|---|---|---|---|
| `intent` | Intention | Problem and outcome wanted, one paragraph. | 1 | Not goal/objective/vision. |
| `actors` | Acteurs | Humans or systems interacting with the feature. | ≥1, `ACT-01` | Use-case term; "user" is one kind, "persona" is marketing. |
| `scope.in` / `.out` | Dans / hors périmètre | Explicit inclusions and exclusions. | ≥1 each | "Out" blocks silent assumptions. |
| `constraints` | Contraintes | Non-negotiable conditions on the solution. | `CON-01` | 29148 term; replaces "non-functional requirement". |
| `assumptions` | Hypothèses | Facts taken as true, can be invalidated. | `ASM-01` | Same word as spec-kit [V]. |
| `questions` | Questions ouvertes | Unresolved points, `open`/`answered`, with `about` refs. | `Q-01` | A countable object instead of inline markers. |
| `glossary` | Glossaire | Term, definition, forbidden synonyms. | 0..n | DDD ubiquitous language for this feature. |

### 3.2 Requirements (`requirements`, « Exigences »)

`requirement` — **REQ-001**. One EARS sentence stating one observable system response.
Fields: `pattern` (EARS), `statement`, `priority` (`MUST`/`SHOULD`/`MAY`), `rationale`, `source` (actor, constraint, question ids or a free reference), `invariant` (holds in every state).
Univocal: requirement + SHALL + id is the 29148 object, never a planning unit. `REQ` rather than `FR` because constraints are separate objects.

### 3.3 Acceptance criteria (`criteria`, « Critères d'acceptation »)

`criterion` — **AC-001.2** (second criterion of REQ-001; the number embeds the parent, so an agent reading a test name knows the requirement without a lookup).
Fields: `requirement` (REQ id, exactly one, redundant with the id prefix and checked), `title`, `given[]`, `when` (exactly one action), `then[]` (observable outcomes), optional `examples` table (Scenario Outline values).
One concrete example, with values, showing the requirement satisfied or violated. A single `when` forces one behaviour per criterion. Rendered as Gherkin `Example:` under `Rule:`.

### 3.4 Anchoring in code (`anchors`, « Ancrage »)

`anchor` — **ANC-01**. A stable pointer to the place in the code that realises one or more requirements.
Fields: `kind` (`module` | `symbol` | `interface` | `schema` | `route` | `config`), `path` (repo-relative file or directory), `symbol` (qualified name, e.g. `ConnectorClient.fetchPage`, optional for `module`), `change` (`add` | `modify` | `remove`), `realizes[]` (REQ ids), `note`.
Univocal: path + symbol is what LSP and code search resolve; "anchor" means pointer, unlike "component" (C4 or UI) or "design" (everything).

### 3.5 Verification (`verification`, « Vérification »)

`test` — identified by `file` + `name` (the traceability key; no invented id).
Fields: `file`, `name` (must contain every AC id it verifies), `framework` (`vitest` | `pytest` | `junit` | `playwright` | …), `level` (`unit` | `integration` | `e2e`), `verifies[]` (AC ids, ≥1), `status` (`missing` | `failing` | `passing`, written by the verifier, not by hand), `method` (`test` default; `inspection` | `demonstration` | `analysis` from 29148 for criteria that cannot be automated).
A test is identified exactly as the runner reports it.

### 3.6 Decisions (`decisions`, « Décisions »)

`decision` — **DEC-01**, Nygard shape: `title`, `status` (`proposed` | `accepted` | `superseded`), `context`, `decision`, `consequences`, `alternatives[]` (MADR), `affects[]` (REQ or ANC ids), `supersededBy`. Prefix `DEC`, not `ADR`, because it is a section of a feature file; a decision that outlives the feature is promoted to the repository's ADR folder and referenced by path.

### 3.7 Visual artifacts (`visuals`, « Visuels »)

`visual` — **VIS-01**. `kind` (`wireframe` | `sequence` | `state` | `c4-context` | `c4-container` | `c4-component` | `flow` | `er`), `format` (`mermaid` | `svg` | `png` | `url`), `source` (inline Mermaid text, or path/URL), `illustrates[]` (REQ, AC or ANC ids). Mermaid preferred: text diff, fluent in models.

### 3.8 Status and phase

`phase` on the feature: `framing` → `requirements` → `acceptance` → `anchoring` → `verification` → `done`. Each phase requires the sections of the previous ones (cumulative) and its own. Individual objects carry `status` only where the life cycle is real (`question`, `decision`, `test`). `done` means every coverage rule in §4 holds and every MUST criterion has a passing test.

### 3.9 Words to avoid

| Avoid | Because | Use |
|---|---|---|
| *spec* (noun) | Means the whole file, a requirement, a test file (`*.spec.ts`), or OpenAPI. | `feature` (the file), `requirement`, `test` |
| *story* / *user story* / *epic* | Planning units that bundle several requirements; INVEST is about estimation, not truth. | `requirement`; `intent` for the "so that" |
| *task* / *ticket* | Units of work, not of behaviour; spec-loop has no task list in the model (the agent plans its own work). | `anchor` with `change` |
| *scenario* | Gherkin example, use-case flow, test-plan item; and spec-kit `SC` = success criterion. | `criterion`; Gherkin rendering uses `Example:` |
| *criteria* as singular | Plural only; models then emit lists in one object. | `criterion` / `criteria[]` |
| *design* | Covers architecture choices, UI mock-ups and code layout at once. | `anchors`, `decisions`, `visuals` |
| *component* | C4 component vs React component. | `anchor.kind` |
| *non-functional requirement* | Models treat it as secondary. | `constraint` |
| *should* in lowercase | Ambiguous under RFC 8174. | `priority: SHOULD` field; statements use SHALL |
| *acceptance test* | Collides with UAT and with the criterion. | `test` with `level` |

## 4. Reference model and coverage

References always point **from the more concrete object to the more abstract one** (child → parent), so that adding a test never edits a requirement:

```
actor, constraint, question ◄── source ── requirement (REQ-001)
requirement ◄── requirement ── criterion (AC-001.2)
requirement ◄── realizes ── anchor (ANC-01)
criterion   ◄── verifies ── test (file + name)
requirement, anchor ◄── affects ── decision (DEC-01)
requirement, criterion, anchor ◄── illustrates ── visual (VIS-01)
```

Cross-feature references use `<feature>/<id>` (e.g. `auth-session/REQ-003`) in `source` or `affects`.

**Coverage rules (computable from the JSON plus a test scan).**
1. From `acceptance` on: every requirement has ≥1 criterion; every criterion id prefix matches an existing requirement.
2. From `anchoring` on: every MUST requirement is realised by ≥1 anchor; every anchor's `path` exists (or `change: add`).
3. From `verification` on: every criterion is verified by ≥1 test; every test's `name` contains each AC id listed in `verifies`; the file exists and the runner reports a test with that name.
4. Reverse check: any test name in the repo that contains `AC-\d{3}\.\d+` must be declared in some feature, so orphans are visible.
5. `done`: rules 1-3 hold and every test verifying a MUST criterion is `passing`.

**How a criterion is identified in code and tests.** The canonical carrier is the **AC id at the start of the test name**, because every runner reports names and an agent can grep them; tags are a secondary, framework-specific index.

| Framework | Canonical (name) | Optional tag | Notes |
|---|---|---|---|
| vitest | `test('AC-001.2 rejects an expired token', …)` | `{ tags: ['ac'] }` | Tags exist since Vitest 4.1, must be declared in `test.tags` config, filter with `--tags-filter` [V, [vitest.dev](https://vitest.dev/guide/test-tags)]. Declaring one tag per AC is impractical, hence the name. |
| Playwright | `test('AC-001.2 rejects …', { tag: '@AC-001.2' }, …)` | `@AC-001.2` | Tags start with `@`, may be in title or `tag` option; `--grep @AC-001.2`; annotations `{type, description}` can hold the REQ id [V, [playwright.dev](https://playwright.dev/docs/test-annotations)]. |
| pytest | `def test_ac_001_2_rejects_expired_token():` | `@pytest.mark.ac("AC-001.2")` | Function names cannot contain `-` or `.`: the scanner normalises `ac_001_2` ↔ `AC-001.2`. Register the `ac` marker and use `--strict-markers` [R]. |
| JUnit 5 | `@DisplayName("AC-001.2 rejects an expired token")` | `@Tag("AC-001.2")` | Tags must not contain whitespace, ISO control characters or `, ( ) & \| !` [R]; `-` and `.` are allowed. Method name normalised like pytest. |
| Gherkin | `Example: AC-001.2 rejects an expired token` | `@AC-001.2` above the Example, `@REQ-001` above the Rule | Tags are native [V]. |

In production code, an anchor is found by `path` + `symbol`; no requirement ids in comments (they rot and duplicate the JSON). The only id that appears in source is the AC id in test names.

## 5. Schema skeleton

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spec-loop.local/schema/feature.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "phase", "framing"],
  "properties": {
    "id":    { "$ref": "#/$defs/featureId" },
    "title": { "type": "string", "minLength": 1 },
    "phase": { "enum": ["framing", "requirements", "acceptance", "anchoring", "verification", "done"] },
    "framing":      { "$ref": "#/$defs/framing" },
    "requirements": { "type": "array", "items": { "$ref": "#/$defs/requirement" } },
    "criteria":     { "type": "array", "items": { "$ref": "#/$defs/criterion" } },
    "anchors":      { "type": "array", "items": { "$ref": "#/$defs/anchor" } },
    "tests":        { "type": "array", "items": { "$ref": "#/$defs/test" } },
    "decisions":    { "type": "array", "items": { "$ref": "#/$defs/decision" } },
    "visuals":      { "type": "array", "items": { "$ref": "#/$defs/visual" } }
  },
  "allOf": [
    { "if": { "properties": { "phase": { "const": "framing" } } },
      "then": { "properties": { "requirements": false, "criteria": false, "anchors": false, "tests": false } } },
    { "if": { "properties": { "phase": { "enum": ["requirements", "acceptance", "anchoring", "verification", "done"] } } },
      "then": { "required": ["requirements"], "properties": { "requirements": { "minItems": 1 } } } },
    { "if": { "properties": { "phase": { "enum": ["acceptance", "anchoring", "verification", "done"] } } },
      "then": { "required": ["criteria"], "properties": { "criteria": { "minItems": 1 } } } },
    { "if": { "properties": { "phase": { "enum": ["anchoring", "verification", "done"] } } },
      "then": { "required": ["anchors"], "properties": { "anchors": { "minItems": 1 } } } },
    { "if": { "properties": { "phase": { "enum": ["verification", "done"] } } },
      "then": { "required": ["tests"], "properties": { "tests": { "minItems": 1 } } } }
  ],
  "$defs": {
    "featureId": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "reqId":  { "type": "string", "pattern": "^REQ-\\d{3}$" },
    "acId":   { "type": "string", "pattern": "^AC-\\d{3}\\.\\d+$" },
    "ancId":  { "type": "string", "pattern": "^ANC-\\d{2,3}$" },
    "decId":  { "type": "string", "pattern": "^DEC-\\d{2,3}$" },
    "visId":  { "type": "string", "pattern": "^VIS-\\d{2,3}$" },
    "anyRef": { "type": "string",
      "pattern": "^([a-z0-9]+(-[a-z0-9]+)*/)?(REQ-\\d{3}|AC-\\d{3}\\.\\d+|ANC-\\d{2,3}|DEC-\\d{2,3}|ACT-\\d{2}|CON-\\d{2}|ASM-\\d{2}|Q-\\d{2})$" },
    "framing": {
      "type": "object", "additionalProperties": false,
      "required": ["intent", "actors", "scope"],
      "properties": {
        "intent": { "type": "string", "minLength": 1 },
        "actors": { "type": "array", "minItems": 1, "items": { "type": "object",
          "required": ["id", "name"], "properties": { "id": { "pattern": "^ACT-\\d{2}$" }, "name": { "type": "string" }, "description": { "type": "string" } } } },
        "scope": { "type": "object", "required": ["in", "out"],
          "properties": { "in": { "type": "array", "items": { "type": "string" } }, "out": { "type": "array", "items": { "type": "string" } } } },
        "constraints": { "type": "array", "items": { "type": "object", "required": ["id", "statement"],
          "properties": { "id": { "pattern": "^CON-\\d{2}$" }, "statement": { "type": "string" } } } },
        "assumptions": { "type": "array", "items": { "type": "object", "required": ["id", "statement"],
          "properties": { "id": { "pattern": "^ASM-\\d{2}$" }, "statement": { "type": "string" } } } },
        "questions": { "type": "array", "items": { "type": "object", "required": ["id", "question", "status"],
          "properties": { "id": { "pattern": "^Q-\\d{2}$" }, "question": { "type": "string" },
            "status": { "enum": ["open", "answered"] }, "answer": { "type": "string" },
            "about": { "type": "array", "items": { "$ref": "#/$defs/anyRef" } } } } },
        "glossary": { "type": "array", "items": { "type": "object", "required": ["term", "definition"],
          "properties": { "term": { "type": "string" }, "definition": { "type": "string" },
            "avoid": { "type": "array", "items": { "type": "string" } } } } }
      }
    },
    "requirement": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "pattern", "statement", "priority", "rationale"],
      "properties": {
        "id": { "$ref": "#/$defs/reqId" },
        "pattern": { "enum": ["ubiquitous", "event", "state", "unwanted", "optional", "complex"] },
        "statement": { "type": "string", "pattern": "\\bSHALL\\b" },
        "priority": { "enum": ["MUST", "SHOULD", "MAY"] },
        "rationale": { "type": "string" },
        "invariant": { "type": "boolean" },
        "source": { "type": "array", "items": { "anyOf": [ { "$ref": "#/$defs/anyRef" }, { "type": "string" } ] } }
      }
    },
    "criterion": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "requirement", "title", "given", "when", "then"],
      "properties": {
        "id": { "$ref": "#/$defs/acId" },
        "requirement": { "$ref": "#/$defs/reqId" },
        "title": { "type": "string" },
        "given": { "type": "array", "items": { "type": "string" } },
        "when": { "type": "string" },
        "then": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "examples": { "type": "array", "items": { "type": "object" } }
      }
    },
    "anchor": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "kind", "path", "change", "realizes"],
      "properties": {
        "id": { "$ref": "#/$defs/ancId" },
        "kind": { "enum": ["module", "symbol", "interface", "schema", "route", "config"] },
        "path": { "type": "string" }, "symbol": { "type": "string" },
        "change": { "enum": ["add", "modify", "remove"] },
        "realizes": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/reqId" } },
        "note": { "type": "string" }
      }
    },
    "test": {
      "type": "object", "additionalProperties": false,
      "required": ["file", "name", "framework", "verifies"],
      "properties": {
        "file": { "type": "string" }, "name": { "type": "string", "pattern": "AC-\\d{3}\\.\\d+|ac_\\d{3}_\\d+" },
        "framework": { "enum": ["vitest", "playwright", "pytest", "junit", "cucumber", "other"] },
        "level": { "enum": ["unit", "integration", "e2e"] },
        "method": { "enum": ["test", "inspection", "demonstration", "analysis"] },
        "verifies": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/acId" } },
        "status": { "enum": ["missing", "failing", "passing"] }
      }
    },
    "decision": {
      "type": "object", "required": ["id", "title", "status", "context", "decision", "consequences", "affects"],
      "properties": {
        "id": { "$ref": "#/$defs/decId" }, "title": { "type": "string" },
        "status": { "enum": ["proposed", "accepted", "superseded"] },
        "context": { "type": "string" }, "decision": { "type": "string" }, "consequences": { "type": "string" },
        "alternatives": { "type": "array", "items": { "type": "string" } },
        "affects": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/anyRef" } },
        "supersededBy": { "$ref": "#/$defs/decId" }
      }
    },
    "visual": {
      "type": "object", "required": ["id", "kind", "format", "source", "illustrates"],
      "properties": {
        "id": { "$ref": "#/$defs/visId" },
        "kind": { "enum": ["wireframe", "sequence", "state", "flow", "er", "c4-context", "c4-container", "c4-component"] },
        "format": { "enum": ["mermaid", "svg", "png", "url"] }, "source": { "type": "string" },
        "illustrates": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/anyRef" } }
      }
    }
  }
}
```

JSON Schema cannot check that an `AC-001.2` prefix matches its `requirement`, that referenced ids exist, or rules 3-5 of §4: those belong to the verifier skill, not to the schema.

Note on the current repository: `schema/feature.schema.json` uses French phase and section keys (`cadrage`, `exigences`, `acceptation`, `ancrage`). This research recommends English keys with French labels only in the Markdown projection, so that the keys match the vocabulary models were trained on.

## 6. Glossary (terms the skills and templates must use)

| Term (JSON) | French label | Id | Meaning in spec-loop |
|---|---|---|---|
| feature | Fonctionnalité | slug | One JSON file, one user-visible behaviour set |
| phase | Phase | enum | framing, requirements, acceptance, anchoring, verification, done |
| intent | Intention | — | Problem and wanted outcome, one paragraph |
| actor | Acteur | ACT-01 | Human or system interacting with the feature |
| scope (in/out) | Périmètre | — | Explicit inclusions and exclusions |
| constraint | Contrainte | CON-01 | Non-negotiable condition on the solution |
| assumption | Hypothèse | ASM-01 | Fact taken as true, can be invalidated |
| question | Question ouverte | Q-01 | Unresolved point, open or answered |
| glossary term | Terme du glossaire | — | Domain word with definition and forbidden synonyms |
| requirement | Exigence | REQ-001 | One EARS sentence, one observable system response |
| EARS pattern | Forme EARS | enum | ubiquitous, event, state, unwanted, optional, complex |
| priority | Priorité | enum | MUST, SHOULD, MAY (RFC 2119/8174) |
| facet | Facette | enum | Side of the system a requirement fixes: interface, behaviour, data, integration, security |
| rationale | Justification | — | Why the requirement exists |
| source | Origine | refs | Where the requirement comes from |
| invariant | Invariant | flag | Requirement holding in every state |
| criterion | Critère d'acceptation | AC-001.2 | One Given/When/Then example of one requirement |
| anchor | Ancre | ANC-01 | path + symbol realising requirements |
| test | Test | file + name | Executable check whose name carries the AC id |
| verifies | Vérifie | AC refs | Link test → criterion |
| realizes | Réalise | REQ refs | Link anchor → requirement |
| decision | Décision | DEC-01 | Nygard-style record bound to what it affects |
| visual | Visuel | VIS-01 | Wireframe or diagram bound to what it illustrates |
| coverage | Couverture | — | Requirement → criterion → test completeness, never code coverage |

## Sources

- EARS: https://alistairmavin.com/ears/ (fetched 2026-10-14)
- Kiro specs: https://kiro.dev/docs/specs/ , https://kiro.dev/docs/specs/feature-specs/ , https://kiro.dev/docs/specs/feature-specs/requirements-first/
- GitHub spec-kit: https://github.com/github/spec-kit , templates `spec-template.md`, `tasks-template.md` on `main`
- OpenSpec: https://github.com/Fission-AI/OpenSpec
- BMAD Method: https://github.com/bmad-code-org/BMAD-METHOD (v6.12 stable, v7 alpha)
- Gherkin reference: https://cucumber.io/docs/gherkin/reference/
- RFC 2119 / RFC 8174 (May 2017): https://www.rfc-editor.org/rfc/rfc8174
- ISO/IEC/IEEE 29148:2018 characteristics via https://arxiv.org/pdf/2408.10886 and Sparx Systems guide (standard text not consulted)
- C4 model: https://c4model.com/ , https://c4model.com/abstractions/container
- ADR: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- Vitest test tags (4.1+): https://vitest.dev/guide/test-tags
- Playwright tags and annotations: https://playwright.dev/docs/test-annotations
- Recalled, not verified this session: IEEE 830 supersession, INVEST, Scrum Guide DoD, Cockburn use-case fields, DDD terms, MADR, Kiro `_Requirements:` lines and AC numbering, OpenSpec MODIFIED/REMOVED, JUnit tag character rules, pytest marker registration.
