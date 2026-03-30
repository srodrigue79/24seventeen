const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Credentials from environment variables (set in Render dashboard) ───
const TRELLO_KEY   = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_LIST  = process.env.TRELLO_LIST || '69c85c9230751dcd96acbaa9';
const PORT         = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── POST /api/submit — Create Trello card + attach files ───
app.post('/api/submit', upload.array('files', 20), async (req, res) => {
  try {
    const {
      projType, estType, dueDate, project,
      name, company, phone, email, website,
      clientCompany, clientContact, notes, fileNames
    } = req.body;

    // Validate required fields
    if (!projType || !estType || !name || !company || !phone || !email || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cardName = `[${estType}] ${company} — Due ${dueDate}`;
    const cardDesc =
`## Estimate Request — ${company}

**Project Type:** ${projType}
**Estimate Type:** ${estType}
**Bid Due Date:** ${dueDate}
**Project:** ${project || '—'}

---
### Estimating Contact
- **Name:** ${name}
- **Company:** ${company}
- **Phone:** ${phone}
- **Email:** ${email}
- **Website:** ${website || '—'}

### Client / GC
- **Company:** ${clientCompany || '—'}
- **Contact:** ${clientContact || '—'}

---
### Drawings / Files
${fileNames || 'No files attached'}

### Notes
${notes || '—'}`;

    // Create the Trello card
    const params = new URLSearchParams({
      name: cardName,
      desc: cardDesc,
      idList: TRELLO_LIST,
      due: dueDate ? new Date(dueDate).toISOString() : '',
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
    });

    const cardResp = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST' });
    const card = await cardResp.json();

    if (!card.id) {
      console.error('Trello card creation failed:', card);
      return res.status(500).json({ error: 'Trello card creation failed', detail: card });
    }

    // Attach uploaded files to the card
    const attachResults = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const form = new FormData();
          form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
          form.append('name', file.originalname);
          form.append('key', TRELLO_KEY);
          form.append('token', TRELLO_TOKEN);

          const attResp = await fetch(`https://api.trello.com/1/cards/${card.id}/attachments`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
          });
          const att = await attResp.json();
          attachResults.push({ file: file.originalname, ok: !!att.id });
        } catch (e) {
          attachResults.push({ file: file.originalname, ok: false, error: e.message });
        }
      }
    }

    res.json({
      success: true,
      cardId: card.id,
      cardUrl: card.shortUrl,
      attachments: attachResults
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ─── Serve index.html for all other routes ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`24seventeen server running on port ${PORT}`);
});
