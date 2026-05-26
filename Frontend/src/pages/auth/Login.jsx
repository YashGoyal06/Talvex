import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { api } from '../../api/api';

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'recruiter';
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [testCredentials, setTestCredentials] = useState([]);

  useEffect(() => {
    setMounted(true);
    async function loadTestCredentials() {
      try {
        const data = await api.auth.getTestCredentials();
        setTestCredentials(data);
      } catch (err) {
        console.error("Failed to load test credentials:", err);
      }
    }
    loadTestCredentials();
  }, []);

  // Sync email/password when toggling role tabs
  useEffect(() => {
    setError('');
    if (testCredentials.length > 0) {
      const match = testCredentials.find(tc => tc.role === role);
      if (match) {
        setEmail(match.email);
        setPassword(match.password);
        return;
      }
    }
    // No fallback defaults to ensure clean testing on real data
    setEmail('');
    setPassword('');
  }, [role, testCredentials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (role === 'admin' || cleanEmail === 'admin@talvex.com') {
        await api.auth.adminLogin(cleanEmail, cleanPassword);
        setLoading(false);
        navigate('/admin');
      } else if (role === 'recruiter') {
        const res = await api.auth.recruiterLogin(cleanEmail, cleanPassword);
        setLoading(false);
        if (res.setup_required) {
          navigate(`/recruiter/profile-setup?email=${encodeURIComponent(cleanEmail)}&token=${encodeURIComponent(cleanPassword)}`);
        } else {
          localStorage.setItem('accessToken', res.tokens.access);
          localStorage.setItem('refreshToken', res.tokens.refresh);
          localStorage.setItem('userRole', 'recruiter');
          localStorage.setItem('userEmail', res.user.email);
          localStorage.setItem('userName', res.user.full_name);
          navigate('/recruiter');
        }
      } else {
        const res = await api.auth.candidateLogin(cleanEmail, cleanPassword);
        setLoading(false);
        localStorage.setItem('accessToken', res.access);
        localStorage.setItem('refreshToken', res.refresh);
        localStorage.setItem('userRole', 'candidate');
        localStorage.setItem('userEmail', res.user.email);
        localStorage.setItem('userName', res.user.full_name);
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setLoading(false);
      let errMsg = 'Authentication failed. Please verify credentials.';
      if (err.data) {
        if (typeof err.data === 'string') {
          errMsg = err.data;
        } else if (err.data.detail) {
          errMsg = err.data.detail;
        } else if (err.data.error) {
          errMsg = err.data.error;
        } else if (err.data.non_field_errors) {
          errMsg = Array.isArray(err.data.non_field_errors) ? err.data.non_field_errors[0] : err.data.non_field_errors;
        } else {
          const firstKey = Object.keys(err.data)[0];
          if (firstKey) {
            const fieldError = err.data[firstKey];
            errMsg = Array.isArray(fieldError) ? fieldError[0] : fieldError;
          }
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    }
  };

  if (!mounted) return null;

  const roleConfig = {
    admin: {
      passwordLabel: 'Admin Password',
      passwordPlaceholder: '••••••••',
      submitLabel: 'Sign In to Console',
    },
    recruiter: {
      passwordLabel: 'Secure Token Password',
      passwordPlaceholder: '••••••••',
      submitLabel: 'Sign In to Portal',
    },
    candidate: {
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••',
      submitLabel: 'Sign In to Hub',
    },
  };

  const cfg = roleConfig[role];

  return (
    <div className="min-h-screen w-full bg-neutral-50/50 flex items-center justify-center p-4 md:p-8 antialiased selection:bg-orange-100">

      {/* Top Floating Back Link */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 transition-colors bg-white px-4 py-2">
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white border border-neutral-200/70 shadow-xl shadow-neutral-100 flex flex-col md:flex-row min-h-[700px] mt-12 md:mt-0">

        {/* LEFT SIDE - Stats collage */}
        <div className="hidden md:block w-7/12 bg-neutral-50 border-r border-neutral-100 p-8">
          <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full">

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
                alt="Workspace"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-neutral-950/40 to-transparent" />
            </div>

            <div className="rounded-2xl bg-orange-600 p-8 text-white flex flex-col justify-center shadow-sm relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-white/5 font-black text-9xl pointer-events-none select-none">41%</div>
              <Sparkles className="text-orange-200 mb-4 animate-pulse" size={24} />
              <h2 className="text-5xl font-black tracking-tight mb-2">41%</h2>
              <p className="text-sm text-orange-50 font-medium leading-relaxed">
                of technical recruiters confirm entry-level developer positions take the longest loop duration to fill cleanly.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"
                alt="Code review"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-neutral-950/30 to-transparent" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81"
                alt="Live assessment"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

            <div className="rounded-2xl bg-neutral-950 p-8 text-white flex flex-col justify-center shadow-sm relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-white/5 font-black text-9xl pointer-events-none select-none">76%</div>
              <div className="w-2 h-2 rounded-full bg-orange-500 mb-4 animate-ping" />
              <h2 className="text-5xl font-black tracking-tight mb-2">76%</h2>
              <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                state sourcing qualified applicant pipelines remains the primary friction in high-velocity tech execution.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085"
                alt="Workspace setup"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="w-full md:w-5/12 p-8 lg:p-12 flex flex-col justify-between bg-white">

          <div className="flex justify-end text-sm">
            <span className="text-neutral-500 font-medium">
              Don't have an account?
              <Link to="/signup" className="ml-1.5 font-bold text-orange-600 hover:text-orange-700 hover:underline transition-all">
                Sign up
              </Link>
            </span>
          </div>

          <div className="my-auto max-w-sm w-full mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950 mb-2">
                Welcome back to <span className="text-orange-600">Talvax</span>
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                Access your secure portal to track hiring channels and manage your workspace.
              </p>
            </div>

            {/* 3-Tab Role Toggle */}
            <div className="grid grid-cols-3 p-1.5 bg-neutral-100 rounded-xl border border-neutral-200/40 gap-1">
              {[
                { key: 'recruiter', label: 'Recruiter' },
                { key: 'candidate', label: 'Candidate' },
                { key: 'admin', label: 'Admin' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={`py-2.5 text-xs font-bold rounded-lg tracking-wide transition-all ${
                    role === key
                      ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/30'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    {cfg.passwordLabel}
                  </label>
                  <a href="#" className="text-xs font-semibold text-neutral-400 hover:text-neutral-950 transition-colors">
                    Forgot Key?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 pr-11 text-sm text-neutral-950 font-mono placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                    placeholder={cfg.passwordPlaceholder}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-950 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-neutral-950/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {cfg.submitLabel} <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

          </div>

          <div className="text-center text-[11px] font-medium text-neutral-400 pt-6">
            By accessing Talvax system environments, you affirm adherence to our{' '}
            <a href="#" className="text-neutral-600 hover:underline">Terms of Service</a>.
          </div>
        </div>

      </div>
    </div>
  );
}