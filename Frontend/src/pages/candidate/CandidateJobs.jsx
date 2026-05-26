import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, MapPin, Tag, Clock, ArrowRight, X, Search, 
  Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Info, Send 
} from 'lucide-react';
import { api } from '../../api/api';

export default function CandidateJobs() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail') || '';
  const storedName = localStorage.getItem('userName') || 'Candidate';

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  
  // Modals / Details
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Form fields
  const [candidateName, setCandidateName] = useState(storedName);
  const [candidatePhone, setCandidatePhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobsData, appsData, profileRes] = await Promise.all([
        api.jobs.list(),
        api.candidates.myApplications(userEmail),
        api.candidates.getProfile(userEmail).catch(() => null)
      ]);

      // Only display active jobs
      const activeJobs = (jobsData || []).filter(job => job.status === 'Active');
      setJobs(activeJobs);
      setApplications(appsData || []);

      if (profileRes?.candidate) {
        setProfile(profileRes.candidate);
        const fullName = `${profileRes.candidate.first_name} ${profileRes.candidate.last_name}`.trim();
        if (fullName) setCandidateName(fullName);
        if (profileRes.candidate.phone) setCandidatePhone(profileRes.candidate.phone);
      }
    } catch (err) {
      console.error('Failed to load candidate jobs data:', err);
      setError('Failed to retrieve open opportunities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userEmail) {
      navigate('/login');
      return;
    }
    loadData();
  }, [userEmail]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob.id);
      formData.append('name', candidateName);
      formData.append('email', userEmail);
      formData.append('phone', candidatePhone);
      formData.append('cover_letter', coverLetter);
      // Omit resume file as it is already on the server / candidate profile

      await api.candidates.apply(formData);

      setShowApplyModal(false);
      setSelectedJob(null);
      setCoverLetter('');
      showToast(`Successfully applied for ${selectedJob.title}!`);
      
      // Reload applications to update the UI badges
      const appsData = await api.candidates.myApplications(userEmail);
      setApplications(appsData || []);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check application status for a job
  const getJobApplicationStatus = (jobId) => {
    const app = applications.find(a => a.job === jobId);
    if (!app) return null;
    return app.status === 'Active' ? app.current_stage : app.status;
  };

  // Search & Filter Logic
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));

    if (selectedType === 'All') return matchesSearch;
    if (selectedType === 'Remote') {
      return matchesSearch && job.location?.toLowerCase() === 'remote';
    }
    return matchesSearch && job.type?.toLowerCase() === selectedType.toLowerCase();
  });

  return (
    <div className="space-y-8 select-none relative animate-fade-in pb-20">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-neutral-800 animate-slide-in">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            Opportunities
          </span>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight mt-3">Explore Open Requisitions</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Browse through active roles, check hiring criteria, and apply using your current profile resume.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/50 border border-red-200 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-5 rounded-[2rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Search roles by title, department, or keyword..."
            className="w-full pl-11 pr-5 py-2.5 bg-white border border-neutral-200 rounded-full text-xs font-semibold focus:outline-none focus:border-neutral-950 placeholder-neutral-300 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">Job Type:</span>
          {['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'].map(t => {
            const isSelected = selectedType === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-2 border-orange-500 text-orange-500 bg-transparent font-bold shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-950 hover:border-neutral-950'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        /* Jobs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobs.map(job => {
            const appStage = getJobApplicationStatus(job.id);
            const isApplied = !!appStage;
            
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 flex flex-col hover:border-orange-500/30 hover:shadow-[0_15px_40px_-15px_rgba(234,88,12,0.12)] transition-all duration-300 cursor-pointer rounded-[2rem] hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full ${
                    job.priority === 'Urgent' 
                      ? 'bg-orange-100 text-orange-600' 
                      : 'bg-neutral-100 text-neutral-800'
                  }`}>
                    {job.priority || "Normal"}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono font-bold">REQ-{job.id}</span>
                </div>

                <h3 className="text-base font-extrabold text-neutral-950 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-xs font-semibold text-neutral-400 mb-6">{job.department} • {job.location}</p>

                {/* Job Info Description Snippet */}
                <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold line-clamp-3 mb-6 flex-1">
                  {job.description || `We are looking for a ${job.title} to join our ${job.department} team.`}
                </p>

                <div className="pt-4 border-t border-neutral-100 flex justify-between items-center text-xs font-bold mt-auto">
                  <span className="text-neutral-400">{job.type}</span>
                  {isApplied ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} /> {appStage}
                    </span>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setFormError(''); setShowApplyModal(true); }}
                      className="text-neutral-900 group-hover:text-orange-600 text-xs font-bold flex items-center gap-1 transition-colors hover:scale-102 cursor-pointer"
                    >
                      Apply Now <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div className="col-span-full bg-white/70 backdrop-blur-xl border border-white/40 p-16 rounded-[2.2rem] text-center text-neutral-400 text-xs italic font-semibold shadow-xs">
              No active job openings match your filters. Please check back later.
            </div>
          )}
        </div>
      )}

      {/* Requisition Detail Modal */}
      {selectedJob && !showApplyModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-8 border-b border-neutral-100 bg-white">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full ${
                    selectedJob.priority === 'Urgent' ? 'bg-orange-100 text-orange-600' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {selectedJob.priority || "Normal"}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono font-bold">REQ-{selectedJob.id}</span>
                </div>
                <h2 className="text-2xl font-black text-neutral-950 leading-none">{selectedJob.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 scrollbar-none">
              
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Briefcase size={14} className="text-orange-500" />, label: 'Department', value: selectedJob.department },
                  { icon: <MapPin size={14} className="text-neutral-700" />, label: 'Location', value: selectedJob.location },
                  { icon: <Tag size={14} className="text-neutral-500" />, label: 'Type', value: selectedJob.type },
                  { icon: <Clock size={14} className="text-neutral-400" />, label: 'Priority', value: selectedJob.priority || 'Normal' },
                ].map((m, i) => (
                  <div key={i} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 mb-1">{m.icon} {m.label}</div>
                    <div className="text-xs font-extrabold text-neutral-800">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-black text-neutral-950">Job Description</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  {selectedJob.description || `We are looking for a talented ${selectedJob.title} to join our ${selectedJob.department} team.`}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-black text-neutral-950">Key Qualifications</h3>
                <ul className="space-y-2 text-xs text-neutral-500 font-semibold">
                  {['Relevant technical experience', 'Strong system design or project architecture knowledge', 'Effective communication & cross-functional collaboration', 'Self-motivated developer with robust problem solving skills'].map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-orange-500 mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Apply Helper Notice */}
              {getJobApplicationStatus(selectedJob.id) && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-3xl flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-neutral-950">Applied Requisition</h5>
                    <p className="text-[10px] text-neutral-500 font-semibold mt-1">
                      You already applied to this position. Your application is currently in the <strong className="text-emerald-600">{getJobApplicationStatus(selectedJob.id)}</strong> stage.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex gap-3 justify-end">
              <button 
                onClick={() => setSelectedJob(null)} 
                className="px-4 py-2.5 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white transition-all cursor-pointer"
              >
                Close Details
              </button>
              {!getJobApplicationStatus(selectedJob.id) && (
                <button 
                  onClick={() => { setFormError(''); setShowApplyModal(true); }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Apply to Requisition
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Application Form Modal (Resume-less Apply) */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-scale-up">
            
            {submitting && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-30 space-y-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-1.5 px-8">
                  <h3 className="text-neutral-950 font-extrabold text-base">Submitting Application...</h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider animate-pulse leading-relaxed">
                    Connecting profile details and calculating matching scores...
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center p-6 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-extrabold text-neutral-950">Submit Application</h2>
                <span className="text-[10px] text-neutral-400 font-semibold">{selectedJob.title}</span>
              </div>
              <button 
                onClick={() => setShowApplyModal(false)} 
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
                disabled={submitting}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-500 rounded-2xl text-[10px] font-bold leading-relaxed flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dynamic Helper Note confirming resume is already taken */}
              <div className="bg-orange-50/50 border border-orange-200/40 p-4 rounded-2xl flex gap-3 items-start">
                <ShieldCheck className="text-orange-500 mt-0.5 shrink-0" size={16} />
                <div>
                  <h4 className="text-[11px] font-black text-neutral-900 uppercase tracking-wide">Resume On File Will Be Submitted</h4>
                  <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed mt-1">
                    Your candidate profile resume has already been verified and will be automatically sent with this application. You don't need to re-upload.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text" required value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm"
                  placeholder="e.g. Jane Doe"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email" readOnly value={userEmail}
                    className="w-full bg-neutral-100 border border-neutral-200 text-neutral-400 rounded-2xl px-4 py-2.5 focus:outline-none text-xs font-semibold shadow-sm cursor-not-allowed"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text" value={candidatePhone}
                    onChange={e => setCandidatePhone(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm"
                    placeholder="e.g. +1 555-0199"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Cover Letter / Notes</label>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold resize-none placeholder-neutral-400 shadow-sm"
                  placeholder="Why are you a good fit for this role? Share any additional highlights..."
                  disabled={submitting}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-neutral-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  disabled={submitting}
                >
                  <Send size={12} /> Submit Application
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
