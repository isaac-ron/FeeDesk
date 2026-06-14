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
          className="absolute left-full top-6 hidden h-px w-full -translate-x-1/2 bg-line md:block"
        />
      )}

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <span className="material-symbols-outlined text-xl">{step.icon}</span>
        </div>
        <span className="font-mono-brand text-xs font-bold tracking-widest text-primary">
          {step.number}
        </span>
      </div>

      <h3 className="font-header text-xl font-bold text-ink">{step.title}</h3>
      <p className="mt-3 text-base leading-relaxed text-body">{step.body}</p>
    </div>
  );
};

const HowItWorks = () => {
  const [headerRef, headerVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <section id="how-it-works" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal max-w-2xl ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="mb-5 font-mono-brand text-xs uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="font-header text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            Live in a morning. Reconciling by lunch.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-body">
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
          className={`reveal mt-16 flex ${ctaVisible ? 'reveal-visible' : ''}`}
        >
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-4 text-base font-bold text-white transition-colors hover:bg-primary-hover"
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
