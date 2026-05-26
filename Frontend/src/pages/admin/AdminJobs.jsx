import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { Briefcase, Plus, Trash2, Loader2, MapPin, Clock, X } from 'lucide-react';

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '', department: '', location: '', type: 'Full-time',
    priority: 'Normal', description: '', requirements: '',
    pipeline_stages: 'Applied, Screening, Coding Round, Interview, Offer, Hired, Rejected'
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.jobs.list();
      setJobs(data);
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...formData,
        requirements: formData.requirements.split(',').map(r => r.trim()).filter(Boolean),
        pipeline_stages: formData.pipeline_stages.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.jobs.create(payload);
      setShowCreateModal(false);
      setFormData({
        title: '', department: '', location: '', type: 'Full-time',
        priority: 'Normal', description: '', requirements: '',
        pipeline_stages: 'Applied, Screening, Coding Round, Interview, Offer, Hired, Rejected'
      });
      fetchJobs();
    } catch (err) {
      setError(err.message || 'Failed to create job.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await api.jobs.delete(id);
      fetchJobs();
    } catch (err) {
      setError('Failed to delete job.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-neutral-950 mb-1.5 tracking-tight">Job Requisitions</h1>
          <p className="text-neutral-500 font-medium text-sm">Manage all company job postings and their pipeline configurations.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-neutral-950 hover:bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-full flex items-center gap-2 transition-all cursor-pointer shadow-sm">
          <Plus size={14} /> New Job Posting
        </button>
      </div>

      {error && (
        <div className="bg-red-55/15 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-semibold">{error}</div>
      )}

      {/* Jobs Table */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
              <th className="p-4 font-bold">Position</th>
              <th className="p-4 font-bold">Department</th>
              <th className="p-4 font-bold">Location</th>
              <th className="p-4 font-bold">Type</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Days Open</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-neutral-50/40 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-950/10 text-neutral-950 flex items-center justify-center rounded-xl border border-neutral-200/50">
                      <Briefcase size={14} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-neutral-950">{job.title}</div>
                      <div className="text-[9px] font-bold font-mono text-neutral-400">ID: #{job.id}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-xs font-semibold text-neutral-500">{job.department}</td>
                <td className="p-4 text-xs font-bold text-neutral-400 flex items-center gap-1"><MapPin size={12} /> {job.location}</td>
                <td className="p-4">
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{job.type}</span>
                </td>
                <td className="p-4">
                  <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full border ${
                    job.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    job.status === 'Closed' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-neutral-100 text-neutral-500 border-neutral-200'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="p-4 text-xs font-bold text-neutral-400 flex items-center gap-1"><Clock size={12} /> {job.days_open || 0}d</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(job.id)} className="text-red-500 hover:text-red-750 transition-colors cursor-pointer p-1.5 rounded-full hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-neutral-400 text-sm font-semibold">No jobs posted yet. Create your first requisition above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-100 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-neutral-100">
              <h2 className="text-xl font-black text-neutral-950 tracking-tight flex items-center gap-2">
                <Briefcase size={20} className="text-orange-500" /> New Job Posting
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Job Title *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold" placeholder="Senior Frontend Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Department *</label>
                  <input type="text" required value={formData.department} onChange={e => setFormData(p => ({...p, department: e.target.value}))}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold" placeholder="Engineering" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Location *</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold" placeholder="Remote" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Job Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-750 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold cursor-pointer shadow-sm">
                    <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData(p => ({...p, priority: e.target.value}))}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-750 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold cursor-pointer shadow-sm">
                    <option>Low</option><option>Normal</option><option>Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Description *</label>
                <textarea required value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold h-24 resize-none" placeholder="Describe the role, responsibilities, and qualifications..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Requirements (comma-separated)</label>
                <input type="text" value={formData.requirements} onChange={e => setFormData(p => ({...p, requirements: e.target.value}))}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold" placeholder="React, TypeScript, 3+ years experience" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Pipeline Stages (comma-separated)</label>
                <input type="text" value={formData.pipeline_stages} onChange={e => setFormData(p => ({...p, pipeline_stages: e.target.value}))}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-855 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-[10px] font-mono font-bold" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-xs font-bold text-neutral-400 hover:text-neutral-700 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-neutral-950 hover:bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm" disabled={creating}>
                  {creating ? 'Creating...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
