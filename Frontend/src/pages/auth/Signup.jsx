import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, UserPlus, ShieldCheck } from 'lucide-react';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'recruiter';
  const initialEmail = searchParams.get('email');
  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('Alex Demo');
  const [email, setEmail] = useState(initialEmail || 'newuser@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Admin signup is restricted — redirect to login
    if (role === 'admin') {
      navigate('/login?role=admin');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userRole', role);
      navigate('/login?role=' + role);
    }, 800);
  };
  
  if (!mounted) return null;

  const isAdmin = role === 'admin';

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

            <div className="rounded-2xl bg-neutral-950 p-8 text-white flex flex-col justify-center shadow-sm relative overflow-hidden">
              <ShieldCheck className="text-orange-500 mb-4" size={26} />
              <h3 className="text-lg font-extrabold tracking-tight mb-1 text-white">Cryptographic Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                Every corporate environment node created is natively isolated via standard high-density stateless structural tokens.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"
                alt="Developer pipeline"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

            <div className="rounded-2xl bg-orange-600 p-8 text-white flex flex-col justify-center shadow-sm relative overflow-hidden col-span-2">
              <div className="absolute right-4 bottom-0 text-white/5 font-black text-9xl pointer-events-none select-none">MERN</div>
              <h2 className="text-3xl font-black tracking-tight mb-2 max-w-md leading-tight">
                Accelerate technical vetting timelines by up to 64%.
              </h2>
              <p className="text-sm text-orange-100 font-medium max-w-lg leading-relaxed">
                Talvax unified dual-portal systems seamlessly marry modern automated screening nodes with interactive real-time development Sandboxes.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81"
                alt="Workspace"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/50 relative group bg-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085"
                alt="Coding workstation"
                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="w-full md:w-5/12 p-8 lg:p-12 flex flex-col justify-between bg-white">

          <div className="flex justify-end text-sm">
            <span className="text-neutral-500 font-medium">
              Already have an account?
              <Link to="/login" className="ml-1.5 font-bold text-orange-600 hover:text-orange-700 hover:underline transition-all">
                Sign in
              </Link>
            </span>
          </div>

          <div className="my-auto max-w-sm w-full mx-auto space-y-7">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950 mb-2">
                Create Account
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                Initialize your workspace node parameters below to unlock secure platform features.
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

            {/* Admin restricted notice */}
            {isAdmin ? (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-neutral-500" />
                </div>
                <div>
                  <h3 className="font-black text-neutral-950 text-base mb-1">Admin Access is Restricted</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                    Admin accounts are provisioned by the system and cannot be self-registered. If you are an enterprise admin, please sign in with your credentials.
                  </p>
                </div>
                <Link
                  to="/login?role=admin"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-neutral-950/10"
                >
                  <ShieldCheck size={16} /> Go to Admin Sign In
                </Link>
              </div>
            ) : (
              /* Standard signup form for recruiter / candidate */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Full Identification Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                    placeholder="Alex Demo"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Work Environment Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                    placeholder="newuser@demo.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Account Access Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 pr-11 text-sm text-neutral-950 font-mono placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-950 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-neutral-950/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Initialize {role === 'recruiter' ? 'Recruiter' : 'Candidate'} Environment <UserPlus size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="text-center text-[11px] font-medium text-neutral-400 pt-6">
            By provisioning an account environment workspace, you confirm binding consent to our{' '}
            <a href="#" className="text-neutral-600 hover:underline">Privacy Policy</a> and legal regulations.
          </div>
        </div>

      </div>
    </div>
  );
}