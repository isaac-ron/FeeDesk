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
      className={`reveal relative flex flex-col rounded-2xl p-8 ${
        tier.highlight
          ? 'bg-primary-hover text-white'
          : 'border border-line bg-white text-ink'
      } ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {tier.highlight && (
        <span className="mb-3 inline-block w-fit rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Most popular
        </span>
      )}

      <h3 className="font-header text-2xl font-bold">{tier.name}</h3>
      <p className={`mt-1.5 text-sm ${tier.highlight ? 'text-fd-blue-100' : 'text-body'}`}>
        {tier.tagline}
      </p>

      <div className="mt-6">
        <p className="font-header text-3xl font-extrabold tracking-tight">
          {tier.priceLabel}
        </p>
        <p className={`mt-1 text-xs font-medium ${tier.highlight ? 'text-fd-blue-200' : 'text-body'}`}>
          {tier.priceSub}
        </p>
      </div>

      <ul className={`mt-6 flex flex-1 flex-col gap-3 border-t pt-6 text-sm ${tier.highlight ? 'border-white/15' : 'border-line'}`}>
        {tier.features.map(feat => (
          <li key={feat} className="flex items-start gap-2.5">
            <span className={`material-symbols-outlined mt-0.5 text-base ${tier.highlight ? 'text-fd-blue-300' : 'text-success'}`}>
              check_circle
            </span>
            <span className={tier.highlight ? 'text-fd-blue-100' : 'text-body'}>{feat}</span>
          </li>
        ))}
      </ul>

      <a
        href={tier.href}
        className={`group mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-bold transition-colors ${
          tier.highlight
            ? 'bg-white text-primary-hover hover:bg-paper'
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
    <section id="pricing" className="border-y border-line bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl text-center ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="mb-5 font-mono-brand text-xs uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="font-header text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            Simple pricing. No per-transaction fees.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-body">
            All plans include M-PESA integration, bank reconciliation, and SMS reminders.
            One flat monthly fee per school.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {tiers.map((tier, idx) => (
            <PricingCard key={tier.name} tier={tier} delay={idx * 120} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-body">
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
