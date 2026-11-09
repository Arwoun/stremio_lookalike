import test from 'node:test';
import assert from 'node:assert/strict';
import { queryParamsEncode } from '../src/core/queryParamsEncode.js';

test('encodes a single name=value pair', () => {
  assert.equal(queryParamsEncode([['search', 'batman']]), 'search=batman');
});

test('percent-encodes keys and values', () => {
  assert.equal(queryParamsEncode([['search', 'bat man']]), 'search=bat%20man');
  assert.equal(queryParamsEncode([['q', 'a&b=c']]), 'q=a%26b%3Dc');
});

test('joins multiple pairs with &', () => {
  assert.equal(
    queryParamsEncode([['search', 'batman'], ['skip', '100']]),
    'search=batman&skip=100'
  );
});
