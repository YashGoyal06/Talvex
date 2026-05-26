import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Video, Activity, 
  LogOut, Columns3, Search, Bell, Sun, Cloud, Calendar, User
} from 'lucide-react';

const Sidebar = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const defaultNames = {
    candidate: 'Candidate',
    recruiter: 'Recruiter',
    admin: 'Admin'
  };
  const storedName = localStorage.getItem('userName') || defaultNames[role] || 'User';
  const userPhoto = localStorage.getItem('userPhoto') || '';
  const shortName = storedName.split(' ')[0];
  const isAdminTheme = role === 'admin';

  const handleProfileClick = () => {
    navigate(`/${role}/settings`);
  };

  return (
    <div className={`w-72 h-[calc(100vh-3rem)] flex flex-col fixed left-6 top-6 rounded-[2.2rem] z-40 p-6 justify-between select-none border transition-colors duration-300 ${
      isAdminTheme 
        ? 'bg-[#0C0D12]/90 border-neutral-800/80 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.4)] text-white' 
        : 'bg-white/80 backdrop-blur-xl border-white/40 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.06)] text-neutral-800'
    }`}>
      
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src="/talvax_logo_navbar.png" className="w-10 h-10 object-contain shadow-sm" alt="Tarvax Logo" />
          <div>
            <h1 className={`text-lg font-bold tracking-tight leading-none ${isAdminTheme ? 'text-white' : 'text-neutral-950'}`}>
              {role === 'admin' ? 'Tarvax' : 'Talvax'}
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isAdminTheme ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>Enterprise</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 mt-8">
          {role === 'admin' ? (
            <>
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/admin" exact isAdminTheme={isAdminTheme} />
              <NavItem icon={<Users size={18} />} label="Recruiters" to="/admin/recruiters" isAdminTheme={isAdminTheme} />
            </>
          ) : role === 'candidate' ? (
            <>
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/candidate/dashboard" exact isAdminTheme={isAdminTheme} />
              <NavItem icon={<Briefcase size={18} />} label="Jobs" to="/candidate/jobs" isAdminTheme={isAdminTheme} />
              <NavItem icon={<Video size={18} />} label="Interviews" to="/candidate/interviews" isAdminTheme={isAdminTheme} />
            </>
          ) : (
            <>
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/recruiter" exact isAdminTheme={isAdminTheme} />
              <NavItem icon={<Users size={18} />} label="Candidates" to="/recruiter/candidates" isAdminTheme={isAdminTheme} />
              <NavItem icon={<Columns3 size={18} />} label="ATS Pipeline" to="/recruiter/ats" isAdminTheme={isAdminTheme} />
              <NavItem icon={<Briefcase size={18} />} label="Jobs" to="/recruiter/jobs" isAdminTheme={isAdminTheme} />
              <NavItem icon={<Video size={18} />} label="Interviews" to="/recruiter/interviews" isAdminTheme={isAdminTheme} />
            </>
          )}
        </nav>
      </div>

      {/* Footer Section & Profile */}
      <div>

        {/* User Card */}
        <div className={`border-t pt-4 flex items-center justify-between ${isAdminTheme ? 'border-neutral-800/85' : 'border-neutral-100/80'}`}>
          <div 
            onClick={handleProfileClick} 
            className="flex items-center gap-3 cursor-pointer group"
            title="Open Profile"
          >
            <div className="relative shrink-0">
              {userPhoto ? (
                <img 
                  src={userPhoto} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                  alt="Avatar" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-850 border-2 border-white shadow-sm flex items-center justify-center text-neutral-500 transition-transform duration-300 group-hover:scale-110">
                  <User size={18} />
                </div>
              )}
            </div>
            <div>
              <p className={`text-sm font-bold leading-none transition-colors duration-200 ${isAdminTheme ? 'text-white group-hover:text-[#FF6B00]' : 'text-neutral-900 group-hover:text-orange-500'}`}>{shortName}</p>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${isAdminTheme ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>{role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            title="Log out"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isAdminTheme 
                ? 'text-neutral-400 hover:text-[#FF6B00] hover:bg-neutral-800/60' 
                : 'text-neutral-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};

const NavItem = ({ icon, label, to, exact, isAdminTheme }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
        isActive 
          ? 'border-2 border-orange-500 text-orange-500 bg-transparent font-extrabold shadow-sm'
          : (isAdminTheme 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/40 font-medium' 
              : 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 font-medium')
      }`}
    >
      {/* Accent hover line matching image design */}
      {!isActive && (
        <span className={`absolute left-0 w-1 h-4 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isAdminTheme ? 'bg-[#FF6B00]' : 'bg-orange-500'
        }`}></span>
      )}
      <span className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </Link>
  );
};

// Global Layout Wrapper displaying premium background canvas
const DashboardLayoutWrapper = ({ role }) => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const isAdminTheme = role === 'admin';
  const isSettingsPage = location.pathname.endsWith('/settings');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`min-h-screen relative overflow-x-hidden transition-colors duration-300 ${
      isAdminTheme ? 'bg-[#08090C] text-neutral-200' : 'bg-slate-50/50 text-neutral-800'
    }`}>
      
      {/* Breathtaking ambient background canvas (glowing blurred blobs) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {isAdminTheme ? (
          <>
            {/* Deep charcoal soft wave */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-neutral-950/60 blur-[120px]"></div>
            {/* Glowing vibrant orange orb */}
            <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF6B00]/10 blur-[130px]"></div>
            {/* Glowing secondary slate orb */}
            <div className="absolute top-[30%] right-[10%] w-[45%] h-[45%] rounded-full bg-slate-900/20 blur-[140px]"></div>
          </>
        ) : (
          <>
            {/* White soft wave background */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-neutral-200/30 blur-[120px]"></div>
            {/* Soft orange glowing orb */}
            <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100/40 blur-[130px]"></div>
            {/* Soft slate orb */}
            <div className="absolute top-[30%] right-[10%] w-[45%] h-[45%] rounded-full bg-slate-200/40 blur-[140px]"></div>
          </>
        )}
      </div>

      {/* Floating Capsule Sidebar */}
      <Sidebar role={role} />

      {/* Main Content Area */}
      <div className="ml-[20rem] p-8 relative z-10 min-h-screen flex flex-col">
        
        {/* Dynamic Outlet Page Wrapper */}
        <main className={`flex-1 ${isAdminTheme ? 'text-neutral-200' : (isSettingsPage ? '' : 'dashboard-content')}`}>
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export const AdminLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/login');
    }
  }, [role, navigate]);

  if (role !== 'admin') return null;

  return <DashboardLayoutWrapper role="admin" />;
};

export const RecruiterLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');

  useEffect(() => {
    if (role !== 'recruiter' && role !== 'admin') {
      navigate('/login');
    }
  }, [role, navigate]);

  if (role !== 'recruiter' && role !== 'admin') return null;

  return <DashboardLayoutWrapper role="recruiter" />;
};

export const CandidateLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');

  useEffect(() => {
    if (role !== 'candidate') {
      navigate('/login');
    }
  }, [role, navigate]);

  if (role !== 'candidate') return null;

  return <DashboardLayoutWrapper role="candidate" />;
};
