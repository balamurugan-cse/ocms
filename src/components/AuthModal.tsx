import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  X,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Send,
  Building
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onOpenOutbox: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onOpenOutbox
}) => {
  const { login, register, verifyEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'resend'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up state
  const [name, setName] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'faculty'>('student');
  const [departmentName, setDepartmentName] = useState('Computer Science and Engineering');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Verification state
  const [verificationToken, setVerificationToken] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      if (err.data?.unverified) {
        setEmail(err.data.email || email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        password,
        role: regRole,
        departmentName,
        rollNumber,
        phone
      });
      setSuccessMsg(res.message);
      if (res.verificationLink) {
        setGeneratedLink(res.verificationLink);
        // Extract token parameter
        const url = new URL(res.verificationLink, window.location.origin);
        const token = url.searchParams.get('token');
        if (token) setVerificationToken(token);
      }
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim()) {
      setError('Please provide the verification token.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(verificationToken.trim());
      setSuccessMsg('Email verified successfully! You are now logged in.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Email verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.resendVerification(email);
      setSuccessMsg(res.message);
      if (res.verificationLink) {
        setGeneratedLink(res.verificationLink);
        const url = new URL(res.verificationLink, window.location.origin);
        const token = url.searchParams.get('token');
        if (token) setVerificationToken(token);
      }
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Resend request failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick autofill buttons for evaluation
  const setQuickCreds = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/dmi-emblem.svg"
              alt="DMI College of Engineering Emblem"
              className="w-10 h-10 object-contain drop-shadow shrink-0"
            />
            <div>
              <h3 className="font-bold text-base leading-snug">
                {mode === 'login' && 'Sign in to DMI Portal'}
                {mode === 'register' && 'Register Grievance Account'}
                {mode === 'verify' && 'Verify Email Address'}
                {mode === 'resend' && 'Resend Verification Token'}
              </h3>
              <p className="text-xs text-slate-400">DMI College of Engineering, Palanchur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p>{error}</p>
                {error.includes('Email verification required') && (
                  <button
                    onClick={() => {
                      setError(null);
                      setMode('resend');
                    }}
                    className="mt-1 font-semibold text-rose-900 underline block"
                  >
                    Resend Verification Email
                  </button>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@dmice.ac.in"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              {/* Quick test credentials buttons */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  1-Click Test Credentials:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickCreds('student@dmice.ac.in', 'DmiStudent@2026')}
                    className="p-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700"
                  >
                    <div className="font-semibold text-[11px]">Student</div>
                    <div className="text-[10px] text-slate-500 truncate">student@dmice.ac.in</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreds('admin@dmice.ac.in', 'DmiAdmin@2026')}
                    className="p-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700"
                  >
                    <div className="font-semibold text-[11px]">HOD CSE / Admin</div>
                    <div className="text-[10px] text-slate-500 truncate">admin@dmice.ac.in</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreds('officer.it@dmice.ac.in', 'DmiOfficer@2026')}
                    className="p-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700"
                  >
                    <div className="font-semibold text-[11px]">IT Officer</div>
                    <div className="text-[10px] text-slate-500 truncate">officer.it@dmice.ac.in</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreds('superadmin@dmice.ac.in', 'DmiAdmin@2026')}
                    className="p-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700"
                  >
                    <div className="font-semibold text-[11px]">Super Admin</div>
                    <div className="text-[10px] text-slate-500 truncate">superadmin@dmice...</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('resend');
                  }}
                  className="hover:underline text-blue-800"
                >
                  Verify Pending Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="hover:underline font-semibold text-blue-900"
                >
                  Don't have an account? Register
                </button>
              </div>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. S. Arun Kumar"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@dmice.ac.in or your personal email"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Affiliation Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty / Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll No / Staff ID
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="3106..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                  <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Artificial Intelligence and Data Science">AI and Data Science</option>
                  <option value="Science and Humanities">Science and Humanities</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                As per institutional safety guidelines, a single-use verification token will be dispatched to your email before account activation.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register & Dispatch Verification Email'}
              </button>

              <div className="text-center text-xs text-slate-500 pt-2">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-blue-900 hover:underline"
                >
                  Sign In instead
                </button>
              </div>
            </form>
          )}

          {/* MODE: VERIFY EMAIL */}
          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                <p className="font-semibold mb-1">Verification Token Dispatched</p>
                <p>
                  A real single-use cryptographic token has been generated for <strong>{email}</strong>.
                </p>
                {generatedLink && (
                  <div className="mt-2 pt-2 border-t border-blue-200/80">
                    <span className="text-[11px] text-slate-600 block mb-1">Direct Verification Link:</span>
                    <a
                      href={generatedLink}
                      onClick={(e) => {
                        e.preventDefault();
                        handleVerify(e as any);
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                    >
                      <span>Click to Auto-Consume Token & Activate Account</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Token (SHA-256 Hashed on Server)
                </label>
                <input
                  type="text"
                  required
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  placeholder="Paste 64-char token or click link above"
                  className="w-full font-mono text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Validating Token...' : 'Complete Email Verification'}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={onOpenOutbox}
                  className="text-amber-800 font-semibold hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Check Email Outbox Journal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESEND */}
          {mode === 'resend' && (
            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address for Verification
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. your_email@dmice.ac.in"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Regenerating...' : 'Generate New Verification Link'}</span>
              </button>

              <div className="text-center text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
