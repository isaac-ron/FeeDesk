import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingNav = () => {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Platform' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#pricing', label: 'Pricing' },
  ];

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* Announcement bar — scrolls away with the page */}
      <div className="bg-ink px-4 py-2.5 text-center text-[13px] text-paper">
        <span className="font-mono-brand text-fd-blue-300">New</span>
        <span className="ml-2 text-fd-gray-300">KCB &amp; Equity bank reconciliation is now live</span>
        <a
          href="#features"
          className="ml-2 font-semibold underline underline-offset-2 transition-colors hover:text-fd-blue-300"
        >
          See what's new →
        </a>
      </div>

      {/* Nav — sticks to top */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
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
            <span className="font-header text-xl font-extrabold tracking-tight text-ink">
              Fee<span className="text-primary">Desk</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-body transition-colors duration-150 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-body transition-colors duration-150 hover:text-ink"
            >
              Log in
            </Link>
            <a
              href="#contact"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Book a demo
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-paper-2 md:hidden"
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
          <div className="border-t border-line bg-paper px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-base font-medium text-body transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-lg border border-line px-5 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-paper-2"
                >
                  Log in
                </Link>
                <a
                  href="#contact"
                  onClick={closeMenu}
                  className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-bold text-white hover:bg-primary-hover"
                >
                  Book a demo
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default LandingNav;
