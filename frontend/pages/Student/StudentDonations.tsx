import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Heart, Plus, Calendar, User, Phone, CheckCircle2, AlertCircle, XCircle, Trash2, DollarSign, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// --- Types ---
interface Donation {
  id: string;
  studentId: string;
  studentName: string;
  description: string;
  endDate: string;
  phone: string;
  status: 'Pending' | 'Approved' | 'Refused';
}

const StudentDonations: React.FC = () => {
  const { theme, user } = useAppContext();
  
  // --- State ---
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  
  // Wizard State: 0 = Closed, 1 = Form, 2 = Confirm, 3 = Success
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [formData, setFormData] = useState({ endDate: '', phone: '', description: '' });
  
  // Payment Modal State
  const [payModalFor, setPayModalFor] = useState<Donation | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');

  // --- Mock Data ---
  const [donations, setDonations] = useState<Donation[]>([
    {
      id: 'D101',
      studentId: '2105123',
      studentName: 'Rahim Uddin',
      description: 'Medical assistance required for an urgent appendicitis surgery. Any contribution will help cover the hospital bills.',
      endDate: '2026-03-25T23:59:59Z',
      phone: '01711000000',
      status: 'Approved'
    },
    {
      id: 'D102',
      studentId: '2205001',
      studentName: 'Karim Hasan',
      description: 'Departmental senior project funding shortfall. Need help buying specific microcontrollers.',
      endDate: '2026-04-10T23:59:59Z',
      phone: '01811000000',
      status: 'Approved'
    },
    {
      id: 'D103',
      studentId: user?.id || '2305108',
      studentName: user?.name || 'Current User',
      description: 'Requesting financial aid for the upcoming semester tuition fees due to a sudden family crisis.',
      endDate: '2026-05-01T23:59:59Z',
      phone: '01911000000',
      status: 'Pending'
    }
  ]);

  // --- Derived Data ---
  // "All" tab only shows Approved requests that haven't expired (mock logic assumes dates are in the future)
  const availableDonations = donations.filter(d => d.status === 'Approved');
  const myDonations = donations.filter(d => d.studentId === user?.id);

  // --- Handlers ---
  const handleWizardSubmit = () => {
    // Transition to Success Step
    setWizardStep(3);
    
    // Simulate Backend API Call (POST /student/donations)
    const newDonation: Donation = {
      id: `D${Math.floor(Math.random() * 1000)}`,
      studentId: user?.id || 'Unknown',
      studentName: user?.name || 'Unknown',
      description: formData.description,
      endDate: new Date(formData.endDate).toISOString(),
      phone: formData.phone,
      status: 'Pending'
    };

    setDonations([newDonation, ...donations]);

    // Close wizard after 2 seconds
    setTimeout(() => {
      setWizardStep(0);
      setFormData({ endDate: '', phone: '', description: '' });
      setActiveTab('mine'); // Automatically switch to 'mine' tab to see it
    }, 2000);
  };

  const handleDeleteRequest = (id: string) => {
    if (confirm("Are you sure you want to withdraw this donation request?")) {
      // Simulate Backend API Call (DELETE /student/donations/:id)
      setDonations(donations.filter(d => d.id !== id));
    }
  };

  const handlePledgeDonation = () => {
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // Simulate Backend API Call (POST /student/donations/:id/pledge)
    // This is where your backend logic will create an entry in the PAYMENTS and GENERATES table!
    alert(`Successfully pledged ৳${payAmount}. A payment invoice has been generated in your Payments tab.`);
    
    setPayModalFor(null);
    setPayAmount('');
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* Header Section */}
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
                   <span className="font-bold text-gray-800">{donation.studentName}</span>
                   <span className="text-gray-400 text-xs">({donation.studentId})</span>
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

      {/* ========================================= */}
      {/* MODALS & WIZARDS BELOW */}
      {/* ========================================= */}

      {/* Donation Request Wizard */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            
            {/* Step 1: Input Form */}
            {wizardStep === 1 && (
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Request Financial Aid</h3>
                  <button onClick={() => setWizardStep(0)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Student ID</label>
                      <input type="text" disabled value={user?.id || ''} className="w-full p-2 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Hall Name</label>
                      <input type="text" disabled value={user?.hall || 'Fazlul Huq Muslim Hall'} className="w-full p-2 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Need by Date</label>
                    <input 
                      type="date" 
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">bKash Number (For Payout)</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 01700000000"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Reasoning / Description</label>
                    <textarea 
                      placeholder="Explain why you are requesting these funds..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full h-24 p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={() => setWizardStep(0)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button 
                    onClick={() => setWizardStep(2)} 
                    disabled={!formData.endDate || !formData.phone || !formData.description}
                    className={`px-6 py-2 font-bold text-white rounded-lg transition-colors ${(!formData.endDate || !formData.phone || !formData.description) ? 'bg-gray-300' : theme.primary}`}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Confirmation */}
            {wizardStep === 2 && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Confirm Request</h3>
                
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Your request will be sent to the Provost for approval. Once approved, it will be visible to all hall residents. Make sure your bKash number is correct.
                  </p>
                </div>

                <div className="space-y-2 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm"><span className="font-bold text-gray-500">Phone:</span> {formData.phone}</p>
                  <p className="text-sm"><span className="font-bold text-gray-500">Deadline:</span> {formData.endDate}</p>
                  <p className="text-sm italic text-gray-600 mt-2">"{formData.description}"</p>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setWizardStep(1)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Back to Edit</button>
                  <button 
                    onClick={handleWizardSubmit} 
                    className="flex items-center gap-2 px-6 py-2 font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg"
                  >
                    Submit to Provost <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {wizardStep === 3 && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-500">Your application is now pending Provost approval.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Pay / Pledge Donation Modal */}
      {payModalFor && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Make a Donation</h3>
            <p className="text-sm text-gray-500 mb-6">Supporting {payModalFor.studentName}</p>
            
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">৳</span>
              <input 
                type="number" 
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-10 pr-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl outline-none focus:border-green-500 text-gray-800 transition-colors"
              />
            </div>

            <p className="text-xs text-gray-400 mb-6 px-4">
              Confirming this will generate a payment obligation in your "Payments" tab. You can clear it via bKash there.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => { setPayModalFor(null); setPayAmount(''); }} 
                className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePledgeDonation}
                className="flex-1 py-3 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-md shadow-green-900/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDonations;