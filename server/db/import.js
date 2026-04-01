/**
 * CLI import script: node server/db/import.js <file> [--mapping=path/to/mapping.json]
 *
 * Default mapping for Magento_Global_Payments_BW.csv:
 *   Company         → name
 *   Root Domain     → domain
 *   Vertical        → industry
 *   Employees       → company_size
 *   City            → city
 *   State           → region
 *   Country         → country
 *   Sales Revenue   → annual_revenue
 *   eCommerce Platform → ecommerce_platform
 *   Payment Platforms  → current_processor
 *   Emails          → email (contact)
 *   Telephones      → phone (contact)
 *   People          → job_title / contact name (parsed)
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./database');

const filePath = process.argv[2];
const mappingArg = process.argv.find(a => a.startsWith('--mapping='));

if (!filePath) {
  console.error('Usage: node server/db/import.js <file.csv|file.xlsx> [--mapping=mapping.json]');
  process.exit(1);
}

const DEFAULT_MAPPING = {
  name: 'Company',
  domain: 'Root Domain',
  industry: 'Vertical',
  company_size: 'Employees',
  city: 'City',
  region: 'State',
  country: 'Country',
  annual_revenue: 'Sales Revenue',
  ecommerce_platform: 'eCommerce Platform',
  current_processor: 'Payment Platforms',
  email: 'Emails',
  phone: 'Telephones',
  job_title: 'People',
};

let mapping = DEFAULT_MAPPING;
if (mappingArg) {
  mapping = JSON.parse(fs.readFileSync(mappingArg.split('=')[1], 'utf8'));
}

const db = initDb();

// Find or create admin user for attribution
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminUser) {
  console.error('No admin user found. Run: npm run setup');
  process.exit(1);
}

const abs = path.resolve(filePath);
const workbook = XLSX.readFile(abs, { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log(`Loaded ${rows.length} rows from ${path.basename(filePath)}`);

const insertCompany = db.prepare(`
  INSERT INTO companies (name, domain, industry, company_size, city, region, country,
    annual_revenue, ecommerce_platform, current_processor, source, assigned_to)
  VALUES (@name, @domain, @industry, @company_size, @city, @region, @country,
    @annual_revenue, @ecommerce_platform, @current_processor, @source, @assigned_to)
`);

const insertContact = db.prepare(`
  INSERT INTO contacts (company_id, first_name, last_name, email, phone, job_title, is_primary)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

const validStatuses = ['New', 'Contacted', 'Connected', 'Interest', 'Opportunity', 'Closed'];
let imported = 0, duplicates = 0, errors = 0;

/**
 * Parse "People" field: "First Last - Title" or just "First Last"
 */
function parsePeople(val) {
  if (!val) return { first_name: '', last_name: '', job_title: '' };
  // Multiple people separated by ';' — take first
  const first = val.split(';')[0].trim();
  const dashIdx = first.lastIndexOf(' - ');
  let name = first, job_title = '';
  if (dashIdx > -1) {
    name = first.slice(0, dashIdx).trim();
    job_title = first.slice(dashIdx + 3).trim();
  }
  const parts = name.split(' ');
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
    job_title,
  };
}

const importTx = db.transaction(() => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const name = String(row[mapping.name] || '').trim();
      if (!name) { errors++; continue; }

      const domain = String(row[mapping.domain] || '').trim();

      // Dedup
      const existing = db.prepare(
        'SELECT id FROM companies WHERE name = ? OR (domain != "" AND domain != NULL AND domain = ?)'
      ).get(name, domain || '__never__');

      let companyId;
      if (existing) {
        duplicates++;
        companyId = existing.id;
      } else {
        const res = insertCompany.run({
          name,
          domain: domain || null,
          industry: String(row[mapping.industry] || '').trim() || null,
          company_size: String(row[mapping.company_size] || '').trim() || null,
          city: String(row[mapping.city] || '').trim() || null,
          region: String(row[mapping.region] || '').trim() || null,
          country: String(row[mapping.country] || '').trim() || null,
          annual_revenue: String(row[mapping.annual_revenue] || '').trim() || null,
          ecommerce_platform: String(row[mapping.ecommerce_platform] || '').trim() || null,
          current_processor: String(row[mapping.current_processor] || '').trim() || null,
          source: 'Import',
          assigned_to: adminUser.id,
        });
        companyId = res.lastInsertRowid;
        imported++;
      }

      // Contact from People field
      const peopleVal = String(row[mapping.job_title] || '').trim();
      const email = String(row[mapping.email] || '').trim();
      const phone = String(row[mapping.phone] || '').trim();

      if (peopleVal || email) {
        const { first_name, last_name, job_title } = parsePeople(peopleVal);
        if (first_name || email) {
          try {
            insertContact.run(
              companyId,
              first_name || 'Unknown',
              last_name || '',
              email || null,
              phone || null,
              job_title || null
            );
          } catch { /* ignore duplicate contact */ }
        }
      }

      if ((i + 1) % 1000 === 0) {
        console.log(`  ${i + 1} / ${rows.length} processed…`);
      }
    } catch (e) {
      errors++;
      if (errors <= 5) console.warn(`Row ${i + 2}: ${e.message}`);
    }
  }
});

importTx();

console.log(`\nDone.`);
console.log(`  Imported:   ${imported.toLocaleString()}`);
console.log(`  Duplicates: ${duplicates.toLocaleString()}`);
console.log(`  Errors:     ${errors.toLocaleString()}`);
