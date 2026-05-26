import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Video, Users, Link as LinkIcon, AlertCircle, X, Check, Bell, Plus, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';

export default function InterviewsView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedAppKey, setSelectedAppKey] = useState(''); // "candidate_id:job_id"
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInterviewsAndCandidates = async () => {
    setLoading(true);
    try {
      const [interviewsData, candidatesData] = await Promise.all([
        api.interviews.list(),
        api.candidates.list()
      ]);
      setInterviews(interviewsData);
      setCandidates(candidatesData);
      if (candidatesData.length > 0) {
        setSelectedAppKey(`${candidatesData[0].candidate.id}:${candidatesData[0].job}`);
      }
    } catch (err) {
      showToast('Failed to fetch scheduled interviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewsAndCandidates();
  }, []);

  const handleCopyLink = (interviewId) => {
    const link = `${window.location.origin}/candidate/interview/${interviewId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedId(interviewId);
    showToast('Interview link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendReminders = () => {
    showToast('Reminder emails sent to all upcoming interviewers!');
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedAppKey || !date || !time) {
      showToast('Please select a candidate, date, and time.', 'error');
      return;
    }

    const [candidateId, jobId] = selectedAppKey.split(':');
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      await api.interviews.schedule(candidateId, jobId, scheduledAt);
      showToast('Interview scheduled successfully!');
      setShowScheduleModal(false);
      fetchInterviewsAndCandidates();
    } catch (err) {
      showToast(err.message || 'Failed to schedule interview.', 'error');
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
    <div className="space-y-8 select-none">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 border border-white/10 ${
          toast.type === 'success' ? 'bg-neutral-950 text-white' : 'bg-rose-600'
        }`}>
          <Check size={14} className="text-orange-500" /> {toast.msg}
        </div>
      )}

      {/* Header section matching mockup standards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Interviews</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Manage your collaborative video assessments, review pipeline scorecards, and align feedback.
          </p>
        </div>
        
        <div className="flex bg-neutral-100 p-1 rounded-full shrink-0 self-start md:self-auto w-fit">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-white text-neutral-950 shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-950'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'past' 
                ? 'bg-white text-neutral-950 shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-950'
            }`}
          >
            Past Sessions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Interviews schedules */}
        <div className="xl:col-span-8 space-y-6">
          {loading ? (
            <div className="text-neutral-400 text-center py-12 text-xs font-bold uppercase tracking-wider animate-pulse">Synchronizing Interviews...</div>
          ) : activeTab === 'upcoming' ? (
            <>
              {/* Today */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm overflow-hidden">
                <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-100">
                  <h3 className="text-xs font-extrabold text-neutral-800 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-orange-500" /> Today's schedule
                  </h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {todayInterviews.length > 0 ? (
                    todayInterviews.map((interview, index) => {
                      const dateObj = new Date(interview.scheduled_at);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={interview.id} className="p-6 hover:bg-neutral-50/30 transition-colors">
                          <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-32 shrink-0">
                              <div className="text-sm font-mono text-neutral-800 font-extrabold">{timeStr}</div>
                              <div className="mt-3 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                                <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider">Scheduled</span>
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                                <div>
                                  <h4 className="text-base font-extrabold text-neutral-950">
                                    {interview.candidate ? `${interview.candidate.first_name} ${interview.candidate.last_name}` : 'Unknown Candidate'}
                                  </h4>
                                  <p className="text-xs font-semibold text-neutral-400 mt-1">{interview.job ? interview.job.title : 'Developer'} • Live Technical Room</p>
                                </div>
                                <Link
                                  to={`/recruiter/interview/${interview.room_id}`}
                                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
                                >
                                  <Video size={12} className="text-orange-500" /> Join Room
                                </Link>
                              </div>
                              
                              <div className="mt-4 flex flex-wrap gap-4 bg-neutral-50/50 p-3.5 rounded-2xl border border-neutral-100/60">
                                <div className="flex items-center gap-2">
                                  <Users size={12} className="text-neutral-400" />
                                  <span className="text-[10px] font-bold text-neutral-500">
                                    Interviewer: <span className="text-neutral-800">Sarah Jenkins</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-neutral-400 text-center py-12 text-xs font-semibold italic">No interviews scheduled for today.</div>
                  )}
                </div>
              </div>

              {/* Tomorrow */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm overflow-hidden">
                <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-100">
                  <h3 className="text-xs font-extrabold text-neutral-800 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-neutral-400" /> Tomorrow's schedule
                  </h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {tomorrowInterviews.length > 0 ? (
                    tomorrowInterviews.map(interview => {
                      const dateObj = new Date(interview.scheduled_at);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={interview.id} className="p-6 hover:bg-neutral-50/30 transition-colors">
                          <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-32 shrink-0">
                              <div className="text-sm font-mono text-neutral-800 font-extrabold">{timeStr}</div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                                <div>
                                  <h4 className="text-base font-extrabold text-neutral-950">
                                    {interview.candidate ? `${interview.candidate.first_name} ${interview.candidate.last_name}` : 'Unknown Candidate'}
                                  </h4>
                                  <p className="text-xs font-semibold text-neutral-400 mt-1">{interview.job ? interview.job.title : 'Developer'} • Collaborative Coding</p>
                                </div>
                                <button
                                  onClick={() => handleCopyLink(interview.room_id)}
                                  className={`px-4 py-2 border rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                    copiedId === interview.room_id 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-900 hover:text-neutral-950'
                                  }`}
                                >
                                  {copiedId === interview.room_id ? <Check size={12} /> : <LinkIcon size={12} />}
                                  {copiedId === interview.room_id ? 'Copied!' : 'Copy Link'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-neutral-400 text-center py-12 text-xs font-semibold italic">No interviews scheduled for tomorrow.</div>
                  )}
                </div>
              </div>

              {/* Other Upcoming */}
              {otherUpcomingInterviews.length > 0 && (
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm overflow-hidden">
                  <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-100">
                    <h3 className="text-xs font-extrabold text-neutral-800 flex items-center gap-2">
                      <CalendarIcon size={14} className="text-neutral-400" /> Upcoming Later
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {otherUpcomingInterviews.map(interview => {
                      const dateObj = new Date(interview.scheduled_at);
                      return (
                        <div key={interview.id} className="p-6 hover:bg-neutral-50/30 transition-colors">
                          <div className="flex justify-between items-center gap-4">
                            <div>
                              <h4 className="text-xs font-extrabold text-neutral-950">
                                {interview.candidate ? `${interview.candidate.first_name} ${interview.candidate.last_name}` : 'Unknown Candidate'}
                              </h4>
                              <p className="text-[10px] text-neutral-400 mt-1 font-semibold">
                                {dateObj.toLocaleDateString()} @ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopyLink(interview.room_id)}
                              className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-950 rounded-full text-[10px] font-bold text-neutral-500 hover:text-neutral-950 bg-white transition-colors"
                            >
                              <LinkIcon size={11} /> Copy Link
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-100">
                <h3 className="text-xs font-extrabold text-neutral-800 flex items-center gap-2">
                  <CalendarIcon size={14} className="text-neutral-400" /> Past Sessions Log
                </h3>
              </div>
              <div className="divide-y divide-neutral-100">
                {pastInterviews.length > 0 ? (
                  pastInterviews.map(interview => {
                    const dateObj = new Date(interview.scheduled_at);
                    const score = interview.feedback ? interview.feedback.technical_skills : null;
                    return (
                      <div key={interview.id} className="p-6 hover:bg-neutral-50/30 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-6">
                          <div className="sm:w-32 shrink-0">
                            <div className="text-xs font-mono text-neutral-400 font-extrabold">{dateObj.toLocaleDateString()}</div>
                            <div className="mt-3 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider font-mono">Completed</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="mb-2">
                              <h4 className="text-base font-extrabold text-neutral-950">
                                {interview.candidate ? `${interview.candidate.first_name} ${interview.candidate.last_name}` : 'Unknown Candidate'}
                              </h4>
                              <p className="text-xs font-semibold text-neutral-400 mt-1">{interview.job ? interview.job.title : 'Developer'}</p>
                            </div>
                            {interview.feedback && (
                              <div className="mt-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100 text-[10px] text-neutral-500 font-bold flex items-center gap-2.5">
                                <Star size={12} className="text-orange-500 fill-orange-500" />
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
                  <div className="text-neutral-400 text-center py-12 text-xs font-semibold italic">No completed sessions recorded in archives.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Actions & metrics */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Quick actions panel */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-neutral-950">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full text-left p-3.5 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-sm shadow-neutral-100/30"
              >
                <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><CalendarIcon size={14} /></div>
                Schedule New Interview
              </button>
              <Link
                to="/recruiter/interview/adhoc"
                className="w-full text-left p-3.5 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-sm shadow-neutral-100/30 block"
              >
                <div className="bg-neutral-950 p-2 rounded-xl text-white"><Video size={14} /></div>
                Start Ad-hoc Room
              </Link>
              <button
                onClick={handleSendReminders}
                className="w-full text-left p-3.5 bg-white hover:bg-neutral-50 border border-neutral-100/60 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-3 transition-all hover:translate-x-0.5 shadow-sm shadow-neutral-100/30"
              >
                <div className="bg-neutral-50 p-2 rounded-xl text-neutral-400 hover:text-orange-500 transition-colors"><Bell size={14} /></div>
                Send Reminder Emails
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-neutral-950">This Month</h3>
            <div className="space-y-3.5">
              {[
                { label: 'Total Scheduled', value: interviews.length, bullet: 'bg-orange-500' },
                { label: 'Completed', value: interviews.filter(i => i.completed_at).length, bullet: 'bg-emerald-500' },
                { label: 'Upcoming Later', value: upcomingInterviews.length, bullet: 'bg-neutral-800' }
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.bullet}`}></div>
                    <span className="text-neutral-500">{s.label}</span>
                  </div>
                  <span className="text-neutral-950 font-mono">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-[2.2rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <form onSubmit={handleSchedule}>
              <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-orange-500" />
                  Schedule Interview
                </h2>
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)} 
                  className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-950 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Candidate Application</label>
                  <select
                    value={selectedAppKey}
                    onChange={(e) => setSelectedAppKey(e.target.value)}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <option value="">Select Candidate...</option>
                    {candidates.map(app => (
                      <option key={app.id} value={`${app.candidate?.id}:${app.job}`}>
                        {app.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Unknown'} - {app.job_title || 'N/A'}
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
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Time</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:bg-white text-xs font-semibold shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleModal(false)} 
                    className="px-4 py-2 border border-neutral-200 hover:border-neutral-950 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all shadow-md"
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
