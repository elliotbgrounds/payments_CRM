const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const contacts = db.prepare(
    'SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, last_name'
  ).all(req.params.id);
  res.json(contacts);
});

router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { first_name, last_name, email, phone, job_title, linkedin_url, is_primary } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name required' });

  if (is_primary) {
    db.prepare('UPDATE contacts SET is_primary = 0 WHERE company_id = ?').run(req.params.id);
  }

  const result = db.prepare(`
    INSERT INTO contacts (company_id, first_name, last_name, email, phone, job_title, linkedin_url, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, first_name, last_name, email || null, phone || null, job_title || null, linkedin_url || null, is_primary ? 1 : 0);

  db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'contact_added', ?)`).run(
    req.params.id, req.user.id, `Contact added: ${first_name} ${last_name}`
  );

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

// Update contact (standalone route)
router.patch('/:contactId', requireAuth, (req, res) => {
  const db = getDb();
  const allowed = ['first_name', 'last_name', 'email', 'phone', 'job_title', 'linkedin_url', 'is_primary'];
  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });

  if (updates.is_primary) {
    const contact = db.prepare('SELECT company_id FROM contacts WHERE id = ?').get(req.params.contactId);
    if (contact) db.prepare('UPDATE contacts SET is_primary = 0 WHERE company_id = ?').run(contact.company_id);
  }

  updates.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE contacts SET ${set} WHERE id = ?`).run(...Object.values(updates), req.params.contactId);

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.contactId));
});

router.delete('/:contactId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.contactId);
  res.json({ ok: true });
});

module.exports = router;
