// In-memory cache — survives across warm Lambda invocations
const _cache = new Map(); // url → { body, ct, ts }
const TTL    = 20_000;    // 20 s

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url || !url.startsWith('https://fortnite.gg/')) {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  // Serve from warm cache
  const hit = _cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': hit.ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=15, stale-while-revalidate=30`,
        'X-Cache': 'HIT',
      },
      body: hit.body,
    };
  }

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 9000);

  try {
    const res  = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept':          'text/html,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer':         'https://fortnite.gg/',
      },
    });
    clearTimeout(tid);

    const body = await res.text();
    const ct   = (res.headers.get('content-type') || 'text/plain').split(';')[0];

    _cache.set(url, { body, ct, ts: Date.now() });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=15, stale-while-revalidate=30`,
        'X-Cache': 'MISS',
      },
      body,
    };
  } catch (err) {
    clearTimeout(tid);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
