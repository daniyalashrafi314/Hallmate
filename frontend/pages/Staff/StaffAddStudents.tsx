import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Users, Mail, AlertCircle, CheckCircle, User, X } from 'lucide-react';

interface FormData {
  student_id: string;
  email_address: string;
}

const API_BASE_URL = 'http://localhost:5000/staff';

const StaffAddStudents: React.FC = () => {
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
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    // Validate student_id is exactly 7 digits
    if (!formData.student_id.trim()) {
      setError('Student ID is required');
      return false;
    }

    if (!/^\d{7}$/.test(formData.student_id.trim())) {
      setError('Student ID must be exactly 7 digits');
      return false;
    }

    // Validate email
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

      const response = await fetch(`${API_BASE_URL}/add-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create student account (${response.status})`);
      }

      setSuccessMessage(data.message);
      setSubmittedData(data);
      
      // Reset form
      setFormData({
        student_id: '',
        email_address: '',
      });

      // Clear success message after 6 seconds
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
    <div className="max-w-2xl mx-auto space-y-8">
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
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6"
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
      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
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

export default StaffAddStudents;
