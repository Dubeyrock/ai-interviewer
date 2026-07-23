import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/shared/Navbar'
import CandidateInterview from './pages/CandidateInterview'
import HRDashboard from './pages/HRDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import ResumeUpload from './pages/ResumeUpload'
import JobSetup from './pages/JobSetup'
import ScheduleInterview from './pages/ScheduleInterview'
import CandidateRegistration from './pages/CandidateRegistration'
import HowItWorks from './pages/HowItWorks'
import Features from './pages/Features'
import BookDemo from './pages/BookDemo'
import BillingPage from './pages/BillingPage'
import ContactSales from './pages/ContactSales'
import HRGuard from './components/shared/HRGuard';
import AdminGuard from './components/shared/AdminGuard';
import AuthGuard from './components/shared/AuthGuard';
import CandidateGuard from './components/shared/CandidateGuard';
import RegistrationGuard from './components/shared/RegistrationGuard';
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-300">
      <Navbar />
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/features" element={<Features />} />
        <Route path="/book-demo" element={<BookDemo />} />
        <Route
          path="/register"
          element={
            <CandidateGuard>
              <CandidateRegistration />
            </CandidateGuard>
          }
        />
        <Route
          path="/interview"
          element={
            <CandidateGuard>
              <RegistrationGuard redirectTo="/register">
                <CandidateInterview />
              </RegistrationGuard>
            </CandidateGuard>
          }
        />
        <Route
          path="/schedule"
          element={
            <HRGuard>
              <ScheduleInterview />
            </HRGuard>
          }
        />
        <Route
          path="/book-demo"
          element={<BookDemo />}
        />
        <Route
          path="/contact-sales"
          element={<ContactSales />}
        />
        <Route
          path="/hr"
          element={
            <HRGuard>
              <HRDashboard />
            </HRGuard>
          }
        />
        <Route
          path="/hr/billing"
          element={
            <HRGuard>
              <BillingPage />
            </HRGuard>
          }
        />
        <Route
          path="/job-setup"
          element={
            <HRGuard>
              <JobSetup />
            </HRGuard>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          }
        />
        <Route
          path="/upload"
          element={
            <AuthGuard>
              <ResumeUpload />
            </AuthGuard>
          }
        />
      </Routes>
    </div>
  )
}
