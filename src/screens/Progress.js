// Progress.jsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileText,
  Flame,
  GraduationCap,
  Mic2,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  XCircle,
  Zap,
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "";

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value,
  fallback = 0
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function clamp(
  value,
  min = 0,
  max = 100
) {
  return Math.max(
    min,
    Math.min(
      max,
      safeNumber(value)
    )
  );
}

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  try {
    let date;

    if (
      typeof value ===
      "object" &&
      value.seconds
    ) {
      date = new Date(
        value.seconds * 1000
      );
    } else {
      date = new Date(value);
    }

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

function formatRelativeDate(
  value
) {
  if (!value) {
    return "No activity";
  }

  try {
    let date;

    if (
      typeof value ===
        "object" &&
      value.seconds
    ) {
      date = new Date(
        value.seconds * 1000
      );
    } else {
      date = new Date(value);
    }

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "No activity";
    }

    const diff =
      Date.now() -
      date.getTime();

    const minutes =
      Math.floor(
        diff / 60000
      );

    const hours =
      Math.floor(
        diff / 3600000
      );

    const days =
      Math.floor(
        diff / 86400000
      );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    if (days < 7) {
      return `${days} day${
        days === 1 ? "" : "s"
      } ago`;
    }

    return formatDate(value);
  } catch {
    return "No activity";
  }
}

function getAuthToken() {
  /*
   * Replace this with your existing Firebase auth
   * token provider if your project already has one.
   *
   * Example:
   *
   * const user = auth.currentUser;
   * return user?.getIdToken();
   */

  return null;
}

/* =========================================================
   API
========================================================= */

async function fetchProgress() {
  const token =
    await getAuthToken();

  const headers = {
    "Content-Type":
      "application/json",
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE}/api/progress`,
      {
        method: "GET",
        headers,
        credentials:
          "include",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Progress API failed: ${response.status}`
    );
  }

  const json =
    await response.json();

  if (!json.success) {
    throw new Error(
      json.error?.message ||
        "Unable to load progress."
    );
  }

  return json.data;
}

/* =========================================================
   DEFAULT STRUCTURE

   This prevents the UI from crashing if some
   activity has not happened yet.
========================================================= */

const EMPTY_PROGRESS = {
  overview: {
    overall: 0,
    change: 0,
    completedActivities: 0,
    totalActivities: 0,
    activeDays: 0,
  },

  assessments: {
    total: 0,
    average: 0,
    best: 0,
    latest: 0,

    aptitude: {
      attempted: 0,
      average: 0,
      best: 0,
      accuracy: 0,
      questions: 0,
      correct: 0,
    },

    technical: {
      attempted: 0,
      average: 0,
      best: 0,
      accuracy: 0,
      questions: 0,
      correct: 0,
    },

    history: [],
  },

  coding: {
    problemsSolved: 0,
    problemsAttempted: 0,
    accuracy: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    streak: 0,
    recent: [],
  },

  interviews: {
    total: 0,
    completed: 0,
    averageScore: 0,
    bestScore: 0,
    recent: [],
  },

  skills: [],

  rolePreparation: {
    readiness: 0,
    completedRounds: 0,
    totalRounds: 0,
    currentStage: null,
    companies: [],
  },

  resume: {
    uploaded: false,
    score: 0,
    atsReadiness: 0,
    technicalRelevance: 0,
  },

  goals: {
    percentage: 0,
    completed: 0,
    total: 0,
    items: [],
  },

  streak: {
    current: 0,
    longest: 0,
    activeToday: false,
  },

  achievements: {
    total: 0,
    unlocked: 0,
    items: [],
  },

  activity: [],
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Progress() {
  const [
    progress,
    setProgress,
  ] = useState(
    EMPTY_PROGRESS
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  /* =======================================================
     LOAD
  ======================================================= */

  const loadProgress =
    async (
      isRefresh = false
    ) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await fetchProgress();

        setProgress({
          ...EMPTY_PROGRESS,
          ...(data || {}),
          overview: {
            ...EMPTY_PROGRESS.overview,
            ...(data?.overview || {}),
          },
          assessments: {
            ...EMPTY_PROGRESS.assessments,
            ...(data?.assessments || {}),
            aptitude: {
              ...EMPTY_PROGRESS
                .assessments
                .aptitude,
              ...(data?.assessments
                ?.aptitude || {}),
            },
            technical: {
              ...EMPTY_PROGRESS
                .assessments
                .technical,
              ...(data?.assessments
                ?.technical || {}),
            },
          },
          coding: {
            ...EMPTY_PROGRESS.coding,
            ...(data?.coding || {}),
          },
          interviews: {
            ...EMPTY_PROGRESS.interviews,
            ...(data?.interviews || {}),
          },
          rolePreparation: {
            ...EMPTY_PROGRESS.rolePreparation,
            ...(data?.rolePreparation ||
              {}),
          },
          resume: {
            ...EMPTY_PROGRESS.resume,
            ...(data?.resume || {}),
          },
          goals: {
            ...EMPTY_PROGRESS.goals,
            ...(data?.goals || {}),
          },
          streak: {
            ...EMPTY_PROGRESS.streak,
            ...(data?.streak || {}),
          },
          achievements: {
            ...EMPTY_PROGRESS.achievements,
            ...(data?.achievements || {}),
          },
        });
      } catch (err) {
        console.error(
          "[PROGRESS]",
          err
        );

        setError(
          err.message ||
            "Unable to load progress."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    loadProgress();
  }, []);

  /* =======================================================
     CALCULATED VALUES
  ======================================================= */

  const overall =
    clamp(
      progress.overview
        ?.overall
    );

  const activity =
    Array.isArray(
      progress.activity
    )
      ? progress.activity
      : [];

  const skills =
    Array.isArray(
      progress.skills
    )
      ? progress.skills
      : [];

  const assessmentHistory =
    Array.isArray(
      progress.assessments
        ?.history
    )
      ? progress.assessments
          .history
      : [];

  const interviews =
    Array.isArray(
      progress.interviews
        ?.recent
    )
      ? progress.interviews
          .recent
      : [];

  const codingRecent =
    Array.isArray(
      progress.coding
        ?.recent
    )
      ? progress.coding
          .recent
      : [];

  const companies =
    Array.isArray(
      progress.rolePreparation
        ?.companies
    )
      ? progress.rolePreparation
          .companies
      : [];

  const weakestSkills =
    useMemo(() => {
      return [
        ...skills,
      ]
        .sort(
          (a, b) =>
            safeNumber(
              a.score
            ) -
            safeNumber(
              b.score
            )
        )
        .slice(0, 3);
    }, [skills]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-loading">
          <RefreshCw
            size={28}
            className="spin"
          />

          <span>
            Loading your progress...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="progress-page">
        <div className="progress-error">
          <XCircle
            size={40}
          />

          <h2>
            Unable to load progress
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={() =>
              loadProgress()
            }
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="progress-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="progress-header">

        <div>
          <div className="eyebrow">
            ENGVIVA
          </div>

          <h1>
            Your Progress
          </h1>

          <p>
            Every assessment, practice,
            interview and preparation activity
            in one place.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() =>
            loadProgress(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}
        </button>

      </header>

      {/* ===================================================
          HERO SCORE
      =================================================== */}

      <section className="progress-hero">

        <div className="hero-score">

          <div className="score-ring">
            <svg
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="50"
                className="ring-bg"
              />

              <circle
                cx="60"
                cy="60"
                r="50"
                className="ring-value"
                strokeDasharray={`${
                  overall *
                  3.14159
                } 314.159`}
                transform="rotate(-90 60 60)"
              />
            </svg>

            <div className="ring-content">
              <strong>
                {overall}
              </strong>

              <span>
                %
              </span>
            </div>
          </div>

          <div>
            <span className="muted-label">
              OVERALL PROGRESS
            </span>

            <h2>
              {overall >= 85
                ? "Excellent progress"
                : overall >= 70
                ? "Strong progress"
                : overall >= 50
                ? "You're developing"
                : "Build your foundation"}
            </h2>

            <p>
              Based on your actual activity
              across ENGVIVA.
            </p>
          </div>

        </div>

        <div className="hero-stats">

          <Stat
            icon={
              <CheckCircle2
                size={18}
              />
            }
            label="Activities"
            value={
              progress.overview
                ?.completedActivities ||
              0
            }
          />

          <Stat
            icon={
              <Flame
                size={18}
              />
            }
            label="Current streak"
            value={
              progress.streak
                ?.current || 0
            }
          />

          <Stat
            icon={
              <Trophy
                size={18}
              />
            }
            label="Achievements"
            value={
              progress.achievements
                ?.unlocked || 0
            }
          />

          <Stat
            icon={
              <TrendingUp
                size={18}
              />
            }
            label="Active days"
            value={
              progress.overview
                ?.activeDays || 0
            }
          />

        </div>

      </section>

      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <nav className="progress-tabs">

        {[
          [
            "overview",
            "Overview",
            BarChart3,
          ],
          [
            "assessments",
            "Assessments",
            Brain,
          ],
          [
            "coding",
            "Coding",
            Code2,
          ],
          [
            "interviews",
            "Interviews",
            Mic2,
          ],
          [
            "skills",
            "Skills",
            Target,
          ],
          [
            "activity",
            "All Activity",
            Activity,
          ],
        ].map(
          ([
            id,
            label,
            Icon,
          ]) => (
            <button
              key={id}
              className={
                activeTab === id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(id)
              }
            >
              <Icon size={16} />
              {label}
            </button>
          )
        )}

      </nav>

      {/* ===================================================
          OVERVIEW
      =================================================== */}

      {activeTab ===
        "overview" && (
        <div className="progress-content">

          {/* ASSESSMENT */}

          <Section
            title="Assessment progress"
            icon={
              <Brain size={19} />
            }
          >

            <div className="metric-grid">

              <MetricCard
                title="Overall average"
                value={
                  progress.assessments
                    ?.average || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Best score"
                value={
                  progress.assessments
                    ?.best || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Aptitude accuracy"
                value={
                  progress.assessments
                    ?.aptitude
                    ?.accuracy || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Technical accuracy"
                value={
                  progress.assessments
                    ?.technical
                    ?.accuracy || 0
                }
                suffix="%"
              />

            </div>

          </Section>

          {/* SKILLS */}

          <Section
            title="Skill development"
            icon={
              <Target size={19} />
            }
          >

            <div className="skill-list">

              {skills.length ===
              0 ? (
                <EmptyState
                  text="No skill progress recorded yet."
                />
              ) : (
                skills.map(
                  (
                    skill,
                    index
                  ) => (
                    <SkillRow
                      key={
                        skill.id ||
                        skill.name ||
                        index
                      }
                      skill={
                        skill
                      }
                    />
                  )
                )
              )}

            </div>

          </Section>

          {/* CODING + INTERVIEW */}

          <div className="two-column">

            <Section
              title="Coding"
              icon={
                <Code2
                  size={19}
                />
              }
            >

              <LargeMetric
                value={
                  progress.coding
                    ?.problemsSolved ||
                  0
                }
                label="Problems solved"
              />

              <ProgressLine
                label="Accuracy"
                value={
                  progress.coding
                    ?.accuracy || 0
                }
              />

              <div className="small-stats">

                <MiniStat
                  label="Easy"
                  value={
                    progress.coding
                      ?.easy || 0
                  }
                />

                <MiniStat
                  label="Medium"
                  value={
                    progress.coding
                      ?.medium || 0
                  }
                />

                <MiniStat
                  label="Hard"
                  value={
                    progress.coding
                      ?.hard || 0
                  }
                />

              </div>

            </Section>

            <Section
              title="Mock interviews"
              icon={
                <Mic2
                  size={19}
                />
              }
            >

              <LargeMetric
                value={
                  progress.interviews
                    ?.completed ||
                  0
                }
                label="Interviews completed"
              />

              <ProgressLine
                label="Average score"
                value={
                  progress.interviews
                    ?.averageScore ||
                  0
                }
              />

              <ProgressLine
                label="Best score"
                value={
                  progress.interviews
                    ?.bestScore ||
                  0
                }
              />

            </Section>

          </div>

          {/* ROLE PREPARATION */}

          <Section
            title="Role preparation"
            icon={
              <BriefcaseBusiness
                size={19}
              />
            }
          >

            <div className="role-progress">

              <LargeMetric
                value={
                  progress.rolePreparation
                    ?.readiness ||
                  0
                }
                label="Role readiness"
                suffix="%"
              />

              <ProgressLine
                label="Preparation completion"
                value={
                  progress.rolePreparation
                    ?.totalRounds
                    ? (
                        progress
                          .rolePreparation
                          .completedRounds /
                        progress
                          .rolePreparation
                          .totalRounds
                      ) * 100
                    : 0
                }
              />

              <div className="current-stage">

                <span>
                  CURRENT STAGE
                </span>

                <strong>
                  {progress
                    .rolePreparation
                    ?.currentStage
                    ?.title ||
                    "No active stage"}
                </strong>

              </div>

            </div>

          </Section>

          {/* GOALS */}

          <Section
            title="Goals"
            icon={
              <Zap size={19} />
            }
          >

            <ProgressLine
              label="Daily goal"
              value={
                progress.goals
                  ?.percentage ||
                0
              }
            />

            <div className="goal-list">

              {progress.goals
                ?.items
                ?.length ? (
                progress.goals.items.map(
                  (
                    goal,
                    index
                  ) => (
                    <div
                      className="goal-item"
                      key={
                        goal.id ||
                        index
                      }
                    >
                      {goal.completed ? (
                        <CheckCircle2
                          size={18}
                        />
                      ) : (
                        <div className="empty-circle" />
                      )}

                      <span>
                        {goal.title}
                      </span>
                    </div>
                  )
                )
              ) : (
                <EmptyState
                  text="No daily goals recorded."
                />
              )}

            </div>

          </Section>

          {/* RESUME */}

          <Section
            title="Resume progress"
            icon={
              <FileText
                size={19}
              />
            }
          >

            <div className="metric-grid">

              <MetricCard
                title="Resume uploaded"
                value={
                  progress.resume
                    ?.uploaded
                    ? "YES"
                    : "NO"
                }
              />

              <MetricCard
                title="ATS readiness"
                value={
                  progress.resume
                    ?.atsReadiness ||
                  0
                }
                suffix="%"
              />

              <MetricCard
                title="Technical relevance"
                value={
                  progress.resume
                    ?.technicalRelevance ||
                  0
                }
                suffix="%"
              />

            </div>

          </Section>

          {/* WEAK AREAS */}

          <Section
            title="Focus areas"
            icon={
              <Target size={19} />
            }
          >

            {weakestSkills.length ===
            0 ? (
              <EmptyState
                text="Complete more activities to identify your weakest areas."
              />
            ) : (
              <div className="focus-list">
                {weakestSkills.map(
                  (
                    skill,
                    index
                  ) => (
                    <div
                      className="focus-item"
                      key={
                        skill.id ||
                        index
                      }
                    >
                      <div>
                        <strong>
                          {skill.name}
                        </strong>

                        <span>
                          Current score:{" "}
                          {clamp(
                            skill.score
                          )}
                          %
                        </span>
                      </div>

                      <ChevronRight
                        size={18}
                      />
                    </div>
                  )
                )}
              </div>
            )}

          </Section>

        </div>
      )}

      {/* ===================================================
          ASSESSMENTS
      =================================================== */}

      {activeTab ===
        "assessments" && (
        <div className="progress-content">

          <Section
            title="Assessment overview"
            icon={
              <Brain size={19} />
            }
          >

            <div className="metric-grid">

              <MetricCard
                title="Completed"
                value={
                  progress.assessments
                    ?.total || 0
                }
              />

              <MetricCard
                title="Average"
                value={
                  progress.assessments
                    ?.average || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Best"
                value={
                  progress.assessments
                    ?.best || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Latest"
                value={
                  progress.assessments
                    ?.latest || 0
                }
                suffix="%"
              />

            </div>

          </Section>

          <div className="two-column">

            <Section
              title="Aptitude"
              icon={
                <Brain size={19} />
              }
            >
              <ProgressLine
                label="Average"
                value={
                  progress.assessments
                    ?.aptitude
                    ?.average || 0
                }
              />

              <ProgressLine
                label="Accuracy"
                value={
                  progress.assessments
                    ?.aptitude
                    ?.accuracy || 0
                }
              />

              <MiniStat
                label="Tests"
                value={
                  progress.assessments
                    ?.aptitude
                    ?.attempted ||
                  0
                }
              />
            </Section>

            <Section
              title="Technical"
              icon={
                <GraduationCap
                  size={19}
                />
              }
            >
              <ProgressLine
                label="Average"
                value={
                  progress.assessments
                    ?.technical
                    ?.average || 0
                }
              />

              <ProgressLine
                label="Accuracy"
                value={
                  progress.assessments
                    ?.technical
                    ?.accuracy || 0
                }
              />

              <MiniStat
                label="Tests"
                value={
                  progress.assessments
                    ?.technical
                    ?.attempted ||
                  0
                }
              />
            </Section>

          </div>

          <Section
            title="Assessment history"
            icon={
              <Activity size={19} />
            }
          >

            {assessmentHistory
              .length === 0 ? (
              <EmptyState
                text="No completed assessments yet."
              />
            ) : (
              <div className="history-list">
                {assessmentHistory.map(
                  (
                    item,
                    index
                  ) => (
                    <HistoryItem
                      key={
                        item.id ||
                        item.attemptId ||
                        index
                      }
                      icon={
                        <Brain
                          size={18}
                        />
                      }
                      title={
                        item.title ||
                        "Assessment"
                      }
                      subtitle={`${formatDate(
                        item.completedAt
                      )} • ${
                        item.questionCount ||
                        0
                      } questions`}
                      score={
                        item.score
                      }
                    />
                  )
                )}
              </div>
            )}

          </Section>

        </div>
      )}

      {/* ===================================================
          CODING
      =================================================== */}

      {activeTab ===
        "coding" && (
        <div className="progress-content">

          <Section
            title="Coding progress"
            icon={
              <Code2 size={19} />
            }
          >

            <div className="metric-grid">

              <MetricCard
                title="Solved"
                value={
                  progress.coding
                    ?.problemsSolved ||
                  0
                }
              />

              <MetricCard
                title="Accuracy"
                value={
                  progress.coding
                    ?.accuracy || 0
                }
                suffix="%"
              />

              <MetricCard
                title="Current streak"
                value={
                  progress.coding
                    ?.streak || 0
                }
              />

              <MetricCard
                title="Hard solved"
                value={
                  progress.coding
                    ?.hard || 0
                }
              />

            </div>

          </Section>

          <Section
            title="Recent coding activity"
            icon={
              <Activity size={19} />
            }
          >

            {codingRecent
              .length === 0 ? (
              <EmptyState
                text="No coding activity recorded yet."
              />
            ) : (
              <div className="history-list">
                {codingRecent.map(
                  (
                    item,
                    index
                  ) => (
                    <HistoryItem
                      key={
                        item.id ||
                        index
                      }
                      icon={
                        <Code2
                          size={18}
                        />
                      }
                      title={
                        item.title ||
                        item.problem ||
                        "Coding problem"
                      }
                      subtitle={
                        item.difficulty ||
                        formatRelativeDate(
                          item.completedAt ||
                            item.timestamp
                        )
                      }
                      score={
                        item.score
                      }
                    />
                  )
                )}
              </div>
            )}

          </Section>

        </div>
      )}

      {/* ===================================================
          INTERVIEWS
      =================================================== */}

      {activeTab ===
        "interviews" && (
        <div className="progress-content">

          <Section
            title="Interview progress"
            icon={
              <Mic2 size={19} />
            }
          >

            <div className="metric-grid">

              <MetricCard
                title="Completed"
                value={
                  progress.interviews
                    ?.completed ||
                  0
                }
              />

              <MetricCard
                title="Average"
                value={
                  progress.interviews
                    ?.averageScore ||
                  0
                }
                suffix="%"
              />

              <MetricCard
                title="Best"
                value={
                  progress.interviews
                    ?.bestScore ||
                  0
                }
                suffix="%"
              />

              <MetricCard
                title="Total"
                value={
                  progress.interviews
                    ?.total ||
                  0
                }
              />

            </div>

          </Section>

          <Section
            title="Interview history"
            icon={
              <Activity size={19} />
            }
          >

            {interviews.length ===
            0 ? (
              <EmptyState
                text="No interview activity yet."
              />
            ) : (
              <div className="history-list">
                {interviews.map(
                  (
                    item,
                    index
                  ) => (
                    <HistoryItem
                      key={
                        item.id ||
                        index
                      }
                      icon={
                        <Mic2
                          size={18}
                        />
                      }
                      title={
                        item.title ||
                        "Mock interview"
                      }
                      subtitle={
                        formatDate(
                          item.completedAt ||
                            item.createdAt
                        )
                      }
                      score={
                        item.score ??
                        item.percentage
                      }
                    />
                  )
                )}
              </div>
            )}

          </Section>

        </div>
      )}

      {/* ===================================================
          SKILLS
      =================================================== */}

      {activeTab ===
        "skills" && (
        <div className="progress-content">

          <Section
            title="All skills"
            icon={
              <Target size={19} />
            }
          >

            {skills.length ===
            0 ? (
              <EmptyState
                text="No skill progress recorded yet."
              />
            ) : (
              <div className="skill-list">
                {skills.map(
                  (
                    skill,
                    index
                  ) => (
                    <SkillRow
                      key={
                        skill.id ||
                        skill.name ||
                        index
                      }
                      skill={
                        skill
                      }
                    />
                  )
                )}
              </div>
            )}

          </Section>

        </div>
      )}

      {/* ===================================================
          ALL ACTIVITY
      =================================================== */}

      {activeTab ===
        "activity" && (
        <div className="progress-content">

          <Section
            title="Complete activity history"
            icon={
              <Activity size={19} />
            }
          >

            {activity.length ===
            0 ? (
              <EmptyState
                text="No activity recorded yet."
              />
            ) : (
              <div className="activity-list">

                {activity.map(
                  (
                    item,
                    index
                  ) => (
                    <ActivityItem
                      key={
                        item.id ||
                        index
                      }
                      item={
                        item
                      }
                    />
                  )
                )}

              </div>
            )}

          </Section>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Stat({
  icon,
  label,
  value,
}) {
  return (
    <div className="hero-stat">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}) {
  return (
    <section className="progress-section">

      <div className="section-header">

        <div className="section-title">
          <div className="section-icon">
            {icon}
          </div>

          <h3>
            {title}
          </h3>
        </div>

      </div>

      {children}

    </section>
  );
}

function MetricCard({
  title,
  value,
  suffix = "",
}) {
  return (
    <div className="metric-card">

      <span>
        {title}
      </span>

      <strong>
        {value}
        {suffix}
      </strong>

    </div>
  );
}

function LargeMetric({
  value,
  label,
  suffix = "",
}) {
  return (
    <div className="large-metric">

      <strong>
        {safeNumber(value)}
        {suffix}
      </strong>

      <span>
        {label}
      </span>

    </div>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="mini-stat">

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>
  );
}

function ProgressLine({
  label,
  value,
}) {
  const percentage =
    clamp(value);

  return (
    <div className="progress-line">

      <div className="progress-line-header">

        <span>
          {label}
        </span>

        <strong>
          {percentage}%
        </strong>

      </div>

      <div className="progress-track">

        <div
          className="progress-fill"
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

function SkillRow({
  skill,
}) {
  const score =
    clamp(
      skill.score
    );

  const target =
    clamp(
      skill.target ||
        0
    );

  return (
    <div className="skill-row">

      <div className="skill-row-top">

        <div>

          <strong>
            {skill.name}
          </strong>

          {skill.category && (
            <span>
              {skill.category}
            </span>
          )}

        </div>

        <strong>
          {score}%
        </strong>

      </div>

      <div className="progress-track">

        <div
          className="progress-fill"
          style={{
            width:
              `${score}%`,
          }}
        />

      </div>

      {target > 0 && (
        <small>
          Target: {target}%
        </small>
      )}

    </div>
  );
}

function HistoryItem({
  icon,
  title,
  subtitle,
  score,
}) {
  return (
    <div className="history-item">

      <div className="history-icon">
        {icon}
      </div>

      <div className="history-content">

        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>

      </div>

      {score !==
        undefined &&
        score !==
          null && (
          <div className="history-score">
            {clamp(
              score
            )}
            %
          </div>
        )}

    </div>
  );
}

function ActivityItem({
  item,
}) {
  const type =
    String(
      item.type ||
        "activity"
    ).toLowerCase();

  let Icon =
    Activity;

  if (
    type.includes(
      "assessment"
    )
  ) {
    Icon = Brain;
  } else if (
    type.includes(
      "coding"
    ) ||
    type.includes(
      "problem"
    )
  ) {
    Icon = Code2;
  } else if (
    type.includes(
      "interview"
    )
  ) {
    Icon = Mic2;
  } else if (
    type.includes(
      "resume"
    )
  ) {
    Icon = FileText;
  } else if (
    type.includes(
      "achievement"
    )
  ) {
    Icon = Award;
  }

  return (
    <div className="activity-item">

      <div className="activity-icon">
        <Icon size={18} />
      </div>

      <div className="activity-main">

        <strong>
          {item.title ||
            "Activity"}
        </strong>

        <span>
          {item.description ||
            ""}
        </span>

      </div>

      <div className="activity-time">
        {formatRelativeDate(
          item.timestamp ||
            item.createdAt ||
            item.completedAt
        )}
      </div>

      {item.score !==
        undefined &&
        item.score !==
          null && (
          <div className="activity-score">
            {clamp(
              item.score
            )}
            %
          </div>
        )}

    </div>
  );
}

function EmptyState({
  text,
}) {
  return (
    <div className="empty-state">

      <Activity
        size={22}
      />

      <span>
        {text}
      </span>

    </div>
  );
}