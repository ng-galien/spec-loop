<!-- source: "/framing" template: "templates/framing.hbs" -->

# Cadrage : Connecteur HTTP pour les espaces structurés de Maket

<!-- ptr: /framing/intent -->
## Intention

Maket est un outil de documents visuels pour agents IA. Ses espaces de travail structurés listent des éléments venus d'une source de données, derrière l'interface ItemSource : liste par curseur, recherche, lecture, création, écriture, suppression, identité déclarée dans le schéma, révision pour détecter les conflits. Aujourd'hui, brancher une API REST demande du code propre à cette API. Le résultat voulu : un connecteur HTTP qui implémente ItemSource au-dessus d'une API REST décrite par configuration, pour qu'un espace de travail lise et écrive les éléments de cette API.

<!-- id: ART-01 -->
**Contexte du connecteur HTTP** (`ART-01`, contexte)

```mermaid
flowchart LR
  owner["Le propriétaire (ACT-01)"] -- configure --> config["Configuration de l'espace : URL, variable d'environnement, mappage"]
  agent["L'agent (ACT-02)"] -- outils MCP --> maket["Maket : espace de travail structuré"]
  maket -- ItemSource --> connector["Connecteur HTTP"]
  config --> connector
  connector -- "GET liste et lecture, PUT avec If-Match" --> api["L'API externe (ACT-03)"]
  api -- "JSON, ETag, 412" --> connector
```

<!-- ptr: /framing/actors -->
## Acteurs

<!-- id: ACT-01 -->
### Le propriétaire (`ACT-01`)

Choisit les API à brancher, fournit l'URL de base et le nom de la variable d'environnement qui porte le secret, lit les espaces de travail qui en résultent.

<!-- id: ACT-02 -->
### L'agent qui compose les espaces de travail (`ACT-02`)

Déclare un espace structuré branché sur le connecteur, puis liste, cherche, lit et modifie les éléments par les outils MCP de Maket.

<!-- id: ACT-03 -->
### L'API externe (`ACT-03`)

Service REST tiers qui détient les éléments. Elle fait foi sur leur contenu et sur leur révision.

## Périmètre

<!-- ptr: /framing/scope/in -->
### Dans le périmètre

- <!-- ptr: /framing/scope/in/0 --> Lister les éléments par curseur, avec les paramètres de pagination et de recherche propres à l'API.
- <!-- ptr: /framing/scope/in/1 --> Lire un élément par son identité.
- <!-- ptr: /framing/scope/in/2 --> Écrire un élément par PUT avec l'en-tête If-Match portant la révision connue ; une réponse 412 est rendue à l'agent comme une révision périmée.
- <!-- ptr: /framing/scope/in/3 --> Identité et révision des éléments déclarées dans le schéma de l'espace : champ d'identité, source de la révision (ETag ou champ de la réponse).
- <!-- ptr: /framing/scope/in/4 --> Authentification par un secret lu dans une variable d'environnement dont seul le nom figure dans la configuration.
- <!-- ptr: /framing/scope/in/5 --> Espace en lecture seule quand l'API n'offre pas d'écriture : le connecteur refuse alors toute écriture.
- <!-- ptr: /framing/scope/in/6 --> En option, détection des changements faits hors de Maket, par webhook ou par interrogation périodique.

<!-- ptr: /framing/scope/out -->
### Hors périmètre

- <!-- ptr: /framing/scope/out/0 --> Authentification OAuth interactive et rafraîchissement de jetons.
- <!-- ptr: /framing/scope/out/1 --> API qui ne sont pas REST : GraphQL, SOAP, gRPC.
- <!-- ptr: /framing/scope/out/2 --> Transformation métier des données au-delà du mappage déclaratif des champs.
- <!-- ptr: /framing/scope/out/3 --> Fusion automatique des conflits : un conflit est signalé à l'agent, jamais résolu à sa place.

<!-- ptr: /framing/constraints -->
## Contraintes

- <!-- id: CON-01 --> **CON-01** : Le connecteur implémente l'interface ItemSource existante sans la modifier.
- <!-- id: CON-02 --> **CON-02** : Aucun secret n'est écrit dans le schéma, la configuration ou les documents : seulement le nom de la variable d'environnement.
- <!-- id: CON-03 --> **CON-03** : Une écriture sans révision connue est refusée : aucun écrasement à l'aveugle.
- <!-- id: CON-04 --> **CON-04** : Une erreur HTTP est rendue à l'agent avec son statut et le message de l'API ; une écriture n'est jamais réessayée en silence.

<!-- ptr: /framing/assumptions -->
## Hypothèses

- <!-- id: ASM-01 --> **ASM-01** : Les API visées renvoient du JSON et exposent une identité stable par élément.
- <!-- id: ASM-02 --> **ASM-02** : L'interface ItemSource de Maket couvre déjà curseur, recherche et révision, de sorte que le connecteur n'a rien à lui ajouter.

<!-- ptr: /framing/questions -->
## Questions ouvertes

<!-- id: Q-01 -->
### Q-01 : La création (POST) et la suppression (DELETE) font-elles partie de la première version ?

Statut : **ouverte**. Concerne : CON-01.

Recommandation : Oui : POST avec l'identité renvoyée par l'API, DELETE avec If-Match. Elles complètent ItemSource et coûtent peu une fois PUT en place.

<!-- id: Q-02 -->
### Q-02 : Comment déclare-t-on le passage de la réponse JSON de l'API aux champs de l'élément ?

Statut : **ouverte**.

Recommandation : Par des pointeurs JSON dans le schéma de l'espace : chemin de la liste, du curseur suivant, de l'identité, de la révision. Pas de langage de transformation.

<!-- id: Q-03 -->
### Q-03 : Pour suivre les changements faits hors de Maket, commence-t-on par le webhook ou par l'interrogation périodique ?

Statut : **ouverte**.

Recommandation : L'interrogation périodique d'abord : elle n'exige pas que Maket soit joignable depuis l'extérieur. Le webhook vient ensuite.

<!-- id: Q-04 -->
### Q-04 : Quelles formes de pagination le connecteur accepte-t-il : curseur opaque, numéro de page, en-tête Link ?

Statut : **ouverte**. Concerne : ASM-02.

Recommandation : Curseur opaque et en-tête Link. Un numéro de page est converti en curseur par le connecteur.

<!-- id: Q-05 -->
### Q-05 : Si l'API ne renvoie ni ETag ni champ de révision, l'écriture reste-t-elle permise ?

Statut : **ouverte**. Concerne : CON-03.

Recommandation : Non : l'espace passe en lecture seule.

<!-- ptr: /framing/glossary -->
## Glossaire

- <!-- ptr: /framing/glossary/0 --> **élément** : Une entrée d'un espace de travail structuré, lue ou écrite par ItemSource. À éviter : enregistrement, ligne.
- <!-- ptr: /framing/glossary/1 --> **révision** : Valeur fournie par l'API qui change à chaque modification d'un élément ; elle sert à détecter une écriture concurrente. À éviter : version.
- <!-- ptr: /framing/glossary/2 --> **connecteur HTTP** : L'implémentation d'ItemSource qui parle à une API REST décrite par configuration. À éviter : plugin, adaptateur.
