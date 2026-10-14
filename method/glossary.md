# Glossary

These 24 terms are the only words to use for the objects of a feature, in the JSON, in what you write to the owner and in your reasoning.

| Term (JSON) | French label | Id | Meaning |
| --- | --- | --- | --- |
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
| anchor | Ancre | ANC-01 | path + symbol realizing requirements |
| test | Test | file + name | Executable check whose name carries the AC id |
| verifies | Vérifie | AC refs | Link test → criterion |
| realizes | Réalise | REQ refs | Link anchor → requirement |
| decision | Décision | DEC-01 | Nygard-style record bound to what it affects |
| artifact | Artefact | ART-01 | Diagram or screen bound to the requirements or criteria it illustrates |
| coverage | Couverture | — | Requirement → criterion → test completeness, never code coverage |

Terms of the loop itself (how the model and the documents interact, not objects of a feature):

| Term | Meaning |
| --- | --- |
| projection | The rendered Markdown documents of a feature, generated from `feature.json` by the templates; never the source of truth |
| alteration | Any difference between the disk and what the MCP last wrote: a rendered file changed, missing or added, an svg changed, `feature.json` edited by hand |
| owner edit | An alteration made by the owner on purpose, usually in a rendered document, to be reconciled |
| hunk | One contiguous changed region of a rendered file, as `diff` reports it, mapped to an id and a JSON pointer |
| pending item | An alteration or hunk not yet accounted for by `reconcile`; while one exists, writes and phase moves are refused |
| reconcile | The tool and skill that bring owner edits back into the model: apply the coherent ones, report the others as open questions |

Words to avoid, with the term to use instead:

| Avoid | Use |
| --- | --- |
| "spec" as a noun | feature, requirement, test |
| story, user story, epic | requirement; intent for the "so that" |
| task, ticket | anchor with its `change` |
| scenario | criterion; rendered as a Gherkin `Exemple` |
| "criteria" as a singular | criterion; `criteria[]` is the list |
| design | anchors, decisions, artifacts |
| component | `anchor.kind` |
| non-functional requirement | constraint |
| lowercase "should" | `priority: SHOULD`; statements use SHALL |
| acceptance test | test, with its `level` |

A feature may add its own domain terms in `framing.glossary`, each with the synonyms to avoid.
