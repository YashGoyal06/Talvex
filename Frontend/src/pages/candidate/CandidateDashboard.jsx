import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, Video, CheckCircle2, Clock, Inbox, X, 
  Briefcase, UserPlus, ArrowUpRight, Laptop, ShieldCheck, HelpCircle, 
  Star, FileText, Trash2, Upload, AlertCircle, Award, CheckCircle, Sparkles, User, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';

export default function CandidateDashboard() {
  const storedName = localStorage.getItem('userName') || 'Candidate';
  const userEmail = localStorage.getItem('userEmail') || '';

  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Candidate DB Profile details (resumes, certs, skills)
  const [profile, setProfile] = useState({
    skills: [],
    documents: [],
    certifications: []
  });

  // Modal apply states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidateName, setCandidateName] = useState(storedName);
  const [candidatePhone, setCandidatePhone] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsData, interviewsData, jobsData] = await Promise.all([
        api.candidates.myApplications(userEmail),
        api.interviews.myInterviews(userEmail),
        api.jobs.list()
      ]);
      setApplications(appsData || []);
      setInterviews(interviewsData || []);
      setJobs(jobsData || []);

      if (appsData && appsData.length > 0 && appsData[0].candidate) {
        const resume = appsData[0].candidate.parsed_resume || {};
        setProfile({
          skills: resume.skills || [],
          documents: resume.documents || [],
          certifications: resume.certifications || []
        });
      }
    } catch (err) {
      console.error('Failed to load candidate data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!candidateName || !resumeFile || !selectedJob) {
      setModalError('Full Name and Resume are required.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob.id);
      formData.append('name', candidateName);
      formData.append('email', userEmail);
      formData.append('phone', candidatePhone);
      formData.append('resume', resumeFile);
      formData.append('cover_letter', coverLetter);

      await api.candidates.apply(formData);

      setResumeFile(null);
      setCoverLetter('');
      setCandidatePhone('');
      setShowApplyModal(false);
      showToast('Application submitted successfully!');
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to submit application.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Document actions
  const handleUploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Uploading file...');
    try {
      const res = await api.auth.uploadFile(file, 'resumes');
      if (res.url) {
        const newDoc = { name: file.name, url: res.url, uploadedAt: new Date().toLocaleDateString() };
        const updatedDocs = [...profile.documents, newDoc];
        
        await api.candidates.updateProfile(userEmail, { documents: updatedDocs });
        setProfile(prev => ({ ...prev, documents: updatedDocs }));
        showToast('Document uploaded successfully!');
      }
    } catch (err) {
      console.error(err);
      showToast('Upload failed.');
    }
  };

  const handleDeleteDocument = async (docName) => {
    showToast('Deleting...');
    try {
      const updatedDocs = profile.documents.filter(d => d.name !== docName);
      await api.candidates.updateProfile(userEmail, { documents: updatedDocs });
      setProfile(prev => ({ ...prev, documents: updatedDocs }));
      showToast('Document deleted.');
    } catch (err) {
      console.error(err);
      showToast('Delete failed.');
    }
  };

  // ─── COMPUTE SECTIONS DATA ───
  // 5. Profile Completion
  const completionPercentage = Math.min(
    (profile.documents.length > 0 ? 35 : 0) + 
    (profile.skills.length > 0 ? 25 : 0) + 
    (profile.certifications.length > 0 ? 20 : 0) + 
    (applications.length > 0 ? 20 : 0),
    100
  );

  // 2. Upcoming Interviews
  const upcomingInterviews = interviews.filter(int => !int.completed_at);
  const nextInterview = upcomingInterviews.length > 0 ? upcomingInterviews[0] : null;

  // 3. Assessments Section
  const pendingAssessments = [];
  const completedScores = [];
  applications.forEach(app => {
    // If coding stage and not offered/rejected, mock a pending assessment
    if (app.current_stage?.toLowerCase() === 'coding') {
      pendingAssessments.push({ id: app.id, role: app.job_title, duration: '60 minutes', token: 'demo-token' });
    }
    // Completed assessments scores
    if (app.status === 'Offered' || app.status === 'Hired') {
      completedScores.push({ id: app.id, role: app.job_title, score: 92 });
    }
  });

  const successRate = completedScores.length > 0 
    ? Math.round(completedScores.reduce((acc, curr) => acc + curr.score, 0) / completedScores.length) + '%' 
    : '--';
  const interviewRate = applications.length > 0 
    ? Math.round((interviews.length / applications.length) * 100) + '%' 
    : '--';

  // 4. Recommended Jobs (mock suggestions based on skills)
  const recommendedJobs = jobs.filter(job => !applications.some(app => app.job === job.id)).slice(0, 3);

  // 6. Recent Activity
  const activityList = [];
  applications.slice(0, 2).forEach(app => {
    activityList.push({
      id: `act-app-${app.id}`,
      text: `Applied to ${app.job_title} at ${app.company_name}.`,
      date: new Date(app.created_at).toLocaleDateString()
    });
    if (app.status !== 'Active') {
      activityList.push({
        id: `act-state-${app.id}`,
        text: `Application for ${app.job_title} updated to: ${app.status}.`,
        date: 'Recent'
      });
    }
  });
  if (nextInterview) {
    activityList.push({
      id: 'act-int',
      text: `Scheduled Interview for ${nextInterview.job?.title || 'Engineer'}.`,
      date: 'Upcoming'
    });
  }
  if (activityList.length === 0) {
    activityList.push({ id: 'act-empty', text: 'Welcome to Tarvax! Set up your profile to begin.', date: 'Today' });
  }

  // 8. Notifications
  const notificationsList = [];
  if (nextInterview) {
    notificationsList.push({ id: 'not-int', type: 'invite', message: `Interview Invite: Technical coding round for ${nextInterview.job?.title}.` });
  }
  applications.forEach(app => {
    if (app.status === 'Offered') {
      notificationsList.push({ id: `not-off-${app.id}`, type: 'offer', message: `Congratulations! You received an offer for ${app.job_title}.` });
    } else if (app.status === 'Rejected') {
      notificationsList.push({ id: `not-rej-${app.id}`, type: 'rejection', message: `Application update: We decided not to move forward with your profile for ${app.job_title}.` });
    }
  });
  if (notificationsList.length === 0) {
    notificationsList.push({ id: 'not-welcome', type: 'info', message: 'Profile created. Explore open jobs and submit your resume.' });
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
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20 animate-fade-in text-neutral-800 select-none">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-neutral-800">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ─── TOP SECTION: PROFILE SUMMARY & PERFS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* 5. PROFILE COMPLETION WIDGET */}
        <div className="md:col-span-8 bg-white/70 backdrop-blur-xl border border-white/40 p-7 rounded-[2.2rem] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="text-lg font-black text-neutral-950">Profile Completion</h3>
              <span className="text-2xl font-black text-orange-500">{completionPercentage}%</span>
            </div>
            
            <div className="relative w-full h-[12px] bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50 mb-6">
              <div 
                className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={profile.documents.length > 0 ? 'text-emerald-500' : 'text-neutral-300'} />
                <span>Resume Uploaded</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={profile.skills.length > 0 ? 'text-emerald-500' : 'text-neutral-300'} />
                <span>Skills Listed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={profile.certifications.length > 0 ? 'text-emerald-500' : 'text-neutral-300'} />
                <span>Certifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={applications.length > 0 ? 'text-emerald-500' : 'text-neutral-300'} />
                <span>First Application</span>
              </div>
            </div>
          </div>
        </div>

        {/* 9. PERFORMANCE INSIGHTS WIDGET */}
        <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/40 p-7 rounded-[2.2rem] shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-neutral-950">Performance Insights</h3>
            <span className="text-[10px] text-neutral-400 font-bold uppercase mt-1 block">Test evaluations</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white border border-neutral-100 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-neutral-400 block mb-1">Assessment Success</span>
              <span className="text-xl font-black text-neutral-900">{successRate}</span>
            </div>
            <div className="bg-white border border-neutral-100 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-neutral-400 block mb-1">Interview Rate</span>
              <span className="text-xl font-black text-neutral-900">{interviewRate}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── MAIN HUB LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Columns (8/12): Application Overview, Recommended Jobs, Documents Manager */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. APPLICATION OVERVIEW */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-neutral-950">Application Overview</h3>
              <span className="text-[10px] bg-neutral-100 text-neutral-500 font-bold px-3 py-1 rounded-full">{applications.length} Active</span>
            </div>

            <div className="space-y-4">
              {applications.map(app => {
                let stageColor = 'bg-blue-50 text-blue-600 border-blue-100';
                if (app.current_stage?.toLowerCase() === 'applied') stageColor = 'bg-neutral-50 text-neutral-600 border-neutral-200';
                else if (app.current_stage?.toLowerCase() === 'screening') stageColor = 'bg-orange-50 text-orange-600 border-orange-100';
                else if (app.current_stage?.toLowerCase() === 'coding') stageColor = 'bg-purple-50 text-purple-600 border-purple-100';
                else if (app.current_stage?.toLowerCase() === 'interview') stageColor = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                else if (app.status === 'Offered' || app.status === 'Hired') stageColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                else if (app.status === 'Rejected') stageColor = 'bg-red-50 text-red-600 border-red-100';

                return (
                  <div key={app.id} className="bg-white border border-neutral-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <h4 className="text-xs font-black text-neutral-950">{app.job_title}</h4>
                      <p className="text-[10px] text-neutral-400 mt-1 font-semibold">{app.company_name} · Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border ${stageColor}`}>
                      {app.status === 'Active' ? app.current_stage : app.status}
                    </span>
                  </div>
                );
              })}
              {applications.length === 0 && (
                <div className="text-neutral-400 text-center text-xs py-8 bg-white border border-neutral-100 rounded-2xl">
                  You haven't submitted any applications yet.
                </div>
              )}
            </div>
          </div>

          {/* 4. RECOMMENDED JOBS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-5">
            <h3 className="text-lg font-extrabold text-neutral-950">Recommended Opportunities</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recommendedJobs.map(job => (
                <div key={job.id} className="bg-white border border-neutral-100 p-5 rounded-2xl flex flex-col justify-between shadow-xs group hover:border-orange-500/20 transition-all">
                  <div>
                    <h4 className="text-xs font-black text-neutral-950 truncate">{job.title}</h4>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">{job.department} • {job.location}</p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed mt-2.5 line-clamp-2">{job.description}</p>
                  </div>
                  
                  <button 
                    onClick={() => { setSelectedJob(job); setModalError(''); setShowApplyModal(true); }}
                    className="w-full mt-4 btn-whitish text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer shadow-xs focus:outline-hidden"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
              {recommendedJobs.length === 0 && (
                <div className="col-span-3 text-neutral-400 text-center text-xs py-6">No suggestions right now. Check back later!</div>
              )}
            </div>
          </div>

          {/* 10. DOCUMENTS & RESUME */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-7 rounded-[2.2rem] shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-neutral-950">Documents & Resumes</h3>
                <p className="text-[9px] text-neutral-400 font-semibold mt-1">Manage certifications and active resumes</p>
              </div>
              
              <label className="px-4 py-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-xs">
                <Upload size={12} /> Upload File
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleUploadDocument} className="hidden" />
              </label>
            </div>

            <div className="space-y-3">
              {profile.documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-neutral-800 truncate max-w-[200px] sm:max-w-xs">{doc.name}</h5>
                      <span className="text-[9px] text-neutral-400 mt-1 block font-mono">Uploaded on {doc.uploadedAt}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteDocument(doc.name)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {profile.documents.length === 0 && (
                <div className="text-neutral-400 text-center text-xs py-8 italic">No uploaded documents. Upload your CV to verify matching fits.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Columns (4/12): Upcoming Interviews, Assessments, Calendar, Activity, Notifications */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 2. UPCOMING INTERVIEWS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-950">Upcoming Interviews</h3>
            
            {nextInterview ? (
              <div className="bg-neutral-950 text-white p-4.5 rounded-2xl space-y-4 border border-neutral-900">
                <div>
                  <h4 className="text-xs font-black text-neutral-100 leading-none">{nextInterview.job?.title || 'Software Requisition'}</h4>
                  <p className="text-[10px] text-neutral-400 font-semibold mt-1.5">{nextInterview.company?.name || 'Tarvax Enterprise'}</p>
                  <p className="text-[9px] text-neutral-400 mt-1 font-mono">{new Date(nextInterview.scheduled_at).toLocaleString()}</p>
                </div>
                <Link 
                  to={`/candidate/interview/${nextInterview.room_id}`}
                  className="w-full block text-center py-2 border border-orange-500 hover:bg-orange-500 text-orange-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs"
                >
                  Join Code Room
                </Link>
              </div>
            ) : (
              <div className="text-neutral-400 text-center text-xs py-6">No upcoming code rounds.</div>
            )}
          </div>

          {/* 3. ASSESSMENTS SECTION */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-950">Assessments</h3>
            
            <div className="space-y-3">
              {pendingAssessments.map(ass => (
                <div key={ass.id} className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-purple-950">Pending: {ass.role}</h5>
                    <span className="text-[9px] text-purple-400 block font-mono mt-0.5">{ass.duration}</span>
                  </div>
                  <Link 
                    to={`/candidate/assessment/${ass.token}`}
                    className="text-[9px] bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-1.5 rounded transition-all shrink-0 uppercase"
                  >
                    Start
                  </Link>
                </div>
              ))}
              
              {completedScores.map((score, i) => (
                <div key={i} className="p-3.5 bg-white border border-neutral-100 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <h5 className="text-xs font-bold text-neutral-800">{score.role}</h5>
                    <span className="text-[9px] text-neutral-400 block mt-0.5">Completed</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Score: {score.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. CALENDAR / SCHEDULE */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-neutral-950">Schedule</h3>
              <CalendarIcon size={14} className="text-neutral-400" />
            </div>

            <div className="space-y-4 font-semibold">
              {upcomingInterviews.length > 0 ? (
                upcomingInterviews.map((int) => {
                  const d = new Date(int.scheduled_at);
                  const day = d.getDate();
                  const month = d.toLocaleString('default', { month: 'short' });
                  const timeRange = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={int.id} className="flex gap-3">
                      <div className="text-center w-8 text-[10px] font-mono text-neutral-400">
                        <span className="block font-black text-neutral-900">{day}</span> {month}
                      </div>
                      <div className="flex-1 bg-white border border-neutral-100 p-3 rounded-2xl shadow-xs">
                        <h5 className="text-xs font-black text-neutral-900 leading-none">{int.job?.title || 'Collaborative Coding'}</h5>
                        <p className="text-[9px] text-neutral-400 mt-1 font-mono">{timeRange}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-neutral-400 text-center text-xs py-6 italic font-medium">No upcoming interviews or events scheduled.</div>
              )}
            </div>
          </div>

          {/* 6. RECENT ACTIVITY */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-950">Recent Activity</h3>
            <div className="space-y-3 font-semibold text-xs leading-relaxed text-neutral-700">
              {activityList.map((act, i) => (
                <div key={i} className="flex justify-between items-start gap-4">
                  <p className="flex-1 text-neutral-600">{act.text}</p>
                  <span className="text-[8px] font-bold text-neutral-400 font-mono shrink-0 uppercase">{act.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 8. NOTIFICATIONS */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-[2.2rem] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-neutral-950">Notifications</h3>
              <Bell size={14} className="text-neutral-400" />
            </div>
            
            <div className="space-y-3">
              {notificationsList.map(notif => (
                <div key={notif.id} className="p-3.5 bg-white border border-neutral-100 rounded-2xl shadow-xs text-xs font-semibold text-neutral-700 flex gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    notif.type === 'offer' ? 'bg-emerald-500' :
                    notif.type === 'rejection' ? 'bg-red-500' : 'bg-orange-500'
                  }`}></div>
                  <p className="leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ─── ATS APPLY MODAL ─── */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-100 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative">
            
            {modalSubmitting && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-30 space-y-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-neutral-950 font-black text-lg">AI ATS Analyzer</h3>
                  <p className="text-xs text-neutral-500 font-bold px-8 animate-pulse leading-relaxed">
                    Uploading resume, matching skills taxonomies against req, and computing fit match...
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center p-6 border-b border-neutral-100">
              <div>
                <h2 className="text-xl font-black text-neutral-950 tracking-tight">Apply for Role</h2>
                <p className="text-xs text-neutral-500 font-bold mt-1">{selectedJob.title} ({selectedJob.department})</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-neutral-400 hover:text-neutral-800" disabled={modalSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text" required value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold"
                  placeholder="Yash Goyal"
                  disabled={modalSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email" required value={userEmail}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-400 rounded-2xl px-4 py-2.5 focus:outline-none text-xs font-semibold cursor-not-allowed"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    type="text" value={candidatePhone}
                    onChange={e => setCandidatePhone(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold"
                    placeholder="e.g. +91 9897422911"
                    disabled={modalSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Upload Resume (PDF, DOCX) *</label>
                <input
                  type="file" required accept=".pdf,.docx,.doc,.txt"
                  onChange={e => setResumeFile(e.target.files[0])}
                  className="w-full text-xs text-neutral-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 bg-neutral-50 border border-neutral-200 rounded-2xl p-2 focus:outline-none cursor-pointer"
                  disabled={modalSubmitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Cover Letter</label>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-850 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-neutral-400 text-xs font-semibold resize-none"
                  placeholder="Why are you a fit..."
                  disabled={modalSubmitting}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button type="button" onClick={() => setShowApplyModal(false)} className="text-xs font-bold text-neutral-400 hover:text-neutral-700 px-4 py-2" disabled={modalSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-whitish text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm flex items-center gap-1.5 focus:outline-hidden" disabled={modalSubmitting}>
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
