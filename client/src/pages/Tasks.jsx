import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalTasks, updateTask, getUsers } from '../api';
import { useAuth } from '../hooks/useAuth';
import { PRIORITIES, PRIORITY_COLORS, TASK_TYPES, TASK_TYPE_LABELS } from '../utils/constants';
import { format, isPast, isToday } from 'date-fns';
import { Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ assigned_to: '', status: 'open', priority: '', task_type: '', page: 1 });
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => { getUsers().then(setUsers); }, []);
  useEffect(() => {
    const params = { ...filters };
    if (myOnly) params.assigned_to = user?.id;
    getGlobalTasks(params).then(r => { setTasks(r.data); setPagination(r.pagination); });
  }, [filters, myOnly]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const complete = async (task) => {
    const updated = await updateTask(task.company_id, task.id, { status: 'completed' });
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  };

  const selCls = "bg-white border border-gray-300 text-gray-700 text-sm px-2 py-1.5 rounded-lg";

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F5F5' }}>
      <div className="px-6 py-3 border-b bg-white flex items-center gap-3 flex-wrap shadow-sm" style={{ borderColor: '#E1E1E1' }}>
        <h1 className="text-base font-semibold text-gray-900 mr-2">Tasks</h1>

        <button onClick={() => setMyOnly(m => !m)}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border"
          style={myOnly
            ? { background: '#1473E6', color: '#fff', borderColor: '#1473E6' }
            : { background: '#fff', color: '#4B4B4B', borderColor: '#E1E1E1' }
          }>
          My Tasks
        </button>

        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className={selCls}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)} className={selCls}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        <select value={filters.task_type} onChange={e => setFilter('task_type', e.target.value)} className={selCls}>
          <option value="">All Types</option>
          {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
        </select>

        {!myOnly && (
          <select value={filters.assigned_to} onChange={e => setFilter('assigned_to', e.target.value)} className={selCls}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
          </select>
        )}

        <span className="ml-auto text-xs text-gray-400">{pagination.total} tasks</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b shadow-sm" style={{ borderColor: '#E1E1E1' }}>
            <tr>
              <th className="w-8 px-3 py-2.5" />
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Task</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Company</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Assigned</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Type</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Priority</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map(t => {
              const overdue = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'completed';
              const done = t.status === 'completed';
              return (
                <tr key={t.id} className="table-row-hover bg-white">
                  <td className="px-3 py-2.5">
                    <button onClick={() => !done && complete(t)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                        ${done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
                      {done && <Check size={9} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => navigate(`/companies/${t.company_id}`)}
                      className="text-xs hover:underline font-medium" style={{ color: '#1473E6' }}>
                      {t.company_name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{t.assigned_name}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{TASK_TYPE_LABELS[t.task_type]}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {t.due_date ? (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {overdue && <AlertTriangle size={10} />}
                        {format(new Date(t.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="py-16 text-center text-gray-400 bg-white">No tasks found</div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t bg-white flex items-center justify-between" style={{ borderColor: '#E1E1E1' }}>
          <span className="text-xs text-gray-400">Page {filters.page} of {pagination.totalPages}</span>
          <div className="flex gap-1">
            <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronLeft size={14} /></button>
            <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
