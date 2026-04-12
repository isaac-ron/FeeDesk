import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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

          {!submitted ? (
            <>
              {/* Header */}
              <div className="text-center">
                <h1 className="font-header text-3xl font-bold text-slate-900 dark:text-white">Forgot Password</h1>
                <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      className="form-input block w-full rounded-full border border-slate-300 bg-white p-4 pl-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/50 dark:border-surface-lighter dark:bg-surface-dark dark:text-white dark:placeholder:text-slate-500 transition-all duration-200"
                      id="email"
                      type="email"
                      placeholder="bursar@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <span className="material-symbols-outlined text-xl">mail</span>
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
                  <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <h2 className="font-header text-2xl font-bold text-slate-900 dark:text-white">Check Your Email</h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                If an account with <strong>{email}</strong> exists, we've sent a password reset link. Please check your inbox and spam folder.
              </p>
            </div>
          )}

          {/* Back to login */}
          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-primary hover:text-primary-hover hover:underline inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
