import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import platformService from '../../services/platformService';

const SecretInput = ({ label, name, value, isSet, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-text-main mb-1">{label}</label>
    <input
      type="password"
      name={name}
      value={value}
      onChange={onChange}
      placeholder={isSet ? 'Stored — leave blank to keep' : (placeholder || 'Not set')}
      className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm"
      autoComplete="new-password"
    />
    {isSet && <p className="text-xs text-text-muted mt-1">Currently: {placeholder}</p>}
  </div>
);

const TextInput = ({ label, name, value, onChange, type = 'text', placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-text-main mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm"
    />
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <div className="bg-white border border-surface-border rounded-2xl p-6 mb-6">
    <h2 className="text-lg font-bold text-text-main font-display">{title}</h2>
    {subtitle && <p className="text-text-muted text-sm mb-4">{subtitle}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">{children}</div>
  </div>
);

const PlatformSettings = () => {
  const { openSidebar } = useOutletContext() || {};
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const [sms, setSms] = useState({ provider: 'textsms', apiKey: '', partnerId: '', shortcode: '' });
  const [mpesa, setMpesa] = useState({ environment: 'sandbox', consumerKey: '', consumerSecret: '', shortcode: '', passkey: '', callbackUrl: '' });
  const [branding, setBranding] = useState({ platformName: '', supportEmail: '', supportPhone: '' });

  useEffect(() => {
    platformService.getPlatformSettings()
      .then(res => {
        const d = res.data;
        setSettings(d);
        setSms({ provider: d.smsGateway.provider, apiKey: '', partnerId: d.smsGateway.partnerId, shortcode: d.smsGateway.shortcode });
        setMpesa({ environment: d.mpesa.environment, consumerKey: '', consumerSecret: '', shortcode: d.mpesa.shortcode, passkey: '', callbackUrl: d.mpesa.callbackUrl });
        setBranding(d.branding);
      })
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await platformService.updatePlatformSettings({ smsGateway: sms, mpesa, branding });
      const d = res.data;
      setSettings(d);
      setSms(s => ({ ...s, apiKey: '', partnerId: d.smsGateway.partnerId, shortcode: d.smsGateway.shortcode }));
      setMpesa(m => ({ ...m, consumerKey: '', consumerSecret: '', passkey: '', shortcode: d.mpesa.shortcode, callbackUrl: d.mpesa.callbackUrl, environment: d.mpesa.environment }));
      setBranding(d.branding);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Platform Settings"
        subtitle="Master credentials and branding shared across all schools"
        onMenuClick={openSidebar}
      />
      <main className="flex-1 overflow-y-auto p-8">
        {loading && <div className="text-text-muted">Loading settings…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

        {settings && (
          <form onSubmit={handleSave} className="max-w-4xl">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 text-sm">
              <strong>Heads up:</strong> Secret fields are stored and never displayed. Leave a secret blank to keep the existing value; type a new value to replace it. Database values override <code>.env</code> when both are set.
            </div>

            <Section title="SMS Gateway" subtitle="TextSMS Kenya credentials used for fee reminders and payment receipts">
              <TextInput label="Provider" name="provider" value={sms.provider} onChange={e => setSms({ ...sms, provider: e.target.value })} />
              <TextInput label="Sender shortcode" name="shortcode" value={sms.shortcode} onChange={e => setSms({ ...sms, shortcode: e.target.value })} placeholder="SCHOOLPAY" />
              <TextInput label="Partner ID" name="partnerId" value={sms.partnerId} onChange={e => setSms({ ...sms, partnerId: e.target.value })} />
              <SecretInput label="API key" name="apiKey" value={sms.apiKey} isSet={settings.smsGateway.apiKeySet} onChange={e => setSms({ ...sms, apiKey: e.target.value })} placeholder={settings.smsGateway.apiKey} />
            </Section>

            <Section title="M-PESA Daraja" subtitle="Master Safaricom credentials for STK Push and C2B callbacks">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Environment</label>
                <select value={mpesa.environment} onChange={e => setMpesa({ ...mpesa, environment: e.target.value })} className="w-full border border-surface-border rounded-xl px-4 py-2.5 text-sm">
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <TextInput label="Business shortcode" name="shortcode" value={mpesa.shortcode} onChange={e => setMpesa({ ...mpesa, shortcode: e.target.value })} />
              <SecretInput label="Consumer key" name="consumerKey" value={mpesa.consumerKey} isSet={settings.mpesa.consumerKeySet} onChange={e => setMpesa({ ...mpesa, consumerKey: e.target.value })} placeholder={settings.mpesa.consumerKey} />
              <SecretInput label="Consumer secret" name="consumerSecret" value={mpesa.consumerSecret} isSet={settings.mpesa.consumerSecretSet} onChange={e => setMpesa({ ...mpesa, consumerSecret: e.target.value })} placeholder={settings.mpesa.consumerSecret} />
              <SecretInput label="Lipa Na M-PESA passkey" name="passkey" value={mpesa.passkey} isSet={settings.mpesa.passkeySet} onChange={e => setMpesa({ ...mpesa, passkey: e.target.value })} placeholder={settings.mpesa.passkey} />
              <TextInput label="STK callback URL" name="callbackUrl" value={mpesa.callbackUrl} onChange={e => setMpesa({ ...mpesa, callbackUrl: e.target.value })} placeholder="https://api.example.com/api/payments/stk-callback" />
            </Section>

            <Section title="Branding" subtitle="Default platform identity shown to schools and parents">
              <TextInput label="Platform name" name="platformName" value={branding.platformName} onChange={e => setBranding({ ...branding, platformName: e.target.value })} />
              <TextInput label="Support email" name="supportEmail" type="email" value={branding.supportEmail} onChange={e => setBranding({ ...branding, supportEmail: e.target.value })} />
              <TextInput label="Support phone" name="supportPhone" value={branding.supportPhone} onChange={e => setBranding({ ...branding, supportPhone: e.target.value })} />
            </Section>

            <div className="flex items-center justify-end gap-4">
              {savedAt && <span className="text-sm text-emerald-600 font-semibold">Saved {savedAt.toLocaleTimeString()}</span>}
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
};

export default PlatformSettings;
