import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogSupportsExtraName, isExtraSupported } from '../src/core/manifest.js';

const catalogWithSearch = {
  id: 'top',
  type: 'movie',
  extra: [{ name: 'search' }, { name: 'skip' }],
};

const catalogRequiredGenre = {
  id: 'top',
  type: 'movie',
  extra: [{ name: 'genre', isRequired: true }, { name: 'search' }],
};

const catalogNoSearch = { id: 'top', type: 'series', extra: [{ name: 'skip' }] };

test('supports an extra declared in the manifest', () => {
  assert.equal(isExtraSupported(catalogWithSearch, [{ name: 'search', value: 'batman' }]), true);
});

test('rejects an extra not declared in the manifest', () => {
  assert.equal(isExtraSupported(catalogNoSearch, [{ name: 'search', value: 'batman' }]), false);
});

test('rejects when a required extra is missing', () => {
  assert.equal(isExtraSupported(catalogRequiredGenre, [{ name: 'search', value: 'x' }]), false);
  assert.equal(
    isExtraSupported(catalogRequiredGenre, [
      { name: 'search', value: 'x' },
      { name: 'genre', value: 'action' },
    ]),
    true
  );
});

test('catalogSupportsExtraName checks a single extra name', () => {
  assert.equal(catalogSupportsExtraName(catalogWithSearch, 'skip'), true);
  assert.equal(catalogSupportsExtraName(catalogNoSearch, 'search'), false);
});
