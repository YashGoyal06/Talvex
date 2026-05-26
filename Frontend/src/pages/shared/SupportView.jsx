import React, { useState } from 'react';
import { HelpCircle, BookOpen, MessageCircle, Video, ChevronDown, ChevronUp, ExternalLink, Mail, Search, Zap, Shield, Clock, Users, Check, Sparkles, PhoneCall } from 'lucide-react';

const faqs = {
  recruiter: [
    { q: 'How do I add a new candidate to the pipeline?', a: 'Go to Candidates → click "Add Candidate" in the top right. Fill in their name, role, and AI match score. The candidate will be added at the Applied stage.' },
    { q: 'How do I schedule an interview?', a: 'Open the Interviews section and click "Schedule New Interview" in the Quick Actions sidebar. Select the candidate, interview type, date, time, and interviewers. Calendar invites are sent automatically.' },
    { q: 'How does AI Match Score work?', a: 'Our AI analyzes the candidate\'s resume, skills, and experience against the job requirements. Scores above 90% indicate an excellent fit. Scores can be manually adjusted by recruiters.' },
    { q: 'Can I invite external interviewers to a session?', a: 'Yes! When scheduling, add their email in the "Interviewers" field. They will receive a calendar invite with the interview room link. They do not need a HireSync account.' },
    { q: 'How do I move a candidate between pipeline stages?', a: 'Open the candidate\'s profile and scroll to "Update Stage". Click the desired stage. The candidate\'s timeline is updated automatically.' },
    { q: 'What is an Ad-hoc Room?', a: 'An ad-hoc room is an instant interview room you can start without scheduling. Useful for impromptu calls. Use "Start Ad-hoc Room" in the Interviews section.' },
    { q: 'How do I send reminder emails to interviewers?', a: 'In the Interviews section, click "Send Reminder Emails" in the Quick Actions panel. This sends reminders to all interviewers scheduled for upcoming sessions today.' },
    { q: 'Can I export candidate data?', a: 'Currently, candidate data can be viewed in the pipeline. Full CSV/PDF export is coming in a future update. Contact support for manual data exports.' },
  ],
  candidate: [
    { q: 'How do I join my interview session?', a: 'You will receive an email with your interview link. Click the link to join. Make sure your camera and microphone are enabled in your browser.' },
    { q: 'What equipment do I need for a live interview?', a: 'You need a stable internet connection, a working webcam, and a microphone. We recommend using Google Chrome or Firefox for the best experience.' },
    { q: 'Is my code shared with the interviewer during the live session?', a: 'Yes — the code editor is collaborative. Both you and the interviewer can see and edit code in real time. Only interviewers can see the Private Panel.' },
    { q: 'What happens if I lose connection during the interview?', a: 'Simply rejoin using the same link. The session remains active for 30 minutes after a disconnect. Notify your interviewer via email if needed.' },
    { q: 'Can I see my interview feedback?', a: 'Interview feedback is currently shared through your recruiter. Ask them to share the scorecard after your session.' },
    { q: 'How do I reschedule an interview?', a: 'Contact your recruiter directly via the email in your invitation. They can reschedule from their dashboard and send you a new invite.' },
    { q: 'What coding languages are supported in the interview room?', a: 'The interview room supports JavaScript, Python, Java, C++, TypeScript, Go, Ruby, and more. You can switch languages from the editor toolbar.' },
    { q: 'How early should I join the interview room?', a: 'We recommend joining 5 minutes early to test your camera and microphone. The interviewer will be notified when you join.' },
  ],
};

export default function SupportView() {
  const [role, setRole] = useState('recruiter');
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredFaqs = faqs[role].filter(
    f =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const guides = role === 'recruiter'
    ? [
        { title: 'Setting Up Your First Pipeline', icon: <Zap size={16} />, time: '5 min read', color: 'from-orange-500 to-neutral-900' },
        { title: 'AI Matching: Best Practices', icon: <Shield size={16} />, time: '8 min read', color: 'from-neutral-800 to-neutral-950' },
        { title: 'Running Great Live Interviews', icon: <Video size={16} />, time: '6 min read', color: 'from-orange-600 to-orange-700' },
        { title: 'Team Collaboration Features', icon: <Users size={16} />, time: '4 min read', color: 'from-slate-400 to-slate-500' },
      ]
    : [
        { title: 'Preparing for Your Interview', icon: <Clock size={16} />, time: '5 min read', color: 'from-orange-500 to-neutral-900' },
        { title: 'Navigating the Code Editor', icon: <Zap size={16} />, time: '3 min read', color: 'from-neutral-800 to-neutral-950' },
        { title: 'Tips for Remote Interviews', icon: <Video size={16} />, time: '7 min read', color: 'from-orange-600 to-orange-700' },
        { title: 'What Recruiters Look For', icon: <Shield size={16} />, time: '6 min read', color: 'from-slate-400 to-slate-500' },
      ];

  return (
    <div className="space-y-8 select-none relative">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-neutral-800">
          <Sparkles size={14} className="text-orange-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header section matching mockup standards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">Help & Support</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">
            Find immediate answers, browse platform guides, or open active tickets with our developer team.
          </p>
        </div>
        
        {/* Toggle switch for recruiter vs candidate help */}
        <div className="flex gap-1.5 bg-neutral-100 p-1.5 rounded-full shrink-0 self-start md:self-auto w-fit">
          <button
            onClick={() => { setRole('recruiter'); setOpenFaq(null); setSearchQuery(''); }}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              role === 'recruiter' 
                ? 'border-2 border-orange-500 text-orange-500 bg-transparent shadow-sm' 
                : 'text-neutral-450 hover:text-neutral-950 border border-transparent'
            }`}
          >
            🏢 Recruiter Center
          </button>
          <button
            onClick={() => { setRole('candidate'); setOpenFaq(null); setSearchQuery(''); }}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              role === 'candidate' 
                ? 'border-2 border-orange-500 text-orange-500 bg-transparent shadow-sm' 
                : 'text-neutral-450 hover:text-neutral-950 border border-transparent'
            }`}
          >
            👤 Candidate Center
          </button>
        </div>
      </div>

      {/* Hero Banner styled in subtle ambient glass */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-sm relative overflow-hidden flex items-start gap-6">
        <div className="absolute top-[-30%] right-[-20%] w-[50%] h-[150%] bg-orange-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="w-14 h-14 rounded-2xl bg-neutral-950 flex items-center justify-center text-orange-500 shadow-md shrink-0">
          <HelpCircle size={22} className="animate-pulse" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-neutral-950">
            {role === 'recruiter' ? 'Recruiter Knowledgebase' : 'Candidate Knowledgebase'}
          </h3>
          <p className="text-xs text-neutral-400 font-semibold leading-relaxed max-w-2xl mt-1.5">
            {role === 'recruiter'
              ? 'Everything you need to orchestrate a world-class evaluation process — from drafting job descriptions to launching live coding challenges.'
              : 'Detailed visual instructions on joining collaborative assessments, starting video calls, and reviewing test results.'}
          </p>
        </div>
      </div>

      {/* Quick Guides Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <BookOpen size={14} className="text-orange-500" /> Platform Walkthroughs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {guides.map((g, i) => (
            <div 
              key={i} 
              onClick={() => showToast(`Launching guide: ${g.title}`)} 
              className="bg-white hover:bg-neutral-50 p-5 rounded-2xl border border-neutral-100 hover:border-orange-500/20 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform shadow-sm`}>
                {g.icon}
              </div>
              <h4 className="text-xs font-extrabold text-neutral-850 mb-1 group-hover:text-orange-600 transition-colors leading-snug line-clamp-2 min-h-[2rem]">
                {g.title}
              </h4>
              <div className="text-[10px] text-neutral-400 font-bold flex items-center gap-1.5 mt-2.5">
                <Clock size={11} /> {g.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs Panel with Accordions */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <MessageCircle size={14} className="text-orange-500" /> Frequently Asked Questions
        </h3>
        
        {/* Search FAQ input pill */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Type search terms to query FAQs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-5 py-2.5 bg-white/70 backdrop-blur-md border border-neutral-200 rounded-full text-xs font-semibold focus:outline-none focus:border-neutral-950 placeholder-neutral-300 shadow-sm"
          />
        </div>

        {/* Collapsible FAQ cards list */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                >
                  <span className="text-xs font-extrabold text-neutral-800 pr-6 leading-relaxed">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp size={14} className="text-orange-500 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-neutral-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4.5 text-xs text-neutral-500 leading-relaxed border-t border-neutral-50/50 pt-3.5 font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredFaqs.length === 0 && (
            <div className="text-center py-8 text-neutral-400 text-xs font-semibold italic">No results found matching "{searchQuery}"</div>
          )}
        </div>
      </div>

      {/* Support tickets contact widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: <Mail size={18} />,
            title: 'Developer Mail Support',
            desc: 'Get technical assistance from core engine programmers.',
            action: 'support@talvex.com',
            color: 'from-orange-500 to-neutral-900',
          },
          {
            icon: <MessageCircle size={18} />,
            title: 'Recruiter Chat Sync',
            desc: 'Real-time alignment sync with platform specialists.',
            action: 'Start Sync chat →',
            color: 'from-neutral-800 to-neutral-950',
          },
          {
            icon: <PhoneCall size={18} />,
            title: 'Direct Video Call',
            desc: 'Arrange shared workspace screens for support.',
            action: 'Connect call →',
            color: 'from-orange-600 to-orange-700',
          },
        ].map((c, i) => (
          <div 
            key={i} 
            onClick={() => showToast(`Opening ${c.title}...`)} 
            className="bg-white hover:bg-neutral-50 p-5 rounded-2xl border border-neutral-100 hover:border-orange-500/20 shadow-sm cursor-pointer transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform shadow-sm`}>
              {c.icon}
            </div>
            <h4 className="text-xs font-extrabold text-neutral-800 mb-1 leading-none">{c.title}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-semibold leading-relaxed mb-4">{c.desc}</p>
            <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1 hover:text-orange-600 transition-colors">
              {c.action} <ExternalLink size={10} />
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
