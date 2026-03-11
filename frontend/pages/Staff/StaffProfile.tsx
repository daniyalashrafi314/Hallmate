import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { User, Mail, Phone, Building2, Badge, Calendar, AlertCircle, Users } from 'lucide-react';

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/staff/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

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

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section with Avatar */}
        <div className={`${theme.primary} text-white p-8 flex items-center gap-6`}>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-3xl font-bold">{profile.staff_name}</h3>
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
              <p className="text-lg font-medium text-gray-800">{profile.email_address}</p>
            </div>

            {/* Phone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-blue-500" />
                <label className="text-xs font-black text-gray-400 uppercase">Phone Number</label>
              </div>
              <p className="text-lg font-medium text-gray-800">{profile.phone_number}</p>
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
            <button className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${theme.primary} shadow-lg hover:shadow-xl hover:scale-[1.02]`}>
              Edit Profile
            </button>
            <button className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
              Change Password
            </button>
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
    </div>
  );
};

export default StaffProfile;
