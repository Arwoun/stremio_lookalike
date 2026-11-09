import { AddonHTTPTransport } from '../core/addonTransport.js';
import { createCatalogsWithExtra, SEARCH_EXTRA_NAME } from '../core/catalogsWithExtra.js';
import { LocalSearch } from '../core/localSearch.js';
import { SearchHistory } from '../core/searchHistory.js';
import {
  createDemoProvider,
  DEMO_COMMUNITY_ITEMS,
  DEMO_FEED,
  startDemoProviders,
  stopDemoProviders,
} from '../providers/demoProvider.js';

const query = process.argv.slice(2).join(' ').trim() || 'batman';

const providers = await startDemoProviders([
  {
    server: createDemoProvider({
      id: 'demo-cinemeta',
      name: 'Demo Cinemeta',
      movieItems: DEMO_FEED,
      seriesItems: [],
    }),
  },
  {
    server: createDemoProvider({
      id: 'demo-community',
      name: 'Demo Community',
      movieItems: DEMO_COMMUNITY_ITEMS,
      seriesItems: DEMO_COMMUNITY_ITEMS,
    }),
  },
]);

try {
  const descriptors = [];
  for (const provider of providers) {
    const transport = new AddonHTTPTransport(provider.transportUrl);
    const manifest = await transport.manifest();
    descriptors.push({ transportUrl: provider.transportUrl, manifest });
  }

  const history = new SearchHistory();
  const model = createCatalogsWithExtra({
    providers: descriptors,
    addonTransport: (base) => new AddonHTTPTransport(base),
    onSearch: (q) => history.add(q),
  });

  console.log(`Search: "${query}"`);
  console.log('Dispatch: Load CatalogsWithExtra { extra: [[\'search\', query]] }\n');

  await model.load({ type: null, extra: [{ name: SEARCH_EXTRA_NAME, value: query }] });

  const { catalogs } = model.getState();
  if (catalogs.length === 0) {
    console.log('No provider supports the `search` extra.');
  }
  for (const catalog of catalogs) {
    const provider = descriptors.find((d) => d.transportUrl === catalog.request.base);
    const url = new AddonHTTPTransport(catalog.request.base).resourceUrl(catalog.request.path);
    console.log(`[${provider.manifest.name}] ${catalog.request.path.type}/${catalog.request.path.id}`);
    console.log(`  GET ${url}`);
    if (catalog.content?.type === 'Ready') {
      if (catalog.content.content.length === 0) console.log('  (empty)');
      for (const meta of catalog.content.content) {
        console.log(`  - ${meta.name} (${meta.id})`);
      }
    } else if (catalog.content?.type === 'Err') {
      if (catalog.content.content !== 'EmptyContent') console.log(`  error: ${catalog.content.content}`);
    } else {
      console.log('  loading...');
    }
    console.log('');
  }

  const localSearch = new LocalSearch([...DEMO_FEED, ...DEMO_COMMUNITY_ITEMS]);
  console.log('Local autocomplete (top 5):');
  for (const item of localSearch.search(query, 5)) {
    console.log(`  - ${item.name} (${item.id})`);
  }

  console.log('\nSearch history:');
  for (const item of history.items) {
    console.log(`  - ${item.query} -> ${item.deepLinks.search}`);
  }
} finally {
  await stopDemoProviders(providers);
}
