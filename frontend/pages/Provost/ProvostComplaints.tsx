import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Globe,
  MessageSquare,
  Shield,
  ThumbsUp,
  User,
  XCircle
} from 'lucide-react';

type ComplaintStatus = 'Pending' | 'Resolved' | 'Dismissed';
type StatusFilter = 'all' | ComplaintStatus;
type ComplaintTypeFilter = 'all' | 'Room' | 'Dining' | 'Toilet' | 'Roommate' | 'Staff' | 'Facilities' | 'Other';
type VisibilityFilter = 'all' | 'public' | 'private';
type SortFilter = 'newest' | 'oldest' | 'upvotes';

interface ComplaintListItem {
  complaint_id: number;
  type: string;
  status: ComplaintStatus;
  is_public: boolean;
  is_anonymous: boolean;
  date: string;
  author_name: string;
  student_id: string | null;
  upvote_count: number;
  description_preview: string;
  is_truncated: boolean;
}

interface ComplaintDetail {
  complaint_id: number;
  type: string;
  description: string;
  status: ComplaintStatus;
  is_public: boolean;
  is_anonymous: boolean;
  date: string;
  author_name: string;
  student_id: string | null;
  author_phone: string | null;
  author_department: string | null;
  upvote_count: number;
}

interface SummaryResponse {
  by_status: {
    Pending: number;
    Resolved: number;
    Dismissed: number;
  };
  by_type: Array<{ type: string; count: number }>;
  top_upvoted: null | {
    complaint_id: number;
    type: string;
    description_preview: string;
    date: string;
    upvote_count: number;
  };
}

interface ComplaintListResponse {
  complaints: ComplaintListItem[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}

const API_BASE = 'http://localhost:5000/admin';
const ITEMS_PER_PAGE = 10;

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

const statusBadgeClass = (status: ComplaintStatus) => {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Dismissed':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};

const visibilityBadgeClass = (isPublic: boolean) =>
  isPublic ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200';

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ProvostComplaints: React.FC = () => {
  const { theme } = useAppContext();

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ComplaintTypeFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [sortFilter, setSortFilter] = useState<SortFilter>('newest');

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailById, setDetailById] = useState<Record<number, ComplaintDetail>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const visibleComplaintCount = useMemo(() => complaints.length, [complaints]);

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await fetch(`${API_BASE}/complaints/summary`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load complaint summary');
      }

      const data: SummaryResponse = await response.json();
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : 'Failed to load complaint summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchComplaints = async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(ITEMS_PER_PAGE),
        status: statusFilter,
        type: typeFilter,
        visibility: visibilityFilter,
        sort: sortFilter
      });

      const response = await fetch(`${API_BASE}/complaints?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load complaints');
      }

      const data: ComplaintListResponse = await response.json();
      setComplaints(data.complaints || []);
      setPage(data.pagination?.page || targetPage);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalItems(data.pagination?.total_items || 0);
    } catch (err) {
      setComplaints([]);
      setError(err instanceof Error ? err.message : 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
    fetchComplaints(1);
  }, [statusFilter, typeFilter, visibilityFilter, sortFilter]);

  const fetchComplaintDetail = async (complaintId: number) => {
    if (detailById[complaintId]) return;

    try {
      setDetailLoadingId(complaintId);
      const response = await fetch(`${API_BASE}/complaints/${complaintId}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load complaint details');
      }

      const detail: ComplaintDetail = await response.json();
      setDetailById((prev) => ({ ...prev, [complaintId]: detail }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint details');
    } finally {
      setDetailLoadingId(null);
    }
  };

  const toggleExpanded = async (complaintId: number) => {
    if (expandedId === complaintId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(complaintId);
    await fetchComplaintDetail(complaintId);
  };

  const updateComplaintStatus = async (complaintId: number, status: 'Resolved' | 'Dismissed') => {
    const confirmed = window.confirm(`Mark this complaint as ${status.toLowerCase()}?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(complaintId);
      setError(null);

      const response = await fetch(`${API_BASE}/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update complaint status');
      }

      setDetailById((prev) => {
        const existing = prev[complaintId];
        if (!existing) return prev;
        return { ...prev, [complaintId]: { ...existing, status } };
      });

      await Promise.all([fetchSummary(), fetchComplaints(page)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update complaint status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const topUpvoted = summary?.top_upvoted;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Complaints</h1>
          <p className="text-gray-500 mt-1">Review hall complaints, inspect details, and resolve or dismiss pending issues.</p>
        </div>

        <button
          onClick={() => Promise.all([fetchSummary(), fetchComplaints(page)])}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <Globe className="w-4 h-4" />
          Refresh
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Most Upvoted</p>
              {summaryLoading ? (
                <p className="mt-3 text-gray-500">Loading summary...</p>
              ) : topUpvoted ? (
                <>
                  <h2 className={`mt-2 text-xl font-bold ${theme.text}`}>{topUpvoted.type} Complaint</h2>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{topUpvoted.description_preview}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                      <ThumbsUp className="w-3.5 h-3.5" /> {topUpvoted.upvote_count} upvotes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(topUpvoted.date)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-gray-500">No public complaints have pending votes yet.</p>
              )}
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <ThumbsUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{summary?.by_status.Pending ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Resolved</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{summary?.by_status.Resolved ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Dismissed</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{summary?.by_status.Dismissed ?? 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ComplaintTypeFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="Room">Room</option>
              <option value="Dining">Dining</option>
              <option value="Toilet">Toilet</option>
              <option value="Roommate">Roommate</option>
              <option value="Staff">Staff</option>
              <option value="Facilities">Facilities</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Visibility</label>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Sort</label>
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value as SortFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="upvotes">Upvotes</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-3 text-gray-500">Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <MessageSquare className="mx-auto w-12 h-12 text-gray-300 mb-3" />
          <h3 className={`text-lg font-bold ${theme.text}`}>No Complaints Found</h3>
          <p className="text-gray-500 mt-1">Try changing filters or sort order.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => {
            const isExpanded = expandedId === complaint.complaint_id;
            const detail = detailById[complaint.complaint_id];
            const isPending = complaint.status === 'Pending';
            const isActioning = actionLoadingId === complaint.complaint_id;

            return (
              <article key={complaint.complaint_id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpanded(complaint.complaint_id)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-700">
                          {complaint.type}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusBadgeClass(complaint.status)}`}>
                          {complaint.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${visibilityBadgeClass(complaint.is_public)}`}>
                          {complaint.is_public ? 'Public' : 'Private'}
                        </span>
                        {complaint.is_anonymous && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
                            <Shield className="w-3 h-3" /> Anonymous
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-semibold text-gray-800">{complaint.author_name || 'Anonymous Resident'}</span>
                        {complaint.student_id && <span className="text-gray-400">({complaint.student_id})</span>}
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-gray-700">
                        {complaint.description_preview}
                        {complaint.is_truncated && <span className="text-blue-600 font-semibold"> Read more...</span>}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" /> {complaint.upvote_count} upvotes
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {formatDate(complaint.date)}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-500 shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                    {detailLoadingId === complaint.complaint_id && (
                      <p className="text-sm text-gray-500">Loading details...</p>
                    )}

                    {detail && (
                      <>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Full Description</h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{detail.description}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Author</p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">{detail.author_name}</p>
                            <p className="mt-1 text-xs text-gray-500">{detail.is_anonymous ? 'Anonymous resident' : `Student ID: ${detail.student_id}`}</p>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Contact / Department</p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">{detail.author_phone || 'N/A'}</p>
                            <p className="mt-1 text-xs text-gray-500">{detail.author_department || ''}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => updateComplaintStatus(complaint.complaint_id, 'Dismissed')}
                                disabled={isActioning}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition ${isActioning ? 'cursor-not-allowed bg-gray-400' : 'bg-slate-700 hover:bg-slate-800'}`}
                              >
                                <XCircle className="w-4 h-4" /> Dismiss
                              </button>
                              <button
                                onClick={() => updateComplaintStatus(complaint.complaint_id, 'Resolved')}
                                disabled={isActioning}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition ${isActioning ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                              >
                                <CheckCircle className="w-4 h-4" /> Resolve
                              </button>
                            </>
                          ) : (
                            <span className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${statusBadgeClass(detail.status)}`}>
                              Complaint already {detail.status.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">Showing {visibleComplaintCount} of {totalItems} complaints</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchComplaints(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => fetchComplaints(page + 1)}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProvostComplaints;