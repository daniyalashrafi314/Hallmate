import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../App';
import { Users, Mail, AlertCircle, CheckCircle, User, X, Search, Filter, ChevronLeft, ChevronRight, Eye, Image as ImageIcon } from 'lucide-react';

interface FormData {
  student_id: string;
  email_address: string;
}

interface StudentListItem {
  student_id: string;
  name: string;
  status: 'ATTACHED' | 'RESIDENT';
  room_id: string | null;
  has_photo: boolean;
}

interface StudentDetail {
  student_id: string;
  name: string;
  phone_number: string;
  status: string;
  email_address: string;
  hall_name: string;
  hall_id: string;
  room_id: string | null;
  seat_number: string | null;
  allocation_start_date: string | null;
  has_photo: boolean;
  department: string;
  batch_year: string;
}

interface Room {
  room_id: string;
}

interface Batch {
  batch: string;
}

interface PaginationData {
  limit: number;
  offset: number;
  total: number;
}

const API_BASE_URL = 'http://localhost:5000/staff';

// ===== STUDENT LIST TAB =====
const StudentListTab: React.FC = () => {
  const { theme } = useAppContext();
  
  // Pagination & Search state
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ limit: 10, offset: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');

  // Dropdown data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('hallmate_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [roomsRes, batchesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/rooms`, { headers }),
          fetch(`${API_BASE_URL}/batches`, { headers })
        ]);

        if (roomsRes.ok) setRooms(await roomsRes.json());
        if (batchesRes.ok) setBatches(await batchesRes.json());
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch students with filters
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const params = new URLSearchParams({
        limit: String(pagination.limit),
        offset: String(pagination.offset),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (batchFilter) params.append('batch', batchFilter);
      if (roomFilter) params.append('room', roomFilter);

      const response = await fetch(`${API_BASE_URL}/add-students/student-list?${params}`, { headers });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch students');

      const data = await response.json();
      setStudents(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, searchQuery, statusFilter, batchFilter, roomFilter]);

  // Fetch students when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, offset: 0 })); // Reset to first page
  }, [searchQuery, statusFilter, batchFilter, roomFilter]);

  // Fetch students when pagination or filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch student detail
  const fetchStudentDetail = async (studentId: string) => {
    try {
      setDetailLoading(true);
      const token = localStorage.getItem('hallmate_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const response = await fetch(`${API_BASE_URL}/add-students/student-list/${studentId}`, { headers });

      if (!response.ok) throw new Error('Failed to fetch student details');

      const data = await response.json();
      setSelectedStudent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewStudent = (studentId: string) => {
    fetchStudentDetail(studentId);
  };

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchStudentPhoto = async () => {
      if (!selectedStudent?.has_photo) {
        setStudentPhotoUrl(null);
        setPhotoLoading(false);
        return;
      }

      try {
        setPhotoLoading(true);
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(
          `${API_BASE_URL}/add-students/student-list/${selectedStudent.student_id}/photo`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          setStudentPhotoUrl(null);
          return;
        }

        const photoBlob = await response.blob();
        objectUrl = URL.createObjectURL(photoBlob);
        setStudentPhotoUrl(objectUrl);
      } catch {
        setStudentPhotoUrl(null);
      } finally {
        setPhotoLoading(false);
      }
    };

    fetchStudentPhoto();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedStudent]);

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value="ATTACHED">Attached</option>
              <option value="RESIDENT">Resident</option>
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Batch</label>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.batch} value={batch.batch}>
                  Batch {batch.batch}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Room</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
            >
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.room_id} value={room.room_id}>
                  Room {room.room_id}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setBatchFilter('');
                setRoomFilter('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No students found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Student ID</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Room</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                      <td className="py-3 px-4 font-medium text-gray-900">{student.student_id}</td>
                      <td className="py-3 px-4 text-gray-700">{student.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          student.status === 'RESIDENT'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{student.room_id || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleViewStudent(student.student_id)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-bold">{Math.min(pagination.offset + 1, pagination.total)}</span> to{' '}
                <span className="font-bold">{Math.min(pagination.offset + pagination.limit, pagination.total)}</span> of{' '}
                <span className="font-bold">{pagination.total}</span> students
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                  disabled={pagination.offset === 0}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-gray-400 hover:text-gray-600 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                      {photoLoading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : studentPhotoUrl ? (
                        <img
                          src={studentPhotoUrl}
                          alt={`${selectedStudent.name} photo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Student ID</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.student_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Name</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Email</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.email_address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Phone Number</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.phone_number}</p>
                    </div>
                  </div>

                  {/* Academic Info */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Academic Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Department</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Batch Year</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.batch_year}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Status</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            selectedStudent.status === 'RESIDENT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedStudent.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Allocation Info */}
                  {selectedStudent.room_id && (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-bold text-gray-900 mb-4">Allocation Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Room ID</label>
                          <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.room_id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Seat Number</label>
                          <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.seat_number || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-semibold text-gray-600">Allocation Start Date</label>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            {selectedStudent.allocation_start_date
                              ? new Date(selectedStudent.allocation_start_date).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hall Info */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Hall Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Hall Name</label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedStudent.hall_name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== ADD STUDENT TAB =====
const AddStudentTab: React.FC = () => {
  const { theme } = useAppContext();
  const [formData, setFormData] = useState<FormData>({
    student_id: '',
    email_address: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.student_id.trim()) {
      setError('Student ID is required');
      return false;
    }

    if (!/^\d{7}$/.test(formData.student_id.trim())) {
      setError('Student ID must be exactly 7 digits');
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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        student_id: formData.student_id.trim(),
        email_address: formData.email_address.trim(),
      };

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/add-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create student account (${response.status})`);
      }

      setSuccessMessage(data.message);
      setSubmittedData(data);
      
      setFormData({
        student_id: '',
        email_address: '',
      });

      setTimeout(() => {
        setSuccessMessage(null);
        setSubmittedData(null);
      }, 6000);
    } catch (err) {
      console.error('Error creating student:', err);
      setError(err instanceof Error ? err.message : 'Failed to create student account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold ${theme.text}`}>Add New Student</h2>
        <p className="text-gray-500 mt-2">Create a new student account and send login credentials</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && submittedData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>{successMessage}</span>
          </div>
          <div className="bg-white rounded-lg p-4 mt-3 space-y-2 text-gray-700">
            <p><strong>Student ID:</strong> {submittedData.student_id}</p>
            <p><strong>User ID:</strong> {submittedData.user_id}</p>
            {submittedData.message.includes('Warning') && (
              <p className="text-amber-600 font-medium">⚠️ Please distribute the credentials manually to the student</p>
            )}
          </div>
        </div>
      )}

      {/* Form Card */}
      <form 
        onSubmit={handleSubmit} 
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 max-w-2xl"
      >
        {/* Student ID Field */}
        <div className="space-y-3">
          <label htmlFor="student_id" className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Student ID
          </label>
          <input
            id="student_id"
            name="student_id"
            type="text"
            placeholder="e.g., 2305108"
            value={formData.student_id}
            onChange={handleInputChange}
            disabled={loading}
            inputMode="numeric"
            maxLength={7}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium placeholder-gray-400 disabled:opacity-50"
            required
          />
          <p className="text-xs text-gray-500">Must be exactly 7 digits (e.g., 2305108)</p>
        </div>

        {/* Email Field */}
        <div className="space-y-3">
          <label htmlFor="email_address" className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            Email Address
          </label>
          <input
            id="email_address"
            name="email_address"
            type="email"
            placeholder="student@example.com"
            value={formData.email_address}
            onChange={handleInputChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium placeholder-gray-400 disabled:opacity-50"
            required
          />
          <p className="text-xs text-gray-500">Valid email address for account notifications</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Account Creation Process</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>A unique user ID will be generated (student_id@buet.ac.bd)</li>
              <li>A secure random password will be created</li>
              <li>Login credentials will be sent to the provided email</li>
            </ul>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl text-white font-bold flex items-center justify-center gap-3 transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : `${theme.primary} shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-100`
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              <span>Create Student Account</span>
            </>
          )}
        </button>
      </form>

      {/* Additional Info Box */}
      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 max-w-2xl">
        <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Important Notes
        </h3>
        <ul className="text-sm text-amber-900 space-y-2 list-disc list-inside">
          <li>Ensure the email address is correct - it will be used for initial login credentials</li>
          <li>The student should check their email spam folder if they don't receive credentials</li>
          <li>If the email fails to send, you can manually distribute the credentials</li>
          <li>Once an account is created, the student can update their profile and password</li>
        </ul>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT WITH TABS =====
const StaffAddStudents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  const tabs = [
    { id: 'list' as const, label: 'Student List' },
    { id: 'add' as const, label: 'Add New Student' },
  ];

  return (
    <div className="staff-add-students">
      {/* Tab Navigation */}
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

      {/* Tab Content */}
      {activeTab === 'list' && <StudentListTab />}
      {activeTab === 'add' && <AddStudentTab />}

      <style>{`
        .staff-add-students {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default StaffAddStudents;
