import { useEffect, useState } from 'react';
import { useReveal } from '../hooks/useReveal';

const allTxns = [
  { name: 'Beatrice W.', amount: 'KES 25,000', channel: 'M-PESA' },
  { name: 'Brian O.',    amount: 'KES 18,000', channel: 'KCB' },
  { name: 'Mercy N.',   amount: 'KES 32,500', channel: 'M-PESA' },
  { name: 'David K.',   amount: 'KES 12,000', channel: 'Equity' },
  { name: 'Faith A.',   amount: 'KES 28,750', channel: 'M-PESA' },
  { name: 'Samuel M.',  amount: 'KES 15,500', channel: 'KCB' },
];

const trustBadges = ['M-PESA', 'KCB Bank', 'Equity Bank', 'TextSMS', 'Co-op Bank'];

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
      className="relative flex min-h-screen items-center overflow-hidden bg-white"
    >
      {/* Subtle blue accent — top right corner only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-5%] h-[640px] w-[640px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(18,81,163,0.07) 0%, transparent 65%)' }}
      />
      {/* Second, smaller, bottom left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[-8%] h-[360px] w-[360px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(18,81,163,0.04) 0%, transparent 65%)' }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8 lg:pb-24 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">

          {/* ── Copy column ── */}
          <div
            ref={copyRef}
            className={`reveal min-w-0 w-full lg:col-span-6 xl:col-span-7 ${copyVisible ? 'reveal-visible' : ''}`}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-600">
              <span className="fd-pulse-ring h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
              Built for Kenyan schools
            </div>

            <h1 className="font-header text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[1.05] tracking-tight text-gray-950 text-balance">
              School fees.{' '}
              <span className="text-primary">Collected.</span>{' '}
              Automatically.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg text-pretty">
              FeeDesk connects your paybill, bank account, and SMS in one place — so every
              parent's payment lands in the right student's account without lifting a finger.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#contact"
                className="group flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-primary/30 hover:shadow-xl active:translate-y-0 sm:inline-flex sm:w-auto"
              >
                Request a Demo
                <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </a>
              <a
                href="#how-it-works"
                className="group flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 py-3.5 text-base font-medium text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 sm:inline-flex sm:w-auto"
              >
                See how it works
                <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-y-0.5">
                  expand_more
                </span>
              </a>
            </div>

            {/* Trust badge marquee */}
            <div className="mt-10">
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                Integrates natively with
              </p>
              <div className="fd-marquee-pause mt-3 overflow-hidden">
                <div className="fd-marquee-track flex w-max items-center gap-10 whitespace-nowrap sm:gap-12">
                  {[...trustBadges, ...trustBadges].map((label, i) => (
                    <span key={i} className="text-sm font-semibold text-gray-400 sm:text-base">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Visual column — dark product mockup on light bg ── */}
          <div
            ref={visualRef}
            className={`reveal-scale min-w-0 w-full overflow-visible lg:col-span-6 xl:col-span-5 ${visualVisible ? 'reveal-visible' : ''}`}
          >
            <div className="relative pb-0 md:pb-10">
              {/* Browser chrome — dark product UI on white page = strong contrast */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-2xl shadow-gray-400/20 transition-transform duration-500 hover:-translate-y-1">
                {/* Title bar */}
                <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.04] px-3 py-2.5 sm:px-4 sm:py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 sm:h-3 sm:w-3" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80 sm:h-3 sm:w-3" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/80 sm:h-3 sm:w-3" aria-hidden="true" />
                  <span className="ml-2 truncate text-[10px] font-medium text-gray-500 sm:ml-3 sm:text-xs">
                    app.feedesk.com/dashboard
                  </span>
                </div>

                {/* Dashboard body */}
                <div className="bg-fd-canvas p-3 sm:p-5">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <StatTile label="Collected" value="KES 248K" icon="payments" trend="+12%" />
                    <StatTile label="Outstanding" value="KES 1.2M" icon="account_balance_wallet" />
                    <StatTile label="SMS sent" value="184" icon="sms" />

                    <div className="col-span-3 rounded-xl border border-white/[0.06] bg-fd-ink p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[10px]">
                          Live transactions
                        </p>
                        <span className="flex items-center gap-1 text-[9px] font-semibold text-success sm:gap-1.5 sm:text-[10px]">
                          <span className="fd-pulse-ring h-1.5 w-1.5 rounded-full bg-success sm:h-2 sm:w-2" aria-hidden="true" />
                          Live
                        </span>
                      </div>
                      <ul className="mt-2 space-y-2 sm:mt-3 sm:space-y-2.5">
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

              {/* Floating notification card */}
              <div className="absolute -bottom-4 -left-4 hidden w-56 rounded-xl border border-gray-200 bg-gray-900 p-3.5 shadow-2xl shadow-gray-400/20 fd-float-slow md:block lg:-left-8 lg:w-64 lg:p-4">
                <div className="flex items-start gap-2.5 lg:gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success lg:h-9 lg:w-9">
                    <span className="material-symbols-outlined text-lg lg:text-xl">check_circle</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white lg:text-sm">Payment received</p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-500 lg:text-xs">
                      KES 25,000 → Beatrice W. · Grade 10
                    </p>
                    <p className="mt-1 font-mono-brand text-[9px] text-gray-600 lg:text-[10px]">
                      MPESA · UDL030CWZG
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint — desktop only */}
        <div className="mt-16 hidden justify-center lg:flex">
          <a
            href="#features"
            aria-label="Scroll to features"
            className="flex flex-col items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
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
  <div className="rounded-xl border border-white/[0.06] bg-fd-ink p-2.5 transition-all duration-300 hover:border-primary/30 sm:p-3.5">
    <div className="flex items-center justify-between">
      <span className="material-symbols-outlined text-base text-fd-blue-400 sm:text-lg">{icon}</span>
      {trend && (
        <span className="text-[9px] font-bold text-success sm:text-[10px]">{trend}</span>
      )}
    </div>
    <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-wider text-gray-500 sm:mt-2 sm:text-[10px]">
      {label}
    </p>
    <p className="mt-0.5 text-xs font-bold text-white sm:mt-1 sm:text-sm">{value}</p>
  </div>
);

const TxnRow = ({ name, amount, channel }) => (
  <li className="fd-tick-in flex items-center justify-between text-[10px] sm:text-xs">
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-fd-blue-300 sm:h-7 sm:w-7 sm:text-[10px]">
        {name.charAt(0)}
      </span>
      <span className="font-semibold text-gray-300">{name}</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-semibold text-gray-500 sm:px-2 sm:text-[10px]">
        {channel}
      </span>
      <span className="font-bold text-white">{amount}</span>
    </div>
  </li>
);

export default Hero;
