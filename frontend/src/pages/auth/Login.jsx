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
    <div className="h-screen overflow-hidden bg-paper font-display text-ink antialiased">
      <div className="flex h-full w-full flex-col lg:flex-row">

        {/* ── Left: deep-blue brand panel (no stock photo, no glass) ── */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex lg:w-1/2 xl:w-5/12"
          style={{ background: '#071e42' }}
        >
          {/* mesh grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          {/* corner glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(47,125,224,0.22) 0%, transparent 60%)' }}
          />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <img
              src="/feedesk-brand/feedesk-brand/logos/svg/feedesk-icon-only.svg"
              alt=""
              width="40"
              height="40"
              className="h-10 w-10"
            />
            <div>
              <div className="font-header text-2xl font-extrabold tracking-tight">
                Fee<span className="text-fd-blue-300">Desk</span>
              </div>
              <div className="font-mono-brand text-[10px] uppercase tracking-widest text-fd-blue-200">
                Every payment. Accounted for.
              </div>
            </div>
          </div>

          {/* Isometric cube cluster */}
          <div className="relative z-10 flex justify-center py-8">
            <svg viewBox="0 0 560 300" className="w-full max-w-md" aria-hidden="true">
              <defs>
                <linearGradient id="login-cube-top" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>

              <ellipse cx="280" cy="262" rx="180" ry="24" fill="#000" opacity="0.18" />

              <g transform="translate(150,118) scale(0.72)">
                <g className="fd-cube-2">
                  <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#93D0FF" />
                  <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#1A65C9" />
                  <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#2F7DE0" />
                </g>
              </g>

              <g transform="translate(408,132) scale(0.64)">
                <g className="fd-cube-3">
                  <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#5CB8FF" />
                  <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#1251A3" />
                  <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#2F7DE0" />
                </g>
              </g>

              <g transform="translate(280,40)">
                <g className="fd-cube-1">
                  <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#2F7DE0" />
                  <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#0E3D7A" />
                  <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#1251A3" />
                  <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="url(#login-cube-top)" />
                </g>
              </g>
            </svg>
          </div>

          {/* Testimonial + trust */}
          <div className="relative z-10 max-w-lg">
            <blockquote className="font-header text-2xl font-bold leading-snug tracking-tight text-balance">
              "We used to spend the first three days of every term reconciling fees by hand.
              With FeeDesk it's <span className="text-fd-blue-300">done before the first bell.</span>"
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-bold text-fd-blue-200">
                JM
              </span>
              <div>
                <p className="text-sm font-bold">Jane Mwangi</p>
                <p className="text-sm text-fd-blue-200">Bursar, Riara Springs Academy</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 border-t border-white/10 pt-6 text-sm font-medium text-fd-blue-200">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-fd-blue-300">verified_user</span>
                Bank-grade security
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-fd-blue-300">cloud_done</span>
                99.9% uptime
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: form on paper ── */}
        <div className="flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-paper p-6 lg:w-1/2 xl:w-7/12">
          <div className="flex w-full max-w-[440px] flex-col gap-8">

            {/* Mobile logo */}
            <div className="mb-2 flex justify-center lg:hidden">
              <div className="flex items-center gap-2">
                <img
                  src="/feedesk-brand/feedesk-brand/logos/svg/feedesk-icon-only.svg"
                  alt=""
                  width="40"
                  height="40"
                  className="h-10 w-10"
                />
                <span className="font-header text-xl font-extrabold tracking-tight text-ink">
                  Fee<span className="text-primary">Desk</span>
                </span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center lg:text-left">
              <p className="mb-4 font-mono-brand text-xs uppercase tracking-widest text-primary">
                Bursar access
              </p>
              <h1 className="font-header text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
                Welcome back.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-body">
                Sign in to your school's financial dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-ink" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border border-line bg-white p-4 pr-12 text-base text-ink placeholder:text-body/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    id="email"
                    type="email"
                    placeholder="bursar@school.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body/60">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink" htmlFor="password">
                    Password
                  </label>
                  <Link className="text-sm font-medium text-primary hover:underline" to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border border-line bg-white p-4 pr-12 text-base text-ink placeholder:text-body/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body/60">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <button
                className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-bold text-white transition-colors duration-200 hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Signing in…' : 'Sign in to dashboard'}</span>
                {!loading && (
                  <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <p className="text-sm text-body">
                Don't have an account?
                <a className="ml-1 font-semibold text-primary transition-colors hover:underline" href="#contact">
                  Contact administration
                </a>
              </p>
              <div className="mt-2 flex w-full items-center justify-center gap-4 border-t border-line py-6 lg:justify-start">
                <a className="text-xs text-body hover:text-primary" href="#">Privacy Policy</a>
                <span className="h-1 w-1 rounded-full bg-line" />
                <a className="text-xs text-body hover:text-primary" href="#">Terms of Service</a>
                <span className="h-1 w-1 rounded-full bg-line" />
                <div className="flex items-center gap-1 text-xs text-body">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Secure SSL encryption</span>
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
