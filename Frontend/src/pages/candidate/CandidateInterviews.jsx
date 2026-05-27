import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Video, Users, Link as LinkIcon, AlertCircle, 
  X, Check, Bell, Plus, Sparkles, Star, Clock, Inbox, ArrowUpRight, Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';

export default function CandidateInterviews() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedAppKey, setSelectedAppKey] = useState(''); // "candidate_id:job_id"
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const userEmail = localStorage.getItem('userEmail') || '';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInterviewsAndApplications = async () => {
    setLoading(true);
    try {
      const [interviewsData, appsData] = await Promise.all([
        api.interviews.myInterviews(userEmail),
        api.candidates.myApplications(userEmail)
      ]);
      setInterviews(interviewsData);
      setApplications(appsData);
      if (appsData.length > 0) {
        const activeApp = appsData[0];
        if (activeApp.candidate) {
          setSelectedAppKey(`${activeApp.candidate.id}:${activeApp.job}`);
        }
      }
    } catch (err) {
      showToast('Failed to fetch interviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewsAndApplications();
  }, [userEmail]);

  const handleCopyLink = (interviewId) => {
    const link = `${window.location.origin}/candidate/interview/${interviewId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedId(interviewId);
    showToast('Interview room URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendReminders = () => {
    showToast('Reminder notification pinged to hiring team!');
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedAppKey || !date || !time) {
      showToast('Please select an application and schedule window.', 'error');
      return;
    }

    const [candidateId, jobId] = selectedAppKey.split(':');
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      await api.interviews.schedule(candidateId, jobId, scheduledAt);
      showToast('Interview assessment scheduled successfully!');
      setShowScheduleModal(false);
      fetchInterviewsAndApplications();
    } catch (err) {
      showToast(err.message || 'Failed to schedule interview.', 'error');
    }
  };

  const handleOpenReschedule = (interview) => {
    setSelectedInterview(interview);
    const existingDate = new Date(interview.scheduled_at);
    // Format YYYY-MM-DD
    const yyyy = existingDate.getFullYear();
    const mm = String(existingDate.getMonth() + 1).padStart(2, '0');
    const dd = String(existingDate.getDate()).padStart(2, '0');
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    // Format HH:MM
    const hh = String(existingDate.getHours()).padStart(2, '0');
    const min = String(existingDate.getMinutes()).padStart(2, '0');
    setRescheduleTime(`${hh}:${min}`);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview || !rescheduleDate || !rescheduleTime) {
      showToast('Please specify reschedule date and time.', 'error');
      return;
    }

    try {
      const newScheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      await api.interviews.reschedule(selectedInterview.room_id, newScheduledAt);
      showToast('Interview session rescheduled successfully!');
      setShowRescheduleModal(false);
      fetchInterviewsAndApplications();
    } catch (err) {
      showToast(err.message || 'Failed to reschedule session.', 'error');
    }
  };

  // Group interviews
  const todayStr = new Date().toDateString();
  const tomorrowStr = new Date(Date.now() + 86400000).toDateString();

  const upcomingInterviews = interviews.filter(i => !i.completed_at && new Date(i.scheduled_at) >= new Date(Date.now() - 3600000));
  const pastInterviews = interviews.filter(i => i.completed_at || new Date(i.scheduled_at) < new Date(Date.now() - 3600000));

  const todayInterviews = upcomingInterviews.filter(i => new Date(i.scheduled_at).toDateString() === todayStr);
  const tomorrowInterviews = upcomingInterviews.filter(i => new Date(i.scheduled_at).toDateString() === tomorrowStr);
  const otherUpcomingInterviews = upcomingInterviews.filter(i => {
    const dStr = new Date(i.scheduled_at).toDateString();
    return dStr !== todayStr && dStr !== tomorrowStr;
  });

  return (
    <div className="space-y-8 select-none max-w-[1400px] mx-auto pb-20 animate-fade-in text-neutral-800">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 border border-white/10 ${
          toast.type === 'success' ? 'bg-neutral-950 text-white' : 'bg-rose-600'
        } animate-fade-in`}>
          <Check size={14} className="text-[#FCD34D]" /> {toast.msg}
        </div>
      )}

      {/* Header section matching premium mockup standards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-neutral-950 tracking-tight">Interview Portal</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider leading-relaxed">
            Access your collaborative video assessments, review coding sessions, and coordinate schedules.
          </p>
        </div>
        
        {/* Toggle Pill buttons: Orange Outlined when active instead of black */}
        <div className="flex bg-neutral-100 p-1.5 rounded-full shrink-0 self-start md:self-auto w-fit gap-1 border border-neutral-200/50">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upcoming' 
                ? 'border-2 border-orange-500 text-orange-500 bg-white font-extrabold shadow-xs' 
                : 'text-neutral-450 hover:text-neutral-900 border border-transparent'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'past' 
                ? 'border-2 border-orange-500 text-orange-500 bg-white font-extrabold shadow-xs' 
                : 'text-neutral-450 hover:text-neutral-900 border border-transparent'
            }`}
          >
            Past Sessions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Interviews schedules (xl:col-span-8) */}
        <div className="xl:col-span-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-3 border-orange-500/10 rounded-full"></div>
                <div className="absolute inset-0 border-3 border-t-orange-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : activeTab === 'upcoming' ? (
            <>
              {/* Today's Schedule Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs overflow-hidden">
                <div className="bg-neutral-50/50 px-8 py-5 border-b border-neutral-100/80">
                  <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon size={14} className="text-orange-500" /> Today's schedule
                  </h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {todayInterviews.length > 0 ? (
                    todayInterviews.map((interview) => {
                      const dateObj = new Date(interview.scheduled_at);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={interview.id} className="p-8 hover:bg-white/40 transition-colors">
                          <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-32 shrink-0">
                              <div className="text-base font-mono text-neutral-900 font-black">{timeStr}</div>
                              <div className="mt-3.5 inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                                <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider">Scheduled</span>
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                                <div>
                                  <h4 className="text-lg font-black text-neutral-950 tracking-tight">
                                    Live Technical Room
                                  </h4>
                                  <p className="text-xs font-semibold text-neutral-400 mt-1">
                                    {interview.job ? interview.job.title : 'Developer'} • Collaborative Coding Assessment
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleOpenReschedule(interview)}
                                    className="px-4 py-2 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-all cursor-pointer shadow-2xs"
                                  >
                                    Reschedule
                                  </button>
                                  <Link
                                    to={`/candidate/interview/${interview.room_id}`}
                                    className="px-5 py-2.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer focus:outline-hidden"
                                  >
                                    <Video size={13} /> Join Room
                                  </Link>
                                </div>
                              </div>
                              
                              <div className="mt-5 flex flex-wrap gap-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-200/40">
                                <div className="flex items-center gap-2">
                                  <Users size={12} className="text-neutral-400" />
                                  <span className="text-[10px] font-bold text-neutral-500">
                                    Interviewer: <span className="text-neutral-800">{interview.job?.company_name || 'Technical Interviewer'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-neutral-400 text-center py-16 text-xs font-bold uppercase tracking-wider italic">No interviews scheduled for today.</div>
                  )}
                </div>
              </div>

              {/* Tomorrow's Schedule Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs overflow-hidden">
                <div className="bg-neutral-50/50 px-8 py-5 border-b border-neutral-100/80">
                  <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon size={14} className="text-neutral-400" /> Tomorrow's schedule
                  </h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {tomorrowInterviews.length > 0 ? (
                    tomorrowInterviews.map(interview => {
                      const dateObj = new Date(interview.scheduled_at);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={interview.id} className="p-8 hover:bg-white/40 transition-colors">
                          <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-32 shrink-0">
                              <div className="text-base font-mono text-neutral-900 font-black">{timeStr}</div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                                <div>
                                  <h4 className="text-lg font-black text-neutral-950 tracking-tight">
                                    Live Technical Room
                                  </h4>
                                  <p className="text-xs font-semibold text-neutral-400 mt-1">
                                    {interview.job ? interview.job.title : 'Developer'} • Collaborative Coding
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleOpenReschedule(interview)}
                                    className="px-4 py-2 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-all cursor-pointer shadow-2xs"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => handleCopyLink(interview.room_id)}
                                    className={`px-5 py-2.5 border rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                      copiedId === interview.room_id 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-950 hover:bg-neutral-50'
                                    }`}
                                  >
                                    {copiedId === interview.room_id ? <Check size={12} /> : <LinkIcon size={12} />}
                                    {copiedId === interview.room_id ? 'Copied!' : 'Copy Link'}
                                  </button>
                                </div>
                              </div>
                              <div className="mt-5 flex flex-wrap gap-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-200/40">
                                <div className="flex items-center gap-2">
                                  <Users size={12} className="text-neutral-400" />
                                  <span className="text-[10px] font-bold text-neutral-500">
                                    Interviewer: <span className="text-neutral-800">{interview.job?.company_name || 'Technical Interviewer'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-neutral-400 text-center py-16 text-xs font-bold uppercase tracking-wider italic">No interviews scheduled for tomorrow.</div>
                  )}
                </div>
              </div>

              {/* Other Upcoming Sessions */}
              {otherUpcomingInterviews.length > 0 && (
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs overflow-hidden">
                  <div className="bg-neutral-50/50 px-8 py-5 border-b border-neutral-100/80">
                    <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={14} className="text-neutral-450" /> Upcoming Later
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {otherUpcomingInterviews.map(interview => {
                      const dateObj = new Date(interview.scheduled_at);
                      return (
                        <div key={interview.id} className="p-6 hover:bg-white/40 transition-colors animate-fade-in">
                          <div className="flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap">
                            <div>
                              <h4 className="text-xs font-black text-neutral-950 uppercase tracking-wider">
                                {interview.job ? interview.job.title : 'Live Technical Session'}
                              </h4>
                              <p className="text-[10px] text-neutral-400 mt-1 font-bold">
                                {dateObj.toLocaleDateString()} @ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {interview.job?.company_name || 'Talvex'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleOpenReschedule(interview)}
                                className="px-3 py-1.5 border border-neutral-200 hover:border-neutral-950 rounded-full text-[10px] font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-all cursor-pointer"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCopyLink(interview.room_id)}
                                className="px-4 py-1.5 border border-neutral-200 hover:border-neutral-950 rounded-full text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-950 bg-white transition-colors cursor-pointer"
                              >
                                <LinkIcon size={11} className="mr-1 inline" /> Copy Link
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Past Sessions log */
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs overflow-hidden">
              <div className="bg-neutral-50/50 px-8 py-5 border-b border-neutral-100/80">
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon size={14} className="text-neutral-400" /> Past Sessions Log
                </h3>
              </div>
              <div className="divide-y divide-neutral-100">
                {pastInterviews.length > 0 ? (
                  pastInterviews.map(interview => {
                    const dateObj = new Date(interview.scheduled_at);
                    const score = interview.feedback ? interview.feedback.technical_skills : null;
                    return (
                      <div key={interview.id} className="p-8 hover:bg-white/40 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-6">
                          <div className="sm:w-32 shrink-0">
                            <div className="text-xs font-mono text-neutral-400 font-extrabold">{dateObj.toLocaleDateString()}</div>
                            <div className="mt-3 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider font-mono">Completed</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="mb-3">
                              <h4 className="text-lg font-black text-neutral-950 tracking-tight leading-tight">
                                Live coding assessment
                              </h4>
                              <p className="text-xs font-semibold text-neutral-400 mt-1">{interview.job ? interview.job.title : 'Developer'} • {interview.job?.company_name || 'Talvex'}</p>
                            </div>
                            {interview.feedback && (
                              <div className="mt-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/50 text-[10px] text-neutral-500 font-bold flex items-center gap-3">
                                <Star size={14} className="text-orange-500 fill-orange-500" />
                                <span>Recommendation: <strong className="text-emerald-600">{interview.feedback.recommendation || 'N/A'}</strong></span>
                                <span className="text-neutral-200">|</span>
                                <span>ATS Match Score: <strong className="text-neutral-800">{score}/5</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-neutral-400 text-center py-16 text-xs font-bold uppercase tracking-wider italic">No completed sessions recorded in archives.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Actions, notifications, and metrics (xl:col-span-4) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Quick actions panel */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs p-6 space-y-5">
            <h3 className="text-sm font-black text-neutral-950 tracking-tight">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-xs shadow-neutral-100/30 cursor-pointer"
              >
                <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500"><Plus size={14} /></div>
                Schedule Mock / Actual
              </button>
              <Link
                to="/candidate/interview/adhoc"
                className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-xs shadow-neutral-100/30 block"
              >
                <div className="bg-neutral-950 p-2.5 rounded-xl text-white"><Video size={14} /></div>
                Start Ad-hoc Practice
              </Link>
              <button
                onClick={handleSendReminders}
                className="w-full text-left p-4 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-xs shadow-neutral-100/30 cursor-pointer"
              >
                <div className="bg-neutral-50 p-2.5 rounded-xl text-neutral-450 hover:text-orange-500 transition-colors"><Bell size={14} /></div>
                Request Recruiter Sync
              </button>
            </div>
          </div>

          {/* Interactive Reminders & Notifications Widget */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-neutral-950 tracking-tight">Notifications & Reminders</h3>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            </div>
            
            <div className="space-y-3.5">
              <div className="p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-2xl text-xs text-neutral-700 leading-relaxed font-semibold">
                <p className="text-orange-600 font-extrabold text-[9px] uppercase tracking-wider mb-1">⏰ Impending Interview</p>
                Ensure your screen sharing permissions are enabled in your OS before entering any live coding loops.
              </div>
              <div className="p-3.5 bg-neutral-50 border border-neutral-200/50 rounded-2xl text-xs text-neutral-500 leading-relaxed font-semibold">
                <p className="text-neutral-800 font-extrabold text-[9px] uppercase tracking-wider mb-1">💡 Ad-hoc Compiler Tip</p>
                Ad-hoc rooms let you practice on pre-seeded LeetCode problems in an identical real-time environment.
              </div>
              <div className="p-3.5 bg-neutral-50 border border-neutral-200/50 rounded-2xl text-xs text-neutral-500 leading-relaxed font-semibold font-mono">
                <p className="text-neutral-800 font-extrabold text-[9px] uppercase tracking-wider mb-1">📅 Auto Calendar Sync</p>
                Your schedule is automatically saved and matched against remote hiring manager timezones in real time.
              </div>
            </div>
          </div>

          {/* Overview stats panel */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.2rem] shadow-xs p-6 space-y-5">
            <h3 className="text-sm font-black text-neutral-950 tracking-tight">Overview</h3>
            <div className="space-y-4">
              {[
                { label: 'Total Scheduled', value: interviews.length, bullet: 'bg-orange-500' },
                { label: 'Completed Log', value: interviews.filter(i => i.completed_at).length, bullet: 'bg-emerald-500' },
                { label: 'Upcoming Window', value: upcomingInterviews.length, bullet: 'bg-neutral-800' }
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.bullet}`}></div>
                    <span className="text-neutral-500">{s.label}</span>
                  </div>
                  <span className="text-neutral-950 font-mono text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedInterview && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleRescheduleSubmit}>
              <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-orange-500" />
                  Reschedule Session
                </h2>
                <button 
                  type="button" 
                  onClick={() => setShowRescheduleModal(false)} 
                  className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="text-xs text-neutral-500 leading-relaxed font-semibold bg-neutral-50 p-4 rounded-2xl border border-neutral-200/50 mb-2">
                  Rescheduling live session for <strong className="text-neutral-950">{selectedInterview.job?.title || 'Engineer'}</strong> with <strong className="text-neutral-955">{selectedInterview.job?.company_name || 'Hiring Team'}</strong>.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">New Date</label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-850 rounded-2xl px-4 py-3 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">New Time</label>
                    <input
                      type="time"
                      required
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-850 rounded-2xl px-4 py-3 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowRescheduleModal(false)} 
                    className="px-5 py-2.5 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer focus:outline-hidden"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleSchedule}>
              <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-orange-500" />
                  Schedule Interview
                </h2>
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)} 
                  className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Active Requisitions</label>
                  <select
                    value={selectedAppKey}
                    onChange={(e) => setSelectedAppKey(e.target.value)}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <option value="">Select Requisition...</option>
                    {applications.map(app => (
                      <option key={app.id} value={`${app.candidate?.id}:${app.job}`}>
                        {app.job_title || 'N/A'} - {app.company_name || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-850 rounded-2xl px-4 py-3 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Time</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-850 rounded-2xl px-4 py-3 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleModal(false)} 
                    className="px-5 py-2.5 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer focus:outline-hidden"
                  >
                    Schedule Session
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
