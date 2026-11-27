export default async function handler(req, res) {
  const { url, stream } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const match = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid X/Twitter status URL' });
    }
    const [, user, id] = match;

    const apiRes = await fetch(`https://api.fxtwitter.com/${user}/status/${id}`);
    if (!apiRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch tweet metadata' });
    }
    const data = await apiRes.json();
    const videos = data?.tweet?.media?.videos || [];
    const mp4Url = videos[0]?.url || null;

    if (!mp4Url) {
      return res.status(404).json({ error: 'No video found' });
    }

    if (stream === '1') {
      const headers = {};
      if (req.headers.range) {
        headers.Range = req.headers.range;
      }
      const videoRes = await fetch(mp4Url, { headers });
      res.status(videoRes.status);
      res.setHeader('Content-Type', videoRes.headers.get('content-type') || 'video/mp4');
      const contentLength = videoRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const contentRange = videoRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const buffer = Buffer.from(await videoRes.arrayBuffer());
      return res.send(buffer);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ mp4Url });
  } catch (err) {
    return res.status(500).json({ error: 'Server error resolving video' });
  }
}
