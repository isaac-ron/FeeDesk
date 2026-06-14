import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingNav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#pricing', label: 'Pricing' },
  ];

  const closeMenu = () => setOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-fd-canvas/95 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Primary"
      >
        <a href="#top" className="flex items-center gap-2.5" aria-label="FeeDesk home">
          <img
            src="/feedesk-brand/feedesk-brand/logos/svg/feedesk-icon-only.svg"
            alt=""
            width="36"
            height="36"
            className="h-9 w-9"
          />
          <span className="font-header text-xl font-semibold tracking-tight text-white">
            Fee<span className="text-fd-blue-300">Desk</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-fd-gray-400 transition-colors duration-150 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="text-sm font-medium text-fd-gray-400 transition-colors duration-150 hover:text-white"
          >
            Log in
          </Link>
          <a
            href="#contact"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover hover:shadow-primary/35 hover:shadow-xl"
          >
            Request a Demo
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <span className="material-symbols-outlined text-2xl">
            {open ? 'close' : 'menu'}
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/[0.08] bg-fd-canvas/95 backdrop-blur-xl px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-base font-medium text-fd-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.08] pt-3">
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-medium text-fd-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Log in
              </Link>
              <a
                href="#contact"
                onClick={closeMenu}
                className="rounded-full bg-primary px-5 py-2.5 text-center text-sm font-bold text-white hover:bg-primary-hover"
              >
                Request a Demo
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNav;
