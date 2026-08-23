import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/* =========================================================
   ICONS
========================================================= */

const Icon = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconDashboard = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="8" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="15" width="7" height="6" rx="1" />
  </Icon>
);

const IconBuilding = () => (
  <Icon>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    <path d="M9 22v-4h6v4" />
  </Icon>
);

const IconCode = () => (
  <Icon>
    <path d="m8 9-4 3 4 3" />
    <path d="m16 9 4 3-4 3" />
    <path d="m14 5-4 14" />
  </Icon>
);

const IconTerminal = () => (
  <Icon>
    <path d="m4 5 6 6-6 6" />
    <path d="M12 19h8" />
  </Icon>
);

const IconVideo = () => (
  <Icon>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m16 10 6-3v10l-6-3" />
  </Icon>
);

const IconFile = () => (
  <Icon>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Icon>
);

const IconChart = () => (
  <Icon>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="m7 15 3-4 3 2 5-6" />
  </Icon>
);

const IconTarget = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Icon>
);

const IconUser = () => (
  <Icon>
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21a7 7 0 0 1 14 0" />
  </Icon>
);

const IconSettings = () => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.4h.9a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.4h-.2a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);

const IconSearch = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </Icon>
);

const IconBell = () => (
  <Icon>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
    <path d="M10 21h4" />
  </Icon>
);

const IconCheck = () => (
  <Icon>
    <path d="m5 12 4 4L19 6" />
  </Icon>
);

const IconArrow = () => (
  <Icon size={15}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

const IconSpark = () => (
  <Icon>
    <path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4z" />
    <path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7z" />
  </Icon>
);

/* =========================================================
   RADAR
========================================================= */

function RadarChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="empty-chart">
        <IconSpark />
        <span>Complete assessments to generate your skill map.</span>
      </div>
    );
  }

  const size = 220;
  const center = size / 2;
  const radius = 82;
  const angle = (Math.PI * 2) / data.length;

  const point = (value, index) => {
    const r = radius * ((value || 0) / 100);
    const x = center + r * Math.cos(index * angle - Math.PI / 2);
    const y = center + r * Math.sin(index * angle - Math.PI / 2);
    return `${x},${y}`;
  };

  const fullPolygon = [1, 0.75, 0.5, 0.25]
    .map((scale) =>
      data
        .map((_, index) => {
          const r = radius * scale;
          const x =
            center +
            r * Math.cos(index * angle - Math.PI / 2);
          const y =
            center +
            r * Math.sin(index * angle - Math.PI / 2);

          return `${x},${y}`;
        })
        .join(" ")
    );

  const values = data.map((item, index) =>
    point(item.value || 0, index)
  );

  return (
    <svg
      className="radar"
      viewBox={`0 0 ${size} ${size}`}
    >
      {fullPolygon.map((points, index) => (
        <polygon
          key={index}
          points={points}
          fill="none"
          stroke="rgba(201,183,255,.16)"
          strokeWidth="1"
        />
      ))}

      {data.map((_, index) => {
        const x =
          center +
          radius *
            Math.cos(index * angle - Math.PI / 2);

        const y =
          center +
          radius *
            Math.sin(index * angle - Math.PI / 2);

        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(201,183,255,.12)"
          />
        );
      })}

      <polygon
        points={values.join(" ")}
        fill="rgba(193,167,255,.18)"
        stroke="#c7b2ff"
        strokeWidth="2"
      />

      {data.map((item, index) => (
        <circle
          key={index}
          cx={
            center +
            radius *
              ((item.value || 0) / 100) *
              Math.cos(index * angle - Math.PI / 2)
          }
          cy={
            center +
            radius *
              ((item.value || 0) / 100) *
              Math.sin(index * angle - Math.PI / 2)
          }
          r="3"
          fill="#fff"
        />
      ))}
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";

  return "Good Evening";
};

const clamp = (value) =>
  Math.max(0, Math.min(100, Number(value) || 0));

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://engviva-backend.onrender.com";

  /* -------------------------------------------------------
     AUTH + DASHBOARD
  ------------------------------------------------------- */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        try {
          setLoading(true);
          setError("");

          const token =
            await user.getIdToken();

          const response =
            await fetch(
              `${API_URL}/api/dashboard`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (!response.ok) {
            throw new Error(
              "Dashboard request failed"
            );
          }

          const payload =
            await response.json();

          if (!payload.success) {
            throw new Error(
              payload.error?.message ||
                "Unable to load dashboard"
            );
          }

          const dashboard =
            payload.data;

          /*
           * IMPORTANT:
           * Backend now controls onboarding.
           */

          if (
            dashboard.profileCompleted !== true
          ) {
            navigate(
              "/profile-setup",
              { replace: true }
            );

            return;
          }

          setData(dashboard);
        } catch (err) {
          console.error(
            "[ENGVIVA DASHBOARD]",
            err
          );

          setError(
            "Unable to establish a secure connection with ENGVIVA."
          );
        } finally {
          setLoading(false);
        }
      });

    return () => unsubscribe();
  }, [navigate, API_URL]);

  /* -------------------------------------------------------
     DERIVED DATA
  ------------------------------------------------------- */

  const performance =
    data?.performance || [];

  const metrics =
    data?.metrics || {};

  const resume =
    data?.resume || {};

  const latestInterview =
    data?.latestInterview;

  const dailyGoal =
    data?.dailyGoal || {
      percentage: 0,
      items: [],
    };

  const profileCompletion =
    useMemo(() => {
      if (!data) return 0;

      const profile =
        data.profile || {};

      const engineering =
        data.engineering || {};

      const checks = [
        Boolean(profile.fullName),
        Boolean(profile.college),
        Boolean(profile.degree),
        Boolean(profile.branch),
        Boolean(profile.graduationYear),
        Boolean(
          engineering.primaryRole
        ),
        engineering.skills?.length > 0,
        Boolean(resume.uploaded),
      ];

      return Math.round(
        (checks.filter(Boolean).length /
          checks.length) *
          100
      );
    }, [data, resume.uploaded]);

  const badges = [
    data?.degree,
    data?.batch,
    data?.role,
    data?.location,
  ].filter(Boolean);

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  const go = (path) => navigate(path);

  const active = (path) =>
    location.pathname === path ||
    (
      path === "/dashboard" &&
      location.pathname === "/"
    );

  /* -------------------------------------------------------
     ERROR
  ------------------------------------------------------- */

  if (error) {
    return (
      <>
        <style>{styles}</style>

        <div className="system-error">
          <div className="error-orb">
            <IconSpark />
          </div>

          <h1>ENGVIVA Core Offline</h1>

          <p>{error}</p>

          <button
            className="primary-btn"
            onClick={() =>
              window.location.reload()
            }
          >
            Reconnect
          </button>
        </div>
      </>
    );
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <>
      <style>{styles}</style>

      <div className="engviva-shell">

        {/* AMBIENT LIGHT */}
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">

          <div className="brand">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>

            <div>
              <div className="brand-name">
                ENGVIVA
              </div>

              <div className="brand-caption">
                ENGINEERING INTELLIGENCE
              </div>
            </div>
          </div>

          <div className="nav-scroll">

            <NavLabel text="Workspace" />

            <NavItem
              icon={<IconDashboard />}
              text="Dashboard"
              active={active("/dashboard")}
              onClick={() =>
                go("/dashboard")
              }
            />

            <NavItem
              icon={<IconBuilding />}
              text="Companies"
              active={active("/companies")}
              onClick={() =>
                go("/companies")
              }
            />

            <NavLabel text="Practice" />

            <NavItem
              icon={<IconFile />}
              text="Assessments"
              onClick={() =>
                go("/practice/assessments")
              }
            />

            <NavItem
              icon={<IconCode />}
              text="Coding Lab"
              onClick={() =>
                go("/practice/coding")
              }
            />

            <NavItem
              icon={<IconTerminal />}
              text="Technical Lab"
              onClick={() =>
                go("/practice/technical")
              }
            />

            <NavLabel text="Interviews" />

            <NavItem
              icon={<IconVideo />}
              text="Simulations"
              onClick={() =>
                go("/interviews")
              }
            />

            <NavSub
              text="Upcoming"
              onClick={() =>
                go("/interviews/upcoming")
              }
            />

            <NavSub
              text="Completed"
              onClick={() =>
                go("/interviews/completed")
              }
            />

            <NavLabel text="Intelligence" />

            <NavItem
              icon={<IconFile />}
              text="Resume"
              onClick={() =>
                go("/resume")
              }
            />

            <NavItem
              icon={<IconChart />}
              text="Reports"
              onClick={() =>
                go("/reports")
              }
            />

            <NavItem
              icon={<IconTarget />}
              text="Progress"
              onClick={() =>
                go("/progress")
              }
            />

          </div>

          <div className="sidebar-bottom">

            <NavItem
              icon={<IconUser />}
              text="Profile"
              onClick={() =>
                go("/profile")
              }
            />

            <NavItem
              icon={<IconSettings />}
              text="Settings"
              onClick={() =>
                go("/settings")
              }
            />

            <div className="system-status">
              <span className="status-dot" />

              <div>
                <strong>ENGVIVA CORE</strong>
                <small>SECURE CONNECTION</small>
              </div>
            </div>

          </div>
        </aside>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="main">

          {/* TOPBAR */}

          <header className="topbar">

            <div className="search">
              <IconSearch />

              <input
                placeholder="Search companies, roles, skills..."
              />

              <kbd>⌘ K</kbd>
            </div>

            <div className="top-actions">

              <button
                className="icon-button"
                onClick={() =>
                  go("/calendar")
                }
              >
                <IconTarget />
              </button>

              <button
                className="icon-button"
                onClick={() =>
                  go("/notifications")
                }
              >
                <IconBell />
                <span className="notification-dot" />
              </button>

              <button
                className="user-chip"
                onClick={() =>
                  go("/profile")
                }
              >
                <div className="user-avatar">
                  {(data?.name || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="user-chip-text">
                  <strong>
                    {loading
                      ? "Loading..."
                      : data?.name}
                  </strong>

                  <span>
                    {data?.role ||
                      "Engineering Candidate"}
                  </span>
                </div>
              </button>

            </div>
          </header>

          {/* CONTENT */}

          <section className="content">

            {/* HERO */}

            <section className="hero glass">

              <div className="hero-copy">

                <div className="eyebrow">
                  <span className="pulse" />
                  PERSONAL ENGINEERING COMMAND CENTER
                </div>

                <h1>
                  {greeting()},{" "}
                  <span>
                    {loading
                      ? "Candidate"
                      : data?.name || "Candidate"}
                  </span>
                </h1>

                <p>
                  Your placement journey is being
                  measured across engineering,
                  problem solving and interview
                  readiness.
                </p>

                <div className="badge-row">

                  {loading ? (
                    <>
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </>
                  ) : badges.length ? (
                    badges.map(
                      (badge, index) => (
                        <span
                          className="glass-badge"
                          key={index}
                        >
                          {badge}
                        </span>
                      )
                    )
                  ) : (
                    <button
                      className="outline-btn"
                      onClick={() =>
                        go("/profile")
                      }
                    >
                      Complete Profile
                    </button>
                  )}

                </div>

              </div>

              <div className="readiness">

                <div className="readiness-copy">
                  <span>
                    ENGINEERING READINESS
                  </span>

                  <strong>
                    {clamp(
                      data?.readinessScore
                    )}
                    %
                  </strong>

                  <small>
                    Updated from your latest
                    activity
                  </small>
                </div>

                <div className="readiness-ring">

                  <svg
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="ring-track"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="ring-progress"
                      style={{
                        strokeDashoffset:
                          314 -
                          (314 *
                            clamp(
                              data?.readinessScore
                            )) /
                            100,
                      }}
                    />
                  </svg>

                  <div className="ring-number">
                    {loading
                      ? "--"
                      : `${clamp(
                          data?.readinessScore
                        )}%`}
                  </div>

                </div>

              </div>

            </section>

            {/* METRICS */}

            <section className="metric-grid">

              <Metric
                icon={<IconVideo />}
                label="Mock Interviews"
                value={
                  loading
                    ? "—"
                    : metrics.mockInterviews || 0
                }
                sub={
                  metrics.mockChange ||
                  "+0 this week"
                }
              />

              <Metric
                icon={<IconCode />}
                label="Problems Solved"
                value={
                  loading
                    ? "—"
                    : metrics.problemsSolved || 0
                }
                sub={
                  metrics.problemsChange ||
                  "+0 this week"
                }
              />

              <Metric
                icon={<IconTarget />}
                label="Study Streak"
                value={
                  loading
                    ? "—"
                    : `${metrics.studyStreak || 0} Days`
                }
                sub={
                  metrics.streakMsg ||
                  "Start your streak"
                }
              />

              <Metric
                icon={<IconCheck />}
                label="Achievements"
                value={
                  loading
                    ? "—"
                    : metrics.achievements || 0
                }
                sub={
                  metrics.achievementsMsg ||
                  "Badges earned"
                }
              />

            </section>

            {/* PERFORMANCE + DAILY GOAL */}

            <section className="two-column">

              <div className="glass panel performance">

                <PanelHeader
                  title="Engineering Performance"
                  action="Detailed Analytics"
                  onClick={() =>
                    go("/reports")
                  }
                />

                <div className="performance-body">

                  <div className="radar-wrap">
                    <RadarChart
                      data={performance}
                    />
                  </div>

                  <div className="skill-bars">

                    {loading ? (
                      [1, 2, 3, 4, 5].map(
                        (item) => (
                          <div
                            className="skill-loading"
                            key={item}
                          >
                            <Skeleton />
                          </div>
                        )
                      )
                    ) : performance.length ? (
                      performance.map(
                        (item, index) => (
                          <div
                            className="skill"
                            key={index}
                          >
                            <div className="skill-head">
                              <span>
                                {item.skill}
                              </span>

                              <strong>
                                {clamp(
                                  item.value
                                )}%
                              </strong>
                            </div>

                            <div className="skill-track">
                              <div
                                className="skill-progress"
                                style={{
                                  width: `${clamp(
                                    item.value
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <EmptyState
                        text="Complete your first assessment to generate engineering analytics."
                      />
                    )}

                  </div>

                </div>

              </div>

              <div className="glass panel goal">

                <PanelHeader
                  title="Daily Mission"
                  action="View Progress"
                  onClick={() =>
                    go("/progress")
                  }
                />

                <div className="goal-score">

                  <div>
                    <strong>
                      {clamp(
                        dailyGoal.percentage
                      )}
                      %
                    </strong>

                    <span>
                      completed today
                    </span>
                  </div>

                  <div className="mini-ring">
                    <svg viewBox="0 0 60 60">
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        className="mini-track"
                      />

                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        className="mini-progress"
                        style={{
                          strokeDashoffset:
                            151 -
                            (151 *
                              clamp(
                                dailyGoal.percentage
                              )) /
                              100,
                        }}
                      />
                    </svg>
                  </div>

                </div>

                <div className="mission-list">

                  {(dailyGoal.items || []).map(
                    (item) => (
                      <div
                        className={`mission ${
                          item.completed
                            ? "completed"
                            : ""
                        }`}
                        key={item.id}
                      >
                        <span className="mission-check">
                          {item.completed && (
                            <IconCheck
                              size={13}
                            />
                          )}
                        </span>

                        <span>
                          {item.title}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>

            </section>

            {/* RECOMMENDATIONS + ACTIVITY */}

            <section className="two-column">

              <div className="glass panel">

                <PanelHeader
                  title="Recommended For You"
                  action="Explore"
                  onClick={() =>
                    go("/practice")
                  }
                />

                <div className="recommendations">

                  {performance.length ? (
                    <>
                      <Recommendation
                        title="Strengthen Your Weakest Skill"
                        description={`Your ${[...performance].sort(
                          (a, b) =>
                            (a.value || 0) -
                            (b.value || 0)
                        )[0]?.skill ||
                          "technical fundamentals"} currently needs the most attention.`}
                        onClick={() =>
                          go(
                            "/practice/technical"
                          )
                        }
                      />

                      <Recommendation
                        title="Start a Role Simulation"
                        description={`Practice questions designed around ${
                          data?.role ||
                          "your target engineering role"
                        }.`}
                        onClick={() =>
                          go("/interviews")
                        }
                      />
                    </>
                  ) : (
                    <EmptyState
                      text="ENGVIVA will generate personalized recommendations after your first assessments."
                    />
                  )}

                </div>

              </div>

              <div className="glass panel">

                <PanelHeader
                  title="Recent Activity"
                  action="View All"
                  onClick={() =>
                    go("/progress")
                  }
                />

                <div className="activity-list">

                  {data?.activity?.length ? (
                    data.activity
                      .slice(0, 5)
                      .map(
                        (activity, index) => (
                          <div
                            className="activity"
                            key={index}
                          >
                            <div className="activity-icon">
                              {activity.type ===
                              "interview" ? (
                                <IconVideo />
                              ) : activity.type ===
                                "code" ? (
                                <IconCode />
                              ) : (
                                <IconTerminal />
                              )}
                            </div>

                            <div className="activity-copy">
                              <strong>
                                {activity.title}
                              </strong>

                              <span>
                                {activity.desc}
                              </span>
                            </div>

                            <small>
                              {activity.time}
                            </small>
                          </div>
                        )
                      )
                  ) : (
                    <EmptyState
                      text="Your activity timeline will appear here as you practice."
                    />
                  )}

                </div>

              </div>

            </section>

            {/* INTERVIEW / RESUME / PROFILE */}

            <section className="triple-grid">

              {/* INTERVIEW */}

              <div className="glass panel compact">

                <PanelHeader
                  title="Latest Interview"
                  action="All"
                  onClick={() =>
                    go("/interviews")
                  }
                />

                {latestInterview ? (
                  <>
                    <div className="interview-head">

                      <div>
                        <strong>
                          {
                            latestInterview.company
                          }
                        </strong>

                        <span>
                          {
                            latestInterview.role
                          }
                        </span>
                      </div>

                      <div className="interview-score">
                        {
                          latestInterview.score
                        }
                        <small>
                          /100
                        </small>
                      </div>

                    </div>

                    <div className="score-row">

                      <span>
                        Technical
                        <strong>
                          {
                            latestInterview.technical ||
                            0
                          }%
                        </strong>
                      </span>

                      <span>
                        Communication
                        <strong>
                          {
                            latestInterview.communication ||
                            0
                          }%
                        </strong>
                      </span>

                    </div>

                    <button
                      className="wide-btn"
                      onClick={() =>
                        go(
                          `/reports/${latestInterview.id}`
                        )
                      }
                    >
                      View Report
                      <IconArrow />
                    </button>
                  </>
                ) : (
                  <EmptyCard
                    title="No interviews yet"
                    description="Your first interview simulation will appear here."
                    button="Start Simulation"
                    onClick={() =>
                      go("/interviews")
                    }
                  />
                )}

              </div>

              {/* RESUME */}

              <div className="glass panel compact">

                <PanelHeader
                  title="Resume Intelligence"
                  action="Open"
                  onClick={() =>
                    go("/resume")
                  }
                />

                {resume.uploaded ? (
                  <>
                    <div className="resume-state success">
                      <span>
                        <IconCheck />
                      </span>

                      Resume analyzed
                    </div>

                    <ProgressStat
                      label="ATS Readiness"
                      value={
                        resume.atsReadiness
                      }
                    />

                    <ProgressStat
                      label="Technical Relevance"
                      value={
                        resume.technicalRelevance
                      }
                    />

                    <button
                      className="wide-btn"
                      onClick={() =>
                        go("/resume")
                      }
                    >
                      Improve Resume
                      <IconArrow />
                    </button>
                  </>
                ) : (
                  <EmptyCard
                    title="Resume not uploaded"
                    description="Upload your resume or build one with ENGVIVA."
                    button="Build Resume"
                    onClick={() =>
                      go("/resume")
                    }
                  />
                )}

              </div>

              {/* PROFILE */}

              <div className="glass panel compact">

                <PanelHeader
                  title="Profile Readiness"
                  action="Edit"
                  onClick={() =>
                    go("/profile")
                  }
                />

                <div className="profile-score">

                  <strong>
                    {profileCompletion}%
                  </strong>

                  <span>
                    profile complete
                  </span>

                </div>

                <div className="profile-progress">
                  <div
                    style={{
                      width: `${profileCompletion}%`,
                    }}
                  />
                </div>

                <div className="profile-items">

                  <ProfileItem
                    label="Education"
                    done={
                      Boolean(
                        data?.profile
                          ?.college
                      ) &&
                      Boolean(
                        data?.profile
                          ?.degree
                      )
                    }
                  />

                  <ProfileItem
                    label="Engineering Skills"
                    done={
                      data?.engineering
                        ?.skills?.length >
                      0
                    }
                  />

                  <ProfileItem
                    label="Resume"
                    done={
                      Boolean(
                        resume.uploaded
                      )
                    }
                  />

                  <ProfileItem
                    label="Target Role"
                    done={
                      Boolean(
                        data?.engineering
                          ?.primaryRole
                      )
                    }
                  />

                </div>

              </div>

            </section>

            {/* COMPANIES */}

            <section>

              <div className="section-heading">

                <div>
                  <span>
                    PLACEMENT INTELLIGENCE
                  </span>

                  <h2>
                    Target Companies
                  </h2>
                </div>

                <button
                  className="outline-btn"
                  onClick={() =>
                    go("/companies")
                  }
                >
                  Explore Companies
                  <IconArrow />
                </button>

              </div>

              <div className="company-grid">

                {data?.companies?.length ? (
                  data.companies.map(
                    (company) => (
                      <button
                        className="company-card"
                        key={company.id}
                        onClick={() =>
                          go(
                            `/companies/${company.id}`
                          )
                        }
                      >
                        <div className="company-logo">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt=""
                            />
                          ) : (
                            company.name
                              ?.charAt(0)
                              ?.toUpperCase()
                          )}
                        </div>

                        <div className="company-info">
                          <strong>
                            {company.name}
                          </strong>

                          <span>
                            {company.role ||
                              "Engineering Role"}
                          </span>
                        </div>

                        <div className="company-readiness">
                          <div>
                            <span>
                              READINESS
                            </span>

                            <strong>
                              {clamp(
                                company.readiness
                              )}
                              %
                            </strong>
                          </div>

                          <div className="company-bar">
                            <div
                              style={{
                                width: `${clamp(
                                  company.readiness
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <IconArrow />

                      </button>
                    )
                  )
                ) : (
                  <div className="company-empty glass">
                    <div className="company-empty-icon">
                      <IconBuilding />
                    </div>

                    <div>
                      <strong>
                        No target companies yet
                      </strong>

                      <span>
                        Choose companies to build
                        role-specific preparation
                        paths.
                      </span>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() =>
                        go("/companies")
                      }
                    >
                      Explore
                    </button>
                  </div>
                )}

              </div>

            </section>

          </section>
        </main>
      </div>
    </>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function NavLabel({ text }) {
  return (
    <div className="nav-label">
      {text}
    </div>
  );
}

function NavItem({
  icon,
  text,
  active,
  onClick,
}) {
  return (
    <button
      className={`nav-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </button>
  );
}

function NavSub({ text, onClick }) {
  return (
    <button
      className="nav-sub"
      onClick={onClick}
    >
      <span />
      {text}
    </button>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}) {
  return (
    <div className="glass metric-card">
      <div className="metric-icon">
        {icon}
      </div>

      <span className="metric-label">
        {label}
      </span>

      <strong className="metric-value">
        {value}
      </strong>

      <small>
        {sub}
      </small>
    </div>
  );
}

function PanelHeader({
  title,
  action,
  onClick,
}) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>

      {action && (
        <button
          className="panel-action"
          onClick={onClick}
        >
          {action}
          <IconArrow />
        </button>
      )}
    </div>
  );
}

function Recommendation({
  title,
  description,
  onClick,
}) {
  return (
    <div className="recommendation">
      <div className="recommendation-icon">
        <IconSpark />
      </div>

      <div>
        <strong>{title}</strong>

        <p>{description}</p>

        <button
          onClick={onClick}
        >
          Practice Now
          <IconArrow />
        </button>
      </div>
    </div>
  );
}

function ProgressStat({
  label,
  value,
}) {
  return (
    <div className="progress-stat">
      <div>
        <span>{label}</span>

        <strong>
          {clamp(value)}%
        </strong>
      </div>

      <div className="progress-track">
        <div
          style={{
            width: `${clamp(value)}%`,
          }}
        />
      </div>
    </div>
  );
}

function ProfileItem({
  label,
  done,
}) {
  return (
    <div
      className={`profile-item ${
        done ? "done" : ""
      }`}
    >
      <span>
        {done && <IconCheck size={12} />}
      </span>

      {label}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <IconSpark />
      <span>{text}</span>
    </div>
  );
}

function EmptyCard({
  title,
  description,
  button,
  onClick,
}) {
  return (
    <div className="empty-card">
      <strong>{title}</strong>

      <span>{description}</span>

      <button
        className="wide-btn"
        onClick={onClick}
      >
        {button}
        <IconArrow />
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <span className="skeleton" />
  );
}

/* =========================================================
   GLASSMORPHIC DESIGN SYSTEM
========================================================= */

const styles = `

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {

  --bg:
    #07070c;

  --bg-2:
    #0b0a12;

  --glass:
    rgba(255,255,255,.045);

  --glass-strong:
    rgba(255,255,255,.075);

  --border:
    rgba(210,195,255,.12);

  --border-hover:
    rgba(210,195,255,.32);

  --purple:
    #c7b2ff;

  --purple-2:
    #9b7dff;

  --purple-3:
    #7155d9;

  --text:
    #f7f5ff;

  --text-2:
    #aaa6b8;

  --text-3:
    #6f6a7e;

  --success:
    #52e3a4;

  --warning:
    #ffd166;

}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {

  background:
    radial-gradient(
      circle at 70% -10%,
      rgba(141,105,255,.17),
      transparent 35%
    ),
    radial-gradient(
      circle at 0% 80%,
      rgba(92,62,180,.09),
      transparent 30%
    ),
    var(--bg);

  color:
    var(--text);

  font-family:
    Manrope,
    system-ui,
    sans-serif;

  overflow: hidden;

}

button,
input {
  font-family: inherit;
}

button {
  color: inherit;
}

.engviva-shell {

  width: 100%;
  height: 100%;

  display: flex;

  position: relative;

  overflow: hidden;

  background:
    linear-gradient(
      120deg,
      rgba(255,255,255,.015),
      transparent 50%
    );

}

/* =========================================================
   AMBIENT LIGHT
========================================================= */

.ambient {

  position: fixed;

  width: 500px;
  height: 500px;

  border-radius: 50%;

  filter: blur(110px);

  pointer-events: none;

  opacity: .16;

  animation:
    ambientFloat 14s
    ease-in-out
    infinite alternate;

}

.ambient-one {

  background:
    #8b6dff;

  top: -300px;
  right: 10%;

}

.ambient-two {

  background:
    #4e2bb5;

  bottom: -350px;
  left: 15%;

  animation-delay: -4s;

}

.ambient-three {

  background:
    #c29cff;

  top: 40%;
  right: -400px;

  animation-delay: -8s;

}

@keyframes ambientFloat {

  from {
    transform:
      translate3d(0,0,0)
      scale(1);
  }

  to {
    transform:
      translate3d(30px,-25px,0)
      scale(1.08);
  }

}

/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {

  width: 248px;

  flex-shrink: 0;

  height: 100%;

  display: flex;
  flex-direction: column;

  position: relative;
  z-index: 10;

  padding:
    24px 14px;

  background:
    rgba(10,9,17,.76);

  border-right:
    1px solid var(--border);

  backdrop-filter:
    blur(30px);

  -webkit-backdrop-filter:
    blur(30px);

}

.brand {

  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    4px 12px 30px;

}

.brand-mark {

  width: 35px;
  height: 35px;

  display: flex;

  align-items: center;
  justify-content: center;

  gap: 2px;

  border-radius: 10px;

  background:
    linear-gradient(
      145deg,
      #d8c9ff,
      #8062e9
    );

  box-shadow:
    0 0 30px
    rgba(167,134,255,.25);

  transform:
    rotate(-3deg);

}

.brand-mark span {

  width: 3px;
  height: 15px;

  border-radius: 4px;

  background: #191322;

}

.brand-mark span:nth-child(2) {
  height: 21px;
}

.brand-mark span:nth-child(3) {
  height: 11px;
}

.brand-name {

  font-family:
    "Space Grotesk",
    sans-serif;

  font-weight: 800;

  font-size: 17px;

  letter-spacing: 2px;

}

.brand-caption {

  margin-top: 3px;

  font-size: 7px;

  letter-spacing: 1.4px;

  color:
    var(--text-3);

}

.nav-scroll {

  overflow-y: auto;

  scrollbar-width: none;

}

.nav-scroll::-webkit-scrollbar {
  display: none;
}

.nav-label {

  padding:
    18px 13px 7px;

  font-size: 9px;

  letter-spacing: 1.6px;

  color:
    var(--text-3);

  text-transform:
    uppercase;

}

.nav-item {

  width: 100%;

  border: 0;

  background:
    transparent;

  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    10px 13px;

  border-radius: 11px;

  cursor: pointer;

  color:
    var(--text-2);

  font-size: 12px;

  font-weight: 600;

  text-align: left;

  transition:
    .25s ease;

}

.nav-item:hover {

  color: white;

  background:
    rgba(255,255,255,.045);

  transform:
    translateX(2px);

}

.nav-item.active {

  color: white;

  background:
    linear-gradient(
      90deg,
      rgba(176,145,255,.17),
      rgba(176,145,255,.035)
    );

  box-shadow:
    inset 2px 0 0
    var(--purple),
    0 10px 35px
    rgba(120,90,220,.06);

}

.nav-item.active svg {
  color: var(--purple);
}

.nav-sub {

  width: 100%;

  border: 0;

  background:
    transparent;

  padding:
    7px 13px 7px 43px;

  text-align: left;

  color:
    var(--text-3);

  font-size: 11px;

  cursor: pointer;

  transition:
    .2s ease;

}

.nav-sub:hover {

  color:
    var(--text);

  transform:
    translateX(3px);

}

.sidebar-bottom {

  margin-top: auto;

  padding-top: 15px;

  border-top:
    1px solid var(--border);

}

.system-status {

  margin:
    15px 5px 0;

  padding:
    10px;

  border-radius: 12px;

  display: flex;

  align-items: center;

  gap: 9px;

  background:
    rgba(82,227,164,.045);

  border:
    1px solid
    rgba(82,227,164,.08);

}

.system-status strong {

  display: block;

  font-size: 8px;

  letter-spacing: 1px;

}

.system-status small {

  display: block;

  margin-top: 3px;

  color:
    var(--text-3);

  font-size: 7px;

}

.status-dot {

  width: 6px;
  height: 6px;

  border-radius: 50%;

  background:
    var(--success);

  box-shadow:
    0 0 10px
    var(--success);

  animation:
    blink 2s infinite;

}

@keyframes blink {

  50% {
    opacity: .35;
  }

}

/* =========================================================
   MAIN
========================================================= */

.main {

  min-width: 0;

  flex: 1;

  display: flex;
  flex-direction: column;

}

.topbar {

  height: 70px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: space-between;

  padding:
    0 30px;

  border-bottom:
    1px solid var(--border);

  background:
    rgba(7,7,12,.57);

  backdrop-filter:
    blur(28px);

  -webkit-backdrop-filter:
    blur(28px);

  z-index: 5;

}

.search {

  width: 330px;

  height: 38px;

  display: flex;

  align-items: center;

  gap: 10px;

  padding:
    0 12px;

  border:
    1px solid var(--border);

  border-radius: 12px;

  background:
    rgba(255,255,255,.035);

  color:
    var(--text-3);

  transition:
    .25s ease;

}

.search:focus-within {

  border-color:
    var(--border-hover);

  box-shadow:
    0 0 25px
    rgba(167,134,255,.06);

}

.search input {

  flex: 1;

  border: 0;

  outline: 0;

  background:
    transparent;

  color: white;

  font-size: 11px;

}

.search input::placeholder {
  color: var(--text-3);
}

.search kbd {

  padding:
    3px 6px;

  border:
    1px solid var(--border);

  border-radius: 5px;

  color:
    var(--text-3);

  font-size: 8px;

}

.top-actions {

  display: flex;

  align-items: center;

  gap: 12px;

}

.icon-button {

  width: 36px;
  height: 36px;

  display: flex;

  align-items: center;
  justify-content: center;

  position: relative;

  border:
    1px solid transparent;

  border-radius: 10px;

  background:
    transparent;

  color:
    var(--text-2);

  cursor: pointer;

  transition:
    .25s ease;

}

.icon-button:hover {

  color: white;

  background:
    rgba(255,255,255,.045);

  border-color:
    var(--border);

}

.notification-dot {

  position: absolute;

  width: 5px;
  height: 5px;

  top: 8px;
  right: 8px;

  border-radius: 50%;

  background:
    #ff779e;

  box-shadow:
    0 0 8px
    #ff779e;

}

.user-chip {

  display: flex;

  align-items: center;

  gap: 9px;

  margin-left: 8px;

  padding:
    5px 9px 5px 5px;

  border:
    1px solid var(--border);

  border-radius: 12px;

  background:
    rgba(255,255,255,.035);

  cursor: pointer;

}

.user-avatar {

  width: 29px;
  height: 29px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 9px;

  background:
    linear-gradient(
      145deg,
      #cbb8ff,
      #7051d5
    );

  color:
    #17111f;

  font-weight: 800;

  font-size: 11px;

}

.user-chip-text {
  text-align: left;
}

.user-chip-text strong {

  display: block;

  font-size: 10px;

}

.user-chip-text span {

  display: block;

  margin-top: 2px;

  color:
    var(--text-3);

  font-size: 8px;

}

/* =========================================================
   CONTENT
========================================================= */

.content {

  flex: 1;

  overflow-y: auto;

  padding:
    28px 32px 60px;

  scroll-behavior: smooth;

}

.content::-webkit-scrollbar {
  width: 6px;
}

.content::-webkit-scrollbar-thumb {

  background:
    rgba(201,183,255,.14);

  border-radius: 10px;

}

.content > section {

  max-width: 1450px;

  margin:
    0 auto 22px;

  animation:
    enter .7s
    cubic-bezier(.2,.8,.2,1)
    both;

}

@keyframes enter {

  from {
    opacity: 0;
    transform:
      translateY(18px);
  }

  to {
    opacity: 1;
    transform:
      translateY(0);
  }

}

/* =========================================================
   GLASS
========================================================= */

.glass {

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.075),
      rgba(255,255,255,.025)
    );

  border:
    1px solid var(--border);

  box-shadow:
    0 18px 60px
    rgba(0,0,0,.17),
    inset 0 1px 0
    rgba(255,255,255,.04);

  backdrop-filter:
    blur(25px);

  -webkit-backdrop-filter:
    blur(25px);

}

/* =========================================================
   HERO
========================================================= */

.hero {

  min-height: 230px;

  padding:
    35px 40px;

  border-radius: 22px;

  display: flex;

  align-items: center;
  justify-content: space-between;

  position: relative;

  overflow: hidden;

}

.hero::after {

  content: "";

  position: absolute;

  width: 320px;
  height: 320px;

  right: 12%;

  top: -220px;

  border-radius: 50%;

  background:
    rgba(175,141,255,.12);

  filter:
    blur(50px);

  pointer-events: none;

}

.hero-copy {
  position: relative;
  z-index: 1;
}

.eyebrow {

  display: flex;

  align-items: center;

  gap: 7px;

  margin-bottom: 12px;

  color:
    var(--purple);

  font-size: 8px;

  letter-spacing: 1.8px;

  font-weight: 700;

}

.pulse {

  width: 6px;
  height: 6px;

  border-radius: 50%;

  background:
    var(--success);

  box-shadow:
    0 0 12px
    var(--success);

}

.hero h1 {

  margin: 0;

  font-family:
    "Space Grotesk",
    sans-serif;

  font-size:
    clamp(28px,3vw,42px);

  letter-spacing:
    -1.7px;

  font-weight: 400;

}

.hero h1 span {

  font-weight: 700;

  background:
    linear-gradient(
      90deg,
      #fff,
      #bfaaff
    );

  -webkit-background-clip:
    text;

  color:
    transparent;

}

.hero p {

  max-width: 570px;

  margin:
    12px 0 22px;

  color:
    var(--text-2);

  font-size: 12px;

  line-height: 1.7;

}

.badge-row {

  display: flex;

  flex-wrap: wrap;

  gap: 7px;

}

.glass-badge {

  padding:
    7px 11px;

  border:
    1px solid
    rgba(199,178,255,.14);

  border-radius: 8px;

  background:
    rgba(199,178,255,.055);

  color:
    #cbbcff;

  font-size: 8px;

  letter-spacing:
    .8px;

  text-transform:
    uppercase;

}

.readiness {

  display: flex;

  align-items: center;

  gap: 25px;

  position: relative;
  z-index: 1;

}

.readiness-copy {

  text-align: right;

}

.readiness-copy span {

  display: block;

  color:
    var(--text-3);

  font-size: 8px;

  letter-spacing:
    1.6px;

}

.readiness-copy strong {

  display: block;

  margin-top: 5px;

  font-family:
    "Space Grotesk";

  font-size: 23px;

  color:
    var(--purple);

}

.readiness-copy small {

  display: block;

  margin-top: 4px;

  max-width: 125px;

  color:
    var(--text-3);

  font-size: 8px;

  line-height: 1.4;

}

.readiness-ring {

  width: 118px;
  height: 118px;

  position: relative;

}

.readiness-ring svg {

  width: 100%;
  height: 100%;

  transform:
    rotate(-90deg);

}

.ring-track,
.ring-progress {

  fill: none;

  stroke-width: 7;

}

.ring-track {

  stroke:
    rgba(255,255,255,.07);

}

.ring-progress {

  stroke:
    var(--purple);

  stroke-linecap: round;

  stroke-dasharray:
    314;

  transition:
    stroke-dashoffset
    1.4s
    cubic-bezier(.2,.8,.2,1);

  filter:
    drop-shadow(
      0 0 7px
      rgba(199,178,255,.5)
    );

}

.ring-number {

  position: absolute;

  inset: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  font-family:
    "Space Grotesk";

  font-size: 21px;

  font-weight: 700;

}

/* =========================================================
   METRICS
========================================================= */

.metric-grid {

  display: grid;

  grid-template-columns:
    repeat(4,1fr);

  gap: 15px;

}

.metric-card {

  padding:
    19px;

  min-height: 145px;

  border-radius: 17px;

  transition:
    .3s
    cubic-bezier(.2,.8,.2,1);

  position: relative;

  overflow: hidden;

}

.metric-card::after {

  content: "";

  position: absolute;

  width: 80px;
  height: 80px;

  right: -40px;
  bottom: -40px;

  background:
    var(--purple);

  filter:
    blur(45px);

  opacity: .1;

}

.metric-card:hover {

  transform:
    translateY(-5px);

  border-color:
    var(--border-hover);

  box-shadow:
    0 22px 60px
    rgba(0,0,0,.25),
    0 0 30px
    rgba(145,110,255,.05);

}

.metric-icon {

  width: 31px;
  height: 31px;

  display: flex;

  align-items: center;
  justify-content: center;

  margin-bottom: 14px;

  border-radius: 9px;

  color:
    var(--purple);

  background:
    rgba(199,178,255,.08);

}

.metric-label {

  display: block;

  color:
    var(--text-3);

  font-size: 8px;

  letter-spacing:
    1.1px;

  text-transform:
    uppercase;

}

.metric-value {

  display: block;

  margin-top: 5px;

  font-family:
    "Space Grotesk";

  font-size: 25px;

}

.metric-card small {

  color:
    var(--success);

  font-size: 9px;

}

/* =========================================================
   PANELS
========================================================= */

.two-column {

  display: grid;

  grid-template-columns:
    1.7fr 1fr;

  gap: 15px;

}

.panel {

  min-width: 0;

  padding: 22px;

  border-radius: 18px;

}

.panel-header {

  display: flex;

  align-items: center;
  justify-content: space-between;

  margin-bottom: 20px;

}

.panel-header h3 {

  margin: 0;

  font-family:
    "Space Grotesk";

  font-size: 13px;

  font-weight: 600;

}

.panel-action {

  display: flex;

  align-items: center;

  gap: 5px;

  border: 0;

  background:
    transparent;

  color:
    var(--purple);

  font-size: 8px;

  cursor: pointer;

}

.performance {

  min-height: 320px;

}

.performance-body {

  display: flex;

  align-items: center;

  gap: 45px;

}

.radar-wrap {

  width: 220px;

  flex-shrink: 0;

}

.radar {

  width: 100%;

  filter:
    drop-shadow(
      0 0 12px
      rgba(190,165,255,.08)
    );

}

.skill-bars {

  flex: 1;

  display: flex;

  flex-direction: column;

  gap: 13px;

}

.skill-head {

  display: flex;

  justify-content: space-between;

  margin-bottom: 6px;

  font-size: 9px;

  color:
    var(--text-2);

}

.skill-head strong {

  color:
    white;

  font-size: 9px;

}

.skill-track {

  height: 5px;

  background:
    rgba(255,255,255,.055);

  border-radius: 10px;

  overflow: hidden;

}

.skill-progress {

  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      var(--purple-3),
      var(--purple)
    );

  box-shadow:
    0 0 12px
    rgba(199,178,255,.22);

  transition:
    width
    1.2s
    cubic-bezier(.2,.8,.2,1);

}

/* =========================================================
   DAILY GOAL
========================================================= */

.goal-score {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin:
    10px 0 25px;

}

.goal-score strong {

  display: block;

  font-family:
    "Space Grotesk";

  font-size: 34px;

  color:
    var(--purple);

}

.goal-score span {

  display: block;

  margin-top: 3px;

  color:
    var(--text-3);

  font-size: 9px;

}

.mini-ring {

  width: 56px;
  height: 56px;

}

.mini-ring svg {

  width: 100%;
  height: 100%;

  transform:
    rotate(-90deg);

}

.mini-track,
.mini-progress {

  fill: none;

  stroke-width: 6;

}

.mini-track {

  stroke:
    rgba(255,255,255,.06);

}

.mini-progress {

  stroke:
    var(--purple);

  stroke-dasharray:
    151;

  stroke-linecap: round;

  transition:
    1s ease;

}

.mission-list {

  display: flex;

  flex-direction: column;

  gap: 11px;

}

.mission {

  display: flex;

  align-items: center;

  gap: 10px;

  color:
    var(--text-2);

  font-size: 10px;

}

.mission-check {

  width: 18px;
  height: 18px;

  display: flex;

  align-items: center;
  justify-content: center;

  border:
    1px solid
    rgba(255,255,255,.15);

  border-radius: 50%;

}

.mission.completed {

  color:
    var(--text-3);

  text-decoration:
    line-through;

}

.mission.completed
.mission-check {

  color:
    var(--success);

  border-color:
    rgba(82,227,164,.4);

  background:
    rgba(82,227,164,.08);

}

/* =========================================================
   RECOMMENDATIONS
========================================================= */

.recommendations {

  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 12px;

}

.recommendation {

  display: flex;

  gap: 12px;

  padding: 16px;

  border:
    1px solid
    rgba(255,255,255,.07);

  border-radius: 14px;

  background:
    rgba(0,0,0,.12);

  transition:
    .25s ease;

}

.recommendation:hover {

  border-color:
    var(--border-hover);

  transform:
    translateY(-3px);

}

.recommendation-icon {

  width: 32px;
  height: 32px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 9px;

  color:
    var(--purple);

  background:
    rgba(199,178,255,.08);

}

.recommendation strong {

  font-size: 11px;

}

.recommendation p {

  margin:
    6px 0 10px;

  color:
    var(--text-3);

  font-size: 9px;

  line-height: 1.6;

}

.recommendation button {

  display: flex;

  align-items: center;

  gap: 5px;

  border: 0;

  padding: 0;

  background:
    transparent;

  color:
    var(--purple);

  font-size: 9px;

  cursor: pointer;

}

/* =========================================================
   ACTIVITY
========================================================= */

.activity-list {

  display: flex;

  flex-direction: column;

  gap: 12px;

}

.activity {

  display: flex;

  align-items: center;

  gap: 10px;

}

.activity-icon {

  width: 32px;
  height: 32px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 9px;

  color:
    var(--purple);

  background:
    rgba(199,178,255,.07);

}

.activity-copy {

  flex: 1;

  min-width: 0;

}

.activity-copy strong {

  display: block;

  font-size: 10px;

}

.activity-copy span {

  display: block;

  margin-top: 3px;

  color:
    var(--text-3);

  font-size: 8px;

  overflow:
    hidden;

  white-space:
    nowrap;

  text-overflow:
    ellipsis;

}

.activity small {

  color:
    var(--text-3);

  font-size: 7px;

}

/* =========================================================
   TRIPLE
========================================================= */

.triple-grid {

  display: grid;

  grid-template-columns:
    repeat(3,1fr);

  gap: 15px;

}

.compact {

  min-height: 265px;

}

.interview-head {

  display: flex;

  justify-content: space-between;

}

.interview-head strong {

  display: block;

  font-size: 12px;

}

.interview-head span {

  display: block;

  margin-top: 4px;

  color:
    var(--text-3);

  font-size: 9px;

}

.interview-score {

  color:
    var(--purple);

  font-family:
    "Space Grotesk";

  font-size: 25px;

  font-weight: 700;

}

.interview-score small {

  color:
    var(--text-3);

  font-size: 9px;

}

.score-row {

  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin:
    25px 0;

}

.score-row span {

  padding:
    10px;

  border:
    1px solid
    rgba(255,255,255,.06);

  border-radius: 9px;

  color:
    var(--text-3);

  font-size: 8px;

}

.score-row strong {

  display: block;

  margin-top: 4px;

  color:
    white;

  font-size: 11px;

}

.wide-btn {

  width: 100%;

  display: flex;

  align-items: center;
  justify-content: center;

  gap: 7px;

  padding:
    10px;

  border:
    1px solid
    rgba(199,178,255,.2);

  border-radius: 9px;

  background:
    rgba(199,178,255,.06);

  color:
    white;

  font-size: 9px;

  font-weight: 700;

  cursor: pointer;

  transition:
    .25s ease;

}

.wide-btn:hover {

  background:
    var(--purple);

  color:
    #18131f;

  box-shadow:
    0 10px 30px
    rgba(161,130,255,.18);

}

.resume-state {

  display: flex;

  align-items: center;

  gap: 7px;

  margin:
    10px 0 20px;

  color:
    var(--success);

  font-size: 9px;

}

.resume-state span {

  display: flex;

}

.progress-stat {

  margin-bottom: 15px;

}

.progress-stat > div:first-child {

  display: flex;

  justify-content: space-between;

  margin-bottom: 6px;

}

.progress-stat span {

  color:
    var(--text-3);

  font-size: 8px;

}

.progress-stat strong {

  font-size: 8px;

}

.progress-track {

  height: 4px;

  border-radius: 10px;

  background:
    rgba(255,255,255,.06);

  overflow: hidden;

}

.progress-track > div {

  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      var(--purple-3),
      var(--purple)
    );

}

.profile-score {

  display: flex;

  align-items: baseline;

  gap: 7px;

}

.profile-score strong {

  font-family:
    "Space Grotesk";

  font-size: 30px;

}

.profile-score span {

  color:
    var(--text-3);

  font-size: 8px;

}

.profile-progress {

  height: 5px;

  margin:
    12px 0 18px;

  border-radius: 10px;

  overflow: hidden;

  background:
    rgba(255,255,255,.06);

}

.profile-progress div {

  height: 100%;

  background:
    linear-gradient(
      90deg,
      var(--purple-3),
      var(--purple)
    );

}

.profile-items {

  display: grid;

  gap: 9px;

}

.profile-item {

  display: flex;

  align-items: center;

  gap: 8px;

  color:
    var(--text-3);

  font-size: 9px;

}

.profile-item > span {

  width: 16px;
  height: 16px;

  display: flex;

  align-items: center;
  justify-content: center;

  border:
    1px solid
    rgba(255,255,255,.12);

  border-radius: 50%;

}

.profile-item.done {

  color:
    var(--text-2);

}

.profile-item.done > span {

  color:
    var(--success);

  border-color:
    rgba(82,227,164,.3);

  background:
    rgba(82,227,164,.06);

}

/* =========================================================
   COMPANIES
========================================================= */

.section-heading {

  display: flex;

  align-items: end;
  justify-content: space-between;

  margin:
    38px 0 15px;

}

.section-heading > div > span {

  color:
    var(--purple);

  font-size: 8px;

  letter-spacing:
    1.5px;

}

.section-heading h2 {

  margin:
    5px 0 0;

  font-family:
    "Space Grotesk";

  font-size: 20px;

}

.outline-btn {

  display: flex;

  align-items: center;

  gap: 7px;

  padding:
    8px 12px;

  border:
    1px solid
    var(--border);

  border-radius: 9px;

  background:
    rgba(255,255,255,.025);

  color:
    var(--text-2);

  font-size: 9px;

  cursor: pointer;

  transition:
    .25s ease;

}

.outline-btn:hover {

  color:
    white;

  border-color:
    var(--border-hover);

  background:
    rgba(199,178,255,.07);

}

.company-grid {

  display: grid;

  grid-template-columns:
    repeat(3,1fr);

  gap: 13px;

}

.company-card {

  width: 100%;

  display: grid;

  grid-template-columns:
    42px 1fr auto;

  grid-template-rows:
    auto auto;

  column-gap: 12px;

  padding: 17px;

  border:
    1px solid
    var(--border);

  border-radius: 15px;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.055),
      rgba(255,255,255,.018)
    );

  text-align: left;

  cursor: pointer;

  transition:
    .3s
    cubic-bezier(.2,.8,.2,1);

}

.company-card:hover {

  transform:
    translateY(-5px);

  border-color:
    var(--border-hover);

  box-shadow:
    0 18px 50px
    rgba(0,0,0,.25),
    0 0 35px
    rgba(139,107,255,.06);

}

.company-logo {

  grid-row:
    span 2;

  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 11px;

  background:
    rgba(255,255,255,.06);

  border:
    1px solid
    rgba(255,255,255,.08);

  font-family:
    "Space Grotesk";

  font-size: 17px;

  font-weight: 700;

}

.company-logo img {

  width: 25px;
  height: 25px;

  object-fit: contain;

}

.company-info strong {

  display: block;

  font-size: 11px;

}

.company-info span {

  display: block;

  margin-top: 3px;

  color:
    var(--text-3);

  font-size: 8px;

}

.company-readiness {

  grid-column:
    2 / 4;

  margin-top: 14px;

}

.company-readiness > div:first-child {

  display: flex;

  justify-content: space-between;

  margin-bottom: 5px;

}

.company-readiness span {

  color:
    var(--text-3);

  font-size: 7px;

  letter-spacing:
    1px;

}

.company-readiness strong {

  font-size: 8px;

}

.company-bar {

  height: 4px;

  overflow: hidden;

  border-radius: 10px;

  background:
    rgba(255,255,255,.06);

}

.company-bar div {

  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      var(--purple-3),
      var(--purple)
    );

}

/* =========================================================
   EMPTY STATES
========================================================= */

.empty-state {

  min-height: 100px;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 8px;

  text-align: center;

  color:
    var(--text-3);

  font-size: 9px;

  line-height: 1.5;

}

.empty-state svg {

  color:
    var(--purple);

  opacity: .6;

}

.empty-card {

  min-height: 175px;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  text-align: center;

}

.empty-card strong {

  font-size: 11px;

}

.empty-card > span {

  max-width: 220px;

  margin:
    8px 0 18px;

  color:
    var(--text-3);

  font-size: 8px;

  line-height: 1.5;

}

.company-empty {

  grid-column:
    1 / -1;

  min-height: 130px;

  padding: 20px;

  display: flex;

  align-items: center;

  gap: 15px;

  border-radius: 15px;

}

.company-empty-icon {

  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  color:
    var(--purple);

  border-radius: 11px;

  background:
    rgba(199,178,255,.07);

}

.company-empty > div:nth-child(2) {

  flex: 1;

}

.company-empty strong {

  display: block;

  font-size: 11px;

}

.company-empty span {

  display: block;

  margin-top: 4px;

  color:
    var(--text-3);

  font-size: 8px;

}

.primary-btn {

  padding:
    10px 16px;

  border:
    0;

  border-radius: 9px;

  background:
    linear-gradient(
      135deg,
      #d0bfff,
      #9375ee
    );

  color:
    #17121e;

  font-size: 9px;

  font-weight: 800;

  cursor: pointer;

  box-shadow:
    0 10px 30px
    rgba(150,115,240,.15);

  transition:
    .25s ease;

}

.primary-btn:hover {

  transform:
    translateY(-2px);

  box-shadow:
    0 15px 35px
    rgba(150,115,240,.25);

}

.skeleton {

  width: 60px;
  height: 22px;

  display: inline-block;

  border-radius: 6px;

  background:
    linear-gradient(
      90deg,
      rgba(255,255,255,.04),
      rgba(255,255,255,.09),
      rgba(255,255,255,.04)
    );

  background-size:
    200% 100%;

  animation:
    shimmer 1.5s infinite;

}

@keyframes shimmer {

  to {
    background-position:
      -200% 0;
  }

}

/* =========================================================
   ERROR
========================================================= */

.system-error {

  width: 100%;
  height: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  background:
    var(--bg);

  color:
    white;

}

.error-orb {

  width: 65px;
  height: 65px;

  display: flex;

  align-items: center;
  justify-content: center;

  margin-bottom: 15px;

  border-radius: 50%;

  color:
    #c7b2ff;

  background:
    rgba(199,178,255,.08);

  border:
    1px solid
    rgba(199,178,255,.2);

}

.system-error h1 {

  font-family:
    "Space Grotesk";

  font-size: 24px;

}

.system-error p {

  max-width: 400px;

  text-align: center;

  color:
    var(--text-3);

  font-size: 11px;

}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1200px) {

  .sidebar {
    width: 210px;
  }

  .metric-grid {
    grid-template-columns:
      repeat(2,1fr);
  }

  .company-grid {
    grid-template-columns:
      repeat(2,1fr);
  }

}

@media (max-width: 900px) {

  .sidebar {
    width: 70px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .brand {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }

  .brand > div:last-child,
  .nav-item > span:last-child,
  .nav-label,
  .nav-sub,
  .system-status {
    display: none;
  }

  .nav-item {
    justify-content: center;
  }

  .topbar {
    padding:
      0 18px;
  }

  .search {
    width: 220px;
  }

  .content {
    padding:
      20px 18px 50px;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 25px;
  }

  .readiness {
    width: 100%;
    justify-content: space-between;
  }

  .two-column,
  .triple-grid {
    grid-template-columns:
      1fr;
  }

}

@media (max-width: 650px) {

  .sidebar {
    display: none;
  }

  .search {
    width: 45px;
    overflow: hidden;
  }

  .search input,
  .search kbd {
    display: none;
  }

  .user-chip-text {
    display: none;
  }

  .hero {
    padding: 25px;
  }

  .metric-grid,
  .company-grid,
  .recommendations {
    grid-template-columns:
      1fr;
  }

  .performance-body {
    flex-direction: column;
    gap: 20px;
  }

  .radar-wrap {
    width: 180px;
  }

}

`;