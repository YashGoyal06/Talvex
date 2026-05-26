import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { api } from '../../api/api';

export default function FirstLoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    department: 'Engineering',
    phone: '',
    specializations: '',
    experience: '1-3 years',
    bio: '',
    timezone: 'UTC',
    passingAtsScore: 70,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect page: if email or token are missing, redirect to login
  useEffect(() => {
    if (!email || !token) {
      navigate('/login?role=recruiter');
    }
  }, [email, token, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        full_name: formData.fullName.trim(),
        job_title: formData.jobTitle.trim(),
        department: formData.department,
        phone_number: formData.phone.trim(),
        specialization_areas: formData.specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        years_of_experience: formData.experience,
        bio: formData.bio.trim(),
        preferred_timezone: formData.timezone,
        passing_ats_score: parseInt(formData.passingAtsScore)
      };

      const res = await api.auth.recruiterProfileSetup(payload);
      setLoading(false);

      // Save tokens & profile details
      localStorage.setItem('accessToken', res.tokens.access);
      localStorage.setItem('refreshToken', res.tokens.refresh);
      localStorage.setItem('userEmail', res.user.email);
      localStorage.setItem('userName', res.user.full_name);
      localStorage.setItem('userRole', 'recruiter');
      localStorage.setItem('userPhoto', res.user.photo_url || '');
      localStorage.setItem('passingAtsScore', res.user.passing_ats_score || 70);

      navigate('/recruiter');
    } catch (err) {
      setLoading(false);
      let errMsg = 'Profile setup failed. Please check inputs and try again.';
      if (err.data) {
        if (typeof err.data === 'string') {
          errMsg = err.data;
        } else if (err.data.detail) {
          errMsg = err.data.detail;
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

  return (
    <div className="min-h-screen w-full bg-neutral-50/50 flex items-center justify-center p-4 md:p-8 antialiased selection:bg-orange-100">
      
      {/* Back button */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link to="/login?role=recruiter" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 transition-colors bg-white px-4 py-2 border border-neutral-200/50 rounded-lg">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </div>

      {/* Main card */}
      <div className="w-full max-w-2xl bg-white border border-neutral-200/70 rounded-3xl shadow-xl shadow-neutral-100 p-8 lg:p-12 mt-12 md:mt-0">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-neutral-950 mb-2">
            Complete Your <span className="text-orange-600">Profile</span>
          </h1>
          <p className="text-sm text-neutral-400 font-medium leading-relaxed">
            Configure your recruiter account profile and defaults to gain full access to the workspace.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                placeholder="Sarah Jenkins"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Job Title
              </label>
              <input
                type="text"
                name="jobTitle"
                required
                value={formData.jobTitle}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                placeholder="Lead Recruiter"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Phone Number
              </label>
              <div className="flex rounded-xl border border-neutral-200 overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent transition-all">
                <span className="inline-flex items-center px-4 text-sm text-neutral-500 bg-neutral-50 border-r border-neutral-200 font-bold select-none">
                  +1
                </span>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-none"
                  placeholder="(555) 019-2834"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
              Specialization Areas (comma-separated list)
            </label>
            <input
              type="text"
              name="specializations"
              value={formData.specializations}
              onChange={handleChange}
              className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
              placeholder="Engineering, Design, Product Management"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Years of Experience
              </label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
              >
                <option value="0-1 years">0-1 years</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5+ years">5+ years</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Preferred Time Zone
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
              >
                <option value="UTC">Coordinated Universal Time (UTC)</option>
                <option value="PST">Pacific Time (PT)</option>
                <option value="EST">Eastern Time (ET)</option>
                <option value="CET">Central European Time (CET)</option>
                <option value="IST">India Standard Time (IST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Passing ATS Score Threshold (1-100)
              </label>
              <input
                type="number"
                name="passingAtsScore"
                min="1"
                max="100"
                required
                value={formData.passingAtsScore}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                placeholder="70"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Choose Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                Bio / Recruiting Philosophy
              </label>
              <span className="text-[10px] text-neutral-400 font-bold">{formData.bio.length}/500 chars</span>
            </div>
            <textarea
              name="bio"
              rows="4"
              maxLength="500"
              value={formData.bio}
              onChange={handleChange}
              className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs resize-none"
              placeholder="Briefly describe your recruiting specializations or agency philosophy..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-neutral-950/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Save Profile & Start Recruiting <UserCheck size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
