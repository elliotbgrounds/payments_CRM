const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Company activity log
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const activity = db.prepare(`
    SELECT a.*, u.display_name as user_name
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.company_id = ?
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  res.json(activity);
});

// Global activity feed
router.get('/global', requireAuth, (req, res) => {
  const db = getDb();
  const activity = db.prepare(`
    SELECT a.*, u.display_name as user_name, c.name as company_name
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN companies c ON a.company_id = c.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `).all();
  res.json(activity);
});

module.exports = router;
