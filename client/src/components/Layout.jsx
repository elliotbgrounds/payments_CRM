import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Building2, CheckSquare, Upload, LogOut } from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/import', icon: Upload, label: 'Import' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F5F5F5' }}>
      {/* Sidebar — Adobe dark style */}
      <aside className="w-48 flex-shrink-0 flex flex-col" style={{ background: '#2C2C2C' }}>
        {/* Logo / app name */}
        <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #444' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: '#FA0F00' }}>
            <span className="text-white text-xs font-bold leading-none">C</span>
          </div>
          <span className="text-sm font-semibold text-white tracking-wide">Payments CRM</span>
        </div>

        <nav className="flex-1 py-2">
          {nav.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-white bg-[#1473E6]'
                    : 'text-[#ABABAB] hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid #444' }}>
          <div className="text-xs mb-1 truncate" style={{ color: '#8D8D8D' }}>{user?.display_name}</div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: '#8D8D8D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = '#8D8D8D'}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#F5F5F5' }}>
        <Outlet />
      </main>
    </div>
  );
}
