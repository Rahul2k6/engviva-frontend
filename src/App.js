import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import Dashboard from "./screens/Dashboard";

import ProfileSetup from "./screens/ProfileSetup";
import Profile from "./screens/Profile";

import Companies from "./screens/Companies";
import CompanyDetails from "./screens/CompanyDetails";
import RolePreparation from "./screens/RolePreparation";

import Practice from "./screens/Practice";
import Assessments from "./screens/Assessments";
import AssessmentTest from "./screens/AssessmentTest";

import TechnicalAssessment from "./screens/TechnicalAssessment";

import CodingLab from "./screens/CodingLab";

import Interviews from "./screens/Interviews";
import UpcomingInterviews from "./screens/UpcomingInterviews";
import CompletedInterviews from "./screens/CompletedInterviews";
import Interview from "./screens/Interview";

import Resume from "./screens/Resume";

import Reports from "./screens/Reports";
import ReportDetails from "./screens/ReportDetails";

import Progress from "./screens/Progress";
import Notifications from "./screens/Notifications";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            ENTRY
        ===================================================== */}

        <Route
          path="/"
          element={<SplashScreen />}
        />

        <Route
          path="/login"
          element={<LoginScreen />}
        />

        {/* =====================================================
            DASHBOARD
        ===================================================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <Route
          path="/profile-setup"
          element={<ProfileSetup />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* =====================================================
            COMPANIES
        ===================================================== */}

        <Route
          path="/companies"
          element={<Companies />}
        />

        <Route
          path="/companies/:companyId"
          element={<CompanyDetails />}
        />

        {/* =====================================================
            ROLE PREPARATION
        ===================================================== */}

        <Route
          path="/role-preparation"
          element={<RolePreparation />}
        />

        {/* =====================================================
            PRACTICE
        ===================================================== */}

        <Route
          path="/practice"
          element={<Practice />}
        />

        <Route
          path="/practice/assessments"
          element={<Assessments />}
        />

        <Route
          path="/practice/assessments/test"
          element={<AssessmentTest />}
        />

        {/* =====================================================
            CODING LAB
        ===================================================== */}

        <Route
          path="/practice/coding"
          element={<CodingLab />}
        />

        {/* =====================================================
            TECHNICAL LAB
        ===================================================== */}

        {/* Company selection */}

        <Route
          path="/technical-lab"
          element={<TechnicalAssessment />}
        />

        {/* Company levels */}

        <Route
          path="/technical-lab/:companyId/levels"
          element={<TechnicalAssessment />}
        />

        {/* Active proctored attempt */}

        <Route
          path="/technical-lab/:companyId/level/:levelNumber/attempt/:attemptId"
          element={<TechnicalAssessment />}
        />

        {/* Result */}

        <Route
          path="/technical-lab/:companyId/level/:levelNumber/result"
          element={<TechnicalAssessment />}
        />

        {/* =====================================================
            LEGACY TECHNICAL LAB URLS
        ===================================================== */}

        <Route
          path="/technical-lab/:companyId"
          element={
            <Navigate
              to="/technical-lab"
              replace
            />
          }
        />

        {/* =====================================================
            INTERVIEWS
        ===================================================== */}

        <Route
          path="/interviews"
          element={<Interviews />}
        />

        <Route
          path="/interviews/upcoming"
          element={<UpcomingInterviews />}
        />

        <Route
          path="/interviews/completed"
          element={<CompletedInterviews />}
        />

        <Route
          path="/interviews/:interviewId"
          element={<Interview />}
        />

        {/* =====================================================
            RESUME
        ===================================================== */}

        <Route
          path="/resume"
          element={<Resume />}
        />

        {/* =====================================================
            REPORTS
        ===================================================== */}

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
          path="/reports/:reportId"
          element={<ReportDetails />}
        />

        {/* =====================================================
            PROGRESS
        ===================================================== */}

        <Route
          path="/progress"
          element={<Progress />}
        />

        {/* =====================================================
            NOTIFICATIONS
        ===================================================== */}

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        {/* =====================================================
            GLOBAL FALLBACK
        ===================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}