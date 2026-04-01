import { useState, useRef, useEffect } from 'react';
import { PROCESSORS } from '../utils/constants';
import { X } from 'lucide-react';

export default function ProcessorSelect({ value, onSave }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = PROCESSORS.filter(p => p.toLowerCase().includes(query.toLowerCase()));
  const showCustom = query && !filtered.some(p => p.toLowerCase() === query.toLowerCase());

  const select = (val) => { onSave(val); setOpen(false); setQuery(''); };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm text-gray-700 inline-edit-value flex items-center gap-1"
      >
        {value || <span className="text-gray-400 italic text-sm">Click to set</span>}
        {value && (
          <span
            onClick={e => { e.stopPropagation(); onSave(null); }}
            className="ml-1 text-gray-400 hover:text-red-500"
          >
            <X size={11} />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-lg border w-52"
          style={{ background: '#FFFFFF', borderColor: '#E1E1E1' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or type…"
            className="w-full bg-gray-50 text-gray-900 text-sm px-3 py-2 border-b rounded-t-lg"
            style={{ borderColor: '#E1E1E1' }}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          />
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map(p => (
              <button key={p} onClick={() => select(p)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-gray-700">
                {p}
              </button>
            ))}
            {showCustom && (
              <button onClick={() => select(query)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-blue-600">
                Use "{query}"
              </button>
            )}
            {!filtered.length && !showCustom && (
              <div className="px-3 py-2 text-xs text-gray-400">No match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
