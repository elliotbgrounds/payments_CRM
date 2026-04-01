const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are allowed'));
  }
});

function parseFile(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Preview: parse file and return first 10 rows + headers
router.post('/preview', requireAuth, upload.single('file'), (req, res) => {
  try {
    const rows = parseFile(req.file.buffer, req.file.originalname);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    res.json({ headers, preview: rows.slice(0, 10), total: rows.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Execute import with column mapping
router.post('/execute', requireAuth, upload.single('file'), (req, res) => {
  const db = getDb();
  let mapping;
  try {
    mapping = JSON.parse(req.body.mapping);
  } catch {
    return res.status(400).json({ error: 'Invalid mapping JSON' });
  }

  let rows;
  try {
    rows = parseFile(req.file.buffer, req.file.originalname);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const companyFields = ['name', 'domain', 'industry', 'company_size', 'country', 'region', 'city',
    'status', 'current_processor', 'annual_revenue', 'ecommerce_platform', 'source'];
  const contactFields = ['first_name', 'last_name', 'email', 'phone', 'job_title'];

  const validStatuses = ['New', 'Contacted', 'Connected', 'Interest', 'Opportunity', 'Closed'];

  const results = { imported: 0, duplicates: 0, errors: [] };

  const insertCompany = db.prepare(`
    INSERT INTO companies (name, domain, industry, company_size, country, region, city, status,
      current_processor, annual_revenue, ecommerce_platform, source, assigned_to)
    VALUES (@name, @domain, @industry, @company_size, @country, @region, @city, @status,
      @current_processor, @annual_revenue, @ecommerce_platform, @source, @assigned_to)
  `);

  const insertContact = db.prepare(`
    INSERT INTO contacts (company_id, first_name, last_name, email, phone, job_title, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const importTx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Map row to company data
        const company = { assigned_to: req.user.id };
        for (const [crmField, csvCol] of Object.entries(mapping)) {
          if (companyFields.includes(crmField) && csvCol && row[csvCol] !== undefined) {
            company[crmField] = String(row[csvCol]).trim();
          }
        }

        if (!company.name) { results.errors.push({ row: i + 2, error: 'Missing company name' }); continue; }

        // Normalize status
        if (company.status && !validStatuses.includes(company.status)) {
          company.status = 'New';
        }
        if (!company.status) company.status = 'New';

        // Dedup check
        const existing = db.prepare('SELECT id FROM companies WHERE name = ? OR (domain != "" AND domain = ?)').get(
          company.name, company.domain || '__never_match__'
        );

        let companyId;
        if (existing) {
          results.duplicates++;
          companyId = existing.id;
        } else {
          const result = insertCompany.run({
            name: company.name || null,
            domain: company.domain || null,
            industry: company.industry || null,
            company_size: company.company_size || null,
            country: company.country || null,
            region: company.region || null,
            city: company.city || null,
            status: company.status,
            current_processor: company.current_processor || null,
            annual_revenue: company.annual_revenue || null,
            ecommerce_platform: company.ecommerce_platform || null,
            source: company.source || 'Import',
            assigned_to: req.user.id,
          });
          companyId = result.lastInsertRowid;
          results.imported++;
        }

        // Import contact if mapped
        const contact = {};
        for (const [crmField, csvCol] of Object.entries(mapping)) {
          if (contactFields.includes(crmField) && csvCol && row[csvCol] !== undefined) {
            contact[crmField] = String(row[csvCol]).trim();
          }
        }

        if (contact.first_name || contact.last_name) {
          insertContact.run(
            companyId,
            contact.first_name || '',
            contact.last_name || '',
            contact.email || null,
            contact.phone || null,
            contact.job_title || null
          );
        }

      } catch (e) {
        results.errors.push({ row: i + 2, error: e.message });
      }
    }
  });

  importTx();

  db.prepare(`INSERT INTO activity_log (user_id, action, detail) VALUES (?, 'import', ?)`).run(
    req.user.id, `Imported ${results.imported} companies (${results.duplicates} duplicates, ${results.errors.length} errors)`
  );

  res.json(results);
});

module.exports = router;
