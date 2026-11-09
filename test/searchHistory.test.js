import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchHistory, SEARCH_HISTORY_MAX_ITEMS } from '../src/core/searchHistory.js';
import { searchDeepLink } from '../src/core/deepLinks.js';

test('add prepends the most recent query with a deep link', () => {
  const history = new SearchHistory();
  history.add('batman');
  history.add('matrix');
  assert.deepEqual(
    history.items.map((i) => i.query),
    ['matrix', 'batman']
  );
  assert.equal(history.items[0].deepLinks.search, 'lookalike:///search?query=matrix');
});

test('add deduplicates and trims', () => {
  const history = new SearchHistory();
  history.add('batman');
  history.add('  batman  ');
  assert.equal(history.items.length, 1);
  history.add('   ');
  assert.equal(history.items.length, 1);
});

test('clear empties the history', () => {
  const history = new SearchHistory();
  history.add('batman');
  history.clear();
  assert.deepEqual(history.items, []);
});

test('history is capped at the max items', () => {
  const history = new SearchHistory({ maxItems: 3 });
  history.add('a');
  history.add('b');
  history.add('c');
  history.add('d');
  assert.deepEqual(
    history.items.map((i) => i.query),
    ['d', 'c', 'b']
  );
  assert.equal(SEARCH_HISTORY_MAX_ITEMS, 20);
});

test('deep link percent-encodes the query', () => {
  assert.equal(searchDeepLink('bat man'), 'lookalike:///search?query=bat%20man');
});
