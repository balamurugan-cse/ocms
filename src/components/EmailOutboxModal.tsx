import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EmailDispatchRecord } from '../types';
import {
  X,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy
} from 'lucide-react';

interface EmailOutboxModalProps {
  onClose: () => void;
  onSelectVerificationToken?: (token: string) => void;
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({
  onClose,
  onSelectVerificationToken
}) => {
  const [records, setRecords] = useState<EmailDispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const data = await api.getEmailOutbox();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-snug">System Email Outbox & Verification Journal</h3>
              <p className="text-xs text-slate-400">
                Observability journal for verification links, password resets & status notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-amber-950 text-xs flex items-center justify-between">
          <span>
            Real SMTP emails are delivered if credentials exist in <code>.env</code>. You can copy any verification link below to verify an account instantly.
          </span>
          <button
            onClick={fetchOutbox}
            className="p-1 hover:bg-amber-100 rounded text-amber-800 transition-colors cursor-pointer"
            title="Refresh Outbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Records list */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3 text-xs">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading outbox dispatch journal...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No outbound emails logged yet. Register an account or update a ticket to trigger emails.
            </div>
          ) : (
            records.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:bg-white transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rec.subject}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        rec.status === 'sent' && rec.deliveredViaSmtp
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'smtp_unconfigured'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.deliveredViaSmtp ? 'SMTP Sent' : 'Outbox Staged'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-2">
                  <span>To: <strong>{rec.recipient}</strong></span>
                  <span>·</span>
                  <span>Type: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">{rec.type}</code></span>
                </div>

                {rec.actionUrl && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Generated Action URL:
                    </span>
                    <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                      <code className="text-[11px] text-blue-900 truncate flex-1 font-mono">
                        {rec.actionUrl}
                      </code>
                      <button
                        onClick={() => handleCopy(rec.id, rec.actionUrl!)}
                        className="p-1 text-slate-500 hover:text-blue-900 transition-colors"
                        title="Copy link"
                      >
                        {copiedId === rec.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={rec.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-blue-900 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
