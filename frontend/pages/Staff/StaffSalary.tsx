import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { CreditCard, ChevronLeft, ChevronRight, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
interface SalaryPayment {
  payment_id: number;
  payment_type: string;
  amount: number;
  status: string;
  due_time: string;
  paid_at: string | null;
}

interface SalaryDetails extends SalaryPayment {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  base_salary: number;
  payment_amount?: number;
}

const API_BASE_URL = 'http://localhost:5000/staff';
const ITEMS_PER_PAGE = 10;

const StaffSalary: React.FC = () => {
  const { theme } = useAppContext();
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSalaries, setTotalSalaries] = useState(0);
  
  // Modal state
  const [selectedSalary, setSelectedSalary] = useState<SalaryDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch paginated salaries
  const fetchSalaries = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const response = await fetch(
        `${API_BASE_URL}/salary?limit=${ITEMS_PER_PAGE}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch salary payments');
      }

      const data = await response.json();
      setSalaries(data.data);
      setTotalSalaries(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary payments');
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch salary details
  const fetchSalaryDetails = async (paymentId: number) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`${API_BASE_URL}/salary/${paymentId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch salary details');
      }

      const data = await response.json();
      setSelectedSalary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchSalaries(currentPage);
  }, [currentPage]);

  // Calculate pagination
  const totalPages = Math.ceil(totalSalaries / ITEMS_PER_PAGE);

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid') {
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: CheckCircle,
        label: 'Paid'
      };
    } else if (statusLower === 'pending') {
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: Clock,
        label: 'Pending'
      };
    }
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: XCircle,
      label: status
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>My Salary Payments</h2>
          <p className="text-gray-500">View and manage your salary payment history.</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salary payments...</p>
        </div>
      ) : salaries.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Salary Payments</h3>
          <p className="text-gray-500">You don't have any salary payment records yet.</p>
        </div>
      ) : (
        /* Salary List */
        <>
          <div className="space-y-3">
            {salaries.map((salary) => {
              const statusInfo = getStatusBadge(salary.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <button
                  key={salary.payment_id}
                  onClick={() => fetchSalaryDetails(salary.payment_id)}
                  className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Left Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-lg ${statusInfo.bg}`}>
                          <CreditCard className={`w-5 h-5 ${statusInfo.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{salary.payment_type}</h3>
                          <p className="text-sm text-gray-500">Payment ID: {salary.payment_id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Center Content - Amount */}
                    <div className="md:text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(salary.amount)}
                      </p>
                    </div>

                    {/* Right Content - Status and Date */}
                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.text}`} />
                        <span className={`text-sm font-semibold ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {formatDate(salary.due_time)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {salaries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalSalaries)} of {totalSalaries} payments
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                    onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      {/* Salary Details Modal */}
      {selectedSalary && (
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-8"
          onClick={() => setSelectedSalary(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Salary Payment Details</h3>
              <button
                onClick={() => setSelectedSalary(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close details"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            {loadingDetails ? (
              <div className="p-6 text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading details...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Staff Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    Staff Information
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="font-bold text-gray-900">{selectedSalary.staff_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Role</p>
                      <p className="font-bold text-gray-900">{selectedSalary.staff_role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Staff ID</p>
                      <p className="font-bold text-gray-900">{selectedSalary.staff_id}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <p className="text-gray-600">Payment Type</p>
                    <p className="font-bold text-gray-900">{selectedSalary.payment_type}</p>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between items-start">
                    <p className="text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(selectedSalary.payment_amount || selectedSalary.amount)}
                    </p>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between items-start">
                    <p className="text-gray-600">Base Salary</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(selectedSalary.base_salary)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-gray-600 mb-2">Status</p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusBadge(selectedSalary.status).bg}`}>
                      {React.createElement(getStatusBadge(selectedSalary.status).icon, {
                        className: `w-5 h-5 ${getStatusBadge(selectedSalary.status).text}`
                      })}
                      <span className={`font-bold ${getStatusBadge(selectedSalary.status).text}`}>
                        {getStatusBadge(selectedSalary.status).label}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Due Date</p>
                      <p className="font-bold text-gray-900">
                        {formatDate(selectedSalary.due_time)}
                      </p>
                    </div>
                    {selectedSalary.paid_at && (
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-xs text-gray-600 mb-1">Paid Date</p>
                        <p className="font-bold text-green-700">
                          {formatDate(selectedSalary.paid_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payment ID */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-600">Payment ID</p>
                    <p className="font-mono text-sm text-gray-900">#{selectedSalary.payment_id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setSelectedSalary(null)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${theme.primary} text-white hover:shadow-lg`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSalary;
