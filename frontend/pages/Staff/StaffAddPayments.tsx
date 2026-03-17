import React, { useState, useEffect } from 'react';

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

const API_BASE_URL = 'http://localhost:5000/staff';

const StaffAddPayments: React.FC = () => {
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

  // Fetch rooms and batches on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [roomsRes, batchesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/rooms`),
          fetch(`${API_BASE_URL}/batches`)
        ]);

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

    fetchInitialData();
  }, []);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch students whenever filters change
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
        if (selectedRoom) params.append('room', selectedRoom);
        if (selectedBatch) params.append('batch', selectedBatch);

        const response = await fetch(`${API_BASE_URL}/students?${params.toString()}`);

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

      const response = await fetch(`${API_BASE_URL}/add-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

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

export default StaffAddPayments;
