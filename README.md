# stremio-lookalike

Recherche façon **Stremio**, reproduite en Node.js zero-dependency : un fan-out parallèle vers des
« providers » (addons) qui déclarent supporter l'extra `search`, avec **une section de résultats par
provider**, une **autocomplétion locale** et un **historique de recherches**.

L'architecture et le vocabulaire reproduisent volontairement le code source officiel de Stremio
(`stremio/stremio-web` + `stremio/stremio-core`) — voir le tableau de correspondance ci-dessous.

## Utilisation

```bash
npm test                    # tests (node:test)
npm run demo -- batman      # démo : démarre 2 providers locaux et lance une recherche
npm install && npm run build:exe   # fabrique dist/stremio-lookalike.exe (Windows) ou dist/stremio-lookalike
```

## Exécutable autonome (.exe)

`npm run build:exe` bundle la CLI avec esbuild, génère un blob [Node SEA](https://nodejs.org/api/single-executable-applications.html)
et l'injecte dans une copie du binaire Node courant via postject :

- sur **Windows** : produit `dist/stremio-lookalike.exe` — double-clic ou `stremio-lookalike.exe "dark knight"`
- sur Linux/macOS : produit `dist/stremio-lookalike`

En mode SEA, l'application attend la touche Entrée avant de se fermer (fenêtre console visible).

## Architecture

```
src/
  core/
    queryParamsEncode.js    extra -> "name=value&..." percent-encodé
    resourcePath.js         ResourcePath {resource, type, id, extra} + ResourceRequest {base, path}
    manifest.js             isExtraSupported(catalog, extra) : extra déclaré + requis satisfaits
    aggrRequest.js          AggrRequest.allCatalogs({extra, type}).plan(providers) -> ResourceRequest[]
    addonTransport.js       AddonHTTPTransport.resource(path) -> GET {base}/catalog/{type}/{id}/search={q}.json
    catalogsWithExtra.js    modèle d'état {selected, catalogs[]} : load / unload / loadRange / loadNextPage (skip)
    localSearch.js          index local + score pondéré (imdbRating 0.5 / popularity 0.5), ignore les magnet:
    searchHistory.js        historique (dedupe, ordre récent d'abord, deep links)
    deepLinks.js            lookalike:///search?query=...
  providers/
    demoProvider.js         provider de démo (serveur HTTP 127.0.0.1 uniquement) : manifest.json + catalogues
  cli/
    search.js               démo en ligne de commande
test/                       tests node:test
```

## Flux d'une recherche

1. L'UI soumet la requête (chez Stremio : `setSearchParams({ search })` → route `/search`).
2. Le modèle reçoit `Load CatalogsWithExtra { extra: [['search', q]] }`.
3. `AggrRequest.allCatalogs(...).plan(providers)` ne retient que les catalogues de providers dont le
   manifest déclare l'extra `search` (`isExtraSupported`).
4. Chaque requête est lancée en parallèle : `GET {transportUrl}/catalog/{type}/{id}/search={q}.json`
   (les extras sont encodés `name=value` et joints par `&`).
5. Chaque provider = une section (`Ready` → metas, `Err` → message, sinon chargement).
   Pagination via l'extra `skip` (`loadNextPage`).
6. La requête est enregistrée dans l'historique ; l'autocomplétion locale interroge l'index local.

## Correspondance avec le code source de Stremio (preuves)

| Concept | Ce projet | Stremio |
| --- | --- | --- |
| Soumission de la requête | `src/cli/search.js` | `stremio-web` `src/components/NavBar/HorizontalNavBar/SearchBar/SearchBar.js` (`setSearchParams({ search })`) |
| Dispatch `Load CatalogsWithExtra { extra: [['search', q]] }` | `src/core/catalogsWithExtra.js` | `stremio-web` `src/routes/Search/useSearch.js` |
| Modèle + fan-out | `createCatalogsWithExtra().load()` | `stremio-core` `src/models/catalogs_with_extra.rs` |
| Plan : un `ResourceRequest` par (provider, catalogue) | `AggrRequest.plan()` | `stremio-core` `src/types/addon/request.rs` (`AggrRequest::AllCatalogs::plan`) |
| Filtre `search` déclaré dans le manifest | `isExtraSupported()` | `stremio-core` `src/types/addon/manifest.rs` (`ManifestCatalog::is_extra_supported`) |
| URL `/{resource}/{type}/{id}/{extra}.json` | `AddonHTTPTransport.resourceUrl()` | `stremio-core` `src/addon_transport/http_transport/http_transport.rs` |
| Encodage `name=value&...` | `queryParamsEncode()` | `stremio-core` `src/types/query_params_encode.rs` |
| Pagination `skip` | `loadNextPage()` | `stremio-core` `src/models/catalogs_with_extra.rs` (`LoadNextPage`, `SKIP_EXTRA_PROP`) |
| Rendu : une ligne par provider | CLI (`catalog.content.type`) | `stremio-web` `src/routes/Search/Search.js` (`MetaRow` par catalogue) |
| Autocomplétion locale pondérée | `src/core/localSearch.js` | `stremio-core` `src/models/local_search.rs` (crate `localsearch`, poids 0.5/0.5, `DEFAULT_SCORE_THRESHOLD`) |
| Historique + deep links | `src/core/searchHistory.js`, `deepLinks.js` | `stremio-core` `src/models/ctx/update_search_history.rs`, `src/deep_links/mod.rs` (`stremio:///search?query=...`) |

Pour vérifier ce comportement sur l'app Stremio réelle (binaire/Electron), on peut utiliser
[REA](https://github.com/morluto/rea) : capture CDP de l'app desktop (`src/browser`), inventaire des
routes JS (`docs/javascript-route-inventory.md`), ou capture réseau (`src/captures`) pour observer les
appels réels `catalog/{type}/{id}/search={q}.json`.
