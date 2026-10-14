<!-- source: "" template: "templates/index.hbs" -->

<!-- ptr: /title -->
# Connecteur HTTP pour les espaces structurés de Maket

Fonctionnalité `FEAT-001`. Phase actuelle : **Exigences**.

<!-- ptr: /phase -->
```mermaid
flowchart LR
  framing["Cadrage"]:::past
  requirements["Exigences"]:::now
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
- [Exigences](exigences.md) : une phrase EARS par exigence, avec sa priorité

## Artefacts

- ART-01 : Contexte du connecteur HTTP (contexte, mermaid), dans [cadrage.md](cadrage.md)
- ART-02 : Écriture d'un élément : révision, conflit et lecture seule (séquence, mermaid), dans [cadrage.md](cadrage.md)

## Reste à faire pour la phase « Exigences »

Rien : la phase est complète. Le passage à la phase suivante se décide dans la conversation.

<!-- ptr: /lifecycle -->
## Historique

- 2026-10-14 : phase « Cadrage », décidée par l'agent
- 2026-10-14 : phase « Exigences », décidée par le propriétaire
- 2026-10-14 : dernière vérification de vos modifications, 3 appliquée(s), 0 signalée(s)

## Comment intervenir

Lisez les documents. Répondez dans la conversation, ou modifiez directement ces fichiers puis demandez à l'agent de vérifier vos modifications. Les commentaires `<!-- id: … -->` et `<!-- ptr: … -->` repèrent chaque bloc : laissez-les en place ; pour ajouter un bloc, recopiez la forme d'un bloc voisin. Un écran SVG se modifie dans son fichier, sous `assets/`.
