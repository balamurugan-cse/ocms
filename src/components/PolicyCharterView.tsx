import React from 'react';
import {
  ShieldAlert,
  Scale,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Building,
  GraduationCap
} from 'lucide-react';

export const PolicyCharterView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
          Institutional Governance & Statutory Compliance
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          DMI Student & Faculty Grievance Redressal Charter
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Approved by the Governing Council, DMI College of Engineering, Palanchur, Chennai in compliance with All India Council for Technical Education (AICTE) Regulations 2019 and Anna University Affiliation Bylaws.
        </p>
      </div>

      {/* Section 1: Core Tenets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Natural Justice</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every complainant has the inviolable right to be heard without bias, intimidation, or procedural delay. Both parties are granted equal opportunity to present verifiable evidence.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Anti-Retaliation Protection</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Strict disciplinary action is initiated against any academic or administrative staff attempting reprisal against students who raise legitimate concerns or complaints in good faith.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Mandatory SLA Response</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All submitted tickets are bound to automated service level countdowns. Unresolved matters automatically escalate to the Principal & Central Grievance Redressal Committee.
          </p>
        </div>
      </div>

      {/* Section 2: Escalation Hierarchy */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Three-Tier Escalation Matrix
        </h2>

        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Tier 1 · Operational Level
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                Departmental Coordinator / Wing Officer
              </h4>
              <p className="text-slate-600 mt-1">
                Handles routine issues (hostel maintenance, lab facilities, bus logistics, Wi-Fi connectivity).
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full">
                SLA: 24 to 48 Hours
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Tier 2 · Administrative Level
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                Central Grievance Redressal Committee (CGRC)
              </h4>
              <p className="text-slate-600 mt-1">
                Chaired by Dean of Academics and Senior Professors for escalated, disputed, or reopened grievances.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full">
                SLA: 72 Hours
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
                Tier 3 · Apex Authority
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                Principal & Institutional Ombudsman
              </h4>
              <p className="text-slate-600 mt-1">
                Appellate authority for policy review, statutory compliance disputes, and severe disciplinary infractions.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-rose-900 bg-rose-100 px-3 py-1 rounded-full">
                Apex Resolution
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Statutory Anti-Ragging & PoSH Notifications */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 space-y-4 text-xs text-rose-950">
        <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-700" />
          <span>Statutory Warning on Ragging & Harassment</span>
        </div>
        <p className="leading-relaxed">
          Ragging is strictly prohibited on DMI College of Engineering campus, hostel premises, and college transport fleets under the Tamil Nadu Prohibition of Ragging Act, 1997. Any proven incident warrants immediate suspension, FIR registration with Chennai Police, and recommendation for rustication.
        </p>
        <div className="pt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-rose-900">
          <span>National Anti-Ragging Toll Free: 1800-180-5522</span>
          <span>·</span>
          <span>DMI Anti-Ragging Squad Mobile: +91 94440 12345</span>
        </div>
      </div>
    </div>
  );
};
