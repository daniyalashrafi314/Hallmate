import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, XCircle, FileText, Info } from 'lucide-react';

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
  { code: '42', name: 'Electrical & Electronic Engineering (EEE)' },
];

const StudentSeatApplication: React.FC = () => {
  const { theme } = useAppContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Application State
  const [appStatus, setAppStatus] = useState<'None' | 'Pending' | 'Approved' | 'Refused'>('None');
  const [reasoning, setReasoning] = useState('');

  // Profile State
  const [profile, setProfile] = useState({
    student_id: '',
    name: '',
    department: '',
    batch_year: '',
    phone: ''
  });

  const API_BASE = 'http://localhost:5000/student/seat-application';

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');

      const response = await fetch(`${API_BASE}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAppStatus(data.status);
        setProfile(data.profile);
        if (data.reasoning && data.status === 'Pending') {
          setReasoning(data.reasoning);
        }
      }
    } catch (error) {
      console.error("Failed to fetch application status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleCancelOrAcknowledge = async (isRefusalAcknowledge = false) => {
    const msg = isRefusalAcknowledge
      ? "Clear this notification and start a new application?"
      : "Are you sure you want to cancel your current application?";

    if (confirm(msg)) {
      try {
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(`${API_BASE}/cancel`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` } 
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = '#/login';
          return;
        }

        if (response.ok) {
          setAppStatus('None');
          setStep(1);
          setReasoning('');
        } else {
          alert("Failed to clear application.");
        }
      } catch (error) {
        alert("Network error. Failed to clear application.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!reasoning.trim()) {
      alert("Please provide your reasoning.");
      return;
    }
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          reasoning,
          phone: profile.phone,
          department: profile.department
        })
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (response.ok) {
        setAppStatus('Pending');
      } else {
        alert("Submission failed.");
      }
    } catch (error) {
      alert("Network error.");
    }
  };

  if (loading) {
    return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>;
  }

  // --- VIEW: ALREADY APPROVED ---
  if (appStatus === 'Approved') {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-12 rounded-2xl shadow-sm border border-green-100 text-center">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Application Approved</h2>
        <p className="text-gray-500 mt-2">You have been allocated a seat. Please check your profile or notices for room details.</p>
      </div>
    );
  }

  // --- VIEW: REFUSED ---
  if (appStatus === 'Refused') {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-12 rounded-2xl shadow-sm border border-red-100 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Application Denied</h2>
        <p className="text-red-600 font-medium mt-2 max-w-sm mx-auto">
          Your seat application was denied by the provost after careful evaluation.
        </p>
        <button
          onClick={() => handleCancelOrAcknowledge(true)}
          className="mt-8 px-6 py-2 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
        >
          Acknowledge & Reapply
        </button>
      </div>
    );
  }

  // --- VIEW: PENDING ---
  if (appStatus === 'Pending') {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Application Pending</h2>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
          You already have a seat application in review by the Provost Office. Please wait for an evaluation before reapplying.
        </p>
        <div className="mt-8 pt-8 border-t border-gray-100">
          <button
            onClick={() => handleCancelOrAcknowledge(false)}
            className="flex items-center gap-2 px-6 py-2 rounded-lg border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors mx-auto"
          >
            <XCircle className="w-5 h-5" /> Cancel Current Application
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: WIZARD (No Application) ---
  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="mb-10">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Seat Application</h2>
        <p className="text-gray-500">Apply for a room in the university residential halls.</p>

        {/* Progress Bar */}
        <div className="flex items-center gap-4 mt-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? `${theme.primary} text-white` : 'bg-gray-200 text-gray-500'
                }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <div className={`flex-1 h-1 rounded-full ${step > s ? theme.primary : 'bg-gray-200'}`}></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <div className="p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              Step 1: Verify Profile Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center justify-between">
                  Student ID
                </label>
                <input readOnly value={profile.student_id} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium cursor-not-allowed" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center justify-between">
                  Batch Year
                </label>
                <input readOnly value={profile.batch_year} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium cursor-not-allowed" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center justify-between">
                  Phone Number
                </label>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Department
                </label>
                <select
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer"
                >
                  
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>


            </div>
          </div>
        )}

      {/* STEP 2: Justification */}
      {step === 2 && (
        <div className="p-8">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            Step 2: Justification <span className="text-red-500">*</span>
          </h3>
          <p className="text-gray-500 text-sm mb-6">Explain why you require hall residency for this academic session.</p>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Describe your reasoning for applying for residency in a brief and formal paragraph."
            className="w-full h-48 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-300 transition-colors resize-none text-gray-700"
          />
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="p-8">
          <h3 className="text-xl font-bold mb-6">Step 3: Confirm & Submit</h3>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Please review your reasoning one last time. Once submitted, you cannot edit this application unless you cancel it entirely.
            </p>
          </div>
          <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500 text-sm">Submitted By</span>
              <span className="font-bold text-gray-800">{profile.name} ({profile.student_id})</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500 text-sm">Contact</span>
              <span className="font-bold text-gray-800">{profile.phone || 'None provided'}</span>
            </div>
            <div className="pt-2">
              <span className="text-gray-500 text-sm block mb-2 font-bold flex items-center gap-1">
                <FileText className="w-4 h-4" /> Reasoning Snapshot:
              </span>
              <p className="p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 italic leading-relaxed">
                "{reasoning}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Navigation Footer */}
      <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center">
        <button
          onClick={() => step > 1 && setStep(step - 1)}
          disabled={step === 1}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${step === 1 ? 'opacity-0 cursor-default' : 'hover:bg-gray-100 text-gray-600'
            }`}
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 2 && !reasoning.trim()) {
                alert("Please provide reasoning before continuing.");
                return;
              }
              setStep(step + 1);
            }}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-white font-bold transition-all ${theme.primary} shadow-md shadow-blue-900/20 hover:opacity-90`}
          >
            Continue <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className={`flex items-center gap-2 px-10 py-2.5 rounded-lg text-white font-bold transition-all bg-green-600 hover:bg-green-700 shadow-md shadow-green-900/20`}
          >
            Submit Application
          </button>
        )}
      </div>
    </div>
    </div >
  );
};

export default StudentSeatApplication;