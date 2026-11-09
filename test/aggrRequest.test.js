import test from 'node:test';
import assert from 'node:assert/strict';
import { AggrRequest, CATALOG_RESOURCE_NAME } from '../src/core/aggrRequest.js';

const providers = [
  {
    transportUrl: 'http://127.0.0.1:1/manifest.json',
    manifest: {
      catalogs: [
        { id: 'top', type: 'movie', extra: [{ name: 'search' }, { name: 'skip' }] },
        { id: 'top', type: 'series', extra: [{ name: 'skip' }] },
      ],
    },
  },
  {
    transportUrl: 'http://127.0.0.1:2/manifest.json',
    manifest: {
      catalogs: [{ id: 'top', type: 'movie', extra: [{ name: 'search' }] }],
    },
  },
];

test('plan fans out one request per provider catalog supporting the search extra', () => {
  const requests = AggrRequest.allCatalogs([{ name: 'search', value: 'batman' }]).plan(providers);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].base, 'http://127.0.0.1:1/manifest.json');
  assert.equal(requests[1].base, 'http://127.0.0.1:2/manifest.json');
  for (const request of requests) {
    assert.equal(request.path.resource, CATALOG_RESOURCE_NAME);
    assert.equal(request.path.type, 'movie');
    assert.equal(request.path.id, 'top');
    assert.deepEqual(request.path.extra, [{ name: 'search', value: 'batman' }]);
  }
});

test('plan filters by type when provided', () => {
  const requests = AggrRequest.allCatalogs([{ name: 'search', value: 'x' }], 'series').plan(providers);
  assert.equal(requests.length, 0);
});

test('plan without search extra includes catalogs that do not require it', () => {
  const requests = AggrRequest.allCatalogs([]).plan(providers);
  assert.equal(requests.length, 3);
});
