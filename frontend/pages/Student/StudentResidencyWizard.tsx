
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

const StudentResidencyWizard: React.FC = () => {
  const { theme, user } = useAppContext();
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [reasoning, setReasoning] = useState('');

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel your current application?")) {
      setIsPending(false);
      setStep(1);
    }
  };

  const handleSubmit = () => {
    setIsPending(true);
  };

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Application Pending</h2>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            You already have a seat application in review by the Provost Office. Please wait for an evaluation before reapplying.
          </p>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <button 
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 rounded-lg border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors mx-auto"
            >
              <XCircle className="w-5 h-5" />
              Cancel Current Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="mb-10">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Seat Allocation Request</h2>
        <p className="text-gray-500">Apply for a room in the university residential halls.</p>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mt-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s ? `${theme.primary} text-white` : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <div className={`flex-1 h-1 rounded-full ${step > s ? theme.primary : 'bg-gray-200'}`}></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {step === 1 && (
          <div className="p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              Step 1: Verify Profile Details
              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold uppercase tracking-widest">Read Only</span>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Student ID</label>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-600 font-medium">{user?.id}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Full Name</label>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-600 font-medium">{user?.name}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Department</label>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-600 font-medium">{user?.dept}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Batch Year</label>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-600 font-medium">{user?.admissionYear}</div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8">
            <h3 className="text-xl font-bold mb-2">Step 2: Justification</h3>
            <p className="text-gray-500 text-sm mb-6">Briefly explain why you require hall residency for this academic session.</p>
            <textarea 
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Enter your reasoning here... (e.g., Distance from home, Financial situation)"
              className="w-full h-48 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-red-200 transition-colors resize-none"
            />
          </div>
        )}

        {step === 3 && (
          <div className="p-8">
            <h3 className="text-xl font-bold mb-6">Step 3: Confirm & Submit</h3>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Please review your reasoning one last time. Once submitted, you cannot edit this application unless you cancel it entirely.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">Application For</span>
                <span className="font-bold text-gray-800">Fazlul Huq Muslim Hall</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">Submitted By</span>
                <span className="font-bold text-gray-800">{user?.name}</span>
              </div>
              <div className="pt-2">
                <span className="text-gray-500 text-sm block mb-1">Your Reasoning Snapshot:</span>
                <p className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">"{reasoning || 'No reasoning provided'}"</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between">
          <button 
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
              step === 1 ? 'opacity-0 cursor-default' : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              className={`flex items-center gap-2 px-8 py-2 rounded-lg text-white font-bold transition-all ${theme.primary} shadow-md shadow-red-900/20`}
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-10 py-2 rounded-lg text-white font-bold transition-all bg-green-600 hover:bg-green-700 shadow-md shadow-green-900/20`}
            >
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentResidencyWizard;
