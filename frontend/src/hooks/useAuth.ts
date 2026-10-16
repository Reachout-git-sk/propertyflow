import { useAuthStore } from '../store/authStore';
import { authService, SignupData } from '../services/auth.service';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const homeFor = (role: string) =>
  role === 'ADMIN' ? '/admin' : role === 'WORKER' ? '/worker' : '/tenant';

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success('Login successful!');
      navigate(homeFor(data.user.role));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });

  // Sign-up answers like login (a token and the user), so the new user is logged in at once.
  // Errors are shown on the sign-up page itself.
  const signupMutation = useMutation({
    mutationFn: (data: SignupData) => authService.signup(data),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success('Account created!');
      navigate(homeFor(data.user.role));
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
    signup: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
  };
};
