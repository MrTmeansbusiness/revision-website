const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5173;
const ROOT = __dirname; // points to igcse-radar-site folder

app.use(express.json({ limit: '25mb' }));
app.use(express.static(ROOT));

// save endpoint to persist the bank to bank_template.json
app.post('/save-bank', async (req, res) => {
  try {
    const target = path.join(ROOT, 'bank_template.json');
    const payload = req.body || {};
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(target, json, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save bank:', err);
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`IGCSE Radar site running on http://localhost:${PORT}`);
});
