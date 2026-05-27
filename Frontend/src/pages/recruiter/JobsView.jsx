import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, ArrowRight, Briefcase, X, MapPin, DollarSign, Tag, BriefcaseConveyorBelt, CheckCircle, Sparkles } from 'lucide-react';
import { api } from '../../api/api';

export default function JobsView() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const emptyJobForm = { title: '', department: '', location: '', type: 'Full-time', priority: 'Normal', deadline: '' };
  const [newJob, setNewJob] = useState(emptyJobForm);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.jobs.list();
      setJobs(data || []);
    } catch (err) {
      setError('Failed to fetch jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const formatDeadline = (deadline) => {
    if (!deadline) return 'Open until filled';
    return new Date(`${deadline}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.department) return;
    try {
      await api.jobs.create({
        title: newJob.title,
        department: newJob.department,
        location: newJob.location || 'Remote',
        type: newJob.type,
        priority: newJob.priority,
        deadline: newJob.deadline || null,
        description: `We are looking for a ${newJob.title} to join our ${newJob.department} team.`
      });
      setShowCreateModal(false);
      setNewJob(emptyJobForm);
      fetchJobs();
    } catch (err) {
      alert('Failed to create requisition: ' + err.message);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (selectedType === 'All') return true;
    return job.type?.toLowerCase() === selectedType.toLowerCase();
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* Header section matching management layout */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Requisitions</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Manage your active job postings, application metrics, and talent pipelines.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="px-5 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus size={14} /> Create Requisition
        </button>
      </div>

      {/* Job Type Filter Row */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-4 rounded-[2rem] shadow-sm flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-3">Filter by Type:</span>
        {['All', 'Full-time', 'Part-time', 'Contract', 'Internship'].map(t => {
          const isSelected = selectedType === t;
          return (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'border-2 border-orange-500 text-orange-500 bg-transparent font-bold'
                  : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-950 hover:border-neutral-950'
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredJobs.map(job => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 flex flex-col hover:border-orange-500/30 hover:shadow-[0_15px_40px_-15px_rgba(234,88,12,0.12)] transition-all duration-300 cursor-pointer rounded-[2rem] hover:-translate-y-1 group"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full ${
                job.priority === 'Urgent' 
                  ? 'bg-orange-100 text-orange-600' 
                  : job.priority === 'Low' 
                  ? 'bg-neutral-100 text-neutral-400' 
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

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-neutral-100 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Users size={12} className="text-orange-500" /> Applicants
                </div>
                <div className="text-lg font-black text-neutral-900 leading-none">{job.applicants_count ?? 0}</div>
              </div>
              <div className="bg-white border border-neutral-100 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={12} className="text-neutral-500" /> Days Open
                </div>
                <div className="text-lg font-black text-neutral-900 leading-none">{job.days_open ?? 0}</div>
              </div>
            </div>

            <div className="text-[10px] text-neutral-400 font-bold mb-4 flex items-center gap-1.5">
              <Clock size={12} className="text-orange-500" />
              Deadline: {formatDeadline(job.deadline)}
            </div>

            <div className="mt-auto pt-4 border-t border-neutral-100 flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-400">{job.type}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/recruiter/candidates'); }}
                className="text-neutral-900 group-hover:text-orange-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                Pipeline <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}

        {/* Create New Card styled precisely to match visual standard */}
        <div
          onClick={() => setShowCreateModal(true)}
          className="bg-white/40 border-2 border-dashed border-neutral-200 hover:border-orange-500/40 hover:bg-white/70 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer rounded-[2rem] min-h-[260px] group hover:-translate-y-1 hover:shadow-sm"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 text-neutral-400 group-hover:text-orange-600 border border-neutral-100 transition-colors shadow-sm group-hover:scale-105 duration-300">
            <Plus size={20} />
          </div>
          <h3 className="text-sm font-extrabold text-neutral-950 mb-1">New Requisition</h3>
          <p className="text-xs text-neutral-400 max-w-[180px] leading-relaxed">Draft a new job posting or import from template</p>
        </div>
      </div>

      {/* Job Detail Modal popup */}
      {selectedJob && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
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
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors"
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
                  { icon: <Clock size={14} className="text-neutral-400" />, label: 'Deadline', value: formatDeadline(selectedJob.deadline) },
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
                  {selectedJob.description || `We are looking for a talented ${selectedJob.title} to join our ${selectedJob.department} team. This is a ${selectedJob.type} position based ${selectedJob.location === 'Remote' ? 'remotely' : `in ${selectedJob.location}`}.`}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-black text-neutral-950">Requirements</h3>
                <ul className="space-y-2 text-xs text-neutral-500 font-semibold">
                  {['5+ years of relevant industry experience', 'Strong written and verbal communication skills', 'Experience with Agile workflows and fast loops', 'Strong fundamentals in computer science'].map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-orange-500 mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Applicants stats box */}
              <div className="bg-neutral-950 text-white rounded-3xl p-5 flex items-center justify-between border border-neutral-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-orange-500">
                    <Users size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Applicants in pipeline</h5>
                    <p className="text-[10px] text-neutral-400 font-semibold mt-1">{selectedJob.applicants_count ?? 0} candidates applied</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedJob(null); navigate('/recruiter/candidates'); }} 
                  className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-950 rounded-full text-[10px] font-bold transition-all shadow-sm shrink-0"
                >
                  Manage Pipeline
                </button>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex gap-3 justify-end">
              <button 
                onClick={() => { setSelectedJob(null); navigate('/recruiter/candidates'); }} 
                className="px-4 py-2.5 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white transition-all shadow-sm"
              >
                View Candidates
              </button>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-sm"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Create Requisition Modal popup */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-neutral-100">
              <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-1.5">
                <Sparkles size={16} className="text-orange-500" />
                Create Requisition
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Backend Engineer" 
                  value={newJob.title} 
                  onChange={e => setNewJob({...newJob, title: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Department</label>
                  <input 
                    type="text" 
                    placeholder="Engineering" 
                    value={newJob.department} 
                    onChange={e => setNewJob({...newJob, department: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Location</label>
                  <input 
                    type="text" 
                    placeholder="Remote" 
                    value={newJob.location} 
                    onChange={e => setNewJob({...newJob, location: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Type</label>
                  <select 
                    value={newJob.type} 
                    onChange={e => setNewJob({...newJob, type: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Priority</label>
                  <select 
                    value={newJob.priority} 
                    onChange={e => setNewJob({...newJob, priority: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Application Deadline</label>
                <input 
                  type="date" 
                  value={newJob.deadline} 
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNewJob({...newJob, deadline: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold placeholder-neutral-400 shadow-sm" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="px-4 py-2 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateJob} 
                  className="px-5 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md"
                >
                  Create Requisition
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
