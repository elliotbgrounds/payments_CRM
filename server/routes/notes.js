const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const notes = db.prepare(`
    SELECT n.*, u.display_name as author_name
    FROM notes n JOIN users u ON n.user_id = u.id
    WHERE n.company_id = ?
    ORDER BY n.created_at DESC
  `).all(req.params.id);
  res.json(notes);
});

router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { content, note_type, contact_id } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const result = db.prepare(`
    INSERT INTO notes (company_id, user_id, content, note_type, contact_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, req.user.id, content, note_type || 'general', contact_id || null);

  db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'note_added', ?)`).run(
    req.params.id, req.user.id, `${note_type || 'general'} note added`
  );

  const note = db.prepare(`
    SELECT n.*, u.display_name as author_name
    FROM notes n JOIN users u ON n.user_id = u.id
    WHERE n.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(note);
});

router.delete('/:noteId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.noteId, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
