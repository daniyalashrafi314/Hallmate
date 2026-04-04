import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  Home,
  ListTodo,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserCircle2,
  Users,
  Layers,
  Grid,
  ThumbsUp,
  Clock3
} from 'lucide-react';

interface AdminDashboardData {
  staff_id: string;
  name: string;
  phone_number: string;
  email_address: string;
  hall_name: string;
  hall_id: string;
  has_photo: boolean;
  student_stats: {
    total_students: number;
    resident_count: number;
    attached_count: number;
  };
  seat_stats: {
    total_rooms: number;
    total_seats: number;
    occupied_seats: number;
    vacant_seats: number;
  };
  pending_tasks: number;
  pending_seat_approvals: number;
  pending_donations: number;
  pending_complaints: number;
  upcoming_events: number;
  top_task: {
    task_id: number;
    title: string;
    priority: string;
    status: string;
    due_date: string | null;
    created_at: string;
    staff_id: string;
    staff_name: string;
  } | null;
  top_application: {
    application_id: number;
    student_id: string;
    student_name: string;
    applied_on: string;
    priority_value: number | null;
    status: string;
  } | null;
  top_donation: {
    donation_id: number;
    status: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
  top_complaint: {
    complaint_id: number;
    type: string;
    description_preview: string;
    date: string;
    upvote_count: number;
  } | null;
  top_event: {
    event_id: number;
    name: string;
    date: string;
    is_public: boolean;
    is_own_hall: boolean;
  } | null;
}

const API_BASE_URL = 'http://localhost:5000/admin';

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

const formatStatus = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const statCardBase = 'rounded-2xl border bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md';

const ProvostDashboard: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!dashboard?.name) return 'AD';
    const parts = dashboard.name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'AD';
  }, [dashboard?.name]);

  const seatOccupancy = useMemo(() => {
    if (!dashboard?.seat_stats?.total_seats) return 0;
    return Math.round((dashboard.seat_stats.occupied_seats / dashboard.seat_stats.total_seats) * 100);
  }, [dashboard?.seat_stats]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      setPhotoUrl(null);

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

      if (data.has_photo) {
        const photoRes = await fetch(`${API_BASE_URL}/profile/photo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (photoRes.ok) {
          const blob = await photoRes.blob();
          setPhotoUrl(URL.createObjectURL(blob));
        }
      }
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard');
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
    // photoUrl is intentionally excluded to avoid revoking the object URL while it is still displayed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickLinks = [
    { to: '/users', label: 'Staff Management', icon: Users, description: 'Manage staff members and hall users.' },
    { to: '/students', label: 'Student Management', icon: Home, description: 'Add, inspect, and manage residents.' },
    { to: '/rooms', label: 'Rooms', icon: Grid, description: 'Review room and seat allocation state.' },
    { to: '/approvals', label: 'Seat Approvals', icon: ClipboardList, description: 'Review pending seat applications.' },
    { to: '/tasks', label: 'Tasks', icon: ListTodo, description: 'Track staff tasks and assignments.' },
    { to: '/donations', label: 'Donations', icon: Heart, description: 'Approve or refuse donation requests.' },
    { to: '/complaints', label: 'Complaints', icon: FileText, description: 'Resolve or dismiss student complaints.' },
    { to: '/events', label: 'Events', icon: CalendarDays, description: 'Create and manage hall events.' },
    { to: '/forum', label: 'Forum', icon: MessageSquare, description: 'Review hall discussion threads.' }
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className={`text-3xl font-bold ${theme.text}`}>Provost Dashboard</h1>
          <p className="text-gray-500 mt-1">Hall overview, operational shortcuts, and the most important pending items.</p>
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
          <section className={`rounded-2xl border ${theme.border} bg-white p-6 shadow-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-black/10 bg-slate-100 flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt="Admin profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-slate-700">{initials}</span>
                )}
              </div>
              <div>
                <h2 className={`text-2xl font-semibold ${theme.text}`}>{dashboard.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    <BadgeCheck className="w-3.5 h-3.5" /> Admin / Provost
                  </span>
                  <span>Hall: {dashboard.hall_name}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Students</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.student_stats?.total_students ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Residents: {dashboard.student_stats?.resident_count ?? 0} | Attached: {dashboard.student_stats?.attached_count ?? 0}</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Rooms</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.seat_stats?.total_rooms ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">{dashboard.seat_stats?.total_seats ?? 0} seats total</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Seat Occupancy</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{seatOccupancy}%</h3>
              <p className="mt-1 text-sm text-gray-500">{dashboard.seat_stats?.occupied_seats ?? 0} occupied / {dashboard.seat_stats?.vacant_seats ?? 0} vacant</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending Approvals</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.pending_seat_approvals ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Seat applications awaiting review</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending Tasks</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.pending_tasks ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Active staff work items</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Complaints</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.pending_complaints ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Pending resident complaints</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Donations</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.pending_donations ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Pending donation requests</p>
            </article>

            <article className={statCardBase}>
              <p className="text-xs uppercase tracking-wide text-gray-500">Events</p>
              <h3 className={`mt-2 text-2xl font-bold ${theme.text}`}>{dashboard.upcoming_events ?? 0}</h3>
              <p className="mt-1 text-sm text-gray-500">Upcoming hall or public events</p>
            </article>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className={`rounded-2xl border ${theme.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Top Pending Task</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.text}`}>
                    {dashboard.top_task ? dashboard.top_task.title : 'No active task'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ListTodo className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_task ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{formatStatus(dashboard.top_task.status)}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Priority: {dashboard.top_task.priority}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500">
                    <div>
                      <p className="text-xs uppercase tracking-wide">Assigned staff</p>
                      <p className="mt-1 text-gray-800">{dashboard.top_task.staff_name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Due date</p>
                      <p className="mt-1 text-gray-800">{formatDate(dashboard.top_task.due_date)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">There are no active staff tasks right now.</p>
              )}

              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
              >
                Open tasks <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Top Complaint</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.text}`}>
                    {dashboard.top_complaint ? dashboard.top_complaint.type : 'No pending complaint'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_complaint ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-700 line-clamp-3">{dashboard.top_complaint.description_preview}</p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">{dashboard.top_complaint.upvote_count} upvotes</span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">{formatDate(dashboard.top_complaint.date)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No pending complaints are waiting for review.</p>
              )}

              <button
                type="button"
                onClick={() => navigate('/complaints')}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-600"
              >
                Open complaints <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Top Donation</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.text}`}>
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
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">{dashboard.top_donation.status}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500">
                    <div>
                      <p className="text-xs uppercase tracking-wide">Starts</p>
                      <p className="mt-1 text-gray-800">{formatDate(dashboard.top_donation.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Ends</p>
                      <p className="mt-1 text-gray-800">{formatDate(dashboard.top_donation.end_date)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No donation request is active at the moment.</p>
              )}

              <button
                type="button"
                onClick={() => navigate('/donations')}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-600"
              >
                Open donations <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article className={`rounded-2xl border ${theme.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Top Event</p>
                  <h3 className={`mt-2 text-lg font-semibold ${theme.text}`}>
                    {dashboard.top_event ? dashboard.top_event.name : 'No upcoming event'}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>

              {dashboard.top_event ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                      {dashboard.top_event.is_public ? 'Public' : 'Hall only'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{formatDate(dashboard.top_event.date)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No upcoming event has been scheduled yet.</p>
              )}

              <button
                type="button"
                onClick={() => navigate('/events')}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600"
              >
                Open events <ArrowRight className="w-4 h-4" />
              </button>
            </article>
          </section>

          <section className={`rounded-2xl border ${theme.border} bg-white p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>Quick Actions</h3>
                <p className="text-sm text-gray-500 mt-1">Jump directly to the pages you use most often.</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-xl border ${theme.border} bg-gray-50 p-4 hover:bg-gray-100 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        <span className={`font-semibold ${theme.text}`}>{item.label}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">{item.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ProvostDashboard;
