import http from 'node:http';

export const DEMO_FEED = [
  { id: 'tt0372784', name: 'Batman Begins', type: 'movie', poster: null, imdbRating: 8.2, popularity: 900 },
  { id: 'tt0468569', name: 'The Dark Knight', type: 'movie', poster: null, imdbRating: 9.0, popularity: 1000 },
  { id: 'tt1375666', name: 'Inception', type: 'movie', poster: null, imdbRating: 8.8, popularity: 950 },
  { id: 'tt0816692', name: 'Interstellar', type: 'movie', poster: null, imdbRating: 8.7, popularity: 800 },
  { id: 'tt0133093', name: 'The Matrix', type: 'movie', poster: null, imdbRating: 8.7, popularity: 850 },
];

export const DEMO_COMMUNITY_ITEMS = [
  { id: 'tt0944947', name: 'Game of Thrones', type: 'series', poster: null, imdbRating: 9.2, popularity: 1000 },
  { id: 'tt0903747', name: 'Breaking Bad', type: 'series', poster: null, imdbRating: 9.5, popularity: 980 },
  { id: 'tt2861424', name: 'Batman: The Animated Series', type: 'series', poster: null, imdbRating: 8.9, popularity: 500 },
];

const parseExtraPath = (extraPath) => {
  const extra = new Map();
  if (!extraPath) return extra;
  for (const pair of extraPath.split('&')) {
    const [key, rawValue] = pair.split('=');
    extra.set(key, decodeURIComponent(rawValue ?? ''));
  }
  return extra;
};

export const createDemoProvider = ({ id, name, movieItems, seriesItems }) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/manifest.json') {
      return json(200, {
        id,
        version: '1.0.0',
        name,
        description: `${name} (demo provider)`,
        resources: ['catalog'],
        types: ['movie', 'series'],
        catalogs: [
          { id: 'top', type: 'movie', name: `${name} - Movies`, extra: [{ name: 'search' }, { name: 'skip' }] },
          { id: 'top', type: 'series', name: `${name} - Series`, extra: [{ name: 'skip' }] },
        ],
      });
    }

    const match = url.pathname.match(/^\/catalog\/(\w+)\/([\w-]+)(?:\/(.*))?\.json$/);
    if (!match) return json(404, { error: 'NotFound' });
    const [, type, catalogId, extraPath] = match;
    if (catalogId !== 'top') return json(404, { error: 'NotFound' });

    const extra = parseExtraPath(extraPath);
    const query = extra.get('search');
    const skip = Number(extra.get('skip') ?? 0);

    const all = type === 'movie' ? movieItems : type === 'series' ? seriesItems : null;
    if (all === null) return json(404, { error: 'NotFound' });
    if (type === 'series' && query !== undefined) return json(404, { error: 'ExtraNotSupported' });

    let metas = all;
    if (query !== undefined) {
      metas = metas.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    }
    metas = metas.slice(skip, skip + 100);
    return json(200, { metas });
  });

  return server;
};

export const startDemoProviders = async (providers) => {
  const started = [];
  for (const provider of providers) {
    await new Promise((resolve) => provider.server.listen(0, '127.0.0.1', resolve));
    const { port } = provider.server.address();
    started.push({ ...provider, transportUrl: `http://127.0.0.1:${port}/manifest.json` });
  }
  return started;
};

export const stopDemoProviders = async (providers) => {
  await Promise.all(
    providers.map(
      (provider) => new Promise((resolve) => provider.server.close(resolve))
    )
  );
};
