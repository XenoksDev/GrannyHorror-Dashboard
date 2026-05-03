exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url || !url.startsWith('https://fortnite.gg/')) {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(tid);

    const body = await response.text();
    const ct   = (response.headers.get('content-type') || 'text/plain').split(';')[0];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
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
