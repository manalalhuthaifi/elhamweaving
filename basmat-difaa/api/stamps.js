const { put, list } = require('@vercel/blob');
const KEY = 'basmat-difaa/stamps.json', MAXN = 120;
const clean = s => String(s || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
const fresh = () => ({ target: 20, phrase: '', names: [] });
async function read() {
  const { blobs } = await list({ prefix: KEY, limit: 1 });
  if (!blobs.length) return fresh();
  const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
  const o = await r.json();
  return { target: +o.target || 20, phrase: String(o.phrase || ''), names: Array.isArray(o.names) ? o.names : [] };
}
async function write(s) {
  await put(KEY, JSON.stringify(s), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0 });
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'no-store' });
  try {
    if (req.method === 'GET') return res.status(200).json(await read());
    if (req.method !== 'POST') return res.status(405).end();
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const s = await read();
    if (b.add) {
      const n = clean(b.add.n);
      const nz = x => String(x).replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
      if (n && s.names.length < MAXN && !s.names.some(x => nz(x.n) === nz(n))) {
        s.names.push({ n, t: +b.add.t || Date.now(), p: String(b.add.p || '').slice(0, 30), m: Number.isInteger(b.add.m) ? b.add.m : 0 });
        s.target = Math.max(s.target, s.names.length, 2);
      }
    } else if (b.set) {
      s.names = (Array.isArray(b.set.names) ? b.set.names : []).slice(0, MAXN)
        .map(x => ({ n: clean(x.n), t: +x.t || 0, p: String(x.p || '').slice(0, 30), m: Number.isInteger(x.m) ? x.m : 0 })).filter(x => x.n);
      s.target = Math.min(MAXN, Math.max(2, s.names.length, parseInt(b.set.target) || 20));
      s.phrase = String(b.set.phrase || '').slice(0, 80);
    }
    await write(s);
    return res.status(200).json(s);
  } catch (e) { return res.status(500).json({ error: 'fail' }); }
};
