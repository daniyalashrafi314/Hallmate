import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X
} from 'lucide-react';

interface AdminTaskItem {
  task_id: number;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'submitted';
  due_date: string | null;
  created_at: string;
  staff_id: string;
  staff_name: string;
}

interface AdminTaskDetails extends AdminTaskItem {
  description: string;
  assignment_id: number;
  assigned_at: string;
  seen_at: string | null;
  updated_at: string | null;
  staff_role: string;
}

interface StaffOption {
  staff_id: string;
  name: string;
  role: string;
}

interface TaskListResponse {
  tasks: AdminTaskItem[];
  pagination: {
    page: number;
    limit: number;
    total_tasks: number;
    total_pages: number;
  };
}

const API_BASE = 'http://localhost:5000/admin';
const ITEMS_PER_PAGE = 10;
const ALL_STATUSES = ['all', 'pending', 'in_progress', 'completed', 'cancelled', 'submitted'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

const statusStyleMap: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  submitted: 'bg-violet-100 text-violet-700 border-violet-200'
};

const priorityStyleMap: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

const humanize = (value: string) => value.replace('_', ' ').replace(/\b\w/g, (s) => s.toUpperCase());

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTodayISODate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('hallmate_token');
  return { Authorization: `Bearer ${token}` };
};

const handleAuthRedirect = (status: number) => {
  if (status === 401 || status === 403) {
    window.location.href = '#/login';
    return true;
  }
  return false;
};

const ProvostTasksList: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [statusFilter, setStatusFilter] = useState<(typeof ALL_STATUSES)[number]>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as (typeof PRIORITIES)[number],
    due_date: '',
    assigned_staff_id: ''
  });
  const todayISODate = useMemo(() => getTodayISODate(), []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalTasks / ITEMS_PER_PAGE)), [totalTasks]);
  const from = totalTasks > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
  const to = Math.min(page * ITEMS_PER_PAGE, totalTasks);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTasks = async (targetPage: number, targetStatus = statusFilter, targetSearch = search) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('status', targetStatus);
      if (targetSearch) {
        params.set('search', targetSearch);
      }

      const response = await fetch(`${API_BASE}/tasks?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch tasks');
      }

      const data: TaskListResponse = await response.json();
      setTasks(data.tasks || []);
      setTotalTasks(data.pagination?.total_tasks || 0);
      setPage(data.pagination?.page || targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
      setTotalTasks(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(1, statusFilter, search);
  }, [statusFilter, search]);

  const fetchStaffOptions = async () => {
    try {
      setStaffLoading(true);
      const response = await fetch(`${API_BASE}/task-staff`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch staff list');
      }

      const data: StaffOption[] = await response.json();
      setStaffOptions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff list');
      setStaffOptions([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      assigned_staff_id: ''
    });
    setShowCreateModal(true);
    fetchStaffOptions();
  };

  const submitCreateTask = async () => {
    if (!form.title.trim() || !form.assigned_staff_id.trim()) {
      setError('Title and assigned staff id are required.');
      return;
    }

    if (form.due_date && form.due_date < todayISODate) {
      setError('Due date cannot be earlier than today.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          due_date: form.due_date || null,
          assigned_staff_id: form.assigned_staff_id.trim()
        })
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create task');
      }

      setShowCreateModal(false);
      await fetchTasks(1, statusFilter, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Task Management</h2>
          <p className="text-gray-500">Create, review, and update hall staff tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTasks(page, statusFilter, search)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold ${theme.primary}`}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof ALL_STATUSES)[number])}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>{status === 'all' ? 'All' : humanize(status)}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-black text-gray-400 uppercase">Search (Task title or Staff ID)</label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by task title or staff id"
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-3">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Tasks Found</h3>
          <p className="text-gray-500">Try changing filters or create a new task.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task) => (
              <button
                key={task.task_id}
                onClick={() => navigate(`/tasks/${task.task_id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Task #{task.task_id}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5" />
                          {task.staff_name} ({task.staff_id})
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs rounded-full border font-bold uppercase ${priorityStyleMap[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2.5 py-1 text-xs rounded-full border font-bold ${statusStyleMap[task.status]}`}>
                      {humanize(task.status)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 md:text-right space-y-1">
                    <div className="flex items-center gap-1 md:justify-end">
                      <Clock3 className="w-3.5 h-3.5" />
                      Due: {formatDate(task.due_date)}
                    </div>
                    <div>Created: {formatDate(task.created_at)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-gray-600">
            <p>Showing {from} to {to} of {totalTasks} tasks</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextPage = Math.max(page - 1, 1);
                  setPage(nextPage);
                  fetchTasks(nextPage, statusFilter, search);
                }}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                onClick={() => {
                  const nextPage = Math.min(page + 1, totalPages);
                  setPage(nextPage);
                  fetchTasks(nextPage, statusFilter, search);
                }}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className={`p-5 rounded-t-2xl ${theme.primary} text-white flex items-center justify-between`}>
              <h3 className="text-xl font-bold">Create & Assign Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs uppercase text-gray-400 font-black">Task Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-gray-400 font-black">Assign Staff</label>
                <select
                  value={form.assigned_staff_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, assigned_staff_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="">Select a staff member</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.staff_id} value={staff.staff_id}>
                      {staff.name} ({staff.staff_id})
                    </option>
                  ))}
                </select>
                {staffLoading && <p className="text-xs text-gray-500 mt-1">Loading staff list...</p>}
                {!staffLoading && staffOptions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No available staff found under your hall.</p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase text-gray-400 font-black">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task"
                  rows={4}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase text-gray-400 font-black">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as (typeof PRIORITIES)[number] }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{humanize(priority)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase text-gray-400 font-black">Due Date</label>
                  <input
                    type="date"
                    min={todayISODate}
                    value={form.due_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCreateTask}
                  disabled={creating}
                  className={`px-4 py-2 rounded-lg text-white font-semibold ${theme.primary} ${creating ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProvostTaskDetails: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<AdminTaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTask = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch task details');
      }

      const data: AdminTaskDetails = await response.json();
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task details');
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const updateTaskStatus = async (newStatus: AdminTaskItem['status']) => {
    if (!task) return;

    try {
      setStatusUpdating(true);
      setError(null);

      const response = await fetch(`${API_BASE}/tasks/${task.task_id}/status`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update task status');
      }

      setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const deleteTask = async () => {
    if (!task || deleting) return;

    const confirmed = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`${API_BASE}/tasks/${task.task_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete task');
      }

      navigate('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back To Tasks
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-3">Loading task details...</p>
        </div>
      ) : !task ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">Task Not Found</h3>
          <p className="text-gray-500">The requested task could not be loaded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-400 font-black">Title</p>
              <p className="mt-2 font-semibold text-gray-900">{task.title}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-400 font-black">Assigned Staff</p>
              <p className="mt-2 font-semibold text-gray-900">{task.staff_name} ({task.staff_id})</p>
              <p className="text-xs text-gray-500 mt-1">Role: {task.staff_role}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-400 font-black">Assigned At</p>
              <p className="mt-2 font-semibold text-gray-900">{formatDate(task.assigned_at)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-400 font-black">Seen At</p>
              <p className="mt-2 font-semibold text-gray-900">{task.seen_at ? formatDate(task.seen_at) : 'Not opened yet'}</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs uppercase text-gray-400 font-black">Description</p>
            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase text-gray-400 font-black">Update Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_STATUSES.filter((status) => status !== 'all').map((status) => (
                <button
                  key={status}
                  disabled={statusUpdating}
                  onClick={() => updateTaskStatus(status as AdminTaskItem['status'])}
                  className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${task.status === status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} ${statusUpdating ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {humanize(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            
            <button
              onClick={deleteTask}
              disabled={deleting}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-300 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Task'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProvostTasks: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <ProvostTaskDetails />;
  }

  return <ProvostTasksList />;
};

export default ProvostTasks;
