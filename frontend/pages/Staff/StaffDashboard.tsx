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

interface StaffDashboardData {
  staff_id: string;
  name: string;
  phone_number: string;
  email_address: string;
  hall_name: string;
  hall_id: string;
  has_photo: boolean;
}

const API_BASE_URL = 'http://localhost:5000/staff';

const StaffDashboard: React.FC = () => {
  const { theme } = useAppContext();
  const [dashboard, setDashboard] = useState<StaffDashboardData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!dashboard?.name) return 'ST';
    const parts = dashboard.name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'ST';
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
        throw new Error(payload.error || 'Failed to load dashboard');
      }

      const data: StaffDashboardData = await response.json();
      setDashboard(data);

      if (data.has_photo) {
        const photoRes = await fetch(`${API_BASE_URL}/profile/photo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (photoRes.ok) {
          const blob = await photoRes.blob();
          setPhotoUrl(URL.createObjectURL(blob));
        } else {
          setPhotoUrl(null);
        }
      } else {
        setPhotoUrl(null);
      }
    } catch (err) {
      setDashboard(null);
      setPhotoUrl(null);
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
    // The cleanup should run on unmount; photoUrl revocation is intentionally local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme.textPrimary}`}>Staff Dashboard</h1>
          <p className={`${theme.textMuted} mt-1`}>Quick overview of your staff profile and hall assignment.</p>
        </div>
        <button
          onClick={fetchDashboard}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${theme.cardBorder} ${theme.cardBg} ${theme.textPrimary} hover:opacity-90`}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </section>

      {loading && (
        <div className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-8`}>
          <p className={theme.textMuted}>Loading dashboard...</p>
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
          <section className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-black/10 bg-white/70 flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt="Staff profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-slate-700">{initials}</span>
                )}
              </div>
              <div>
                <h2 className={`text-2xl font-semibold ${theme.textPrimary}`}>{dashboard.name}</h2>
                <p className={`text-sm ${theme.textMuted}`}>Welcome back. Here is your latest account summary.</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Staff ID</p>
              <div className="mt-2 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" />
                <span className={`font-semibold ${theme.textPrimary}`}>{dashboard.staff_id}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Email</p>
              <div className="mt-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className={`${theme.textPrimary} break-all`}>{dashboard.email_address}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Phone</p>
              <div className="mt-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className={theme.textPrimary}>{dashboard.phone_number || 'Not provided'}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Hall Name</p>
              <div className="mt-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className={theme.textPrimary}>{dashboard.hall_name}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Hall ID</p>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className={theme.textPrimary}>{dashboard.hall_id}</span>
              </div>
            </article>

            <article className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Photo Status</p>
              <div className="mt-2 flex items-center gap-2">
                <UserCircle2 className="w-4 h-4" />
                <span className={theme.textPrimary}>{dashboard.has_photo ? 'Uploaded' : 'Not Uploaded'}</span>
              </div>
            </article>
          </section>

          <section className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Quick Actions</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/profile" className={`px-4 py-2 rounded-lg text-sm font-medium ${theme.secondary} text-white`}>
                Edit Profile
              </Link>
              <Link to="/notices-manage" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.cardBorder} ${theme.textPrimary}`}>
                Manage Notices
              </Link>
              <Link to="/add-payments" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.cardBorder} ${theme.textPrimary}`}>
                Add Payments
              </Link>
              <Link to="/seat-applications" className={`px-4 py-2 rounded-lg text-sm font-medium border ${theme.cardBorder} ${theme.textPrimary}`}>
                Seat Applications
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default StaffDashboard;
