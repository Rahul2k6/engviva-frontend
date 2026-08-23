import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../firebase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

/* =========================================================
   SAFE DEFAULT
========================================================= */

const EMPTY_DATA = {
  company: {
    id: "",
    name: "Company",
    category: "",
  },

  role: {
    id: "",
    name: "Engineering Role",
    level: "ENGINEERING",
    description: "",
  },

  analysis: {
    readiness: 0,
    verdict: "ANALYSIS PENDING",
    summary:
      "Complete your profile and assessments to generate your role analysis.",

    strongestSkill: null,
    weakestSkill: null,

    criticalGaps: [],

    nextAction: null,

    resumeMatch: 0,

    profileComplete: false,

    profileScore: 0,

    skillReadiness: 0,

    assessmentScore: 0,
  },

  skills: [],

  rounds: [],

  progress: {
    completed: 0,
    total: 0,
    currentStage: null,
  },

  package: {
    expected: null,
    estimatedMin: null,
    estimatedMax: null,
  },

  meta: {},
};

/* =========================================================
   HELPERS
========================================================= */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clamp(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, n)
  );
}

/* =========================================================
   ICON
========================================================= */

function Icon({
  type,
  size = 17,
}) {
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    back: (
      <>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </>
    ),

    check: (
      <path d="m5 12 4 4L19 6" />
    ),

    lock: (
      <>
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2"
        />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    target: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
        />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.9-4" />
        <path d="M4 5v5h5" />
        <path d="M4 13a8 8 0 0 0 14.9 4" />
        <path d="M20 19v-5h-5" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

/* =========================================================
   READINESS GAUGE
========================================================= */

function ReadinessGauge({
  value,
}) {
  const safeValue =
    clamp(value);

  const radius = 68;

  const circumference =
    2 *
    Math.PI *
    radius;

  const offset =
    circumference -
    (safeValue / 100) *
      circumference;

  return (
    <div className="rp-gauge">
      <svg viewBox="0 0 160 160">
        <circle
          className="rp-gauge-bg"
          cx="80"
          cy="80"
          r={radius}
        />

        <circle
          className="rp-gauge-progress"
          cx="80"
          cy="80"
          r={radius}
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />
      </svg>

      <div className="rp-gauge-center">
        <strong>
          {Math.round(
            safeValue
          )}
        </strong>

        <span>%</span>
      </div>
    </div>
  );
}

/* =========================================================
   SKILL CARD
========================================================= */

function SkillCard({
  skill,
}) {
  const score =
    clamp(skill?.score);

  const target =
    clamp(
      skill?.target || 70
    );

  const gap =
    Math.max(
      0,
      target - score
    );

  let state =
    "NEEDS WORK";

  if (score >= target) {
    state = "READY";
  } else if (
    score >= target * 0.75
  ) {
    state = "DEVELOPING";
  }

  return (
    <article className="rp-skill-card">
      <div className="rp-skill-top">
        <div>
          <span className="rp-micro">
            {skill?.category ||
              "ROLE SKILL"}
          </span>

          <h3>
            {skill?.name ||
              "Skill"}
          </h3>
        </div>

        <span
          className={`rp-priority ${
            String(
              skill?.importance ||
                "MEDIUM"
            ).toLowerCase()
          }`}
        >
          {skill?.importance ||
            "MEDIUM"}
        </span>
      </div>

      <div className="rp-skill-values">
        <span>{state}</span>

        <strong>
          {Math.round(score)}%
        </strong>
      </div>

      <div className="rp-progress-track">
        <span
          style={{
            width: `${score}%`,
          }}
        />
      </div>

      <div className="rp-skill-footer">
        <span>
          TARGET {Math.round(target)}%
        </span>

        <span>
          {gap > 0
            ? `${Math.round(
                gap
              )} POINT GAP`
            : "TARGET REACHED"}
        </span>
      </div>
    </article>
  );
}

/* =========================================================
   ROUND CARD
========================================================= */

function RoundCard({
  round,
  index,
  onOpen,
}) {
  const status =
    round?.status ||
    (index === 0
      ? "available"
      : "locked");

  const locked =
    status === "locked";

  const completed =
    status === "completed";

  return (
    <article
      className={`rp-round-card ${
        locked ? "locked" : ""
      } ${
        completed
          ? "completed"
          : ""
      }`}
    >
      <div className="rp-round-index">
        {String(
          round?.number ||
            index + 1
        ).padStart(2, "0")}
      </div>

      <div className="rp-round-content">
        <div className="rp-round-header">
          <span>
            {round?.type ||
              "ASSESSMENT"}
          </span>

          <b>
            {completed
              ? "COMPLETED"
              : locked
              ? "LOCKED"
              : "AVAILABLE"}
          </b>
        </div>

        <h3>
          {round?.title ||
            round?.name ||
            "Preparation Stage"}
        </h3>

        <p>
          {round?.description ||
            "Role-specific preparation stage."}
        </p>

        <div className="rp-round-meta">
          <span>
            {round?.duration ||
              "TIMED"}
          </span>

          <span>
            {round?.levels || 1} LEVEL
            {Number(
              round?.levels || 1
            ) === 1
              ? ""
              : "S"}
          </span>
        </div>
      </div>

      <button
        className="rp-round-button"
        disabled={locked}
        onClick={() =>
          !locked &&
          onOpen(round)
        }
      >
        {completed
          ? "REVIEW"
          : locked
          ? "LOCKED"
          : "ENTER"}

        {!locked && (
          <Icon type="arrow" size={15} />
        )}

        {locked && (
          <Icon type="lock" size={14} />
        )}
      </button>
    </article>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function RolePreparation() {
  const navigate =
    useNavigate();

  const [params] =
    useSearchParams();

  const companyId =
    params.get("company");

  const role =
    params.get("role");

  const [
    data,
    setData,
  ] = useState(
    EMPTY_DATA
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeSection,
    setActiveSection,
  ] = useState(
    "overview"
  );

  /* =======================================================
     LOAD
  ======================================================= */

  const loadRolePreparation =
    useCallback(
      async () => {
        if (
          !companyId ||
          !role
        ) {
          setError(
            "This role link is incomplete. Select a company and role again."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          /*
           * IMPORTANT:
           * Wait for Firebase session restoration.
           */

          const user =
            await new Promise(
              (resolve) => {
                let finished =
                  false;

                const unsubscribe =
                  onAuthStateChanged(
                    auth,
                    (currentUser) => {
                      if (
                        finished
                      ) {
                        return;
                      }

                      finished =
                        true;

                      unsubscribe();

                      resolve(
                        currentUser
                      );
                    }
                  );
              }
            );

          if (!user) {
            throw new Error(
              "Your login session is unavailable. Please sign in again."
            );
          }

          const token =
            await user.getIdToken(
              true
            );

          const query =
            new URLSearchParams();

          query.set(
            "companyId",
            companyId
          );

          query.set(
            "role",
            role
          );

          const response =
            await fetch(
              `${API_BASE}/api/role-preparation?${query.toString()}`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  Accept:
                    "application/json",
                },
              }
            );

          let result = null;

          try {
            result =
              await response.json();
          } catch {
            throw new Error(
              `Backend returned an invalid response (${response.status}).`
            );
          }

          if (
            !response.ok ||
            result?.success === false
          ) {
            throw new Error(
              result?.error
                ?.message ||
                result?.error ||
                `Role engine returned ${response.status}.`
            );
          }

          const incoming =
            result?.data ||
            result;

          /*
           * Normalize EVERYTHING here.
           * UI never crashes because an optional
           * backend field is missing.
           */

          setData({
            ...EMPTY_DATA,

            ...incoming,

            company: {
              ...EMPTY_DATA.company,

              ...(incoming.company ||
                {}),
            },

            role: {
              ...EMPTY_DATA.role,

              ...(incoming.role ||
                {}),
            },

            analysis: {
              ...EMPTY_DATA.analysis,

              ...(incoming.analysis ||
                {}),
            },

            progress: {
              ...EMPTY_DATA.progress,

              ...(incoming.progress ||
                {}),
            },

            package: {
              ...EMPTY_DATA.package,

              ...(incoming.package ||
                {}),
            },

            skills:
              safeArray(
                incoming.skills
              ),

            rounds:
              safeArray(
                incoming.rounds
              ),

            meta:
              incoming.meta ||
              {},
          });
        } catch (err) {
          console.error(
            "[ENGVIVA ROLE PREPARATION]",
            err
          );

          setError(
            err?.message ||
              "Unable to generate role intelligence."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        companyId,
        role,
      ]
    );

  useEffect(() => {
    loadRolePreparation();
  }, [
    loadRolePreparation,
  ]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const skills =
    data.skills || [];

  const rounds =
    data.rounds || [];

  const readiness =
    clamp(
      data.analysis
        ?.readiness
    );

  const criticalGaps =
    data.analysis
      ?.criticalGaps || [];

  const weakestSkills =
    useMemo(
      () =>
        [...skills]
          .sort(
            (a, b) =>
              Number(
                a?.score || 0
              ) -
              Number(
                b?.score || 0
              )
          )
          .slice(0, 3),
      [skills]
    );

  const completedRounds =
    Number(
      data.progress
        ?.completed || 0
    );

  const totalRounds =
    Number(
      data.progress?.total ||
        rounds.length ||
        0
    );

  const roundProgress =
    totalRounds
      ? Math.round(
          (completedRounds /
            totalRounds) *
            100
        )
      : 0;

  const currentStage =
    data.progress
      ?.currentStage ||
    rounds.find(
      (item) =>
        item?.status ===
        "available"
    ) ||
    null;

  /* =======================================================
     ACTION
  ======================================================= */

  function openRound(round) {
    const roundId =
      round?.id ||
      round?.slug ||
      "assessment";

    const type =
      String(
        round?.type || ""
      ).toUpperCase();

    const company =
      encodeURIComponent(
        companyId
      );

    const encodedRole =
      encodeURIComponent(
        role
      );

    const encodedRound =
      encodeURIComponent(
        roundId
      );

    if (
      type === "CODING"
    ) {
      navigate(
        `/practice/coding?company=${company}&role=${encodedRole}&round=${encodedRound}`
      );

      return;
    }

    if (
      type.includes(
        "INTERVIEW"
      )
    ) {
      navigate(
        `/interviews?company=${company}&role=${encodedRole}&round=${encodedRound}`
      );

      return;
    }

    navigate(
      `/practice/assessments?company=${company}&role=${encodedRole}&round=${encodedRound}`
    );
  }

  function startNextAction() {
    const action =
      data.analysis
        ?.nextAction;

    if (
      action?.route
    ) {
      navigate(
        action.route
      );

      return;
    }

    setActiveSection(
      "roadmap"
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="rp-page rp-loading-page">
        <style>
          {styles}
        </style>

        <div className="rp-loader">
          <div className="rp-loader-ring" />

          <span>
            BUILDING YOUR ROLE INTELLIGENCE
          </span>

          <small>
            Reading profile · role · performance · preparation path
          </small>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="rp-page rp-error-page">
        <style>
          {styles}
        </style>

        <div className="rp-error-card">
          <div className="rp-error-icon">
            !
          </div>

          <span className="rp-eyebrow">
            ROLE INTELLIGENCE
          </span>

          <h1>
            The role engine needs attention.
          </h1>

          <p>
            {error}
          </p>

          <div className="rp-error-actions">
            <button
              onClick={
                loadRolePreparation
              }
            >
              <Icon
                type="refresh"
              />

              RETRY
            </button>

            <button
              className="secondary"
              onClick={() =>
                navigate(
                  "/roles"
                )
              }
            >
              BACK TO ROLES
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="rp-page">
      <style>
        {styles}
      </style>

      <div className="rp-grid-bg" />
      <div className="rp-glow rp-glow-one" />
      <div className="rp-glow rp-glow-two" />

      <main className="rp-shell">

        {/* HEADER */}

        <header className="rp-header">
          <button
            className="rp-back"
            onClick={() =>
              navigate(
                `/companies/${companyId}`
              )
            }
          >
            <Icon type="back" />

            <span>
              COMPANY
            </span>
          </button>

          <div className="rp-breadcrumb">
            <span>
              {data.company
                ?.name ||
                "COMPANY"}
            </span>

            <b>/</b>

            <strong>
              {data.role
                ?.name ||
                role}
            </strong>
          </div>

          <div className="rp-engine-status">
            <i />

            ROLE ENGINE
            ACTIVE
          </div>
        </header>

        {/* HERO */}

        <section className="rp-hero">

          <div className="rp-hero-card">
            <div className="rp-hero-top">
              <span className="rp-eyebrow">
                PERSONALIZED ENGINEERING PATH
              </span>

              <span className="rp-role-code">
                {data.role
                  ?.level ||
                  "ENGINEERING"}
              </span>
            </div>

            <h1>
              {data.role
                ?.name ||
                role}
            </h1>

            <p>
              {data.role
                ?.description ||
                "Your preparation path is generated from your profile, role requirements and measured performance."}
            </p>

            <div className="rp-identity-row">

              <div>
                <span>
                  TARGET COMPANY
                </span>

                <strong>
                  {data.company
                    ?.name ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  ROLE
                </span>

                <strong>
                  {data.role
                    ?.name ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  PROFILE
                </span>

                <strong>
                  {data.analysis
                    ?.profileComplete
                    ? "COMPLETE"
                    : "IN PROGRESS"}
                </strong>
              </div>

            </div>
          </div>

          {/* READINESS */}

          <div className="rp-readiness-card">

            <div className="rp-card-label-row">
              <span>
                ROLE READINESS
              </span>

              <b>
                LIVE
              </b>
            </div>

            <div className="rp-readiness-main">

              <ReadinessGauge
                value={
                  readiness
                }
              />

              <div className="rp-verdict">
                <span>
                  CURRENT VERDICT
                </span>

                <strong>
                  {data.analysis
                    ?.verdict ||
                    "ANALYSIS PENDING"}
                </strong>

                <p>
                  {data.analysis
                    ?.summary ||
                    "Complete activities to generate a stronger analysis."}
                </p>
              </div>

            </div>

            <div className="rp-stat-grid">

              <div>
                <span>
                  RESUME MATCH
                </span>

                <strong>
                  {Math.round(
                    clamp(
                      data.analysis
                        ?.resumeMatch
                    )
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>
                  ROUNDS
                </span>

                <strong>
                  {completedRounds}
                  /
                  {totalRounds}
                </strong>
              </div>

              <div>
                <span>
                  SKILL BASELINE
                </span>

                <strong>
                  {Math.round(
                    clamp(
                      data.analysis
                        ?.skillReadiness
                    )
                  )}
                  %
                </strong>
              </div>

            </div>
          </div>
        </section>

        {/* NAVIGATION */}

        <nav className="rp-tabs">

          {[
            [
              "overview",
              "OVERVIEW",
            ],

            [
              "skills",
              "SKILL INTELLIGENCE",
            ],

            [
              "roadmap",
              "PREPARATION ROADMAP",
            ],
          ].map(
            ([id, label]) => (
              <button
                key={id}
                className={
                  activeSection ===
                  id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection(
                    id
                  )
                }
              >
                {label}
              </button>
            )
          )}

        </nav>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        {activeSection ===
          "overview" && (
          <>
            <section className="rp-overview">

              <div className="rp-main-panel">

                <div className="rp-section-heading">
                  <span className="rp-eyebrow">
                    ENGVIVA DIAGNOSIS
                  </span>

                  <h2>
                    Your preparation starts here.
                  </h2>

                  <p>
                    ENGVIVA prioritizes the
                    areas that have the biggest
                    effect on your selected role.
                  </p>
                </div>

                <div className="rp-diagnosis-grid">

                  <div className="rp-diagnosis-card danger">
                    <span>
                      BIGGEST GAP
                    </span>

                    <strong>
                      {data.analysis
                        ?.weakestSkill
                        ?.name ||
                        weakestSkills[0]
                          ?.name ||
                        "Awaiting data"}
                    </strong>

                    <p>
                      {data.analysis
                        ?.weakestSkill
                        ? `Current score: ${Math.round(
                            clamp(
                              data.analysis
                                .weakestSkill
                                .score
                            )
                          )}%`
                        : "Complete your first role assessment to identify the highest-impact weakness."}
                    </p>
                  </div>

                  <div className="rp-diagnosis-card success">
                    <span>
                      STRONGEST AREA
                    </span>

                    <strong>
                      {data.analysis
                        ?.strongestSkill
                        ?.name ||
                        "Awaiting data"}
                    </strong>

                    <p>
                      {data.analysis
                        ?.strongestSkill
                        ? `Current score: ${Math.round(
                            clamp(
                              data.analysis
                                .strongestSkill
                                .score
                            )
                          )}%`
                        : "Your strongest measured skill will appear after performance data is available."}
                    </p>
                  </div>

                </div>

                <div className="rp-gap-section">

                  <div className="rp-subheading">
                    PRIORITY GAPS
                  </div>

                  {criticalGaps.length >
                  0 ? (
                    criticalGaps.map(
                      (
                        gap,
                        index
                      ) => (
                        <div
                          className="rp-gap-row"
                          key={
                            gap.id ||
                            index
                          }
                        >
                          <span>
                            {String(
                              index +
                                1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                gap.name
                              }
                            </strong>

                            <p>
                              {gap.reason ||
                                "Below the target readiness level."}
                            </p>
                          </div>

                          <b>
                            {Math.round(
                              clamp(
                                gap.score
                              )
                            )}
                            %
                          </b>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rp-empty">
                      No critical gaps have
                      been detected yet.
                    </div>
                  )}
                </div>
              </div>

              {/* NEXT ACTION */}

              <aside className="rp-next-card">

                <span className="rp-eyebrow">
                  NEXT BEST ACTION
                </span>

                <div className="rp-target">
                  <Icon
                    type="target"
                    size={21}
                  />
                </div>

                <h3>
                  {data.analysis
                    ?.nextAction
                    ?.title ||
                    "Build your baseline"}
                </h3>

                <p>
                  {data.analysis
                    ?.nextAction
                    ?.description ||
                    "Complete the first activity so ENGVIVA can understand your current level."}
                </p>

                <div className="rp-next-meta">
                  <span>
                    PRIORITY
                  </span>

                  <strong>
                    {data.analysis
                      ?.nextAction
                      ?.priority ||
                      "HIGH"}
                  </strong>
                </div>

                <button
                  onClick={
                    startNextAction
                  }
                >
                  START NEXT ACTION

                  <Icon type="arrow" />
                </button>

              </aside>
            </section>

            {/* ROUND SNAPSHOT */}

            <section className="rp-snapshot">

              <div className="rp-snapshot-heading">
                <div>
                  <span className="rp-eyebrow">
                    RECRUITMENT PROGRESS
                  </span>

                  <h2>
                    Your path to the interview.
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setActiveSection(
                      "roadmap"
                    )
                  }
                >
                  VIEW ROADMAP
                  <Icon
                    type="arrow"
                    size={14}
                  />
                </button>
              </div>

              <div className="rp-road-progress">
                <div>
                  <span>
                    {completedRounds} OF{" "}
                    {totalRounds} STAGES
                  </span>

                  <strong>
                    {roundProgress}%
                  </strong>
                </div>

                <div className="rp-road-track">
                  <span
                    style={{
                      width: `${roundProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rp-stage-preview">
                {rounds
                  .slice(0, 4)
                  .map(
                    (
                      round,
                      index
                    ) => (
                      <div
                        key={
                          round.id ||
                          index
                        }
                        className={`rp-mini-stage ${
                          round.status
                        }`}
                      >
                        <span>
                          {String(
                            round.number ||
                              index +
                                1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <strong>
                          {round.title ||
                            round.name}
                        </strong>
                      </div>
                    )
                  )}
              </div>
            </section>
          </>
        )}

        {/* =================================================
            SKILLS
        ================================================= */}

        {activeSection ===
          "skills" && (
          <section className="rp-section">

            <div className="rp-section-heading">
              <span className="rp-eyebrow">
                ROLE REQUIREMENTS
              </span>

              <h2>
                Skill intelligence.
              </h2>

              <p>
                These scores are generated
                from stored ENGVIVA performance
                data and the selected role's
                requirements.
              </p>
            </div>

            {skills.length ? (
              <div className="rp-skills-grid">
                {skills.map(
                  (skill) => (
                    <SkillCard
                      key={
                        skill.id ||
                        skill.name
                      }
                      skill={
                        skill
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="rp-empty-large">
                No role skills are configured
                yet. Complete an assessment or
                configure the role requirements
                in Firestore.
              </div>
            )}
          </section>
        )}

        {/* =================================================
            ROADMAP
        ================================================= */}

        {activeSection ===
          "roadmap" && (
          <section className="rp-section">

            <div className="rp-section-heading rp-road-heading">

              <div>
                <span className="rp-eyebrow">
                  COMPANY RECRUITMENT PATH
                </span>

                <h2>
                  Progress stage by stage.
                </h2>
              </div>

              <p>
                Stages unlock from your stored
                progress. Complete one stage to
                move toward the next.
              </p>

            </div>

            <div className="rp-round-list">

              {rounds.length ? (
                rounds.map(
                  (
                    round,
                    index
                  ) => (
                    <RoundCard
                      key={
                        round.id ||
                        index
                      }
                      round={
                        round
                      }
                      index={
                        index
                      }
                      onOpen={
                        openRound
                      }
                    />
                  )
                )
              ) : (
                <div className="rp-empty-large">
                  No preparation stages are
                  configured for this role.
                </div>
              )}

            </div>
          </section>
        )}

        {/* FOOTER */}

        <footer className="rp-footer">

          <div>
            <span className="rp-eyebrow">
              ENGVIVA ROLE ENGINE
            </span>

            <h2>
              Prepare for the gap,
              not the noise.
            </h2>

            <p>
              Your preparation path evolves
              as your measured performance
              changes.
            </p>
          </div>

          <button
            onClick={
              startNextAction
            }
          >
            CONTINUE PREPARATION

            <Icon type="arrow" />
          </button>
        </footer>

      </main>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

.rp-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;

  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(155, 117, 232, .12),
      transparent 30%
    ),
    radial-gradient(
      circle at 0% 80%,
      rgba(95, 58, 171, .08),
      transparent 30%
    ),
    #07070c;

  color: #eee9f7;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.rp-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .22;

  background-image:
    linear-gradient(
      rgba(255,255,255,.018) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(255,255,255,.018) 1px,
      transparent 1px
    );

  background-size: 70px 70px;

  mask-image:
    linear-gradient(
      to bottom,
      black,
      transparent 80%
    );
}

.rp-glow {
  position: fixed;
  width: 450px;
  height: 450px;
  border-radius: 50%;
  filter: blur(140px);
  pointer-events: none;
  opacity: .08;

  animation:
    rpFloat 12s ease-in-out
    infinite alternate;
}

.rp-glow-one {
  top: -180px;
  right: -180px;
  background: #9b72e8;
}

.rp-glow-two {
  bottom: -220px;
  left: -200px;
  background: #583292;
  animation-delay: -4s;
}

.rp-shell {
  position: relative;
  z-index: 2;

  width:
    min(
      1420px,
      calc(100% - 64px)
    );

  margin: 0 auto;

  padding:
    26px 0 70px;
}

/* HEADER */

.rp-header {
  height: 46px;

  display: grid;
  grid-template-columns:
    1fr auto 1fr;

  align-items: center;

  margin-bottom: 34px;
}

.rp-back {
  width: fit-content;

  display: flex;
  align-items: center;
  gap: 8px;

  border: 0;
  background: transparent;

  color: #625b6c;

  cursor: pointer;

  font-size: 7px;
  letter-spacing: 1.5px;

  transition: .25s ease;
}

.rp-back:hover {
  color: #bca9d7;
  transform:
    translateX(-3px);
}

.rp-breadcrumb {
  display: flex;
  align-items: center;
  gap: 9px;

  font-size: 7px;
  letter-spacing: .8px;
}

.rp-breadcrumb span {
  color: #4f4858;
}

.rp-breadcrumb b {
  color: #29252f;
}

.rp-breadcrumb strong {
  color: #a494b7;
  font-weight: 500;
}

.rp-engine-status {
  justify-self: end;

  display: flex;
  align-items: center;
  gap: 7px;

  color: #5c5665;

  font-size: 6px;
  letter-spacing: 1.2px;
}

.rp-engine-status i {
  width: 6px;
  height: 6px;

  border-radius: 50%;

  background: #a27ddd;

  box-shadow:
    0 0 14px
    rgba(162,125,221,.8);

  animation:
    rpPulse 1.8s ease-in-out
    infinite;
}

/* HERO */

.rp-hero {
  display: grid;

  grid-template-columns:
    minmax(0, 1.55fr)
    minmax(370px, .65fr);

  gap: 14px;
}

.rp-hero-card,
.rp-readiness-card,
.rp-main-panel,
.rp-next-card,
.rp-snapshot,
.rp-skill-card,
.rp-round-card,
.rp-footer {
  border:
    1px solid
    rgba(192,165,238,.075);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.012)
    );

  backdrop-filter:
    blur(28px);

  -webkit-backdrop-filter:
    blur(28px);
}

.rp-hero-card {
  min-height: 380px;

  padding:
    42px 46px;

  border-radius: 28px;

  position: relative;
  overflow: hidden;
}

.rp-hero-card::after {
  content: "";

  position: absolute;

  width: 350px;
  height: 350px;

  right: -190px;
  top: -180px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(161,123,230,.15),
      transparent 65%
    );

  pointer-events: none;
}

.rp-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rp-eyebrow {
  color: #9478c1;

  font-size: 6px;

  font-weight: 800;

  letter-spacing: 2px;
}

.rp-role-code {
  padding:
    6px 8px;

  border:
    1px solid
    rgba(185,158,238,.09);

  border-radius: 6px;

  color: #685d76;

  background:
    rgba(255,255,255,.018);

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-hero-card h1 {
  position: relative;
  z-index: 1;

  margin:
    17px 0 17px;

  color: #eee7f4;

  font-size:
    clamp(45px, 5.5vw, 76px);

  line-height: .92;

  letter-spacing: -4px;

  font-weight: 450;
}

.rp-hero-card > p {
  position: relative;
  z-index: 1;

  max-width: 740px;

  margin: 0;

  color: #6d6575;

  font-size: 9px;

  line-height: 1.85;
}

.rp-identity-row {
  position: absolute;

  left: 46px;
  right: 46px;
  bottom: 28px;

  display: flex;

  padding-top: 17px;

  border-top:
    1px solid
    rgba(185,158,238,.06);
}

.rp-identity-row > div {
  min-width: 155px;

  padding-right: 26px;
  margin-right: 26px;

  border-right:
    1px solid
    rgba(185,158,238,.06);
}

.rp-identity-row > div:last-child {
  border-right: 0;
}

.rp-identity-row span,
.rp-stat-grid span,
.rp-card-label-row span {
  display: block;

  color: #504957;

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-identity-row strong {
  display: block;

  margin-top: 6px;

  color: #a99eae;

  font-size: 7px;

  font-weight: 500;
}

/* READINESS */

.rp-readiness-card {
  min-height: 380px;

  padding: 27px;

  border-radius: 28px;
}

.rp-card-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rp-card-label-row b {
  color: #a184ca;

  font-size: 5px;

  letter-spacing: 1.1px;

  font-weight: 500;
}

.rp-readiness-main {
  display: flex;

  align-items: center;

  gap: 18px;

  margin-top: 25px;
}

.rp-gauge {
  position: relative;

  width: 165px;
  height: 165px;

  flex: 0 0 auto;
}

.rp-gauge svg {
  transform:
    rotate(-90deg);
}

.rp-gauge-bg,
.rp-gauge-progress {
  fill: none;

  stroke-width: 4;
}

.rp-gauge-bg {
  stroke:
    rgba(185,158,238,.07);
}

.rp-gauge-progress {
  stroke: #a98bdd;

  stroke-linecap: round;

  filter:
    drop-shadow(
      0 0 9px
      rgba(169,139,221,.45)
    );

  transition:
    stroke-dashoffset
    1.2s cubic-bezier(
      .22, 1, .36, 1
    );
}

.rp-gauge-center {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  padding-top: 5px;
}

.rp-gauge-center strong {
  color: #ddd4e8;

  font-size: 40px;

  font-weight: 300;

  letter-spacing: -2px;
}

.rp-gauge-center span {
  color: #927aae;

  font-size: 9px;

  margin-top: 13px;
}

.rp-verdict {
  min-width: 0;
}

.rp-verdict > span {
  display: block;

  color: #4f4856;

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-verdict strong {
  display: block;

  margin-top: 8px;

  color: #c8bdd4;

  font-size: 11px;

  line-height: 1.35;

  font-weight: 500;
}

.rp-verdict p {
  margin: 9px 0 0;

  color: #625b6b;

  font-size: 7px;

  line-height: 1.75;
}

.rp-stat-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 7px;

  margin-top: 20px;

  padding-top: 17px;

  border-top:
    1px solid
    rgba(185,158,238,.055);
}

.rp-stat-grid > div {
  padding:
    11px 10px;

  border:
    1px solid
    rgba(185,158,238,.045);

  border-radius: 10px;

  background:
    rgba(255,255,255,.012);
}

.rp-stat-grid strong {
  display: block;

  margin-top: 5px;

  color: #aaa0b6;

  font-size: 10px;

  font-weight: 500;
}

/* TABS */

.rp-tabs {
  display: flex;

  gap: 5px;

  margin:
    25px 0 34px;

  border-bottom:
    1px solid
    rgba(185,158,238,.055);
}

.rp-tabs button {
  position: relative;

  padding:
    12px 15px;

  border: 0;

  background: transparent;

  color: #585160;

  cursor: pointer;

  font-size: 6px;

  letter-spacing: 1px;

  transition: .25s;
}

.rp-tabs button:hover {
  color: #9c8bae;
}

.rp-tabs button.active {
  color: #c0add8;
}

.rp-tabs button.active::after {
  content: "";

  position: absolute;

  left: 15px;
  right: 15px;
  bottom: -1px;

  height: 1px;

  background: #aa8bdc;

  box-shadow:
    0 0 14px
    rgba(170,139,220,.65);
}

/* OVERVIEW */

.rp-overview {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    330px;

  gap: 13px;
}

.rp-main-panel,
.rp-next-card {
  border-radius: 22px;
}

.rp-main-panel {
  padding: 31px;
}

.rp-section-heading h2 {
  margin:
    9px 0 7px;

  color: #d9d0e1;

  font-size: 29px;

  font-weight: 400;

  letter-spacing: -.7px;
}

.rp-section-heading > p {
  max-width: 720px;

  margin: 0;

  color: #625b69;

  font-size: 8px;

  line-height: 1.8;
}

.rp-diagnosis-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-top: 27px;
}

.rp-diagnosis-card {
  padding: 21px;

  border-radius: 15px;

  background:
    rgba(255,255,255,.018);
}

.rp-diagnosis-card.danger {
  border:
    1px solid
    rgba(195,125,153,.12);
}

.rp-diagnosis-card.success {
  border:
    1px solid
    rgba(122,177,146,.10);
}

.rp-diagnosis-card span {
  color: #514b58;

  font-size: 5px;

  letter-spacing: 1.2px;
}

.rp-diagnosis-card strong {
  display: block;

  margin-top: 12px;

  color: #c3b9ca;

  font-size: 14px;

  font-weight: 500;
}

.rp-diagnosis-card p {
  margin:
    7px 0 0;

  color: #625b69;

  font-size: 7px;

  line-height: 1.7;
}

.rp-gap-section {
  margin-top: 30px;
}

.rp-subheading {
  margin-bottom: 8px;

  color: #725c96;

  font-size: 5px;

  letter-spacing: 1.3px;
}

.rp-gap-row {
  display: grid;

  grid-template-columns:
    35px 1fr auto;

  gap: 12px;

  align-items: center;

  padding:
    14px 0;

  border-top:
    1px solid
    rgba(185,158,238,.045);
}

.rp-gap-row > span {
  color: #514b58;

  font-size: 6px;
}

.rp-gap-row strong {
  color: #aaa0ae;

  font-size: 8px;

  font-weight: 500;
}

.rp-gap-row p {
  margin:
    4px 0 0;

  color: #5c5664;

  font-size: 6px;
}

.rp-gap-row > b {
  color: #ad809d;

  font-size: 7px;

  font-weight: 500;
}

/* NEXT ACTION */

.rp-next-card {
  position: relative;

  overflow: hidden;

  padding: 27px;

  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(155,117,232,.11),
      transparent 45%
    ),
    rgba(255,255,255,.022);
}

.rp-target {
  width: 47px;
  height: 47px;

  display: grid;
  place-items: center;

  margin-top: 34px;

  border:
    1px solid
    rgba(185,158,238,.12);

  border-radius: 13px;

  color: #a88cda;

  background:
    rgba(159,122,228,.045);
}

.rp-next-card h3 {
  margin:
    19px 0 8px;

  color: #d0c5da;

  font-size: 17px;

  line-height: 1.3;

  font-weight: 400;
}

.rp-next-card > p {
  margin: 0;

  color: #625b68;

  font-size: 7px;

  line-height: 1.8;
}

.rp-next-meta {
  display: flex;

  justify-content: space-between;

  margin-top: 28px;

  padding:
    13px 0;

  border-top:
    1px solid
    rgba(185,158,238,.055);

  border-bottom:
    1px solid
    rgba(185,158,238,.055);
}

.rp-next-meta span {
  color: #4e4855;

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-next-meta strong {
  color: #a58acb;

  font-size: 6px;

  font-weight: 500;
}

.rp-next-card button,
.rp-footer button {
  width: 100%;

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-top: 17px;

  padding:
    13px 14px;

  border:
    1px solid
    rgba(194,165,248,.18);

  border-radius: 9px;

  color: #e6dbee;

  background:
    linear-gradient(
      135deg,
      rgba(136,98,210,.65),
      rgba(165,130,234,.35)
    );

  cursor: pointer;

  font-size: 6px;

  letter-spacing: 1px;

  transition: .3s;
}

.rp-next-card button:hover,
.rp-footer button:hover {
  transform:
    translateY(-2px);

  box-shadow:
    0 16px 38px
    rgba(102,68,166,.23);
}

/* SNAPSHOT */

.rp-snapshot {
  margin-top: 13px;

  padding: 27px;

  border-radius: 22px;
}

.rp-snapshot-heading {
  display: flex;

  align-items: flex-end;

  justify-content: space-between;
}

.rp-snapshot-heading h2 {
  margin:
    8px 0 0;

  color: #d0c6d9;

  font-size: 22px;

  font-weight: 400;
}

.rp-snapshot-heading button {
  display: flex;

  align-items: center;

  gap: 9px;

  border: 0;

  background: transparent;

  color: #9478b8;

  cursor: pointer;

  font-size: 6px;

  letter-spacing: 1px;
}

.rp-road-progress {
  margin-top: 25px;
}

.rp-road-progress > div:first-child {
  display: flex;

  justify-content: space-between;

  color: #625b68;

  font-size: 6px;
}

.rp-road-progress strong {
  color: #a78dcc;
}

.rp-road-track,
.rp-progress-track {
  height: 3px;

  overflow: hidden;

  background:
    rgba(185,158,238,.055);

  border-radius: 10px;
}

.rp-road-track {
  margin-top: 9px;
}

.rp-road-track span,
.rp-progress-track span {
  display: block;

  height: 100%;

  background:
    linear-gradient(
      90deg,
      #7655ac,
      #b99be3
    );

  border-radius: inherit;

  box-shadow:
    0 0 10px
    rgba(169,139,221,.3);

  transition:
    width 1s
    cubic-bezier(
      .22, 1, .36, 1
    );
}

.rp-stage-preview {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(170px, 1fr)
    );

  gap: 7px;

  margin-top: 17px;
}

.rp-mini-stage {
  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    13px;

  border:
    1px solid
    rgba(185,158,238,.05);

  border-radius: 10px;

  background:
    rgba(255,255,255,.012);
}

.rp-mini-stage > span {
  color: #765c99;

  font-size: 6px;
}

.rp-mini-stage strong {
  color: #827889;

  font-size: 7px;

  font-weight: 500;
}

.rp-mini-stage.completed {
  border-color:
    rgba(117,175,145,.1);
}

.rp-mini-stage.available {
  border-color:
    rgba(169,139,221,.15);

  background:
    rgba(159,122,230,.035);
}

/* SECTIONS */

.rp-section {
  margin-top: 0;
}

.rp-section-heading {
  margin-bottom: 24px;
}

.rp-section-heading > p {
  max-width: 650px;
}

.rp-skills-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 9px;
}

.rp-skill-card {
  padding: 20px;

  border-radius: 16px;

  transition:
    transform .3s ease,
    border-color .3s ease,
    background .3s ease;
}

.rp-skill-card:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(190,161,238,.15);

  background:
    rgba(159,122,230,.025);
}

.rp-skill-top {
  display: flex;

  justify-content: space-between;

  gap: 12px;
}

.rp-micro {
  color: #504957;

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-skill-top h3 {
  margin:
    7px 0 0;

  color: #aaa1b0;

  font-size: 10px;

  font-weight: 500;
}

.rp-priority {
  height: fit-content;

  padding:
    5px 7px;

  border-radius: 5px;

  color: #746b7d;

  background:
    rgba(255,255,255,.02);

  font-size: 5px;
}

.rp-priority.critical {
  color: #bd94c1;

  background:
    rgba(183,149,193,.055);
}

.rp-priority.high {
  color: #aa94cb;

  background:
    rgba(168,144,202,.05);
}

.rp-skill-values {
  display: flex;

  justify-content: space-between;

  margin-top: 22px;
}

.rp-skill-values span {
  color: #4d4754;

  font-size: 5px;

  letter-spacing: .8px;
}

.rp-skill-values strong {
  color: #9b8fa5;

  font-size: 7px;

  font-weight: 500;
}

.rp-progress-track {
  margin-top: 9px;
}

.rp-skill-footer {
  display: flex;

  justify-content: space-between;

  margin-top: 10px;

  color: #4e4855;

  font-size: 5px;
}

/* ROADMAP */

.rp-road-heading {
  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 30px;
}

.rp-road-heading > p {
  max-width: 320px;

  text-align: right;
}

.rp-round-list {
  display: flex;

  flex-direction: column;

  gap: 9px;
}

.rp-round-card {
  display: grid;

  grid-template-columns:
    60px 1fr auto;

  gap: 20px;

  align-items: center;

  padding:
    22px 24px;

  border-radius: 17px;

  transition:
    transform .3s ease,
    border-color .3s ease,
    background .3s ease;
}

.rp-round-card:not(.locked):hover {
  transform:
    translateX(4px);

  border-color:
    rgba(190,161,238,.15);

  background:
    rgba(159,122,230,.03);
}

.rp-round-card.locked {
  opacity: .48;
}

.rp-round-card.completed {
  border-color:
    rgba(117,175,145,.11);
}

.rp-round-index {
  color: #755b98;

  font-size: 8px;

  letter-spacing: 1.3px;
}

.rp-round-header {
  display: flex;

  justify-content: space-between;

  margin-bottom: 7px;
}

.rp-round-header span {
  color: #5a5364;

  font-size: 5px;

  letter-spacing: 1px;
}

.rp-round-header b {
  color: #756a80;

  font-size: 5px;

  font-weight: 500;
}

.rp-round-card.completed
.rp-round-header b {
  color: #779c87;
}

.rp-round-content h3 {
  margin: 0;

  color: #bdb3c8;

  font-size: 12px;

  font-weight: 500;
}

.rp-round-content p {
  margin:
    7px 0 0;

  color: #5f5867;

  font-size: 7px;

  line-height: 1.65;
}

.rp-round-meta {
  display: flex;

  gap: 14px;

  margin-top: 10px;

  color: #4e4855;

  font-size: 5px;
}

.rp-round-button {
  min-width: 91px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 9px;

  padding:
    10px 12px;

  border:
    1px solid
    rgba(185,158,238,.1);

  border-radius: 8px;

  color: #a794bd;

  background:
    rgba(159,122,230,.035);

  cursor: pointer;

  font-size: 5.5px;

  letter-spacing: 1px;
}

.rp-round-button:disabled {
  color: #4a4550;

  border-color:
    rgba(185,158,238,.035);

  background:
    rgba(255,255,255,.01);

  cursor: not-allowed;
}

/* FOOTER */

.rp-footer {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 30px;

  margin-top: 55px;

  padding:
    27px 30px;

  border-radius: 20px;
}

.rp-footer h2 {
  margin:
    8px 0 5px;

  color: #d1c7db;

  font-size: 20px;

  font-weight: 400;
}

.rp-footer p {
  margin: 0;

  color: #5e5765;

  font-size: 7px;
}

.rp-footer button {
  width: auto;

  min-width: 220px;

  margin-top: 0;
}

/* EMPTY */

.rp-empty,
.rp-empty-large {
  border:
    1px dashed
    rgba(185,158,238,.09);

  border-radius: 14px;

  color: #5d5765;

  background:
    rgba(255,255,255,.012);
}

.rp-empty {
  padding: 19px;

  font-size: 7px;
}

.rp-empty-large {
  min-height: 180px;

  display: grid;

  place-items: center;

  text-align: center;

  padding: 30px;

  font-size: 8px;
}

/* LOADING */

.rp-loading-page,
.rp-error-page {
  display: grid;

  place-items: center;

  min-height: 100vh;
}

.rp-loader {
  display: flex;

  align-items: center;

  flex-direction: column;

  gap: 12px;

  color: #71687c;
}

.rp-loader-ring {
  width: 52px;
  height: 52px;

  border:
    1px solid
    rgba(185,158,238,.08);

  border-top-color:
    #a98ada;

  border-radius: 50%;

  animation:
    rpSpin .8s linear
    infinite;
}

.rp-loader span {
  color: #776b86;

  font-size: 6px;

  letter-spacing: 1.6px;
}

.rp-loader small {
  color: #47414e;

  font-size: 6px;
}

/* ERROR */

.rp-error-card {
  width:
    min(
      520px,
      calc(100% - 40px)
    );

  padding: 38px;

  border:
    1px solid
    rgba(185,158,238,.09);

  border-radius: 22px;

  background:
    rgba(255,255,255,.025);

  box-shadow:
    0 30px 100px
    rgba(0,0,0,.25);
}

.rp-error-icon {
  width: 45px;
  height: 45px;

  display: grid;

  place-items: center;

  margin-bottom: 22px;

  border:
    1px solid
    rgba(192,139,168,.18);

  border-radius: 13px;

  color: #c394ad;

  background:
    rgba(192,139,168,.04);
}

.rp-error-card h1 {
  margin:
    10px 0;

  color: #d5cbdc;

  font-size: 25px;

  font-weight: 400;
}

.rp-error-card p {
  color: #665f6e;

  font-size: 8px;

  line-height: 1.8;
}

.rp-error-actions {
  display: flex;

  gap: 8px;

  margin-top: 25px;
}

.rp-error-actions button {
  display: flex;

  align-items: center;

  gap: 8px;

  padding:
    11px 14px;

  border:
    1px solid
    rgba(190,161,238,.14);

  border-radius: 8px;

  color: #d6cce0;

  background:
    rgba(159,122,230,.09);

  cursor: pointer;

  font-size: 6px;

  letter-spacing: .8px;
}

.rp-error-actions button.secondary {
  color: #817688;

  background:
    rgba(255,255,255,.015);
}

/* ANIMATIONS */

@keyframes rpSpin {
  to {
    transform:
      rotate(360deg);
  }
}

@keyframes rpPulse {
  0%,100% {
    opacity: .45;
    transform: scale(.85);
  }

  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes rpFloat {
  from {
    transform:
      translate3d(
        -15px,
        0,
        0
      );
  }

  to {
    transform:
      translate3d(
        20px,
        -25px,
        0
      );
  }
}

/* RESPONSIVE */

@media (max-width: 1080px) {
  .rp-hero,
  .rp-overview {
    grid-template-columns:
      1fr;
  }

  .rp-skills-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .rp-readiness-card {
    min-height: auto;
  }
}

@media (max-width: 720px) {
  .rp-shell {
    width:
      calc(100% - 28px);
  }

  .rp-header {
    grid-template-columns:
      1fr;
  }

  .rp-breadcrumb,
  .rp-engine-status {
    display: none;
  }

  .rp-hero-card {
    padding: 29px;

    min-height: 410px;
  }

  .rp-hero-card h1 {
    font-size: 45px;
  }

  .rp-identity-row {
    left: 29px;
    right: 29px;

    flex-wrap: wrap;

    gap: 17px;
  }

  .rp-identity-row > div {
    min-width: 120px;

    border-right: 0;

    margin-right: 0;

    padding-right: 0;
  }

  .rp-readiness-main {
    flex-direction: column;

    align-items: flex-start;
  }

  .rp-diagnosis-grid {
    grid-template-columns:
      1fr;
  }

  .rp-skills-grid {
    grid-template-columns:
      1fr;
  }

  .rp-road-heading {
    display: block;
  }

  .rp-road-heading > p {
    margin-top: 12px;

    text-align: left;
  }

  .rp-round-card {
    grid-template-columns:
      42px 1fr;
  }

  .rp-round-button {
    grid-column: 2;

    width: 100%;
  }

  .rp-footer {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .rp-footer button {
    width: 100%;
  }

  .rp-tabs {
    overflow-x: auto;
  }

  .rp-tabs button {
    white-space: nowrap;
  }
}
`;