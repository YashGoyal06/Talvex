import React, { useState } from 'react';
import { User as UserIcon, LogOut, Upload, Sparkles, Mail, Award, ShieldCheck, Camera } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api/api';

export default function SettingsView() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isCandidate = location.pathname.includes('/candidate');
  const userRole = localStorage.getItem('userRole') || (isCandidate ? 'candidate' : 'recruiter');
  const isDark = userRole === 'admin';
  
  const savedName = localStorage.getItem('userName') || (isCandidate ? 'Alex Demo' : 'Sarah Jenkins');
  const savedEmail = localStorage.getItem('userEmail') || (isCandidate ? 'newuser@demo.com' : 'sarah.jenkins@company.com');
  const savedTitle = localStorage.getItem('userTitle') || (isCandidate ? 'Software Engineer' : 'Senior Talent Acquisition');
  const savedAts = localStorage.getItem('passingAtsScore') ? parseInt(localStorage.getItem('passingAtsScore')) : 70;

  const defaultFirstName = savedName.split(' ')[0];
  const defaultLastName = savedName.split(' ').slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(savedEmail);
  const [title, setTitle] = useState(savedTitle);
  const [passingAtsScore, setPassingAtsScore] = useState(savedAts);

  const avatarUrl = localStorage.getItem('userPhoto') || '';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    localStorage.setItem('userName', `${firstName} ${lastName}`.trim());
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userTitle', title);
    
    try {
      if (userRole === 'recruiter') {
        localStorage.setItem('passingAtsScore', passingAtsScore);
        await api.auth.updateProfile({
          full_name: `${firstName} ${lastName}`.trim(),
          job_title: title,
          passing_ats_score: parseInt(passingAtsScore)
        });
      } else if (userRole === 'admin') {
        await api.auth.updateProfile({
          full_name: `${firstName} ${lastName}`.trim()
        });
      } else if (userRole === 'candidate') {
        await api.candidates.updateProfile(email, {
          first_name: firstName,
          last_name: lastName
        });
      }
      showToast('Profile saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile.');
    }
  };

  const handleAvatarChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await api.auth.uploadFile(file, 'avatars');
        if (res.url) {
          localStorage.setItem('userPhoto', res.url);
          if (userRole === 'recruiter' || userRole === 'admin') {
            await api.auth.updateProfile({ photo_url: res.url });
          } else if (userRole === 'candidate') {
            const candidateEmail = localStorage.getItem('userEmail');
            await api.candidates.updateProfile(candidateEmail, { photo_url: res.url });
          }
          showToast('Avatar updated successfully!');
          window.location.reload();
        }
      } catch (err) {
        console.error('Error uploading avatar:', err);
        showToast('Failed to upload avatar.');
      }
    };
    input.click();
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="space-y-8 select-none relative max-w-6xl mx-auto py-4">
      
      {/* Decorative ambient glowing orbs (Admin only) */}
      {isDark && (
        <>
          <div className="absolute -top-12 -left-12 w-80 h-80 bg-orange-500/[0.07] rounded-full blur-[100px] pointer-events-none z-0" />
          <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-orange-600/[0.05] rounded-full blur-[120px] pointer-events-none z-0" />
        </>
      )}

      {/* Toast alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl border border-orange-500/30 text-xs font-bold flex items-center gap-3 animate-fade-in transition-all ${
          isDark 
            ? 'bg-[#0c0d12]/95 text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)]' 
            : 'bg-white/95 text-neutral-900 shadow-[0_10px_40px_rgba(0,0,0,0.08)]'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* Header section — dynamic white/dark theme card */}
      <div className={`p-10 rounded-[2.2rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-r from-[#0c0d12]/95 to-[#08090c]/98 border border-white/[0.08]' 
          : 'bg-white/85 backdrop-blur-xl border border-white/50'
      }`}>
        <div className="flex gap-5">
          <div className="w-1.5 h-14 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full shrink-0 animate-pulse-slow" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className={`text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                My Profile
              </h2>
            </div>
            <p className={`text-sm mt-2 font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Manage your personal information, role details, and global preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Content Area — dynamic white/dark theme card */}
      <div className={`p-10 md:p-12 rounded-[2.2rem] shadow-xl z-10 relative overflow-hidden transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-[#0c0d12]/95 via-[#08090c]/98 to-[#040507]/95 border border-white/[0.08]' 
          : 'bg-white/85 backdrop-blur-xl border border-white/50'
      }`}>
        
        {isDark && <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none" />}
        
        <form onSubmit={handleSave} className="space-y-10 relative z-10">
          <div>
            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>Public Profile</h3>
            <p className={`text-xs font-bold uppercase tracking-wider mt-1.5 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              This information will be displayed to candidates and your team.
            </p>
            
            {/* Avatar change */}
            <div className="flex items-center gap-8 mt-10 mb-10">
              <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarChange}>
                <div className={`relative w-28 h-28 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 ${
                  isDark ? 'bg-neutral-900 border-2 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-2 border-neutral-200 text-neutral-500'
                }`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={40} />
                  )}
                  {/* Blur Hover Overlay */}
                  <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 gap-1.5">
                    <Camera size={20} className="text-orange-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Change</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-850'}`}>Profile Picture</h4>
                <p className="text-xs text-neutral-400 font-semibold mt-1.5">Recommended: Square PNG or JPG. Max 1MB.</p>
                <button 
                  type="button" 
                  onClick={handleAvatarChange}
                  className={`mt-4 px-5 py-2.5 border rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all duration-300 cursor-pointer ${
                    isDark 
                      ? 'border-white/10 hover:border-orange-500/40 bg-white/[0.02] hover:bg-orange-500/5 text-neutral-300 hover:text-orange-400' 
                      : 'border-neutral-200 hover:border-orange-500/40 bg-neutral-50 hover:bg-orange-50 text-neutral-600 hover:text-orange-600'
                  }`}
                >
                  <Upload size={14} className="text-orange-500" /> Change Photo
                </button>
              </div>
            </div>

            {/* Input grid */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* First Name */}
                <div className="relative">
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    First Name
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      <UserIcon size={16} />
                    </div>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={e => setFirstName(e.target.value)} 
                      className={`w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all duration-350 shadow-xs ${
                        isDark 
                          ? 'bg-white/[0.02] border border-white/10 text-white focus:bg-neutral-900/60' 
                          : 'bg-neutral-50/50 border border-neutral-200 text-neutral-900 focus:bg-white'
                      }`} 
                      placeholder="First Name"
                    />
                  </div>
                </div>
                
                {/* Last Name */}
                <div className="relative">
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Last Name
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      <UserIcon size={16} />
                    </div>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={e => setLastName(e.target.value)} 
                      className={`w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all duration-350 shadow-xs ${
                        isDark 
                          ? 'bg-white/[0.02] border border-white/10 text-white focus:bg-neutral-900/60' 
                          : 'bg-neutral-50/50 border border-neutral-200 text-neutral-900 focus:bg-white'
                      }`} 
                      placeholder="Last Name"
                    />
                  </div>
                </div>

              </div>
              
              {/* Email Address */}
              <div className="relative">
                <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className={`w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all duration-350 shadow-xs ${
                      isDark 
                        ? 'bg-white/[0.02] border border-white/10 text-white focus:bg-neutral-900/60' 
                        : 'bg-neutral-50/50 border border-neutral-200 text-neutral-900 focus:bg-white'
                    }`} 
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Role / Position Title */}
                <div className="relative">
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Role / Position Title
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      <Award size={16} />
                    </div>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className={`w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all duration-350 shadow-xs ${
                        isDark 
                          ? 'bg-white/[0.02] border border-white/10 text-white focus:bg-neutral-900/60' 
                          : 'bg-neutral-50/50 border border-neutral-200 text-neutral-900 focus:bg-white'
                      }`} 
                      placeholder="Role Title"
                    />
                  </div>
                </div>

                {/* Passing ATS Score (Recruiter Only) */}
                {!isCandidate && userRole === 'recruiter' && (
                  <div className="relative">
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Passing ATS Score (%)
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        <ShieldCheck size={16} />
                      </div>
                      <input 
                        type="number" 
                        min="1"
                        max="100"
                        value={passingAtsScore} 
                        onChange={e => setPassingAtsScore(e.target.value)} 
                        className={`w-full rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all duration-350 shadow-xs ${
                          isDark 
                            ? 'bg-white/[0.02] border border-white/10 text-white focus:bg-neutral-900/60' 
                            : 'bg-neutral-50/50 border border-neutral-200 text-neutral-900 focus:bg-white'
                        }`} 
                        placeholder="Passing Score"
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer buttons with premium transition effects */}
          <div className={`pt-8 border-t flex justify-end gap-4 mt-10 ${isDark ? 'border-white/10' : 'border-neutral-100'}`}>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className={`px-7 py-3 border rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                isDark 
                  ? 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white' 
                  : 'border-neutral-200 hover:border-neutral-300 bg-neutral-100 hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold hover:from-orange-600 hover:to-amber-600 shadow-[0_4px_25px_rgba(249,115,22,0.25)] hover:shadow-[0_4px_30px_rgba(249,115,22,0.45)] hover:-translate-y-0.5 active:translate-y-0 rounded-full text-xs transition-all duration-300 cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
