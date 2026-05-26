import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { AdminLayout, RecruiterLayout, CandidateLayout } from './components/layouts/DashboardLayouts';
import FirstLoginForm from './pages/recruiter/FirstLoginForm';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import CandidatesView from './pages/recruiter/CandidatesView';
import CandidateProfile from './pages/recruiter/CandidateProfile';
import JobsView from './pages/recruiter/JobsView';
import InterviewsView from './pages/recruiter/InterviewsView';
import KanbanBoard from './pages/recruiter/KanbanBoard';
import RecruiterProvisioning from './pages/admin/RecruiterProvisioning';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminJobs from './pages/admin/AdminJobs';
import LiveInterviewRoom from './pages/candidate/LiveInterviewRoom';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import CandidateInterviews from './pages/candidate/CandidateInterviews';
import AssessmentRoom from './pages/candidate/AssessmentRoom';
import SupportView from './pages/shared/SupportView';
import SettingsView from './pages/shared/SettingsView';
import PlaceholderView from './pages/shared/PlaceholderView';
import './index.css';

// Wrapper to pass route param into CandidateProfile
function CandidateProfileWrapper() {
  const { id } = useParams();
  return <CandidateProfile candidateId={id} />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminAnalytics />} />
          <Route path="recruiters" element={<RecruiterProvisioning />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        {/* Recruiter Routes */}
        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<RecruiterDashboard />} />
          <Route path="candidates" element={<CandidatesView />} />
          <Route path="candidates/:id" element={<CandidateProfileWrapper />} />
          <Route path="jobs" element={<JobsView />} />
          <Route path="interviews" element={<InterviewsView />} />
          <Route path="ats" element={<KanbanBoard />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        {/* Candidate Routes */}
        <Route path="/candidate" element={<CandidateLayout />}>
          <Route path="dashboard" element={<CandidateDashboard />} />
          <Route path="interviews" element={<CandidateInterviews />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        {/* Standalone full-screen routes (no sidebar) */}
        <Route path="/candidate/interview/:roomId" element={<LiveInterviewRoom />} />
        <Route path="/recruiter/interview/:roomId" element={<LiveInterviewRoom />} />
        <Route path="/candidate/assessment/:token" element={<AssessmentRoom />} />
        <Route path="/recruiter/profile-setup" element={<FirstLoginForm />} />
      </Routes>
    </Router>
  );
}

export default App;
