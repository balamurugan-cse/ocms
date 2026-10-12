import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Department } from '../types';
import {
  Building2,
  Clock,
  Mail,
  User,
  ShieldCheck,
  Search
} from 'lucide-react';

export const DepartmentsView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getDepartments().then((data) => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.categories.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
            Institutional Directory
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Departments & Grievance Jurisdiction
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            DMI College of Engineering maintains dedicated redressal wings. Each operational unit is bound by transparent Service Level Agreement (SLA) turnaround times.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search department or category..."
            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading department directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-blue-900/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900">
                    {dept.code}
                  </span>
                  <span className="text-xs font-mono font-bold flex items-center gap-1 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-blue-900" />
                    {dept.slaHoursDefault}h SLA
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{dept.description}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Designated Coordinator
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">{dept.headName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{dept.headEmail}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                    Recognized Categories
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {dept.categories.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
