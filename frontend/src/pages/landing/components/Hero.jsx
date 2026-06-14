import { useReveal } from '../hooks/useReveal';

const trustBadges = ['M-PESA', 'KCB Bank', 'Equity Bank', 'Co-op Bank', 'TextSMS'];

const Hero = () => {
  const [copyRef, copyVisible] = useReveal();
  const [cubeRef, cubeVisible] = useReveal({ threshold: 0.1 });

  return (
    <section id="top" className="relative overflow-hidden bg-paper">
      {/* Soft blue wash behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(18,81,163,0.10) 0%, transparent 62%)' }}
      />

      <div className="relative">
        {/* Copy */}
        <div
          ref={copyRef}
          className={`reveal mx-auto max-w-4xl px-4 pb-6 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8 ${copyVisible ? 'reveal-visible' : ''}`}
        >
          <p className="mb-7 font-mono-brand text-xs uppercase tracking-widest text-body">
            Fee collection, evolved
          </p>

          <h1 className="font-header text-[clamp(2.75rem,7vw,5.5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink text-balance">
            Every school fee.<br />
            <span className="text-primary">Reconciled</span> the moment<br className="hidden sm:block" /> it lands.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-body text-pretty sm:text-xl">
            FeeDesk connects your M-PESA paybill, bank accounts, and SMS into one platform —
            so every parent's payment finds the right student automatically, with a receipt and an audit trail.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#contact"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-4 text-base font-bold text-white transition-colors hover:bg-primary-hover sm:w-auto"
            >
              Book a demo
              <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
                arrow_forward
              </span>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-7 py-4 text-base font-semibold text-ink transition-colors hover:bg-paper-2 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Isometric cube cluster — outer <g> positions, inner <g> floats */}
        <div
          ref={cubeRef}
          className={`reveal-scale mx-auto flex max-w-xl justify-center px-6 pb-4 ${cubeVisible ? 'reveal-visible' : ''}`}
        >
          <svg viewBox="0 0 560 300" className="w-full" aria-hidden="true">
            <defs>
              <linearGradient id="fd-cube-top" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>

            <ellipse cx="280" cy="262" rx="180" ry="24" fill="#000" opacity="0.05" />

            {/* back-left light-blue cube */}
            <g transform="translate(150,118) scale(0.72)">
              <g className="fd-cube-2">
                <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#93D0FF" />
                <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#1A65C9" />
                <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#2F7DE0" />
              </g>
            </g>

            {/* back-right blue cube */}
            <g transform="translate(408,132) scale(0.64)">
              <g className="fd-cube-3">
                <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#5CB8FF" />
                <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#1251A3" />
                <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#2F7DE0" />
              </g>
            </g>

            {/* front center hero cube */}
            <g transform="translate(280,40)">
              <g className="fd-cube-1">
                <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="#2F7DE0" />
                <path d="M-80,40 L0,80 L0,172 L-80,132 Z" fill="#0E3D7A" />
                <path d="M80,40 L0,80 L0,172 L80,132 Z" fill="#1251A3" />
                <path d="M0,0 L80,40 L0,80 L-80,40 Z" fill="url(#fd-cube-top)" />
              </g>
            </g>
          </svg>
        </div>

        {/* Logo / trust strip */}
        <div className="border-y border-line bg-paper">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-7 sm:px-6 lg:flex-row lg:justify-center lg:gap-10 lg:px-8">
            <span className="font-mono-brand text-[11px] uppercase tracking-widest text-body">
              Reconciling fees for schools across Kenya
            </span>
            <div className="fd-marquee-pause w-full max-w-xl overflow-hidden lg:max-w-none lg:w-auto">
              <div className="fd-marquee-track flex w-max items-center gap-10 whitespace-nowrap sm:gap-12">
                {[...trustBadges, ...trustBadges].map((label, i) => (
                  <span key={i} className="text-base font-bold text-ink/35">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
