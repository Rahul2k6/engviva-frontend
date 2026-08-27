import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

/* =========================================================
   ENTRY
========================================================= */

import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";

/* =========================================================
   DASHBOARD
========================================================= */

import Dashboard from "./screens/Dashboard";

/* =========================================================
   PROFILE
========================================================= */

import ProfileSetup from "./screens/ProfileSetup";
import Profile from "./screens/Profile";

/* =========================================================
   COMPANIES
========================================================= */

import Companies from "./screens/Companies";
import CompanyDetails from "./screens/CompanyDetails";
import RolePreparation from "./screens/RolePreparation";

/* =========================================================
   PRACTICE
========================================================= */

import Practice from "./screens/Practice";
import Assessments from "./screens/Assessments";
import AssessmentTest from "./screens/AssessmentTest";

/* =========================================================
   TECHNICAL
========================================================= */

import TechnicalAssessment from "./screens/TechnicalAssessment";

/* =========================================================
   CODING
========================================================= */

import CodingLab from "./screens/CodingLab";

/* =========================================================
   INTERVIEWS
========================================================= */

import Interviews from "./screens/Interviews";
import UpcomingInterviews from "./screens/UpcomingInterviews";
import CompletedInterviews from "./screens/CompletedInterviews";
import Interview from "./screens/Interview";

/* =========================================================
   RESUME
========================================================= */

import Resume from "./screens/Resume";

/* =========================================================
   REPORTS
========================================================= */

import Reports from "./screens/Reports";
import ReportDetails from "./screens/ReportDetails";

/* =========================================================
   PROGRESS
========================================================= */

import Progress from "./screens/Progress";

/* =========================================================
   NOTIFICATIONS
========================================================= */

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

{/* =========================================================
    TECHNICAL LAB
========================================================= */}

              <Route
        path="/technical-lab"
        element={<TechnicalAssessment />}
      />

      <Route
        path="/technical-lab/:companyId/levels"
        element={<TechnicalAssessment />}
      />

      <Route
        path="/technical-lab/:companyId/level/:levelNumber"
        element={<TechnicalAssessment />}
      />

      <Route
        path="/technical-lab/:companyId/level/:levelNumber/attempt/:attemptId"
        element={<TechnicalAssessment />}
      />

      <Route
        path="/technical-lab/:companyId/level/:levelNumber/result"
        element={<TechnicalAssessment />}
      />
        {/* =====================================================
            CODING
        ===================================================== */}

        <Route
          path="/practice/coding"
          element={<CodingLab />}
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
            FALLBACK
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