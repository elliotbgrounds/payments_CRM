import { useState, useRef, useEffect } from 'react';

export default function InlineField({ value, onSave, placeholder = '—', type = 'text', options, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const start = () => { setDraft(value || ''); setEditing(true); };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (draft !== (value || '')) onSave(draft || null);
  };

  const cancel = () => setEditing(false);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    if (options) {
      return (
        <select
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
          className={`bg-white text-gray-900 text-sm rounded px-2 py-0.5 border border-blue-400 ${className}`}
        >
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      );
    }
    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
          rows={3}
          className={`w-full bg-white text-gray-900 text-sm rounded px-2 py-1 border border-blue-400 resize-none ${className}`}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        className={`bg-white text-gray-900 text-sm rounded px-2 py-0.5 border border-blue-400 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={start}
      title="Click to edit"
      className={`inline-edit-value text-sm ${value ? 'text-gray-800' : 'text-gray-400 italic'} ${className}`}
    >
      {value || placeholder}
    </span>
  );
}
