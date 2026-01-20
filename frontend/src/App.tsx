import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { TenantHome } from './pages/TenantHome';
import { AdminHome } from './pages/AdminHome';
import { WorkerHome } from './pages/WorkerHome';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'WORKER') return <Navigate to="/worker" replace />;
    return <Navigate to="/tenant" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'WORKER') return <Navigate to="/worker" replace />;
  return <Navigate to="/tenant" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/tenant/*" element={<ProtectedRoute allowedRoles={['TENANT']}><TenantHome /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminHome /></ProtectedRoute>} />
          <Route path="/worker/*" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerHome /></ProtectedRoute>} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
