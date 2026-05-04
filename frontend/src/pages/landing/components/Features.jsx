import { useReveal } from '../hooks/useReveal';

const features = [
  {
    icon: 'phone_android',
    title: 'M-PESA Paybill',
    body: 'Parents pay via M-PESA; funds auto-allocate to the correct student account the moment the webhook fires. C2B and STK Push both supported.',
  },
  {
    icon: 'account_balance',
    title: 'Bank Reconciliation',
    body: 'KCB BUNI and Equity Jenga IPNs reconciled in real-time. No CSVs, no manual imports, no end-of-day batch jobs.',
  },
  {
    icon: 'sms',
    title: 'SMS Fee Reminders',
    body: 'Automated reminders every Monday and Thursday for students with outstanding balances — TextSMS Kenya, branded sender ID.',
  },
  {
    icon: 'receipt_long',
    title: 'Printable Receipts',
    body: 'One-click A5 receipt per transaction. Print directly from the browser — no PDF library, no email attachment dance.',
  },
  {
    icon: 'manage_search',
    title: 'Audit Trail',
    body: 'Every fee charge, payment, refund, and reallocation appended to an immutable ledger. Full audit log with filters by user, action, and date.',
  },
  {
    icon: 'school',
    title: 'Multi-School Ready',
    body: 'Each school is fully isolated — separate paybill, separate credentials, separate data. Run one school or a hundred.',
  },
];

const FeatureCard = ({ feature, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal group relative overflow-hidden rounded-2xl border border-fd-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-fd-blue-200 hover:shadow-xl hover:shadow-fd-blue-600/10 ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {/* Hover gradient sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fd-blue-50/0 via-fd-blue-50/0 to-fd-blue-50/0 opacity-0 transition-opacity duration-500 group-hover:from-fd-blue-50/40 group-hover:to-transparent group-hover:opacity-100"
      />
      <div className="relative">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fd-blue-50 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30">
          <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
        </span>
        <h3 className="mt-5 font-header text-lg font-bold text-fd-gray-900">
          {feature.title}
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fd-gray-600">
          {feature.body}
        </p>
      </div>
    </div>
  );
};

const Features = () => {
  const [headerRef, headerVisible] = useReveal();

  return (
    <section id="features" className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl text-center ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="text-xs font-semibold uppercase tracking-brand text-primary">
            Everything you need
          </p>
          <h2 className="mt-3 font-header text-3xl font-extrabold tracking-tighter text-fd-gray-900 sm:text-4xl lg:text-5xl">
            One platform. Every payment channel.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-gray-600">
            FeeDesk replaces the spreadsheet, the WhatsApp group, and the late-night reconciliation
            — with one bursar-friendly dashboard.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <FeatureCard key={feature.title} feature={feature} delay={(idx % 3) * 100} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
