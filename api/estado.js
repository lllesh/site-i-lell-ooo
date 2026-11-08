const { put, list } = require('@vercel/blob');

const NOME_ARQUIVO = 'estado-painel.json';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (!body || typeof body === 'string') {
        body = JSON.parse(body || '{}');
      }
      body.atualizadoEm = new Date().toISOString();
      await put(NOME_ARQUIVO, JSON.stringify(body, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, erro: String(e) });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: NOME_ARQUIVO, limit: 1 });
      if (!blobs.length) {
        res.status(200).json(null);
        return;
      }
      const r = await fetch(blobs[0].url);
      const data = await r.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ ok: false, erro: String(e) });
    }
    return;
  }

  res.status(405).end();
};
