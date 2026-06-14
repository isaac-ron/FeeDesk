import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';

const FORMSPREE_FORM_ID = 'YOUR_FORMSPREE_FORM_ID';
const CONTACT_EMAIL = 'hello@feedesk.com';

const sizeOptions = [
  { value: 'lt-200', label: 'Fewer than 200 students' },
  { value: '200-500', label: '200–500 students' },
  { value: '500-1000', label: '500–1,000 students' },
  { value: 'gt-1000', label: 'More than 1,000 students' },
];

const ContactForm = () => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const data = new FormData(form);

    if (FORMSPREE_FORM_ID === 'YOUR_FORMSPREE_FORM_ID') {
      setStatus('error');
      setErrorMessage('Form is not yet configured. Please email us at ' + CONTACT_EMAIL + '.');
      return;
    }

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(body?.errors?.[0]?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again or email us directly.');
    }
  };

  const [copyRef, copyVisible] = useReveal();
  const [formRef, formVisible] = useReveal({ threshold: 0.1 });

  return (
    <section id="contact" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">

          {/* Left: copy */}
          <div ref={copyRef} className={`reveal ${copyVisible ? 'reveal-visible' : ''}`}>
            <p className="mb-5 font-mono-brand text-xs uppercase tracking-widest text-primary">
              Book a demo
            </p>
            <h2 className="font-header text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
              See FeeDesk with your school's data.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-body">
              Tell us about your school and we'll set up a 15-minute walkthrough — no slides,
              just the dashboard with sample data that looks like yours.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                { icon: 'schedule', text: 'We respond within one working day.' },
                { icon: 'lock', text: 'Your details are never shared. We only contact you about the demo.' },
                { icon: 'handshake', text: 'No commitment. Cancel any time during the pilot term.' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  </span>
                  <span className="pt-1.5 text-base text-body">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: form */}
          <div
            ref={formRef}
            className={`reveal-scale rounded-2xl border border-line bg-white p-6 shadow-xl shadow-ink/5 sm:p-8 ${formVisible ? 'reveal-visible' : ''}`}
          >
            {status === 'success' ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <span className="fd-tick-in flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </span>
                <h3 className="mt-4 font-header text-xl font-bold text-ink">
                  Thanks — we'll be in touch.
                </h3>
                <p className="mt-2 max-w-sm text-base text-body">
                  We've received your request and someone from the FeeDesk team will reach out within one working day.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-sm font-semibold text-primary hover:underline"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <Field label="School name" id="schoolName" name="schoolName" required placeholder="e.g. Kenya High School" />
                <Field label="Your name" id="contactName" name="contactName" required placeholder="e.g. Jane Mwangi" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" id="email" name="email" type="email" required placeholder="bursar@school.ac.ke" />
                  <Field label="Phone" id="phone" name="phone" type="tel" required placeholder="+254 7xx xxx xxx" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="schoolSize" className="text-sm font-semibold text-ink">
                    How many students?
                  </label>
                  <select
                    id="schoolSize"
                    name="schoolSize"
                    required
                    defaultValue=""
                    className="block w-full appearance-none rounded-lg border border-line bg-white px-4 py-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="" disabled>Select an option</option>
                    {sizeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {status === 'error' && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="group mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-4 text-base font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'submitting' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      Sending…
                    </>
                  ) : (
                    <>
                      Book a demo
                      <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>

                <p className="mt-2 text-center text-sm text-body">
                  Prefer email? Reach us at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Field = ({ label, id, name, type = 'text', required, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-ink">
      {label}
    </label>
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      className="block w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-body/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
);

export default ContactForm;
