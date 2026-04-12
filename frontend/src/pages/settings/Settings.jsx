import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../services/api';

const TABS = [
  { id: 'school', label: 'School Profile', icon: 'apartment' },
  { id: 'mpesa', label: 'M-PESA', icon: 'phone_android' },
  { id: 'sms', label: 'SMS', icon: 'sms' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states per tab
  const [schoolForm, setSchoolForm] = useState({
    name: '', contactEmail: '', contactPhone: '',
    address: { street: '', city: '', county: '', postalCode: '' },
    bankDetails: { bankName: '', accountName: '', accountNumber: '', branch: '' },
  });

  const [mpesaForm, setMpesaForm] = useState({
    paybillNumber: '', accountNumber: '',
  });

  const [notifForm, setNotifForm] = useState({
    smsNotifications: true, emailNotifications: true,
  });

  const fetchSchool = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/schools/me');
      const s = data.data;
      setSchool(s);
      setSchoolForm({
        name: s.name || '',
        contactEmail: s.contactEmail || '',
        contactPhone: s.contactPhone || '',
        address: { street: s.address?.street || '', city: s.address?.city || '', county: s.address?.county || '', postalCode: s.address?.postalCode || '' },
        bankDetails: { bankName: s.bankDetails?.bankName || '', accountName: s.bankDetails?.accountName || '', accountNumber: s.bankDetails?.accountNumber || '', branch: s.bankDetails?.branch || '' },
      });
      setMpesaForm({
        paybillNumber: s.paybillNumber || '',
        accountNumber: s.accountNumber || '',
      });
      setNotifForm({
        smsNotifications: s.settings?.smsNotifications ?? true,
        emailNotifications: s.settings?.emailNotifications ?? true,
      });
    } catch (err) {
      setError('Failed to load school settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchool(); }, [fetchSchool]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let payload = {};

      if (activeTab === 'school') {
        payload = {
          name: schoolForm.name,
          contactEmail: schoolForm.contactEmail,
          contactPhone: schoolForm.contactPhone,
          address: schoolForm.address,
          bankDetails: schoolForm.bankDetails,
        };
      } else if (activeTab === 'mpesa') {
        payload = {
          paybillNumber: mpesaForm.paybillNumber,
          accountNumber: mpesaForm.accountNumber,
        };
      } else if (activeTab === 'notifications') {
        payload = {
          settings: {
            ...school?.settings,
            smsNotifications: notifForm.smsNotifications,
            emailNotifications: notifForm.emailNotifications,
          },
        };
      } else if (activeTab === 'sms') {
        // SMS credentials are server-side env vars, nothing to save from frontend
        setSuccess('SMS credentials are configured on the server via environment variables.');
        setSaving(false);
        return;
      }

      await api.put('/schools/me', payload);
      setSuccess('Settings saved successfully.');
      fetchSchool();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );

  const Toggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const renderSchoolTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">School Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="School Name" value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} />
          <InputField label="School Code" value={school?.code || ''} disabled />
          <InputField label="Contact Email" value={schoolForm.contactEmail} onChange={(e) => setSchoolForm({ ...schoolForm, contactEmail: e.target.value })} type="email" />
          <InputField label="Contact Phone" value={schoolForm.contactPhone} onChange={(e) => setSchoolForm({ ...schoolForm, contactPhone: e.target.value })} placeholder="2547XXXXXXXX" />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Street" value={schoolForm.address.street} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, street: e.target.value } })} />
          <InputField label="City" value={schoolForm.address.city} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, city: e.target.value } })} />
          <InputField label="County" value={schoolForm.address.county} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, county: e.target.value } })} />
          <InputField label="Postal Code" value={schoolForm.address.postalCode} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, postalCode: e.target.value } })} />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Bank Name" value={schoolForm.bankDetails.bankName} onChange={(e) => setSchoolForm({ ...schoolForm, bankDetails: { ...schoolForm.bankDetails, bankName: e.target.value } })} />
          <InputField label="Account Name" value={schoolForm.bankDetails.accountName} onChange={(e) => setSchoolForm({ ...schoolForm, bankDetails: { ...schoolForm.bankDetails, accountName: e.target.value } })} />
          <InputField label="Account Number" value={schoolForm.bankDetails.accountNumber} onChange={(e) => setSchoolForm({ ...schoolForm, bankDetails: { ...schoolForm.bankDetails, accountNumber: e.target.value } })} />
          <InputField label="Branch" value={schoolForm.bankDetails.branch} onChange={(e) => setSchoolForm({ ...schoolForm, bankDetails: { ...schoolForm.bankDetails, branch: e.target.value } })} />
        </div>
      </div>
    </div>
  );

  const renderMpesaTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-1">M-PESA Integration</h3>
        <p className="text-sm text-slate-500 mb-4">Configure your Safaricom M-PESA Paybill details for receiving payments.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Paybill Number" value={mpesaForm.paybillNumber} onChange={(e) => setMpesaForm({ ...mpesaForm, paybillNumber: e.target.value })} placeholder="e.g. 174379" />
          <InputField label="Account Number (optional)" value={mpesaForm.accountNumber} onChange={(e) => setMpesaForm({ ...mpesaForm, accountNumber: e.target.value })} placeholder="Account reference" />
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5">info</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Daraja API Credentials</p>
            <p className="text-xs text-blue-700 mt-1">
              Consumer Key, Consumer Secret, and Passkey are configured on the server via environment variables for security.
              Contact your system administrator to update M-PESA API credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSmsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-1">SMS Provider</h3>
        <p className="text-sm text-slate-500 mb-4">SMS notifications are sent via TextSMS Kenya.</p>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600">sms</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">TextSMS Kenya</p>
            <p className="text-xs text-slate-500">REST API SMS Provider</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">API Key</span>
            <span className="text-sm text-slate-700 font-mono">••••••••••</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Partner ID</span>
            <span className="text-sm text-slate-700 font-mono">••••••••••</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Shortcode</span>
            <span className="text-sm text-slate-700">SCHOOLPAY</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5">info</span>
          <p className="text-xs text-blue-700">
            SMS credentials are configured on the server via environment variables (TEXTSMS_API_KEY, TEXTSMS_PARTNER_ID, TEXTSMS_SHORTCODE).
            Contact your system administrator to update these.
          </p>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Notification Preferences</h3>
        <p className="text-sm text-slate-500 mb-4">Control which notifications your school sends automatically.</p>
      </div>
      <div className="divide-y divide-slate-200">
        <Toggle
          label="SMS Notifications"
          description="Send payment receipts and fee reminders via SMS to guardians"
          checked={notifForm.smsNotifications}
          onChange={(v) => setNotifForm({ ...notifForm, smsNotifications: v })}
        />
        <Toggle
          label="Email Notifications"
          description="Send payment receipts and reports via email"
          checked={notifForm.emailNotifications}
          onChange={(v) => setNotifForm({ ...notifForm, emailNotifications: v })}
        />
      </div>
    </div>
  );

  const tabContent = {
    school: renderSchoolTab,
    mpesa: renderMpesaTab,
    sms: renderSmsTab,
    notifications: renderNotificationsTab,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-surface-border bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-text-main text-2xl font-bold leading-tight tracking-tight font-display">Settings</h2>
          {school && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                school.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                school.subscriptionStatus === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {school.subscriptionStatus === 'ACTIVE' ? 'check_circle' : school.subscriptionStatus === 'TRIAL' ? 'hourglass_empty' : 'error'}
                </span>
                {school.subscriptionStatus}
              </span>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Tabs */}
              <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Alerts */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Tab Content */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                {tabContent[activeTab]?.()}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-bold transition-all hover:bg-primary-hover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
