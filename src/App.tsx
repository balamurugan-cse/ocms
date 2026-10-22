import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PublicLanding } from './components/PublicLanding';
import { ComplainantDashboard } from './components/ComplainantDashboard';
import { OfficerDashboard } from './components/OfficerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ComplaintDetailModal } from './components/ComplaintDetailModal';
import { AuthModal } from './components/AuthModal';
import { PublicTrackModal } from './components/PublicTrackModal';
import { EmailOutboxModal } from './components/EmailOutboxModal';
import { DepartmentsView } from './components/DepartmentsView';
import { PolicyCharterView } from './components/PolicyCharterView';
import { Complaint } from './types';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackTicketNumber, setTrackTicketNumber] = useState<string>('');
  const [showOutboxModal, setShowOutboxModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check URL parameters for direct ticket tracking or email verification link clicks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const ticket = params.get('ticket');

    if (token) {
      setAuthModalMode('login');
    } else if (ticket) {
      setTrackTicketNumber(ticket);
      setShowTrackModal(true);
    }
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
  };

  const handleOpenTrack = (ticketNumber?: string) => {
    setTrackTicketNumber(ticketNumber || '');
    setShowTrackModal(true);
  };

  const handleSelectComplaint = (c: Complaint) => {
    setSelectedComplaintId(c.id);
  };

  const handleRefreshAll = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTrackModal={() => handleOpenTrack()}
        onOpenAuthModal={handleOpenAuth}
        onOpenOutboxModal={() => setShowOutboxModal(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* VIEW: HOME / OVERVIEW & TRACKING */}
        {activeTab === 'home' && (
          <PublicLanding
            onOpenTrackModal={handleOpenTrack}
            onOpenAuthModal={handleOpenAuth}
            onNavigateToTab={setActiveTab}
              />
        )}

        {/* VIEW: WORKSPACE GRIEVANCE DASHBOARDS */}
        {activeTab === 'dashboard' && (
          <>
            {!user ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
                <img
                  src="/assets/dmi-emblem.svg"
                  alt="DMI Seal"
                  className="w-16 h-16 mx-auto object-contain"
                />
                <h3 className="font-bold text-lg text-slate-900">Sign in to DMI OCMS</h3>
                <p className="text-xs text-slate-500">
                  Please sign in or use one of the quick test credentials in the sign in dialog to access your grievance portal.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Sign In with Credentials
                  </button>
                  <button
                    onClick={() => handleOpenAuth('register')}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Register New Grievance Account
                  </button>
                </div>
              </div>
            ) : ['admin', 'super_admin'].includes(user.role) ? (
              <AdminDashboard
                onSelectComplaint={handleSelectComplaint}
                onRefreshTrigger={refreshTrigger}
              />
            ) : user.role === 'officer' ? (
              <OfficerDashboard
                onSelectComplaint={handleSelectComplaint}
                onRefreshTrigger={refreshTrigger}
              />
            ) : (
              <ComplainantDashboard
                onSelectComplaint={handleSelectComplaint}
                onRefreshTrigger={refreshTrigger}
              />
            )}
          </>
        )}

        {/* VIEW: DEPARTMENTS & SLA */}
        {activeTab === 'departments' && <DepartmentsView />}

        {/* VIEW: REDRESSAL POLICY CHARTER */}
        {activeTab === 'policy' && <PolicyCharterView />}
      </main>

      {/* COMPLAINT DETAIL MODAL */}
      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onRefresh={handleRefreshAll}
        />
      )}

      {/* AUTHENTICATION MODAL */}
      {authModalMode && (
        <AuthModal
          isOpen={Boolean(authModalMode)}
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onOpenOutbox={() => {
            setAuthModalMode(null);
            setShowOutboxModal(true);
          }}
        />
      )}

      {/* PUBLIC TICKET TRACKING MODAL */}
      {showTrackModal && (
        <PublicTrackModal
          initialTicket={trackTicketNumber}
          onClose={() => setShowTrackModal(false)}
        />
      )}

      {/* EMAIL OUTBOX JOURNAL MODAL */}
      {showOutboxModal && (
        <EmailOutboxModal
          onClose={() => setShowOutboxModal(false)}
        />
      )}




    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
