import { useReveal } from '../hooks/useReveal';

const steps = [
  {
    number: '01',
    icon: 'rocket_launch',
    title: 'Onboard your school',
    body: 'Add your school\'s paybill number, bank account, and SMS sender ID in the settings page. Takes about 10 minutes.',
  },
  {
    number: '02',
    icon: 'qr_code_2',
    title: 'Share your paybill',
    body: 'Parents pay via M-PESA or bank transfer using their child\'s admission number as the reference. Nothing for them to install.',
  },
  {
    number: '03',
    icon: 'auto_awesome',
    title: 'Watch it reconcile',
    body: 'FeeDesk allocates every payment, updates balances, and fires confirmation SMS — all before you\'ve had your morning tea.',
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
          className="absolute top-7 left-full hidden h-px w-full -translate-x-1/2 bg-gradient-to-r from-fd-blue-500/40 to-transparent md:block"
        />
      )}
      <div className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl hover:shadow-primary/50">
        <span className="material-symbols-outlined text-2xl transition-transform duration-300 group-hover:scale-110">
          {step.icon}
        </span>
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="font-mono-brand text-sm font-bold text-fd-blue-300">
          {step.number}
        </span>
        <h3 className="font-header text-xl font-bold">{step.title}</h3>
      </div>
      <p className="mt-3 text-base leading-relaxed text-fd-gray-300">
        {step.body}
      </p>
    </div>
  );
};

const HowItWorks = () => {
  const [headerRef, headerVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-fd-gray-900 py-20 text-white sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="fd-float-slow pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="fd-float-slower pointer-events-none absolute bottom-0 left-[-10%] h-96 w-96 rounded-full bg-fd-blue-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`reveal mx-auto max-w-2xl text-center ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <p className="text-xs font-semibold uppercase tracking-brand text-fd-blue-300">
            How it works
          </p>
          <h2 className="mt-3 font-header text-3xl font-extrabold tracking-tighter sm:text-4xl lg:text-5xl">
            Live in a morning. Reconciling by lunch.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-gray-300">
            Three steps from sign-up to your first automated payment confirmation.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-12">
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
            className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-fd-gray-900 shadow-lg transition-all duration-200 hover:bg-fd-gray-100 hover:-translate-y-0.5 hover:shadow-xl"
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
