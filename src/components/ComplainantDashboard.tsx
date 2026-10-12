import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Complaint, Department, ComplaintPriority } from '../types';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Eye,
  Shield,
  UploadCloud,
  ChevronRight,
  Info,
  Calendar,
  Lock,
  Star,
  RefreshCw
} from 'lucide-react';

interface ComplainantDashboardProps {
  onSelectComplaint: (complaint: Complaint) => void;
  onRefreshTrigger?: number;
}

export const ComplainantDashboard: React.FC<ComplainantDashboardProps> = ({
  onSelectComplaint,
  onRefreshTrigger
}) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Complaint Form state
  const [submitting, setSubmitting] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [deptId, setDeptId] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [location, setLocation] = useState('');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'in_person'>('email');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const [list, depts] = await Promise.all([
        api.getMyComplaints(),
        api.getDepartments()
      ]);
      setComplaints(list);
      setDepartments(depts);
      if (depts.length > 0 && !deptId) {
        setDeptId(depts[0].id);
        if (depts[0].categories.length > 0) {
          setCategory(depts[0].categories[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load user grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user, onRefreshTrigger]);

  const selectedDept = departments.find((d) => d.id === deptId);

  const handleDeptChange = (newDeptId: string) => {
    setDeptId(newDeptId);
    const d = departments.find((item) => item.id === newDeptId);
    if (d && d.categories.length > 0) {
      setCategory(d.categories[0]);
    } else {
      setCategory('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFilesToUpload((prev) => [...prev, ...selected].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await api.createComplaint({
        departmentId: deptId,
        category,
        subject,
        description,
        priority,
        isAnonymous,
        location,
        preferredContact
      });

      // Upload files if any
      if (filesToUpload.length > 0 && res.complaint?.id) {
        try {
          await api.uploadAttachments(res.complaint.id, filesToUpload);
        } catch (uploadErr) {
          console.warn('File upload warning:', uploadErr);
        }
      }

      // Reset form
      setSubject('');
      setDescription('');
      setLocation('');
      setFilesToUpload([]);
      setIsAnonymous(false);
      setFormStep(1);
      setShowCreateModal(false);
      await fetchComplaints();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for SLA calculation
  const getSlaStatus = (dueAtStr: string, status: string, resolvedAt?: string | null) => {
    if (['resolved', 'closed'].includes(status)) {
      if (resolvedAt && new Date(resolvedAt).getTime() > new Date(dueAtStr).getTime()) {
        return { label: 'Resolved (Exceeded SLA)', color: 'text-amber-700 bg-amber-50' };
      }
      return { label: 'Resolved within SLA', color: 'text-emerald-700 bg-emerald-50' };
    }
    const diff = new Date(dueAtStr).getTime() - Date.now();
    if (diff <= 0) {
      const breachHours = Math.abs(Math.round(diff / (3600 * 1000)));
      return { label: `SLA Breached by ${breachHours}h`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    const hoursRemaining = Math.round(diff / (3600 * 1000));
    if (hoursRemaining <= 12) {
      return { label: `${hoursRemaining}h remaining (Urgent)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    return { label: `${hoursRemaining}h remaining`, color: 'text-blue-700 bg-blue-50 border-blue-200' };
  };

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.complaintNumber.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countTotal = complaints.length;
  const countInAction = complaints.filter((c) => ['assigned', 'in_progress', 'under_review'].includes(c.status)).length;
  const countResolved = complaints.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
  const countPending = complaints.filter((c) => ['submitted', 'need_more_info', 'reopened'].includes(c.status)).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
            Complainant Portal
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Welcome, {user?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Roll / ID: {user?.rollNumber || '310622104042'}</span>
            <span>·</span>
            <span>{user?.departmentName || 'DMI College of Engineering'}</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">Email Verified</span>
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lodge New Grievance</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Grievances</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{countTotal}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered in system</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-blue-700">Under Action</div>
          <div className="text-2xl font-black text-blue-950 font-mono mt-1">{countInAction}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Officer active investigation</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700">Resolved / Closed</div>
          <div className="text-2xl font-black text-emerald-950 font-mono mt-1">{countResolved}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Satisfactory completion</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-700">Pending Clarification</div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-1">{countPending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires reply or triaging</div>
        </div>
      </div>

      {/* Grievances List & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">My Submitted Complaints</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-semibold text-slate-600">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subject or ticket..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 w-52"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('submitted')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'submitted' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Submitted
              </button>
              <button
                onClick={() => setFilterStatus('in_progress')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'in_progress' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === 'resolved' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resolved
              </button>
            </div>

            <button
              onClick={fetchComplaints}
              title="Refresh records"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading verified grievances from database...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No grievances found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || filterStatus !== 'all'
                  ? 'No records match your selected filter criteria.'
                  : 'You have not submitted any complaints yet. Use the button above to lodge your first grievance.'}
              </p>
              {!(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors"
                >
                  Lodge Your First Grievance
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket Number</th>
                  <th className="py-3 px-4">Subject & Category</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Clock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const sla = getSlaStatus(c.dueAt, c.status, c.resolvedAt);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectComplaint(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {c.isAnonymous && (
                            <span title="Submitted anonymously" className="text-slate-400">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          <span>{c.complaintNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{c.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {c.category} · {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {c.departmentName}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : c.priority === 'high'
                              ? 'bg-amber-100 text-amber-800'
                              : c.priority === 'medium'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            c.status === 'resolved' || c.status === 'closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'assigned'
                              ? 'bg-purple-100 text-purple-800'
                              : c.status === 'under_review'
                              ? 'bg-indigo-100 text-indigo-800'
                              : c.status === 'need_more_info'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {c.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${sla.color}`}>
                          {sla.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 text-blue-900 font-semibold text-xs">
                          {c.status === 'resolved' && !c.resolutionRating && (
                            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">
                              Rate Solution
                            </span>
                          )}
                          <span>View Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE COMPLAINT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                  DMI Grievance Lodging
                </span>
                <h3 className="text-lg font-bold">Register Official Grievance</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Department & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designated Department *
                  </label>
                  <select
                    value={deptId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grievance Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  >
                    {selectedDept?.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department SLA expectation info */}
              {selectedDept && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      Standard SLA: <strong>{selectedDept.slaHoursDefault} hours</strong> resolution window.
                    </span>
                  </div>
                  <span className="text-slate-600 text-[10px]">
                    Head: {selectedDept.headName}
                  </span>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Wi-Fi router malfunction in Block C Lab 2"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide concrete details, timestamps, observed defect, and impact on academics or campus life..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* Urgency & Campus Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority / Urgency
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="low">Low (Standard routine maintenance)</option>
                    <option value="medium">Medium (Normal student impact)</option>
                    <option value="high">High (Academic or welfare disruption)</option>
                    <option value="urgent">Urgent (Safety, health or critical outage)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campus Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mechanical Block, Room 204 or Bus #12"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Evidence File Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supporting Evidence / Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload-input"
                  />
                  <label
                    htmlFor="file-upload-input"
                    className="cursor-pointer flex flex-col items-center gap-1 text-slate-600"
                  >
                    <UploadCloud className="w-5 h-5 text-blue-900" />
                    <span className="text-xs font-semibold text-blue-900">
                      Click to browse attachments
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JPG, PNG, PDF, DOC up to 10MB (max 5 files)
                    </span>
                  </label>
                </div>

                {filesToUpload.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {filesToUpload.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-slate-100 px-3 py-1.5 rounded"
                      >
                        <span className="truncate max-w-xs">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anonymity Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                <input
                  type="checkbox"
                  id="anonymous-toggle"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                />
                <label htmlFor="anonymous-toggle" className="text-xs cursor-pointer">
                  <span className="font-bold text-slate-900 block">
                    Confidential / Anonymous Submission
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Your name and roll number will be masked on the public tracker and department officer screens. Anonymized complaints retain full token-based tracking.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Lodging Grievance...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
