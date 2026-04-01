const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Global task list
router.get('/global', requireAuth, (req, res) => {
  const db = getDb();
  const { assigned_to, status, priority, task_type, sort = 'due_date', order = 'asc', page = 1, limit = 50 } = req.query;

  let where = [];
  let params = [];

  if (assigned_to) { where.push('t.assigned_to = ?'); params.push(parseInt(assigned_to)); }
  if (status) { where.push('t.status = ?'); params.push(status); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }
  if (task_type) { where.push('t.task_type = ?'); params.push(task_type); }

  const validSorts = ['due_date', 'priority', 'created_at', 'status'];
  const sortCol = validSorts.includes(sort) ? sort : 'due_date';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM tasks t ${whereClause}`).get(...params).c;

  const tasks = db.prepare(`
    SELECT t.*, c.name as company_name, u.display_name as assigned_name, cb.display_name as created_by_name
    FROM tasks t
    JOIN companies c ON t.company_id = c.id
    JOIN users u ON t.assigned_to = u.id
    JOIN users cb ON t.created_by = cb.id
    ${whereClause}
    ORDER BY
      CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END,
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ data: tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});

// Tasks for a company
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let where = ['t.company_id = ?'];
  let params = [req.params.id];

  if (status) { where.push('t.status = ?'); params.push(status); }

  const tasks = db.prepare(`
    SELECT t.*, u.display_name as assigned_name, cb.display_name as created_by_name
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    JOIN users cb ON t.created_by = cb.id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE WHEN t.status IN ('completed','cancelled') THEN 1 ELSE 0 END,
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.due_date ASC
  `).all(...params);

  res.json(tasks);
});

// Create task for company
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { title, description, due_date, priority, task_type, assigned_to, contact_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = db.prepare(`
    INSERT INTO tasks (company_id, assigned_to, created_by, title, description, due_date, priority, task_type, contact_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    assigned_to || req.user.id,
    req.user.id,
    title,
    description || null,
    due_date || null,
    priority || 'medium',
    task_type || 'follow_up',
    contact_id || null
  );

  db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'task_created', ?)`).run(
    req.params.id, req.user.id, `Task created: ${title}`
  );

  const task = db.prepare(`
    SELECT t.*, u.display_name as assigned_name, cb.display_name as created_by_name
    FROM tasks t JOIN users u ON t.assigned_to = u.id JOIN users cb ON t.created_by = cb.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// Update task
router.patch('/:taskId', requireAuth, (req, res) => {
  const db = getDb();
  const allowed = ['title', 'description', 'due_date', 'priority', 'status', 'task_type', 'assigned_to'];
  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  if (updates.status === 'completed') {
    updates.completed_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  updates.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tasks SET ${set} WHERE id = ?`).run(...Object.values(updates), req.params.taskId);

  if (updates.status === 'completed') {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (task) {
      db.prepare(`INSERT INTO activity_log (company_id, user_id, action, detail) VALUES (?, ?, 'task_completed', ?)`).run(
        task.company_id, req.user.id, `Task completed: ${task.title}`
      );
    }
  }

  const task = db.prepare(`
    SELECT t.*, u.display_name as assigned_name, cb.display_name as created_by_name
    FROM tasks t JOIN users u ON t.assigned_to = u.id JOIN users cb ON t.created_by = cb.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json(task);
});

router.delete('/:taskId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ ok: true });
});

module.exports = router;
