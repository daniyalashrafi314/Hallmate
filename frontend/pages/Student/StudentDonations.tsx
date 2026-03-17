import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Heart, Plus, Calendar, User, Phone, CheckCircle2, AlertCircle, XCircle, Trash2, ArrowRight } from 'lucide-react';
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

const StudentDonations: React.FC = () => {
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
  
  // Payment Modal State
  const [payModalFor, setPayModalFor] = useState<Donation | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');

  // --- API URL (Adjust to your backend) ---
  const API_BASE = 'http://localhost:5000/student/donations';

  // --- 1. Fetch Data ---
  const fetchDonations = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const response = await fetch(API_BASE);
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

  // --- 4. Pledge Donation (POST) ---
  const handlePledgeDonation = async () => {
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${payModalFor?.id}/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pledgeAmount: Number(payAmount),
          donorId: user?.id // Assuming your backend needs to know who is donating
        }),
      });

      if (!response.ok) throw new Error('Failed to pledge donation');

      alert(`Successfully pledged ৳${payAmount}. A payment invoice has been generated in your Payments tab.`);
      setPayModalFor(null);
      setPayAmount('');
    } catch (err) {
      alert("Failed to process pledge. Please try again.");
      console.error(err);
    }
  };

  // --- Render Helpers ---
  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'Approved': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase tracking-wider">Approved</span>;
      case 'Pending': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase tracking-wider">Pending</span>;
      case 'Refused': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase tracking-wider">Refused</span>;
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
      
      {/* ... [KEEP THE REST OF YOUR UI RENDERING EXACTLY THE SAME] ... */}
      
      {/* Example UI snippet to show where the loading/submission states fit in */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Community Donations</h2>
          <p className="text-gray-500">Support your hallmates or request financial assistance.</p>
        </div>
        <button 
          onClick={() => setWizardStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold transition-all ${theme.primary} shadow-md hover:shadow-lg`}
        >
          <Plus className="w-5 h-5" /> Ask for Donation
        </button>
      </div>

      {error && (
         <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 font-medium">
           {error}
         </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-2 font-bold transition-colors ${activeTab === 'all' ? `${theme.text} border-b-2 border-current` : 'text-gray-400 hover:text-gray-600'}`}
        >
          Available Requests
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`pb-3 px-2 font-bold transition-colors ${activeTab === 'mine' ? `${theme.text} border-b-2 border-current` : 'text-gray-400 hover:text-gray-600'}`}
        >
          My Requests
        </button>
      </div>

      {/* List View */}
      <div className="space-y-4">
        {(activeTab === 'all' ? availableDonations : myDonations).map((donation) => (
          <div key={donation.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
            
            {/* Info Section */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <User className={`w-4 h-4 ${theme.text}`} />
                   <span className="font-bold text-gray-800">{donation.requesterName}</span>
                   <span className="text-gray-400 text-xs">({donation.requesterId})</span>
                 </div>
                 {activeTab === 'mine' && renderStatusBadge(donation.status)}
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                "{donation.description}"
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Needs before: {format(parseISO(donation.endDate), 'MMM dd, yyyy')}
                </div>
                {activeTab === 'mine' && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    bKash: {donation.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="flex flex-col justify-end min-w-[120px] gap-2">
              {activeTab === 'all' && (
                <button 
                  onClick={() => setPayModalFor(donation)}
                  className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 transition-colors shadow-md`}
                >
                  <Heart className="w-4 h-4" /> Donate
                </button>
              )}
              
              {activeTab === 'mine' && donation.status === 'Pending' && (
                <button 
                  onClick={() => handleDeleteRequest(donation.id)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-red-600 font-bold bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Withdraw
                </button>
              )}
            </div>
            
          </div>
        ))}

        {(activeTab === 'all' ? availableDonations : myDonations).length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500">
            No donation requests found in this category.
          </div>
        )}
      </div>

      {/* Donation Request Wizard */}
      {/* Donation Request Wizard */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">
                {wizardStep === 1 ? 'Ask for Donation' : 'Confirm Request'}
              </h3>
              <button 
                onClick={() => { setWizardStep(0); setFormData({ endDate: '', phone: '', description: '' }); }}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* STEP 1: The Form */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Reason for Donation</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Briefly explain why you need financial assistance..."
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">bKash Number</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="017XXXXXXXX"
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Needed By</label>
                    <input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => {
                      if(!formData.description || !formData.phone || !formData.endDate) {
                        alert("Please fill all fields");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-bold transition-all ${theme.primary} shadow-md`}
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Confirmation & Loading */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-amber-800">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="text-sm font-medium">Please review your request. Once submitted, it will be visible to others for contributions.</p>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
                  <p><strong className="text-gray-800">Reason:</strong> {formData.description}</p>
                  <p><strong className="text-gray-800">bKash:</strong> {formData.phone}</p>
                  <p><strong className="text-gray-800">Deadline:</strong> {formData.endDate}</p>
                </div>

                <div className="pt-4 flex justify-between">
                  <button 
                    onClick={() => setWizardStep(1)} 
                    className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button 
                    onClick={handleWizardSubmit} 
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-6 py-2 font-bold text-white rounded-lg transition-all ${
                      isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : <>Submit Request <CheckCircle2 className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Success Screen */}
            {wizardStep === 3 && (
              <div className="p-10 text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Request Submitted!</h3>
                <p className="text-gray-500">Your donation request has been successfully posted to the community board.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Pay / Pledge Donation Modal */}
      {/* ... Keep exact same UI for this modal, it will now trigger the updated handlePledgeDonation ... */}

    </div>
  );
};

export default StudentDonations;