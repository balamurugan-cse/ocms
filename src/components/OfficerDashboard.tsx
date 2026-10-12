import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Complaint } from '../types';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  UserCheck,
  Building2,
  Lock
} from 'lucide-react';

interface OfficerDashboardProps {
  onSelectComplaint: (complaint: Complaint) => void;
  onRefreshTrigger?: number;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  onSelectComplaint,
  onRefreshTrigger
}) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned_to_me' | 'department_backlog' | 'approaching_sla' | 'all'>('assigned_to_me');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOfficerComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminComplaints({
        departmentId: user?.departmentId || 'all',
        limit: '100'
      });
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load officer queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerComplaints();
  }, [user, onRefreshTrigger]);

  const now = Date.now();

  const assignedToMe = complaints.filter((c) => c.assignedTo === user?.id);
  const deptBacklog = complaints.filter((c) => !c.assignedTo || c.status === 'submitted');
  const approachingSla = complaints.filter((c) => {
    if (['resolved', 'closed'].includes(c.status)) return false;
    const diff = new Date(c.dueAt).getTime() - now;
    return diff <= 12 * 3600 * 1000; // 12h or already breached
  });

  const getFilteredList = () => {
    let list: Complaint[] = [];
    switch (activeTab) {
      case 'assigned_to_me':
        list = assignedToMe;
        break;
      case 'department_backlog':
        list = deptBacklog;
        break;
      case 'approaching_sla':
        list = approachingSla;
        break;
      default:
        list = complaints;
        break;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(
        (c) =>
          c.complaintNumber.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const currentList = getFilteredList();

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
            Department Officer Workspace
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            {user?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-800" />
            <span className="font-semibold text-slate-700">
              {user?.departmentName || 'General Grievance Cell'}
            </span>
            <span>·</span>
            <span className="text-slate-500">{user?.email}</span>
          </p>
        </div>

        <button
          onClick={fetchOfficerComplaints}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Queues Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('assigned_to_me')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'assigned_to_me'
              ? 'bg-blue-50/70 border-blue-900 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-600">Assigned to Me</div>
          <div className="text-2xl font-black text-blue-900 font-mono mt-1">
            {assignedToMe.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Direct responsibility</div>
        </div>

        <div
          onClick={() => setActiveTab('department_backlog')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'department_backlog'
              ? 'bg-blue-50/70 border-blue-900 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-600">Unassigned Backlog</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {deptBacklog.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Needs triaging</div>
        </div>

        <div
          onClick={() => setActiveTab('approaching_sla')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'approaching_sla'
              ? 'bg-rose-50/70 border-rose-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-rose-700">Approaching / Breached</div>
          <div className="text-2xl font-black text-rose-900 font-mono mt-1">
            {approachingSla.length}
          </div>
          <div className="text-[11px] text-rose-500 mt-0.5">Under 12h or overdue</div>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'bg-blue-50/70 border-blue-900 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-600">Total Department Pool</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {complaints.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">All tickets</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">
              {activeTab === 'assigned_to_me' && 'Complaints Assigned to You'}
              {activeTab === 'department_backlog' && 'Department Unassigned Backlog'}
              {activeTab === 'approaching_sla' && 'Urgent SLA Watchlist'}
              {activeTab === 'all' && 'All Department Grievances'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-semibold text-slate-600">
              {currentList.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticket, name, subject..."
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading queue...</div>
          ) : currentList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No tickets found in this queue.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject & Complainant</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Clock</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.map((c) => {
                  const diffHours = Math.round((new Date(c.dueAt).getTime() - now) / (3600 * 1000));
                  const isOverdue = !['resolved', 'closed'].includes(c.status) && diffHours <= 0;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectComplaint(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {c.isAnonymous && <Lock className="w-3 h-3 text-slate-400" />}
                          <span>{c.complaintNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate">{c.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          By: {c.isAnonymous ? 'Confidential' : c.complainantName} ({c.complainantRole}) · {c.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : c.priority === 'high'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 uppercase">
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {['resolved', 'closed'].includes(c.status) ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">
                            Resolved
                          </span>
                        ) : isOverdue ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-mono font-bold border border-rose-200">
                            Breached by {Math.abs(diffHours)}h
                          </span>
                        ) : (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-medium">
                            {diffHours}h left
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-blue-900">
                        <div className="flex items-center justify-end gap-1">
                          <span>Inspect</span>
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
    </div>
  );
};
