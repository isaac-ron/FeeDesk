import { useEffect, useState } from 'react';
import { useReveal } from '../hooks/useReveal';

const allTxns = [
  { name: 'Beatrice W.', amount: 'KES 25,000', channel: 'M-PESA' },
  { name: 'Brian O.',    amount: 'KES 18,000', channel: 'KCB' },
  { name: 'Mercy N.',    amount: 'KES 32,500', channel: 'M-PESA' },
  { name: 'David K.',    amount: 'KES 12,000', channel: 'Equity' },
  { name: 'Faith A.',    amount: 'KES 28,750', channel: 'M-PESA' },
  { name: 'Samuel M.',   amount: 'KES 15,500', channel: 'KCB' },
];

const trustBadges = ['M‑PESA', 'KCB Bank', 'Equity Bank', 'TextSMS', 'Co‑op Bank'];

const Hero = () => {
  const [copyRef, copyVisible] = useReveal();
  const [visualRef, visualVisible] = useReveal({ threshold: 0.1 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const visibleTxns = [
    allTxns[tick % allTxns.length],
    allTxns[(tick + 1) % allTxns.length],
    allTxns[(tick + 2) % allTxns.length],
  ];

  return (
    // overflow-x-hidden clips the decorative orbs without cutting off the
    // absolutely-positioned floating notification card at the bottom.
    <section
      id="top"
      className="relative bg-gradient-to-b from-fd-blue-50 via-white to-white"
    >
      <div className="overflow-x-hidden">
        {/* Decorative floating orbs — clipped horizontally, not vertically */}
        <div
          aria-hidden="true"
          className="fd-float-slow pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-fd-blue-200/40 blur-3xl sm:h-96 sm:w-96"
        />
        <div
          aria-hidden="true"
          className="fd-float-slower pointer-events-none absolute top-40 left-[-8%] h-56 w-56 rounded-full bg-fd-blue-100/60 blur-3xl sm:h-72 sm:w-72"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-10">

            {/* ── Copy column ── */}
            <div
              ref={copyRef}
              className={`reveal lg:col-span-6 xl:col-span-7 ${copyVisible ? 'reveal-visible' : ''}`}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-fd-blue-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-brand text-primary">
                <span className="fd-pulse-ring h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                Built for Kenyan schools
              </span>

              {/* H1 — no hard <br />, scales from 36 → 48 → 60px */}
              <h1 className="mt-4 font-header text-[2.25rem] font-extrabold leading-[1.08] tracking-tighter text-fd-gray-900 sm:mt-5 sm:text-5xl lg:text-6xl">
                School fees.{' '}
                <span className="text-primary">Collected. Automatically.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-fd-gray-600 sm:text-lg">
                FeeDesk connects your paybill, bank account, and SMS in one place — so every
                parent's payment lands in the right student's account without lifting a finger.
              </p>

              {/* CTAs — stack on mobile, row on sm+ */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contact"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-fd-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl active:translate-y-0 sm:py-4"
                >
                  Request a Demo
                  <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </a>
                <a
                  href="#how-it-works"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-fd-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-fd-gray-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary sm:py-4"
                >
                  See how it works
                  <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-y-0.5">
                    expand_more
                  </span>
                </a>
              </div>

              {/* Trust badge marquee */}
              <div className="mt-10">
                <p className="text-xs font-semibold uppercase tracking-brand text-fd-gray-400">
                  Integrates natively with
                </p>
                <div className="fd-marquee-pause mt-3 overflow-hidden">
                  <div className="fd-marquee-track flex w-max items-center gap-10 whitespace-nowrap sm:gap-12">
                    {/* TODO: replace text labels with licensed partner logos */}
                    {[...trustBadges, ...trustBadges].map((label, i) => (
                      <span key={i} className="text-sm font-bold text-fd-gray-600 sm:text-base">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Visual column — dashboard mockup ── */}
            <div
              ref={visualRef}
              className={`reveal-scale lg:col-span-6 xl:col-span-5 ${visualVisible ? 'reveal-visible' : ''}`}
            >
              {/* Extra bottom padding on sm–md to prevent the floating card
                  from being clipped by the grid gap / next section. */}
              <div className="relative pb-0 md:pb-8">
                {/* Browser frame */}
                <div className="overflow-hidden rounded-2xl border border-fd-gray-200 bg-white shadow-2xl shadow-fd-blue-900/10 transition-transform duration-500 hover:-translate-y-1">
                  {/* Title bar */}
                  <div className="flex items-center gap-1.5 border-b border-fd-gray-100 bg-fd-gray-50 px-3 py-2.5 sm:px-4 sm:py-3">
                    <span className="h-2 w-2 rounded-full bg-red-400 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-yellow-400 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-green-400 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
                    <span className="ml-2 truncate text-[10px] font-medium text-fd-gray-400 sm:ml-3 sm:text-xs">
                      app.feedesk.com/dashboard
                    </span>
                  </div>

                  {/* SCREENSHOT — replace with <img src="/screenshots/dashboard.png" alt="FeeDesk dashboard" className="w-full" /> when available */}
                  <div className="bg-gradient-to-br from-fd-blue-50 to-white p-3 sm:p-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <StatTile label="Collected" value="KES 248K" icon="payments" trend="+12%" />
                      <StatTile label="Outstanding" value="KES 1.2M" icon="account_balance_wallet" />
                      <StatTile label="SMS sent" value="184" icon="sms" />

                      <div className="col-span-3 rounded-xl border border-fd-gray-200 bg-white p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-fd-gray-400 sm:text-xs">
                            Live transactions
                          </p>
                          <span className="flex items-center gap-1 text-[9px] font-semibold text-success sm:gap-1.5 sm:text-xs">
                            <span className="fd-pulse-ring h-1.5 w-1.5 rounded-full bg-success sm:h-2 sm:w-2" aria-hidden="true" />
                            Live
                          </span>
                        </div>
                        <ul className="mt-2 space-y-2 sm:mt-3 sm:space-y-2.5">
                          {/* Show 2 rows on mobile, 3 on sm+ */}
                          {visibleTxns.slice(0, 2).map((t, idx) => (
                            <TxnRow key={`${tick}-${idx}`} {...t} />
                          ))}
                          <li className="hidden sm:block">
                            <TxnRow key={`${tick}-2`} {...visibleTxns[2]} />
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification card — hidden on mobile, visible md+ */}
                <div className="absolute -bottom-2 -left-4 hidden w-56 rounded-xl border border-fd-gray-200 bg-white p-3.5 shadow-xl fd-float-slow md:block lg:-left-6 lg:w-64 lg:p-4">
                  <div className="flex items-start gap-2.5 lg:gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success lg:h-9 lg:w-9">
                      <span className="material-symbols-outlined text-lg lg:text-xl">check_circle</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-fd-gray-900 lg:text-sm">Payment received</p>
                      <p className="mt-0.5 truncate text-[10px] text-fd-gray-600 lg:text-xs">
                        KES 25,000 → Beatrice W. · Grade 10
                      </p>
                      <p className="mt-1 font-mono-brand text-[9px] text-fd-gray-400 lg:text-[10px]">
                        MPESA · UDL030CWZG
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll-down hint — desktop only */}
          <div className="mt-16 hidden justify-center lg:flex">
            <a
              href="#features"
              aria-label="Scroll to features"
              className="flex flex-col items-center gap-1 text-xs font-semibold uppercase tracking-brand text-fd-gray-400 transition-colors hover:text-primary"
            >
              <span>Scroll to explore</span>
              <span className="material-symbols-outlined fd-bounce text-xl">expand_more</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatTile = ({ label, value, icon, trend }) => (
  <div className="rounded-xl border border-fd-gray-200 bg-white p-2.5 transition-all duration-300 hover:border-primary/40 hover:shadow-md sm:p-3.5">
    <div className="flex items-center justify-between">
      <span className="material-symbols-outlined text-base text-primary sm:text-lg">{icon}</span>
      {trend && (
        <span className="text-[9px] font-bold text-success sm:text-[10px]">{trend}</span>
      )}
    </div>
    <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-wider text-fd-gray-400 sm:mt-2 sm:text-[10px]">
      {label}
    </p>
    <p className="mt-0.5 text-xs font-bold text-fd-gray-900 sm:mt-1 sm:text-sm">{value}</p>
  </div>
);

const TxnRow = ({ name, amount, channel }) => (
  <li className="fd-tick-in flex items-center justify-between text-[10px] sm:text-xs">
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fd-blue-50 text-[9px] font-bold text-primary sm:h-7 sm:w-7 sm:text-[10px]">
        {name.charAt(0)}
      </span>
      <span className="font-semibold text-fd-gray-900">{name}</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="rounded-full bg-fd-gray-100 px-1.5 py-0.5 text-[8px] font-semibold text-fd-gray-600 sm:px-2 sm:text-[10px]">
        {channel}
      </span>
      <span className="font-bold text-fd-gray-900">{amount}</span>
    </div>
  </li>
);

export default Hero;
