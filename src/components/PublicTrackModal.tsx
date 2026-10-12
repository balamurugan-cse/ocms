import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  Lock
} from 'lucide-react';

interface PublicTrackModalProps {
  initialTicket?: string;
  onClose: () => void;
}

export const PublicTrackModal: React.FC<PublicTrackModalProps> = ({
  initialTicket = '',
  onClose
}) => {
  const [ticketInput, setTicketInput] = useState(initialTicket);
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = async (ticketNo: string) => {
    if (!ticketNo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackPublicComplaint(ticketNo.trim());
      setTicketData(data);
    } catch (err: any) {
      setError(err.message || 'Ticket not found.');
      setTicketData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicket) {
      fetchTicket(initialTicket);
    }
  }, [initialTicket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTicket(ticketInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base leading-snug">Public Grievance Tracker</h3>
              <p className="text-xs text-slate-400">Live Status & Timeline Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              required
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Enter Ticket ID (e.g. DMI-CMP-2026-1001)"
              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {ticketData && (
            <div className="space-y-4">
              {/* Ticket Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-blue-900">
                    {ticketData.complaintNumber}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      ['resolved', 'closed'].includes(ticketData.status)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ticketData.status.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{ticketData.subject}</h4>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <span className="font-semibold text-slate-800">{ticketData.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Category:</span>
                    <span className="font-semibold text-slate-800">{ticketData.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lodged On:</span>
                    <span>{new Date(ticketData.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target SLA Date:</span>
                    <span className="font-mono">{new Date(ticketData.dueAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {ticketData.resolutionNotes && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 mt-2">
                    <span className="font-bold block text-[11px] text-emerald-900">
                      Certified Resolution Statement:
                    </span>
                    <p className="mt-0.5">{ticketData.resolutionNotes}</p>
                  </div>
                )}
              </div>

              {/* Public Timeline */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Verified Progress History
                </h5>
                <div className="space-y-2">
                  {ticketData.events?.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg space-y-0.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {ev.actorName} ({ev.actorRole})
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {ev.publicMessage && (
                        <p className="text-slate-600 pt-1 leading-relaxed">{ev.publicMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!ticketData && !error && !loading && (
            <div className="p-8 text-center text-slate-400">
              Enter any valid DMI ticket number to view live progress.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
