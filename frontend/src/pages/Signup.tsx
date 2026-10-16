import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { firstPasswordProblem, passwordRules } from '../utils/password';

export const Signup: React.FC = () => {
  const { signup, isSigningUp, isAuthenticated } = useAuth();
  const [form, setForm] = React.useState({
    email: '',
    inviteCode: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });
  const [error, setError] = React.useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = firstPasswordProblem(form.password);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    signup(
      {
        email: form.email,
        // A pasted code often brings a space along; real codes never contain one
        inviteCode: form.inviteCode.trim(),
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        password: form.password,
      },
      {
        // Shown exactly as the backend sends it. Every refused sign-up gets the same 403
        // message on purpose, so it must not say which part (email or code) was wrong.
        onError: (err: any) => setError(err.response?.data?.message || 'Sign-up failed. Please try again.'),
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PropertyFlow</h1>
          <p className="text-gray-600">Create your account with the invite code from your property manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Input
            label="Invite code"
            value={form.inviteCode}
            onChange={update('inviteCode')}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={form.firstName} onChange={update('firstName')} required />
            <Input label="Last name" value={form.lastName} onChange={update('lastName')} required />
          </div>
          <Input label="Phone (optional)" type="tel" value={form.phone} onChange={update('phone')} />
          <div>
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              required
            />
            <ul className="mt-2 text-xs space-y-1">
              {passwordRules.map((rule) => (
                <li key={rule.label} className={rule.isMet(form.password) ? 'text-green-600' : 'text-gray-500'}>
                  {rule.isMet(form.password) ? '✓' : '•'} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSigningUp}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSigningUp ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
