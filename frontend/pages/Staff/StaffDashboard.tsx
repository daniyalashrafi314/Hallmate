import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import {
  Building2,
  Mail,
  Phone,
  UserCircle2,
  BadgeCheck,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ListTodo,
  CalendarDays,
  ClipboardList,
  Heart,
  Users,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface StaffTaskSummary {
  task_id: number;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  is_unseen: boolean;
}

interface StaffNoticeSummary {
  notice_id: number;
  title: string;
  is_public: boolean;
  posted_by: string;
  created_at: string;
}

interface StaffApplicationSummary {
  application_id: number;
  student_id: string;
  student_name: string;
  applied_on: string;
  priority_value: number | null;
  status: string;
}

interface StaffDonationSummary {
  donation_id: number;
  status: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
}

interface StudentStats {
  total_students: number;
  resident_count: number;
  attached_count: number;
  resident_percentage: number | null;
}

interface SeatStats {
  total_rooms: number;
  total_seats: number;
  occupied_seats: number;
  vacant_seats: number;
  occupancy_percentage: number | null;
}

interface StaffDashboardData {
  staff_id: string;
  name: string;
  role: string;
  phone_number: string;
  email_address: string;
  hall_name: string;
  hall_id: string;
  has_photo: boolean;
  top_task: StaffTaskSummary | null;
  top_notice: StaffNoticeSummary | null;
  top_application: StaffApplicationSummary | null;
  top_donation: StaffDonationSummary | null;
  student_stats: StudentStats;
  seat_stats: SeatStats;
}

const API_BASE_URL = 'http://localhost:5000/staff';

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '0%';
  return `${value}%`;
};

const formatStatusLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const StaffDashboard: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<StaffDashboardData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!dashboard?.name) return 'ST';
    const parts = dashboard.name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'ST';
  }, [dashboard?.name]);

  const openTask = () => {
    if (!dashboard?.top_task) return;
    navigate(`/tasks/${dashboard.top_task.task_id}`);
  };

  const openNoticeBoard = () => {
    navigate('/notices-manage');
  };

  const openApplication = () => {
    if (!dashboard?.top_application) return;
    navigate(`/seat-applications/${dashboard.top_application.application_id}`);
  };

  const openDonations = () => {
    navigate('/donations');
  };

  const openStudents = () => {
    navigate('/add-students');
  };

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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${theme.cardBorder} ${theme.textPrimary}`}>
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {dashboard.role}
                  </span>
                  <span className={`text-sm ${theme.textMuted}`}>Welcome back. Here is your latest hall overview.</span>
                </div>
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

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={openTask}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${dashboard.top_task ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Top Task</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>
                    {dashboard.top_task ? dashboard.top_task.title : 'No active task'}
                  </h3>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${dashboard.top_task?.is_unseen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                  <ListTodo className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_task ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{formatStatusLabel(dashboard.top_task.status)}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Priority: {dashboard.top_task.priority}</span>
                    {dashboard.top_task.is_unseen && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Unread</span>
                    )}
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${theme.textMuted}`}>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Due date</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_task.due_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Created</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_task.created_at)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`mt-4 text-sm ${theme.textMuted}`}>You do not have an active task at the moment.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-blue-600">
                <span>Open tasks</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={openNoticeBoard}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Latest Notice</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>
                    {dashboard.top_notice ? dashboard.top_notice.title : 'No recent notice'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_notice ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dashboard.top_notice.is_public ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {dashboard.top_notice.is_public ? 'Public' : 'Hall only'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      {dashboard.top_notice.posted_by}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${theme.textMuted}`}>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Posted</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_notice.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Notice ID</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>#{dashboard.top_notice.notice_id}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`mt-4 text-sm ${theme.textMuted}`}>No recent notice has been posted in this hall yet.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-amber-600">
                <span>Manage notices</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={openApplication}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${dashboard.top_application ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Top Seat Application</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>
                    {dashboard.top_application ? dashboard.top_application.student_name : 'No pending application'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_application ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                      Priority: {dashboard.top_application.priority_value ?? 'N/A'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {formatStatusLabel(dashboard.top_application.status)}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${theme.textMuted}`}>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Student ID</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{dashboard.top_application.student_id}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Applied on</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_application.applied_on)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`mt-4 text-sm ${theme.textMuted}`}>No pending seat application is waiting for review.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-violet-600">
                <span>Review applications</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={openDonations}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Active Donation</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>
                    {dashboard.top_donation ? dashboard.top_donation.description : 'No active donation'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_donation ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dashboard.top_donation.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {dashboard.top_donation.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                      Donation #{dashboard.top_donation.donation_id}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${theme.textMuted}`}>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Starts</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_donation.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Ends</p>
                      <p className={`mt-1 ${theme.textPrimary}`}>{formatDate(dashboard.top_donation.end_date)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`mt-4 text-sm ${theme.textMuted}`}>There is no currently active donation campaign.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-rose-600">
                <span>Open donations</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={openStudents}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Student Stats</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>Resident and attached students</h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Total</p>
                  <p className={`mt-1 text-2xl font-bold ${theme.textPrimary}`}>{dashboard.student_stats?.total_students ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Resident %</p>
                  <p className={`mt-1 text-2xl font-bold ${theme.textPrimary}`}>{formatPercent(dashboard.student_stats?.resident_percentage)}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Residents</p>
                  <p className={`mt-1 text-lg font-semibold ${theme.textPrimary}`}>{dashboard.student_stats?.resident_count ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Attached</p>
                  <p className={`mt-1 text-lg font-semibold ${theme.textPrimary}`}>{dashboard.student_stats?.attached_count ?? 0}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm font-medium text-emerald-600">
                <span>Open student management</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={openStudents}
              className={`text-left rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Seat Stats</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.textPrimary}`}>Room occupancy snapshot</h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Rooms</p>
                  <p className={`mt-1 text-2xl font-bold ${theme.textPrimary}`}>{dashboard.seat_stats?.total_rooms ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Seats</p>
                  <p className={`mt-1 text-2xl font-bold ${theme.textPrimary}`}>{dashboard.seat_stats?.total_seats ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Occupied</p>
                  <p className={`mt-1 text-lg font-semibold ${theme.textPrimary}`}>{dashboard.seat_stats?.occupied_seats ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-black/5 p-3">
                  <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>Vacant</p>
                  <p className={`mt-1 text-lg font-semibold ${theme.textPrimary}`}>{dashboard.seat_stats?.vacant_seats ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm font-medium text-blue-600">
                <span>Occupancy {formatPercent(dashboard.seat_stats?.occupancy_percentage)}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </section>

          
        </>
      )}
    </div>
  );
};

export default StaffDashboard;
