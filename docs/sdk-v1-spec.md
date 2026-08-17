# Spécification du SDK v1 — EA Sports FC Pro Clubs

Statut : **adoptée pour implémentation; publication soumise aux critères de sortie**

Date de référence : **17 août 2026**

## 1. Résumé de la décision

Le produit v1 sera un **SDK TypeScript non officiel, côté serveur**, qui encapsule les endpoints internes utilisés par le site EA Sports FC Pro Clubs. Il offrira une API normalisée stable et un accès brut séparé, sans exploiter de mécanisme d'authentification ni prétendre à une compatibilité garantie par EA.

La cible de compatibilité initiale est `fc26`. La surface souhaitée comporte six opérations. Une implémentation FC26 corrobore directement la recherche, les informations club et les matchs. Un probe exploratoire a aussi obtenu une réponse JSON 2xx sur les six routes, mais uniquement avec un profil de headers imitant le navigateur du site; cela ne constitue pas encore une preuve d'accès générique ni un contrat FC26 stable. Les statistiques globales n'ont renvoyé qu'un tableau vide et les formes non vides de matchs n'ont pas été observées.

Arbitrages retenus après comparaison des deux propositions d'architecture :

- un client construit autour de `fetch`, avec couches raw et normalisée séparées;
- aucun cache, retry ou seuil de rate-limit activé par défaut sans mesure fiable;
- aucun profil de navigateur inventé automatiquement par le SDK;
- IDs normalisés en chaînes et timestamps normalisés en ISO 8601 UTC;
- distribution Node.js moderne ESM uniquement pour la v1; CommonJS reste hors périmètre tant qu'un consommateur réel ne le requiert pas.

## 2. Statut des connaissances

### 2.1 Faits confirmés par le code consulté

- Le dépôt de Carlos Menezes est une librairie TypeScript conçue pour FC24, et non une preuve de compatibilité FC26 ([README FC24](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/README.md#L1-L9)).
- Cette librairie déclare six routes sous `https://proclubs.ea.com/api/fc/` : recherche, informations club, statistiques globales, statistiques membres, statistiques carrière et matchs ([routes](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/routes.ts#L4-L41), [transport](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/api.ts#L21-L52)).
- Son schéma accepte `common-gen5`, `common-gen4` et `nx`, ainsi que `leagueMatch` et `playoffMatch`; le nom de club y est limité à 1–32 caractères ([plateformes](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/platform.ts#L1-L4), [schémas](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/schemas.ts#L4-L32)).
- Ses modèles historiques montrent des identifiants tantôt sous forme de chaîne, tantôt sous forme numérique, de nombreux compteurs encodés en chaînes, un timestamp de match numérique et plusieurs objets indexés par identifiant ([modèles club](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/models.ts#L1-L102), [modèles match et membres](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/models.ts#L104-L287)).
- Le dépôt Python consulté se présente explicitement comme un client expérimental non officiel de FC26 reposant sur les endpoints appelés par `proclubs.ea.com` ([README FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/README.md#L1-L12)).
- Son code FC26 appelle `allTimeLeaderboard/search`, `clubs/info` et `clubs/matches`, toujours avec `platform=common-gen5`; pour les matchs il transmet aussi `maxResultCount=10` ([implémentation FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L122-L208)).
- Ce client FC26 documente trois types de match : `friendlyMatch`, `leagueMatch` et `playoffMatch` ([référence des méthodes](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/README.md#L78-L87)).
- Il utilise une session HTTP injectable, un timeout configurable de 10 secondes par défaut, transforme les erreurs réseau/HTTP/JSON en erreur dédiée, et n'implémente ni cache, ni retry, ni limiteur ([transport FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L20-L88), [absence de résilience](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/README.md#L133-L137)).

### 2.2 Observations live limitées

Trois observations exploratoires ont été consignées le 17 août 2026 :

1. Un premier probe secondaire a rapporté `HTTP 403` avec du HTML pour [`allTimeLeaderboard/search`](https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?platform=common-gen5&clubName=Real%20Madrid), avec `Accept: application/json` et un User-Agent identifiant la recherche.
2. Une répétition indépendante et fraîche de cette même requête, avec seulement `Accept: application/json` et un User-Agent honnête `ea-fc-pro-clubs-sdk-research/0.0 (+unofficial)`, a répondu `200 application/json`. Le `403` initial n'est donc pas reproductible comme règle générale et peut dépendre du moment ou de l'environnement.
3. Un autre probe a reproduit le profil de headers statiques présent dans le client FC26 : `Accept`, `Accept-Language`, `sec-ch-ua`, `sec-fetch-site: same-origin` et User-Agent Chrome 141 Windows ([profil source](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L20-L34)). Avec ce profil :
   - la [recherche `Real Madrid`](https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?platform=common-gen5&clubName=Real%20Madrid) a répondu `200`, tableau de 7 éléments;
   - [`clubs/info`](https://proclubs.ea.com/api/fc/clubs/info?platform=common-gen5&clubIds=240) a répondu `200`, objet indexé par la clé `240`, après un premier échec `500` avec l'ID `556710`;
   - [`members/career/stats`](https://proclubs.ea.com/api/fc/members/career/stats?platform=common-gen5&clubId=240) et [`members/stats`](https://proclubs.ea.com/api/fc/members/stats?platform=common-gen5&clubId=240) ont répondu `200`, objets contenant `members` et `positionCount`, après un premier échec `500` avec l'ID `556710`;
   - [`clubs/overallStats`](https://proclubs.ea.com/api/fc/clubs/overallStats?platform=common-gen5&clubIds=556710) a répondu `200` avec un tableau vide;
   - [`clubs/matches`](https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=556710&matchType=leagueMatch&maxResultCount=1) a répondu `200` avec un tableau vide.

Il n'y a eu qu'une réponse réussie par endpoint : aucune seconde requête n'a été faite pour recherche, statistiques globales ou matchs; seules les trois routes ayant d'abord répondu `500` ont été retentées avec l'ID `240`. Aucun cookie, token, proxy ou rotation d'IP n'a été utilisé.

Ces observations sont ponctuelles. Elles montrent que les six chemins ont produit du JSON 2xx avec le profil issu du client FC26 et que la recherche a aussi fonctionné avec une identité SDK transparente. Elles ne prouvent pas que chaque header est nécessaire, que les cinq autres routes acceptent le profil minimal, que l'accès est autorisé dans tout contexte, que les réponses vides ont la forme de leurs réponses non vides, ni que la disponibilité durera. La publication exige donc un smoke avec le profil minimal pour chaque endpoint annoncé `supported`; le profil imitant un navigateur ne constitue pas à lui seul une preuve suffisante.

### 2.3 Inconnues bloquant les affirmations de compatibilité

- Forme non vide FC26 de `clubs/overallStats` et `clubs/matches`.
- Support FC26 réel de `common-gen4` et `nx`; seul `common-gen5` est utilisé par le code FC26 consulté.
- Forme exhaustive et stabilité de chaque réponse FC26 au-delà des enveloppes observées.
- Syntaxe et limite d'un éventuel envoi groupé de plusieurs `clubIds`.
- Bornes acceptées pour `maxResultCount`, quotas, politique anti-abus et fréquence sûre.
- Sémantique exacte de tous les compteurs, codes de position, `matchType`, `timeAgo` et champs de kit.
- Conditions d'utilisation applicables à la redistribution des données et à une publication npm.

Ces inconnues ne seront pas remplacées par des suppositions. La publication v1 exige les preuves décrites dans les critères d'acceptation.

## 3. Objectifs et non-objectifs

### 3.1 Objectifs v1

1. Fournir une API TypeScript explicite pour six opérations Pro Clubs.
2. Isoler les détails instables de l'amont dans un transport et des adaptateurs versionnés `fc26`.
3. Préserver une représentation brute consultable tout en offrant des objets normalisés cohérents.
4. Valider les entrées et les enveloppes de réponse à l'exécution.
5. Produire des erreurs actionnables sans masquer les réponses vides valides.
6. Permettre l'annulation, un timeout déterministe et l'injection du transport pour les tests.
7. Limiter la charge par des valeurs par défaut prudentes et documenter l'absence de garanties EA.

### 3.2 Non-objectifs v1

- Héberger une API HTTP, un proxy partagé ou un service de cache.
- Supporter directement les navigateurs, React Native, Deno, Bun ou Cloudflare Workers.
- Fournir une distribution CommonJS sans besoin consommateur démontré.
- Automatiser une connexion EA, manipuler des cookies ou contourner une protection anti-bot.
- Faire du scraping massif, de l'énumération de clubs ou de la collecte historique exhaustive.
- Fournir des classements, agrégations métier, persistance ou analytics.
- Garantir la disponibilité, l'exactitude ou la stabilité des endpoints EA.
- Reproduire les conversions horaires fixes `+1 h`/`+2 h` du client Python; son code applique plusieurs décalages distincts ([conversion FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L90-L107), [usages divergents](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L160-L205)).

## 4. Portée fonctionnelle

### 4.1 Plateformes

```ts
export type Platform = 'common-gen5' | 'common-gen4' | 'nx'
```

Décisions v1 :

- `common-gen5` est le seul profil marqué **cible FC26** au lancement.
- `common-gen4` et `nx` restent des valeurs connues et typées, mais sont marquées **non vérifiées sur FC26** dans la matrice de compatibilité.
- Aucune plateforme implicite : l'appelant doit toujours en fournir une.
- Une valeur inconnue est rejetée localement avec `EAFCValidationError`.

### 4.2 Types de match

```ts
export type MatchType =
  | 'friendlyMatch'
  | 'leagueMatch'
  | 'playoffMatch'
```

Les trois valeurs font partie de la surface v1. `friendlyMatch` vient de la source FC26, tandis que le client TypeScript FC24 n'en acceptait que deux ([FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api.py#L86-L103), [FC24](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/schemas.ts#L4-L28)).

### 4.3 Inventaire des six endpoints

Toutes les requêtes utilisent `GET` et la base `https://proclubs.ea.com/api/fc/`, comme dans le client TypeScript historique ([construction des URL](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/api.ts#L21-L50)).

| Opération SDK | Route | Query amont v1 | Enveloppe brute attendue | Preuve FC26 actuelle |
|---|---|---|---|---|
| `clubs.search` | `allTimeLeaderboard/search` | `platform`, `clubName` | tableau | Code FC26 + live non vide |
| `clubs.get` | `clubs/info` | `platform`, `clubIds=<un id>` | objet indexé par ID | Code FC26 + live non vide |
| `clubs.overallStats` | `clubs/overallStats` | `platform`, `clubIds=<un id>` | tableau | Live vide seulement; route source FC24 |
| `members.stats` | `members/stats` | `platform`, `clubId` | objet `{ members, positionCount }` | Enveloppe live; route source FC24 |
| `members.careerStats` | `members/career/stats` | `platform`, `clubId` | objet `{ members, positionCount }` | Enveloppe live; route source FC24 |
| `matches.list` | `clubs/matches` | `platform`, `clubIds=<un id>`, `matchType`, `maxResultCount` | tableau | Code FC26 + live vide seulement |

Les chemins et paramètres historiques des six routes sont directement déclarés dans les [routes](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/routes.ts#L17-L41) et [schémas](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/src/schemas.ts#L7-L32) du client FC24. Les trois routes confirmées par le client FC26 et l'ajout de `maxResultCount` sont visibles dans son [code des méthodes](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L122-L208).

Décisions v1 :

- La surface publique accepte un seul `clubId` par appel. Le transport emploie `clubIds` lorsque la route amont l'exige. Le batching est différé tant que son encodage et ses limites ne sont pas prouvés.
- `matches.list` envoie `maxResultCount=10` par défaut afin de limiter la charge. L'option `limit` est restreinte localement aux entiers de `1` à `10` : `1` a répondu lors du probe et `10` est la valeur utilisée par le client FC26 consulté. Cette borne prudente du SDK ne prétend pas être la limite maximale acceptée par EA.
- Une méthode candidate peut être implémentée avant stabilisation, mais elle ne peut pas être annoncée comme supportée ni satisfaire le critère de sortie v1 sans fixture FC26 représentative. Un `200 []` prouve l'enveloppe vide, pas la forme d'un élément.

## 5. API TypeScript publique

```ts
export type GameProfile = 'fc26'
export type ClubId = string & { readonly __brand: 'ClubId' }

export interface EAFCClientOptions {
  game: GameProfile
  fetch?: typeof globalThis.fetch
  timeoutMs?: number // défaut : 10_000
  headers?: Readonly<Record<string, string>>
}

export interface RequestOptions {
  signal?: AbortSignal
}

export interface ClubRequest {
  clubId: string
  platform: Platform
}

export interface SearchClubsRequest {
  name: string
  platform: Platform
}

export interface ListMatchesRequest extends ClubRequest {
  type: MatchType
  limit?: number // entier de 1 à 10; défaut : 10
}

export interface EAFCClient {
  clubs: {
    search(input: SearchClubsRequest, options?: RequestOptions): Promise<ClubSummary[]>
    get(input: ClubRequest, options?: RequestOptions): Promise<ClubInfo | null>
    overallStats(input: ClubRequest, options?: RequestOptions): Promise<ClubOverallStats | null>
  }
  members: {
    stats(input: ClubRequest, options?: RequestOptions): Promise<ClubMemberStats>
    careerStats(input: ClubRequest, options?: RequestOptions): Promise<ClubMemberCareerStats>
  }
  matches: {
    list(input: ListMatchesRequest, options?: RequestOptions): Promise<ClubMatch[]>
  }
  raw: RawEAFCClient
}

export declare function createEAFCClient(options: EAFCClientOptions): EAFCClient
```

Exemple :

```ts
import { createEAFCClient } from 'PACKAGE_NAME_TO_CONFIRM'

const client = createEAFCClient({ game: 'fc26' })
const clubs = await client.clubs.search({
  name: 'Example Club',
  platform: 'common-gen5',
})
```

Décisions d'ergonomie :

- Une recherche sans résultat renvoie `[]`; une ressource absente renvoie `null`; une panne lève une erreur typée.
- Les méthodes ne renvoient jamais `undefined` ou `null` pour signaler une panne. Le client FC26 de référence mélange actuellement résultat absent et panne via `None`, ce que la v1 ne reproduit pas ([gestion publique des erreurs](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L80-L88), [documentation](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/README.md#L72-L106)).
- Le nom npm demeure à confirmer après vérification de disponibilité. Aucun nom de package n'est figé par cette spec.

## 6. Contrats raw et normalisés

### 6.1 Couche raw

La couche `client.raw` expose les mêmes six méthodes et conserve les noms de clés, enveloppes et valeurs amont. Elle effectue seulement : validation des entrées, vérification HTTP, décodage JSON et validation minimale de l'enveloppe.

```ts
export type RawScalar = string | number | boolean | null
export type RawRecord = Record<string, unknown>

export interface RawClubSearchItem extends RawRecord {
  clubId?: string | number
  clubName?: string
  platform?: string
  clubInfo?: RawRecord
}

export type RawClubSearchResponse = RawClubSearchItem[]
export type RawClubInfoResponse = Record<string, RawRecord>
export type RawOverallStatsResponse = RawRecord[]

export interface RawMembersResponse extends RawRecord {
  members?: RawRecord[]
  positionCount?: RawRecord
}

export interface RawMatch extends RawRecord {
  matchId?: string | number
  timestamp?: string | number
  clubs?: Record<string, RawRecord>
  players?: Record<string, Record<string, RawRecord>>
  aggregate?: Record<string, RawRecord>
}

export type RawMatchesResponse = RawMatch[]

export interface RawEAFCClient {
  clubs: {
    search(input: SearchClubsRequest, options?: RequestOptions): Promise<RawClubSearchResponse>
    get(input: ClubRequest, options?: RequestOptions): Promise<RawClubInfoResponse>
    overallStats(input: ClubRequest, options?: RequestOptions): Promise<RawOverallStatsResponse>
  }
  members: {
    stats(input: ClubRequest, options?: RequestOptions): Promise<RawMembersResponse>
    careerStats(input: ClubRequest, options?: RequestOptions): Promise<RawMembersResponse>
  }
  matches: {
    list(input: ListMatchesRequest, options?: RequestOptions): Promise<RawMatchesResponse>
  }
}
```

Les propriétés raw sont optionnelles et les objets restent ouverts car les types FC24 disponibles ne constituent pas un contrat FC26. `unknown`, jamais `any`, est utilisé pour tout champ non établi.

### 6.2 Couche normalisée

La couche normalisée fournit des noms cohérents et des types utiles, tout en déplaçant les champs non reconnus dans `extra`.

```ts
export type NumericStat = number | null

export interface NormalizedEntity {
  extra: Readonly<Record<string, unknown>>
}

export interface ClubSummary extends NormalizedEntity {
  id: ClubId
  name: string
  platform: Platform
  wins: NumericStat
  losses: NumericStat
  ties: NumericStat
  gamesPlayed: NumericStat
}

export interface ClubInfo extends NormalizedEntity {
  id: ClubId
  name: string
  regionId: string | null
  teamId: string | null
  stadiumName: string | null
  kit: Readonly<Record<string, string | number | null>>
}

export interface ClubOverallStats extends NormalizedEntity {
  clubId: ClubId
  stats: Readonly<Record<string, number | string | null>>
}

export interface ClubMember extends NormalizedEntity {
  name: string
  position: string | null
  stats: Readonly<Record<string, number | string | null>>
}

export interface PositionCount extends NormalizedEntity {
  goalkeeper: number | null
  defender: number | null
  midfielder: number | null
  forward: number | null
}

export interface ClubMemberStats extends NormalizedEntity {
  members: ClubMember[]
  positionCount: PositionCount
}

export type ClubMemberCareerStats = ClubMemberStats

export interface ClubMatch extends NormalizedEntity {
  id: string
  playedAt: string // ISO 8601 UTC
  type: MatchType
  clubs: Readonly<Record<ClubId, RawRecord>>
  players: Readonly<Record<ClubId, Readonly<Record<string, RawRecord>>>>
  aggregate: Readonly<Record<string, RawRecord>>
}
```

Ces interfaces fixent le socle v1. Les champs métier additionnels ne deviennent obligatoires qu'après présence dans des fixtures FC26 couvrant plusieurs réponses. Les objets `clubs`, `players`, `aggregate`, `kit`, `stats` et `extra` restent volontairement ouverts en v1.

### 6.3 Règles de normalisation

- **Identifiants :** tous les IDs sont des chaînes, même si l'amont renvoie un nombre. Aucun calcul arithmétique n'est effectué sur un ID.
- **Nombres :** seule une liste explicite de champs métriques est convertie. Une chaîne décimale finie devient un `number`; `''`, une valeur non finie ou non numérique devient `null` ou provoque `EAFCUpstreamShapeError` si le champ est indispensable. Aucune valeur invalide ne devient silencieusement `0`.
- **Timestamps :** un timestamp Unix en secondes devient une chaîne ISO 8601 UTC. Aucun décalage horaire fixe n'est ajouté. Le timestamp numérique d'origine reste disponible dans la couche raw. Une valeur ambiguë ou invalide provoque une erreur de forme.
- **Champs manquants :** un champ requis pour identifier la ressource provoque `EAFCUpstreamShapeError`; un champ métier optionnel devient `null`.
- **Champs inconnus :** ils sont préservés tels quels dans `extra` au niveau normalisé et à leur emplacement original en raw.
- **Immutabilité :** les tableaux et objets retournés ne partagent pas de référence mutable avec le JSON décodé.

## 7. Transport HTTP

### 7.1 Requête

- `GET` uniquement dans la v1.
- URL fixe appartenant à `https://proclubs.ea.com/api/fc/`; les chemins ne sont jamais fournis par l'appelant.
- Query construite avec `URL`/`URLSearchParams`, jamais par concaténation libre.
- `Accept: application/json` par défaut.
- User-Agent serveur honnête contenant le nom et la version du SDK, lorsque le runtime autorise ce header.
- Aucun `sec-ch-ua`, `sec-fetch-*`, cookie, token ou User-Agent de navigateur n'est inventé par défaut. Le code FC26 consulté envoie de tels headers statiques ([headers FC26](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/fc26_api_class.py#L20-L34)), mais l'observation live de cette étude ne suffit pas à démontrer qu'ils constituent un contrat légitime ou stable.
- Les headers personnalisés sont fusionnés avec les défauts, à l'exception de `Host`, `Cookie`, `Authorization`, `Content-Length`, `Connection` et des headers `Sec-*`, refusés en v1.
- Le `fetch` global Node est utilisé par défaut; une implémentation compatible peut être injectée pour les tests ou un transport applicatif contrôlé.

### 7.2 Timeout et annulation

- `timeoutMs` vaut `10_000` par défaut; `0` est interdit.
- Chaque appel accepte un `AbortSignal` externe.
- Le SDK combine le signal externe et son timeout, nettoie ses timers dans tous les chemins et préserve la cause.
- Une expiration lève `EAFCTimeoutError`; une annulation appelant lève `EAFCAbortError`; une autre panne réseau lève `EAFCNetworkError`.
- Si le signal est déjà annulé, aucune requête n'est envoyée.

### 7.3 Cache, retry et limitation

Décision v1 :

- **Pas de cache intégré.** La fraîcheur et les durées sûres ne sont pas connues; l'injection de `fetch` permet à l'application d'ajouter un cache explicite.
- **Pas de retry automatique.** Sans connaissance des quotas ni des réponses transitoires, un retry implicite multiplierait la charge et masquerait la première erreur.
- **Pas de rate-limit numérique prétendument sûr.** Aucun seuil EA vérifié n'est disponible. La documentation interdit les boucles massives et recommande à l'application une file à faible concurrence adaptée à son usage.
- **Réduction locale de charge :** `matches.list` demande 10 résultats par défaut et aucun batching multi-club n'est fourni.

Une future politique de retry ne pourra concerner que des GET idempotents, respecter `Retry-After`, utiliser un backoff avec jitter, être bornée et rester désactivable.

## 8. Modèle d'erreurs

```ts
export type EAFCErrorCode =
  | 'VALIDATION'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP'
  | 'INVALID_JSON'
  | 'UPSTREAM_SHAPE'
  | 'UNSUPPORTED_GAME_PROFILE'

export class EAFCError extends Error {
  readonly code: EAFCErrorCode
  readonly cause?: unknown
}

export class EAFCValidationError extends EAFCError {}
export class EAFCAbortError extends EAFCError {}
export class EAFCTimeoutError extends EAFCError {}
export class EAFCNetworkError extends EAFCError {}
export class EAFCHttpError extends EAFCError {
  readonly status: number
  readonly retryAfterMs?: number
}
export class EAFCInvalidJsonError extends EAFCError {}
export class EAFCUpstreamShapeError extends EAFCError {}
export class EAFCUnsupportedGameProfileError extends EAFCError {}
```

Règles :

- Tout statut non-2xx produit `EAFCHttpError` avant le décodage métier.
- Un corps non JSON sur un 2xx produit `EAFCInvalidJsonError`.
- Une enveloppe inattendue ou un champ d'identité invalide produit `EAFCUpstreamShapeError` avec endpoint, chemin du champ et type observé, sans inclure le corps complet.
- Les messages et logs excluent les cookies, headers sensibles et corps complets. La query est expurgée du nom de club et des IDs par défaut.
- `cause` conserve l'erreur native sans être sérialisée automatiquement.

## 9. Runtime et packaging

Décisions v1 :

- Node.js `>=22` côté serveur. Node 20 est en fin de vie à la date de référence, tandis que Node 22 et Node 24 sont encore des lignes LTS ([calendrier officiel Node.js](https://nodejs.org/en/about/previous-releases)).
- TypeScript en mode strict; déclarations `.d.ts` incluses.
- Distribution ESM uniquement sous un champ `exports` avec conditions `types` et `import`.
- Sourcemaps et declaration maps publiées; `sideEffects: false`.
- Aucun accès réseau à l'import : seul un appel de méthode déclenche une requête.
- Aucun polyfill global et aucune dépendance à un framework.
- Le bundle n'embarque pas les fixtures de test.
- Le navigateur est officiellement non supporté en v1, car CORS et comportement des headers n'ont pas été vérifiés.

Le client de Carlos publiait déjà du CommonJS et des déclarations TypeScript, mais sans contrainte de version Node explicite ([package](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/package.json#L1-L44), [configuration TypeScript](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/tsconfig.json#L16-L60)). Ces choix historiques sont une référence de compatibilité, pas le contrat de cette v1.

## 10. Versionnement EA et SDK

- Le package suit SemVer indépendamment du numéro du jeu.
- `game: 'fc26'` est obligatoire et sélectionne un adaptateur, des schémas et des fixtures spécifiques; aucun profil n'est déduit silencieusement de la date.
- Ajouter un profil de jeu sans casser les profils existants est une version mineure.
- Corriger un adaptateur après un changement amont est un patch si l'API normalisée reste identique.
- Retirer ou modifier un champ/méthode normalisé public exige une version majeure.
- La couche raw reflète l'amont et est explicitement moins stable. Les changements de clés uniquement additionnels ne déclenchent pas de majeure; une modification de ses types déclarés suit néanmoins SemVer.
- Chaque release publie une matrice `profil × plateforme × endpoint × date du dernier smoke réussi`.
- Un endpoint dont le smoke n'a jamais réussi est marqué `unverified`, jamais `supported`.

## 11. Stratégie de tests

### 11.1 Tests obligatoires hors ligne

- Construction exacte des six URLs et query strings.
- Validation des plateformes, noms, IDs, types de match, limites et timeout.
- Composition et nettoyage des `AbortSignal`.
- Mapping de chaque classe d'erreur.
- Parsing de chaque enveloppe raw et normalisation sans perte des champs inconnus.
- Conversions ID/nombre/timestamp, y compris valeurs vides, énormes, décimales et invalides.
- Fixtures versionnées par `game/platform/endpoint`, expurgées de données inutilement identifiantes et accompagnées de leur date/provenance.
- Snapshots de contrats raw, assertions précises sur les contrats normalisés et tests de types publics.
- Tests de consommation réels via `import` et résolution des déclarations dans un mini-projet Node propre.
- Test démontrant qu'aucune requête ne part lors de l'import ou avec un signal déjà annulé.

Les tests historiques de Carlos appelaient directement le service live avec un club précis ([recherche](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/tests/searchClub.test.ts#L1-L21), [matchs](https://github.com/carlos-menezes/fc-clubs-api/blob/237dd6f2353cd1fc2655137931eec6ecf30dc3b7/tests/matchesStats.test.ts#L1-L35)). La v1 ne rendra pas ses tests déterministes dépendants d'EA.

### 11.2 Smokes live opt-in

- Désactivés par défaut et absents des tests requis de PR.
- Exécution manuelle, séquentielle, avec un seul club de test documenté.
- Au plus une requête réussie par endpoint et par exécution; aucune relance automatique.
- Vérification de statut, JSON, enveloppe minimale et absence de donnée sensible dans les logs.
- Arrêt immédiat sur `401`, `403`, `429`, HTML inattendu ou indice de protection anti-bot.
- Une fixture ne peut être rafraîchie qu'après inspection et nettoyage manuel.

## 12. Sécurité, éthique et exploitation responsable

- Le README et le package doivent porter clairement « unofficial », « not affiliated with or endorsed by EA » et l'absence de garantie.
- Le SDK ne collecte, ne demande ni ne persiste de compte EA, mot de passe, token, cookie ou identifiant de session.
- Aucun mécanisme de rotation d'IP, CAPTCHA, proxy anti-bot ou imitation automatique de navigateur n'est accepté.
- Les exemples utilisent des données fictives ou explicitement autorisées.
- Les logs sont silencieux par défaut et expurgés; l'observabilité passe par des hooks opt-in recevant des métadonnées minimales.
- Aucune télémétrie n'est envoyée par le SDK.
- Les utilisateurs sont invités à limiter fréquence, concurrence et rétention, et à respecter les règles applicables d'EA et leur droit local.
- Avant publication npm, une revue des conditions EA et des obligations de licence doit être documentée. La présente spec n'est pas un avis juridique.

## 13. Hors-périmètre explicite

- API REST/GraphQL hébergée, clés API et multi-tenant.
- CLI, dashboard, bot Discord ou intégration frontend.
- Recherche floue locale et classement des résultats.
- Batch multi-club, pagination automatisée et synchronisation planifiée.
- Cache distribué, base de données et webhooks.
- Statistiques calculées ou traduction des codes EA sans dictionnaire prouvé.
- Profils `fc24`, `fc25`, `fc27` et suivants dans la release initiale.

## 14. Roadmap proposée

### Étape A — socle sans réseau

Transport injectable, erreurs, validation, timeout/abort, packaging ESM, tests de consommation.

### Étape B — trois routes FC26 corroborées

Implémenter recherche, informations et matchs depuis des fixtures FC26 nettoyées; stabiliser les types raw puis les adaptateurs normalisés.

### Étape C — stabilisation des trois routes de statistiques

Obtenir des fixtures FC26 représentatives et une preuve d'accès licite pour statistiques globales, membres et carrière. Le probe confirme leurs chemins/enveloppes minimales sous un profil navigateur, mais pas encore tous leurs champs ni un accès transparent. Les intégrer uniquement lorsque paramètres et formes utiles sont confirmés; sinon les retirer de la cible v1 ou les publier sous un statut expérimental explicite après décision produit.

### Étape D — publication v1

Valider matrice de compatibilité, sécurité, licences, nom npm, documentation et smokes opt-in; publier seulement lorsque tous les critères ci-dessous sont remplis.

### Après v1

Évaluer, à partir de mesures : nouveaux profils de jeu, batching, cache applicatif, retry borné respectant `Retry-After`, support d'autres runtimes et éventuelle API hébergée séparée.

## 15. Critères d'acceptation v1

La v1 est publiable lorsque :

1. Les six méthodes publiques et leurs équivalents raw compilent en TypeScript strict.
2. Chaque endpoint annoncé `supported` possède au moins une fixture FC26 traçable et un smoke live réussi récent, obtenu sans contournement.
3. Les trois routes de statistiques disposent de fixtures FC26 représentatives et d'un accès conforme au cadre éthique; sinon le produit décide explicitement de les retirer de la v1 ou de renommer la release en preview. Un tableau vide ou la seule liste des clés ne suffit pas à figer leurs modèles complets.
4. `common-gen5` passe tous les smokes des endpoints supportés; `common-gen4` et `nx` sont soit prouvées, soit clairement `unverified`.
5. Les erreurs HTTP, réseau, timeout, abort, JSON et forme amont sont distinguées par tests.
6. Aucun test de PR ne dépend du réseau EA.
7. Les sorties raw préservent les champs inconnus et les sorties normalisées respectent les règles ID/nombre/timestamp.
8. `npm pack` ne contient que les bundles, types, sourcemaps, README, licence et métadonnées attendus.
9. Un mini-projet ESM importe réellement le tarball et résout ses types.
10. Aucun secret, cookie, donnée de fixture inutilement identifiante, télémétrie ou header de contournement n'est présent.
11. Le README contient matrice de compatibilité datée, limites, usage responsable, exemples d'annulation et documentation des erreurs.
12. Le nom npm et la licence finale ont été vérifiés avant publication.

## 16. Preuves consultées et limites

### Sources primaires de code

- `carlos-menezes/fc-clubs-api` à la révision [`237dd6f`](https://github.com/carlos-menezes/fc-clubs-api/tree/237dd6f2353cd1fc2655137931eec6ecf30dc3b7) : routes, schémas, transport, modèles, tests, packaging et README FC24.
- `1erkandogan/fc26-clubs-api` à la révision [`4de4ff0`](https://github.com/1erkandogan/fc26-clubs-api/tree/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0) : transport, méthodes, paramètres, erreurs, transformations et README FC26.
- URLs exactes des probes EA listées en section 2.2; elles constituent un relevé ponctuel, pas une documentation officielle.

### Limites de preuve

- Les deux dépôts sont des clients tiers non officiels : leur code prouve ce qu'ils appellent, pas un contrat garanti par EA.
- Le dépôt TypeScript complet cible FC24. Il ne suffit pas à valider ses six routes pour FC26.
- Le dépôt FC26 n'implémente que trois routes et n'offre pas de fixtures JSON ni de tests automatisés ([limitations déclarées](https://github.com/1erkandogan/fc26-clubs-api/blob/4de4ff08c77bae033f1fcd648b34f6ca096e1fb0/README.md#L153-L163)).
- Le profil SDK transparent a réussi sur la recherche lors de la vérification fraîche, mais n'a pas été testé sur les cinq autres routes. Le probe couvrant les six routes reproduisait les headers navigateur statiques du client FC26; ses résultats ne valident donc pas à eux seuls un accès générique sans cette imitation.
- Les réponses live de statistiques globales et de matchs étaient vides pour l'ID testé. Aucune forme d'élément non vide n'a été observée pour ces deux routes.
- Les choix d'architecture de cette spec sont des décisions v1, pas des faits attribués à EA.
