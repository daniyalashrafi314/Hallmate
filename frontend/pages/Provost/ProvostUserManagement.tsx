import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCircle2,
  Users
} from 'lucide-react';

interface StaffListItem {
  staff_id: string;
  name: string;
  role: string;
  phone_number: string;
  email_address: string;
  has_photo: boolean;
}

interface StaffListResponse {
  staffs: StaffListItem[];
  pagination: {
    page: number;
    limit: number;
    total_staffs: number;
    total_pages: number;
  };
}

interface StaffDetail {
  staff_id: string;
  name: string;
  role: string;
  phone_number: string;
  salary: number;
  email_address: string;
  hall_name: string;
  has_photo: boolean;
}

const API_BASE_URL = 'http://localhost:5000/admin';
const DEFAULT_LIMIT = 10;

const ProvostUserManagement: React.FC = () => {
  const { theme } = useAppContext();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const [staffs, setStaffs] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [totalStaffs, setTotalStaffs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const initials = useMemo(() => {
    if (!selectedStaff?.name) return 'ST';
    const parts = selectedStaff.name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'ST';
  }, [selectedStaff?.name]);

  const fetchStaffs = async (targetPage: number, query: string, showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limit));
      if (query.trim()) {
        params.set('search', query.trim());
      }

      const response = await fetch(`${API_BASE_URL}/staffs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load staff list');
      }

      const data: StaffListResponse = await response.json();
      setStaffs(data.staffs || []);
      setPage(data.pagination?.page || targetPage);
      setTotalStaffs(data.pagination?.total_staffs || 0);
      setTotalPages(Math.max(1, data.pagination?.total_pages || 1));
    } catch (err) {
      setStaffs([]);
      setTotalStaffs(0);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : 'Failed to load staff list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStaffDetail = async (staffId: string) => {
    try {
      setViewMode('detail');
      setSelectedStaffId(staffId);
      setSelectedStaff(null);
      setDetailLoading(true);
      setDetailError(null);
      setPhotoUrl(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/staffs/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load staff details');
      }

      const data: StaffDetail = await response.json();
      setSelectedStaff(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load staff details');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 350);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    fetchStaffs(page, searchQuery, true);
  }, [page, searchQuery]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchPhoto = async () => {
      if (!selectedStaffId || !selectedStaff?.has_photo) {
        setPhotoUrl(null);
        setPhotoLoading(false);
        return;
      }

      try {
        setPhotoLoading(true);
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(`${API_BASE_URL}/staffs/${selectedStaffId}/photo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          setPhotoUrl(null);
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      } catch {
        setPhotoUrl(null);
      } finally {
        setPhotoLoading(false);
      }
    };

    fetchPhoto();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedStaffId, selectedStaff?.has_photo]);

  const openDetail = (staffId: string) => {
    fetchStaffDetail(staffId);
  };

  const goBackToList = () => {
    setViewMode('list');
    setSelectedStaffId(null);
    setSelectedStaff(null);
    setDetailError(null);
    setDetailLoading(false);
    setPhotoUrl(null);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaffId || !selectedStaff) return;

    const confirmed = window.confirm(
      `Delete ${selectedStaff.name} (${selectedStaff.staff_id})? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingStaff(true);
      setDetailError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/staffs/${selectedStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete staff');
      }

      goBackToList();
      await fetchStaffs(page, searchQuery, true);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to delete staff');
    } finally {
      setDeletingStaff(false);
    }
  };

  const currentFrom = totalStaffs > 0 ? (page - 1) * limit + 1 : 0;
  const currentTo = Math.min(page * limit, totalStaffs);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${theme.text}`}>Staff Management</h2>
          <p className="text-gray-500 mt-1">Browse hall staff, search quickly, and open full staff profiles.</p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={() => fetchStaffs(page, searchQuery, false)}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Search Staff</label>
                <div className="mt-2 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by staff id or name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500 md:text-right">
                Showing {currentFrom} to {currentTo} of {totalStaffs} staff
              </div>
            </div>
          </section>

          {error && (
            <section className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-red-900">Could not load staff list</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </section>
          )}

          {loading ? (
            <section className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
              <p className="text-gray-600">Loading staff list...</p>
            </section>
          ) : staffs.length === 0 ? (
            <section className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-800">No staff found</h3>
              <p className="text-gray-500 mt-1">Try changing the search term or refresh the list.</p>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Identity</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Role</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Phone</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {staffs.map((staff) => (
                      <tr
                        key={staff.staff_id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openDetail(staff.staff_id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{staff.name}</p>
                              <p className="text-xs text-gray-500">{staff.staff_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 uppercase">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{staff.email_address}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{staff.phone_number || 'Not provided'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center text-blue-600 text-sm font-semibold">
                            View
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!loading && totalPages > 1 && (
            <section className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2">
              <p className="text-sm text-gray-600">
                Showing {currentFrom} to {currentTo} of {totalStaffs} staff
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-700 px-2">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {viewMode === 'detail' && (
        <section className="space-y-4">
          <button
            onClick={goBackToList}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to staff list
          </button>

          {detailError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Could not load staff details</p>
                <p className="text-sm text-red-700 mt-1">{detailError}</p>
              </div>
            </div>
          )}

          {detailLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
              <p className="text-gray-600">Loading staff profile...</p>
            </div>
          ) : selectedStaff ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 pb-6 border-b border-gray-100">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-black/10 bg-slate-100 flex items-center justify-center">
                  {photoLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Staff profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-slate-700">{initials}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedStaff.name}</h3>
                  <p className="text-gray-500 mt-1">Staff ID: {selectedStaff.staff_id}</p>
                  <span className="inline-flex mt-2 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 uppercase">
                    {selectedStaff.role}
                  </span>
                </div>

                <div className="md:ml-auto">
                  <button
                    type="button"
                    onClick={handleDeleteStaff}
                    disabled={deletingStaff}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors ${deletingStaff ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {deletingStaff ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deletingStaff ? 'Deleting...' : 'Delete Staff'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <article className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Hall</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedStaff.hall_name}</p>
                </article>
                <article className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Salary</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedStaff.salary ?? 'Not set'}</p>
                </article>
                <article className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                  <p className="mt-2 font-semibold text-gray-900 break-all inline-flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {selectedStaff.email_address}
                  </p>
                </article>
                <article className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                  <p className="mt-2 font-semibold text-gray-900 inline-flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {selectedStaff.phone_number || 'Not provided'}
                  </p>
                </article>
                <article className="rounded-xl border border-gray-100 bg-gray-50 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Photo</p>
                  <p className="mt-2 font-semibold text-gray-900 inline-flex items-center gap-2">
                    <UserCircle2 className="w-4 h-4 text-gray-500" />
                    {selectedStaff.has_photo ? 'Photo available' : 'No photo uploaded'}
                  </p>
                </article>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};

export default ProvostUserManagement;
