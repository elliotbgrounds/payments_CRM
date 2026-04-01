import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCompanies, getGlobalTasks, getGlobalActivity } from '../api';
import { StatusPill } from '../components/StatusBadge';
import { PIPELINE_STAGES, STAGE_COLORS, PRIORITY_COLORS } from '../utils/constants';
import { format, isPast, isToday } from 'date-fns';
import { CheckSquare, Clock, AlertTriangle, Plus } from 'lucide-react';

export default function Dashboard() {
  const [pipeline, setPipeline] = useState({});
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all(
      PIPELINE_STAGES.map(s => getCompanies({ status: s, limit: 1 }).then(r => ({ s, count: r.pagination.total })))
    ).then(results => {
      const counts = {};
      results.forEach(({ s, count }) => counts[s] = count);
      setPipeline(counts);
    });
    getGlobalTasks({ limit: 20 }).then(r => setTasks(r.data));
    getGlobalActivity().then(setActivity);
  }, []);

  const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const overdue = openTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueToday = openTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const upcoming = openTasks.filter(t => !t.due_date || (!isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))));
  const total = Object.values(pipeline).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={() => navigate('/companies')}
          className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: '#1473E6' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0D66D0'}
          onMouseLeave={e => e.currentTarget.style.background = '#1473E6'}
        >
          <Plus size={12} /> New Company
        </button>
      </div>

      {/* Pipeline bar */}
      <div className="rounded-xl border bg-white p-4 mb-6 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pipeline</span>
          <span className="text-xs text-gray-400">{total.toLocaleString()} companies total</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {PIPELINE_STAGES.map(s => (
            <button
              key={s}
              onClick={() => navigate(`/companies?status=${s}`)}
              className="rounded-lg p-3 text-center transition-opacity hover:opacity-75 border"
              style={{
                background: STAGE_COLORS[s]?.hex + '12',
                borderColor: STAGE_COLORS[s]?.hex + '30',
              }}
            >
              <div className="text-2xl font-bold text-gray-900">{(pipeline[s] || 0).toLocaleString()}</div>
              <div className="text-xs mt-0.5 font-medium" style={{ color: STAGE_COLORS[s]?.hex }}>{s}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#E1E1E1' }}>
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CheckSquare size={14} style={{ color: '#1473E6' }} /> Tasks
            </span>
            <Link to="/tasks" className="text-xs transition-colors" style={{ color: '#1473E6' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0D66D0'}
              onMouseLeave={e => e.currentTarget.style.color = '#1473E6'}>
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {overdue.length > 0 && (
              <div className="px-4 py-2">
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-1.5">
                  <AlertTriangle size={11} /> Overdue ({overdue.length})
                </div>
                {overdue.slice(0, 3).map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {dueToday.length > 0 && (
              <div className="px-4 py-2">
                <div className="text-xs text-orange-600 font-medium mb-1.5 flex items-center gap-1.5">
                  <Clock size={11} /> Due Today ({dueToday.length})
                </div>
                {dueToday.slice(0, 3).map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {upcoming.slice(0, 5).map(t => (
              <div key={t.id} className="px-4 py-1.5">
                <TaskRow task={t} />
              </div>
            ))}
            {openTasks.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">No open tasks</div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#E1E1E1' }}>
            <span className="text-sm font-semibold text-gray-800">Recent Activity</span>
          </div>
          <div className="divide-y divide-gray-100">
            {activity.map(a => (
              <div key={a.id} className="px-4 py-2 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#1473E6' }} />
                <div className="min-w-0">
                  {a.company_id && (
                    <Link to={`/companies/${a.company_id}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: '#1473E6' }}>
                      {a.company_name}
                    </Link>
                  )}
                  <div className="text-xs text-gray-600">{a.detail}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {a.user_name} · {format(new Date(a.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">No activity yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const navigate = useNavigate();
  const overdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  return (
    <button
      onClick={() => navigate(`/companies/${task.company_id}`)}
      className="w-full text-left flex items-center gap-2 py-1 group"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]?.replace('text-', 'bg-')}`} />
      <span className="flex-1 min-w-0">
        <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate block">{task.title}</span>
        <span className="text-xs text-gray-400">{task.company_name}</span>
      </span>
      {task.due_date && (
        <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
    </button>
  );
}
