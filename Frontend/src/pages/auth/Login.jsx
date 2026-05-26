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

    // Parse Supabase OAuth callback tokens from the URL hash fragment
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      // Replace hash sign with search syntax to parse via URLSearchParams
      const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
      const params = new URLSearchParams(cleanHash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        try {
          // Decode JWT payload locally to obtain candidate email and name
          const payloadBase64 = accessToken.split('.')[1];
          const payload = JSON.parse(atob(payloadBase64));
          const email = payload.email;
          const userMetadata = payload.user_metadata || {};
          const fullName = userMetadata.full_name || email.split('@')[0];

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken || '');
          localStorage.setItem('userRole', 'candidate');
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userName', fullName);

          // Clear hash from URL cleanly without refreshing page
          window.history.replaceState(null, '', window.location.pathname + window.location.search);

          navigate('/candidate/dashboard');
          return;
        } catch (e) {
          console.error("Failed to parse OAuth token parameters:", e);
          setError("Failed to extract Google session details.");
        }
      }
    }

    async function loadTestCredentials() {
      try {
        const data = await api.auth.getTestCredentials();
        setTestCredentials(data);
      } catch (err) {
        console.error("Failed to load test credentials:", err);
      }
    }
    loadTestCredentials();
  }, [navigate]);

  // Sync email/password when toggling role tabs
  useEffect(() => {
    console.log("Selected role in Talvax Login:", role);
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

  const handleGoogleSignIn = () => {
    setError('');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kntarabupposhjhlqwob.supabase.co';
    const redirectTo = `${window.location.origin}/login?role=candidate`;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
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
                  required={role !== 'candidate'}
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
                    required={role !== 'candidate'}
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

              {role === 'candidate' && (
                <div key="google-signin-container">
                  <div className="flex items-center my-4">
                    <div className="flex-grow border-t border-neutral-200" />
                    <span className="mx-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-neutral-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-sm transition-all shadow-2xs cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              )}
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