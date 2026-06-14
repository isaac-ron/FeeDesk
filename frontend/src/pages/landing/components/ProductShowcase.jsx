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

const ProductShowcase = () => {
  const [headerRef, headerVisible] = useReveal();
  const [frameRef, frameVisible] = useReveal({ threshold: 0.1 });
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
    <section className="border-y border-line bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto mb-14 max-w-2xl text-center ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="mb-5 font-mono-brand text-xs uppercase tracking-widest text-primary">
            The bursar's desk
          </p>
          <h2 className="font-header text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            Watch the money land.
          </h2>
        </div>

        <div
          ref={frameRef}
          className={`reveal-scale overflow-hidden rounded-2xl border border-line shadow-2xl shadow-ink/10 ${frameVisible ? 'reveal-visible' : ''}`}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
            <span className="ml-3 font-mono-brand text-xs font-medium text-body">app.feedesk.com/dashboard</span>
          </div>

          {/* Dashboard body */}
          <div className="bg-fd-canvas p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatTile label="Collected" value="KES 248K" icon="payments" trend="+12%" />
              <StatTile label="Outstanding" value="KES 1.2M" icon="account_balance_wallet" />
              <StatTile label="SMS sent" value="184" icon="sms" />

              <div className="col-span-3 rounded-xl border border-white/[0.06] bg-fd-ink p-3 sm:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-fd-gray-600 sm:text-[11px]">
                    Live transactions
                  </p>
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-success sm:gap-1.5 sm:text-[11px]">
                    <span className="fd-pulse-ring h-1.5 w-1.5 rounded-full bg-success sm:h-2 sm:w-2" aria-hidden="true" />
                    Live
                  </span>
                </div>
                <ul className="mt-2 space-y-2 sm:mt-3 sm:space-y-3.5">
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
      </div>
    </section>
  );
};

const StatTile = ({ label, value, icon, trend }) => (
  <div className="rounded-xl border border-white/[0.06] bg-fd-ink p-2.5 sm:p-4">
    <div className="flex items-center justify-between">
      <span className="material-symbols-outlined text-base text-fd-blue-400 sm:text-xl">{icon}</span>
      {trend && (
        <span className="text-[9px] font-bold text-success sm:text-xs">{trend}</span>
      )}
    </div>
    <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-wider text-fd-gray-600 sm:mt-2 sm:text-[10px]">
      {label}
    </p>
    <p className="mt-0.5 text-xs font-bold text-white sm:mt-1 sm:text-lg">{value}</p>
  </div>
);

const TxnRow = ({ name, amount, channel }) => (
  <li className="fd-tick-in flex items-center justify-between text-[10px] sm:text-sm">
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-fd-blue-300 sm:h-7 sm:w-7 sm:text-[10px]">
        {name.charAt(0)}
      </span>
      <span className="font-semibold text-fd-gray-200">{name}</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-semibold text-fd-gray-500 sm:px-2.5 sm:py-1 sm:text-[11px]">
        {channel}
      </span>
      <span className="font-bold text-white">{amount}</span>
    </div>
  </li>
);

export default ProductShowcase;
