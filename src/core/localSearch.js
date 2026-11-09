export const DEFAULT_SCORE_THRESHOLD = 0.1;

export const INDEX_OPTIONS = {
  imdbRatingWeight: 0.5,
  popularityWeight: 0.5,
};

const MAGNET_PREFIX = 'magnet:?';

export class LocalSearch {
  constructor(items, { imdbRatingWeight, popularityWeight, scoreThreshold } = {}) {
    this.weights = {
      imdbRatingWeight: imdbRatingWeight ?? INDEX_OPTIONS.imdbRatingWeight,
      popularityWeight: popularityWeight ?? INDEX_OPTIONS.popularityWeight,
    };
    this.scoreThreshold = scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
    this.items = items.filter((item) => item.name && item.name.length > 0);
    this.maxPopularity = Math.max(1, ...this.items.map((item) => item.popularity ?? 0));
  }

  score(item, query) {
    const name = item.name.toLowerCase();
    let match;
    if (name.includes(query)) match = 1;
    else if (name.split(/\s+/).some((token) => token.startsWith(query))) match = 0.7;
    else return 0;
    const rating = (item.imdbRating ?? 0) / 10;
    const popularity = (item.popularity ?? 0) / this.maxPopularity;
    return (
      match * (this.weights.imdbRatingWeight * rating + this.weights.popularityWeight * popularity)
    );
  }

  search(searchQuery, maxResults = 5) {
    if (searchQuery.startsWith(MAGNET_PREFIX)) return [];
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) return [];
    return this.items
      .map((item) => ({ item, score: this.score(item, query) }))
      .filter(({ score }) => score >= this.scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ item }) => item);
  }
}
