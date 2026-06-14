import { useReveal } from '../hooks/useReveal';

const primaryFeatures = [
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
];

const secondaryFeatures = [
  {
    icon: 'sms',
    title: 'SMS Reminders',
    body: 'Automated alerts every Monday and Thursday for outstanding balances — TextSMS Kenya, branded sender ID.',
  },
  {
    icon: 'receipt_long',
    title: 'Printable Receipts',
    body: 'One-click A5 receipt per transaction. Print directly from the browser.',
  },
  {
    icon: 'manage_search',
    title: 'Audit Trail',
    body: 'Every charge, payment, and reallocation in an immutable ledger with full filter support.',
  },
  {
    icon: 'school',
    title: 'Multi-School',
    body: 'Each school is fully isolated — separate paybill, credentials, and data.',
  },
];

const cardBase = 'group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gray-900 transition-all duration-300 hover:border-blue-600/40 hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-1';

const PrimaryCard = ({ feature, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${cardBase} p-7 ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <span className="material-symbols-outlined mb-5 text-3xl text-fd-blue-400 transition-all duration-300 group-hover:text-fd-blue-300">
        {feature.icon}
      </span>
      <h3 className="font-header text-xl font-bold text-white">
        {feature.title}
      </h3>
      <p className="mt-3 text-base leading-relaxed text-gray-400">
        {feature.body}
      </p>
    </div>
  );
};

const SecondaryCard = ({ feature, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${cardBase} p-5 ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <span className="material-symbols-outlined mb-4 text-xl text-fd-blue-400 transition-all duration-300 group-hover:text-fd-blue-300">
        {feature.icon}
      </span>
      <h3 className="font-header text-base font-bold text-white">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        {feature.body}
      </p>
    </div>
  );
};

const Features = () => {
  const [headerRef, headerVisible] = useReveal();

  return (
    <section id="features" className="relative overflow-hidden bg-gray-950 py-20 sm:py-24 lg:py-28">
      {/* Mesh overlay */}
      <div aria-hidden="true" className="fd-mesh pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <h2 className="font-header text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
            One platform. Every payment channel.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-400">
            FeeDesk replaces the spreadsheet, the WhatsApp group, and the late-night
            reconciliation — with one bursar-friendly dashboard.
          </p>
        </div>

        {/* Primary features — 2 wide cards */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {primaryFeatures.map((feature, idx) => (
            <PrimaryCard key={feature.title} feature={feature} delay={idx * 100} />
          ))}
        </div>

        {/* Secondary features — 4 compact cards */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryFeatures.map((feature, idx) => (
            <SecondaryCard key={feature.title} feature={feature} delay={(idx + 2) * 80} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
