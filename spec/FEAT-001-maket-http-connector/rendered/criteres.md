<!-- source: "/criteria" template: "templates/criteria.hbs" -->

<!-- nav -->
[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Acceptation

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · **Acceptation** · [Ancrage](ancrage.md) · [Vérification](verification.md) · Décisions

---
<!-- /nav -->

_Document de la phase Acceptation, close ; la phase actuelle est Vérification : [verification.md](verification.md)._

# Critères d'acceptation : Connecteur HTTP pour les espaces structurés de Maket

Chaque exigence devient une règle ; chaque critère est un exemple de cette règle.

<!-- id: REQ-001 -->
## Règle REQ-001 · Interface ItemSource sur REST

_The connector SHALL implement the ItemSource interface of Maket (list, get, create, put, delete, refresh) over a REST API described by the workspace configuration._

<!-- id: AC-001.1 -->
### Exemple AC-001.1 : Un espace branché sur une API de test

- **Soit** Une API REST de test avec 3 clients sous /items
- **Quand** l'agent crée un espace structuré dont la source est le connecteur HTTP de cette API
- **Alors** les 3 clients apparaissent dans l'index de l'espace,
- **Et** la vue MCP de l'espace renvoie un lot de 3 éléments avec leur identité et leur révision

<!-- id: REQ-002 -->
## Règle REQ-002 · Configuration de l’espace

_The connector SHALL read the base URL, the environment variable name holding the secret, and the JSON Pointer mapping (list path, next cursor path, identity path, revision path) from the workspace configuration._

<!-- id: AC-002.1 -->
### Exemple AC-002.1 : Lecture de la configuration

- **Soit** Une définition d'espace avec baseUrl https://api.exemple.fr/v1, secretEnv CRM_TOKEN, les pointeurs /data pour la liste, /next pour le curseur, /id pour l'identité, /etag pour la révision
- **Quand** le connecteur démarre
- **Alors** il lit ces cinq valeurs sans en inventer d'autre
- **Et** une définition sans le pointeur d'identité est refusée par la vérification de l'espace avec le nom du champ manquant

<!-- id: REQ-003 -->
## Règle REQ-003 · Secret par variable d’environnement

_The connector SHALL send the secret read from the configured environment variable in every request, and SHALL never write the secret into the configuration or the workspace._

<!-- id: AC-003.1 -->
### Exemple AC-003.1 : Le secret part, jamais écrit

- **Soit** La variable d'environnement CRM_TOKEN vaut s3cret et la définition ne contient que son nom
- **Quand** le connecteur appelle l'API
- **Alors** chaque requête porte l'en-tête Authorization avec s3cret
- **Et** ni la définition, ni l'espace, ni les journaux ne contiennent la chaîne s3cret

<!-- id: REQ-004 -->
## Règle REQ-004 · Liste par curseur

_When the workspace asks for a batch of items, the connector SHALL call the list endpoint with the cursor and search parameters of the API and SHALL return items, the next opaque cursor and the total when the API gives one; a batch never exceeds 500 items._

<!-- id: AC-004.1 -->
### Exemple AC-004.1 : Un lot avec curseur et total

- **Soit** Une API qui pagine par curseur avec 120 éléments et un total
- **Quand** l'espace demande un premier lot de 50
- **Alors** le connecteur renvoie 50 éléments, un curseur suivant opaque et le total 120
- **Et** un lot demandé avec ce curseur renvoie les 50 suivants sans doublon

<!-- id: AC-004.2 -->
### Exemple AC-004.2 : Le lot est borné

- **Soit** Une API qui accepte une taille de lot de 1000
- **Quand** l'espace demande un lot de 1000
- **Alors** le connecteur demande au plus 500 à l'API et renvoie au plus 500

<!-- id: REQ-005 -->
## Règle REQ-005 · Conversion de la pagination

_When the API paginates by page number or by a Link header, the connector SHALL convert that pagination into the opaque cursor of the workspace._

<!-- id: AC-005.1 -->
### Exemple AC-005.1 : Pagination par en-tête Link

- **Soit** Une API qui pagine par en-tête Link rel=next
- **Quand** l'espace demande le lot suivant avec le curseur reçu
- **Alors** le connecteur suit l'URL de l'en-tête Link
- **Et** l'espace ne voit jamais l'URL, seulement un curseur opaque

<!-- id: REQ-006 -->
## Règle REQ-006 · Lecture d’un élément

_When the workspace asks for one item by its identity, the connector SHALL call the get endpoint and SHALL return the item data with its revision._

<!-- id: AC-006.1 -->
### Exemple AC-006.1 : Lecture par identité

- **Soit** Un élément d'identité 42 avec l'ETag W/"7"
- **Quand** l'espace demande l'élément 42
- **Alors** le connecteur renvoie la donnée de l'élément et la révision W/"7"

<!-- id: REQ-007 -->
## Règle REQ-007 · Écriture avec If-Match

_When the workspace writes an item with a known revision, the connector SHALL send PUT with the If-Match header carrying that revision._

<!-- id: AC-007.1 -->
### Exemple AC-007.1 : Écriture avec la révision connue

- **Soit** L'élément 42 lu avec la révision W/"7"
- **Quand** l'espace écrit l'élément 42 avec cette révision
- **Alors** la requête PUT /items/42 porte If-Match: W/"7"
- **Et** l'API répond 200 et le connecteur renvoie la nouvelle révision

<!-- id: REQ-008 -->
## Règle REQ-008 · Révision périmée (412)

_If the API answers 412 Precondition Failed to a write, then the connector SHALL refuse the write as a stale revision and SHALL return the current item data read again from the API._

<!-- id: AC-008.1 -->
### Exemple AC-008.1 : Conflit de révision

- **Soit** L'élément 42 modifié dans l'API depuis sa lecture, révision passée de W/"7" à W/"8"
- **Quand** l'espace écrit l'élément 42 avec la révision W/"7"
- **Alors** l'API répond 412
- **Et** le connecteur refuse avec la raison stale_revision et renvoie la donnée courante avec W/"8"
- **Et** le formulaire de Maket se recharge avec cette donnée

<!-- id: REQ-009 -->
## Règle REQ-009 · Lecture seule sans révision

_While the API gives neither an ETag nor a declared revision field, the connector SHALL declare the source read-only and SHALL refuse every write with the reason read_only._

<!-- id: AC-009.1 -->
### Exemple AC-009.1 : Source sans révision

- **Soit** Une API qui ne renvoie ni ETag ni champ de révision déclaré
- **Quand** l'espace tente d'écrire un élément
- **Alors** le connecteur refuse avec la raison read_only
- **Et** l'espace est marqué en lecture seule dans son index

<!-- id: REQ-010 -->
## Règle REQ-010 · Création par POST

_When the workspace creates an item, the connector SHALL send POST and SHALL return the identity and revision assigned by the API._

<!-- id: AC-010.1 -->
### Exemple AC-010.1 : Création d'un élément

- **Soit** Une API qui accepte POST /items et renvoie l'identité 43 et l'ETag W/"1"
- **Quand** l'espace crée un élément
- **Alors** le connecteur renvoie l'identité 43 et la révision W/"1"
- **Et** l'élément 43 apparaît au lot suivant

<!-- id: REQ-011 -->
## Règle REQ-011 · Suppression avec If-Match

_When the workspace deletes an item with a known revision, the connector SHALL send DELETE with the If-Match header and SHALL report 412 as a stale revision._

<!-- id: AC-011.1 -->
### Exemple AC-011.1 : Suppression avec révision

- **Soit** L'élément 43 lu avec la révision W/"1"
- **Quand** l'espace supprime l'élément 43 avec cette révision
- **Alors** la requête DELETE /items/43 porte If-Match: W/"1"
- **Et** une réponse 412 est rendue comme stale_revision

<!-- id: REQ-012 -->
## Règle REQ-012 · Interrogation périodique

_While a polling interval is configured, the connector SHALL re-read the list at that interval and SHALL emit a source-changed signal when any item revision differs from the last read._

<!-- id: AC-012.1 -->
### Exemple AC-012.1 : Interrogation périodique

- **Soit** Un intervalle de 60 secondes configuré, et un élément modifié dans l'API après la dernière lecture
- **Quand** l'intervalle expire
- **Alors** le connecteur relit la liste et émet un signal source-changed
- **Et** l'index de l'espace montre la nouvelle révision de l'élément

<!-- id: REQ-013 -->
## Règle REQ-013 · Webhook optionnel

_Where the API offers a webhook, the connector MAY accept its calls and SHALL emit the same source-changed signal as polling._

<!-- id: AC-013.1 -->
### Exemple AC-013.1 : Webhook

- **Soit** Une API qui appelle le webhook déclaré quand un élément change
- **Quand** l'API appelle le webhook pour l'élément 42
- **Alors** le connecteur émet le même signal source-changed que l'interrogation périodique

<!-- id: REQ-014 -->
## Règle REQ-014 · API injoignable

_If the API is unreachable or answers with a server error, then the connector SHALL report source_unreachable with the retry delay and SHALL NOT retry silently._

<!-- id: AC-014.1 -->
### Exemple AC-014.1 : API injoignable

- **Soit** Une API qui répond 503 avec Retry-After: 30
- **Quand** l'espace demande un lot
- **Alors** le connecteur rapporte source_unreachable avec un délai de 30 secondes
- **Et** aucune nouvelle requête n'est envoyée avant ce délai
- **Et** l'index garde sa dernière fenêtre, datée

<!-- id: REQ-015 -->
## Règle REQ-015 · Délai dépassé

_When a request to the API exceeds the configured timeout, the connector SHALL abort it and SHALL report source_unreachable with the timeout as retry delay._

<!-- id: AC-015.1 -->
### Exemple AC-015.1 : Délai dépassé

- **Soit** Un délai de 5 secondes configuré et une API qui ne répond pas
- **Quand** l'espace demande un lot
- **Alors** la requête est abandonnée après 5 secondes
- **Et** le connecteur rapporte source_unreachable avec 5 secondes comme délai de nouvel essai

<!-- id: REQ-016 -->
## Règle REQ-016 · Configuration par la définition

_The connector configuration (base URL, environment variable name, JSON Pointer mapping, polling interval, timeout) SHALL be part of the workspace definition written through the structured workspace definition tool, and SHALL be validated by the same check as the rest of the definition._

<!-- id: AC-016.1 -->
### Exemple AC-016.1 : Configuration vérifiée avec la définition

- **Soit** Une définition d'espace dont le connecteur a un intervalle d'interrogation de -1
- **Quand** l'agent vérifie l'espace
- **Alors** la vérification signale l'intervalle invalide avec son pointeur et une correction

<!-- id: REQ-017 -->
## Règle REQ-017 · Écran Connecteurs

_The Maket application SHALL show a Connectors screen listing every data source in use with its kind, the workspace using it, the base URL, the environment variable name, whether it is reachable, whether it is read-only, the last refresh date and the last error._

<!-- id: AC-017.1 -->
### Exemple AC-017.1 : Écran Connecteurs

- **Soit** Trois espaces branchés sur trois API, dont une injoignable depuis 9 h 15 avec une erreur 503
- **Quand** le propriétaire ouvre l'écran Connecteurs
- **Alors** il voit trois lignes avec le type, l'espace, l'URL, le nom de la variable, joignable ou non, lecture seule ou non, le dernier rafraîchissement et la dernière erreur
- **Et** la ligne injoignable indique « non, depuis 09:15 » et « 503 »

<!-- id: REQ-018 -->
## Règle REQ-018 · Test de connexion

_When the owner asks to test a connector from the Connectors screen, the connector SHALL perform one list request with the configured secret and SHALL report reachable or the error received, without changing any item._

<!-- id: AC-018.1 -->
### Exemple AC-018.1 : Test de connexion

- **Soit** Un connecteur configuré vers une API qui répond 200 à la liste
- **Quand** le propriétaire clique sur Tester
- **Alors** l'écran affiche « joignable » avec la date
- **Et** aucun élément n'est créé, modifié ni supprimé dans l'API

<!-- id: AC-018.2 -->
### Exemple AC-018.2 : Test de connexion en échec

- **Soit** Un connecteur configuré vers une API qui répond 401
- **Quand** le propriétaire clique sur Tester
- **Alors** l'écran affiche l'erreur 401 et la variable d'environnement à vérifier

<!-- id: REQ-019 -->
## Règle REQ-019 · Indicateur d'état dans l'espace

_The workspace index SHALL show a connector status indicator (reachable, unreachable since a date, read-only) visible without opening the Connectors screen._

<!-- id: AC-019.1 -->
### Exemple AC-019.1 : Indicateur dans l'espace

- **Soit** Un espace dont la source est injoignable depuis 9 h 15
- **Quand** le propriétaire ouvre l'espace
- **Alors** l'index montre l'indicateur « source injoignable depuis 09:15 » sans ouvrir l'écran Connecteurs
- **Et** l'indicateur mène à l'écran Connecteurs

<!-- id: REQ-020 -->
## Règle REQ-020 · Aucune saisie de secret

_If any screen or tool of Maket receives a secret value for a connector, then Maket SHALL refuse it and SHALL point at the environment variable name instead._

<!-- id: AC-020.1 -->
### Exemple AC-020.1 : Secret refusé

- **Soit** Un agent qui passe la valeur s3cret dans la définition du connecteur
- **Quand** l'agent vérifie ou enregistre la définition
- **Alors** Maket refuse et demande le nom d'une variable d'environnement à la place
- **Et** la valeur s3cret n'est écrite nulle part

<!-- nav -->

---

[Toutes les fonctionnalités](../../README.md) › [FEAT-001 · Connecteur HTTP pour les espaces structurés de Maket](index.md) › Acceptation

[Index](index.md) · [Cadrage](cadrage.md) · [Exigences](exigences.md) · **Acceptation** · [Ancrage](ancrage.md) · [Vérification](verification.md) · Décisions

← Précédent : [Exigences](exigences.md) · Suivant : [Ancrage](ancrage.md) →
<!-- /nav -->
