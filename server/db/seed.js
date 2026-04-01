const bcrypt = require('bcryptjs');
const { initDb } = require('./database');

const db = initDb();

console.log('Seeding database...');

// Users
const users = [
  { username: 'admin', password: 'admin123', display_name: 'Admin User', role: 'admin' },
  { username: 'sarah', password: 'sarah123', display_name: 'Sarah Mitchell', role: 'user' },
  { username: 'james', password: 'james123', display_name: 'James Cooper', role: 'user' },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, display_name, role)
  VALUES (@username, @password_hash, @display_name, @role)
`);

const userIds = {};
for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run({ username: u.username, password_hash: hash, display_name: u.display_name, role: u.role });
  const row = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
  userIds[u.username] = row.id;
}

console.log('Users created: admin/admin123, sarah/sarah123, james/james123');

// Check if we already have companies seeded
const existing = db.prepare('SELECT COUNT(*) as c FROM companies').get();
if (existing.c > 0) {
  console.log('Companies already seeded, skipping.');
  process.exit(0);
}

// Companies
const insertCompany = db.prepare(`
  INSERT INTO companies (name, domain, industry, company_size, country, region, city, status, current_processor, annual_revenue, ecommerce_platform, assigned_to, source, tags)
  VALUES (@name, @domain, @industry, @company_size, @country, @region, @city, @status, @current_processor, @annual_revenue, @ecommerce_platform, @assigned_to, @source, @tags)
`);

const companies = [
  {
    name: 'TechMart UK',
    domain: 'techmart.co.uk',
    industry: 'Consumer Electronics',
    company_size: '51-200',
    country: 'United Kingdom',
    region: 'England',
    city: 'London',
    status: 'Opportunity',
    current_processor: 'Stripe',
    annual_revenue: '£4.2M',
    ecommerce_platform: 'Shopify',
    assigned_to: userIds['sarah'],
    source: 'Outbound',
    tags: JSON.stringify(['enterprise', 'high-volume', 'shopify']),
  },
  {
    name: 'FashionForward Ltd',
    domain: 'fashionforward.com',
    industry: 'Apparel & Fashion',
    company_size: '11-50',
    country: 'Ireland',
    region: 'Leinster',
    city: 'Dublin',
    status: 'Interest',
    current_processor: 'PayPal',
    annual_revenue: '€1.8M',
    ecommerce_platform: 'WooCommerce',
    assigned_to: userIds['james'],
    source: 'Inbound',
    tags: JSON.stringify(['fashion', 'cross-border', 'smb']),
  },
  {
    name: 'GrocerEasy',
    domain: 'grocereasy.ie',
    industry: 'Grocery & Food Delivery',
    company_size: '11-50',
    country: 'Ireland',
    region: 'Leinster',
    city: 'Dublin',
    status: 'Connected',
    current_processor: 'Adyen',
    annual_revenue: '€900K',
    ecommerce_platform: 'Custom',
    assigned_to: userIds['sarah'],
    source: 'Referral',
    tags: JSON.stringify(['food-delivery', 'mobile-first', 'high-frequency']),
  },
];

const companyIds = {};
for (const c of companies) {
  const res = insertCompany.run(c);
  companyIds[c.name] = res.lastInsertRowid;
}

// Contacts
const insertContact = db.prepare(`
  INSERT INTO contacts (company_id, first_name, last_name, email, phone, job_title, is_primary)
  VALUES (@company_id, @first_name, @last_name, @email, @phone, @job_title, @is_primary)
`);

const contacts = [
  { company_id: companyIds['TechMart UK'], first_name: 'Oliver', last_name: 'Chen', email: 'o.chen@techmart.co.uk', phone: '+44 20 7946 0123', job_title: 'Head of Payments', is_primary: 1 },
  { company_id: companyIds['TechMart UK'], first_name: 'Priya', last_name: 'Sharma', email: 'p.sharma@techmart.co.uk', phone: '+44 20 7946 0124', job_title: 'CFO', is_primary: 0 },
  { company_id: companyIds['FashionForward Ltd'], first_name: 'Aoife', last_name: 'Murphy', email: 'aoife@fashionforward.com', phone: '+353 1 555 0101', job_title: 'CEO & Founder', is_primary: 1 },
  { company_id: companyIds['FashionForward Ltd'], first_name: 'Conor', last_name: 'Walsh', email: 'c.walsh@fashionforward.com', phone: '+353 1 555 0102', job_title: 'Operations Manager', is_primary: 0 },
  { company_id: companyIds['GrocerEasy'], first_name: 'Declan', last_name: 'O\'Brien', email: 'declan@grocereasy.ie', phone: '+353 86 123 4567', job_title: 'CTO', is_primary: 1 },
  { company_id: companyIds['GrocerEasy'], first_name: 'Siobhan', last_name: 'Kelly', email: 'siobhan@grocereasy.ie', phone: '+353 86 987 6543', job_title: 'Head of Finance', is_primary: 0 },
];

const contactIds = {};
for (const c of contacts) {
  const res = insertContact.run(c);
  contactIds[`${c.first_name} ${c.last_name}`] = res.lastInsertRowid;
}

// Notes
const insertNote = db.prepare(`
  INSERT INTO notes (company_id, user_id, content, note_type, created_at)
  VALUES (@company_id, @user_id, @content, @note_type, @created_at)
`);

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString().replace('T', ' ').slice(0, 19);

const notes = [
  { company_id: companyIds['TechMart UK'], user_id: userIds['sarah'], content: 'Intro call with Oliver Chen. They\'re processing ~£350K/month through Stripe. Main pain point is international card acceptance rates — seeing ~2.1% decline rate on EU cards. Very interested in our cross-border solutions. Sent over pricing deck.', note_type: 'call', created_at: daysAgo(12) },
  { company_id: companyIds['TechMart UK'], user_id: userIds['sarah'], content: 'Follow-up email sent with case study from similar UK electronics retailer. Oliver confirmed they\'re evaluating us alongside Checkout.com. Decision expected end of Q2.', note_type: 'email', created_at: daysAgo(8) },
  { company_id: companyIds['TechMart UK'], user_id: userIds['admin'], content: 'Product demo scheduled for next week. Oliver is bringing the CFO (Priya Sharma) and their lead developer. Focus on API docs and settlement reporting.', note_type: 'meeting', created_at: daysAgo(3) },
  { company_id: companyIds['FashionForward Ltd'], user_id: userIds['james'], content: 'Initial outreach — Aoife responded positively. Currently on PayPal Business but unhappy with fees on international orders (a lot of US customers). Wants to reduce FX costs.', note_type: 'email', created_at: daysAgo(20) },
  { company_id: companyIds['FashionForward Ltd'], user_id: userIds['james'], content: 'Discovery call. ~€150K/month GMV. 40% of orders are cross-border. PayPal taking 3.4% + fixed fee. Also mentioned interest in BNPL options for higher-ticket items (€80-200 avg basket). Sent product overview.', note_type: 'call', created_at: daysAgo(14) },
  { company_id: companyIds['FashionForward Ltd'], user_id: userIds['james'], content: 'Aoife said they\'re in budget review until end of month. Will reconnect in 3 weeks. Positive signal — she said "when we switch" not "if we switch".', note_type: 'follow_up', created_at: daysAgo(7) },
  { company_id: companyIds['GrocerEasy'], user_id: userIds['sarah'], content: 'Referral from mutual contact at Stripe. Declan reached out directly. They\'re on Adyen but their contract is up for renewal in 4 months. Looking for better support SLAs and improved dashboard reporting.', note_type: 'general', created_at: daysAgo(30) },
  { company_id: companyIds['GrocerEasy'], user_id: userIds['sarah'], content: 'Video call with Declan and Siobhan. High-frequency transactions (avg €25, ~1200 txns/day). Very API-driven — they built their own checkout. Key ask: webhooks reliability and sub-second response times. Our infra team confirmed we can meet their SLA requirements.', note_type: 'meeting', created_at: daysAgo(18) },
  { company_id: companyIds['GrocerEasy'], user_id: userIds['admin'], content: 'Technical evaluation in progress. Declan\'s team is testing our sandbox API. Some questions about 3DS2 handling for recurring payments — looped in solutions engineering.', note_type: 'general', created_at: daysAgo(5) },
];

for (const n of notes) {
  insertNote.run(n);
}

// Tasks
const insertTask = db.prepare(`
  INSERT INTO tasks (company_id, assigned_to, created_by, title, due_date, priority, status, task_type)
  VALUES (@company_id, @assigned_to, @created_by, @title, @due_date, @priority, @status, @task_type)
`);

const futureDate = (n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
const pastDate = (n) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);

const tasks = [
  { company_id: companyIds['TechMart UK'], assigned_to: userIds['sarah'], created_by: userIds['sarah'], title: 'Run product demo for Oliver Chen + Priya Sharma', due_date: futureDate(4), priority: 'urgent', status: 'open', task_type: 'demo' },
  { company_id: companyIds['TechMart UK'], assigned_to: userIds['sarah'], created_by: userIds['admin'], title: 'Prepare custom pricing proposal for TechMart volume tier', due_date: futureDate(3), priority: 'high', status: 'in_progress', task_type: 'other' },
  { company_id: companyIds['TechMart UK'], assigned_to: userIds['admin'], created_by: userIds['sarah'], title: 'Send settlement reporting comparison doc', due_date: pastDate(1), priority: 'medium', status: 'open', task_type: 'email' },
  { company_id: companyIds['FashionForward Ltd'], assigned_to: userIds['james'], created_by: userIds['james'], title: 'Follow up call with Aoife after budget review', due_date: futureDate(7), priority: 'high', status: 'open', task_type: 'call' },
  { company_id: companyIds['FashionForward Ltd'], assigned_to: userIds['james'], created_by: userIds['james'], title: 'Send BNPL partner options (Klarna, Afterpay comparison)', due_date: futureDate(2), priority: 'medium', status: 'open', task_type: 'email' },
  { company_id: companyIds['GrocerEasy'], assigned_to: userIds['sarah'], created_by: userIds['admin'], title: 'Connect Declan with Solutions Engineering re: 3DS2 recurring', due_date: futureDate(1), priority: 'high', status: 'open', task_type: 'meeting' },
  { company_id: companyIds['GrocerEasy'], assigned_to: userIds['sarah'], created_by: userIds['sarah'], title: 'Check sandbox test results with Declan\'s dev team', due_date: futureDate(3), priority: 'medium', status: 'open', task_type: 'follow_up' },
  { company_id: companyIds['GrocerEasy'], assigned_to: userIds['admin'], created_by: userIds['sarah'], title: 'Prepare contract renewal competitive analysis vs Adyen', due_date: futureDate(14), priority: 'medium', status: 'open', task_type: 'other' },
];

for (const t of tasks) {
  insertTask.run(t);
}

// Activity log seed entries
const insertActivity = db.prepare(`
  INSERT INTO activity_log (company_id, user_id, action, detail, created_at)
  VALUES (@company_id, @user_id, @action, @detail, @created_at)
`);

const activities = [
  { company_id: companyIds['TechMart UK'], user_id: userIds['sarah'], action: 'status_change', detail: 'Status changed from Contacted → Opportunity', created_at: daysAgo(8) },
  { company_id: companyIds['TechMart UK'], user_id: userIds['sarah'], action: 'note_added', detail: 'Added call note', created_at: daysAgo(12) },
  { company_id: companyIds['FashionForward Ltd'], user_id: userIds['james'], action: 'status_change', detail: 'Status changed from Contacted → Interest', created_at: daysAgo(14) },
  { company_id: companyIds['GrocerEasy'], user_id: userIds['sarah'], action: 'status_change', detail: 'Status changed from New → Connected', created_at: daysAgo(18) },
];

for (const a of activities) {
  insertActivity.run(a);
}

console.log('Seed complete. 3 companies, 6 contacts, 9 notes, 8 tasks created.');
console.log('\nLogin credentials:');
console.log('  admin / admin123');
console.log('  sarah / sarah123');
console.log('  james / james123');
