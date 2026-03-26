import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Heart, Plus, Calendar, User, Phone, CheckCircle2, AlertCircle, Trash2, ArrowRight, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// --- Types ---
interface Donation {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterType: 'Student' | 'Staff';
  description: string;
  endDate: string;
  phone: string;
  status: 'Pending' | 'Approved' | 'Refused';
}

const StaffDonations: React.FC = () => {
  const { theme, user } = useAppContext();
  
  // --- State ---
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  
  // Wizard State: 0 = Closed, 1 = Form, 2 = Confirm, 3 = Success
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [formData, setFormData] = useState({ endDate: '', phone: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- API URL (Adjust to your backend) ---
  const API_BASE = 'http://localhost:5000/staff/donations';

  // --- 1. Fetch Data ---
  const fetchDonations = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const token = localStorage.getItem('hallmate_token');

      const response = await fetch(API_BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Handle expired token
      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch donations');
      
      const data = await response.json();
      setDonations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // --- Derived Data ---
  const availableDonations = donations.filter(d => d.status === 'Approved');
  const myDonations = donations.filter(d => String(d.requesterId) === String(user?.id));

  // --- 2. Submit New Request (POST) ---
  const handleWizardSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          endDate: formData.endDate // Backend expects this!
        }),
      });

      if (!response.ok) throw new Error('Failed to submit request');
      
      await fetchDonations(false); 
      
      setWizardStep(3);
      
      setTimeout(() => {
        setWizardStep(0);
        setFormData({ endDate: '', phone: '', description: '' });
        setActiveTab('mine');
      }, 2000);
      
    } catch (err) {
      alert("Failed to submit donation request. Check terminal for CORS or DB errors.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. Withdraw Request (DELETE) ---
  const handleDeleteRequest = async (id: string) => {
    if (confirm("Are you sure you want to withdraw this donation request?")) {
      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete request');
        
        // Remove from UI after successful DB deletion
        setDonations(donations.filter(d => d.id !== id));
      } catch (err) {
        alert("Failed to withdraw request.");
        console.error(err);
      }
    }
  };

  // --- Render Helpers ---
  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'Approved': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Approved</span>;
      case 'Pending': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>;
      case 'Refused': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Refused</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Loading community requests...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${theme.text}`}>Donation Requests</h2>
          <p className="text-gray-500 mt-2">Request or view community support initiatives</p>
        </div>
        <button 
          onClick={() => setWizardStep(1)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all ${theme.primary} shadow-lg shadow-blue-900/20 hover:scale-105`}
        >
          <Plus className="w-5 h-5" /> New Request
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-8 border-b-2 border-gray-200">
        <button 
          onClick={() => setActiveTab('all')}
          className={`pb-4 px-2 font-bold transition-all text-lg ${
            activeTab === 'all' 
              ? `${theme.text} border-b-4 ${theme.secondary.split(' ')[0]} -mb-[10px]` 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          All Requests
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`pb-4 px-2 font-bold transition-all text-lg ${
            activeTab === 'mine' 
              ? `${theme.text} border-b-4 ${theme.secondary.split(' ')[0]} -mb-[10px]` 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          My Requests
        </button>
      </div>

      {/* Donations List */}
      <div className="space-y-4">
        {(activeTab === 'all' ? donations : myDonations).map((donation) => (
          <div 
            key={donation.id} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              
              {/* Left: Info Section */}
              <div className="flex-1 min-w-0">
                {/* Requester Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full ${theme.secondary} flex items-center justify-center shrink-0`}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{donation.requesterName}</p>
                      <p className="text-xs text-gray-500">ID: {donation.requesterId}</p>
                    </div>
                  </div>
                  {activeTab === 'mine' && renderStatusBadge(donation.status)}
                </div>

                {/* Description */}
                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                  "{donation.description}"
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Deadline: {format(parseISO(donation.endDate), 'MMM dd, yyyy')}</span>
                  </div>
                  {activeTab === 'mine' && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>bKash: {donation.phone}</span>
                    </div>
                  )}
                  <div className="text-gray-400">
                    {donation.requesterType === 'Staff' ? '👔 Staff Member' : '👨‍🎓 Student'}
                  </div>
                </div>
              </div>

              {/* Right: Action Button */}
              <div className="flex items-end justify-end">
                {activeTab === 'mine' && donation.status === 'Pending' && (
                  <button 
                    onClick={() => handleDeleteRequest(donation.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-600 font-bold bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Withdraw</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {(activeTab === 'all' ? donations : myDonations).length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">
              {activeTab === 'all' ? 'No active donation requests' : 'You haven\'t created any requests yet'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {activeTab === 'all' 
                ? 'Check back soon for community support initiatives' 
                : 'Create a new request to get support from your community'}
            </p>
          </div>
        )}
      </div>

      {/* Donation Request Wizard Modal */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            
            {/* Modal Header */}
            <div className={`${theme.secondary} px-6 py-4 flex justify-between items-center`}>
              <h3 className="font-bold text-white text-lg">
                {wizardStep === 1 ? 'Request Financial Support' : wizardStep === 2 ? 'Review Request' : 'Request Submitted'}
              </h3>
              <button 
                onClick={() => { 
                  setWizardStep(0); 
                  setFormData({ endDate: '', phone: '', description: '' }); 
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Step 1: Form */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-5">
                {/* Description Field */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Request Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Explain why you need financial assistance..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none min-h-[100px] font-medium placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Be clear and concise about your needs</p>
                </div>

                {/* bKash & Deadline Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">bKash Number</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="017XXXXXXXX"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Needed By</label>
                    <input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex gap-3 text-blue-800 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Your request will be visible to others in the community once approved by administrators.</p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => { 
                      setWizardStep(0); 
                      setFormData({ endDate: '', phone: '', description: '' }); 
                    }}
                    className="px-6 py-2 rounded-lg text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if(!formData.description.trim() || !formData.phone.trim() || !formData.endDate) {
                        alert("Please fill all fields");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-bold transition-all ${theme.primary} hover:scale-105`}
                  >
                    Review <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Confirmation */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-5">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">Please review your information before submitting. Once submitted, administrators will review your request.</p>
                </div>
                
                {/* Review Details */}
                <div className="space-y-3 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Request Description</p>
                    <p className="text-gray-800 font-medium">{formData.description}</p>
                  </div>
                  <div className="h-px bg-gray-200"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">bKash Number</p>
                      <p className="text-gray-800 font-medium">{formData.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Needed By</p>
                      <p className="text-gray-800 font-medium">{format(parseISO(formData.endDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between gap-3 pt-2">
                  <button 
                    onClick={() => setWizardStep(1)} 
                    className="px-6 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ← Back to Edit
                  </button>
                  <button 
                    onClick={handleWizardSubmit} 
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-6 py-2 font-bold text-white rounded-lg transition-all ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : `${theme.primary} hover:scale-105 shadow-lg`
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {wizardStep === 3 && (
              <div className="p-10 text-center space-y-4">
                <div className={`w-20 h-20 ${theme.secondary} rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce`}>
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Request Submitted!</h3>
                <p className="text-gray-600">Your donation request has been successfully submitted for review. You'll be notified once it's approved.</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default StaffDonations;
