import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userRole', 'candidate');
      navigate('/login?role=candidate');
    }, 800);
  };
  
  if (!mounted) return null;

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
              <UserPlus className="text-orange-500 mb-4" size={26} />
              <h3 className="text-lg font-extrabold tracking-tight mb-1 text-white">Candidate Portal</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                Track your applications, take assessments, and attend interviews — all from one unified dashboard.
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

        {/* RIGHT SIDE - Candidate Signup Form */}
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
                Candidate Sign Up
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                Create your candidate account to start applying for jobs, take assessments, and attend live interviews.
              </p>
            </div>

            {/* Candidate signup form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                  placeholder="John Doe"
                  required
                />
              </div>

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
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Password
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
                    Create Candidate Account <UserPlus size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Info note */}
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4 text-center">
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                <span className="font-bold text-neutral-700">Recruiter or Admin?</span>{' '}
                Recruiters are invited by admins via secure tokens.{' '}
                <Link to="/login" className="text-orange-600 font-bold hover:underline">Sign in here</Link>.
              </p>
            </div>
          </div>

          <div className="text-center text-[11px] font-medium text-neutral-400 pt-6">
            By creating an account, you confirm consent to our{' '}
            <a href="#" className="text-neutral-600 hover:underline">Privacy Policy</a> and legal regulations.
          </div>
        </div>

      </div>
    </div>
  );
}