import { Link } from 'react-router-dom';

const LandingFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-fd-gray-900 text-fd-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-5">
            <a href="#top" className="flex items-center gap-2.5" aria-label="FeeDesk home">
              <img
                src="/feedesk-brand/feedesk-brand/logos/svg/feedesk-icon-dark.svg"
                alt=""
                width="36"
                height="36"
                className="h-9 w-9"
              />
              <span className="font-header text-xl font-semibold tracking-tight text-white">
                Fee<span className="text-fd-blue-300">Desk</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              School fee management built for Kenya. Every payment. Accounted for.
            </p>
          </div>

          {/* Product links */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-brand text-white">Product</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><Link to="/login" className="hover:text-white">Log in</Link></li>
            </ul>
          </div>

          {/* Company links */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-brand text-white">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#contact" className="hover:text-white">Request a demo</a></li>
              {/* TODO: replace # with real links once pages exist */}
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>

          {/* Legal links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-brand text-white">Legal</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {/* TODO: replace # with real Privacy / Terms pages */}
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Data Protection</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-fd-gray-800 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-fd-gray-500">
            © {year} FeeDesk. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {/* TODO: replace # with real social links */}
            <a
              href="#"
              aria-label="FeeDesk on LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fd-gray-800 text-fd-gray-400 hover:bg-primary hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="FeeDesk on X"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fd-gray-800 text-fd-gray-400 hover:bg-primary hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
