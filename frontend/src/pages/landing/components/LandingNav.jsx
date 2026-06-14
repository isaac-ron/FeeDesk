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
          ? 'bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm'
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
          <span className="font-header text-xl font-semibold tracking-tight text-gray-950">
            Fee<span className="text-primary">Desk</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900"
          >
            Log in
          </Link>
          <a
            href="#contact"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/25"
          >
            Request a Demo
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
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
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-3">
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
