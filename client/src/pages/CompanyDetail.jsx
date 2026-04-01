import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCompany, updateCompany, deleteCompany, getAdjacentCompany,
  getContacts, createContact, updateContact, deleteContact,
  getNotes, createNote, deleteNote,
  getTasks, createTask, updateTask, deleteTask,
  getActivity, getUsers
} from '../api';
import InlineField from '../components/InlineField';
import StatusBadge from '../components/StatusBadge';
import ProcessorSelect from '../components/ProcessorSelect';
import { ProcessorBadges } from '../components/ProcessorBadges';
import { useAuth } from '../hooks/useAuth';
import {
  COMPANY_SIZES, INDUSTRIES, ECOMMERCE_PLATFORMS, SOURCES,
  NOTE_TYPES, NOTE_TYPE_LABELS, NOTE_TYPE_COLORS,
  TASK_TYPES, TASK_TYPE_LABELS, PRIORITIES, PRIORITY_COLORS,
} from '../utils/constants';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Trash2, Star, Plus,
  Check, AlertTriangle, Mail, Phone, X,
} from 'lucide-react';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';

const TABS = ['Contacts', 'Notes', 'Tasks', 'Activity'];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [adjacent, setAdjacent] = useState({ prev_id: null, next_id: null, position: 0, total: 0 });
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('Notes');

  const navContext = (() => {
    try { return JSON.parse(sessionStorage.getItem('crm_list_context') || '{}'); } catch { return {}; }
  })();

  const load = useCallback(async (companyId) => {
    const [c, adj, u] = await Promise.all([
      getCompany(companyId),
      getAdjacentCompany(companyId, navContext),
      getUsers(),
    ]);
    setCompany(c);
    setContacts(c.contacts || []);
    setNotes(c.notes || []);
    setTasks(c.tasks || []);
    setAdjacent(adj);
    setUsers(u);
  }, []);

  useEffect(() => { load(id); }, [id]);

  useEffect(() => {
    if (!id) return;
    if (tab === 'Notes') getNotes(id).then(setNotes);
    if (tab === 'Tasks') getTasks(id).then(setTasks);
    if (tab === 'Activity') getActivity(id).then(setActivity);
    if (tab === 'Contacts') getContacts(id).then(setContacts);
  }, [tab, id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' && adjacent.prev_id) navigate(`/companies/${adjacent.prev_id}`);
      if (e.key === 'ArrowRight' && adjacent.next_id) navigate(`/companies/${adjacent.next_id}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [adjacent]);

  const patch = async (field, value) => {
    const updated = await updateCompany(id, { [field]: value });
    setCompany(updated);
  };

  if (!company) return <div className="p-6 text-gray-400 text-sm">Loading…</div>;

  const tags = (() => { try { return JSON.parse(company.tags || '[]'); } catch { return []; } })();
  const openTaskCount = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F5F5' }}>
      {/* Nav bar */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-3 flex-shrink-0 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
        <button onClick={() => navigate('/companies')}
          className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-xs transition-colors">
          <ArrowLeft size={13} /> Companies
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 font-mono mr-1">
            {adjacent.position} / {adjacent.total.toLocaleString()}
          </span>
          <button onClick={() => adjacent.prev_id && navigate(`/companies/${adjacent.prev_id}`)}
            disabled={!adjacent.prev_id}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-500 hover:text-gray-900"
            title="Previous (←)">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => adjacent.next_id && navigate(`/companies/${adjacent.next_id}`)}
            disabled={!adjacent.next_id}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-500 hover:text-gray-900"
            title="Next (→)">
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={async () => { if (confirm('Delete this company?')) { await deleteCompany(id); navigate('/companies'); } }}
          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0 border-r bg-white overflow-y-auto" style={{ borderColor: '#E1E1E1' }}>
          <div className="p-4 space-y-4">
            {/* Name + status */}
            <div>
              <InlineField
                value={company.name}
                onSave={v => patch('name', v)}
                className="text-base font-semibold text-gray-900 w-full"
              />
              <div className="mt-2">
                <StatusBadge status={company.status} onSave={v => patch('status', v)} />
              </div>
            </div>

            {/* Processor */}
            <div className="border-t pt-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Processor</div>
              <ProcessorBadges value={company.current_processor} />
              <div className="mt-1.5">
                <ProcessorSelect value={company.current_processor} onSave={v => patch('current_processor', v)} />
              </div>
            </div>

            {/* Key fields */}
            <div className="border-t pt-3 space-y-2" style={{ borderColor: '#F0F0F0' }}>
              <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Details</div>
              {[{ label: 'Domain', key: 'domain' }, { label: 'Revenue', key: 'annual_revenue' }].map(({ label, key }) => (
                <FieldRow key={key} label={label}>
                  <InlineField value={company[key]} onSave={v => patch(key, v)} />
                </FieldRow>
              ))}
              <FieldRow label="Industry">
                <InlineField value={company.industry} onSave={v => patch('industry', v)}
                  options={['', ...INDUSTRIES].map(o => ({ value: o, label: o || '—' }))} />
              </FieldRow>
              <FieldRow label="Size">
                <InlineField value={company.company_size} onSave={v => patch('company_size', v)}
                  options={['', ...COMPANY_SIZES].map(o => ({ value: o, label: o || '—' }))} />
              </FieldRow>
              <FieldRow label="Platform">
                <InlineField value={company.ecommerce_platform} onSave={v => patch('ecommerce_platform', v)}
                  options={['', ...ECOMMERCE_PLATFORMS].map(o => ({ value: o, label: o || '—' }))} />
              </FieldRow>
              <FieldRow label="Country">
                <InlineField value={company.country} onSave={v => patch('country', v)} />
              </FieldRow>
              <FieldRow label="City">
                <InlineField value={company.city} onSave={v => patch('city', v)} />
              </FieldRow>
              <FieldRow label="Source">
                <InlineField value={company.source} onSave={v => patch('source', v)}
                  options={['', ...SOURCES].map(o => ({ value: o, label: o || '—' }))} />
              </FieldRow>
              <FieldRow label="Assigned">
                <InlineField
                  value={company.assigned_name || String(company.assigned_to || '')}
                  onSave={v => patch('assigned_to', v)}
                  options={[{ value: '', label: '—' }, ...users.map(u => ({ value: String(u.id), label: u.display_name }))]}
                />
              </FieldRow>
            </div>

            {/* Tags */}
            <div className="border-t pt-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Tags</div>
              <div className="flex flex-wrap gap-1">
                {tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                    {t}
                    <button onClick={() => patch('tags', tags.filter((_, j) => j !== i))}>
                      <X size={10} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </span>
                ))}
                <TagInput onAdd={tag => patch('tags', [...tags, tag])} />
              </div>
            </div>

            {/* Meta */}
            {company.created_at && (
              <div className="border-t pt-3 text-xs text-gray-400" style={{ borderColor: '#F0F0F0' }}>
                Added {format(new Date(company.created_at), 'dd MMM yyyy')}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b bg-white flex-shrink-0 px-1" style={{ borderColor: '#E1E1E1' }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors tab-btn
                  ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                {t}
                {t === 'Tasks' && openTaskCount > 0 && (
                  <span className="ml-1.5 text-xs text-white rounded-full px-1.5 py-0.5"
                    style={{ background: '#1473E6' }}>
                    {openTaskCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4" style={{ background: '#F5F5F5' }}>
            {tab === 'Contacts' && <ContactsTab companyId={id} contacts={contacts} setContacts={setContacts} />}
            {tab === 'Notes' && <NotesTab companyId={id} notes={notes} setNotes={setNotes} currentUser={user} />}
            {tab === 'Tasks' && <TasksTab companyId={id} tasks={tasks} setTasks={setTasks} users={users} currentUser={user} />}
            {tab === 'Activity' && <ActivityTab activity={activity} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function FieldRow({ label, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function TagInput({ onAdd }) {
  const [val, setVal] = useState('');
  const [show, setShow] = useState(false);
  if (!show) return (
    <button onClick={() => setShow(true)} className="text-xs text-gray-400 hover:text-blue-500 px-1">+ tag</button>
  );
  return (
    <input autoFocus type="text" value={val} placeholder="tag…"
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); setShow(false); }
        if (e.key === 'Escape') { setShow(false); setVal(''); }
      }}
      onBlur={() => { setShow(false); setVal(''); }}
      className="text-xs bg-white border border-gray-300 text-gray-800 rounded px-2 py-0.5 w-20"
    />
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function ContactsTab({ companyId, contacts, setContacts }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '' });

  const add = async () => {
    if (!form.first_name || !form.last_name) return;
    const c = await createContact(companyId, form);
    setContacts(prev => [c, ...prev]);
    setForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '' });
    setAdding(false);
  };

  const remove = async (contactId) => {
    await deleteContact(companyId, contactId);
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const setPrimary = async (contactId) => {
    await updateContact(companyId, contactId, { is_primary: 1 });
    setContacts(prev => prev.map(c => ({ ...c, is_primary: c.id === contactId ? 1 : 0 })));
  };

  const inputCls = "bg-white border border-gray-300 text-gray-900 text-sm px-2 py-1.5 rounded";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">{contacts.length} Contact{contacts.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setAdding(a => !a)}
          className="text-xs flex items-center gap-1 font-medium transition-colors"
          style={{ color: '#1473E6' }}>
          <Plus size={12} /> Add Contact
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border bg-white p-3 mb-3 space-y-2 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <div className="grid grid-cols-2 gap-2">
            <input autoFocus placeholder="First name *" value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              className={inputCls} />
            <input placeholder="Last name *" value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              className={inputCls} />
          </div>
          <input placeholder="Job title" value={form.job_title}
            onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
            className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Email" value={form.email} type="email"
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputCls} />
            <input placeholder="Phone" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={add}
              className="text-xs text-white px-3 py-1.5 rounded font-medium"
              style={{ background: '#1473E6' }}>Save</button>
            <button onClick={() => setAdding(false)}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {contacts.map(c => (
          <div key={c.id} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white"
                  style={{ background: '#1473E6' }}>
                  {c.first_name?.[0]}{c.last_name?.[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</span>
                    {c.is_primary === 1 && <Star size={11} className="text-amber-400 fill-amber-400" />}
                  </div>
                  {c.job_title && <div className="text-xs text-gray-500">{c.job_title}</div>}
                  <div className="flex items-center gap-3 mt-1">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs flex items-center gap-1 hover:underline"
                        style={{ color: '#1473E6' }}>
                        <Mail size={10} />{c.email}
                      </a>
                    )}
                    {c.phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} />{c.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {c.is_primary !== 1 && (
                  <button onClick={() => setPrimary(c.id)} title="Set as primary"
                    className="p-1 text-gray-300 hover:text-amber-400 transition-colors">
                    <Star size={12} />
                  </button>
                )}
                <button onClick={() => remove(c.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {contacts.length === 0 && !adding && (
          <div className="text-center py-8 text-gray-400 text-sm">No contacts yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ companyId, notes, setNotes, currentUser }) {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const note = await createNote(companyId, { content: content.trim(), note_type: noteType });
    setNotes(prev => [note, ...prev]);
    setContent('');
    setSubmitting(false);
  };

  const remove = async (noteId) => {
    await deleteNote(companyId, noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return (
    <div>
      {/* Quick-add */}
      <div className="rounded-xl border bg-white p-3 mb-4 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Add a note… (⌘+Enter to save)"
          rows={3}
          className="w-full bg-transparent text-gray-800 text-sm placeholder-gray-400 resize-none focus:outline-none"
        />
        <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: '#F0F0F0' }}>
          <select value={noteType} onChange={e => setNoteType(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
            {NOTE_TYPES.map(t => <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>)}
          </select>
          <button onClick={submit} disabled={!content.trim() || submitting}
            className="ml-auto text-xs text-white px-3 py-1.5 rounded font-medium disabled:opacity-40"
            style={{ background: '#1473E6' }}>
            Save Note
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${NOTE_TYPE_COLORS[n.note_type]}`}>
                  {NOTE_TYPE_LABELS[n.note_type]}
                </span>
                <span className="text-xs text-gray-500 font-medium">{n.author_name}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400" title={n.created_at}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
              {n.user_id === currentUser?.id && (
                <button onClick={() => remove(n.id)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No notes yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ companyId, tasks, setTasks, users, currentUser }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'medium', task_type: 'follow_up', assigned_to: '' });
  const [showCompleted, setShowCompleted] = useState(false);

  const open = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completed = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  const add = async () => {
    if (!form.title.trim()) return;
    const task = await createTask(companyId, { ...form, assigned_to: form.assigned_to || currentUser?.id });
    setTasks(prev => [task, ...prev]);
    setForm({ title: '', due_date: '', priority: 'medium', task_type: 'follow_up', assigned_to: '' });
    setShowAdd(false);
  };

  const complete = async (task) => {
    const updated = await updateTask(companyId, task.id, { status: 'completed' });
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  };

  const reopen = async (task) => {
    const updated = await updateTask(companyId, task.id, { status: 'open' });
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  };

  const remove = async (taskId) => {
    await deleteTask(companyId, taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const inputCls = "bg-white border border-gray-300 text-gray-800 text-sm px-2 py-1.5 rounded";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">{open.length} open task{open.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowAdd(a => !a)}
          className="text-xs flex items-center gap-1 font-medium" style={{ color: '#1473E6' }}>
          <Plus size={12} /> Add Task
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-white p-3 mb-3 space-y-2 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <input autoFocus placeholder="Task title *" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && add()}
            className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className={inputCls} />
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className={inputCls}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
              className={inputCls}>
              {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              className={inputCls}>
              <option value="">Assign to…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={add}
              className="text-xs text-white px-3 py-1.5 rounded font-medium"
              style={{ background: '#1473E6' }}>Save</button>
            <button onClick={() => setShowAdd(false)}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {open.map(t => <TaskRow key={t.id} task={t} onComplete={complete} onDelete={remove} />)}
        {open.length === 0 && !showAdd && (
          <div className="text-center py-6 text-gray-400 text-sm">No open tasks</div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowCompleted(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 mb-2">
            <ChevronRight size={12} className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
            {completed.length} completed
          </button>
          {showCompleted && (
            <div className="space-y-1.5 opacity-60">
              {completed.map(t => <TaskRow key={t.id} task={t} onReopen={reopen} onDelete={remove} completed />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onComplete, onReopen, onDelete, completed = false }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !completed;

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border group transition-colors
      ${completed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
      <button
        onClick={() => completed ? onReopen?.(task) : onComplete?.(task)}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center
          ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
        {completed && <Check size={9} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
          <span className="text-xs text-gray-400">{TASK_TYPE_LABELS[task.task_type]}</span>
          {task.assigned_name && <span className="text-xs text-gray-400">{task.assigned_name}</span>}
          {task.due_date && (
            <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              {isOverdue && <AlertTriangle size={10} />}
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete?.(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ activity }) {
  const ACTION_ICONS = {
    created: '✦', status_change: '◈', updated: '✎', note_added: '✉',
    task_created: '☐', task_completed: '☑', contact_added: '○',
    import: '↓', bulk_update: '⊞',
  };

  return (
    <div>
      {activity.map((a, i) => (
        <div key={a.id} className="flex items-start gap-3 py-2">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs text-gray-500 shadow-sm"
              style={{ borderColor: '#E1E1E1' }}>
              {ACTION_ICONS[a.action] || '·'}
            </div>
            {i < activity.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1 min-h-2" />}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <span className="text-sm text-gray-700">{a.detail}</span>
            <div className="text-xs text-gray-400 mt-0.5">
              {a.user_name} · {format(new Date(a.created_at), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      ))}
      {activity.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No activity recorded</div>
      )}
    </div>
  );
}
