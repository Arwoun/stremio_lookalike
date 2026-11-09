import { queryParamsEncode } from './queryParamsEncode.js';

export const ADDON_MANIFEST_PATH = '/manifest.json';

const encodeComponent = (value) => encodeURIComponent(value);

export class AddonHTTPTransport {
  constructor(transportUrl) {
    this.transportUrl = transportUrl;
  }

  resourceUrl(path) {
    const suffix =
      path.extra.length === 0
        ? `/${encodeComponent(path.resource)}/${encodeComponent(path.type)}/${encodeComponent(path.id)}.json`
        : `/${encodeComponent(path.resource)}/${encodeComponent(path.type)}/${encodeComponent(path.id)}/${queryParamsEncode(
            path.extra.map((ev) => [ev.name, ev.value])
          )}.json`;
    return this.transportUrl.replace(ADDON_MANIFEST_PATH, suffix);
  }

  async resource(path) {
    const url = this.resourceUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AddonTransportError: ${response.status} for ${url}`);
    }
    return response.json();
  }

  async manifest() {
    const response = await fetch(this.transportUrl);
    if (!response.ok) {
      throw new Error(`AddonTransportError: ${response.status} for ${this.transportUrl}`);
    }
    return response.json();
  }
}
