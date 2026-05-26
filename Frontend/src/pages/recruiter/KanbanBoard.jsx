import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { GripVertical, User, Zap, Loader2, RefreshCw, Sparkles } from 'lucide-react';

const PIPELINE_COLUMNS = [
  { id: 'Applied', label: 'Applied', color: 'bg-orange-500', borderColor: 'border-orange-500/30', bgCard: 'bg-orange-500/5' },
  { id: 'Screening', label: 'Screening', color: 'bg-slate-400', borderColor: 'border-slate-400/30', bgCard: 'bg-slate-400/5' },
  { id: 'Coding Round', label: 'Coding Round', color: 'bg-neutral-800', borderColor: 'border-neutral-800/30', bgCard: 'bg-neutral-800/5' },
  { id: 'Interview', label: 'Interview', color: 'bg-orange-600', borderColor: 'border-orange-600/30', bgCard: 'bg-orange-600/5' },
  { id: 'Offer', label: 'Offer', color: 'bg-emerald-600', borderColor: 'border-emerald-600/30', bgCard: 'bg-emerald-600/5' },
  { id: 'Hired', label: 'Hired', color: 'bg-neutral-900', borderColor: 'border-neutral-900/30', bgCard: 'bg-neutral-900/5' },
  { id: 'Rejected', label: 'Rejected', color: 'bg-rose-500', borderColor: 'border-rose-500/30', bgCard: 'bg-rose-500/5' },
];

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedCard, setDraggedCard] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [updating, setUpdating] = useState(null); // candidate id being updated

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.candidates.list();
      const mapped = data.map(app => ({
        id: app.id,
        name: app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown',
        email: app.candidate?.email || '',
        role: app.job_title || 'N/A',
        stage: app.current_stage || 'Applied',
        atsScore: app.candidate?.confidence_score ? Math.round(app.candidate.confidence_score * 100) : 80,
        skills: app.candidate?.parsed_resume?.skills || [],
        avatar: app.candidate?.parsed_resume?.photo_url || `https://i.pravatar.cc/150?u=${app.id}`,
      }));
      setCandidates(mapped);
    } catch (err) {
      setError('Failed to load candidate pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Filter candidates by recruiter's passing ATS score
  const passingAtsScore = localStorage.getItem('passingAtsScore') ? parseInt(localStorage.getItem('passingAtsScore')) : 70;
  const passedCandidates = candidates.filter(c => c.atsScore >= passingAtsScore);

  // Group candidates by their stage
  const groupedByStage = {};
  PIPELINE_COLUMNS.forEach(col => {
    groupedByStage[col.id] = passedCandidates.filter(c => c.stage === col.id);
  });

  // Drag handlers
  const handleDragStart = (e, candidate) => {
    setDraggedCard(candidate);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', candidate.id.toString());
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(columnId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedCard || draggedCard.stage === targetStage) {
      setDraggedCard(null);
      return;
    }

    const candidateId = draggedCard.id;
    const oldStage = draggedCard.stage;

    // Optimistic UI update
    setCandidates(prev =>
      prev.map(c => c.id === candidateId ? { ...c, stage: targetStage } : c)
    );
    setDraggedCard(null);
    setUpdating(candidateId);

    try {
      await api.candidates.updateStage(candidateId, targetStage);
    } catch (err) {
      // Revert optimistic update on failure
      setCandidates(prev =>
        prev.map(c => c.id === candidateId ? { ...c, stage: oldStage } : c)
      );
      console.error('Failed to update stage:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDropTarget(null);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-orange-500';
    return 'text-neutral-500';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-orange-500';
    return 'bg-neutral-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-orange-500" size={36} />
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest animate-pulse">Syncing ATS Board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Header matching dashboard layout */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">ATS Pipeline Board</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Drag and drop candidates across milestones to trigger automatic workflow state updates.
          </p>
        </div>
        <button 
          onClick={fetchCandidates} 
          className="px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1.5 transition-all shadow-sm shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className="text-neutral-500" /> Refresh Board
        </button>
      </div>

      {error && (
        <div className="bg-red-50/50 border border-red-200 text-red-500 p-4 rounded-2xl text-xs font-bold">{error}</div>
      )}

      {/* Kanban Column Stage Boards */}
      <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-none items-start" style={{ minHeight: '75vh' }}>
        {PIPELINE_COLUMNS.map(col => {
          const colCandidates = groupedByStage[col.id] || [];
          const isDropping = dropTarget === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-shrink-0 w-[240px] flex flex-col rounded-[2rem] border transition-all duration-300 ${
                isDropping
                  ? `border-orange-500/40 bg-white shadow-xl scale-[1.01]`
                  : 'border-white/50 bg-white/60 backdrop-blur-xl shadow-sm'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  <span className="text-xs font-extrabold text-neutral-800 leading-none">{col.label}</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100/80 px-2 py-0.5 rounded-full font-mono">
                  {colCandidates.length}
                </span>
              </div>

              {/* Cards layout */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[60vh] scrollbar-none min-h-[300px]">
                {colCandidates.map(candidate => (
                  <div
                    key={candidate.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, candidate)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/recruiter/candidates/${candidate.id}`)}
                    className={`p-4 rounded-2xl border cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${
                      draggedCard?.id === candidate.id
                        ? 'opacity-30 border-orange-500/50'
                        : updating === candidate.id
                        ? 'border-orange-500/30 animate-pulse bg-neutral-50'
                        : 'border-neutral-100 bg-white hover:border-orange-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <img
                        src={candidate.avatar}
                        alt={candidate.name}
                        className="w-7 h-7 rounded-full object-cover border border-neutral-100 shadow-sm flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-neutral-950 truncate group-hover:text-orange-600 transition-colors leading-none">
                          {candidate.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1 truncate font-semibold">{candidate.role}</div>
                      </div>
                      <GripVertical size={12} className="text-neutral-300 flex-shrink-0 mt-0.5 cursor-grab group-hover:text-neutral-400 transition-colors" />
                    </div>

                    {/* ATS Score gauge */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBg(candidate.atsScore)}`}
                          style={{ width: `${candidate.atsScore}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono font-bold shrink-0 ${getScoreColor(candidate.atsScore)}`}>
                        {candidate.atsScore}%
                      </span>
                    </div>

                    {/* Skills pills */}
                    {candidate.skills.length > 0 && (
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {candidate.skills.slice(0, 2).map(skill => (
                          <span key={skill} className="text-[9px] bg-neutral-50 text-neutral-400 font-bold px-2 py-0.5 rounded-full border border-neutral-100/50">
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 2 && (
                          <span className="text-[9px] text-neutral-400 font-bold ml-1">+{candidate.skills.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {colCandidates.length === 0 && (
                  <div className="text-center text-[10px] text-neutral-400 py-12 italic font-semibold">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
