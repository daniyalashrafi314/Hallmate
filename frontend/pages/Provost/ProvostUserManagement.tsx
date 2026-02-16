
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { UserPlus, UserMinus, MoreVertical, Shield, ChevronRight, AlertTriangle } from 'lucide-react';
import EmptyState from '../../components/UI/EmptyState';

const ProvostUserManagement: React.FC = () => {
  const { theme } = useAppContext();
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [users, setUsers] = useState([
    { id: '230101', name: 'Ariful Islam', role: 'STUDENT', priority: 9, status: 'Active' },
    { id: '230102', name: 'Zarin Tasnim', role: 'STUDENT', priority: 5, status: 'Active' },
    { id: '230103', name: 'Sabbir Ahmed', role: 'STUDENT', priority: 2, status: 'Active' },
    { id: 'S-992', name: 'Jannat Begum', role: 'STAFF', priority: 0, status: 'Active' },
  ]);

  const getPriorityColor = (p: number) => {
    if (p >= 8) return 'bg-red-100 text-red-700 border-red-200';
    if (p >= 4) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (p >= 1) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const removeUser = (id: string) => {
    if (confirm("Permanently remove this user and their residency records?")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>User Repository</h2>
          <p className="text-gray-500">Manage all students and administrative staff assigned to this hall.</p>
        </div>
        <button 
          onClick={() => setShowAddWizard(true)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold transition-all ${theme.primary} shadow-lg shadow-blue-900/20 hover:scale-105`}
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Identity</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Role</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-center">Staff Priority</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-center">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      u.role === 'STAFF' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`text-xs font-black px-3 py-1 rounded-full border ${getPriorityColor(u.priority)}`}>
                        {u.priority === 0 ? 'N/A' : u.priority}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                       <div className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          {u.status}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => removeUser(u.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddWizard && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className={`${theme.primary} p-8 text-white relative`}>
               <button onClick={() => setShowAddWizard(false)} className="absolute top-6 right-6 opacity-60 hover:opacity-100">
                 <Shield className="w-6 h-6 rotate-45" />
               </button>
               <h3 className="text-2xl font-bold">Registration Wizard</h3>
               <p className="opacity-70 mt-1">Generate access for new residents or office staff.</p>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase">Corporate Email</label>
                  <input type="email" placeholder="example@du.ac.bd" className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium" />
               </div>

               <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Auto-Generated Password</p>
                    <p className="text-xs text-amber-700">A secure string will be emailed to the user upon confirmation. They must change it at first login.</p>
                  </div>
               </div>
            </div>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-4">
               <button onClick={() => setShowAddWizard(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
               <button className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${theme.primary} shadow-lg shadow-blue-900/20`}>Confirm & Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvostUserManagement;
