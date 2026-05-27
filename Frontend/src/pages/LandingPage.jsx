import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useAnimationFrame,
  useMotionValue,
  useInView,
} from 'framer-motion';
import { Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';

// ─── Custom Tailwind Global Styles Inserted ───────────────────────────────
const styleInject = `
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-cursor-blink {
    animation: cursor-blink 1s step-end infinite;
  }
`;
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = styleInject;
  document.head.appendChild(styleTag);
}

// ─── Image Path Placeholders ──────────────────────────────────────────────
const RECRUITER_IMAGE_PATH = "recruiter.png"; 
const CANDIDATE_IMAGE_PATH = "candidate.png"; 

const DEV_SLIDE_1_IMAGE_PATH = "full_stack_developer.png";
const DEV_SLIDE_2_IMAGE_PATH = "frontend_developer.png";
const DEV_SLIDE_3_IMAGE_PATH = "backend_developer.jpeg";

// ─── 18 Unique Technical Blog Cards ───────────────────────────────────────
const BLOG_DATA = [
  { id: 1, title: 'Scaling Real-Time Interview Hubs with Django Channels', date: 'May 24, 2026', cat: 'WebSockets', img: 'blog_cards/blog01.png' },
  { id: 2, title: 'Beyond Regex: Building a Bulletproof Resume Parser with pdfplumber', date: 'May 22, 2026', cat: 'Backend', img: 'blog_cards/blog02.png' },
  { id: 3, title: 'Optimizing Drag-and-Drop Pipelines in React 19 Kanban Boards', date: 'May 20, 2026', cat: 'Frontend', img: 'blog_cards/blog03.png' },
  { id: 4, title: 'Securing Recruitment Loops: Stateless 2FA Authentication with OTP', date: 'May 18, 2026', cat: 'Security', img: 'blog_cards/blog04.png' },
  { id: 5, title: 'Architecting Asymmetric Dual-Portal Route Guards in React Router v7', date: 'May 16, 2026', cat: 'Routing', img: 'blog_cards/blog05.png' },
  { id: 6, title: 'Asynchronous Background Extraction of Multi-Column DOCX Layouts', date: 'May 14, 2026', cat: 'Parsing', img: 'blog_cards/blog06.png' },
  { id: 7, title: 'Managing Race Conditions in Live Assessment WebSocket Rooms', date: 'May 12, 2026', cat: 'Real-Time', img: 'blog_cards/blog07.png' },
  { id: 8, title: 'Designing Tailwind CSS v4 Utility Theme Systems for Dark Mode Panels', date: 'May 10, 2026', cat: 'Styling', img: 'blog_cards/blog08.png' },
  { id: 9, title: 'Mitigating Memory Overheads in High-Concurrency Daphne ASGI Servers', date: 'May 08, 2026', cat: 'DevOps', img: 'blog_cards/blog09.png' },
  { id: 10, title: 'Optimistic State Updates in Complex Multi-Panel Grading Dashboards', date: 'May 06, 2026', cat: 'State', img: 'blog_cards/blog10.png' },
  { id: 11, title: 'Indexing PostgreSQL for Fast Search across Structured Resume Parsings', date: 'May 04, 2026', cat: 'Database', img: 'blog_cards/blog11.png' },
  { id: 12, title: 'Building Custom Component Sandboxes with Vite Layout Compilations', date: 'May 02, 2026', cat: 'Tools', img: 'blog_cards/blog12.png' },
  { id: 13, title: 'Preventing Token Side-Jacking: Bulletproofing HTTP-Only JWT Strategies', date: 'Apr 30, 2026', cat: 'Security', img: 'blog_cards/blog13.png' },
  { id: 14, title: 'Custom Python Middleware for Request Deflation and Logging Pipelines', date: 'Apr 28, 2026', cat: 'Backend', img: 'blog_cards/blog14.png' },
  { id: 15, title: 'Handling Network Drops and Reconnections gracefully in WebSockets', date: 'Apr 26, 2026', cat: 'Channels', img: 'blog_cards/blog15.png' },
  { id: 16, title: 'Evolving Database Schemas smoothly under Django Migration Hierarchies', date: 'Apr 24, 2026', cat: 'Database', img: 'blog_cards/blog16.png' },
  { id: 17, title: 'Micro-interactions and Physics Transforms in Modern Framer Motion UI', date: 'Apr 22, 2026', cat: 'Animation', img: 'blog_cards/blog17.png' },
  { id: 18, title: 'Profiling Redis Memory Lifespans for Active Assessment Channels', date: 'Apr 20, 2026', cat: 'Infrastructure', img: 'blog_cards/blog18.png' },
];

const NAV_LINKS = [
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'For Recruiters', href: '#recruiters' },
  { label: 'For Candidates', href: '#candidates' },
];

// ─── Typewriter hook ──────────────────────────────────────────────────────
function useTypewriter(text, speed = 38, startDelay = 200) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    
    let i = 0;
    const timeout = setTimeout(() => {
      setDisplayed('');
      setDone(false);

      const interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    
    return () => clearTimeout(timeout);
  }, [inView, text, speed, startDelay]);

  return { displayed, done, ref };
}

// ─── Image carousel for "Built for developers" ────────────────────────────
const DEV_SLIDES = [
  { id: 0, bg: 'bg-neutral-100', imgPath: DEV_SLIDE_1_IMAGE_PATH, alt: 'Developer coding workflow workspace' },
  { id: 1, bg: 'bg-neutral-100', imgPath: DEV_SLIDE_2_IMAGE_PATH, alt: 'Vibe-coding hobbyist dashboard' },
  { id: 2, bg: 'bg-neutral-100', imgPath: DEV_SLIDE_3_IMAGE_PATH, alt: 'Enterprise codebase tool integrations' },
];

function DevCarousel() {
  const [active, setActive] = useState(0);
  const prev = () => setActive((a) => (a - 1 + DEV_SLIDES.length) % DEV_SLIDES.length);
  const next = () => setActive((a) => (a + 1) % DEV_SLIDES.length);

  return (
    <div>
      {/* Slides */}
      <div className="relative overflow-hidden rounded-3xl w-full h-[480px] bg-neutral-100">
        {DEV_SLIDES.map((slide, idx) => (
          <motion.div
            key={slide.id}
            className={`absolute inset-0 rounded-3xl flex items-center justify-center ${slide.bg}`}
            initial={false}
            animate={{
              x: `${(idx - active) * 100}%`,
              opacity: idx === active ? 1 : 0.4,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          >
            {slide.imgPath ? (
              <img 
                src={slide.imgPath} 
                alt={slide.alt} 
                className="w-full h-full object-cover rounded-3xl" 
              />
            ) : (
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Developer Slide {slide.id + 1} Placeholder
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Dot indicators + arrows */}
      <div className="flex items-center justify-between mt-6 px-1">
        <div className="flex gap-2">
          {DEV_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-neutral-900' : 'w-1.5 bg-neutral-300'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full border border-neutral-200 hover:border-orange-500 flex items-center justify-center text-neutral-500 hover:text-orange-600 transition-all bg-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full border border-neutral-200 hover:border-orange-500 flex items-center justify-center text-neutral-500 hover:text-orange-600 transition-all bg-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const blogContainerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const cur = window.scrollY;
      setNavVisible(!(cur > lastScrollY.current && cur > 80));
      lastScrollY.current = cur;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollBlogs = (direction) => {
    if (blogContainerRef.current) {
      const scrollAmount = 340; 
      blogContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Typewriter headings config
  const HEADING = 'One platform.\nTwo sides of hiring.';
  const { displayed, done, ref: twRef } = useTypewriter(HEADING, 36, 300);

  const RECRUITER_HEADING = 'For Recruiters';
  const { displayed: recruiterDisplayed, done: recruiterDone, ref: recruiterTwRef } = useTypewriter(RECRUITER_HEADING, 45, 200);

  const CANDIDATE_HEADING = 'For Candidates';
  const { displayed: candidateDisplayed, done: candidateDone, ref: candidateTwRef } = useTypewriter(CANDIDATE_HEADING, 45, 200);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden text-neutral-900 antialiased selection:bg-orange-100">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: navVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100/60"
      >
        <div className="w-full px-6 md:px-12 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img src="/talvax_logo_navbar.png" alt="Talvax" className="w-8 h-8" />
          </Link>

          <div className="hidden md:flex items-center gap-8 mx-auto">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}
                className="text-sm font-medium text-neutral-600 hover:text-orange-600 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to="/login"
              className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/signup"
              className="text-sm text-white px-5 py-2.5 rounded-full font-semibold bg-orange-600 hover:bg-orange-700 transition-all shadow-sm shadow-orange-600/20">
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-neutral-500 hover:text-neutral-950 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-100 bg-white px-6 py-6 space-y-4 shadow-xl">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
                className="block text-neutral-700 font-medium py-2 hover:text-orange-600">
                {l.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/login" className="w-full text-center py-2.5 rounded-full font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="w-full text-center py-2.5 rounded-full font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </motion.nav>

      {/* ── Hero Parallax ── */}
      <HeroParallax products={BLOG_DATA} />

      {/* ══════════════════════════════════════════════════════════════════
          Section: One platform. Two sides of hiring.
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-32 px-6 md:px-16 bg-white border-t border-neutral-100 relative z-30">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Introduction Intro */}
          <div className="mb-24 max-w-5xl">
            <h2
              ref={twRef}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-950 leading-[1.05] mb-4 whitespace-pre-line min-h-[10rem] md:min-h-[15rem]"
            >
              {displayed}
              <span className={`inline-block w-[4px] h-[0.9em] bg-orange-500 ml-2 align-middle ${
                done ? 'animate-cursor-blink' : 'animate-pulse'
              }`} />
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-neutral-500 leading-relaxed max-w-2xl"
            >
              Talvax connects candidates and recruiters in a single seamless
              workflow, from the moment a job goes live to the final offer.
              Apply, assess, interview, and decide. All in one place.
            </motion.p>
          </div>

          {/* Sequential Feature Rows with explicit space-y-10 alignment */}
          <div className="space-y-10">
            
            {/* ── ROW 1: For Recruiters ── */}
            <div id="recruiters" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55 }}
              >
                <h3 ref={recruiterTwRef} className="text-4xl font-extrabold text-neutral-900 mb-5 tracking-tight min-h-[2.75rem]">
                  {recruiterDisplayed}
                  {!recruiterDone && (
                    <span className="inline-block w-[3px] h-[0.85em] bg-orange-500 ml-1.5 align-middle animate-pulse" />
                  )}
                </h3>
                <p className="text-lg text-neutral-500 leading-relaxed max-w-xl">
                  Build your talent pipeline faster. Post jobs, screen candidates
                  with AI-powered ATS scoring, send coding assessments, conduct
                  live technical interviews, and close hires, all from one
                  unified dashboard without switching tools.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="w-full lg:col-span-6 aspect-[3/4] md:aspect-[2/3] max-w-lg lg:ml-auto rounded-[2rem] overflow-hidden bg-neutral-100 border border-neutral-200/50 shadow-sm flex items-center justify-center"
              >
                {RECRUITER_IMAGE_PATH ? (
                  <img src={RECRUITER_IMAGE_PATH} alt="Recruiter Workspace Dashboard" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Recruiter Portrait Placeholder</span>
                )}
              </motion.div>
            </div>

            {/* ── ROW 2: For Candidates ── */}
            <div id="candidates" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55 }}
              >
                <h3 ref={candidateTwRef} className="text-4xl font-extrabold text-neutral-900 mb-5 tracking-tight min-h-[2.75rem]">
                  {candidateDisplayed}
                  {!candidateDone && (
                    <span className="inline-block w-[3px] h-[0.85em] bg-orange-500 ml-1.5 align-middle animate-pulse" />
                  )}
                </h3>
                <p className="text-lg text-neutral-500 leading-relaxed max-w-xl">
                  Find opportunities that match your skills and apply in minutes.
                  Track every stage of your application in real time, take
                  company assessments online, and join live technical interviews,
                  all in one place, from any device.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="w-full lg:col-span-6 aspect-[3/4] md:aspect-[2/3] max-w-lg lg:ml-auto rounded-[2rem] overflow-hidden bg-neutral-100 border border-neutral-200/50 shadow-sm flex items-center justify-center"
              >
                {CANDIDATE_IMAGE_PATH ? (
                  <img src={CANDIDATE_IMAGE_PATH} alt="Candidate Live Interview Portal" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Candidate Portrait Placeholder</span>
                )}
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section: Built for developers ── */}
      <section className="py-24 px-6 md:px-16 bg-white border-t border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 max-w-xl leading-tight">
              Built by developers<br />for the TECH era
            </h2>
            <p className="text-base text-neutral-500 max-w-md leading-relaxed">
              Talvax is built for user trust, whether you're a professional
              developer working in a large enterprise codebase, a hobbyist
              vibe-coding in their spare time, or anyone in between.
            </p>
          </div>

          <DevCarousel />
        </div>
      </section>

      {/* ── Section: Latest Blogs ── */}
      <section id="blog" className="py-24 px-6 md:px-16 bg-white border-t border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
              Latest Blogs
            </h2>
            <a href="#"
              className="text-xs font-semibold text-neutral-900 px-5 py-2.5 border border-neutral-200 rounded-full hover:border-orange-500 hover:text-orange-600 transition-colors shadow-sm">
              View blog
            </a>
          </div>

          <div 
            ref={blogContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-none pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {BLOG_DATA.map((blog) => (
              <div 
                key={blog.id} 
                className="group cursor-pointer flex flex-col justify-between w-[290px] sm:w-[310px] shrink-0 snap-start"
              >
                <div>
                  <div className="aspect-[4/3] w-full rounded-2xl border border-neutral-200/70 bg-[#F9FAFB] flex flex-col items-center justify-center mb-4 overflow-hidden relative group-hover:border-orange-200 transition-all">
                    {blog.img ? (
                      <img src={blog.img} alt={blog.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-neutral-200/50">
                        Thumbnail
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-neutral-900 text-base leading-snug group-hover:text-orange-600 transition-colors mb-2 min-h-[3rem] line-clamp-3">
                    {blog.title}
                  </h3>
                  <div className="text-xs text-neutral-400 font-medium mb-3">
                    {blog.date} • {blog.cat}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-800 group-hover:text-orange-600 transition-colors">
                  Read blog <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 mt-12 pl-1">
            <button 
              onClick={() => scrollBlogs('left')}
              className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-orange-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => scrollBlogs('right')}
              className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-orange-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="pricing" className="border-t border-neutral-100 bg-white py-16 px-6 md:px-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/talvax_logo_navbar.png" alt="Talvax" className="w-7 h-7" />
                <span className="text-lg font-bold text-neutral-900">Talvax</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-neutral-900 mb-3 leading-snug">
                Your next hire<br />starts here.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-xs mb-6">
                Talvax brings candidates and recruiters together on one intelligent
                platform, from first application to final offer.
              </p>
              <div className="flex items-center gap-3">
                <Link to="/signup?role=recruiter"
                  className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-full transition-colors">
                  Post a Job
                </Link>
                <Link to="/signup?role=candidate"
                  className="text-xs font-semibold text-neutral-700 border border-neutral-200 hover:border-orange-400 hover:text-orange-600 px-4 py-2 rounded-full transition-colors">
                  Find Opportunities
                </Link>
              </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Platform</h4>
                <div className="space-y-3 text-sm font-medium text-neutral-600">
                  <a href="#how-it-works" className="block hover:text-orange-600 transition-colors">How it Works</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Features</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Changelog</a>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Recruiters</h4>
                <div className="space-y-3 text-sm font-medium text-neutral-600">
                  <Link to="/signup?role=recruiter" className="block hover:text-orange-600 transition-colors">Post a Job</Link>
                  <a href="#recruiters" className="block hover:text-orange-600 transition-colors">ATS Pipeline</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Live Interviews</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Assessments</a>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Candidates</h4>
                <div className="space-y-3 text-sm font-medium text-neutral-600">
                  <Link to="/signup?role=candidate" className="block hover:text-orange-600 transition-colors">Browse Jobs</Link>
                  <a href="#candidates" className="block hover:text-orange-600 transition-colors">Track Applications</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Practice Tests</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Interview Prep</a>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Company</h4>
                <div className="space-y-3 text-sm font-medium text-neutral-600">
                  <a href="#" className="block hover:text-orange-600 transition-colors">About</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Blog</a>
                  <a href="#" className="block hover:text-orange-600 transition-colors">Support</a>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full text-center py-8 select-none border-y border-neutral-100 my-8">
            <h1 className="text-[12vw] font-bold text-neutral-900 tracking-tighter leading-none pointer-events-none hover:text-orange-600 transition-colors duration-500">
              Talv<span className="inline-block transform -translate-y-[0.1em]">a</span>x
            </h1>
          </div>

          <div className="pt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-neutral-400">
            <span>© 2026 Talvax. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-neutral-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-neutral-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-neutral-900 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── HeroParallax ─────────────────────────────────────────────────────────
export const HeroParallax = ({ products }) => {
  const firstRow  = [...products.slice(0, 6),  ...products.slice(0, 6)];
  const secondRow = [...products.slice(6, 12), ...products.slice(6, 12)];
  const thirdRow  = [...products.slice(12, 18),...products.slice(12, 18)];

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const springConfig = { stiffness: 120, damping: 25, bounce: 0 };

  const rotateX      = useSpring(useTransform(scrollYProgress, [0, 0.7],  [15, 0]),   springConfig);
  const rotateZ      = useSpring(useTransform(scrollYProgress, [0, 0.7],  [12, 0]),   springConfig);
  const translateY   = useSpring(useTransform(scrollYProgress, [0, 0.75], [-180, 260]),springConfig);
  const opacity      = useSpring(useTransform(scrollYProgress, [0, 0.3],  [0.8, 1]),  springConfig);
  const rawBlur      = useTransform(scrollYProgress, [0, 0.45], [6, 0]);
  const springBlur   = useSpring(rawBlur, springConfig);
  const blurStyle    = useTransform(springBlur, (v) => `blur(${v}px)`);

  const x1 = useMotionValue(0);
  const x2 = useMotionValue(-1000);
  const x3 = useMotionValue(-500);
  const velRef       = useRef(0);

  useAnimationFrame((_, delta) => {
    const scrollY = window.scrollY;
    const target  = scrollY > 0 ? 1.2 : 0;
    velRef.current += (target - velRef.current) * 0.03;
    const sp = (delta / 16.66) * velRef.current;
    const W  = 2000;

    let n1 = x1.get() - sp * 1.5; if (n1 <= -W) n1 += W; x1.set(n1);
    let n2 = x2.get() + sp * 1.5; if (n2 >=  0) n2 -= W; x2.set(n2);
    let n3 = x3.get() - sp * 1.5; if (n3 <= -W) n3 += W; x3.set(n3);
  });

  return (
    <div ref={ref}
      className="h-[180vh] py-16 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d] bg-white">
      <div className="absolute top-0 left-0 w-full h-screen flex items-center justify-center z-20 pointer-events-none">
        <Header />
      </div>
      <motion.div style={{ rotateX, rotateZ, translateY, opacity, filter: blurStyle }} className="w-full relative z-10">
        <div className="overflow-hidden w-full mb-12">
          <motion.div style={{ x: x1 }} className="flex flex-row space-x-12 w-max flex-nowrap">
            {firstRow.map((p, i) => <ProductCard product={p} key={`r1-${i}`} />)}
          </motion.div>
        </div>
        <div className="overflow-hidden w-full mb-12">
          <motion.div style={{ x: x2 }} className="flex flex-row space-x-12 w-max flex-nowrap">
            {secondRow.map((p, i) => <ProductCard product={p} key={`r2-${i}`} />)}
          </motion.div>
        </div>
        <div className="overflow-hidden w-full">
          <motion.div style={{ x: x3 }} className="flex flex-row space-x-12 w-max flex-nowrap">
            {thirdRow.map((p, i) => <ProductCard product={p} key={`r3-${i}`} />)}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Hero heading ──────────────────────────────────────────────────────────
export const Header = () => (
  <div className="max-w-5xl px-6 w-full flex flex-col items-center text-center pointer-events-auto">
    <h1 className="text-8xl md:text-[7rem] lg:text-[8.2rem] xl:text-[9.2rem] 
                   font-extrabold text-neutral-950 
                   tracking-[-0.04em] leading-none max-w-4xl
                   drop-shadow-[6px_8px_4px_rgba(249,115,22,0.6)]">
      TALVAX
    </h1>
  </div>
);

// ─── Pure Image Product Card (No Titles, Text, or Headings) ───────────────
export const ProductCard = ({ product }) => (
  <motion.div
    whileHover={{ y: -12 }}
    className="group/product h-[24rem] w-[17rem] relative flex-shrink-0 bg-[#F9FAFB] border border-neutral-200/70 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 select-none"
  >
    {product.img ? (
      <img 
        src={product.img} 
        alt="Platform Dashboard Snippet" 
        className="w-full h-full object-cover group-hover/product:scale-[1.02] transition-transform duration-300" 
      />
    ) : (
      <div className="w-full h-full bg-neutral-200/40 flex items-center justify-center">
        <span className="text-[10px] font-mono text-neutral-400">Card Asset Empty</span>
      </div>
    )}
  </motion.div>
);