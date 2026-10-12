import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Complaint,
  ComplaintStatus,
  ComplaintEvent,
  User
} from '../types';
import {
  X,
  Clock,
  ShieldCheck,
  User as UserIcon,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquare,
  FileText,
  Download,
  Star,
  Send,
  RefreshCcw,
  ArrowRight,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaintId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaintId,
  onClose,
  onRefresh
}) => {
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status update drawer
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>('in_progress');
  const [statusReason, setStatusReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [internalNoteForTransition, setInternalNoteForTransition] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Comment / message input
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Rating input
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Reopen input
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);
  const [showReopenBox, setShowReopenBox] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getComplaint(complaintId);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch grievance details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  if (!complaint && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center text-sm font-semibold text-slate-600">
          Loading grievance records from database...
        </div>
      </div>
    );
  }

  if (!complaint) return null;

  const isPrivileged = ['officer', 'admin', 'super_admin'].includes(user?.role || '');
  const isComplainant = complaint.createdBy === user?.id;

  // SLA Time Math
  const dueTime = new Date(complaint.dueAt).getTime();
  const nowTime = Date.now();
  const diffHours = Math.round((dueTime - nowTime) / (3600 * 1000));
  const isBreached = !['resolved', 'closed'].includes(complaint.status) && diffHours <= 0;

  // Allowed transitions
  const ALLOWED_NEXT_STATUS: Record<ComplaintStatus, ComplaintStatus[]> = {
    submitted: ['acknowledged', 'under_review', 'assigned', 'rejected'],
    acknowledged: ['under_review', 'assigned', 'rejected'],
    under_review: ['assigned', 'in_progress', 'need_more_info', 'rejected'],
    assigned: ['in_progress', 'under_review', 'need_more_info', 'rejected'],
    in_progress: ['resolved', 'need_more_info', 'under_review'],
    need_more_info: ['under_review', 'in_progress'],
    resolved: ['closed', 'reopened'],
    closed: ['reopened'],
    rejected: ['reopened'],
    reopened: ['under_review', 'assigned', 'in_progress']
  };

  const allowedNext = ALLOWED_NEXT_STATUS[complaint.status] || [];

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      setError('A mandatory transition reason is required.');
      return;
    }
    setError(null);
    setUpdatingStatus(true);
    try {
      await api.updateStatus(complaint.id, {
        status: targetStatus,
        reason: statusReason.trim(),
        internalNote: internalNoteForTransition.trim() || undefined,
        resolutionNotes: targetStatus === 'resolved' ? resolutionNotes.trim() : undefined
      });
      setSuccessMsg(`Status updated to ${targetStatus.toUpperCase().replace('_', ' ')}.`);
      setStatusReason('');
      setResolutionNotes('');
      setInternalNoteForTransition('');
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.addComment(complaint.id, {
        message: commentText.trim(),
        isInternal: isPrivileged && isInternalComment
      });
      setCommentText('');
      setIsInternalComment(false);
      await fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to post message.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleRateResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await api.rateComplaint(complaint.id, {
        rating: ratingVal,
        feedback: ratingFeedback.trim()
      });
      setSuccessMsg('Thank you! Your resolution rating has been logged.');
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      setError('Please provide a reason for reopening.');
      return;
    }
    setSubmittingReopen(true);
    try {
      await api.reopenComplaint(complaint.id, reopenReason.trim());
      setSuccessMsg('Grievance reopened. It has been moved to the review queue.');
      setShowReopenBox(false);
      setReopenReason('');
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reopen grievance.');
    } finally {
      setSubmittingReopen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-bold text-blue-300">
                {complaint.complaintNumber}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-900/80 text-blue-100 border border-blue-400/30">
                {complaint.departmentName}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {complaint.category}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {complaint.subject}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {/* SLA & Status Summary Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-900 text-white font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Service Level Agreement (SLA)
                </div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  {isBreached ? (
                    <span className="text-rose-600 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Breached by {Math.abs(diffHours)} hours
                    </span>
                  ) : ['resolved', 'closed'].includes(complaint.status) ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolution Certified
                    </span>
                  ) : (
                    <span className="text-blue-900 font-mono">
                      {diffHours} hours remaining until deadline
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-right mr-2 hidden sm:block">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Current State</div>
                <div className="text-xs font-bold text-slate-800 uppercase">{complaint.status.replace('_', ' ')}</div>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  ['resolved', 'closed'].includes(complaint.status)
                    ? 'bg-emerald-100 text-emerald-800'
                    : complaint.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : isBreached
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {complaint.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Complainant Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Complainant</span>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                {complaint.isAnonymous && <Lock className="w-3 h-3 text-slate-500" />}
                <span>{complaint.complainantName}</span>
              </div>
              <span className="text-[10px] text-slate-500">{complaint.complainantRole}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Submitted On</span>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">
                {new Date(complaint.createdAt).toLocaleDateString()}
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Assigned Officer</span>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {complaint.assignedOfficerName || 'Grievance Committee Cell'}
              </div>
              <span className="text-[10px] text-slate-500">{complaint.departmentName}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Campus Location</span>
              <div className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{complaint.location || 'General Campus'}</span>
              </div>
            </div>
          </div>

          {/* Detailed Narrative */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Grievance Narrative
            </h4>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </div>
          </div>

          {/* Attachments Section */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Attached Evidence Documents ({complaint.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {complaint.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-white border border-slate-200 hover:border-blue-900 rounded-lg flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{att.originalName}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-900 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Statement (if resolved) */}
          {complaint.resolutionNotes && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Official Resolution Certification</span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap">
                {complaint.resolutionNotes}
              </p>
              {complaint.resolvedAt && (
                <div className="text-[10px] text-emerald-700 pt-1 font-mono">
                  Certified on: {new Date(complaint.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Rating & Reopen Panel for Complainants when Resolved */}
          {isComplainant && complaint.status === 'resolved' && !complaint.resolutionRating && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">
                    Please Rate Resolution Satisfaction
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Your feedback ensures institutional quality control and closes the ticket.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingVal(star)}
                      className={`p-1 ${
                        star <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRateResolution} className="space-y-2">
                <input
                  type="text"
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Optional review feedback..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowReopenBox(true)}
                    className="text-xs font-semibold text-rose-700 hover:underline"
                  >
                    Unsatisfied? Re-open Grievance
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRating}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs"
                  >
                    {submittingRating ? 'Saving...' : 'Submit 5-Star Rating & Close'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reopen Action Form */}
          {(showReopenBox || (isComplainant && ['resolved', 'closed'].includes(complaint.status) && showReopenBox)) && (
            <form onSubmit={handleReopen} className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span>Reopen Grievance (Mandatory Institutional Justification)</span>
              </h4>
              <textarea
                required
                rows={2}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="State clearly why the prior resolution was inadequate..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReopenBox(false)}
                  className="px-3 py-1 border border-slate-300 rounded text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen}
                  className="px-4 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold"
                >
                  {submittingReopen ? 'Reopening...' : 'Escalate & Reopen Ticket'}
                </button>
              </div>
            </form>
          )}

          {/* OFFICER / ADMIN WORKFLOW TRANSITION CONTROL */}
          {isPrivileged && (
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-200">
                    Administrative Action & Status Transition
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Enforced by Server RBAC</span>
              </div>

              {allowedNext.length === 0 ? (
                <div className="text-slate-400 text-xs">
                  This grievance has reached a terminal closed state. No further transitions allowed unless reopened.
                </div>
              ) : (
                <form onSubmit={handleStatusTransition} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Advance Status To:
                      </label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {allowedNext.map((st) => (
                          <option key={st} value={st}>
                            {st.toUpperCase().replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Mandatory Transition Reason: *
                      </label>
                      <input
                        type="text"
                        required
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="e.g. Technician deployed, parts ordered..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {targetStatus === 'resolved' && (
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        Final Resolution Statement (Visible to Complainant): *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail the remedial actions taken and testing outcome..."
                        className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/50 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      Confidential Internal Note (Strictly Hidden from Complainant):
                    </label>
                    <input
                      type="text"
                      value={internalNoteForTransition}
                      onChange={(e) => setInternalNoteForTransition(e.target.value)}
                      placeholder="e.g. Contractor invoice #442 issued; warranty item..."
                      className="w-full px-3 py-2 bg-slate-800 border border-amber-600/50 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingStatus}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{updatingStatus ? 'Updating...' : 'Execute Transition & Notify'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* IMMUTABLE AUDIT TIMELINE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Immutable Lifecycle Timeline & Audit Trail
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {complaint.events?.length || 0} verified events
              </span>
            </div>

            <div className="space-y-3">
              {complaint.events?.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 relative shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ev.actorName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                        {ev.actorRole}
                      </span>
                      {ev.toStatus && (
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          → {ev.toStatus.toUpperCase().replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {ev.publicMessage && (
                    <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                      {ev.publicMessage}
                    </p>
                  )}

                  {/* INTERNAL NOTE: Strictly shown only to privileged officers/admins */}
                  {ev.internalNote && isPrivileged && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[10px] block">
                          Confidential Internal Note
                        </span>
                        <span>{ev.internalNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Message / Clarification Thread */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-900" />
              <span>Post Clarification or Case Comment</span>
            </h4>

            <form onSubmit={handlePostComment} className="space-y-2">
              <textarea
                required
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type question, clarification, or departmental update..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900"
              />

              <div className="flex items-center justify-between">
                {isPrivileged ? (
                  <label className="flex items-center gap-1.5 text-xs text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600"
                    />
                    <span className="font-semibold text-[11px]">
                      Post as Internal Note (Hidden from Complainant)
                    </span>
                  </label>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Your reply will be permanently logged and notified to the officer.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={postingComment}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{postingComment ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>DMI OCMS • Palanchur, Chennai</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
