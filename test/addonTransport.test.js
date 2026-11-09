import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddonHTTPTransport } from '../src/core/addonTransport.js';
import { ResourcePath } from '../src/core/resourcePath.js';

const withServer = async (handler, fn) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}/manifest.json`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('builds /{resource}/{type}/{id}.json without extra', async () => {
  let requestedUrl = null;
  await withServer(
    (req, res) => {
      requestedUrl = req.url;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ metas: [] }));
    },
    async (base) => {
      const transport = new AddonHTTPTransport(base);
      const result = await transport.resource(ResourcePath.withoutExtra('catalog', 'movie', 'top'));
      assert.deepEqual(result, { metas: [] });
    }
  );
  assert.equal(requestedUrl, '/catalog/movie/top.json');
});

test('builds /{resource}/{type}/{id}/search={query}.json with extra', async () => {
  let requestedUrl = null;
  await withServer(
    (req, res) => {
      requestedUrl = req.url;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ metas: [{ id: 'tt0468569', name: 'The Dark Knight' }] }));
    },
    async (base) => {
      const transport = new AddonHTTPTransport(base);
      const result = await transport.resource(
        ResourcePath.withExtra('catalog', 'movie', 'top', [
          { name: 'search', value: 'bat man' },
          { name: 'skip', value: '20' },
        ])
      );
      assert.equal(result.metas.length, 1);
    }
  );
  assert.equal(requestedUrl, '/catalog/movie/top/search=bat%20man&skip=20.json');
});

test('throws on non-200 responses', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(500);
      res.end('boom');
    },
    async (base) => {
      const transport = new AddonHTTPTransport(base);
      await assert.rejects(
        transport.resource(ResourcePath.withoutExtra('catalog', 'movie', 'top')),
        /AddonTransportError: 500/
      );
    }
  );
});

test('manifest() fetches the manifest endpoint', async () => {
  await withServer(
    (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'demo', catalogs: [] }));
    },
    async (base) => {
      const transport = new AddonHTTPTransport(base);
      const manifest = await transport.manifest();
      assert.equal(manifest.id, 'demo');
    }
  );
});
