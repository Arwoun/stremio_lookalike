import { isExtraSupported } from './manifest.js';
import { ResourcePath, ResourceRequest } from './resourcePath.js';

export const CATALOG_RESOURCE_NAME = 'catalog';

export class AggrRequest {
  constructor({ extra = [], type = null }) {
    this.extra = extra;
    this.type = type;
  }

  static allCatalogs(extra, type = null) {
    return new AggrRequest({ extra, type });
  }

  plan(providers) {
    const requests = [];
    for (const provider of providers) {
      for (const catalog of provider.manifest.catalogs) {
        if (!isExtraSupported(catalog, this.extra)) continue;
        if (this.type !== null && this.type !== undefined && catalog.type !== this.type) continue;
        requests.push(
          new ResourceRequest(
            provider.transportUrl,
            ResourcePath.withExtra(CATALOG_RESOURCE_NAME, catalog.type, catalog.id, this.extra)
          )
        );
      }
    }
    return requests;
  }
}
