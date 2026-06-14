import { useReveal } from '../hooks/useReveal';

const modules = [
  { icon: 'phone_android',     title: 'M-PESA Paybill',       body: 'C2B + STK Push, auto-allocated by admission number.' },
  { icon: 'account_balance',   title: 'Bank Reconciliation',  body: 'KCB BUNI & Equity Jenga IPNs matched in real time.' },
  { icon: 'sms',               title: 'SMS Reminders',        body: 'Automated Monday & Thursday nudges, branded sender ID.' },
  { icon: 'receipt_long',      title: 'Printable Receipts',   body: 'One-click A5 receipt per transaction, straight to print.' },
  { icon: 'manage_search',     title: 'Audit Trail',          body: 'Immutable ledger for every charge, payment, reallocation.' },
  { icon: 'school',            title: 'Multi-School',         body: 'Each school isolated — own paybill, credentials, data.' },
  { icon: 'rule',              title: 'Smart Matching',       body: 'Ranked candidate suggestions resolve unmatched payments.' },
  { icon: 'pie_chart',         title: 'Fee Structures',       body: 'Per-class, pro-rata categories with derived balances.' },
  { icon: 'dashboard',         title: 'Live Dashboard',       body: 'Collected, outstanding, and SMS at a glance, in real time.' },
];

const Module = ({ module }) => {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`reveal flex items-start gap-4 bg-paper p-6 ${visible ? 'reveal-visible' : ''}`}>
      <span className="material-symbols-outlined mt-0.5 text-xl text-primary">{module.icon}</span>
      <div>
        <h3 className="font-header font-bold text-ink">{module.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-body">{module.body}</p>
      </div>
    </div>
  );
};

const Features = () => {
  const [headerRef, headerVisible] = useReveal();

  return (
    <section id="features" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mb-12 flex flex-wrap items-end justify-between gap-6 ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <h2 className="max-w-xl font-header text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            One platform. Every payment channel.
          </h2>
          <p className="font-mono-brand text-xs uppercase tracking-widest text-body">
            9 capabilities · 1 ledger
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(module => (
            <Module key={module.title} module={module} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
