import test from 'node:test';
import assert from 'node:assert/strict';
import { AddonHTTPTransport } from '../src/core/addonTransport.js';
import { createCatalogsWithExtra, SEARCH_EXTRA_NAME, SKIP_EXTRA_NAME } from '../src/core/catalogsWithExtra.js';
import {
  createDemoProvider,
  DEMO_FEED,
  startDemoProviders,
  stopDemoProviders,
} from '../src/providers/demoProvider.js';

const setup = async () => {
  const started = await startDemoProviders([
    {
      server: createDemoProvider({
        id: 'demo-a',
        name: 'Demo A',
        movieItems: DEMO_FEED,
        seriesItems: [],
      }),
    },
    {
      server: createDemoProvider({
        id: 'demo-b',
        name: 'Demo B',
        movieItems: [
          { id: 'tt2861424', name: 'Batman: The Animated Series', type: 'series', imdbRating: 8.9, popularity: 500 },
        ],
        seriesItems: [],
      }),
    },
  ]);
  const providers = [];
  for (const provider of started) {
    const manifest = await new AddonHTTPTransport(provider.transportUrl).manifest();
    providers.push({ transportUrl: provider.transportUrl, manifest });
  }
  return { started, providers };
};

test('load with search extra fans out to providers supporting it and records history', async () => {
  const { started, providers } = await setup();
  try {
    const searches = [];
    const model = createCatalogsWithExtra({
      providers,
      addonTransport: (base) => new AddonHTTPTransport(base),
      onSearch: (q) => searches.push(q),
    });
    const state = await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: 'batman' }] });

    assert.deepEqual(searches, ['batman']);
    assert.equal(state.catalogs.length, 2);
    for (const catalog of state.catalogs) {
      assert.equal(catalog.content.type, 'Ready');
      assert.equal(catalog.request.path.resource, 'catalog');
      assert.equal(catalog.request.path.type, 'movie');
      assert.deepEqual(catalog.request.path.extra, [{ name: 'search', value: 'batman' }]);
    }
    const names = state.catalogs.flatMap((c) => c.content.content.map((m) => m.name)).sort();
    assert.deepEqual(names, ['Batman Begins', 'Batman: The Animated Series']);
  } finally {
    await stopDemoProviders(started);
  }
});

test('series catalogs without the search extra are not requested', async () => {
  const { started, providers } = await setup();
  try {
    const model = createCatalogsWithExtra({
      providers,
      addonTransport: (base) => new AddonHTTPTransport(base),
    });
    const state = await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: 'x' }] });
    assert.ok(state.catalogs.every((c) => c.request.path.type === 'movie'));
  } finally {
    await stopDemoProviders(started);
  }
});

test('loadNextPage appends a page with the skip extra', async () => {
  const { started, providers } = await setup();
  try {
    const model = createCatalogsWithExtra({
      providers,
      addonTransport: (base) => new AddonHTTPTransport(base),
    });
    const state = await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: 'batman' }] });
    const catalog = state.catalogs[0];
    const firstPageCount = catalog.content.content.length;
    await model.loadNextPage(0);
    assert.equal(catalog.pages.length, 2);
    const second = catalog.pages[1];
    assert.equal(second.content.type, 'Ready');
    assert.equal(second.request.path.getExtraFirstValue(SKIP_EXTRA_NAME), String(firstPageCount));
    assert.deepEqual(second.request.path.extra.find((ev) => ev.name === SEARCH_EXTRA_NAME), {
      name: 'search',
      value: 'batman',
    });
  } finally {
    await stopDemoProviders(started);
  }
});

test('unload resets the state', async () => {
  const { started, providers } = await setup();
  try {
    const model = createCatalogsWithExtra({
      providers,
      addonTransport: (base) => new AddonHTTPTransport(base),
    });
    await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: 'batman' }] });
    await model.unload();
    assert.equal(model.getState().selected, null);
    assert.deepEqual(model.getState().catalogs, []);
  } finally {
    await stopDemoProviders(started);
  }
});

test('a failing provider yields an Err page instead of throwing', async () => {
  const providers = [
    {
      transportUrl: 'http://127.0.0.1:1/manifest.json',
      manifest: {
        catalogs: [{ id: 'top', type: 'movie', extra: [{ name: 'search' }] }],
      },
    },
  ];
  const model = createCatalogsWithExtra({
    providers,
    addonTransport: (base) => new AddonHTTPTransport(base),
  });
  const state = await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: 'x' }] });
  assert.equal(state.catalogs[0].content.type, 'Err');
});
