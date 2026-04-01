import { useState, useCallback } from 'react';
import { previewImport, executeImport } from '../api';
import { CRM_FIELDS } from '../utils/constants';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

function autoMap(headers) {
  const mapping = {};
  const rules = {
    name: ['company', 'company name', 'name', 'organization'],
    domain: ['domain', 'root domain', 'primary domain', 'website', 'url'],
    industry: ['industry', 'vertical', 'sector', 'category'],
    company_size: ['employees', 'company size', 'headcount', 'size'],
    country: ['country'],
    region: ['state', 'region', 'province'],
    city: ['city'],
    annual_revenue: ['sales revenue', 'revenue', 'annual revenue', 'arr', 'mrr'],
    ecommerce_platform: ['ecommerce platform', 'cms platform', 'platform'],
    current_processor: ['payment platforms', 'payment processor', 'processor', 'payments'],
    source: ['source', 'lead source'],
    first_name: ['first name', 'firstname', 'contact first name'],
    last_name: ['last name', 'lastname', 'contact last name'],
    email: ['email', 'emails', 'email address'],
    phone: ['phone', 'telephones', 'telephone', 'mobile'],
    job_title: ['job title', 'title', 'role', 'people'],
  };
  for (const [crmField, candidates] of Object.entries(rules)) {
    const match = headers.find(h => candidates.includes(h.toLowerCase().trim()));
    if (match) mapping[crmField] = match;
  }
  return mapping;
}

export default function Import() {
  const [stage, setStage] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (f) => {
    setFile(f); setError('');
    const fd = new FormData();
    fd.append('file', f);
    try {
      const data = await previewImport(fd);
      setPreview(data);
      setMapping(autoMap(data.headers));
      setStage('preview');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to parse file');
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const runImport = async () => {
    setStage('importing');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mapping', JSON.stringify(mapping));
    try {
      const r = await executeImport(fd);
      setResult(r); setStage('done');
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed'); setStage('preview');
    }
  };

  const reset = () => { setStage('upload'); setPreview(null); setMapping({}); setFile(null); setResult(null); setError(''); };

  const selCls = "flex-1 bg-white border border-gray-300 text-gray-700 text-xs px-2 py-1.5 rounded";

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Import</h1>
          <p className="text-xs text-gray-500 mt-0.5">CSV or Excel files. Column mapping auto-detected.</p>
        </div>
        {stage !== 'upload' && (
          <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <X size={12} /> Start over
          </button>
        )}
      </div>

      {stage === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer bg-white
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => document.getElementById('file-input').click()}
        >
          <Upload size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm text-gray-600 mb-1">Drop CSV or Excel file here</div>
          <div className="text-xs text-gray-400">or click to browse</div>
          <input id="file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {stage === 'preview' && preview && (
        <div>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-white shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <FileText size={16} style={{ color: '#1473E6' }} />
            <span className="text-sm font-medium text-gray-800">{file?.name}</span>
            <span className="text-xs text-gray-400 ml-2">{preview.total.toLocaleString()} rows · {preview.headers.length} columns</span>
          </div>

          <div className="rounded-xl border bg-white mb-4 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#E1E1E1' }}>
              <span className="text-sm font-semibold text-gray-800">Column Mapping</span>
              <span className="text-xs text-gray-400 ml-2">Auto-detected where possible</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {CRM_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
                  <select value={mapping[key] || ''} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                    className={selCls}>
                    <option value="">— skip —</option>
                    {preview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-xl border overflow-hidden mb-4 bg-white shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <div className="px-4 py-2 border-b bg-gray-50" style={{ borderColor: '#E1E1E1' }}>
              <span className="text-xs font-medium text-gray-500">Preview — first 10 rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50" style={{ borderColor: '#E1E1E1' }}>
                    {Object.entries(mapping).filter(([, v]) => v).map(([k, v]) => (
                      <th key={k} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">
                        {CRM_FIELDS.find(f => f.key === k)?.label || k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.preview.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(mapping).filter(([, v]) => v).map(([k, col]) => (
                        <td key={k} className="px-3 py-1.5 text-gray-700 max-w-xs truncate whitespace-nowrap">
                          {String(row[col] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={runImport} disabled={!mapping.name}
              className="text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
              style={{ background: '#1473E6' }}
              onMouseEnter={e => mapping.name && (e.currentTarget.style.background = '#0D66D0')}
              onMouseLeave={e => e.currentTarget.style.background = '#1473E6'}>
              Import {preview.total.toLocaleString()} Records
            </button>
            {!mapping.name && <span className="text-xs text-orange-600">Map "Company Name" field to continue</span>}
          </div>
        </div>
      )}

      {stage === 'importing' && (
        <div className="py-16 text-center bg-white rounded-xl border shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <div className="text-sm text-gray-600 mb-2">Importing records…</div>
          <div className="text-xs text-gray-400">This may take a moment for large files.</div>
        </div>
      )}

      {stage === 'done' && result && (
        <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-green-500" />
            <span className="text-base font-semibold text-gray-900">Import Complete</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Stat label="Imported" value={result.imported} color="text-green-600" bg="bg-green-50" />
            <Stat label="Duplicates skipped" value={result.duplicates} color="text-orange-600" bg="bg-orange-50" />
            <Stat label="Errors" value={result.errors?.length || 0} color="text-red-600" bg="bg-red-50" />
          </div>
          {result.errors?.length > 0 && (
            <div className="rounded-lg p-3 bg-red-50 border border-red-100 mb-4">
              <div className="text-xs font-semibold text-red-600 mb-2">Errors ({result.errors.length})</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-700">Row {e.row}: {e.error}</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <a href="/companies" className="text-sm text-white font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ background: '#1473E6' }}>
              View Companies
            </a>
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, bg }) {
  return (
    <div className={`text-center p-3 rounded-lg border border-transparent ${bg}`}>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
