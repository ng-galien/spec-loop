<!-- source: "" template: "templates/index.hbs" -->

<!-- ptr: /title -->
# Connecteur HTTP pour les espaces structurés de Maket

Fonctionnalité `FEAT-001`. Phase actuelle : **Cadrage**.

<!-- ptr: /phase -->
```mermaid
flowchart LR
  framing["Cadrage"]:::now
  requirements["Exigences"]:::next
  acceptance["Acceptation"]:::next
  anchoring["Ancrage"]:::next
  verification["Vérification"]:::next
  done["Terminé"]:::next
  framing --> requirements --> acceptance --> anchoring --> verification --> done
  classDef past fill:#e2e8f0,stroke:#475569,color:#0f172a
  classDef now fill:#2563eb,stroke:#1e40af,color:#ffffff
  classDef next fill:#ffffff,stroke:#94a3b8,color:#64748b,stroke-dasharray:4 3
```

## Documents

- [Cadrage](cadrage.md) : intention, acteurs, périmètre, contraintes, hypothèses, questions, glossaire

## Artefacts

- ART-01 : Contexte du connecteur HTTP (contexte, mermaid), dans [cadrage.md](cadrage.md)

## Reste à faire pour la phase « Cadrage »

- Question Q-01 à répondre : `/framing/questions/0/status`
- Question Q-02 à répondre : `/framing/questions/1/status`
- Question Q-03 à répondre : `/framing/questions/2/status`
- Question Q-04 à répondre : `/framing/questions/3/status`
- Question Q-05 à répondre : `/framing/questions/4/status`

<!-- ptr: /lifecycle -->
## Historique

- 2026-10-14 : phase « Cadrage », décidée par l'agent

## Comment intervenir

Lisez les documents. Répondez dans la conversation, ou modifiez directement ces fichiers puis demandez à l'agent de vérifier vos modifications. Les commentaires `<!-- id: … -->` et `<!-- ptr: … -->` repèrent chaque bloc ; un schéma SVG se modifie dans son fichier sous `assets/` : laissez-les en place ; pour ajouter un bloc, recopiez la forme d'un bloc voisin.
