import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success('Login successful!');
      const role = data.user.role;
      navigate(role === 'ADMIN' ? '/admin' : role === 'WORKER' ? '/worker' : '/tenant');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });

  const logout = () => {
    authService.logout();
    clearAuth();
    navigate('/login');
    toast.success('Logged out');
  };

  return {
    user,
    token,
    isAuthenticated,
    login: loginMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
  };
};
