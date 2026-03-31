const express = require('express');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const TRELLO_KEY   = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_LIST  = process.env.TRELLO_LIST || '69c85c9230751dcd96acbaa9';
const PORT         = process.env.PORT || 3000;

const publicDir = path.join(__dirname, 'public');
const staticDir = fs.existsSync(publicDir) ? publicDir : __dirname;
app.use(express.static(staticDir));
app.use(express.json());

app.post('/api/submit', upload.array('files', 20), async (req, res) => {
  try {
    const { projType, estType, dueDate, project, name, company, phone, email, website, clientCompany, clientContact, notes, fileNames } = req.body;
    if (!projType || !estType || !name || !company || !phone || !email || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cardName = `[${estType}] ${company} — Due ${dueDate}`;
    const cardDesc = `## Estimate Request — ${company}\n\n**Project Type:** ${projType}\n**Estimate Type:** ${estType}\n**Bid Due Date:** ${dueDate}\n**Project:** ${project || '—'}\n\n---\n### Estimating Contact\n- **Name:** ${name}\n- **Company:** ${company}\n- **Phone:** ${phone}\n- **Email:** ${email}\n- **Website:** ${website || '—'}\n\n### Client / GC\n- **Company:** ${clientCompany || '—'}\n- **Contact:** ${clientContact || '—'}\n\n---\n### Drawings / Files\n${fileNames || 'No files attached'}\n\n### Notes\n${notes || '—'}`;
    const params = new URLSearchParams({ name: cardName, desc: cardDesc, idList: TRELLO_LIST, due: dueDate ? new Date(dueDate).toISOString() : '', key: TRELLO_KEY, token: TRELLO_TOKEN });
    const cardResp = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST' });
    const card = await cardResp.json();
    if (!card.id) return res.status(500).json({ error: 'Trello card creation failed', detail: card });
    const attachResults = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const form = new FormData();
          form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
          form.append('name', file.originalname);
          form.append('key', TRELLO_KEY);
          form.append('token', TRELLO_TOKEN);
          const attResp = await fetch(`https://api.trello.com/1/cards/${card.id}/attachments`, { method: 'POST', body: form, headers: form.getHeaders() });
          const att = await attResp.json();
          attachResults.push({ file: file.originalname, ok: !!att.id });
        } catch (e) { attachResults.push({ file: file.originalname, ok: false, error: e.message }); }
      }
    }
    res.json({ success: true, cardId: card.id, cardUrl: card.shortUrl, attachments: attachResults });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

app.get('/', (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return res.redirect(302, '/mobile');
  next();
});

app.get('/mobile', (req, res) => { res.sendFile(path.join(staticDir, 'mobile.html')); });
app.get('/ping', (req, res) => res.send('pong'));
app.get('*', (req, res) => { res.sendFile(path.join(staticDir, 'index.html')); });

app.listen(PORT, () => {
  console.log(`24seventeen running on port ${PORT}`);
  const SITE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try { await fetch(`${SITE_URL}/ping`); } catch(e) {}
  }, 14 * 60 * 1000);
});
