import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import statementService from '../../services/statementService';

const CANON_FIELDS = [
  { key: 'txnRef', label: 'Transaction ref', hint: 'Bank reference (dedup key)' },
  { key: 'date', label: 'Date', hint: 'Value / transaction date' },
  { key: 'reference', label: 'Narration / reference', hint: 'Where the admission number is' },
  { key: 'payerName', label: 'Payer name', hint: 'Depositor / sender' },
];

const HeaderSelect = ({ headers, value, onChange, label, hint }) => (
  <div>
    <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
    >
      <option value="">— none —</option>
      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
    {hint && <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>}
  </div>
);

const StatementImport = () => {
  const { openSidebar } = useOutletContext() || {};
  const qc = useQueryClient();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { headers, sample, rowCount }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const [source, setSource] = useState('BANK_TRANSFER');
  const [amountMode, setAmountMode] = useState('separate');
  const [columns, setColumns] = useState({});
  const [saveAs, setSaveAs] = useState('');

  const setCol = (k, v) => setColumns((c) => ({ ...c, [k]: v }));

  const onPickFile = async (f) => {
    setError(null); setSummary(null); setPreview(null); setColumns({});
    setFile(f);
    if (!f) return;
    setBusy(true);
    try {
      const data = await statementService.preview(f);
      setPreview(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setError(null); setSummary(null);
    setBusy(true);
    try {
      const mapping = { source, delimiter: ',', amountMode, columns, creditTokens: ['CR', 'C', 'CREDIT'] };
      const res = await statementService.import({ file, mapping, saveAs: saveAs.trim() || undefined });
      setSummary(res);
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['suspense-payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      setError(e.response?.data?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const headers = preview?.headers || [];
  const canImport = preview && (amountMode === 'separate' ? columns.credit : columns.amount);

  return (
    <>
      <PageHeader title="Import statement" subtitle="Reconcile any bank / M-Pesa statement against students" onMenuClick={openSidebar} />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <p className="text-sm text-text-muted">
            Upload a CSV export from any bank or M-Pesa. Map the columns once, and every credit line is matched to a student through
            the same engine as live payments — duplicates (and anything already received via a live feed) are skipped automatically.
          </p>

          {/* 1 · Upload */}
          <div className="bg-white rounded-xl border border-surface-border p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">1 · Upload file</p>
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-text-main file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-bold hover:file:bg-primary-hover"
            />
            {file && <p className="text-xs text-text-muted mt-2">{file.name}{preview ? ` · ${preview.rowCount} rows` : ''}</p>}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* 2 · Map columns */}
          {preview && (
            <div className="bg-white rounded-xl border border-surface-border p-6 space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">2 · Map columns</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Payment source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="BANK_AGENT">Bank agent</option>
                    <option value="MPESA">M-PESA</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Credit/debit encoding</label>
                  <select value={amountMode} onChange={(e) => setAmountMode(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="separate">Separate credit &amp; debit columns</option>
                    <option value="direction">One amount + a type column</option>
                    <option value="signed">One signed amount (+ = credit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CANON_FIELDS.map((f) => (
                  <HeaderSelect key={f.key} headers={headers} label={f.label} hint={f.hint}
                    value={columns[f.key]} onChange={(v) => setCol(f.key, v)} />
                ))}
                {amountMode === 'separate' && (
                  <>
                    <HeaderSelect headers={headers} label="Credit column" hint="Money in" value={columns.credit} onChange={(v) => setCol('credit', v)} />
                    <HeaderSelect headers={headers} label="Debit column" hint="Money out (ignored)" value={columns.debit} onChange={(v) => setCol('debit', v)} />
                  </>
                )}
                {amountMode === 'direction' && (
                  <>
                    <HeaderSelect headers={headers} label="Amount column" value={columns.amount} onChange={(v) => setCol('amount', v)} />
                    <HeaderSelect headers={headers} label="Type/direction column" hint="CR / DR" value={columns.direction} onChange={(v) => setCol('direction', v)} />
                  </>
                )}
                {amountMode === 'signed' && (
                  <HeaderSelect headers={headers} label="Amount column" hint="Positive = credit" value={columns.amount} onChange={(v) => setCol('amount', v)} />
                )}
              </div>

              {/* sample preview */}
              {preview.sample?.length > 0 && (
                <div className="overflow-x-auto border border-surface-border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-surface-border">
                      <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-bold text-text-muted whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {preview.sample.map((row, i) => (
                        <tr key={i}>{headers.map((h) => <td key={h} className="px-3 py-2 whitespace-nowrap text-text-main">{row[h]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Save this mapping as (optional)</label>
                  <input value={saveAs} onChange={(e) => setSaveAs(e.target.value)} placeholder="e.g. Co-op Bank CSV"
                    className="w-full px-3 py-2 border border-surface-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <button onClick={runImport} disabled={!canImport || busy}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover disabled:opacity-50">
                  {busy ? 'Importing…' : 'Import & reconcile'}
                </button>
              </div>
            </div>
          )}

          {/* 3 · Summary */}
          {summary && (
            <div className="bg-white rounded-xl border border-surface-border p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Import summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Rows', value: summary.totalRows },
                  { label: 'Credits', value: summary.credits },
                  { label: 'Imported', value: summary.imported, cls: 'text-primary' },
                  { label: 'Auto-matched', value: summary.autoMatched, cls: 'text-green-600' },
                  { label: 'Suspense', value: summary.suspense, cls: 'text-amber-600' },
                  { label: 'Duplicates', value: summary.duplicates, cls: 'text-slate-400' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-surface-border p-3">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{s.label}</p>
                    <p className={`text-2xl font-extrabold mt-1 ${s.cls || 'text-text-main'}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {summary.suspense > 0 && (
                <p className="text-sm text-text-muted mt-4">
                  {summary.suspense} payment{summary.suspense > 1 ? 's' : ''} couldn&apos;t be auto-matched —{' '}
                  <Link to="/finance/suspense" className="text-primary font-semibold hover:underline">resolve in Suspense →</Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StatementImport;
