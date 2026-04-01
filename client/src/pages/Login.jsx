import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
      <div className="w-80">
        {/* Adobe-style logo mark */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: '#FA0F00' }}>
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">Payments CRM</div>
            <div className="text-xs text-gray-500">Sign in to continue</div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-3 py-2 rounded-lg placeholder-gray-400"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-3 py-2 rounded-lg placeholder-gray-400"
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#1473E6' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = '#0D66D0')}
              onMouseLeave={e => e.currentTarget.style.background = '#1473E6'}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
