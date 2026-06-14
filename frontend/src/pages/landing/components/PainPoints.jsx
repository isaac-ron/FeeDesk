import { useReveal } from '../hooks/useReveal';

const metrics = [
  { value: '20+ hrs', body: 'saved per week per bursar — no more matching M-PESA texts to a spreadsheet by hand.' },
  { value: '< 5 sec', body: 'from payment to confirmation SMS — allocated to the right student before the parent leaves the till.' },
  { value: '100%', body: 'of payments carry an immutable ledger entry and a printable receipt. Nothing falls through.' },
];

const pillars = [
  {
    icon: 'tune',
    title: 'Adaptive to your school',
    body: 'Per-class fee structures, pro-rata categories, multi-term promotion. FeeDesk bends to how your school already works.',
  },
  {
    icon: 'bolt',
    title: 'Live in a morning',
    body: "Add your paybill, bank account and SMS sender ID, and you're reconciling real payments before lunch. No IT project.",
  },
  {
    icon: 'savings',
    title: 'No per-transaction tax',
    body: 'One flat monthly fee per school. We stay out of the money path, so M-PESA and bank rails stay direct and cheap.',
  },
];

const Metric = ({ metric, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <p className="font-header text-[clamp(2.5rem,5vw,3.5rem)] font-extrabold leading-none tracking-tight text-primary">
        {metric.value}
      </p>
      <p className="mt-3 leading-relaxed text-body">{metric.body}</p>
    </div>
  );
};

const PainPoints = () => {
  const [headerRef, headerVisible] = useReveal();

  return (
    <>
      {/* Metric proof band */}
      <section className="bg-paper py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {metrics.map((metric, idx) => (
            <Metric key={metric.value} metric={metric} delay={idx * 100} />
          ))}
        </div>
      </section>

      {/* Why FeeDesk narrative + pillars */}
      <section className="border-y border-line bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            ref={headerRef}
            className={`reveal max-w-3xl ${headerVisible ? 'reveal-visible' : ''}`}
          >
            <p className="mb-5 font-mono-brand text-xs uppercase tracking-widest text-primary">
              Why FeeDesk
            </p>
            <h2 className="font-header text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
              Fee collection is broken. So we rebuilt it from the payment up.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-body">
              Spreadsheets, WhatsApp groups, and a shoebox of M-PESA messages were never going to scale.
              FeeDesk replaces the whole stack with one system that does the matching for you.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {pillars.map(pillar => (
              <Pillar key={pillar.title} pillar={pillar} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

const Pillar = ({ pillar }) => {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`reveal bg-white p-8 ${visible ? 'reveal-visible' : ''}`}>
      <span className="material-symbols-outlined text-2xl text-primary">{pillar.icon}</span>
      <h3 className="mt-5 font-header text-xl font-bold text-ink">{pillar.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-body">{pillar.body}</p>
    </div>
  );
};

export default PainPoints;
