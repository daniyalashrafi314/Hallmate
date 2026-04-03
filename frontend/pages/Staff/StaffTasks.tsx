import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  ListTodo,
  RefreshCw,
  SquareCheckBig,
  X,
  XCircle
} from 'lucide-react';

interface StaffTaskItem {
  task_id: number;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  seen_at: string | null;
}

interface StaffTaskDetail extends StaffTaskItem {
  assignment_id: number;
  assigned_at: string;
}

interface TaskListResponse {
  tasks: StaffTaskItem[];
  pagination: {
    page: number;
    limit: number;
    total_tasks: number;
    total_pages: number;
  };
}

const API_BASE_URL = 'http://localhost:5000/staff';
const ITEMS_PER_PAGE = 10;
const TASK_STATUSES = ['all', 'pending', 'in_progress', 'completed', 'cancelled', 'submitted'] as const;
const STAFF_EDITABLE_STATUSES = ['pending', 'in_progress', 'submitted', 'cancelled'] as const;
const TERMINAL_TASK_STATUSES = new Set(['completed', 'cancelled']);

type TaskStatus = typeof TASK_STATUSES[number];
type StaffEditableStatus = typeof STAFF_EDITABLE_STATUSES[number];

const priorityConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Clock3 className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <RefreshCw className="w-4 h-4" /> },
  submitted: { label: 'Submitted', className: 'bg-violet-50 text-violet-700 border-violet-200', icon: <SquareCheckBig className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4" /> }
};

const formatDateTime = (value: string | null | undefined) => {
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

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const StaffTasks: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<StaffTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('all');
  const [selectedTask, setSelectedTask] = useState<StaffTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<StaffEditableStatus | null>(null);
  const [listRefreshing, setListRefreshing] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalTasks / ITEMS_PER_PAGE)), [totalTasks]);

  const buildListUrl = (page: number, status: TaskStatus) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(ITEMS_PER_PAGE));
    params.set('status', status);
    return `${API_BASE_URL}/tasks?${params.toString()}`;
  };

  const fetchTasks = async (page: number, status: TaskStatus) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(buildListUrl(page, status), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch tasks');
      }

      const data: TaskListResponse = await response.json();
      setTasks(data.tasks || []);
      setTotalTasks(data.pagination?.total_tasks || 0);
      setCurrentPage(data.pagination?.page || page);
    } catch (err) {
      setTasks([]);
      setTotalTasks(0);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(1, selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    if (!id) return;

    const taskId = Number(id);
    if (Number.isNaN(taskId)) return;

    openTask(taskId);
    // The task modal should open automatically when landing on /tasks/:id.
  }, [id]);

  const refreshList = async (page = currentPage, status = selectedStatus) => {
    setListRefreshing(true);
    await fetchTasks(page, status);
    setListRefreshing(false);
  };

  const openTask = async (taskId: number) => {
    try {
      setDetailLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch task details');
      }

      const data: StaffTaskDetail = await response.json();
      setSelectedTask(data);
      setTasks((prev) => prev.map((task) => (
        task.task_id === taskId
          ? { ...task, seen_at: task.seen_at || data.seen_at || new Date().toISOString() }
          : task
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTask = () => {
    setSelectedTask(null);
    if (id) {
      navigate('/tasks');
    }
  };

  const updateTaskStatus = async (status: StaffEditableStatus) => {
    if (!selectedTask) return;

    if (TERMINAL_TASK_STATUSES.has(selectedTask.status)) {
      setError('Task is locked. Completed or cancelled tasks cannot be changed by staff.');
      return;
    }

    try {
      setUpdatingStatus(status);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/tasks/${selectedTask.task_id}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.status === 401) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update task status');
      }

      setSelectedTask((prev) => (prev ? { ...prev, status } : prev));
      setTasks((prev) => prev.map((task) => (
        task.task_id === selectedTask.task_id ? { ...task, status } : task
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleStatusChange = (status: TaskStatus) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const isSelectedTaskLocked = !!selectedTask && TERMINAL_TASK_STATUSES.has(selectedTask.status);

  const renderTaskStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const renderPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority] || priorityConfig.low;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const unreadCount = tasks.filter((task) => !task.seen_at).length;
  const currentFrom = totalTasks > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const currentTo = Math.min(currentPage * ITEMS_PER_PAGE, totalTasks);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={`text-3xl font-bold ${theme.text}`}>My Tasks</h2>
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-2">Track assigned work, open task details, and update task progress.</p>
        </div>
        <button
          onClick={() => refreshList()}
          disabled={listRefreshing}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors ${listRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${listRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="mt-2 w-full md:max-w-xs px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Tasks' : status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500 md:text-right">
            Showing {currentFrom} to {currentTo} of {totalTasks} tasks
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Task error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <ListTodo className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Tasks Found</h3>
          <p className="text-gray-500">There are no tasks for the selected filter.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task) => {
              const isUnread = !task.seen_at;
              return (
                <button
                  key={task.task_id}
                  onClick={() => openTask(task.task_id)}
                  className={`w-full text-left rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md hover:border-gray-200 ${isUnread ? 'bg-blue-50/70 border-blue-100' : 'bg-white border-gray-100'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          <ListTodo className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-bold text-lg ${isUnread ? 'text-gray-900' : 'text-gray-800'}`}>{task.title}</h3>
                            {!task.seen_at && (
                              <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Task ID: {task.task_id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {renderPriorityBadge(task.priority)}
                      {renderTaskStatusBadge(task.status)}
                    </div>

                    <div className="text-sm text-gray-600 md:text-right md:min-w-[180px] space-y-1">
                      <div className="flex items-center gap-2 justify-start md:justify-end">
                        <Clock3 className="w-4 h-4 text-gray-400" />
                        <span>Due {formatDate(task.due_date)}</span>
                      </div>
                      <div className="text-xs text-gray-500">Created {formatDateTime(task.created_at)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {currentFrom} to {currentTo} of {totalTasks} tasks
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextPage = Math.max(currentPage - 1, 1);
                  setCurrentPage(nextPage);
                  fetchTasks(nextPage, selectedStatus);
                }}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => {
                  const nextPage = Math.min(currentPage + 1, totalPages);
                  setCurrentPage(nextPage);
                  fetchTasks(nextPage, selectedStatus);
                }}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className={`flex items-start justify-between gap-4 p-6 rounded-t-2xl ${theme.primary} text-white`}>
              <div>
                <h3 className="text-2xl font-bold">Task Details</h3>
                <p className="text-sm text-white/80 mt-1">Open task details and update progress.</p>
              </div>
              <button onClick={closeTask} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="py-16 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
                  <p className="text-gray-600">Loading task details...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Title</p>
                      <p className="text-lg font-semibold text-gray-900 mt-2">{selectedTask.title}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Task ID</p>
                      <p className="text-lg font-semibold text-gray-900 mt-2">#{selectedTask.task_id}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Priority</p>
                      <div className="mt-2">{renderPriorityBadge(selectedTask.priority)}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Status</p>
                      <div className="mt-2">{renderTaskStatusBadge(selectedTask.status)}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Due Date</p>
                      <p className="text-base font-semibold text-gray-900 mt-2">{formatDate(selectedTask.due_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Seen Status</p>
                      <p className="text-base font-semibold text-gray-900 mt-2">{selectedTask.seen_at ? 'Opened' : 'Unread'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Created At</p>
                      <p className="text-base font-semibold text-gray-900 mt-2">{formatDateTime(selectedTask.created_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Assigned At</p>
                      <p className="text-base font-semibold text-gray-900 mt-2">{formatDateTime(selectedTask.assigned_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Update Status</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {STAFF_EDITABLE_STATUSES.map((status) => {
                        const active = selectedTask.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => updateTaskStatus(status)}
                            disabled={updatingStatus !== null || isSelectedTaskLocked}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} ${updatingStatus === status ? 'opacity-70 cursor-wait' : ''} ${isSelectedTaskLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {updatingStatus === status ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                            {status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                          </button>
                        );
                      })}
                    </div>
                    {isSelectedTaskLocked ? (
                      <p className="text-xs text-red-600 mt-3">
                        This task is locked. Completed or cancelled tasks cannot be changed by staff.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-3">
                        Staff can only move tasks to pending, in progress, submitted, or cancelled.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeTask}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTasks;
