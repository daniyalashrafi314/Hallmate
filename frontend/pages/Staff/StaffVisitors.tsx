import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Search, Trash2, User, Phone, CalendarDays, XCircle } from 'lucide-react';

interface VisitorItem {
  visitor_id: string;
  visitor_name: string;
  visitor_phone: string;
  relationship: string;
  entry_time: string;
  exit_time: string;
  student_id: string;
  student_name: string;
  room_id: string | null;
}

interface VisitorDetail extends VisitorItem {
  student_phone: string;
  student_status: string;
  student_has_photo: boolean;
}

interface PaginatedVisitors {
  data: VisitorItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

const API_BASE_URL = 'http://localhost:5000/staff';
const ITEMS_PER_PAGE = 10;

const StaffVisitors: React.FC = () => {
  const { theme } = useAppContext();

  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalVisitors, setTotalVisitors] = useState(0);

  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [room, setRoom] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [rooms, setRooms] = useState<string[]>([]);

  const [detailVisitor, setDetailVisitor] = useState<VisitorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - 2 + i}`);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: new Date(0, i).toLocaleString('en', { month: 'short' }) }));
  const days = Array.from({ length: 31 }, (_, i) => `${(i + 1).toString().padStart(2, '0')}`);

  const buildVisitorUrl = () => {
    const params = new URLSearchParams();
    params.set('limit', ITEMS_PER_PAGE.toString());
    params.set('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

    if (year) params.set('year', year);
    if (month) params.set('month', month);
    if (day) params.set('day', day);
    if (room) params.set('room', room);
    if (search.trim()) params.set('search', search.trim());

    return `${API_BASE_URL}/visitors?${params.toString()}`;
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(buildVisitorUrl(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }

      const data: PaginatedVisitors = await response.json();
      setVisitors(data.data);
      setTotalVisitors(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visitors');
      setVisitors([]);
      setTotalVisitors(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        return;
      }

      const data: Array<{ room_id: string }> = await response.json();
      setRooms(data.map((r) => r.room_id.toString()));
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 250);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  useEffect(() => {
    fetchVisitors();
  }, [currentPage, year, month, day, room, search]);

  const openVisitorDetail = async (visitorId: string) => {
    try {
      setDetailLoading(true);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/visitors/${visitorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch visitor details');
      }

      const data: VisitorDetail = await response.json();
      setDetailVisitor(data);
    } catch (err) {
      console.error(err);
      alert('Could not load visitor details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailVisitor(null);
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    if (!confirm('Delete this visitor log? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingVisitorId(visitorId);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/visitors/${visitorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete visitor');
      }

      setVisitors((prev) => prev.filter((v) => v.visitor_id !== visitorId));
      setTotalVisitors((prev) => Math.max(0, prev - 1));

      if (detailVisitor?.visitor_id === visitorId) {
        closeDetailModal();
      }
    } catch (err) {
      console.error(err);
      alert('Could not delete visitor entry.');
    } finally {
      setDeletingVisitorId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalVisitors / ITEMS_PER_PAGE));
  const currentFrom = totalVisitors > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const currentTo = Math.min(currentPage * ITEMS_PER_PAGE, totalVisitors);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Visitor Logs</h2>
          <p className="text-gray-500">Search and manage visitor entries for your hall.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="col-span-1 md:col-span-1">
          <label className="text-xs font-semibold uppercase text-gray-500">Year</label>
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); setCurrentPage(1); }}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
          >
            <option value="">All</option>
            {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-1">
          <label className="text-xs font-semibold uppercase text-gray-500">Month</label>
          <select
            value={month}
            onChange={(e) => { setMonth(e.target.value); setCurrentPage(1); }}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
          >
            <option value="">All</option>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-1">
          <label className="text-xs font-semibold uppercase text-gray-500">Day</label>
          <select
            value={day}
            onChange={(e) => { setDay(e.target.value); setCurrentPage(1); }}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
          >
            <option value="">All</option>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-1">
          <label className="text-xs font-semibold uppercase text-gray-500">Room</label>
          <select
            value={room}
            onChange={(e) => { setRoom(e.target.value); setCurrentPage(1); }}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
          >
            <option value="">All</option>
            {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Search (Name or Student ID)</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search student name / ID"
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-3">Loading visitor logs...</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No visitors found</h3>
          <p className="text-gray-500">No visitors match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-2 text-xs uppercase text-gray-500 border-b border-gray-100 px-4 py-3">
              <div className="col-span-2">Visitor</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Relationship</div>
              <div className="col-span-2">Host</div>
              <div className="col-span-1">Room</div>
              <div className="col-span-2">Entry</div>
              <div className="col-span-1">Exit</div>
              <div className="col-span-1"><span className="sr-only">Actions</span></div>
            </div>

            {visitors.map((visitor) => (
              <div
                key={visitor.visitor_id}
                className="grid grid-cols-12 items-center gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => openVisitorDetail(visitor.visitor_id)}
                  className="col-span-2 text-left text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {visitor.visitor_name}
                </button>
                <div className="col-span-2 text-sm text-gray-700">{visitor.visitor_phone}</div>
                <div className="col-span-2 text-sm text-gray-700">{visitor.relationship}</div>
                <div className="col-span-2 text-sm text-gray-700">{visitor.student_name} ({visitor.student_id})</div>
                <div className="col-span-1 text-sm text-gray-700">{visitor.room_id || '-'}</div>
                <div className="col-span-2 text-sm text-gray-700 flex items-center gap-1"><CalendarDays className="w-4 h-4 text-gray-400" />{visitor.entry_time}</div>
                <div className="col-span-1 text-sm text-gray-700">{visitor.exit_time}</div>
                <div className="col-span-1 text-right">
                  <button
                    onClick={() => handleDeleteVisitor(visitor.visitor_id)}
                    disabled={deletingVisitorId === visitor.visitor_id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingVisitorId === visitor.visitor_id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-gray-600">
            <p>
              Showing {currentFrom} to {currentTo} of {totalVisitors} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Prev
              </button>
              <span className="px-2 py-1">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Visitor Detail Modal */}
      {detailVisitor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className={`flex items-center justify-between p-5 rounded-t-2xl ${theme.primary} text-white`}>
              <div>
                <h3 className="text-xl font-bold">Visitor Detail</h3>
                {detailLoading ? <p className="text-sm text-white/80">Loading...</p> : null}
              </div>
              <button onClick={closeDetailModal} className="p-2 hover:bg-white/20 rounded-full">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Visitor</p>
                  <p className="text-lg font-semibold text-gray-800">{detailVisitor.visitor_name}</p>
                  <p className="text-sm text-gray-600">{detailVisitor.visitor_phone}</p>
                  <p className="text-sm text-gray-600">{detailVisitor.relationship}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Host Student</p>
                  <p className="text-lg font-semibold text-gray-800">{detailVisitor.student_name}</p>
                  <p className="text-sm text-gray-600">ID: {detailVisitor.student_id}</p>
                  <p className="text-sm text-gray-600">Phone: {detailVisitor.student_phone}</p>
                  <p className="text-sm text-gray-600">Status: {detailVisitor.student_status}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Room</p>
                  <p className="text-sm text-gray-700">{detailVisitor.room_id || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Entry</p>
                  <p className="text-sm text-gray-700">{detailVisitor.entry_time}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Exit</p>
                  <p className="text-sm text-gray-700">{detailVisitor.exit_time}</p>
                </div>
              </div>

              <div className="text-right">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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

export default StaffVisitors;
