import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineStages } from '../../mock/mockData';
import { ArrowLeft, Zap, Calendar, MessageSquare, CheckCircle2, Mail, Phone, Link as LinkIcon, Globe, Star, ClipboardList, FileText, Video, Sparkles } from 'lucide-react';
import { api } from '../../api/api';

export default function CandidateProfile({ candidateId }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [note, setNote] = useState('');
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCandidate = async () => {
    setLoading(true);
    try {
      const data = await api.candidates.get(candidateId);
      setApp(data);
    } catch (err) {
      setError('Failed to fetch candidate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-orange-500" size={32} />
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest animate-pulse">Syncing profile data...</span>
        </div>
      </div>
    );
  }
  if (error || !app) {
    return (
      <div className="text-rose-600 text-center py-12 select-none">
        <div className="text-sm font-bold uppercase tracking-wider">{error || 'Candidate profile not found.'}</div>
      </div>
    );
  }

  const stageMap = {
    'applied': 'applied',
    'screening': 'screening',
    'coding round': 'coding',
    'interview': 'interview',
    'offer': 'offer',
    'hired': 'offer',
    'rejected': 'applied'
  };

  const rawStage = app.current_stage ? app.current_stage.toLowerCase() : 'applied';
  const stageKey = stageMap[rawStage] || 'applied';
  
  const candidate = {
    id: app.id,
    name: app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown Candidate',
    role: app.job_title || 'Developer',
    stage: stageKey,
    avatar: app.candidate?.parsed_resume?.photo_url || `https://i.pravatar.cc/150?u=${app.id}`,
    source: 'Direct Application',
    matchScore: app.candidate?.confidence_score ? Math.round(app.candidate.confidence_score * 100) : 80,
    skills: app.candidate?.parsed_resume?.skills || ['React', 'JavaScript', 'System Design'],
    email: app.candidate?.email || 'email@example.com',
    phone: app.candidate?.phone || '+1 (555) 234-5678',
    notes: app.internal_notes || []
  };

  const stageConfig = pipelineStages.find(s => s.id === candidate.stage) || pipelineStages[0];

  const timeline = [
    { date: new Date(app.created_at).toLocaleDateString(), event: 'Application Received', note: 'Applied online. Parser matched resume.', color: 'bg-neutral-400' },
    { date: 'Today', event: 'In Current Stage', note: `Currently at stage: ${app.current_stage}`, color: 'bg-orange-500' },
  ];

  const handleStageChange = async (stageId) => {
    const backendStageMap = {
      'applied': 'Applied',
      'screening': 'Screening',
      'coding': 'Coding Round',
      'interview': 'Interview',
      'offer': 'Offer'
    };
    const targetStage = backendStageMap[stageId] || 'Applied';
    try {
      await api.candidates.updateStage(candidateId, targetStage);
      showToast('Stage updated successfully!');
      fetchCandidate();
    } catch (err) {
      alert('Failed to update stage: ' + err.message);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    try {
      await api.candidates.addNote(candidateId, note);
      setNote('');
      showToast('Note saved successfully!');
      fetchCandidate();
    } catch (err) {
      alert('Failed to save note: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-neutral-800">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/recruiter/candidates')}
        className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors group text-xs font-bold uppercase tracking-wider cursor-pointer"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Pipeline
      </button>

      {/* Profile Header Widget */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 relative">
        <img
          src={candidate.avatar}
          alt={candidate.name}
          className="w-24 h-24 rounded-[2rem] object-cover border-2 border-white shadow-md self-center md:self-auto"
        />
        
        <div className="flex-1 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-3xl font-extrabold text-neutral-950 tracking-tight leading-none">{candidate.name}</h1>
            
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white border border-neutral-200 shadow-sm w-fit">
              <span className={`w-1.5 h-1.5 rounded-full ${
                candidate.stage === 'applied' ? 'bg-orange-500' :
                candidate.stage === 'screening' ? 'bg-slate-400' :
                candidate.stage === 'coding' ? 'bg-neutral-800' :
                candidate.stage === 'interview' ? 'bg-orange-600' : 'bg-neutral-900'
              }`}></span>
              <span className="text-neutral-700">{app.current_stage}</span>
            </span>
          </div>

          <p className="text-xs font-semibold text-neutral-400">{candidate.role} • Source: {candidate.source}</p>
          
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills?.map(skill => (
              <span key={skill} className="text-[10px] bg-neutral-100 text-neutral-500 font-bold px-2.5 py-0.5 rounded-full border border-neutral-100/50">{skill}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md" onClick={() => navigate(`/recruiter/interview/adhoc`)}>
              <Video size={12} className="text-orange-500" /> Start Assessment
            </button>
            <button className="px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-950 text-neutral-600 hover:text-neutral-950 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm" onClick={() => navigate('/recruiter/interviews')}>
              <Calendar size={12} className="text-neutral-500" /> Schedule Interview
            </button>
          </div>
        </div>

        {/* ATS score indicator */}
        <div className="self-center md:self-auto text-center md:text-right bg-neutral-950 text-white rounded-3xl p-5 border border-neutral-900 shadow-lg min-w-[120px]">
          <div className="text-3xl font-black font-mono tracking-tight text-white">{candidate.matchScore}%</div>
          <div className="text-[10px] text-orange-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 justify-center md:justify-end mt-1.5">
            <Zap size={11} className="fill-orange-500 text-orange-500 animate-pulse" /> ATS Match
          </div>
        </div>
      </div>

      {/* Capsule switcher tabs */}
      <div className="flex gap-1.5 bg-neutral-100 p-1.5 rounded-full w-fit">
        {['overview', 'timeline', 'notes', 'resume'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-xs font-bold capitalize transition-all ${
              activeTab === tab 
                ? 'border-2 border-orange-500 text-orange-500 bg-transparent shadow-sm' 
                : 'text-neutral-450 hover:text-neutral-950 border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Contact info grid */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Contact Information</h3>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3.5 text-xs font-bold text-neutral-800">
                <span className="w-8 h-8 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400"><Mail size={14} /></span> 
                {candidate.email}
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3.5 text-xs font-bold text-neutral-800">
                  <span className="w-8 h-8 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400"><Phone size={14} /></span> 
                  {candidate.phone}
                </div>
              )}
              <div className="flex items-center gap-3.5 text-xs font-bold text-neutral-800">
                <span className="w-8 h-8 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400"><LinkIcon size={14} /></span> 
                linkedin.com/in/{candidate.name.toLowerCase().replace(' ', '-')}
              </div>
              <div className="flex items-center gap-3.5 text-xs font-bold text-neutral-800">
                <span className="w-8 h-8 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400"><Globe size={14} /></span> 
                Portfolio available on request
              </div>
            </div>
          </div>

          {/* Quick core metrics */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Quick Assessment</h3>
            <div className="space-y-3.5 pt-2">
              {['Technical Skills', 'Communication', 'Culture Fit', 'Problem Solving'].map((skill, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-neutral-500">{skill}</span>
                    <span className="text-neutral-900">{[85, 90, 78, 92][i]}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-neutral-900 rounded-full" style={{ width: `${[85, 90, 78, 92][i]}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Update stage row */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-6 space-y-4 md:col-span-2">
            <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Pipeline Stage Selector</h3>
            <div className="flex gap-2 flex-wrap pt-2">
              {pipelineStages.map(stage => {
                const isCurrent = candidate.stage === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                      isCurrent
                        ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-950 hover:text-neutral-950 cursor-pointer'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h3 className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest">Activity Timeline</h3>
          
          <div className="space-y-6 pt-4">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3.5 h-3.5 rounded-full border-4 border-white shadow-sm shrink-0 ${
                    item.color === 'bg-orange-500' ? 'bg-orange-500' : 'bg-neutral-400'
                  }`}></div>
                  {i < timeline.length - 1 && <div className="w-[1.5px] flex-1 bg-neutral-200 mt-2"></div>}
                </div>
                <div className="pb-6">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{item.date}</div>
                  <div className="text-sm font-extrabold text-neutral-900 mt-1">{item.event}</div>
                  <div className="text-xs text-neutral-500 mt-1.5 font-medium leading-relaxed">{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h3 className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest">Private Evaluation Notes</h3>
          
          <div className="space-y-3.5">
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add private evaluation notes about interview performance..."
                className="w-full bg-transparent text-neutral-800 p-4 outline-none resize-none h-28 text-xs font-semibold placeholder-neutral-300"
              />
            </div>
            <button onClick={handleSaveNote} className="px-5 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md">
              Save Evaluation
            </button>
          </div>

          <div className="mt-8 space-y-4 border-t border-neutral-100 pt-6">
            <h4 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Previous Notes Archive</h4>
            
            {candidate.notes.map((n, i) => (
              <div key={i} className="bg-white border border-neutral-100 rounded-2xl p-4.5 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-neutral-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-orange-500" />
                    {n.recruiter}
                  </span>
                  <span className="text-neutral-400 font-mono">{n.date}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed font-semibold">{n.note}</p>
              </div>
            ))}
            
            {candidate.notes.length === 0 && (
              <div className="text-neutral-400 text-xs py-4 italic font-semibold">No notes have been added for this candidate yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resume' && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest">Extracted Spec Sheet</h3>
            {app.resume_file && (
              <a 
                href={app.resume_file} 
                download 
                className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileText size={14} className="text-neutral-500" /> Download Document
              </a>
            )}
          </div>
          
          <div className="bg-neutral-50 border border-neutral-200/60 rounded-[1.8rem] p-8 text-neutral-700 text-xs font-medium space-y-6 max-w-xl mx-auto shadow-sm">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-neutral-950">{candidate.name}</h2>
              <p className="text-xs font-bold text-orange-600">{candidate.role}</p>
            </div>
            
            <div className="border-t border-neutral-200/60 pt-4 space-y-2">
              <h3 className="font-extrabold text-neutral-950 uppercase tracking-wider text-[10px]">Technical Skills</h3>
              <p className="leading-relaxed text-neutral-500 font-semibold">{candidate.skills?.join(', ')}</p>
            </div>
            
            <div className="border-t border-neutral-200/60 pt-4 space-y-3">
              <h3 className="font-extrabold text-neutral-950 uppercase tracking-wider text-[10px]">Work History Details</h3>
              <div className="space-y-1">
                <div className="font-extrabold text-neutral-800">Software Developer Requisition Match</div>
                <p className="text-neutral-500 leading-relaxed font-semibold mt-1">Detailed text summaries extracted automatically by the AI ATS parser during candidate resume upload.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline fallback loader component to prevent compile issues
function Loader2({ className, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
