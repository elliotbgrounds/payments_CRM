const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// List companies with pagination, search, filters, sort
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const {
    page = 1, limit = 25, search = '', status = '', processor = '',
    country = '', assigned_to = '', sort = 'name', order = 'asc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSorts = ['name', 'status', 'current_processor', 'country', 'created_at', 'updated_at'];
  const sortCol = validSorts.includes(sort) ? sort : 'name';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  let where = [];
  let params = [];

  if (search) {
    where.push('(c.name LIKE ? OR c.domain LIKE ? OR c.country LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (processor) { where.push('c.current_processor = ?'); params.push(processor); }
  if (country) { where.push('c.country = ?'); params.push(country); }
  if (assigned_to) { where.push('c.assigned_to = ?'); params.push(parseInt(assigned_to)); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM companies c ${whereClause}
  `).get(...params).count;

  const rows = db.prepare(`
    SELECT c.*, u.display_name as assigned_name,
      (SELECT MAX(created_at) FROM activity_log WHERE company_id = c.id) as last_activity
    FROM companies c
    LEFT JOIN users u ON c.assigned_to = u.id
    ${whereClause}
    ORDER BY c.${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get adjacent record IDs for navigation
router.get('/:id/adjacent', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const {
    search = '', status = '', processor = '', country = '', assigned_to = '',
    sort = 'name', order = 'asc'
  } = req.query;

  const validSorts = ['name', 'status', 'current_processor', 'country', 'created_at', 'updated_at'];
  const sortCol = validSorts.includes(sort) ? sort : 'name';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  let where = [];
  let params = [];

  if (search) {
    where.push('(name LIKE ? OR domain LIKE ? OR country LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { where.push('status = ?'); params.push(status); }
  if (processor) { where.push('current_processor = ?'); params.push(processor); }
  if (country) { where.push('country = ?'); params.push(country); }
  if (assigned_to) { where.push('assigned_to = ?'); params.push(parseInt(assigned_to)); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const allIds = db.prepare(`
    SELECT id FROM companies ${whereClause} ORDER BY ${sortCol} ${sortDir}
  `).all(...params).map(r => r.id);

  const position = allIds.indexOf(parseInt(id));
  const total = allIds.length;

  res.json({
    prev_id: position > 0 ? allIds[position - 1] : null,
    next_id: position < total - 1 ? allIds[position + 1] : null,
    position: position + 1,
    total
  });
});

// Get single company with contacts, recent notes, open tasks
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const company = db.prepare(`
    SELECT c.*, u.display_name as assigned_name
    FROM companies c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!company) return res.status(404).json({ error: 'Not found' });

  const contacts = db.prepare(`
    SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, last_name
  `).all(company.id);

  const notes = db.prepare(`
    SELECT n.*, u.display_name as author_name
    FROM notes n JOIN users u ON n.user_id = u.id
    WHERE n.company_id = ?
    ORDER BY n.created_at DESC
    LIMIT 10
  `).all(company.id);

  const tasks = db.prepare(`
    SELECT t.*, u.display_name as assigned_name, cb.display_name as created_by_name
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    JOIN users cb ON t.created_by = cb.id
    WHERE t.company_id = ? AND t.status NOT IN ('completed', 'cancelled')
    ORDER BY t.due_date ASC
  `).all(company.id);

  res.json({ ...company, contacts, notes, tasks });
});

// Create company
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const fields = ['name', 'domain', 'industry', 'company_size', 'country', 'region', 'city',
    'status', 'current_processor', 'annual_revenue', 'ecommerce_platform', 'assigned_to', 'source', 'tags'];

  const data = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) data[f] = f === 'tags' ? JSON.stringify(req.body[f] || []) : req.body[f];
  }

  const cols = Object.keys(data);
  const result = db.prepare(`
    INSERT INTO companies (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
  `).run(...Object.values(data));

  db.prepare(`
    INSERT INTO activity_log (company_id, user_id, action, detail)
    VALUES (?, ?, 'created', ?)
  `).run(result.lastInsertRowid, req.user.id, `Company "${data.name}" created`);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(company);
});

// Partial update company
router.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const allowed = ['name', 'domain', 'industry', 'company_size', 'country', 'region', 'city',
    'status', 'current_processor', 'annual_revenue', 'ecommerce_platform', 'assigned_to', 'source', 'tags'];

  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = f === 'tags' ? JSON.stringify(req.body[f]) : req.body[f];
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });

  updates.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE companies SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);

  // Log status changes
  if (req.body.status) {
    const prev = db.prepare('SELECT status FROM companies WHERE id = ?').get(req.params.id);
    db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'status_change', ?)`).run(
      req.params.id, req.user.id, `Status changed to ${req.body.status}`
    );
  } else if (Object.keys(req.body).length) {
    const changedFields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (changedFields.length) {
      db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'updated', ?)`).run(
        req.params.id, req.user.id, `Updated: ${changedFields.join(', ')}`
      );
    }
  }

  const company = db.prepare(`
    SELECT c.*, u.display_name as assigned_name
    FROM companies c LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  res.json(company);
});

// Delete company
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Bulk update
router.patch('/bulk/update', requireAuth, (req, res) => {
  const db = getDb();
  const { ids, status, assigned_to } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });

  const placeholders = ids.map(() => '?').join(', ');
  const updates = [];
  const params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  updates.push('updated_at = ?');
  params.push(new Date().toISOString().replace('T', ' ').slice(0, 19));

  db.prepare(`UPDATE companies SET ${updates.join(', ')} WHERE id IN (${placeholders})`).run(...params, ...ids);

  for (const id of ids) {
    db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'bulk_update', ?)`).run(
      id, req.user.id, `Bulk update: ${Object.entries({ status, assigned_to }).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join(', ')}`
    );
  }

  res.json({ updated: ids.length });
});

module.exports = router;
