import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  User,
  XCircle
} from 'lucide-react';

type RequesterFilter = 'all' | 'student' | 'staff';
type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Refused';
type DonationStatus = 'Pending' | 'Approved' | 'Refused';

interface DonationListItem {
  donation_id: number;
  status: DonationStatus;
  description: string;
  start_date: string;
  end_date: string;
  requester_type: 'student' | 'staff';
  requester_id: string;
  requester_name: string;
  requester_phone: string | null;
}

interface DonationDetail extends DonationListItem {
  payment_id: number | null;
  payment_type: string | null;
  amount: number | null;
  payment_status: string | null;
  due_time: string | null;
  paid_at: string | null;
}

interface DonationListResponse {
  donations: DonationListItem[];
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

const statusBadgeClass = (status: DonationStatus) => {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Refused':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ProvostDonations: React.FC = () => {
  const { theme } = useAppContext();

  const [donations, setDonations] = useState<DonationListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [requesterFilter, setRequesterFilter] = useState<RequesterFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsById, setDetailsById] = useState<Record<number, DonationDetail>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const pendingCount = useMemo(
    () => donations.filter((item) => item.status === 'Pending').length,
    [donations]
  );

  const fetchDonations = async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(ITEMS_PER_PAGE),
        requester: requesterFilter,
        status: statusFilter
      });

      const response = await fetch(`${API_BASE}/donations?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch donations');
      }

      const data: DonationListResponse = await response.json();
      setDonations(data.donations || []);
      setPage(data.pagination?.page || targetPage);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalItems(data.pagination?.total_items || 0);
    } catch (err) {
      setDonations([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
    fetchDonations(1);
  }, [requesterFilter, statusFilter]);

  const fetchDonationDetail = async (donationId: number) => {
    if (detailsById[donationId]) return;

    try {
      setDetailsLoadingId(donationId);
      const response = await fetch(`${API_BASE}/donations/${donationId}`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch donation details');
      }

      const detail: DonationDetail = await response.json();
      setDetailsById((prev) => ({ ...prev, [donationId]: detail }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch donation details');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const toggleExpanded = async (donationId: number) => {
    if (expandedId === donationId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(donationId);
    await fetchDonationDetail(donationId);
  };

  const updateDonationStatus = async (donationId: number, status: 'Approved' | 'Refused') => {
    const confirmed = window.confirm(`Mark this donation as ${status}?`);
    if (!confirmed) return;

    try {
      setStatusUpdatingId(donationId);
      setError(null);

      const response = await fetch(`${API_BASE}/donations/${donationId}/status`, {
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
        throw new Error(payload.error || 'Failed to update donation status');
      }

      setDetailsById((prev) => {
        const existing = prev[donationId];
        if (!existing) return prev;
        return { ...prev, [donationId]: { ...existing, status } };
      });

      await fetchDonations(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update donation status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Donation Requests</h1>
          <p className="text-gray-500 mt-1">Review student and staff requests, then approve or refuse them.</p>
        </div>

        <button
          onClick={() => fetchDonations(page)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Requests In View</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{donations.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pending In View</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Matches</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{totalItems}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Requester</label>
            <select
              value={requesterFilter}
              onChange={(e) => setRequesterFilter(e.target.value as RequesterFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
            >
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Refused">Refused</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-3 text-gray-500">Loading donation requests...</p>
        </div>
      ) : donations.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className={`text-lg font-bold ${theme.text}`}>No matching requests</p>
          <p className="text-gray-500 mt-1">Try adjusting your requester or status filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((item) => {
            const isExpanded = expandedId === item.donation_id;
            const details = detailsById[item.donation_id];
            const isPending = item.status === 'Pending';
            const isUpdating = statusUpdatingId === item.donation_id;

            return (
              <article key={item.donation_id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpanded(item.donation_id)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-700">
                          {item.requester_type}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>

                      <h3 className="mt-2 text-lg font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {item.requester_name}
                      </h3>
                      <p className="text-sm text-gray-500">Requester ID: {item.requester_id}</p>
                      <p className="mt-2 text-sm text-gray-700 line-clamp-2">{item.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Start: {formatDate(item.start_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> End: {formatDate(item.end_date)}
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
                    {detailsLoadingId === item.donation_id && (
                      <p className="text-sm text-gray-500">Loading details...</p>
                    )}

                    {details && (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Requester Phone</p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">{details.requester_phone || 'N/A'}</p>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Payment Info</p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {details.payment_id ? `Payment #${details.payment_id}` : 'No payment generated'}
                            </p>
                          </div>
                        </div>

                        {details.payment_id && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-1">
                            <p><strong>Type:</strong> {details.payment_type || 'N/A'}</p>
                            <p><strong>Amount:</strong> {details.amount ?? 'N/A'}</p>
                            <p><strong>Status:</strong> {details.payment_status || 'N/A'}</p>
                            <p><strong>Due:</strong> {details.due_time || 'N/A'}</p>
                            <p><strong>Paid At:</strong> {details.paid_at || 'N/A'}</p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex flex-wrap gap-2 justify-end">
                      {isPending && (
                        <>
                          <button
                            onClick={() => updateDonationStatus(item.donation_id, 'Refused')}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition ${isUpdating ? 'cursor-not-allowed bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                          >
                            <XCircle className="w-4 h-4" /> Refuse
                          </button>
                          <button
                            onClick={() => updateDonationStatus(item.donation_id, 'Approved')}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition ${isUpdating ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDonations(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => fetchDonations(page + 1)}
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

export default ProvostDonations;