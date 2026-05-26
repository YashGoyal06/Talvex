import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { Key, Copy, CheckCircle, ShieldAlert, X, UserPlus, Trash2, ArrowUpRight, HelpCircle } from 'lucide-react';

export default function RecruiterProvisioning() {
  const [activeRecruiters, setActiveRecruiters] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const data = await api.team.listRecruiters();
      setActiveRecruiters(data.active_recruiters || []);
      setPendingInvites(data.pending_invites || []);
    } catch (err) {
      setError('Failed to fetch recruiters list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.team.inviteRecruiter(inviteEmail);
      setNewToken(res.raw_token);
      setInviteEmail('');
      setShowInviteModal(false);
      setCopied(false);
      fetchRecruiters(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to generate token.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id, isToken = false) => {
    if (!window.confirm('Are you sure you want to revoke this recruiter access?')) return;
    setLoading(true);
    try {
      await api.team.revokeRecruiter(id);
      fetchRecruiters(); // Refresh list
    } catch (err) {
      setError('Failed to revoke access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20 animate-fade-in text-neutral-200 select-none">
      
      {/* ─── HEADER CONTROL ROW ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-sm font-black text-[#FF6B00] uppercase tracking-widest">Management</h2>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1.5">Recruiter Access Management</h1>
          <p className="text-neutral-500 font-medium text-xs mt-1">Manage API tokens, review access levels, and audit security events.</p>
        </div>
        <button 
          onClick={() => { setShowInviteModal(true); setNewToken(null); }}
          className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-[10px] font-black uppercase tracking-wider px-6 py-3.5 rounded-full flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#FF6B00]/10 shrink-0 self-start sm:self-auto"
        >
          <Key size={14} /> Provision Recruiter Token
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ─── NEW PROVISIONED TOKEN CODE BLOCK ─── */}
      {newToken && (
        <div className="mb-8 p-6 bg-[#0C0D12]/90 border border-[#FF6B00]/30 rounded-[2.2rem] relative overflow-hidden shadow-lg shadow-neutral-950/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FF6B00]"></div>
          <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#FF6B00] animate-pulse" />
            New Recruiter Token Provisioned
          </h3>
          <p className="text-xs text-neutral-400 font-bold mb-4">
            Copy this 64-character token now. For security reasons, it will only be displayed once.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <code className="flex-1 bg-[#07080A] border border-neutral-800 rounded-2xl p-4 text-[#FF6B00] font-mono text-xs overflow-x-auto break-all font-bold">
              {newToken}
            </code>
            <button 
              onClick={copyToClipboard}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4 rounded-full font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/10' 
                  : 'bg-white text-neutral-900 hover:bg-neutral-100 shadow-neutral-950/15'
              }`}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Token'}
            </button>
          </div>
        </div>
      )}

      {/* ─── ACTIVE RECRUITERS LISTING ─── */}
      <div className="bg-[#0C0D12]/90 border border-neutral-800/80 rounded-[2.2rem] overflow-hidden shadow-lg shadow-neutral-950/40">
        <div className="p-6 border-b border-neutral-800 bg-[#0C0D12]">
          <h2 className="font-black text-white tracking-tight">Active Recruiter Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1016]/40 border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                <th className="p-4 font-bold">Recruiter</th>
                <th className="p-4 font-bold">Job Title / Department</th>
                <th className="p-4 font-bold">Last Login</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40 text-neutral-400">
              {activeRecruiters.map(rec => (
                <tr key={rec.id} className="hover:bg-neutral-800/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 text-[#FF6B00] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {rec.full_name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{rec.full_name}</div>
                        <div className="text-xs text-neutral-500 font-bold mt-0.5">{rec.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-neutral-300 font-semibold">
                      {rec.job_title || 'Lead Recruiter'} • {rec.department || 'Talent Acquisition'}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-bold text-neutral-500">
                    {rec.last_login ? new Date(rec.last_login).toLocaleString() : 'Never logged in'}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleRevoke(rec.id, false)}
                      className="text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-400 hover:bg-red-500/5 px-4 py-2 rounded-full transition-colors cursor-pointer"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
              {activeRecruiters.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-neutral-500 text-sm font-semibold">No active recruiter accounts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── PENDING TOKEN INVITATIONS ─── */}
      <div className="bg-[#0C0D12]/90 border border-neutral-800/80 rounded-[2.2rem] overflow-hidden shadow-lg shadow-neutral-950/40">
        <div className="p-6 border-b border-neutral-800 bg-[#0C0D12]">
          <h2 className="font-black text-white tracking-tight">Pending Token Invitations (Unused)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1016]/40 border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Generated At</th>
                <th className="p-4 font-bold">Expires At</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40 text-neutral-400">
              {pendingInvites.map(invite => (
                <tr key={invite.id} className="hover:bg-neutral-800/10 transition-colors">
                  <td className="p-4 text-sm font-black text-white">{invite.email}</td>
                  <td className="p-4 text-xs font-bold text-neutral-500">{new Date(invite.created_at).toLocaleString()}</td>
                  <td className="p-4 text-xs font-bold text-neutral-500">{new Date(invite.expires_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleRevoke(invite.id, true)}
                      className="text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-400 hover:bg-red-500/5 px-4 py-2 rounded-full transition-colors cursor-pointer"
                    >
                      Revoke Invite
                    </button>
                  </td>
                </tr>
              ))}
              {pendingInvites.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-neutral-500 text-sm font-semibold">No pending invitations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── INVITE RECRUITER MODAL OVERLAY ─── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0C0D12] border border-neutral-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative">
            
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-[#0C0D12]">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <UserPlus size={20} className="text-[#FF6B00]" />
                Invite Recruiter
              </h2>
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="text-neutral-500 hover:text-white transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateToken} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Work Email Address</label>
                <input
                  type="email" 
                  required 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-[#0F1016]/90 border border-neutral-800 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] text-xs font-semibold shadow-inner"
                  placeholder="recruiter@company.com"
                  disabled={loading}
                />
              </div>

              <div className="p-4 bg-neutral-900/40 border border-neutral-850 rounded-2xl flex items-start gap-2.5">
                <HelpCircle size={16} className="text-[#FF6B00] shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                  This generates a secure 64-character setup token. Share it out-of-band with the recruiter to authorize initial system access setup.
                </p>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-neutral-850">
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)} 
                  className="text-xs font-bold text-neutral-500 hover:text-white px-4 py-2 cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-[10px] font-black uppercase tracking-wider px-6 py-3 rounded-full transition-all cursor-pointer shadow-md shadow-[#FF6B00]/10 flex items-center gap-1"
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
