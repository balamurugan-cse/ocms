import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  FileCheck2,
  Lock,
  ArrowRight,
  Search,
  Building,
  GraduationCap,
  Scale,
  Users2,
  CheckCircle2,
  ExternalLink,
  Award,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PublicLandingProps {
  onOpenTrackModal: (ticketNumber?: string) => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onNavigateToTab: (tab: string) => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  onOpenTrackModal,
  onOpenAuthModal,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const [quickTicket, setQuickTicket] = useState('');

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTicket.trim()) {
      onOpenTrackModal(quickTicket.trim());
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section - 100% Focused on DMI OCMS */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-16 sm:py-24 rounded-3xl border border-blue-900/50 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#93c5fd_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              {/* Institution Emblem Lockup */}
              <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md p-2.5 pr-4 rounded-2xl border border-white/15 w-fit">
                <img
                  src="/assets/dmi-emblem.svg"
                  alt="DMI College of Engineering Official Crest"
                  className="w-12 h-12 object-contain shrink-0"
                />
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
                    DMI COLLEGE OF ENGINEERING • ESTD 2001
                  </span>
                  <span className="text-xs font-bold text-slate-100">
                    Palanchur, Chennai – 600 123 • Tamil Nadu
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/40 border border-blue-400/30 text-blue-200 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Statutory AICTE &amp; Anna University Grievance Portal</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Online Complaint <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200">
                    Management System (OCMS)
                  </span>
                </h1>
              </div>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                A single, unified, institutional grievance portal for students, faculty, and campus staff. Lodge grievances across Academics, Hostel, Transport, IT, and Infrastructure with automated SLA countdowns, confidential anonymous modes, and immutable audit ledgers.
              </p>

              {/* Quick Ticket Tracking Bar */}
              <form
                onSubmit={handleQuickTrack}
                className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 max-w-xl flex flex-col sm:flex-row gap-2 shadow-lg"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-300" />
                  <input
                    type="text"
                    value={quickTicket}
                    onChange={(e) => setQuickTicket(e.target.value)}
                    placeholder="Enter Ticket ID (e.g. DMI-CMP-2026-1001)"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900/70 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <span>Track Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Live Ticket Helper */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Real-time resolution timeline with authenticated token tracking and zero mock data.</span>
              </div>

              {/* Direct Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {user ? (
                  <button
                    onClick={() => onNavigateToTab('dashboard')}
                    className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow-md hover:bg-blue-50 transition-colors flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-900" />
                    <span>Enter Grievance Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenAuthModal('register')}
                      className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow-md hover:bg-blue-50 transition-colors flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-900" />
                      <span>Lodge a Grievance</span>
                    </button>
                    <button
                      onClick={() => onOpenAuthModal('login')}
                      className="px-5 py-3 bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors text-xs cursor-pointer"
                    >
                      Sign In to Account
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Card: Institutional Crest & Project Credentials */}
            <div className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/dmi-emblem.svg"
                    alt="DMI Seal"
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                      Autonomous College Portal
                    </span>
                    <h3 className="text-base font-bold text-white">
                      DMI College of Engineering
                    </h3>
                    <p className="text-[11px] text-slate-400">Palanchur, Chennai - 600 123</p>
                  </div>
                </div>
              </div>

              {/* Institutional Grievance Redressal Assurance */}
              <div className="p-3.5 bg-blue-950/70 border border-blue-800/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Autonomous Institution Grievance Redressal
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Affiliated to Anna University</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  Official Online Grievance Redressal Mechanism adhering to AICTE and UGC Statutory Guidelines.
                </div>
                <div className="text-[11px] text-slate-400">
                  Administered by DMI College of Engineering • Fully Human &amp; Fully Alive
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Strict SLA Timelines:</span>
                    <span className="text-slate-400 ml-1">24h to 72h automated turnaround based on urgency.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Confidential Mode:</span>
                    <span className="text-slate-400 ml-1">Submit without public name linkage; token tracked.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Immutable Audit Trail:</span>
                    <span className="text-slate-400 ml-1">Every transition and evidence file permanently recorded.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Stage Redressal Lifecycle */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
            Standard Operating Procedure
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            The 4-Step Grievance Lifecycle
          </h2>
          <p className="text-slate-600 text-xs">
            Every complaint registered in DMI OCMS is routed through a transparent, audited workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-base">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-base">Lodge Grievance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Student or faculty submits detailed report, attaches evidence files, selects department, and chooses anonymous option if desired.
            </p>
            <div className="pt-2 text-[11px] font-bold text-blue-700">
              Unique DMI-CMP-2026-XXXX Generated
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-base">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-base">Triaging &amp; Assignee</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Central Grievance Committee reviews urgency, verifies jurisdiction, and assigns designated department officer.
            </p>
            <div className="pt-2 text-[11px] font-bold text-blue-700">
              SLA Clock Initialized (24h/48h/72h)
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-base">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-base">Investigation &amp; Action</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Officer conducts on-ground inspection, requests student clarification if needed, and maintains confidential internal notes.
            </p>
            <div className="pt-2 text-[11px] font-bold text-blue-700">
              Real-time Status Updates &amp; Notes
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold text-base">
              04
            </div>
            <h3 className="font-bold text-slate-900 text-base">Resolution &amp; Rating</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Official resolution summary is published. Complainant rates satisfaction (1–5 stars) or exercises right to reopen within 7 days.
            </p>
            <div className="pt-2 text-[11px] font-bold text-emerald-700">
              Certified Closure
            </div>
          </div>
        </div>
      </section>

      {/* Statutory Cells Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100 rounded-3xl p-8 sm:p-10 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Regulatory Oversight
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                Statutory Grievance Redressal Cells at DMI
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('policy')}
              className="text-xs font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Institutional Charter</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="p-2 w-fit rounded-xl bg-rose-50 text-rose-700 mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Anti-Ragging Squad &amp; Cell</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero-tolerance policy in full alignment with Supreme Court and AICTE mandates. Monitored 24/7 by Chief Warden and College Proctor.
              </p>
              <div className="text-[11px] text-slate-500 font-mono pt-2">
                SLA: Immediate 24 Hours
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="p-2 w-fit rounded-xl bg-indigo-50 text-indigo-700 mb-2">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Internal Complaints Committee (ICC)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enforcing Prevention of Sexual Harassment (PoSH) compliance with confidential hearings and impartial inquiry committees.
              </p>
              <div className="text-[11px] text-slate-500 font-mono pt-2">
                SLA: Priority Escalation
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="p-2 w-fit rounded-xl bg-emerald-50 text-emerald-700 mb-2">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Campus Amenities Redressal</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated wings for Hostel &amp; Mess, Bus Logistics, Library Resources, Laboratory Apparatus, and IT Network connectivity.
              </p>
              <div className="text-[11px] text-slate-500 font-mono pt-2">
                SLA: 24 to 48 Hours
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 pt-10 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/dmi-emblem.svg"
              alt="DMI College of Engineering"
              className="h-8 w-8 object-contain"
            />
            <span>DMI College of Engineering, Palanchur, Chennai - 600 123 • Anna University</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <span>Grievance Cell: grievance@dmice.ac.in</span>
            <span>·</span>
            <span>Helpline: +91 44 2681 0641</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
