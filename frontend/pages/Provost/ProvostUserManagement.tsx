import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCircle2,
  Users,
  X
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
  salary: number | null;
  email_address: string;
  hall_name: string;
  has_photo: boolean;
}

interface AddStaffFormData {
  staff_id: string;
  email_address: string;
  name: string;
  phone_number: string;
}

interface AddStaffResponse {
  message: string;
  staff_id: string;
  email_sent: boolean;
}

const API_BASE_URL = 'http://localhost:5000/admin';
const DEFAULT_LIMIT = 10;

const StaffListTab: React.FC<{ refreshToken: number }> = ({ refreshToken }) => {
  const { theme } = useAppContext();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [staffs, setStaffs] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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
  }, [page, searchQuery, refreshToken]);

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

  const goBackToList = () => {
    setViewMode('list');
    setSelectedStaffId(null);
    setSelectedStaff(null);
    setDetailError(null);
    setDetailLoading(false);
    setPhotoUrl(null);
    setShowDeleteConfirm(false);
    setDeleteConfirmInput('');
  };

  const openDeleteConfirm = () => {
    setDeleteConfirmInput('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deletingStaff) return;
    setShowDeleteConfirm(false);
    setDeleteConfirmInput('');
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaffId || !selectedStaff) return;

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

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete staff');
      }

      if (payload?.email_sent === false) {
        setWarning(payload.message || 'Staff deleted, but deletion email could not be sent.');
      }

      const shouldGoPreviousPage = staffs.length === 1 && page > 1;
      goBackToList();

      if (shouldGoPreviousPage) {
        setPage((prev) => Math.max(prev - 1, 1));
      } else {
        fetchStaffs(page, searchQuery, true);
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to delete staff');
    } finally {
      setDeletingStaff(false);
    }
  };

  const currentFrom = totalStaffs > 0 ? (page - 1) * limit + 1 : 0;
  const currentTo = Math.min(page * limit, totalStaffs);

  return (
    <div className="space-y-6">
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

      {warning && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-900">Notice</p>
            <p className="text-sm text-amber-700 mt-1">{warning}</p>
          </div>
        </section>
      )}

      {viewMode === 'list' ? (
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
                        onClick={() => fetchStaffDetail(staff.staff_id)}
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
      ) : (
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
                    onClick={openDeleteConfirm}
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

      {showDeleteConfirm && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Confirm Staff Deletion</h3>
              <p className="text-sm text-gray-600 mt-2">
                This will permanently remove staff <span className="font-semibold">{selectedStaff.name}</span> and related records.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Type <span className="font-mono font-semibold">{selectedStaff.staff_id}</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Enter staff ID"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none transition-all"
                disabled={deletingStaff}
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                disabled={deletingStaff}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={deletingStaff || deleteConfirmInput.trim() !== selectedStaff.staff_id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {deletingStaff ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddStaffTab: React.FC<{ onStaffAdded: () => void }> = ({ onStaffAdded }) => {
  const [formData, setFormData] = useState<AddStaffFormData>({
    staff_id: '',
    email_address: '',
    name: '',
    phone_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<AddStaffResponse | null>(null);

  const validateForm = (): boolean => {
    if (!formData.staff_id.trim()) {
      setError('Staff ID is required');
      return false;
    }

    if (!/^[A-Za-z0-9]{10}$/.test(formData.staff_id.trim())) {
      setError('Staff ID must be exactly 10 alphanumeric characters');
      return false;
    }

    if (!formData.email_address.trim()) {
      setError('Email address is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_address.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.phone_number.trim()) {
      setError('Phone number is required');
      return false;
    }

    if (!/^[+()\-\s0-9]{7,20}$/.test(formData.phone_number.trim())) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (warning) setWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/staffs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: formData.staff_id.trim(),
          email_address: formData.email_address.trim(),
          name: formData.name.trim(),
          phone_number: formData.phone_number.trim()
        })
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Failed to create staff account (${response.status})`);
      }

      const payload = data as AddStaffResponse;
      setSuccessMessage(payload.message);
      setSubmittedData(payload);
      if (payload.email_sent === false) {
        setWarning('Welcome email could not be sent. Please distribute credentials manually.');
      }

      setFormData({ staff_id: '', email_address: '', name: '', phone_number: '' });
      onStaffAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Warning</h4>
            <p className="text-amber-700 text-sm mt-1">{warning}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">Staff Added Successfully</h4>
            <p className="text-green-700 text-sm mt-1">{successMessage}</p>
            {submittedData && (
              <div className="mt-3 p-3 bg-green-100 rounded border border-green-200">
                <p className="text-green-800 text-sm"><strong>Staff ID:</strong> {submittedData.staff_id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div>
          <label htmlFor="staff_id" className="block text-sm font-semibold text-gray-700 mb-2">
            Staff ID
          </label>
          <input
            id="staff_id"
            name="staff_id"
            type="text"
            value={formData.staff_id}
            onChange={handleInputChange}
            placeholder="Enter 10-character alphanumeric staff ID"
            maxLength={10}
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">Exactly 10 alphanumeric characters</p>
        </div>

        <div>
          <label htmlFor="email_address" className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email_address"
            name="email_address"
            type="email"
            value={formData.email_address}
            onChange={handleInputChange}
            placeholder="Enter staff email address"
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Staff Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleInputChange}
            placeholder="Enter phone number"
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Add New Staff'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ProvostUserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [refreshToken, setRefreshToken] = useState(0);

  const handleStaffAdded = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const tabs = [
    { id: 'list' as const, label: 'Staff List' },
    { id: 'add' as const, label: 'Add New Staff' }
  ];

  return (
    <div className="staff-management-page">
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && <StaffListTab refreshToken={refreshToken} />}
      {activeTab === 'add' && <AddStaffTab onStaffAdded={handleStaffAdded} />}

      <style>{`
        .staff-management-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default ProvostUserManagement;
