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
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-fd-blue-50 via-white to-white"
    >
      {/* Decorative floating orbs */}
      <div
        aria-hidden="true"
        className="fd-float-slow pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-fd-blue-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="fd-float-slower pointer-events-none absolute top-40 left-[-5%] h-72 w-72 rounded-full bg-fd-blue-100/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Copy column */}
          <div
            ref={copyRef}
            className={`reveal lg:col-span-6 xl:col-span-7 ${copyVisible ? 'reveal-visible' : ''}`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-fd-blue-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-brand text-primary">
              <span className="fd-pulse-ring h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Built for Kenyan schools
            </span>
            <h1 className="mt-5 font-header text-4xl font-extrabold leading-[1.05] tracking-tighter text-fd-gray-900 sm:text-5xl lg:text-6xl">
              School fees.<br />
              <span className="text-primary">Collected. Automatically.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fd-gray-600 sm:text-xl">
              FeeDesk connects your paybill, bank account, and SMS in one place — so every parent's
              payment lands in the right student's account without lifting a finger.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-bold text-white shadow-lg shadow-fd-blue-600/20 transition-all duration-200 hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                Request a Demo
                <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </a>
              <a
                href="#how-it-works"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-fd-gray-300 bg-white px-7 py-4 text-base font-semibold text-fd-gray-900 transition-all duration-200 hover:border-primary hover:text-primary hover:-translate-y-0.5"
              >
                See how it works
                <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-y-0.5">
                  expand_more
                </span>
              </a>
            </div>

            {/* Trust badges marquee */}
            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-brand text-fd-gray-400">
                Integrates natively with
              </p>
              <div className="fd-marquee-pause mt-4 overflow-hidden">
                <div className="fd-marquee-track flex w-max items-center gap-12 whitespace-nowrap">
                  {/* TODO: replace text labels with licensed partner logos */}
                  {[...trustBadges, ...trustBadges].map((label, i) => (
                    <span key={i} className="text-base font-bold text-fd-gray-600">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visual column — dashboard mockup */}
          <div
            ref={visualRef}
            className={`reveal-scale lg:col-span-6 xl:col-span-5 ${visualVisible ? 'reveal-visible' : ''}`}
          >
            <div className="relative">
              {/* Browser frame */}
              <div className="overflow-hidden rounded-2xl border border-fd-gray-200 bg-white shadow-2xl shadow-fd-blue-900/10 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-1.5 border-b border-fd-gray-100 bg-fd-gray-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                  <span className="ml-3 truncate text-xs font-medium text-fd-gray-400">
                    app.feedesk.com/dashboard
                  </span>
                </div>

                {/* SCREENSHOT — replace with <img src="/screenshots/dashboard.png" /> when available */}
                <div className="aspect-[4/3] bg-gradient-to-br from-fd-blue-50 to-white p-6">
                  <div className="grid h-full grid-cols-3 gap-3">
                    <StatTile label="Collected today" value="KES 248,500" icon="payments" trend="+12%" />
                    <StatTile label="Outstanding" value="KES 1.2M" icon="account_balance_wallet" />
                    <StatTile label="SMS sent" value="184" icon="sms" />
                    <div className="col-span-3 rounded-xl border border-fd-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-fd-gray-400">
                          Live transactions
                        </p>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                          <span className="fd-pulse-ring h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                          Live
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2.5">
                        {visibleTxns.map((t, idx) => (
                          <TxnRow key={`${tick}-${idx}`} {...t} />
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <div className="absolute -bottom-6 -left-6 hidden w-64 rounded-xl border border-fd-gray-200 bg-white p-4 shadow-xl sm:block fd-float-slow">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fd-gray-900">Payment received</p>
                    <p className="mt-0.5 text-xs text-fd-gray-600">
                      KES 25,000 → Beatrice W. · Grade 10
                    </p>
                    <p className="mt-1 font-mono-brand text-[10px] text-fd-gray-400">
                      MPESA · UDL030CWZG
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-down hint */}
        <div className="mt-16 hidden justify-center lg:flex">
          <a
            href="#features"
            aria-label="Scroll to features"
            className="group flex flex-col items-center gap-1 text-xs font-semibold uppercase tracking-brand text-fd-gray-400 transition-colors hover:text-primary"
          >
            <span>Scroll to explore</span>
            <span className="material-symbols-outlined fd-bounce text-xl">expand_more</span>
          </a>
        </div>
      </div>
    </section>
  );
};

const StatTile = ({ label, value, icon, trend }) => (
  <div className="rounded-xl border border-fd-gray-200 bg-white p-3.5 transition-all duration-300 hover:border-primary/40 hover:shadow-md">
    <div className="flex items-center justify-between">
      <span className="material-symbols-outlined text-lg text-primary">{icon}</span>
      {trend && (
        <span className="text-[10px] font-bold text-success">{trend}</span>
      )}
    </div>
    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-fd-gray-400">
      {label}
    </p>
    <p className="mt-1 text-sm font-bold text-fd-gray-900">{value}</p>
  </div>
);

const TxnRow = ({ name, amount, channel }) => (
  <li className="fd-tick-in flex items-center justify-between text-xs">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fd-blue-50 text-[10px] font-bold text-primary">
        {name.charAt(0)}
      </span>
      <span className="font-semibold text-fd-gray-900">{name}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-fd-gray-100 px-2 py-0.5 text-[10px] font-semibold text-fd-gray-600">
        {channel}
      </span>
      <span className="font-bold text-fd-gray-900">{amount}</span>
    </div>
  </li>
);

export default Hero;
