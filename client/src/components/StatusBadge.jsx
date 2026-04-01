import { useState, useRef, useEffect } from 'react';
import { PIPELINE_STAGES, STAGE_COLORS } from '../utils/constants';
import { ChevronDown } from 'lucide-react';

export function StatusPill({ status, size = 'sm' }) {
  const c = STAGE_COLORS[status] || STAGE_COLORS.New;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

export default function StatusBadge({ status, onSave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 rounded-full focus:outline-none"
        style={{ boxShadow: open ? '0 0 0 2px rgba(20,115,230,0.4)' : 'none' }}
      >
        <StatusPill status={status} />
        <ChevronDown size={12} className="text-gray-400 -ml-1" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-lg border py-1 min-w-[140px]"
          style={{ background: '#FFFFFF', borderColor: '#E1E1E1' }}>
          {PIPELINE_STAGES.map(s => (
            <button
              key={s}
              onClick={() => { setOpen(false); if (s !== status) onSave(s); }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors ${s === status ? 'opacity-40' : ''}`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[s]?.hex }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
