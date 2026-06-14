import { useReveal } from '../hooks/useReveal';

const points = [
  {
    title: 'Chasing parents for fees is a full-time job',
    body: 'FeeDesk tracks every unpaid balance and sends automated SMS reminders — so your bursar can stop dialling and start managing.',
  },
  {
    title: 'Manual reconciliation wastes hours',
    body: 'Every M-PESA payment and bank credit is matched to the right student automatically — the moment the money lands.',
  },
  {
    title: 'No paper trail when disputes arise',
    body: 'Every transaction has an immutable ledger entry and a printable receipt. If a parent asks, you have the answer in seconds.',
  },
];

const PainPoint = ({ point, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal flex flex-col gap-4 border-t-2 border-fd-blue-600/30 pt-6 ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <h3 className="font-header text-xl font-bold leading-snug text-fd-gray-900 text-balance sm:text-2xl">
        {point.title}
      </h3>
      <p className="text-base leading-relaxed text-fd-gray-600">
        {point.body}
      </p>
    </div>
  );
};

const PainPoints = () => {
  return (
    <section className="border-b border-fd-gray-100 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-14">
          {points.map((point, idx) => (
            <PainPoint key={point.title} point={point} delay={idx * 120} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
