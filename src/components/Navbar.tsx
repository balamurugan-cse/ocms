import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Bell,
  LogOut,
  UserCheck,
  ChevronDown,
  Mail,
  Search,
  CheckCircle2,
  Award,
  Building2,
  FileText
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTrackModal: () => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onOpenOutboxModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTrackModal,
  onOpenAuthModal,
  onOpenOutboxModal,
}) => {
  const { user, logout, notifications, unreadNotifsCount, markNotificationRead, switchAccountForDemo } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'HOD / Committee Admin';
      case 'officer':
        return 'Department Coordinator';
      case 'faculty':
        return 'Faculty Complainant';
      default:
        return 'Student Complainant (CSE)';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">

      {/* Main Navigation Bar - Strictly OCMS Single Portal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        {/* Zone 1: Authentic DMI Crest & OCMS Wordmark */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer select-none whitespace-nowrap shrink-0 group"
        >
          <img
            src="/assets/dmi-emblem.svg"
            alt="DMI College of Engineering Official Crest"
            className="h-12 w-12 sm:h-13 sm:w-13 object-contain drop-shadow-sm transition-transform group-hover:scale-105 select-none"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                DMI OCMS
              </span>
              <span className="text-[10px] text-amber-600 font-bold hidden sm:inline">
                ESTD 2001
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 leading-tight">
              Online Complaint Management System
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-none">
              DMI College of Engineering • Palanchur, Chennai
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Clean Single Portal OCMS) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 whitespace-nowrap shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className={`transition-colors hover:text-blue-900 cursor-pointer ${
              activeTab === 'home' ? 'text-blue-900 font-extrabold border-b-2 border-blue-900 pb-1' : ''
            }`}
          >
            Overview &amp; Tracking
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors hover:text-blue-900 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard' ? 'text-blue-900 font-extrabold border-b-2 border-blue-900 pb-1' : ''
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-900" />
            <span>
              {['admin', 'super_admin'].includes(user?.role || '')
                ? 'Admin Oversight Console'
                : user?.role === 'officer'
                ? 'Department Officer Queue'
                : 'My Grievance Dashboard'}
            </span>
          </button>

          <button
            onClick={onOpenTrackModal}
            className="transition-colors hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Track by Ticket</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`transition-colors hover:text-blue-900 cursor-pointer ${
              activeTab === 'departments' ? 'text-blue-900 font-extrabold border-b-2 border-blue-900 pb-1' : ''
            }`}
          >
            Departments &amp; SLA
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`transition-colors hover:text-blue-900 cursor-pointer ${
              activeTab === 'policy' ? 'text-blue-900 font-extrabold border-b-2 border-blue-900 pb-1' : ''
            }`}
          >
            Redressal Charter
          </button>

        </nav>

        {/* Zone 3: 1 Primary Action / User Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Notification Drawer */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white" />
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      <span className="text-[10px] text-slate-400 font-mono">{unreadNotifsCount} unread</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">No new notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-2.5 text-xs rounded-lg transition-colors cursor-pointer ${
                              n.read ? 'hover:bg-slate-50 text-slate-600' : 'bg-blue-50/50 hover:bg-blue-50 text-slate-900 font-medium'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">{n.title}</div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Account Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {getRoleLabel(user.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      {user.rollNumber && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Roll: {user.rollNumber}
                        </div>
                      )}
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Email Verified</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-900" />
                      <span>Workspace Dashboard</span>
                    </button>





                    <button
                      onClick={() => {
                        onOpenOutboxModal();
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-amber-950 hover:bg-amber-50 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-600" />
                      <span>Email Dispatch Outbox</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuthModal('login')}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuthModal('register')}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
