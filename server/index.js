const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_DEV = process.env.NODE_ENV !== 'production';

// In dev, allow Vite dev server. In production, same-origin so no CORS needed.
if (IS_DEV) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}

app.use(express.json());

// Init DB and auto-seed if fresh deploy
const dbPath = require('path').join(__dirname, '../crm.db');
const isNewDb = !require('fs').existsSync(dbPath);
initDb();
if (isNewDb) {
  console.log('Fresh database detected — running setup...');
  require('./db/seed');
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/companies/:id/contacts', require('./routes/contacts'));
app.use('/api/companies/:id/notes', require('./routes/notes'));
app.use('/api/companies/:id/tasks', require('./routes/tasks'));
app.use('/api/companies/:id/activity', require('./routes/activity'));
app.use('/api/import', require('./routes/importRoute'));

// Global task list
const { getDb } = require('./db/database');
const { requireAuth } = require('./middleware/auth');

app.get('/api/tasks/global', requireAuth, (req, res) => {
  const db = getDb();
  const { assigned_to, status, priority, task_type, sort = 'due_date', order = 'asc', page = 1, limit = 50 } = req.query;
  const where = [], params = [];
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

app.get('/api/activity/global', requireAuth, (req, res) => {
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

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Serve built frontend (production) ─────────────────────────────────────────
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // React Router — send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // Find local network IP
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(nets)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }

  const hasFrontend = fs.existsSync(clientDist);
  console.log('\n─────────────────────────────────────');
  console.log('  Payments CRM');
  console.log('─────────────────────────────────────');
  if (hasFrontend) {
    console.log(`  Local:    http://localhost:${PORT}`);
    console.log(`  Network:  http://${localIP}:${PORT}`);
    console.log('\n  Share the Network URL with your team.');
  } else {
    console.log(`  API:      http://localhost:${PORT}`);
    console.log(`  Frontend: run "npm run dev" for local dev`);
    console.log(`            or "npm run build && npm start" to share`);
  }
  console.log('─────────────────────────────────────\n');
});
