import React, { useState } from 'react';
import { User as UserIcon, Bell, Shield, Blocks, LogOut, Upload, Check, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api/api';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isCandidate = location.pathname.includes('/candidate');
  
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

  const avatarUrl = localStorage.getItem('userPhoto') || (isCandidate ? 'https://i.pravatar.cc/150?u=alex' : 'https://i.pravatar.cc/150?u=sarah');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    localStorage.setItem('userName', `${firstName} ${lastName}`.trim());
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userTitle', title);
    
    const role = localStorage.getItem('userRole');
    try {
      if (role === 'recruiter') {
        localStorage.setItem('passingAtsScore', passingAtsScore);
        await api.auth.updateProfile({
          full_name: `${firstName} ${lastName}`.trim(),
          job_title: title,
          passing_ats_score: parseInt(passingAtsScore)
        });
      } else if (role === 'admin') {
        await api.auth.updateProfile({
          full_name: `${firstName} ${lastName}`.trim()
        });
      } else if (role === 'candidate') {
        await api.candidates.updateProfile(email, {
          first_name: firstName,
          last_name: lastName
        });
      }
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings.');
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
          const role = localStorage.getItem('userRole');
          if (role === 'recruiter' || role === 'admin') {
            await api.auth.updateProfile({ photo_url: res.url });
          } else if (role === 'candidate') {
            const email = localStorage.getItem('userEmail');
            await api.candidates.updateProfile(email, { photo_url: res.url });
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
    <div className="space-y-8 select-none relative">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-neutral-800">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header section matching mockup standards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Settings</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Manage your account preferences, configure notification rules, and connect integrations.
          </p>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="px-4 py-2.5 border border-red-200 hover:border-red-600 bg-white text-red-500 hover:bg-red-50 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 self-start md:self-auto cursor-pointer"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar tabs rounded pills styled precisely to match visual standard */}
        <div className="w-full md:w-64 shrink-0 space-y-1.5">
          {[
            { id: 'profile', icon: <UserIcon size={16} />, label: 'My Profile' },
            { id: 'notifications', icon: <Bell size={16} />, label: 'Notifications' },
            { id: 'security', icon: <Shield size={16} />, label: 'Security' },
            { id: 'integrations', icon: <Blocks size={16} />, label: 'Integrations' },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-2 border-orange-500 text-orange-500 bg-transparent shadow-md'
                    : 'text-neutral-500 hover:text-neutral-950 hover:bg-white/50 border border-transparent'
                }`}
              >
                <span className={isSelected ? 'text-orange-500' : 'text-neutral-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area styled as premium frosted card */}
        <div className="flex-1 bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-[2.2rem] shadow-sm min-h-[500px]">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-extrabold text-neutral-950">Public Profile</h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">This information will be displayed to candidates and your team.</p>
                
                {/* Avatar change */}
                <div className="flex items-center gap-6 mt-6 mb-6">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-[1.5rem] bg-neutral-250 border border-neutral-300 flex items-center justify-center text-neutral-500">
                      <UserIcon size={24} />
                    </div>
                  )}
                  <div>
                    <button 
                      type="button" 
                      onClick={handleAvatarChange}
                      className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-950 bg-white text-neutral-600 hover:text-neutral-950 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Upload size={12} className="text-orange-500" /> Change Avatar
                    </button>
                    <p className="text-[9px] text-neutral-400 font-semibold mt-1">JPG, GIF or PNG. 1MB max.</p>
                  </div>
                </div>

                {/* Input grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">First Name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={e => setFirstName(e.target.value)} 
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold shadow-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={e => setLastName(e.target.value)} 
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold shadow-sm" 
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold shadow-sm" 
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Role / Position Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold shadow-sm" 
                  />
                </div>

                {!isCandidate && localStorage.getItem('userRole') === 'recruiter' && (
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Passing ATS Score</label>
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      value={passingAtsScore} 
                      onChange={e => setPassingAtsScore(e.target.value)} 
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold shadow-sm" 
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3 mt-6">
                <button type="button" className="px-4 py-2 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors bg-white">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md">Save Profile Settings</button>
              </div>
            </form>
          )}

          {/* Notifications preferences */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-extrabold text-neutral-950">Notification Rules</h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Configure when and how you receive workspace alerts.</p>
                
                <div className="space-y-5 mt-6">
                  {[
                    { title: 'New Applications', desc: 'Notify when a candidate applies to active requisitions.', default: true },
                    { title: 'Interview Reminders', desc: 'Alert 15 minutes before scheduled assessments start.', default: true },
                    { title: 'Scorecard Evaluations', desc: 'Reminder to submit feedback after live coding rounds.', default: true },
                    { title: 'Offer Letter Updates', desc: 'Notify when a candidate signs or declines an offer.', default: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start justify-between bg-white border border-neutral-100/50 p-4 rounded-2xl shadow-sm">
                      <div>
                        <div className="text-xs font-bold text-neutral-800">{item.title}</div>
                        <div className="text-[10px] text-neutral-400 mt-1 font-semibold">{item.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.default} />
                        <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3 mt-6">
                <button type="button" className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md" onClick={handleSave}>
                  Save Alert Settings
                </button>
              </div>
            </div>
          )}

          {/* Security password settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-extrabold text-neutral-950">Password & Security</h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Configure credentials and factor authentication options.</p>
                
                <div className="space-y-4 max-w-md mt-6">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold placeholder-neutral-300 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">New Password</label>
                    <input type="password" placeholder="New password" className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold placeholder-neutral-300 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input type="password" placeholder="Confirm password" className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-950 focus:bg-white text-xs font-semibold placeholder-neutral-300 shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 flex justify-between items-center mt-6">
                <button type="button" className="text-xs text-orange-600 hover:text-orange-700 font-bold">Configure Two-Factor Auth (2FA)</button>
                <button type="button" className="px-5 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md" onClick={handleSave}>
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Connected apps integrations */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-extrabold text-neutral-950">Connected Integrations</h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Connect Talvex with your existing tech stack tools.</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  {[
                    { name: 'Google Calendar', desc: 'Sync interview schedules seamlessly.', connected: true, color: 'text-blue-600' },
                    { name: 'Slack Alerts', desc: 'Get pipeline updates in channels.', connected: false, color: 'text-purple-600' },
                    { name: 'Zoom Meetings', desc: 'Fallback live video assessments.', connected: true, color: 'text-sky-600' },
                    { name: 'LinkedIn Recruiter', desc: 'Import candidate resumes instantly.', connected: false, color: 'text-blue-800' },
                  ].map((app, i) => (
                    <div key={i} className="bg-white border border-neutral-100 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
                      <div>
                        <div className={`text-xs font-black ${app.color}`}>{app.name}</div>
                        <div className="text-[10px] text-neutral-400 mt-1 font-bold">{app.desc}</div>
                      </div>
                      <button className={`px-4 py-2 border rounded-full text-[10px] font-bold transition-all shadow-sm cursor-pointer ${
                        app.connected 
                          ? 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:text-neutral-950 hover:border-neutral-950' 
                          : 'bg-neutral-950 border-neutral-950 text-white hover:bg-neutral-900'
                      }`}>
                        {app.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
