# Sonde de rendu pour l'aperçu Markdown de VS Code

Ouvrez ce fichier en aperçu (Ctrl+Maj+V, ou Cmd+Maj+V sur Mac) et notez, pour chaque section, si elle se rend comme décrit.

## 1. Callouts GitHub

> [!NOTE]
> Une note : si vous voyez un encadré avec une icône et le mot « Note », les callouts sont rendus.

> [!WARNING]
> Un avertissement : même test, en couleur d'alerte.

> [!IMPORTANT]
> Un point important.

Sinon, les trois blocs ci-dessus apparaissent comme des citations ordinaires commençant par `[!NOTE]`.

## 2. Section repliable

<details>
<summary>Cliquez pour déplier : cinq questions tranchées</summary>

Si ce texte est caché derrière un titre cliquable, les sections repliables sont rendues.

</details>

## 3. Cases à cocher

- [x] Question Q-01 répondue
- [ ] Question Q-06 ouverte

Si vous voyez des cases, cochée et vide, les listes de tâches sont rendues. Sinon vous voyez `[x]` et `[ ]` en texte.

## 4. Tableau

| Exigence | Priorité | Forme |
| --- | --- | --- |
| REQ-001 | MUST | permanente |
| REQ-002 | SHOULD | sur événement |

## 5. Texte barré, code, citation

Un mot ~~barré~~, un `identifiant`, et une citation :

> La révision connue protège contre la perte de mise à jour.

## 6. Note de bas de page

Une affirmation avec sa source[^1].

[^1]: Si ce renvoi est cliquable et la note apparaît en bas, les notes de bas de page sont rendues.

## 7. HTML en ligne

Texte <span style="color:red;font-weight:bold">rouge et gras par style HTML</span>, et un <mark>surlignage</mark>, et un <kbd>Ctrl</kbd>.

Si le texte n'est ni rouge ni gras, les styles HTML sont retirés. Si le surlignage et la touche s'affichent, ces balises passent.

## 8. Mermaid avec couleurs et formes

```mermaid
flowchart LR
  a["Cadrage"] --> b[["Exigences ◀ actuelle"]] -.-> c["Acceptation"]
  classDef now fill:#2563eb,stroke:#1e40af,color:#ffffff
  class b now
```

Trois cas possibles : le nœud « Exigences » est bleu (les couleurs classDef passent), ou il a la forme à double bord sans couleur (seule la forme passe), ou le bloc apparaît en texte (Mermaid non rendu).

## 9. Mermaid : séquence et états

```mermaid
stateDiagram-v2
  [*] --> Ouverte
  Ouverte --> Répondue : réponse du PO
  Répondue --> [*]
```

## 10. Emoji et symboles

Symboles Unicode : ✔ ✖ ▶ ◀ ⚠ ● ○ — et un emoji par code `:warning:` (rendu seulement si les codes emoji sont interprétés).

## 11. Image SVG locale

![Diagramme de contexte](../spec/FEAT-001-maket-http-connector/assets/absent.svg)

Une image cassée ici est normale : le fichier n'existe pas. Ce test ne sert qu'à voir si une image locale par chemin relatif est tentée.
