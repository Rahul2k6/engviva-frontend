import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const TYPES = {
  APTITUDE: "aptitude",
  TECHNICAL: "technical",
  CODING: "coding",
  INTERVIEW: "interview",
};

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("idToken") ||
    localStorage.getItem("firebaseToken") ||
    ""
  );
}

async function request(url) {
  const token = getToken();

  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Unable to load report."
    );
  }

  return data;
}

function detectType(report) {
  const value = String(
    report?.roundType ||
      report?.type ||
      report?.category ||
      report?.mode ||
      report?.assessmentType ||
      report?.interviewType ||
      ""
  ).toLowerCase();

  if (
    value.includes("coding") ||
    value.includes("programming") ||
    value.includes("code")
  ) {
    return TYPES.CODING;
  }

  if (
    value.includes("interview") ||
    value.includes("behavioral") ||
    value.includes("hr")
  ) {
    return TYPES.INTERVIEW;
  }

  if (value.includes("technical")) {
    return TYPES.TECHNICAL;
  }

  return TYPES.APTITUDE;
}

function getScore(report) {
  const values = [
    report?.percentage,
    report?.score,
    report?.overallScore,
    report?.result?.percentage,
    report?.result?.score,
    report?.analysis?.score,
    report?.analysis?.overallScore,
  ];

  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return Math.max(0, Math.min(100, number));
    }
  }

  return 0;
}

function getGrade(score) {
  if (score >= 90) return "EXCEPTIONAL";
  if (score >= 80) return "STRONG";
  if (score >= 70) return "INTERVIEW READY";
  if (score >= 60) return "DEVELOPING";
  if (score >= 40) return "FOUNDATION REQUIRED";
  return "NEEDS ATTENTION";
}

function getDuration(report) {
  const seconds = Number(
    report?.timeUsedSeconds ||
      report?.durationSeconds ||
      0
  );

  if (seconds > 0) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes}m ${remaining}s`;
  }

  if (report?.durationMinutes) {
    return `${report.durationMinutes} min`;
  }

  return "—";
}

function getBreakdown(report) {
  const source =
    report?.categoryBreakdown ||
    report?.breakdown ||
    report?.analysis?.breakdown;

  if (Array.isArray(source)) {
    return source.map((item) => ({
      name:
        item?.name ||
        item?.category ||
        item?.label ||
        "Category",
      score: Number(
        item?.score ??
          item?.percentage ??
          0
      ),
    }));
  }

  if (source && typeof source === "object") {
    return Object.entries(source).map(
      ([name, value]) => ({
        name,
        score:
          typeof value === "object"
            ? Number(
                value?.score ??
                  value?.percentage ??
                  0
              )
            : Number(value) || 0,
      })
    );
  }

  return [];
}

function getMetric(report, names) {
  for (const name of names) {
    const value = Number(name(report));

    if (Number.isFinite(value) && value > 0) {
      return Math.max(0, Math.min(100, value));
    }
  }

  return 0;
}

function ScoreCircle({ score }) {
  return (
    <div
      className="score-circle"
      style={{
        "--score": `${score * 3.6}deg`,
      }}
    >
      <div className="score-circle-inner">
        <strong>{Math.round(score)}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressBar({ label, score }) {
  const safe = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span>{label}</span>
        <strong>{Math.round(safe)}%</strong>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${safe}%`,
          }}
        />
      </div>
    </div>
  );
}

function AptitudeReport({ report, score }) {
  const breakdown = getBreakdown(report);

  const correct = Number(
    report?.correctAnswers || 0
  );

  const total = Number(
    report?.totalQuestions ||
      report?.questionCount ||
      0
  );

  const attempted = Number(
    report?.attempted ||
      report?.answeredQuestions ||
      0
  );

  return (
    <>
      <Hero
        eyebrow="APTITUDE INTELLIGENCE"
        title="Assessment performance."
        description="Your aptitude report measures accuracy, reasoning, question selection and time performance."
        score={score}
      />

      <div className="metrics-grid">
        <Metric
          label="Correct"
          value={
            total
              ? `${correct} / ${total}`
              : correct
          }
        />

        <Metric
          label="Attempted"
          value={attempted}
        />

        <Metric
          label="Accuracy"
          value={`${Math.round(score)}%`}
        />

        <Metric
          label="Time Used"
          value={getDuration(report)}
        />
      </div>

      <Panel
        eyebrow="PERFORMANCE MAP"
        title="Aptitude breakdown"
      >
        {breakdown.length > 0 ? (
          breakdown.map((item, index) => (
            <ProgressBar
              key={`${item.name}-${index}`}
              label={item.name}
              score={item.score}
            />
          ))
        ) : (
          <EmptyText>
            Category-level analysis will
            appear here when detailed
            breakdown data is available.
          </EmptyText>
        )}
      </Panel>

      <Insight
        eyebrow="APTITUDE VERDICT"
        title={
          score >= 70
            ? "Your aptitude foundation is progressing well."
            : "Your aptitude foundation needs structured practice."
        }
        text="Use this report to identify weak areas and prioritize company-specific practice."
      />
    </>
  );
}

function TechnicalReport({ report, score }) {
  const concepts = getMetric(report, [
    (r) => r?.analysis?.concepts,
    (r) => r?.conceptScore,
    (r) => r?.conceptualScore,
  ]);

  const accuracy = getMetric(report, [
    (r) => r?.analysis?.accuracy,
    (r) => r?.accuracy,
  ]);

  const depth = getMetric(report, [
    (r) => r?.analysis?.depth,
    (r) => r?.depthScore,
  ]);

  const problemSolving = getMetric(report, [
    (r) => r?.analysis?.problemSolving,
    (r) => r?.problemSolvingScore,
  ]);

  return (
    <>
      <Hero
        eyebrow="TECHNICAL INTELLIGENCE"
        title="Engineering depth."
        description="A technical report focuses on conceptual understanding, technical accuracy, depth and engineering problem solving."
        score={score}
      />

      <div className="metrics-grid">
        <Metric
          label="Concepts"
          value={`${concepts}%`}
        />

        <Metric
          label="Accuracy"
          value={`${accuracy}%`}
        />

        <Metric
          label="Depth"
          value={`${depth}%`}
        />

        <Metric
          label="Problem Solving"
          value={`${problemSolving}%`}
        />
      </div>

      <Panel
        eyebrow="TECHNICAL PROFILE"
        title="Engineering capability"
      >
        <ProgressBar
          label="Conceptual Understanding"
          score={concepts}
        />

        <ProgressBar
          label="Technical Accuracy"
          score={accuracy}
        />

        <ProgressBar
          label="Knowledge Depth"
          score={depth}
        />

        <ProgressBar
          label="Problem Solving"
          score={problemSolving}
        />
      </Panel>

      <Insight
        eyebrow="TECHNICAL VERDICT"
        title={
          score >= 70
            ? "Your technical foundation is interview-capable."
            : "Build stronger technical fundamentals before advanced rounds."
        }
        text="Your next preparation should prioritize the concepts where your performance drops below the company target."
      />
    </>
  );
}

function CodingReport({ report, score }) {
  const solved = Number(
    report?.problemsSolved ||
      report?.analysis?.problemsSolved ||
      0
  );

  const attempted = Number(
    report?.problemsAttempted ||
      report?.analysis?.problemsAttempted ||
      0
  );

  const passed = Number(
    report?.testCasesPassed ||
      report?.analysis?.testCasesPassed ||
      0
  );

  const totalTests = Number(
    report?.totalTestCases ||
      report?.analysis?.totalTestCases ||
      0
  );

  const efficiency = getMetric(report, [
    (r) => r?.efficiency,
    (r) => r?.analysis?.efficiency,
  ]);

  const codeQuality = getMetric(report, [
    (r) => r?.codeQuality,
    (r) => r?.analysis?.codeQuality,
  ]);

  const testcaseScore =
    totalTests > 0
      ? Math.round(
          (passed / totalTests) * 100
        )
      : 0;

  return (
    <>
      <Hero
        eyebrow="CODING INTELLIGENCE"
        title="Code under pressure."
        description="Your coding report measures solving ability, test cases, efficiency and implementation quality."
        score={score}
      />

      <div className="metrics-grid">
        <Metric
          label="Solved"
          value={solved}
        />

        <Metric
          label="Attempted"
          value={attempted}
        />

        <Metric
          label="Test Cases"
          value={`${testcaseScore}%`}
        />

        <Metric
          label="Efficiency"
          value={`${efficiency}%`}
        />
      </div>

      <Panel
        eyebrow="CODING SIGNAL"
        title="Implementation profile"
      >
        <ProgressBar
          label="Problem Solving"
          score={score}
        />

        <ProgressBar
          label="Test Case Performance"
          score={testcaseScore}
        />

        <ProgressBar
          label="Code Efficiency"
          score={efficiency}
        />

        <ProgressBar
          label="Code Quality"
          score={codeQuality}
        />
      </Panel>

      <Insight
        eyebrow="CODING VERDICT"
        title={
          score >= 80
            ? "Strong implementation signal."
            : score >= 60
            ? "Your coding foundation is developing."
            : "More timed coding practice is required."
        }
        text="Focus on independent problem solving, edge cases, complexity and producing correct implementations under time pressure."
      />
    </>
  );
}

function InterviewReport({ report, score }) {
  const communication = getMetric(
    report,
    [
      (r) => r?.analysis?.communication,
      (r) => r?.communicationScore,
    ]
  );

  const technical = getMetric(report, [
    (r) => r?.analysis?.technical,
    (r) => r?.technicalScore,
  ]);

  const confidence = getMetric(report, [
    (r) => r?.analysis?.confidence,
    (r) => r?.confidenceScore,
  ]);

  const problemSolving = getMetric(
    report,
    [
      (r) => r?.analysis?.problemSolving,
      (r) => r?.problemSolvingScore,
    ]
  );

  const behavioral = getMetric(report, [
    (r) => r?.analysis?.behavioral,
    (r) => r?.behavioralScore,
  ]);

  const violations = Number(
    report?.proctoring?.violationCount ||
      0
  );

  return (
    <>
      <Hero
        eyebrow="INTERVIEW INTELLIGENCE"
        title="Interview performance decoded."
        description="Your interview report evaluates communication, technical reasoning, confidence, problem solving and behavioral signals."
        score={score}
      />

      <div className="metrics-grid">
        <Metric
          label="Communication"
          value={`${communication}%`}
        />

        <Metric
          label="Technical"
          value={`${technical}%`}
        />

        <Metric
          label="Confidence"
          value={`${confidence}%`}
        />

        <Metric
          label="Problem Solving"
          value={`${problemSolving}%`}
        />
      </div>

      <Panel
        eyebrow="INTERVIEW PROFILE"
        title="Candidate signals"
      >
        <ProgressBar
          label="Communication"
          score={communication}
        />

        <ProgressBar
          label="Technical Reasoning"
          score={technical}
        />

        <ProgressBar
          label="Confidence"
          score={confidence}
        />

        <ProgressBar
          label="Problem Solving"
          score={problemSolving}
        />

        <ProgressBar
          label="Behavioral"
          score={behavioral}
        />
      </Panel>

      <div className="two-column">
        <Insight
          eyebrow="INTERVIEW VERDICT"
          title={
            score >= 80
              ? "Strong interview presence."
              : score >= 65
              ? "Interview capable with improvement areas."
              : "Interview foundation requires work."
          }
          text="The report combines the available signals from the interview session."
        />

        <Insight
          eyebrow="SESSION INTEGRITY"
          title={
            report?.proctoring?.status ||
            "COMPLETED"
          }
          text={`Recorded proctoring violations: ${violations}`}
        />
      </div>
    </>
  );
}

function Hero({
  eyebrow,
  title,
  description,
  score,
}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h1>{title}</h1>

        <p>{description}</p>
      </div>

      <ScoreCircle score={score} />
    </section>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}) {
  return (
    <section className="panel">
      <span className="eyebrow">
        {eyebrow}
      </span>

      <h2>{title}</h2>

      <div className="breakdown">
        {children}
      </div>
    </section>
  );
}

function Insight({
  eyebrow,
  title,
  text,
}) {
  return (
    <section className="insight">
      <span className="eyebrow">
        {eyebrow}
      </span>

      <h3>{title}</h3>

      <p>{text}</p>
    </section>
  );
}

function EmptyText({ children }) {
  return (
    <div className="empty-text">
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="reports-page loading-page">
      <div className="loader">
        <div className="loader-orb" />
        <span>
          ANALYSING PERFORMANCE
        </span>
        <p>
          Preparing your intelligence
          report...
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="reports-page loading-page">
      <div className="error-box">
        <span className="eyebrow">
          REPORT UNAVAILABLE
        </span>

        <h1>
          We couldn't load this report.
        </h1>

        <p>{message}</p>

        <button onClick={onBack}>
          BACK TO REPORTS
        </button>
      </div>
    </div>
  );
}

function EmptyReports({ navigate }) {
  return (
    <div className="reports-page loading-page">
      <div className="error-box">
        <span className="eyebrow">
          PERFORMANCE INTELLIGENCE
        </span>

        <h1>No reports yet.</h1>

        <p>
          Complete an aptitude,
          technical, coding or
          interview round to generate
          your first report.
        </p>

        <button
          onClick={() =>
            navigate("/practice")
          }
        >
          START PRACTICE
        </button>
      </div>
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId } = useParams();

  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const query =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [location.search]
    );

  const attemptId =
    reportId ||
    query.get("attemptId");

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        let response;

        if (attemptId) {
          response =
            await request(
              `/api/assessments/reports/${encodeURIComponent(
                attemptId
              )}`
            );
        } else {
          response =
            await request(
              "/api/reports"
            );
        }

        if (!active) return;

        const payload =
          response?.data ??
          response;

        if (
          Array.isArray(payload)
        ) {
          setReport(
            payload.length
              ? payload[0]
              : null
          );
        } else if (
          Array.isArray(
            payload?.reports
          )
        ) {
          setReport(
            payload.reports.length
              ? payload.reports[0]
              : null
          );
        } else if (
          payload?.report
        ) {
          setReport(
            payload.report
          );
        } else {
          setReport(payload);
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
              "Unable to load report."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [attemptId]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onBack={() =>
          navigate("/reports")
        }
      />
    );
  }

  if (
    !report ||
    typeof report !== "object" ||
    Object.keys(report).length === 0
  ) {
    return (
      <EmptyReports
        navigate={navigate}
      />
    );
  }

  const type =
    detectType(report);

  const score =
    getScore(report);

  const company =
    report?.companyName ||
    report?.company ||
    "Company Intelligence";

  const title =
    report?.title ||
    report?.assessmentTitle ||
    report?.name ||
    "Performance Report";

  const completedAt =
    report?.completedAt ||
    report?.createdAt;

  return (
    <div className="reports-page">
      <style>{`
        .reports-page {
          min-height: 100vh;
          width: 100%;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(217,255,0,.09),
              transparent 32%
            ),
            radial-gradient(
              circle at 0% 60%,
              rgba(105,70,255,.08),
              transparent 32%
            ),
            #060606;
          color: #f5f5f5;
          padding: 28px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .reports-shell {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .back-button,
        .error-box button {
          border: 1px solid
            rgba(255,255,255,.12);
          background:
            rgba(255,255,255,.05);
          color: white;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform .2s ease,
            background .2s ease;
        }

        .back-button:hover,
        .error-box button:hover {
          transform: translateY(-2px);
          background:
            rgba(255,255,255,.09);
        }

        .context {
          text-align: right;
        }

        .context strong {
          display: block;
          font-size: 14px;
        }

        .context span {
          display: block;
          color: #777;
          font-size: 12px;
          margin-top: 5px;
        }

        .eyebrow {
          display: block;
          color: #dfff00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .18em;
          margin-bottom: 11px;
        }

        .hero {
          min-height: 350px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 50px;
          padding: 52px;
          margin-bottom: 18px;
          border: 1px solid
            rgba(255,255,255,.09);
          border-radius: 28px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.065),
              rgba(255,255,255,.018)
            );
          box-shadow:
            0 30px 100px
              rgba(0,0,0,.4);
          overflow: hidden;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          width: 300px;
          height: 300px;
          right: -120px;
          top: -120px;
          border-radius: 50%;
          background:
            rgba(217,255,0,.08);
          filter: blur(45px);
          pointer-events: none;
        }

        .hero-copy {
          position: relative;
          z-index: 1;
        }

        .hero h1 {
          max-width: 780px;
          margin: 0 0 20px;
          font-size:
            clamp(42px, 5vw, 76px);
          line-height: .95;
          letter-spacing: -.06em;
        }

        .hero p {
          max-width: 650px;
          margin: 0;
          color: #929292;
          line-height: 1.75;
          font-size: 15px;
        }

        .score-circle {
          --score: 0deg;
          width: 210px;
          height: 210px;
          min-width: 210px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          position: relative;
          z-index: 1;
          background:
            conic-gradient(
              #dfff00 var(--score),
              rgba(255,255,255,.08)
                var(--score)
            );
          box-shadow:
            0 0 70px
              rgba(217,255,0,.08);
        }

        .score-circle::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background: #080808;
        }

        .score-circle-inner {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .score-circle strong {
          display: block;
          font-size: 50px;
          line-height: 1;
          letter-spacing: -.06em;
        }

        .score-circle span {
          color: #666;
          font-size: 11px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .metric-card {
          min-height: 135px;
          padding: 24px;
          border-radius: 18px;
          border: 1px solid
            rgba(255,255,255,.08);
          background:
            rgba(255,255,255,.035);
          transition:
            transform .25s ease,
            border-color .25s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          border-color:
            rgba(217,255,0,.25);
        }

        .metric-card span {
          display: block;
          color: #707070;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .metric-card strong {
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .panel,
        .insight {
          border: 1px solid
            rgba(255,255,255,.08);
          border-radius: 22px;
          background:
            rgba(255,255,255,.035);
          padding: 30px;
          margin-bottom: 18px;
        }

        .panel h2 {
          margin: 0 0 28px;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .breakdown {
          display: grid;
          gap: 22px;
        }

        .progress-item {
          width: 100%;
        }

        .progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .progress-header span {
          color: #aaa;
        }

        .progress-header strong {
          color: #eee;
        }

        .progress-track {
          width: 100%;
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background:
            rgba(255,255,255,.07);
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #dfff00;
          box-shadow:
            0 0 18px
              rgba(217,255,0,.18);
          transition:
            width .8s cubic-bezier(
              .2,.8,.2,1
            );
        }

        .two-column {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0,1fr));
          gap: 18px;
        }

        .insight h3 {
          margin: 0 0 12px;
          font-size: 23px;
          line-height: 1.2;
          letter-spacing: -.035em;
        }

        .insight p {
          margin: 0;
          color: #858585;
          line-height: 1.7;
        }

        .empty-text {
          color: #777;
          line-height: 1.7;
          padding: 15px 0;
        }

        .loading-page {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .loader,
        .error-box {
          max-width: 600px;
          width: 100%;
          margin: auto;
        }

        .loader-orb {
          width: 70px;
          height: 70px;
          margin: 0 auto 22px;
          border-radius: 50%;
          border: 2px solid
            rgba(255,255,255,.08);
          border-top-color: #dfff00;
          animation:
            report-spin 1s
            linear infinite;
        }

        @keyframes report-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loader span {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .loader p,
        .error-box p {
          color: #777;
          line-height: 1.7;
        }

        .error-box h1 {
          margin: 0;
          font-size: 46px;
          letter-spacing: -.05em;
        }

        .error-box button {
          margin-top: 12px;
          background: #dfff00;
          color: #050505;
          border-color: transparent;
        }

        @media (max-width: 900px) {
          .reports-page {
            padding: 18px;
          }

          .hero {
            padding: 32px;
            flex-direction: column;
            align-items: flex-start;
          }

          .metrics-grid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .two-column {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .topbar {
            align-items: flex-start;
          }

          .context {
            display: none;
          }

          .hero {
            min-height: auto;
          }

          .hero h1 {
            font-size: 42px;
          }

          .score-circle {
            width: 160px;
            height: 160px;
            min-width: 160px;
          }

          .score-circle strong {
            font-size: 40px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .panel,
          .insight {
            padding: 22px;
          }
        }
      `}</style>

      <div className="reports-shell">
        <div className="topbar">
          <button
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div className="context">
            <strong>{company}</strong>

            <span>
              {title}
              {completedAt
                ? ` · ${new Date(
                    completedAt
                  ).toLocaleString()}`
                : ""}
            </span>
          </div>
        </div>

        {type === TYPES.CODING ? (
          <CodingReport
            report={report}
            score={score}
          />
        ) : type === TYPES.INTERVIEW ? (
          <InterviewReport
            report={report}
            score={score}
          />
        ) : type === TYPES.TECHNICAL ? (
          <TechnicalReport
            report={report}
            score={score}
          />
        ) : (
          <AptitudeReport
            report={report}
            score={score}
          />
        )}

        <section className="insight">
          <span className="eyebrow">
            FINAL VERDICT
          </span>

          <h3>
            {getGrade(score)}
          </h3>

          <p>
            This result belongs to the{" "}
            <strong>{type}</strong> round
            and should be used as the
            baseline for your next
            company-specific preparation
            activity.
          </p>
        </section>
      </div>
    </div>
  );
}