import { useReveal } from '../hooks/useReveal';

/*
 * Pricing — TODO for user:
 *   1. Replace `priceLabel` and `priceSub` placeholders with real Pilot / Growth tier prices.
 *   2. Confirm the included-features list — current items are derived from the actual product
 *      capabilities; trim or expand based on pricing strategy.
 *   3. If you decide to launch with one introductory price, collapse to a single card.
 */

const tiers = [
  {
    name: 'Pilot',
    tagline: 'For your first term on FeeDesk.',
    priceLabel: 'KES — / month', // TODO: replace with real pilot price
    priceSub: 'Per school · billed monthly',
    cta: 'Start a pilot',
    href: '#contact',
    highlight: false,
    features: [
      'Up to 500 students',
      'M-PESA Paybill (C2B + STK Push)',
      'KCB & Equity bank reconciliation',
      'Automated SMS fee reminders',
      'Printable receipts & audit log',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For schools running FeeDesk as their primary system.',
    priceLabel: 'KES — / month', // TODO: replace with real growth price
    priceSub: 'Per school · billed monthly',
    cta: 'Talk to sales',
    href: '#contact',
    highlight: true,
    features: [
      'Unlimited students',
      'Everything in Pilot',
      'Multi-term & promotion workflows',
      'Custom SMS templates & sender ID setup',
      'Priority WhatsApp support',
      'Onboarding + bursar training session',
    ],
  },
];

const PricingCard = ({ tier, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal relative flex flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
        tier.highlight
          ? 'bg-fd-gray-900 text-white shadow-2xl shadow-fd-blue-900/20 ring-1 ring-primary hover:shadow-fd-blue-900/40'
          : 'border border-fd-gray-200 bg-white text-fd-gray-900 hover:border-fd-blue-200 hover:shadow-xl'
      } ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {tier.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-brand text-white">
          Most popular
        </span>
      )}
      <div>
        <h3 className="font-header text-2xl font-bold">{tier.name}</h3>
        <p className={`mt-1.5 text-sm ${tier.highlight ? 'text-fd-gray-300' : 'text-fd-gray-600'}`}>
          {tier.tagline}
        </p>
      </div>

      <div className="mt-6">
        <p className={`font-header text-3xl font-extrabold tracking-tighter ${tier.highlight ? 'text-white' : 'text-fd-gray-900'}`}>
          {tier.priceLabel}
        </p>
        <p className={`mt-1 text-xs font-medium ${tier.highlight ? 'text-fd-gray-400' : 'text-fd-gray-500'}`}>
          {tier.priceSub}
        </p>
      </div>

      <ul className={`mt-6 flex flex-col gap-3 border-t pt-6 text-sm ${tier.highlight ? 'border-fd-gray-700' : 'border-fd-gray-100'}`}>
        {tier.features.map(feat => (
          <li key={feat} className="flex items-start gap-2.5">
            <span className={`material-symbols-outlined mt-0.5 text-base ${tier.highlight ? 'text-fd-blue-300' : 'text-success'}`}>
              check_circle
            </span>
            <span className={tier.highlight ? 'text-fd-gray-200' : 'text-fd-gray-700'}>
              {feat}
            </span>
          </li>
        ))}
      </ul>

      <a
        href={tier.href}
        className={`group mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold transition-all duration-200 ${
          tier.highlight
            ? 'bg-white text-fd-gray-900 hover:bg-fd-gray-100'
            : 'bg-primary text-white hover:bg-primary-hover'
        }`}
      >
        {tier.cta}
        <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
          arrow_forward
        </span>
      </a>
    </div>
  );
};

const Pricing = () => {
  const [headerRef, headerVisible] = useReveal();

  return (
    <section id="pricing" className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl text-center ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="text-xs font-semibold uppercase tracking-brand text-primary">
            Pricing
          </p>
          <h2 className="mt-3 font-header text-3xl font-extrabold tracking-tighter text-fd-gray-900 sm:text-4xl lg:text-5xl">
            Simple pricing. No per-transaction fees.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-gray-600">
            All plans include M-PESA integration, bank reconciliation, and SMS reminders.
            You only pay one flat monthly fee per school.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {tiers.map((tier, idx) => (
            <PricingCard key={tier.name} tier={tier} delay={idx * 120} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-fd-gray-500">
          Need something different? <a href="#contact" className="font-semibold text-primary hover:underline">Talk to us about enterprise pricing</a>.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
