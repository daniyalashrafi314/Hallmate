import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { User, Mail, Phone, Building2, Badge, AlertCircle, Users, X } from 'lucide-react';

interface StaffProfileData {
  staff_id: string;
  staff_name: string;
  phone_number: string;
  role: string;
  hall_id: string;
  hall_name: string;
  provost: string;
  email_address: string;
}

const StaffProfile: React.FC = () => {
  const { theme } = useAppContext();
  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Edit Mode State
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    staff_name: '',
    phone_number: '',
    email_address: ''
  });

  // Password Mode State
  const [passwordMode, setPasswordMode] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/staff/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Edit Profile Handlers
  const handleEditClick = () => {
    if (profile) {
      setEditFormData({
        staff_name: profile.staff_name,
        phone_number: profile.phone_number,
        email_address: profile.email_address
      });
      setEditMode(true);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditFormData({
      staff_name: '',
      phone_number: '',
      email_address: ''
    });
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/staff/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) throw new Error('Failed to update profile');
      
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload profile data
      await fetchProfile();
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Password Change Handlers
  const handlePasswordOpen = () => {
    setPasswordMode(true);
    setPasswordError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordCancel = () => {
    setPasswordMode(false);
    setPasswordFormData({
      new_password: '',
      confirm_password: ''
    });
    setPasswordError(null);
  };

  const handlePasswordSave = async () => {
    if (!passwordFormData.new_password) {
      setPasswordError('Password is required');
      return;
    }

    if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/staff/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordFormData)
      });

      if (!response.ok) throw new Error('Failed to change password');
      
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      handlePasswordCancel();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`text-center py-12 ${theme.text}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 flex gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
          <p className="text-yellow-800">No profile data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>Staff Profile</h2>
        <p className="text-gray-500">Your personal staff information and credentials.</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex gap-3">
          <AlertCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section with Avatar */}
        <div className={`${theme.primary} text-white p-8 flex items-center gap-6`}>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-3xl font-bold">{editMode ? editFormData.staff_name : profile.staff_name}</h3>
            <p className="text-white/80">{profile.role} • {profile.staff_id}</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-8 space-y-8">
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Email */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Email Address</label>
              </div>
              {editMode ? (
                <input
                  type="email"
                  name="email_address"
                  value={editFormData.email_address}
                  onChange={handleEditChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-blue-200 focus:border-blue-500 outline-none transition-all font-medium"
                />
              ) : (
                <p className="text-lg font-medium text-gray-800">{profile.email_address}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Phone Number</label>
              </div>
              {editMode ? (
                <input
                  type="tel"
                  name="phone_number"
                  value={editFormData.phone_number}
                  onChange={handleEditChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-blue-200 focus:border-blue-500 outline-none transition-all font-medium"
                />
              ) : (
                <p className="text-lg font-medium text-gray-800">{profile.phone_number}</p>
              )}
            </div>

            {/* Staff Name */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Full Name</label>
              </div>
              {editMode ? (
                <input
                  type="text"
                  name="staff_name"
                  value={editFormData.staff_name}
                  onChange={handleEditChange}
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-blue-200 focus:border-blue-500 outline-none transition-all font-medium"
                />
              ) : (
                <p className="text-lg font-medium text-gray-800">{profile.staff_name}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Position</label>
              </div>
              <p className="text-lg font-medium text-gray-800 capitalize">{profile.role}</p>
            </div>

            {/* Assigned Hall */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Assigned Hall</label>
              </div>
              <p className="text-lg font-medium text-gray-800">{profile.hall_name}</p>
            </div>

            {/* Hall ID */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Hall ID</label>
              </div>
              <p className="text-lg font-medium text-gray-800">{profile.hall_id}</p>
            </div>

            {/* Provost */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Hall Provost</label>
              </div>
              <p className="text-lg font-medium text-gray-800">{profile.provost}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 flex gap-4">
            {editMode ? (
              <>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : `${theme.primary} shadow-lg hover:shadow-xl hover:scale-[1.02]`
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${theme.primary} shadow-lg hover:shadow-xl hover:scale-[1.02]`}
                >
                  Edit Profile
                </button>
                <button
                  onClick={handlePasswordOpen}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Change Password
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-3">
        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
        <div>
          <p className="text-blue-900 font-semibold mb-1">Profile Information</p>
          <p className="text-blue-800 text-sm">
            This is your official staff profile. If you need to make changes, please contact your hall administration.
          </p>
        </div>
      </div>

      {/* Password Change Modal */}
      {passwordMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Change Password</h3>
              <button
                onClick={handlePasswordCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-800 text-sm">{passwordError}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase">New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordFormData.new_password}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-200 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase">Confirm Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordFormData.confirm_password}
                  onChange={handlePasswordChange}
                  placeholder="Confirm password"
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-200 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handlePasswordSave}
                disabled={isSaving}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                  isSaving ? 'opacity-50 cursor-not-allowed bg-blue-500' : 'bg-blue-500 hover:bg-blue-600 hover:scale-[1.02]'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Password'}
              </button>
              <button
                onClick={handlePasswordCancel}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;
