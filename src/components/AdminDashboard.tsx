import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Complaint,
  Department,
  User,
  AuditLog,
  ReportSummary,
  UserRole
} from '../types';
import {
  BarChart3,
  Users,
  Building,
  Shield,
  FileSpreadsheet,
  Settings,
  History,
  Download,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Lock,
  ChevronRight
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectComplaint: (complaint: Complaint) => void;
  onRefreshTrigger?: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectComplaint,
  onRefreshTrigger
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'complaints' | 'departments' | 'users' | 'audit' | 'settings'>('analytics');
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters for master complaints tab
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSla, setFilterSla] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptEmail, setNewDeptEmail] = useState('');
  const [newDeptSla, setNewDeptSla] = useState('48');
  const [newDeptCategories, setNewDeptCategories] = useState('');

  // Settings save state
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [repData, cmpData, deptData, uData, audData, settData] = await Promise.all([
        api.getAdminReports(),
        api.getAdminComplaints({ limit: '200' }),
        api.getDepartments(),
        api.getUsers(),
        api.getAuditLogs(),
        api.getSystemSettings()
      ]);
      setReports(repData);
      setComplaints(cmpData.data);
      setDepartments(deptData);
      setUsersList(uData);
      setAuditLogs(audData);
      setSystemSettings(settData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user, onRefreshTrigger]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartment({
        name: newDeptName,
        code: newDeptCode,
        headName: newDeptHead,
        headEmail: newDeptEmail,
        slaHoursDefault: Number(newDeptSla),
        categories: newDeptCategories.split(',').map((c) => c.trim()).filter(Boolean)
      });
      setShowDeptModal(false);
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptHead('');
      setNewDeptEmail('');
      setNewDeptCategories('');
      await fetchAdminData();
    } catch (err) {
      alert('Failed to create department');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole, deptId?: string) => {
    try {
      await api.updateUserRole(targetUserId, newRole, deptId);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (targetUserId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await api.updateUserStatus(targetUserId, nextStatus);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await api.updateSystemSettings(systemSettings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter master complaints
  const filteredComplaints = complaints.filter((c) => {
    if (filterDept !== 'all' && c.departmentId !== filterDept) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    const now = Date.now();
    if (filterSla === 'breached') {
      if (['resolved', 'closed'].includes(c.status) || new Date(c.dueAt).getTime() >= now) return false;
    } else if (filterSla === 'approaching') {
      if (['resolved', 'closed'].includes(c.status)) return false;
      const diff = new Date(c.dueAt).getTime() - now;
      if (diff <= 0 || diff > 12 * 3600 * 1000) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.complaintNumber.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.complainantName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Admin Center Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
            {user?.role === 'super_admin' ? 'Super Administration' : 'Grievance Committee Center'}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Institutional Oversight Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of campus grievances, SLA compliance, department assignments, and audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            download
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={fetchAdminData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh Admin Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px text-xs font-semibold">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>SLA Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'complaints'
              ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Master Queue ({complaints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'departments'
              ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & RBAC Management</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        {user?.role === 'super_admin' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-white border-t-2 border-t-blue-900 border-x border-slate-200 text-blue-950'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        )}
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && reports && (
        <div className="space-y-6">
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Complaints</span>
              <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                {reports.summary.total}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Live in database</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-emerald-700 block">Resolution Rate</span>
              <div className="text-3xl font-black text-emerald-950 font-mono mt-1">
                {reports.summary.resolutionRate}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {reports.summary.resolved} resolved tickets
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-rose-700 block">SLA Breaches</span>
              <div className="text-3xl font-black text-rose-950 font-mono mt-1">
                {reports.summary.breached}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Exceeded resolution SLA</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-blue-700 block">Avg Resolution Time</span>
              <div className="text-3xl font-black text-blue-950 font-mono mt-1">
                {reports.summary.avgResolutionHours}h
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Across all closed cases</span>
            </div>
          </div>

          {/* Department Performance Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Department SLA Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resolution ratios and overdue indicators across all academic and infrastructure wings.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Total Lodged</th>
                    <th className="py-3 px-4 text-center">Resolved</th>
                    <th className="py-3 px-4 text-center">SLA Breached</th>
                    <th className="py-3 px-4 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{dept.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{dept.code}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {dept.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                        {dept.resolved}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-700">
                        {dept.breached}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-bold text-slate-900">{dept.resolutionRate}%</span>
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${dept.resolutionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER COMPLAINTS QUEUE */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
                <option value="reopened">Reopened</option>
              </select>

              <select
                value={filterSla}
                onChange={(e) => setFilterSla(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">All SLA States</option>
                <option value="approaching">Approaching Deadline (&lt; 12h)</option>
                <option value="breached">SLA Breached (Overdue)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, student, subject..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject & Complainant</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      No complaints registered in the system yet. Real complaints lodged by users will appear here live.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => onSelectComplaint(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {c.complaintNumber}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{c.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          By: {c.isAnonymous ? 'Confidential' : c.complainantName} ({c.complainantRole})
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">{c.departmentName}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 uppercase">
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                        {new Date(c.dueAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-blue-900">
                        <span className="flex items-center justify-end gap-1">
                          Manage <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Department & Category Catalog</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational wings, routing rules and default SLA turnaround hours.
              </p>
            </div>
            {user?.role === 'super_admin' && (
              <button
                onClick={() => setShowDeptModal(true)}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="p-4 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">
                    {d.name} <span className="font-mono text-slate-500 text-xs">({d.code})</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    {d.slaHoursDefault}h SLA
                  </span>
                </div>
                <p className="text-xs text-slate-600">{d.description}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  <strong>Department Head:</strong> {d.headName} ({d.headEmail})
                </div>
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Categories:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {d.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">User Directory & Role Assignments</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database user accounts with email verification state and role permissions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Status</th>
                  {user?.role === 'super_admin' && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user?.role === 'super_admin' ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2 py-1 text-xs border border-slate-200 rounded font-semibold bg-white"
                        >
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="officer">Department Officer</option>
                          <option value="admin">Committee Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-800 uppercase text-[11px]">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {u.departmentName || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.emailVerifiedAt ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">Unverified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    {user?.role === 'super_admin' && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                            u.status === 'active'
                              ? 'text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Immutable Security & System Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently logged administrative actions, complaint transitions, and security operations.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-blue-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.actorName}</span>{' '}
                      <span className="text-[10px] text-slate-500">({log.actorRole})</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">{log.details}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                      {log.ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS (SUPER ADMIN) */}
      {activeTab === 'settings' && systemSettings && user?.role === 'super_admin' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-900 text-base">Institutional Grievance Settings</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure SLA thresholds, email verification rules, and institutional contact points.
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings updated successfully and persisted to database.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
              <input
                type="text"
                value={systemSettings.institutionName || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, institutionName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Campus Location</label>
              <input
                type="text"
                value={systemSettings.campusLocation || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, campusLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Grievance Email</label>
              <input
                type="email"
                value={systemSettings.contactEmail || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grievance Cell Helpline Phone</label>
              <input
                type="text"
                value={systemSettings.contactPhone || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SLA Breach Warning Threshold (Hours)
              </label>
              <input
                type="number"
                value={systemSettings.slaBreachHoursThreshold || 24}
                onChange={(e) => setSystemSettings({ ...systemSettings, slaBreachHoursThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complainant Reopen Window (Days)
              </label>
              <input
                type="number"
                value={systemSettings.reopenAllowedDays || 7}
                onChange={(e) => setSystemSettings({ ...systemSettings, reopenAllowedDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={systemSettings.requireEmailVerification ?? true}
                onChange={(e) => setSystemSettings({ ...systemSettings, requireEmailVerification: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-900"
              />
              <span className="font-semibold text-slate-800">
                Enforce mandatory email verification before login and ticket lodging
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={systemSettings.allowAnonymousComplaints ?? true}
                onChange={(e) => setSystemSettings({ ...systemSettings, allowAnonymousComplaints: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-900"
              />
              <span className="font-semibold text-slate-800">
                Allow confidential / anonymous submissions
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Sports & Physical Education"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="e.g. PED"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designated Head Name</label>
                <input
                  type="text"
                  value={newDeptHead}
                  onChange={(e) => setNewDeptHead(e.target.value)}
                  placeholder="e.g. Dr. K. Raman"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Head Email</label>
                <input
                  type="email"
                  value={newDeptEmail}
                  onChange={(e) => setNewDeptEmail(e.target.value)}
                  placeholder="e.g. sports@dmice.ac.in"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default SLA Turnaround (Hours)</label>
                <input
                  type="number"
                  value={newDeptSla}
                  onChange={(e) => setNewDeptSla(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categories (comma-separated)</label>
                <input
                  type="text"
                  value={newDeptCategories}
                  onChange={(e) => setNewDeptCategories(e.target.value)}
                  placeholder="Gym Equipment, Sports Ground, Inter-College Tournaments"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
