import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { 
  User, Phone, Mail, BookOpen, MapPin, Camera, 
  Lock, CheckCircle, AlertTriangle, Shield, Key, Edit2, X, Save
} from 'lucide-react';

const DEPARTMENTS = [
  { code: '01', name: 'Architecture (ARC)' },
  { code: '02', name: 'Chemical Engineering (CHE)' },
  { code: '03', name: 'Civil Engineering (CIV)' },
  { code: '04', name: 'Mechanical Engineering (MEC)' },
  { code: '05', name: 'Computer Science & Engineering (CSE)' },
  { code: '06', name: 'Materials & Metallurgical Eng. (MME)' },
  { code: '07', name: 'Naval Arch. & Marine Eng. (NAME)' },
  { code: '08', name: 'Industrial & Production Eng. (IPE)' },
  { code: '09', name: 'Water Resources Engineering (WRE)' },
  { code: '10', name: 'Urban & Regional Planning (URP)' },
  { code: '11', name: 'Biomedical Engineering (BME)' },
  { code: '42', name: 'Electrical & Electronic Engineering (EEE)' }
];

interface StudentProfileData {
  student_id: string;
  name: string;
  phone_number: string;
  department: string;
  batch_year: string;
  hall_name: string;
  email_address: string;
  has_photo: boolean;
  room_id: string;
  seat_number: string;
}

const StudentProfile: React.FC = () => {
  const { theme } = useAppContext();

  // --- Logic States (Unchanged) ---
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [forceProfileCompletion, setForceProfileCompletion] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone_number: '',
    department: '',
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [passwordMode, setPasswordMode] = useState(false);
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [passwordFormData, setPasswordFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching (Unchanged) ---
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch('http://localhost:5000/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.hash = '#/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch profile');
      const data: StudentProfileData & { needs_profile_completion?: boolean } = await response.json();
      setProfile(data);
      const needsCompletion = !!data.needs_profile_completion || !data.name?.trim() || !data.phone_number?.trim();
      setForceProfileCompletion(needsCompletion);
      if (needsCompletion) {
        setEditMode(true);
        setPasswordMode(true);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoto = async () => {
    if (!profile?.has_photo) {
      setPhotoUrl(null);
      return;
    }
    try {
      const token = localStorage.getItem('hallmate_token');
      const res = await fetch('http://localhost:5000/student/profile/photo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        setPhotoUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Failed to load photo', err);
    }
  };

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => {
    if (profile?.has_photo) fetchPhoto();
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [profile]);

  // --- Handlers (Unchanged) ---
  const beginEdit = () => {
    if (!profile) return;
    setEditFormData({
      name: profile.name || '',
      phone_number: profile.phone_number || '',
      department: profile.department || '',
      photo: null
    });
    setPhotoPreview(null);
    setEditMode(true);
    setError(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditFormData({ name: '', phone_number: '', department: '', photo: null });
    setPhotoPreview(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setEditFormData(prev => ({ ...prev, photo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveEdit = async () => {
    if (!editFormData.name.trim()) return setError('Name cannot be empty');
    if (!editFormData.phone_number.trim()) return setError('Phone number cannot be empty');

    setError(null);
    setIsSaving(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const formData = new FormData();
      formData.append('name', editFormData.name.trim());
      formData.append('phone_number', editFormData.phone_number.trim());
      if (editFormData.photo) formData.append('photo', editFormData.photo);

      const response = await fetch('http://localhost:5000/student/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.status === 401 || response.status === 403) return window.location.hash = '#/login';
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to update profile');
      }

      setSuccessMessage('Student profile saved successfully');
      setEditMode(false);
      setForceProfileCompletion(false);
      setPhotoPreview(null);
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const openPasswordFlow = () => {
    setPasswordMode(true); setPasswordStep(1);
    setPasswordFormData({ old_password: '', new_password: '', confirm_password: '' });
    setPasswordError(null);
  };

  const closePasswordFlow = () => {
    setPasswordMode(false); setPasswordStep(1);
    setPasswordFormData({ old_password: '', new_password: '', confirm_password: '' });
    setPasswordError(null);
  };

  const nextPasswordStep = async () => {
    if (!passwordFormData.old_password.trim()) return setPasswordError('Current password is required');
    
    setIsSaving(true);
    setPasswordError(null);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch('http://localhost:5000/student/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: passwordFormData.old_password })
      });

      if (response.status === 401 || response.status === 403) return window.location.hash = '#/login';
      
      const body = await response.json().catch(() => null);
      
      if (!response.ok) {
        setPasswordError(body?.error || 'Failed to verify password');
        return;
      }

      setPasswordError(null);
      setPasswordStep(2);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to verify password');
    } finally {
      setIsSaving(false);
    }
  };

  const submitPassword = async () => {
    if (!passwordFormData.new_password.trim() || !passwordFormData.confirm_password.trim()) 
      return setPasswordError('New password and confirmation are required');
    if (passwordFormData.new_password !== passwordFormData.confirm_password) 
      return setPasswordError('New password and confirm password must match');

    setIsSaving(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch('http://localhost:5000/student/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwordFormData)
      });

      if (response.status === 401 || response.status === 403) return window.location.hash = '#/login';
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to change password');
      }

      setSuccessMessage('Password changed successfully');
      closePasswordFlow();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium">Loading profile information...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-500 font-medium">No profile found.</div>;

  const currentDepartmentInList = DEPARTMENTS.find(d => d.name === profile.department || d.code === profile.department);
  const displayPhoto = photoPreview || photoUrl;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <p className="text-gray-500 mt-1">Manage your personal information and security settings.</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 font-medium">
          <CheckCircle className="w-5 h-5 shrink-0" /> {successMessage}
        </div>
      )}
      {forceProfileCompletion && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Profile Completion Required</p>
            <p className="text-sm mt-1">Please complete your name and phone number. A password change is also recommended if this is your first sign-in.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Photo & Quick Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`h-24 ${theme.primary}`}></div>
            <div className="px-6 pb-6 relative text-center">
              
              {/* Photo Area */}
              <div className="relative inline-block -mt-12 mb-4 group">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-100 overflow-hidden flex items-center justify-center">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                {editMode && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <h3 className="text-xl font-black text-gray-800">{profile.name || 'Unnamed Student'}</h3>
              <p className="text-gray-500 font-medium mt-1">{profile.student_id}</p>
              
              <div className="mt-4 inline-block bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
                {profile.hall_name}
              </div>
            </div>
          </div>

          {/* Contact Quick Links */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-gray-400" /> Contact Info
            </h4>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Email</span>
                <span className="text-gray-800 font-bold truncate max-w-[150px]">{profile.email_address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Phone</span>
                <span className="text-gray-800 font-bold">{profile.phone_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Detailed Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400" /> Academic Details
              </h3>
              {!editMode && !forceProfileCompletion && (
                <button onClick={beginEdit} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm shadow-sm">
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                  {editMode ? (
                    <input name="name" value={editFormData.name} onChange={handleEditChange} placeholder="Enter your full name" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" />
                  ) : (
                    <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm">{profile.name || 'Not provided'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                  {editMode ? (
                    <input name="phone_number" value={editFormData.phone_number} onChange={handleEditChange} placeholder="e.g. 01XXXXXXXXX" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" />
                  ) : (
                    <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm">{profile.phone_number || 'Not provided'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                  <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm">
                    {currentDepartmentInList?.name || profile.department || 'Not set'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Batch Year</label>
                  <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm">{profile.batch_year}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Number</label>
                  <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {profile.room_id || 'Not allocated'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seat Number</label>
                  <div className="p-3 bg-gray-50 border border-transparent rounded-xl text-gray-800 font-medium text-sm">{profile.seat_number || 'Not allocated'}</div>
                </div>
              </div>

              {/* Edit Mode Actions */}
              {editMode && (
                <div className="mt-8 flex gap-3 pt-6 border-t border-gray-100">
                  <button onClick={saveEdit} disabled={isSaving} className={`flex-1 flex justify-center items-center gap-2 py-3 font-bold rounded-xl text-white shadow-lg shadow-blue-900/20 transition-all ${theme.primary}`}>
                    <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={cancelEdit} disabled={isSaving || forceProfileCompletion} className={`flex-1 py-3 font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all ${forceProfileCompletion ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-400" /> Security Settings
              </h3>
              {!passwordMode && (
                <button onClick={openPasswordFlow} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm shadow-sm">
                  Change Password
                </button>
              )}
            </div>

            {passwordMode && (
              <div className="p-6">
                {passwordError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{passwordError}</div>}
                
                {passwordStep === 1 ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                      <input type="password" name="old_password" value={passwordFormData.old_password} onChange={e => setPasswordFormData(p => ({ ...p, old_password: e.target.value }))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={nextPasswordStep} className={`flex-1 py-3 font-bold rounded-xl text-white shadow-md ${theme.primary}`}>Verify</button>
                      {!forceProfileCompletion && <button onClick={closePasswordFlow} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                      <input type="password" name="new_password" value={passwordFormData.new_password} onChange={e => setPasswordFormData(p => ({ ...p, new_password: e.target.value }))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input type="password" name="confirm_password" value={passwordFormData.confirm_password} onChange={e => setPasswordFormData(p => ({ ...p, confirm_password: e.target.value }))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={submitPassword} disabled={isSaving} className="flex-1 py-3 font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-md transition-colors">{isSaving ? 'Updating...' : 'Update Password'}</button>
                      <button onClick={() => setPasswordStep(1)} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200">Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentProfile;