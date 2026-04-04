import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Building2, Shield } from 'lucide-react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token) {
        const normalizeServerRole = (roleString: string | undefined): UserRole => {
          switch (roleString?.trim().toLowerCase()) {
            case 'student':
              return UserRole.STUDENT;
            case 'staff':
              return UserRole.STAFF;
            case 'provost':
            case 'admin':
              return UserRole.PROVOST;
            case 'super_user':
            case 'super-user':
            case 'super user':
            case 'super_admin':
            case 'super-admin':
            case 'super admin':
              return UserRole.SUPER_USER;
            default:
              return UserRole.STUDENT;
          }
        };

        const userRole = normalizeServerRole(data.role);
        
        // FIXED CONFLICT: Passing exactly 3 arguments as defined in App.tsx
        login(data.token, data.user_id, userRole);

        // Based on App.tsx, everyone shares the /dashboard route except Super Admin
        if (userRole === UserRole.SUPER_USER) {
          navigate('/manage-provosts');
        } else {
          navigate('/dashboard'); 
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Branding & Visuals (Hidden on smaller screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-blue-900 overflow-hidden flex-col justify-between p-12">
        {/* Decorative background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400 mix-blend-multiply blur-3xl animate-blob"></div>
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-400 mix-blend-multiply blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500 mix-blend-multiply blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Hallmate</span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            Simplify your hall management.
          </h1>
          <p className="text-lg text-blue-200 leading-relaxed">
            The all-in-one unified platform for students, staff, and provosts. Log in to manage your daily tasks, payments, and hall applications seamlessly.
          </p>
        </div>

        {/* Footer/Badge */}
        <div className="relative z-10 flex items-center gap-2 text-blue-300 text-sm font-medium">
          <Shield className="w-4 h-4" /> Secure University Portal
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md">
          
          {/* Mobile Header (Only shows on mobile) */}
          <div className="flex items-center gap-3 lg:hidden mb-10 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900 tracking-tight">Hallmate</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Please enter your credentials to access your account.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* User ID Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  User ID
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600 text-gray-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium text-gray-900"
                    placeholder="Enter your User ID"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium text-gray-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <>Sign In <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
            
            {/* Go Back Link */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              >
                ← Back to Main Page
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;