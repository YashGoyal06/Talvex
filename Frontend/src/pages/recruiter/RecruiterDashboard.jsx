import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, Users, Calendar, Award, Plus, Video, 
  Sparkles, Bell, ExternalLink, ArrowUpRight, TrendingUp, CheckCircle, RefreshCw, User
} from 'lucide-react';
import { api } from '../../api/api';

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const storedName = localStorage.getItem('userName') || 'Recruiter';
  const firstName = storedName.split(' ')[0];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, candidatesData, interviewsData] = await Promise.all([
        api.jobs.list(),
        api.candidates.list(),
        api.interviews.list()
      ]);
      setJobs(jobsData || []);
      setCandidates(candidatesData || []);
      setInterviews(interviewsData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── 1. OVERVIEW STATS CALCULATIONS ───
  const activeJobsCount = jobs.length;
  const totalCandidatesCount = candidates.length;
  const upcomingInterviewsCount = interviews.filter(int => !int.completed_at).length;
  const offersSentCount = candidates.filter(app => {
    const stage = app.current_stage ? app.current_stage.toLowerCase() : '';
    return stage === 'offer' || stage === 'hired' || app.status === 'Offered' || app.status === 'Hired';
  }).length;

  // ─── 2. UPCOMING INTERVIEWS ───
  const upcomingInterviews = interviews
    .filter(int => !int.completed_at)
    .map(int => ({
      id: int.id,
      candidateName: int.candidate ? `${int.candidate.first_name} ${int.candidate.last_name}` : 'Unknown Candidate',
      role: int.job ? int.job.title : 'Software Engineer',
      time: int.scheduled_at ? new Date(int.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending Time',
      roomId: int.room_id || 'demo-room'
    })).slice(0, 4);

  // ─── 3. RECENT APPLICATIONS ───
  const recentApplications = candidates
    .map(app => ({
      id: app.id,
      name: app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown',
      role: app.job_title || 'Software Requisition',
      appliedDate: app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Just now',
      atsScore: app.candidate?.confidence_score ? Math.round(app.candidate.confidence_score * 100) : 75,
      avatar: app.candidate?.parsed_resume?.photo_url || ''
    }))
    .slice(0, 5);

  // ─── 4. CANDIDATE SPOTLIGHT ───
  // Find highest ATS score candidate
  const mappedCandidates = candidates.map(app => ({
    id: app.id,
    name: app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown',
    role: app.job_title || 'Software Engineer',
    atsScore: app.candidate?.confidence_score ? Math.round(app.candidate.confidence_score * 100) : 75,
    avatar: app.candidate?.parsed_resume?.photo_url || '',
    skills: app.candidate?.parsed_resume?.skills || ['React', 'Python', 'Git', 'REST APIs']
  }));
  const spotlightCandidate = mappedCandidates.length > 0 
    ? [...mappedCandidates].sort((a, b) => b.atsScore - a.atsScore)[0]
    : {
        id: 'spot',
        name: 'Marta Adams',
        role: 'Senior Product Designer',
        atsScore: 96,
        avatar: '',
        skills: ['Figma', 'UI/UX Prototypes', 'Design Systems', 'HTML/CSS']
      };

  // ─── 5. NOTIFICATIONS ───
  // Dynamically compile pending reviews, new applications, and upcoming interviews alerts
  const notificationsList = [];
  const pendingReviewsCount = interviews.filter(int => int.completed_at && !int.feedback).length;
  
  if (pendingReviewsCount > 0) {
    notificationsList.push({
      id: 'not-rev',
      type: 'review',
      message: `${pendingReviewsCount} interview evaluations are pending your feedback scorecard.`,
      time: 'Action Required'
    });
  }
  if (candidates.length > 0) {
    notificationsList.push({
      id: 'not-app',
      type: 'application',
      message: `Received ${candidates.slice(0, 3).length} new applications in the last 24 hours.`,
      time: 'New'
    });
  }
  if (upcomingInterviewsCount > 0) {
    notificationsList.push({
      id: 'not-int',
      type: 'interview',
      message: `You have ${upcomingInterviewsCount} upcoming developer assessment rounds scheduled.`,
      time: 'Today'
    });
  }
  // Default fallback if list is empty
  if (notificationsList.length === 0) {
    notificationsList.push({
      id: 'not-empty',
      type: 'info',
      message: 'Workspace is fully synced. No new pending alerts or tasks.',
      time: 'Up to date'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-fade-in text-neutral-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-neutral-850">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Recruiter Dashboard</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Review your candidate stats, recent applications, code assessments, and pipeline insights.
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1.5 transition-all shadow-sm shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className="text-neutral-500" /> Sync Workspace
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ─── SECTION 1: OVERVIEW STATS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Jobs', val: activeJobsCount, icon: <Briefcase size={20} />, bg: 'bg-orange-50 text-orange-600 border-orange-100' },
          { label: 'Total Candidates', val: totalCandidatesCount, icon: <Users size={20} />, bg: 'bg-blue-50 text-blue-600 border-blue-100' },
          { label: 'Interviews Scheduled', val: upcomingInterviewsCount, icon: <Calendar size={20} />, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
          { label: 'Offers Sent', val: offersSentCount, icon: <Award size={20} />, bg: 'bg-purple-50 text-purple-600 border-purple-100' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-3xl font-black text-neutral-900 mt-2 leading-none">{stat.val}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${stat.bg} shadow-xs`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ─── TWO-COLUMN CONTENT GRID ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upcoming Interviews, Recent Applications, Analytics */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* SECTION 2: UPCOMING INTERVIEWS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-neutral-950">Upcoming Interviews</h3>
              <span className="text-[10px] bg-neutral-100 text-neutral-500 font-bold px-3 py-1 rounded-full">{upcomingInterviews.length} Scheduled</span>
            </div>
            
            <div className="divide-y divide-neutral-100">
              {upcomingInterviews.map(int => (
                <div key={int.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-neutral-950">{int.candidateName}</h4>
                    <p className="text-[10px] text-neutral-400 mt-1 font-semibold">{int.role} • {int.time}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/recruiter/interview/${int.roomId}`)}
                    className="px-4 py-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-[10px] font-black uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    Join Interview
                  </button>
                </div>
              ))}
              {upcomingInterviews.length === 0 && (
                <div className="text-neutral-400 text-center text-xs py-6">No interviews scheduled.</div>
              )}
            </div>
          </div>

          {/* SECTION 3: RECENT APPLICATIONS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-neutral-950">Recent Applications</h3>
              <span className="text-[10px] bg-neutral-100 text-neutral-500 font-bold px-3 py-1 rounded-full">New Profiles</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider pb-3">
                    <th className="pb-3">Candidate</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Applied Date</th>
                    <th className="pb-3 text-right">ATS Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs font-semibold text-neutral-700">
                  {recentApplications.map(app => (
                    <tr key={app.id} className="hover:bg-neutral-50/20 cursor-pointer" onClick={() => navigate('/recruiter/candidates')}>
                      <td className="py-4">
                        <div className="flex items-center gap-2.5">
                          {app.avatar ? (
                            <img src={app.avatar} className="w-7 h-7 rounded-full object-cover border border-neutral-200" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-400 border border-neutral-200">
                              <User size={12} />
                            </div>
                          )}
                          <span className="font-extrabold text-neutral-900">{app.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-neutral-500">{app.role}</td>
                      <td className="py-4 text-neutral-400 font-mono">{app.appliedDate}</td>
                      <td className="py-4 text-right">
                        <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                          app.atsScore >= 90 ? 'bg-emerald-50 text-emerald-600' :
                          app.atsScore >= 70 ? 'bg-orange-50 text-orange-600' : 'bg-neutral-50 text-neutral-500'
                        }`}>
                          {app.atsScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentApplications.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-neutral-400 text-center text-xs py-8">No applications received yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: ANALYTICS GRAPHS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold text-neutral-950">Analytics Graphs</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Graph 1: Hiring Trend */}
              <div className="bg-white border border-neutral-100 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Hiring Trend</span>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><TrendingUp size={10} /> +12%</span>
                </div>
                <div className="h-28 flex items-end justify-between gap-1 pb-1">
                  {[20, 35, 45, 30, 50, 75, 60].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full bg-orange-500 hover:bg-orange-600 rounded-t-sm transition-all" style={{ height: `${h}%` }}></div>
                      <span className="text-[8px] text-neutral-400 font-bold font-mono">M{i+1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph 2: Pipeline Velocity */}
              <div className="bg-white border border-neutral-100 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Pipeline Velocity</span>
                  <span className="text-[10px] text-neutral-950 font-bold font-mono">14.8 Days</span>
                </div>
                <div className="h-28 relative flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path d="M0,35 Q20,10 40,25 T80,10 T100,5" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="40" cy="25" r="3.5" fill="#ea580c" />
                    <circle cx="80" cy="10" r="3.5" fill="#ea580c" />
                  </svg>
                  <span className="absolute bottom-2 text-[9px] text-neutral-400 font-bold font-mono">Avg Sourcing to Offer</span>
                </div>
              </div>

              {/* Graph 3: Candidate Conversion */}
              <div className="bg-white border border-neutral-100 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Candidate Conversion</span>
                  <span className="text-[10px] text-orange-500 font-black">2.4% Offer Rate</span>
                </div>
                <div className="h-28 flex flex-col justify-center gap-2">
                  {[
                    { label: 'Screened', w: '95%', val: '95%' },
                    { label: 'Interviewed', w: '40%', val: '40%' },
                    { label: 'Offered', w: '12%', val: '12%' }
                  ].map((conv, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-neutral-400">
                        <span>{conv.label}</span>
                        <span>{conv.val}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-950 rounded-full" style={{ width: conv.w }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side Column: Quick Actions, Candidate Spotlight, Notifications */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* SECTION 5: QUICK ACTIONS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-950">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => navigate('/recruiter/jobs')}
                className="w-full flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl hover:border-orange-500/20 shadow-xs hover:shadow-sm transition-all group cursor-pointer"
              >
                <span className="text-xs font-bold text-neutral-800 group-hover:text-orange-500 transition-colors">Post Job Requisition</span>
                <Plus size={14} className="text-orange-500" />
              </button>
              <button 
                onClick={() => navigate('/recruiter/interviews')}
                className="w-full flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl hover:border-orange-500/20 shadow-xs hover:shadow-sm transition-all group cursor-pointer"
              >
                <span className="text-xs font-bold text-neutral-800 group-hover:text-orange-500 transition-colors">Schedule Technical Round</span>
                <Calendar size={14} className="text-neutral-500" />
              </button>
              <button 
                onClick={() => navigate('/recruiter/candidates')}
                className="w-full flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl hover:border-orange-500/20 shadow-xs hover:shadow-sm transition-all group cursor-pointer"
              >
                <span className="text-xs font-bold text-neutral-800 group-hover:text-orange-500 transition-colors">Assign Coding Assessment</span>
                <Award size={14} className="text-neutral-400" />
              </button>
            </div>
          </div>

          {/* SECTION 6: CANDIDATE SPOTLIGHT */}
          <div className="bg-neutral-950 text-white rounded-[2.2rem] p-7 flex flex-col justify-between h-[360px] relative overflow-hidden shadow-xl border border-neutral-900">
            <div className="absolute top-[-30%] right-[-30%] w-[70%] h-[70%] bg-orange-500/10 blur-[90px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
              <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-500" />
                Candidate Spotlight
              </span>
              <button 
                onClick={() => navigate('/recruiter/candidates')}
                className="w-7 h-7 bg-neutral-900 border border-neutral-850 rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                <ExternalLink size={12} className="text-neutral-400" />
              </button>
            </div>

            {/* Match Circle */}
            <div className="my-3 flex items-center justify-center relative">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-neutral-800 flex items-center justify-center relative">
                <div className="w-20 h-20 rounded-full bg-neutral-900 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-xl font-mono font-black text-orange-500 leading-none">{spotlightCandidate.atsScore}%</span>
                  <span className="text-[7px] text-neutral-400 uppercase tracking-widest mt-1">Match Fit</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3.5 relative z-10">
              <div>
                <h4 className="text-sm font-extrabold text-neutral-200 truncate">{spotlightCandidate.name}</h4>
                <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{spotlightCandidate.role}</p>
              </div>

              {/* Skills pills */}
              <div className="flex gap-1.5 flex-wrap">
                {spotlightCandidate.skills.slice(0, 3).map(skill => (
                  <span key={skill} className="text-[8px] bg-neutral-900 text-neutral-400 font-bold px-2 py-0.5 rounded-full border border-neutral-850">
                    {skill}
                  </span>
                ))}
                {spotlightCandidate.skills.length > 3 && (
                  <span className="text-[8px] text-neutral-500 font-semibold">+{spotlightCandidate.skills.length - 3}</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 7: NOTIFICATIONS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-950">Notifications</h3>
            <div className="space-y-3">
              {notificationsList.map(notif => (
                <div key={notif.id} className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-neutral-100/50 shadow-xs">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    notif.type === 'review' ? 'bg-orange-500' :
                    notif.type === 'application' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-neutral-700 leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-neutral-400 mt-1 block font-bold font-mono uppercase">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
