import { useReveal } from '../hooks/useReveal';

const points = [
  {
    icon: 'phone_in_talk',
    title: 'Chasing parents for fees is a full-time job',
    body: 'FeeDesk tracks every unpaid balance and sends automated SMS reminders — so your bursar can stop dialling and start managing.',
  },
  {
    icon: 'sync_alt',
    title: 'Manual reconciliation wastes hours',
    body: 'Every M-PESA payment and bank credit is matched to the right student automatically — the moment the money lands.',
  },
  {
    icon: 'fact_check',
    title: 'No paper trail when disputes arise',
    body: 'Every transaction has an immutable ledger entry and a printable receipt. If a parent asks, you have the answer in seconds.',
  },
];

const PainPoint = ({ point, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal flex flex-col items-start ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <span className="group flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-fd-gray-200 transition-all duration-300 hover:scale-110 hover:rotate-3 hover:bg-primary hover:text-white hover:ring-primary">
        <span className="material-symbols-outlined text-2xl">{point.icon}</span>
      </span>
      <h3 className="mt-5 font-header text-lg font-bold text-fd-gray-900 sm:text-xl">
        {point.title}
      </h3>
      <p className="mt-2 text-base leading-relaxed text-fd-gray-600">
        {point.body}
      </p>
    </div>
  );
};

const PainPoints = () => {
  return (
    <section className="border-y border-fd-gray-100 bg-fd-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          {points.map((point, idx) => (
            <PainPoint key={point.title} point={point} delay={idx * 120} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
