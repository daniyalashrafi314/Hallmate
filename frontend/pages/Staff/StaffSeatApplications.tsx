import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../App';
import { ChevronLeft, ChevronRight, Search, AlertCircle, ArrowLeft, Clock, User, Phone, FileText, Star } from 'lucide-react';

interface Application {
  application_id: number;
  student_id: string;
  student_name: string;
  date: string;
  priority_value: number | null;
  status: string;
}

interface ApplicationDetails extends Application {
  description: string;
  application_status: string;
  phone_number: string;
  student_status: string;
}

const API_BASE_URL = 'http://localhost:5000/staff';
const ITEMS_PER_PAGE = 10;

// List View Component
const ApplicationListView: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);

  const fetchApplications = async (page: number, search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const offset = (page - 1) * ITEMS_PER_PAGE;
      let url = `${API_BASE_URL}/seat-applications?limit=${ITEMS_PER_PAGE}&offset=${offset}&status_filter=Pending`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.data);
      setTotalApplications(data.pagination.total);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      fetchApplications(1, searchQuery);
    }, 300);
    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

  const totalPages = Math.ceil(totalApplications / ITEMS_PER_PAGE);

  const handleApplicationClick = (appId: number) => {
    navigate(`/seat-applications/${appId}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Seat Applications</h2>
          <p className="text-gray-500">Review pending student seat allocation requests.</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Applications</h3>
          <p className="text-gray-500">No pending seat applications to review.</p>
        </div>
      ) : (
        /* Application List */
        <>
          <div className="space-y-3">
            {applications.map((app) => (
              <button
                key={app.application_id}
                onClick={() => handleApplicationClick(app.application_id)}
                className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{app.student_name}</h3>
                        <p className="text-sm text-gray-500">ID: {app.student_id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Center Content - Priority */}
                  {app.priority_value !== null && (
                    <div className="md:text-center">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50">
                        <Star className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-amber-700">Priority: {app.priority_value}</span>
                      </div>
                    </div>
                  )}

                  {/* Right Content - Date and Status */}
                  <div className="flex flex-col items-end gap-2 w-full md:w-auto text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {new Date(app.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs">
                      {app.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {applications.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalApplications)} of {totalApplications} applications
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchApplications(Math.max(currentPage - 1, 1), searchQuery)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => fetchApplications(page, searchQuery)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                      currentPage === page
                        ? `${theme.primary} text-white`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchApplications(Math.min(currentPage + 1, totalPages), searchQuery)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Details View Component
const ApplicationDetailsView: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityValue, setPriorityValue] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/seat-applications/${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch application details');
        }

        const data = await response.json();
        setApplication(data);
        setPriorityValue(data.priority_value);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleUpdatePriority = async () => {
    if (priorityValue === null || !id) {
      setError('Priority value is required');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/seat-applications/${id}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_value: priorityValue })
      });

      if (!response.ok) {
        throw new Error('Failed to update priority');
      }

      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);

      // Update local state
      if (application) {
        setApplication({ ...application, priority_value: priorityValue });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading application details...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/seat-applications')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Applications
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-red-900">Error</h3>
            <p className="text-red-700">{error || 'Application not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/seat-applications')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Applications
      </button>

      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>Application Details</h2>
        <p className="text-gray-500">Review and manage this seat application</p>
      </div>

      {/* Success Message */}
      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <div className="text-green-700 font-medium">Priority updated successfully!</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Student Information Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Student ID</p>
              <p className="text-lg font-bold text-gray-900">{application.student_id}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</p>
              <p className="text-lg font-bold text-gray-900">{application.student_name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</p>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-900">{application.phone_number || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Student Status</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{application.student_status}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-bold text-gray-900 mb-3">Application Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Application Status</p>
              <span className="inline-block px-4 py-2 rounded-full bg-amber-50 text-amber-700 font-bold">
                {application.application_status}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Application Date</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(application.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-bold text-gray-900 mb-3">Description</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
            {application.description || 'No description provided'}
          </div>
        </div>
      </div>

      {/* Priority Management Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Priority Management</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              Current Priority Value
            </label>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-600" />
              <span className="text-2xl font-bold text-gray-900">
                {application.priority_value ?? 'Not set'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              Update Priority (Integer)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={priorityValue ?? ''}
                onChange={(e) => setPriorityValue(e.target.value === '' ? null : parseInt(e.target.value))}
                placeholder="Enter priority value"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors font-medium"
              />
              <button
                onClick={handleUpdatePriority}
                disabled={updating || priorityValue === application.priority_value}
                className={`px-6 py-3 rounded-lg font-bold text-white transition-all ${
                  updating || priorityValue === application.priority_value
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `${theme.primary} hover:shadow-lg`
                }`}
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Higher priority values will be processed first. Click Update to save changes.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Router Component
const StaffSeatApplications: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <ApplicationDetailsView />;
  }

  return <ApplicationListView />;
};

export default StaffSeatApplications;
