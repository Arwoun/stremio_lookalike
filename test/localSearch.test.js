import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCORE_THRESHOLD, LocalSearch } from '../src/core/localSearch.js';

const items = [
  { id: 'tt0468569', name: 'The Dark Knight', type: 'movie', imdbRating: 9.0, popularity: 1000 },
  { id: 'tt0372784', name: 'Batman Begins', type: 'movie', imdbRating: 8.2, popularity: 900 },
  { id: 'tt2861424', name: 'Batman: The Animated Series', type: 'series', imdbRating: 8.9, popularity: 500 },
  { id: 'tt0133093', name: 'The Matrix', type: 'movie', imdbRating: 8.7, popularity: 850 },
  { id: 'tt-no-name', name: '', type: 'movie', imdbRating: 9.9, popularity: 1000 },
];

test('finds items matching the query, ranked by weighted score', () => {
  const searcher = new LocalSearch(items);
  const results = searcher.search('batman', 5);
  assert.deepEqual(
    results.map((r) => r.name),
    ['Batman Begins', 'Batman: The Animated Series']
  );
});

test('substring and token-prefix matches work', () => {
  const searcher = new LocalSearch(items);
  assert.deepEqual(
    searcher.search('dark knight', 5).map((r) => r.name),
    ['The Dark Knight']
  );
  assert.deepEqual(
    searcher.search('matr', 5).map((r) => r.name),
    ['The Matrix']
  );
});

test('respects maxResults', () => {
  const searcher = new LocalSearch(items);
  assert.equal(searcher.search('batman', 2).length, 2);
});

test('ignores items without a name when indexing', () => {
  const searcher = new LocalSearch(items);
  assert.ok(searcher.items.every((item) => item.name.length > 0));
});

test('returns no results for magnet links', () => {
  const searcher = new LocalSearch(items);
  assert.deepEqual(searcher.search('magnet:?xt=urn:btih:abc', 5), []);
});

test('returns no results for empty or non-matching queries', () => {
  const searcher = new LocalSearch(items);
  assert.deepEqual(searcher.search('   ', 5), []);
  assert.deepEqual(searcher.search('zzzzz', 5), []);
});

test('exposes the default score threshold', () => {
  assert.equal(typeof DEFAULT_SCORE_THRESHOLD, 'number');
});
