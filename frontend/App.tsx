
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { UserRole, User } from './types';
import { THEME_CONFIG, MOCK_USER } from './constants';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Pages
import StudentHome from './pages/Student/StudentHome';
import StudentResidencyWizard from './pages/Student/StudentResidencyWizard';
import StudentPayments from './pages/Student/StudentPayments';
import StaffVisitorLogs from './pages/Staff/StaffVisitorLogs';
import StaffPaymentRequest from './pages/Staff/StaffPaymentRequest';
import ProvostRoomGrid from './pages/Provost/ProvostRoomGrid';
import ProvostUserManagement from './pages/Provost/ProvostUserManagement';

interface AppContextType {
  user: User | null;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  theme: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.STUDENT);
  const user = MOCK_USER[userRole];
  const theme = THEME_CONFIG[userRole];

  return (
    <AppContext.Provider value={{ user, userRole, setUserRole, theme }}>
      <HashRouter>
        <div className={`flex min-h-screen ${theme.bg} transition-colors duration-300`}>
          <Sidebar />
          <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
            <Header />
            <main className="p-4 md:p-8 flex-1 overflow-auto">
              <Routes>
                {/* Auth-less dev switch routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Student Routes */}
                <Route path="/dashboard" element={
                  userRole === UserRole.STUDENT ? <StudentHome /> : 
                  userRole === UserRole.STAFF ? <StaffVisitorLogs /> : 
                  <ProvostUserManagement />
                } />
                <Route path="/residency" element={<StudentResidencyWizard />} />
                <Route path="/payments" element={<StudentPayments />} />
                
                {/* Staff Routes */}
                <Route path="/visitor-logs" element={<StaffVisitorLogs />} />
                <Route path="/request-payment" element={<StaffPaymentRequest />} />

                {/* Provost Routes */}
                <Route path="/room-grid" element={<ProvostRoomGrid />} />
                <Route path="/users" element={<ProvostUserManagement />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
