import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, User } from './types';
import { THEME_CONFIG } from './constants';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Auth Pages (You will create these next)
import Login from './pages/Login/Login'

// Student Pages
import StudentHome from './pages/Student/StudentHome';
import StudentSeatApplication from './pages/Student/StudentSeatApplication';
import StudentPayments from './pages/Student/StudentPayments';
import StudentVisitors from './pages/Student/StudentVisitors';
import StudentNotices from './pages/Student/StudentNotices';
import StudentDonations from './pages/Student/StudentDonations';
import StudentComplaints from './pages/Student/StudentComplaints';

// Staff Pages
import StaffVisitors from './pages/Staff/StaffVisitors';
import StaffProfile from './pages/Staff/StaffProfile';
import StaffAddPayments from './pages/Staff/StaffAddPayments';
import StaffAddStudents from './pages/Staff/StaffAddStudents';
import StaffDonations from './pages/Staff/StaffDonations';
import StaffNotices from './pages/Staff/StaffNotices';
import StaffSalary from './pages/Staff/StaffSalary';
import StaffSeatApplications from './pages/Staff/StaffSeatApplications';
import StaffDashboard from './pages/Staff/StaffDashboard';

// Provost Pages
import ProvostRooms from './pages/Provost/ProvostRooms';
import ProvostUserManagement from './pages/Provost/ProvostUserManagement';
import ProvostSeatApprovals from './pages/Provost/ProvostSeatApprovals';
import ProvostDashboard from './pages/Provost/ProvostDashboard';

// 1. Update Context to handle actual Authentication state
interface AppContextType {
  user: User | null;
  userRole: UserRole | null; // Null means not logged in
  theme: any;
  login: (token: string, userId: string, role: UserRole) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// 2. The Bouncer Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const { userRole } = useAppContext();
  const token = localStorage.getItem('hallmate_token');

  if (!token || !userRole) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />; // Send them back to their own dashboard
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  // 3. Initialize state from LocalStorage so sessions persist on refresh
  const [userRole, setUserRole] = useState<UserRole | null>(
    (localStorage.getItem('user_role') as UserRole) || null
  );
  
  // In a real app, you might fetch the full user object from the backend using the ID
  const [user, setUser] = useState<User | null>(
    localStorage.getItem('user_id') ? { id: localStorage.getItem('user_id')!, name: 'Logged In User', email: '', role: userRole || UserRole.STUDENT } : null
  );

  // Default theme to Student if not logged in just for the login screen styling
  const theme = THEME_CONFIG[userRole || UserRole.STUDENT];

  // Auth Functions
  const login = (token: string, userId: string, role: UserRole) => {
    localStorage.setItem('hallmate_token', token);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_role', role);
    setUserRole(role);
    setUser({ id: userId, name: userId, email: '', role: role }); // Simplified user obj
  };

  const logout = () => {
    localStorage.clear();
    setUserRole(null);
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, userRole, theme, login, logout }}>
      <HashRouter>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/login" element={userRole ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          {/* --- PROTECTED APP LAYOUT --- */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <div className={`flex min-h-screen ${theme.bg} transition-colors duration-300`}>
                  <Sidebar />
                  <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
                    <Header />
                    <main className="p-4 md:p-8 flex-1 overflow-auto">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        
                        {/* Student Routes */}
                        <Route
                          path="/dashboard"
                          element={
                            userRole === UserRole.STUDENT
                              ? <StudentHome />
                              : userRole === UserRole.STAFF
                                ? <StaffDashboard />
                                : <ProvostDashboard />
                          }
                        />
                        <Route path="/seat-application" element={<StudentSeatApplication />} />
                        <Route path="/payments" element={<StudentPayments />} />
                        <Route path="/visitors" element={userRole === UserRole.STUDENT ? <StudentVisitors /> : <StaffVisitors />} />
                        <Route path="/notices" element={<StudentNotices />} />
                        <Route path="/donations" element={userRole === UserRole.STUDENT ? <StudentDonations /> : <StaffDonations />} />
                        <Route path="/complaints" element={<StudentComplaints />} />

                        {/* Staff Routes */}
                        <Route path="/add-payments" element={<StaffAddPayments />} />
                        <Route path="/add-students" element={<StaffAddStudents />} />
                        <Route path="/salary" element={<StaffSalary />} />
                        <Route path="/seat-applications" element={<StaffSeatApplications />} />
                        <Route path="/seat-applications/:id" element={<StaffSeatApplications />} />
                        <Route path="/profile" element={<StaffProfile />} />
                        <Route path="/notices-manage" element={<StaffNotices />} />

                        {/* Provost Routes */}
                        <Route path="/rooms" element={<ProvostRooms />} />
                        <Route path="/users" element={<ProvostUserManagement />} />
                        <Route path="/approvals" element={<ProvostSeatApprovals />} />

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;