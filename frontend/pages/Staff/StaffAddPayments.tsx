import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';

interface Student {
  student_id: string;
  name: string;
  room_id: string;
}

interface Room {
  room_id: string;
}

interface Batch {
  batch: string;
}

interface PaymentFormData {
  payment_type: string;
  amount: string;
  due_date: string;
}

interface PaymentItem {
  payment_id: number;
  student_id: string;
  student_name: string;
  payment_type: string;
  amount: number;
  status: string;
  due_time: string;
  paid_at: string | null;
  delete_pending: boolean;
}

interface PaymentDetail extends PaymentItem {
  student_phone: string;
  student_status: string;
  delete_request_id: number | null;
  delete_request_status: string | null;
}

interface DeleteRequest {
  request_id: number;
  payment_id: number;
  student_name: string;
  payment_type: string;
  amount: number;
  requested_by_name: string;
  requested_at: string;
}

const API_BASE_URL = 'http://localhost:5000/staff';

// Add Payment Tab Component (existing functionality)
const AddPaymentTab: React.FC = () => {
  // Filter state
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Student selection state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    payment_type: '',
    amount: '',
    due_date: '',
  });

  // API data state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const paymentTypes = ['Tuition', 'Hostel', 'Mess', 'Other'];

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hallmate_token');
      const authHeaders = { 'Authorization': `Bearer ${token}` };

      const [roomsRes, batchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/rooms`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/batches`, { headers: authHeaders })
      ]);

      // Check if EITHER request was rejected due to authentication
      if (roomsRes.status === 401 || roomsRes.status === 403 || 
          batchesRes.status === 401 || batchesRes.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!roomsRes.ok || !batchesRes.ok) {
        throw new Error('Failed to fetch initial data');
      }

      const roomsData = await roomsRes.json();
      const batchesData = await batchesRes.json();

      setRooms(roomsData);
      setBatches(batchesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch rooms and batches on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      if (selectedRoom) params.append('room', selectedRoom);
      if (selectedBatch) params.append('batch', selectedBatch);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/students?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }

      const data = await response.json();
      setStudents(data);
      setError(null);
      
      // Clear selection when filters change
      setSelectedStudents(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch students whenever filters change
  useEffect(() => {
    fetchStudents();
  }, [selectedRoom, selectedBatch, debouncedSearchQuery]);

  // Handle individual student checkbox
  const handleStudentSelect = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Handle select/deselect all
  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      const allIds = new Set(students.map((_, index) => index.toString()));
      setSelectedStudents(allIds);
    }
  };

  // Handle payment form changes
  const handlePaymentFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle create payment notices
  const handleCreatePayments = async () => {
    // Validation
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!paymentForm.payment_type) {
      setError('Please select a payment type');
      return;
    }

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!paymentForm.due_date) {
      setError('Please select a due date');
      return;
    }

    // Get selected student IDs and validate
    const selectedStudentIds = students
      .filter((_, index) => selectedStudents.has(index.toString()))
      .map(student => student.student_id);

    if (selectedStudentIds.length === 0) {
      setError('Failed to get selected student details');
      return;
    }

    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    try {
      setSubmitting(true);

      const payload = {
        student_ids: selectedStudentIds,
        payment_type: paymentForm.payment_type,
        amount: parseFloat(paymentForm.amount),
        due_time: paymentForm.due_date,
      };

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/add-payments`, {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create payment notices (${response.status})`);
      }

      await response.json();

      // Success
      setSuccessMessage(
        `Successfully created payment notices for ${selectedStudentIds.length} student${
          selectedStudentIds.length !== 1 ? 's' : ''
        }`
      );

      // Clear form
      setSelectedStudents(new Set());
      setPaymentForm({ payment_type: '', amount: '', due_date: '' });

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error creating payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payment notices');
    } finally {
      setSubmitting(false);
    }
  };

  const isSelectAllChecked = selectedStudents.size === students.length && students.length > 0;
  const isSelectAllIndeterminate = selectedStudents.size > 0 && selectedStudents.size < students.length;

  return (
    <div className="staff-add-payments">
      <h1>Add Payment Notices</h1>

      {/* Filters Section */}
      <div className="filters-section">
        <h2>Filters</h2>
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="room-filter">Room</label>
            <select
              id="room-filter"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="filter-input"
              disabled={loading}
            >
              <option value="">All Rooms</option>
              {rooms.map(room => (
                <option key={room.room_id} value={room.room_id}>{room.room_id}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="batch-filter">Batch</label>
            <select
              id="batch-filter"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="filter-input"
              disabled={loading}
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.batch} value={batch.batch}>{batch.batch}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="search-input">Search</label>
            <input
              id="search-input"
              type="text"
              placeholder="Search by name or student ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Student Table Section */}
      <div className="table-section">
        <h2>Select Students</h2>
        <p className="student-count">
          {selectedStudents.size} of {students.length} students selected
        </p>
        {loading && <div className="loading-message">Loading students...</div>}
        <div className="table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={isSelectAllChecked}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isSelectAllIndeterminate;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="select-all-checkbox"
                    disabled={loading || students.length === 0}
                  />
                </th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Room ID</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((student, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(index.toString())}
                        onChange={() => handleStudentSelect(index.toString())}
                        className="student-checkbox"
                      />
                    </td>
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>{student.room_id}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="no-results">
                    {loading ? 'Loading...' : 'No students found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Form Section */}
      <div className="payment-form-section">
        <h2>Payment Details</h2>
        <div className="form-controls">
          <div className="form-group">
            <label htmlFor="payment-type">Payment Type</label>
            <select
              id="payment-type"
              name="payment_type"
              value={paymentForm.payment_type}
              onChange={handlePaymentFormChange}
              className="form-input"
            >
              <option value="">Select Payment Type</option>
              {paymentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              name="amount"
              placeholder="Enter amount"
              value={paymentForm.amount}
              onChange={handlePaymentFormChange}
              className="form-input"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor="due-date">Due Date</label>
            <input
              id="due-date"
              type="date"
              name="due_date"
              value={paymentForm.due_date}
              onChange={handlePaymentFormChange}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="action-section">
        <button
          className="create-button"
          onClick={handleCreatePayments}
          disabled={selectedStudents.size === 0 || submitting || loading}
        >
          {submitting ? 'Creating Notices...' : 'Create Payment Notices'}
        </button>
      </div>

      <style>{`
        .staff-add-payments {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .staff-add-payments h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
        }

        .staff-add-payments h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #2a2a2a;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #c33;
        }

        .success-message {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #2e7d32;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-message {
          background: #e3f2fd;
          color: #1565c0;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #1565c0;
        }

        /* Filters Section */
        .filters-section {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .filter-input {
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .filter-input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 4px rgba(74, 144, 226, 0.2);
        }

        .filter-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Table Section */
        .table-section {
          background: white;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .student-count {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .student-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .student-table thead {
          background: #f5f5f5;
          border-bottom: 2px solid #e0e0e0;
        }

        .student-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }

        .student-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .student-table tbody tr:hover {
          background: #fafafa;
        }

        .select-all-checkbox,
        .student-checkbox {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .select-all-checkbox:disabled,
        .student-checkbox:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .no-results {
          text-align: center;
          color: #999;
          padding: 24px !important;
        }

        /* Payment Form Section */
        .payment-form-section {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .form-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 4px rgba(74, 144, 226, 0.2);
        }

        /* Action Section */
        .action-section {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .create-button {
          padding: 10px 24px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
          min-width: 200px;
        }

        .create-button:hover:not(:disabled) {
          background: #3a7bc8;
        }

        .create-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .staff-add-payments {
            padding: 16px;
          }

          .filter-controls,
          .form-controls {
            grid-template-columns: 1fr;
          }

          .action-section {
            justify-content: stretch;
          }

          .create-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// View Payments Tab Component
const ViewPaymentsTab: React.FC = () => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const [detailPayment, setDetailPayment] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  const paymentTypes = ['Tuition', 'Hostel', 'Mess', 'Other'];
  const statusOptions = ['Due', 'Paid', 'Overdue'];
  const years = Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - 2 + i}`);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: new Date(0, i).toLocaleString('en', { month: 'short' }) }));

  const buildPaymentsUrl = () => {
    const params = new URLSearchParams();
    params.set('limit', '10');
    params.set('offset', ((currentPage - 1) * 10).toString());

    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (paymentTypeFilter) params.set('payment_type', paymentTypeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (yearFilter) params.set('year', yearFilter);
    if (monthFilter) params.set('month', monthFilter);

    return `${API_BASE_URL}/payments?${params.toString()}`;
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(buildPaymentsUrl(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.data);
      setTotalPayments(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
      setPayments([]);
      setTotalPayments(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      setCurrentPage(1);
      fetchPayments();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, paymentTypeFilter, statusFilter, yearFilter, monthFilter]);

  useEffect(() => {
    fetchPayments();
  }, [currentPage]);

  const openPaymentDetail = async (paymentId: number) => {
    try {
      setDetailLoading(true);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }

      const data: PaymentDetail = await response.json();
      setDetailPayment(data);
    } catch (err) {
      console.error(err);
      alert('Could not load payment details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailPayment(null);
  };

  const handleDeleteRequest = async (paymentId: number) => {
    if (!confirm('Request deletion of this payment? It will need provost approval.')) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/delete-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request deletion');
      }

      // Refresh the list
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert('Could not request payment deletion.');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalPayments / 10));
  const currentFrom = totalPayments > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const currentTo = Math.min(currentPage * 10, totalPayments);

  return (
    <>
      <div className="filters-section">
        <h2>Filters</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="filter-controls">
          <div className="filter-group">
            <label>Search (Name/ID)</label>
            <input
              type="text"
              placeholder="Search student name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Payment Type</label>
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="filter-input"
            >
              <option value="">All Types</option>
              {paymentTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-input"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="filter-input"
            >
              <option value="">All Years</option>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="filter-input"
            >
              <option value="">All Months</option>
              {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-3">Loading payments...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 text-gray-300 mx-auto mb-3">📄</div>
          <h3 className="text-lg font-bold text-gray-800">No payments found</h3>
          <p className="text-gray-500">No payments match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-2 text-xs uppercase text-gray-500 border-b border-gray-100 px-4 py-3">
              <div className="col-span-1">ID</div>
              <div className="col-span-2">Student</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Due Time</div>
              <div className="col-span-2">Paid At</div>
              <div className="col-span-1"><span className="sr-only">Actions</span></div>
            </div>

            {payments.map((payment) => (
              <div
                key={payment.payment_id}
                className={`grid grid-cols-12 items-center gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${payment.delete_pending ? 'bg-gray-50 opacity-75' : ''}`}
              >
                <button
                  onClick={() => openPaymentDetail(payment.payment_id)}
                  className="col-span-1 text-left text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {payment.payment_id}
                </button>
                <div className="col-span-2 text-sm text-gray-700">
                  <div className="font-medium">{payment.student_name}</div>
                  <div className="text-xs text-gray-500">{payment.student_id}</div>
                </div>
                <div className="col-span-2 text-sm text-gray-700">{payment.payment_type}</div>
                <div className="col-span-1 text-sm text-gray-700">৳{payment.amount.toLocaleString()}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    payment.status === 'Due' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.status}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-700">{new Date(payment.due_time).toLocaleDateString()}</div>
                <div className="col-span-2 text-sm text-gray-700">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '-'}</div>
                <div className="col-span-1 text-right">
                  {payment.status === 'Paid' ? (
                    <div className="relative group inline-block">
                      <button
                        disabled
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 border border-gray-200 bg-gray-100 cursor-not-allowed"
                      >
                        <span>🗑️</span>
                        Delete
                      </button>
                      <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg pointer-events-none">
                        Paid payments cannot be deleted
                      </div>
                    </div>
                  ) : payment.delete_pending ? (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Pending</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteRequest(payment.payment_id)}
                      disabled={deletingPaymentId === payment.payment_id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <span>🗑️</span>
                      {deletingPaymentId === payment.payment_id ? 'Requesting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-gray-600">
            <p>Showing {currentFrom} to {currentTo} of {totalPayments} payments</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Prev
              </button>
              <span className="px-2 py-1">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Payment Detail Modal */}
      {detailPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 rounded-t-2xl bg-blue-600 text-white">
              <div>
                <h3 className="text-xl font-bold">Payment Detail</h3>
                {detailLoading ? <p className="text-sm text-white/80">Loading...</p> : null}
              </div>
              <button onClick={closeDetailModal} className="p-2 hover:bg-white/20 rounded-full">
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Payment Info</p>
                  <p className="text-lg font-semibold text-gray-800">ID: {detailPayment.payment_id}</p>
                  <p className="text-sm text-gray-600">{detailPayment.payment_type}</p>
                  <p className="text-sm text-gray-600">৳{detailPayment.amount.toLocaleString()}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-2 ${
                    detailPayment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    detailPayment.status === 'Due' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {detailPayment.status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Student Info</p>
                  <p className="text-lg font-semibold text-gray-800">{detailPayment.student_name}</p>
                  <p className="text-sm text-gray-600">ID: {detailPayment.student_id}</p>
                  <p className="text-sm text-gray-600">Phone: {detailPayment.student_phone}</p>
                  <p className="text-sm text-gray-600">Status: {detailPayment.student_status}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Due Time</p>
                  <p className="text-sm text-gray-700">{new Date(detailPayment.due_time).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs uppercase text-gray-400">Paid At</p>
                  <p className="text-sm text-gray-700">{detailPayment.paid_at ? new Date(detailPayment.paid_at).toLocaleString() : 'Not paid'}</p>
                </div>
              </div>

              <div className="text-right">
                <button onClick={closeDetailModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Delete Requests Tab Component
const DeleteRequestsTab: React.FC = () => {
  const { userRole } = useAppContext();
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  const [statusFilter, setStatusFilter] = useState('Pending');
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const statusOptions = ['Pending', 'Refused'];

  const buildRequestsUrl = () => {
    const params = new URLSearchParams();
    params.set('limit', '10');
    params.set('offset', ((currentPage - 1) * 10).toString());
    params.set('status', statusFilter);

    return `${API_BASE_URL}/payments/delete-requests?${params.toString()}`;
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(buildRequestsUrl(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch delete requests');
      }

      const data = await response.json();
      setRequests(data.data);
      setTotalRequests(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delete requests');
      setRequests([]);
      setTotalRequests(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [currentPage]);

  const handleApproveRequest = async (requestId: number) => {
    if (!confirm('Approve this delete request? The payment will be permanently deleted.')) {
      return;
    }

    try {
      setProcessingRequestId(requestId);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/payments/delete-requests/${requestId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'Approve' })
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }

      // Refresh the list
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Could not approve delete request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRefuseRequest = async (requestId: number) => {
    if (!confirm('Refuse this delete request? The payment will remain active.')) {
      return;
    }

    try {
      setProcessingRequestId(requestId);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/payments/delete-requests/${requestId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'Refuse' })
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refuse request');
      }

      // Refresh the list
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Could not refuse delete request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!confirm('Cancel this delete request?')) {
      return;
    }

    try {
      setProcessingRequestId(requestId);
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE_URL}/payments/delete-requests/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel request');
      }

      // Refresh the list
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Could not cancel delete request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRequests / 10));
  const currentFrom = totalRequests > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const currentTo = Math.min(currentPage * 10, totalRequests);

  return (
    <>
      <div className="filters-section">
        <h2>Filters</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="filter-controls">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-input"
            >
              {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-3">Loading delete requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 text-gray-300 mx-auto mb-3">📋</div>
          <h3 className="text-lg font-bold text-gray-800">No delete requests</h3>
          <p className="text-gray-500">No {statusFilter.toLowerCase()} delete requests found.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-2 text-xs uppercase text-gray-500 border-b border-gray-100 px-4 py-3">
              <div className="col-span-1">Request ID</div>
              <div className="col-span-1">Payment ID</div>
              <div className="col-span-2">Student</div>
              <div className="col-span-2">Payment Type</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-2">Requested By</div>
              <div className="col-span-2">Requested At</div>
              <div className="col-span-1">Status</div>
            </div>

            {requests.map((request) => (
              <div key={request.request_id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="col-span-1 text-sm font-medium text-gray-900">{request.request_id}</div>
                <div className="col-span-1 text-sm text-gray-700">{request.payment_id}</div>
                <div className="col-span-2 text-sm text-gray-700">
                  <div className="font-medium">{request.student_name}</div>
                </div>
                <div className="col-span-2 text-sm text-gray-700">{request.payment_type}</div>
                <div className="col-span-1 text-sm text-gray-700">৳{request.amount.toLocaleString()}</div>
                <div className="col-span-2 text-sm text-gray-700">{request.requested_by_name}</div>
                <div className="col-span-2 text-sm text-gray-700">{new Date(request.requested_at).toLocaleDateString()}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    request.request_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {request.request_status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons for pending requests */}
          {userRole === 'PROVOST' && statusFilter === 'Pending' && requests.some(r => r.request_status === 'Pending') && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Pending Actions</h3>
              <p className="text-sm text-yellow-700 mb-3">As provost, you can approve or refuse delete requests.</p>
              <div className="space-y-2">
                {requests.filter(r => r.request_status === 'Pending').map((request) => (
                  <div key={request.request_id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="text-sm">
                      <span className="font-medium">Request #{request.request_id}</span> - {request.student_name} - {request.payment_type}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.request_id)}
                        disabled={processingRequestId === request.request_id}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingRequestId === request.request_id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleRefuseRequest(request.request_id)}
                        disabled={processingRequestId === request.request_id}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingRequestId === request.request_id ? 'Refusing...' : 'Refuse'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userRole !== 'PROVOST' && statusFilter === 'Pending' && requests.some(r => r.request_status === 'Pending') && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Your Pending Requests</h3>
              <p className="text-sm text-blue-700 mb-3">You can cancel your own pending delete requests.</p>
              <div className="space-y-2">
                {requests.filter(r => r.request_status === 'Pending').map((request) => (
                  <div key={request.request_id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="text-sm">
                      <span className="font-medium">Request #{request.request_id}</span> - {request.student_name} - {request.payment_type}
                    </div>
                    <button
                      onClick={() => handleCancelRequest(request.request_id)}
                      disabled={processingRequestId === request.request_id}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {processingRequestId === request.request_id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-gray-600">
            <p>Showing {currentFrom} to {currentTo} of {totalRequests} requests</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Prev
              </button>
              <span className="px-2 py-1">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const StaffAddPayments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'view' | 'delete'>('add');

  const tabs = [
    { id: 'add' as const, label: 'Add Payment' },
    { id: 'view' as const, label: 'View Payments' },
    { id: 'delete' as const, label: 'Delete Requests' },
  ];

  return (
    <div className="staff-add-payments">
      <h1>Payment Management</h1>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'add' && <AddPaymentTab />}
      {activeTab === 'view' && <ViewPaymentsTab />}
      {activeTab === 'delete' && <DeleteRequestsTab />}

      <style>{`
        .staff-add-payments {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .staff-add-payments h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #1a1a1a;
        }

        .tab-navigation {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 24px;
        }

        .tab-button {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          color: #333;
        }

        .tab-button.active {
          color: #4a90e2;
          border-bottom-color: #4a90e2;
        }

        /* Existing styles for Add Payment tab */
        .staff-add-payments h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #2a2a2a;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #c33;
        }

        .success-message {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #2e7d32;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-message {
          background: #e3f2fd;
          color: #1565c0;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          border-left: 4px solid #1565c0;
        }

        /* Filters Section */
        .filters-section {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .filter-input {
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .filter-input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 4px rgba(74, 144, 226, 0.2);
        }

        .filter-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Table Section */
        .table-section {
          background: white;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .student-count {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .student-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .student-table thead {
          background: #f5f5f5;
          border-bottom: 2px solid #e0e0e0;
        }

        .student-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }

        .student-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .student-table tbody tr:hover {
          background: #fafafa;
        }

        .select-all-checkbox,
        .student-checkbox {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .select-all-checkbox:disabled,
        .student-checkbox:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .no-results {
          text-align: center;
          color: #999;
          padding: 24px !important;
        }

        /* Payment Form Section */
        .payment-form-section {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e0e0e0;
        }

        .form-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 4px rgba(74, 144, 226, 0.2);
        }

        /* Action Section */
        .action-section {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .create-button {
          padding: 10px 24px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
          min-width: 200px;
        }

        .create-button:hover:not(:disabled) {
          background: #3a7bc8;
        }

        .create-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .staff-add-payments {
            padding: 16px;
          }

          .filter-controls,
          .form-controls {
            grid-template-columns: 1fr;
          }

          .action-section {
            justify-content: stretch;
          }

          .create-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffAddPayments;