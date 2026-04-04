import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../App';
import {
  Building2,
  Mail,
  Phone,
  UserCircle2,
  BadgeCheck,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardData {
  staff_id: string;
  name: string;
  phone_number: string;
  email_address: string;
  hall_name: string;
  hall_id: string;
  has_photo: boolean;
}

const API_BASE_URL = 'http://localhost:5000/admin';

const ProvostDashboard: React.FC = () => {
  const { theme } = useAppContext();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!dashboard?.name) return 'AD';
    const parts = dashboard.name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'AD';
  }, [dashboard?.name]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load admin dashboard');
      }

      const data: AdminDashboardData = await response.json();
      setDashboard(data);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme.text}`}>Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your admin account and hall assignment.</p>
        </div>
        <button
          onClick={fetchDashboard}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${theme.border} bg-white ${theme.text} hover:bg-gray-50`}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </section>

      {loading && (
        <div className={`rounded-2xl border ${theme.border} bg-white p-8`}>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            Failed to load dashboard
          </div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          <section className={`rounded-2xl border ${theme.border} bg-white p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-black/10 bg-slate-100 flex items-center justify-center">
                <span className="text-xl font-semibold text-slate-700">{initials}</span>
              </div>
              <div>
                <h2 className={`text-2xl font-semibold ${theme.text}`}>{dashboard.name}</h2>
                <p className="text-sm text-gray-500">Welcome back. Your admin profile details are shown below.</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Admin ID</p>
              <div className="mt-2 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" />
                <span className={`font-semibold ${theme.text}`}>{dashboard.staff_id}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
              <div className="mt-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className={`${theme.text} break-all`}>{dashboard.email_address}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
              <div className="mt-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className={theme.text}>{dashboard.phone_number || 'Not provided'}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Hall Name</p>
              <div className="mt-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className={theme.text}>{dashboard.hall_name}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Hall ID</p>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className={theme.text}>{dashboard.hall_id}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Photo Status</p>
              <div className="mt-2 flex items-center gap-2">
                <UserCircle2 className="w-4 h-4" />
                <span className={theme.text}>{dashboard.has_photo ? 'Uploaded' : 'Not Uploaded'}</span>
              </div>
            </article>
          </section>

          <section className={`rounded-2xl border ${theme.border} bg-white p-5`}>
            <h3 className={`text-lg font-semibold ${theme.text}`}>Quick Actions</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/users" className={`px-4 py-2 rounded-lg text-sm font-medium ${theme.secondary} text-white`}>
                Staff Management
              </Link>
              <Link to="/students" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.border} ${theme.text}`}>
                Student Management
              </Link>
              <Link to="/rooms" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.border} ${theme.text}`}>
                Rooms
              </Link>
              <Link to="/approvals" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.border} ${theme.text}`}>
                Seat Approvals
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ProvostDashboard;
