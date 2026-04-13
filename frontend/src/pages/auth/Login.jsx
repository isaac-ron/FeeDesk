import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ email, password });
      navigate(data.role === 'super_admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-white h-screen overflow-hidden">
      <div className="flex h-full w-full flex-col lg:flex-row">
        {/* Left Side - Testimonial Section (Hidden on mobile) */}
        <div className="relative hidden h-full w-full flex-col justify-between overflow-hidden lg:flex lg:w-1/2 xl:w-5/12 p-8">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center" 
            style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBEt8Umq-ugI-rEuGRhqalYa2SkZI9niqg2W6StuzlRvbV1qnLeqtH5Sb1xy6v6PEsUoBxTCSoPP1fJnCc-xaqZwy5rQV9jxNMgTXylQrJVU7T54p1r5WKTPeOKaBxJM2_ldfyi9EMpT7AAyFxjRBjwjsMuVDxJs9jn-TjxJzUC-ovXTd4sGRZup56qQhThB3RrDemjIXI2QpFuikWx0VQPtEAPMiAVKzwkSronQrenmh5l1Gis1NCRUx3Z6jeXZ66uKr_0LH0GHIg')"}}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40"></div>
          </div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <span className="material-symbols-outlined text-2xl font-bold">school</span>
            </div>
            <span className="font-header text-xl font-bold tracking-tight text-white">EduFinance Kenya</span>
          </div>
          
          <div className="relative z-10 mt-auto max-w-lg">
            <div className="glass-panel rounded-xl p-8 shadow-2xl" style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div className="mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">format_quote</span>
              </div>
              <blockquote className="mb-6">
                <p className="font-header text-2xl font-semibold leading-relaxed text-white">
                  "This platform has completely transformed how we manage our school fees and budget allocation. It's secure, transparent, and incredibly easy for our bursar to use."
                </p>
              </blockquote>
              <div className="flex items-center gap-4">
                <div 
                  className="h-12 w-12 overflow-hidden rounded-full bg-surface-lighter border-2 border-primary/20 bg-cover bg-center" 
                  style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDRUfdtYhj_fvQ8ZJR_vGJ6TAdvlm-1CgMymKiXTkvPF9-HcS0aiJEgLBl0SgdWRVXJKgycATQWvb74kWElH1InWXkW0vk1KbkJnrp840GQtpBaCv_LvedyC3CfegtCioqTdgdeALivynA6cQO9tcyKYc5Sy86UUrnAvvsLYy3QjAmCMvDaC0sc0hveOlDZnWY5vwJv-NiX_bUsDhRz27vSaMcs5Gj6YPA4KIj9ZiIOdFcuJxEOdEgfniKk2uNgt1RB3bgKycrxSW4')"}}
                ></div>
                <div>
                  <p className="text-base font-bold text-white">Sarah Wanjiku</p>
                  <p className="text-sm font-medium text-slate-300">Principal, Nairobi High School</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="material-symbols-outlined text-primary">verified_user</span>
                <span>Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="material-symbols-outlined text-primary">cloud_done</span>
                <span>99.9% Uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-background-light dark:bg-background-dark p-6 lg:w-1/2 xl:w-7/12">
          <div className="w-full max-w-[440px] flex flex-col gap-8">
            {/* Mobile Logo */}
            <div className="flex justify-center lg:hidden mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <span className="material-symbols-outlined text-2xl font-bold">school</span>
                </div>
                <span className="font-header text-xl font-bold tracking-tight text-slate-900 dark:text-white">EduFinance Kenya</span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center lg:text-left">
              <h1 className="font-header text-3xl font-bold text-slate-900 dark:text-white lg:text-4xl">Welcome Back</h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                Securely sign in to your school's financial dashboard.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email Field */}
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

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="password">
                    Password
                  </label>
                  <Link className="text-sm font-medium text-primary hover:text-primary-hover hover:underline" to="/forgot-password">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input 
                    className="form-input block w-full rounded-full border border-slate-300 bg-white p-4 pl-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/50 dark:border-surface-lighter dark:bg-surface-dark dark:text-white dark:placeholder:text-slate-500 transition-all duration-200" 
                    id="password" 
                    type="password"
                    placeholder="••••••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button 
                className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-white transition-all duration-300 hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(29,78,216,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                {!loading && (
                  <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Don't have an account? 
                <a className="font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors ml-1" href="#">
                  Contact Administration
                </a>
              </p>
              <div className="mt-4 flex w-full items-center justify-center gap-4 border-t border-slate-200 py-6 dark:border-surface-lighter lg:justify-start">
                <a className="text-xs text-slate-500 hover:text-primary dark:text-slate-500" href="#">Privacy Policy</a>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <a className="text-xs text-slate-500 hover:text-primary dark:text-slate-500" href="#">Terms of Service</a>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Secure SSL Encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;