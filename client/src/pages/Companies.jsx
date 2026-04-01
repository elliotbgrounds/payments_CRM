import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCompanies, bulkUpdateCompanies, getUsers } from '../api';
import { StatusPill } from '../components/StatusBadge';
import { ProcessorBadges } from '../components/ProcessorBadges';
import { PIPELINE_STAGES } from '../utils/constants';
import { format } from 'date-fns';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Companies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const processor = searchParams.get('processor') || '';
  const country = searchParams.get('country') || '';
  const assignedTo = searchParams.get('assigned_to') || '';
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const page = parseInt(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== search) { setParam('search', debouncedSearch); setParam('page', '1'); }
  }, [debouncedSearch]);

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }

  useEffect(() => { getUsers().then(setUsers); }, []);
  useEffect(() => {
    getCompanies({ page, limit: 25, search, status, processor, country, assigned_to: assignedTo, sort, order })
      .then(r => { setCompanies(r.data); setPagination(r.pagination); setSelected(new Set()); });
  }, [page, search, status, processor, country, assignedTo, sort, order]);

  const toggleSort = (col) => {
    if (sort === col) setParam('order', order === 'asc' ? 'desc' : 'asc');
    else { setParam('sort', col); setParam('order', 'asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return <ChevronUp size={11} className="text-gray-300" />;
    return order === 'asc' ? <ChevronUp size={11} style={{ color: '#1473E6' }} /> : <ChevronDown size={11} style={{ color: '#1473E6' }} />;
  };

  const toggleSelect = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSelected(prev => prev.size === companies.length ? new Set() : new Set(companies.map(c => c.id)));

  const applyBulk = async () => {
    if (!bulkStatus || !selected.size) return;
    await bulkUpdateCompanies({ ids: [...selected], status: bulkStatus });
    setCompanies(prev => prev.map(c => selected.has(c.id) ? { ...c, status: bulkStatus } : c));
    setSelected(new Set()); setBulkStatus('');
  };

  const saveNavContext = (id) => {
    sessionStorage.setItem('crm_list_context', JSON.stringify({ search, status, processor, country, assigned_to: assignedTo, sort, order }));
    navigate(`/companies/${id}`);
  };

  const inputCls = "bg-white border border-gray-300 text-gray-800 text-sm px-2 py-1.5 rounded-lg focus:border-blue-400 placeholder-gray-400";

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F5F5' }}>
      {/* Header bar */}
      <div className="px-6 py-3 border-b bg-white flex items-center gap-3 flex-wrap shadow-sm" style={{ borderColor: '#E1E1E1' }}>
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search companies…"
            className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-8 pr-3 py-1.5 rounded-lg placeholder-gray-400" />
        </div>

        <select value={status} onChange={e => { setParam('status', e.target.value); setParam('page', '1'); }}
          className={inputCls}>
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={assignedTo} onChange={e => { setParam('assigned_to', e.target.value); setParam('page', '1'); }}
          className={inputCls}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
        </select>

        <input type="text" value={country} onChange={e => { setParam('country', e.target.value); setParam('page', '1'); }}
          placeholder="Country…" className={`${inputCls} w-28`} />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">{pagination.total.toLocaleString()} records</span>
          <button
            onClick={() => navigate('/companies/new')}
            className="flex items-center gap-1 text-xs text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#1473E6' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0D66D0'}
            onMouseLeave={e => e.currentTarget.style.background = '#1473E6'}
          >
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="px-6 py-2 flex items-center gap-3 border-b text-sm" style={{ background: '#EEF4FF', borderColor: '#C0D8FF' }}>
          <span className="text-blue-700 font-medium">{selected.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded">
            <option value="">Change status…</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={applyBulk}
            className="text-xs text-white px-2 py-1 rounded"
            style={{ background: '#1473E6' }}>
            Apply
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-800">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <tr>
              <th className="w-8 px-3 py-2.5">
                <input type="checkbox" checked={selected.size === companies.length && companies.length > 0}
                  onChange={toggleAll} className="accent-blue-500" />
              </th>
              {[
                { key: 'name', label: 'Company' },
                { key: 'status', label: 'Status' },
                { key: 'current_processor', label: 'Processor' },
                { key: 'country', label: 'Location' },
                { key: null, label: 'Assigned' },
                { key: 'created_at', label: 'Added' },
              ].map(({ key, label }) => (
                <th key={label}
                  className={`text-left px-3 py-2.5 text-xs font-semibold text-gray-500 ${key ? 'cursor-pointer hover:text-gray-800 select-none' : ''}`}
                  onClick={key ? () => toggleSort(key) : undefined}
                >
                  <span className="flex items-center gap-1">{label}{key && <SortIcon col={key} />}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map(c => (
              <tr key={c.id} className="table-row-hover cursor-pointer bg-white" onClick={() => saveNavContext(c.id)}>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-blue-500" />
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                  {c.domain && <div className="text-xs text-gray-400">{c.domain}</div>}
                </td>
                <td className="px-3 py-2.5"><StatusPill status={c.status} /></td>
                <td className="px-3 py-2.5 max-w-xs"><ProcessorBadges value={c.current_processor} /></td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{[c.city, c.country].filter(Boolean).join(', ')}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{c.assigned_name || '—'}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs font-mono">
                  {c.created_at ? format(new Date(c.created_at), 'dd MMM yy') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div className="py-16 text-center text-gray-400 bg-white">No companies found</div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t bg-white flex items-center justify-between" style={{ borderColor: '#E1E1E1' }}>
          <span className="text-xs text-gray-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} records
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronLeft size={14} /></button>
            <button disabled={page >= pagination.totalPages} onClick={() => setParam('page', String(page + 1))}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
