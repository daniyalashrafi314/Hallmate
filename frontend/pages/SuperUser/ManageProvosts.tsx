import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle, Home, User, Users } from 'lucide-react';
import { useAppContext } from '../../App';

interface HallInfo {
  hall_id: string;
  hall_name: string;
  provost_id: string | null;
  provost_user_id?: string | null;
  provost_name?: string | null;
  provost_phone_number?: string | null;
  provost_role?: string | null;
}

interface StaffInfo {
  staff_id: string;
  user_id: string;
  name: string;
  phone_number: string;
  role: string;
  hall_id: string;
  salary?: string | null;
}

const API_BASE_URL = 'http://localhost:5000/super-user';

const ManageProvosts: React.FC = () => {
  const { theme } = useAppContext();
  const [halls, setHalls] = useState<HallInfo[]>([]);
  const [staffs, setStaffs] = useState<StaffInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hallsById = useMemo(() => {
    return halls.reduce<Record<string, HallInfo>>((acc, hall) => {
      acc[hall.hall_id] = hall;
      return acc;
    }, {});
  }, [halls]);

  const staffsByHall = useMemo(() => {
    return staffs.reduce<Record<string, StaffInfo[]>>((acc, staff) => {
      if (!acc[staff.hall_id]) acc[staff.hall_id] = [];
      acc[staff.hall_id].push(staff);
      return acc;
    }, {});
  }, [staffs]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/provosts-staffs`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to load super user data');
      }

      const payload = await response.json();
      setHalls(payload.halls || []);
      setStaffs(payload.staffs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePromote = async (staff: StaffInfo) => {
    setActionLoading(staff.staff_id);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/promote-provost`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ staff_id: staff.staff_id })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Promotion failed');
      }

      setSuccess(result.message || 'Provost promoted successfully');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote provost');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-bold ${theme.text}`}>Manage Provosts</h1>
            <p className="mt-2 text-gray-500 max-w-2xl">
              Promote qualified staff into provost roles for any hall. The system will demote the current provost automatically while preserving hall assignments. Please do not promote/demote without official instructions!
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 rounded-xl bg-gray-50 px-4 py-3">
            <Home className="w-4 h-4 text-gray-500" />
            Super User Control Panel
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-2xl border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <div className="flex items-center gap-2">
            {error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span>{error || success}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading provost and staff data...</p>
          </div>
        ) : halls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            No hall data available.
          </div>
        ) : (
          halls.map((hall) => (
            <div key={hall.hall_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-6 py-5 border-b ${theme.accent}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Hall</p>
                    <h2 className="text-2xl font-bold text-slate-900">{hall.hall_name}</h2>
                    <p className="text-sm text-slate-500">Hall ID: {hall.hall_id}</p>
                  </div>
                  <div className="rounded-2xl bg-white/90 px-4 py-3 border border-slate-200 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Current Provost</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {hall.provost_name || 'Unassigned'}
                    </div>
                    <div className="text-sm text-slate-500">{hall.provost_user_id || '-'}</div>
                    <div className="text-sm text-slate-500">{hall.provost_phone_number || ''}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Staff ID</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Phone</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(staffsByHall[hall.hall_id] || []).map((staff) => (
                        <tr key={staff.staff_id} className="border-b border-slate-100 last:border-none">
                          <td className="px-4 py-4 font-medium text-slate-900">{staff.staff_id}</td>
                          <td className="px-4 py-4">{staff.name}</td>
                          <td className="px-4 py-4 capitalize">{staff.role.toLowerCase()}</td>
                          <td className="px-4 py-4">{staff.phone_number || '—'}</td>
                          <td className="px-4 py-4">
                            {staff.role.toLowerCase() === 'provost' ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-xs font-semibold uppercase tracking-[0.15em]">
                                <CheckCircle className="w-3.5 h-3.5" /> Current
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${actionLoading === staff.staff_id ? 'bg-slate-400 cursor-not-allowed' : theme.primary} hover:opacity-90`}
                                onClick={() => handlePromote(staff)}
                                disabled={actionLoading === staff.staff_id}
                              >
                                Promote
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageProvosts;
