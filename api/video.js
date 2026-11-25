export default async function handler(req, res) {
  const { url } = req.query;
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

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ mp4Url });
  } catch (err) {
    return res.status(500).json({ error: 'Server error resolving video' });
  }
}
