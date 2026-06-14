import { useReveal } from '../hooks/useReveal';

const tiers = [
  {
    name: 'Pilot',
    tagline: 'For your first term on FeeDesk.',
    priceLabel: 'KES — / month',
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
    priceLabel: 'KES — / month',
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
      className={`reveal relative flex flex-col p-8 transition-all duration-300 hover:-translate-y-1 ${
        tier.highlight
          ? 'fd-gradient-border rounded-2xl bg-fd-ink text-white hover:shadow-2xl hover:shadow-primary/20'
          : 'rounded-2xl border border-fd-gray-200 bg-white text-fd-gray-900 hover:border-fd-blue-200 hover:shadow-xl'
      } ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {tier.highlight && (
        <div className="absolute -top-px left-8 right-8 h-px bg-fd-blue-400/60" aria-hidden="true" />
      )}

      <div className="flex flex-col flex-1">
        {tier.highlight && (
          <span className="mb-3 inline-block w-fit rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-fd-blue-300">
            Most popular
          </span>
        )}

        <div>
          <h3 className="font-header text-2xl font-bold">{tier.name}</h3>
          <p className={`mt-1.5 text-sm ${tier.highlight ? 'text-fd-gray-400' : 'text-fd-gray-600'}`}>
            {tier.tagline}
          </p>
        </div>

        <div className="mt-6">
          <p className={`font-header text-3xl font-extrabold tracking-tight ${tier.highlight ? 'text-white' : 'text-fd-gray-900'}`}>
            {tier.priceLabel}
          </p>
          <p className={`mt-1 text-xs font-medium ${tier.highlight ? 'text-fd-gray-500' : 'text-fd-gray-500'}`}>
            {tier.priceSub}
          </p>
        </div>

        <ul className={`mt-6 flex flex-col gap-3 border-t pt-6 text-sm ${tier.highlight ? 'border-white/10' : 'border-fd-gray-100'}`}>
          {tier.features.map(feat => (
            <li key={feat} className="flex items-start gap-2.5">
              <span className={`material-symbols-outlined mt-0.5 text-base ${tier.highlight ? 'text-fd-blue-400' : 'text-success'}`}>
                check_circle
              </span>
              <span className={tier.highlight ? 'text-fd-gray-300' : 'text-fd-gray-700'}>
                {feat}
              </span>
            </li>
          ))}
        </ul>

        <a
          href={tier.href}
          className={`group mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold transition-all duration-200 ${
            tier.highlight
              ? 'bg-primary text-white hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30'
              : 'border border-fd-gray-300 bg-white text-fd-gray-900 hover:border-primary hover:text-primary'
          }`}
        >
          {tier.cta}
          <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
            arrow_forward
          </span>
        </a>
      </div>
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
          className={`reveal mx-auto max-w-2xl ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <h2 className="font-header text-3xl font-extrabold tracking-tight text-fd-gray-900 text-balance sm:text-4xl lg:text-5xl">
            Simple pricing. No per-transaction fees.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-gray-600">
            All plans include M-PESA integration, bank reconciliation, and SMS reminders.
            One flat monthly fee per school.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {tiers.map((tier, idx) => (
            <PricingCard key={tier.name} tier={tier} delay={idx * 120} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-fd-gray-500">
          Need something different?{' '}
          <a href="#contact" className="font-semibold text-primary hover:underline">
            Talk to us about enterprise pricing
          </a>
          .
        </p>
      </div>
    </section>
  );
};

export default Pricing;
