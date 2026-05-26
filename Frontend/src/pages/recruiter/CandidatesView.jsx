import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, X, Zap, RefreshCw, User } from 'lucide-react';
import { api } from '../../api/api';

export default function CandidatesView() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add Candidate Modal states
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const passingAtsScore = localStorage.getItem('passingAtsScore') ? parseInt(localStorage.getItem('passingAtsScore')) : 70;

  const fetchJobs = async () => {
    try {
      const data = await api.jobs.list();
      setJobs(data || []);
      if (data && data.length > 0) {
        setSelectedJobId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.candidates.list();
      const mapped = (data || []).map(app => ({
        id: app.id,
        name: app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown',
        role: app.job_title || 'N/A',
        avatar: app.candidate?.parsed_resume?.photo_url || '',
        matchScore: app.candidate?.confidence_score ? Math.round(app.candidate.confidence_score * 100) : 80,
        skills: app.candidate?.parsed_resume?.skills || []
      }));
      setCandidates(mapped);
    } catch (err) {
      setError('Failed to fetch candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName || !candidateEmail || !selectedJobId || !resumeFile) {
      setModalError('Full Name, Email, Job, and Resume are required.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const formData = new FormData();
      formData.append('job_id', selectedJobId);
      formData.append('name', candidateName);
      formData.append('email', candidateEmail);
      formData.append('phone', candidatePhone);
      formData.append('resume', resumeFile);
      formData.append('cover_letter', coverLetter);

      await api.candidates.apply(formData);

      // Reset
      setCandidateName('');
      setCandidateEmail('');
      setCandidatePhone('');
      setResumeFile(null);
      setCoverLetter('');
      setShowModal(false);

      fetchCandidates();
    } catch (err) {
      setModalError(err.message || 'Failed to submit candidate.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Filter candidates based on search
  const searchedAll = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const searchedPassed = searchedAll.filter(c => c.matchScore >= passingAtsScore);

  return (
    <div className="space-y-8 select-none relative animate-fade-in">
      
      {/* Header Row */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Candidates Workspace</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Monitor applicant milestones, inspect resume ATS scores, and audit requirements.
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0 self-start md:self-auto">
          <button 
            onClick={fetchCandidates}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw size={14} className="text-neutral-500" /> Refresh List
          </button>
          <button 
            onClick={() => { setModalError(''); setShowModal(true); }}
            className="px-5 py-2.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <UserPlus size={14} /> Add Candidate
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/50 border border-red-200 text-red-500 p-4 rounded-2xl text-xs font-bold">{error}</div>
      )}

      {/* Searching Bar */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-4 rounded-[2rem] shadow-sm flex gap-4 items-center justify-between">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Search candidates by name or target role..."
            className="w-full pl-11 pr-5 py-2.5 bg-white border border-neutral-200 rounded-full text-xs font-semibold focus:outline-none focus:border-neutral-950 focus:ring-0 placeholder-neutral-300 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Passed Candidates */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
            <h3 className="text-base font-extrabold text-neutral-950">Passed Candidates</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full font-mono uppercase">
              ATS ≥ {passingAtsScore}%
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {searchedPassed.map(c => (
              <div 
                key={c.id} 
                onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                className="p-4 bg-white hover:bg-neutral-50/50 border border-neutral-100 rounded-2xl cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {c.avatar ? (
                    <img src={c.avatar} className="w-10 h-10 rounded-full object-cover border border-neutral-200" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-400 flex items-center justify-center">
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-extrabold text-neutral-950">{c.name}</h4>
                    <p className="text-[10px] text-neutral-400 font-semibold mt-1">{c.role}</p>
                  </div>
                </div>
                
                <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-0.5 shrink-0 bg-emerald-50 px-2 py-0.5 rounded">
                  <Zap size={11} className="fill-emerald-500 text-emerald-500" /> {c.matchScore}%
                </span>
              </div>
            ))}
            {searchedPassed.length === 0 && (
              <div className="text-neutral-400 text-center text-xs py-16 italic">No candidates passed the ATS hurdle.</div>
            )}
          </div>
        </div>

        {/* Column 2: All Applicants */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
            <h3 className="text-base font-extrabold text-neutral-950">All Candidates</h3>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-2.5 py-1 rounded-full font-mono">
              Total: {searchedAll.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {searchedAll.map(c => (
              <div 
                key={c.id} 
                onClick={() => navigate(`/recruiter/candidates/${c.id}`)}
                className="p-4 bg-white hover:bg-neutral-50/50 border border-neutral-100 rounded-2xl cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {c.avatar ? (
                    <img src={c.avatar} className="w-10 h-10 rounded-full object-cover border border-neutral-200" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-400 flex items-center justify-center">
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-extrabold text-neutral-950">{c.name}</h4>
                    <p className="text-[10px] text-neutral-400 font-semibold mt-1">{c.role}</p>
                  </div>
                </div>
                
                <span className={`text-xs font-mono font-bold flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded ${
                  c.matchScore >= passingAtsScore ? 'text-emerald-600 bg-emerald-50' : 'text-neutral-500 bg-neutral-50'
                }`}>
                  {c.matchScore}%
                </span>
              </div>
            ))}
            {searchedAll.length === 0 && (
              <div className="text-neutral-400 text-center text-xs py-16 italic">No candidates found matching query.</div>
            )}
          </div>
        </div>

      </div>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-md overflow-hidden relative">
            
            {modalSubmitting && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-30 space-y-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-1.5 px-8">
                  <h3 className="text-neutral-950 font-extrabold text-base">Processing ATS...</h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider animate-pulse leading-relaxed">
                    Analyzing skills, parsing experience metrics, and calculating match rates...
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center p-6 border-b border-neutral-100">
              <h2 className="text-base font-extrabold text-neutral-950">Add Candidate Profile</h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors"
                disabled={modalSubmitting}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50/50 border border-red-200 text-red-500 rounded-2xl text-[10px] font-bold leading-relaxed">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text" required value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm"
                  placeholder="e.g. Jane Doe"
                  disabled={modalSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Email *</label>
                  <input
                    type="email" required value={candidateEmail}
                    onChange={e => setCandidateEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm"
                    placeholder="e.g. jane@example.com"
                    disabled={modalSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    type="text" value={candidatePhone}
                    onChange={e => setCandidatePhone(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm"
                    placeholder="e.g. +1234567890"
                    disabled={modalSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Target Requisition *</label>
                <select
                  required value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm cursor-pointer"
                  disabled={modalSubmitting}
                >
                  <option value="" disabled>Select active role</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title} ({job.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Resume File *</label>
                <input
                  type="file" required accept=".pdf,.docx,.doc,.txt"
                  onChange={e => setResumeFile(e.target.files[0])}
                  className="w-full text-xs text-neutral-400 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 bg-neutral-50 border border-neutral-200 rounded-2xl p-2 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-sm"
                  disabled={modalSubmitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Cover Letter</label>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold resize-none placeholder-neutral-400 shadow-sm"
                  placeholder="Add notes..."
                  disabled={modalSubmitting}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-neutral-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-colors cursor-pointer"
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                  disabled={modalSubmitting}
                >
                  Submit
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
