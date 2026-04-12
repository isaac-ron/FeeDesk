import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-white h-screen overflow-hidden">
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="w-full max-w-[440px] flex flex-col gap-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                <span className="material-symbols-outlined text-2xl font-bold">school</span>
              </div>
              <span className="font-header text-xl font-bold tracking-tight text-slate-900 dark:text-white">EduFinance Kenya</span>
            </div>
          </div>

          {!success ? (
            <>
              {/* Header */}
              <div className="text-center">
                <h1 className="font-header text-3xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
                <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                  Enter your new password below.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      className="form-input block w-full rounded-full border border-slate-300 bg-white p-4 pl-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/50 dark:border-surface-lighter dark:bg-surface-dark dark:text-white dark:placeholder:text-slate-500 transition-all duration-200"
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      className="form-input block w-full rounded-full border border-slate-300 bg-white p-4 pl-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/50 dark:border-surface-lighter dark:bg-surface-dark dark:text-white dark:placeholder:text-slate-500 transition-all duration-200"
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-white transition-all duration-300 hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(29,78,216,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <h2 className="font-header text-2xl font-bold text-slate-900 dark:text-white">Password Reset</h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-4 flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-white transition-all duration-300 hover:bg-primary-hover"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Back to login (only show when form is visible) */}
          {!success && (
            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-primary hover:text-primary-hover hover:underline inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
