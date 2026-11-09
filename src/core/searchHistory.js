import { searchDeepLink } from './deepLinks.js';

export const SEARCH_HISTORY_MAX_ITEMS = 20;

export class SearchHistory {
  constructor({ maxItems = SEARCH_HISTORY_MAX_ITEMS } = {}) {
    this.maxItems = maxItems;
    this.items = [];
  }

  add(query) {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    this.items = [
      { query: trimmed, deepLinks: { search: searchDeepLink(trimmed) } },
      ...this.items.filter((item) => item.query !== trimmed),
    ].slice(0, this.maxItems);
  }

  clear() {
    this.items = [];
  }
}
