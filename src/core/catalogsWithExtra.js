import { AggrRequest } from './aggrRequest.js';
import { catalogSupportsExtraName } from './manifest.js';
import { ResourcePath, ResourceRequest } from './resourcePath.js';

export const SEARCH_EXTRA_NAME = 'search';
export const SKIP_EXTRA_NAME = 'skip';

const removeExtra = (extra, name) => extra.filter((ev) => ev.name !== name);

const extendOne = (extra, name, value) => [
  ...extra.filter((ev) => ev.name !== name),
  { name, value },
];

class Catalog {
  constructor(request) {
    this.request = request;
    this.pages = [{ request, content: null }];
  }

  get content() {
    const last = this.pages[this.pages.length - 1];
    return last ? last.content : null;
  }
}

export const createCatalogsWithExtra = ({ providers, addonTransport, onSearch, onUpdate } = {}) => {
  const state = { selected: null, catalogs: [] };

  const notify = () => {
    if (onUpdate) onUpdate(state);
  };

  const findCatalogManifest = (request) => {
    const provider = providers.find((p) => p.transportUrl === request.base);
    if (!provider) return null;
    return (
      provider.manifest.catalogs.find(
        (catalog) => catalog.id === request.path.id && catalog.type === request.path.type
      ) ?? null
    );
  };

  const fetchPage = async (request) => {
    try {
      const result = await addonTransport(request.base).resource(request.path);
      return { type: 'Ready', content: result.metas ?? [] };
    } catch (error) {
      return { type: 'Err', content: error.message };
    }
  };

  const planRequests = () =>
    state.selected === null
      ? []
      : AggrRequest.allCatalogs(state.selected.extra, state.selected.type).plan(providers);

  const findOrCreateCatalog = (request) => {
    let catalog = state.catalogs.find((c) => c.request.eqNoExtra(request));
    if (!catalog) {
      catalog = new Catalog(request);
      state.catalogs.push(catalog);
    }
    return catalog;
  };

  const loadPage = async (page) => {
    page.content = { type: 'Loading' };
    notify();
    page.content = await fetchPage(page.request);
    notify();
  };

  return {
    getState: () => state,

    async load(selected) {
      state.selected = {
        type: selected.type ?? null,
        extra: removeExtra(selected.extra ?? [], SKIP_EXTRA_NAME),
      };
      state.catalogs = [];
      const requests = planRequests();
      const catalogs = requests.map((request) => findOrCreateCatalog(request));
      await Promise.all(catalogs.map((catalog) => loadPage(catalog.pages[0])));
      const searchValue = state.selected.extra.find((ev) => ev.name === SEARCH_EXTRA_NAME);
      if (searchValue && onSearch) onSearch(searchValue.value);
      return state;
    },

    async unload() {
      state.selected = null;
      state.catalogs = [];
      notify();
    },

    async loadRange(range) {
      const requests = planRequests();
      await Promise.all(
        requests
          .filter((_, index) => index >= range.start && index <= range.end)
          .map(async (request) => {
            const catalog = findOrCreateCatalog(request);
            if (catalog.pages[0].content !== null) return;
            await loadPage(catalog.pages[0]);
          })
      );
      return state;
    },

    async loadNextPage(index) {
      const catalog = state.catalogs[index];
      if (!catalog) return state;
      const last = catalog.pages[catalog.pages.length - 1];
      if (!last || !last.content || last.content.type !== 'Ready') return state;
      const manifestCatalog = findCatalogManifest(last.request);
      if (!manifestCatalog || !catalogSupportsExtraName(manifestCatalog, SKIP_EXTRA_NAME)) return state;
      const previousSkip = Number(last.request.path.getExtraFirstValue(SKIP_EXTRA_NAME) ?? 0);
      const skip = previousSkip + last.content.content.length;
      const nextRequest = new ResourceRequest(
        last.request.base,
        new ResourcePath(
          last.request.path.resource,
          last.request.path.type,
          last.request.path.id,
          extendOne(last.request.path.extra, SKIP_EXTRA_NAME, String(skip))
        )
      );
      const page = { request: nextRequest, content: null };
      catalog.pages.push(page);
      await loadPage(page);
      return state;
    },
  };
};
