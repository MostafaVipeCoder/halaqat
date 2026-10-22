import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import LoadingSpinner from './components/ui/loading-spinner';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Toaster } from './components/ui/sonner';

// Lazy load components
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const ForgetPassword = lazy(() => import('./components/auth/ForgetPassword'));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail'));

// Dashboard components
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const Students = lazy(() => import('./components/dashboard/Students'));
const Classes = lazy(() => import('./components/dashboard/Classes'));
const Grades = lazy(() => import('./components/dashboard/Grades'));
const Payments = lazy(() => import('./components/dashboard/Payments'));
const Reports = lazy(() => import('./components/dashboard/Reports'));
const QRScanner = lazy(() => import('./components/dashboard/QRScanner'));
const ClassDetails = lazy(() => import('./components/dashboard/ClassDetails'));
const StudentProfile = lazy(() => import('./components/dashboard/StudentProfile'));
const ExpelledStudents = lazy(() => import('./components/dashboard/ExpelledStudents'));
const Settings = lazy(() => import('./components/dashboard/Settings'));
const AdminLayout = lazy(() => import('./components/dashboard/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./components/dashboard/admin/AdminOverview'));
const AdminCustomers = lazy(() => import('./components/dashboard/admin/AdminCustomers'));
const AdminPackages = lazy(() => import('./components/dashboard/admin/AdminPackages'));
const AdminSettings = lazy(() => import('./components/dashboard/admin/AdminSettings'));
const DashboardOverview = lazy(() => import('./components/dashboard/DashboardOverview'));
const FinancialReports = lazy(() => import('./components/dashboard/FinancialReports'));
const PerformanceReports = lazy(() => import('./components/dashboard/PerformanceReports'));
const Recitations = lazy(() => import('./components/dashboard/Recitations'));

// Auth Guard Components
const ProtectedRoute = ({
  isAuthenticated,
  userRole,
  allowedRoles,
  children
}: {
  isAuthenticated: boolean;
  userRole: string | null;
  allowedRoles?: string[];
  children?: React.ReactNode;
}) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'staff' | 'accountant' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: Session | null) => {
      if (!mounted) return;

      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        setIsVerified(!!session.user.email_confirmed_at);

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (mounted) {
            setUserRole(profile?.role || (session.user.app_metadata?.role as any) || 'manager');
          }
        } catch (error) {
          console.error('Profile fetch error:', error);
          if (mounted) setUserRole('manager');
        }
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
        setIsVerified(false);
        setUserRole(null);
      }
      setLoading(false);
    };

    supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-right" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-gray-500 animate-pulse font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={() => { }} /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!isAuthenticated ? <Register onRegister={() => { }} /> : <Navigate to="/" replace />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail email={userEmail} onVerify={() => setIsVerified(true)} />} />

            {/* Root Redirect */}
            <Route path="/" element={<Navigate to={isAuthenticated ? (userRole === 'admin' ? "/admin" : "/dashboard") : "/login"} replace />} />

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={<ProtectedRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['admin']} />}
            >
              <Route element={<AdminLayout onLogout={handleLogout} userEmail={userEmail} />}>
                <Route index element={<AdminOverview />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            {/* Manager/Staff Protected Routes */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['manager', 'staff', 'accountant']} />}
            >
              <Route element={<DashboardLayout onLogout={handleLogout} isVerified={isVerified} userEmail={userEmail} onVerify={() => setIsVerified(true)} />}>
                <Route index element={<DashboardOverview />} />
                <Route path="students" element={<Students />} />
                <Route path="students/expelled" element={<ExpelledStudents />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/:id" element={<ClassDetails />} />
                <Route path="grades" element={<Grades />} />
                <Route path="recitations" element={<Recitations />} />
                <Route path="payments" element={<Payments />} />
                <Route path="reports" element={<Reports />} />
                <Route path="performance" element={<PerformanceReports />} />
                <Route path="financial-reports" element={<FinancialReports />} />
                <Route path="qr-scanner" element={<QRScanner />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-center" dir="rtl" />
    </div>
  );
}

export default App;
