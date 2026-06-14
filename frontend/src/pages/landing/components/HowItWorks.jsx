import { useReveal } from '../hooks/useReveal';

const steps = [
  {
    number: '01',
    icon: 'rocket_launch',
    title: 'Onboard your school',
    body: "Add your school's paybill number, bank account, and SMS sender ID in the settings page. Takes about 10 minutes.",
  },
  {
    number: '02',
    icon: 'qr_code_2',
    title: 'Share your paybill',
    body: "Parents pay via M-PESA or bank transfer using their child's admission number as the reference. Nothing for them to install.",
  },
  {
    number: '03',
    icon: 'auto_awesome',
    title: 'Watch it reconcile',
    body: "FeeDesk allocates every payment, updates balances, and fires confirmation SMS — all before you've had your morning tea.",
  },
];

const Step = ({ step, idx, delay }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal relative ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {/* Connecting line on desktop */}
      {idx < steps.length - 1 && (
        <div
          aria-hidden="true"
          className="absolute top-6 left-full hidden h-px w-full -translate-x-1/2 bg-gradient-to-r from-white/10 to-transparent md:block"
        />
      )}

      <div className="flex items-center gap-4 mb-5">
        <div className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 text-primary transition-all duration-300 hover:bg-primary hover:text-white hover:ring-primary hover:shadow-lg hover:shadow-primary/30">
          <span className="material-symbols-outlined text-xl">
            {step.icon}
          </span>
        </div>
        <span className="font-mono-brand text-xs font-bold tracking-widest text-fd-blue-600">
          {step.number}
        </span>
      </div>

      <h3 className="font-header text-xl font-bold text-white">{step.title}</h3>
      <p className="mt-3 text-base leading-relaxed text-fd-gray-400" style={{ lineHeight: '1.75' }}>
        {step.body}
      </p>
    </div>
  );
};

const HowItWorks = () => {
  const [headerRef, headerVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gray-900 py-20 text-white sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="fd-glow-pulse pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(18,81,163,0.15) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden="true"
        className="fd-glow-pulse-alt pointer-events-none absolute bottom-0 left-[-10%] h-96 w-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(47,125,224,0.08) 0%, transparent 65%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <h2 className="font-header text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
            Live in a morning. Reconciling by lunch.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-gray-400">
            Three steps from sign-up to your first automated payment confirmation.
          </p>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-14">
          {steps.map((step, idx) => (
            <Step key={step.number} step={step} idx={idx} delay={idx * 150} />
          ))}
        </div>

        <div
          ref={ctaRef}
          className={`reveal mt-16 flex justify-center ${ctaVisible ? 'reveal-visible' : ''}`}
        >
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
          >
            Book a 15-minute walkthrough
            <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
              arrow_forward
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
