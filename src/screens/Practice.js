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

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const EMPTY = {
  company: {
    id: "",
    name: "",
  },

  role: {
    id: "",
    name: "",
  },

  readiness: 0,

  stats: {
    assessmentsCompleted: 0,
    codingSolved: 0,
    technicalCompleted: 0,
    totalAttempts: 0,
    averageScore: 0,
    streak: 0,
  },

  assessments: [],
  coding: [],
  technical: [],

  recommendations: [],

  recentActivity: [],
};

/* =========================================================
   ICONS
========================================================= */

function Icon({
  type,
  size = 18,
}) {
  const icons = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    code: (
      <>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
        <path d="m14 5-4 14" />
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

    brain: (
      <>
        <path d="M9 4.5A3.5 3.5 0 0 0 5.5 8c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 16c.4 0 .8-.1 1.2-.2A3.5 3.5 0 0 0 12 18.5" />
        <path d="M15 4.5A3.5 3.5 0 0 1 18.5 8c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 17 16c-.4 0-.8-.1-1.2-.2A3.5 3.5 0 0 1 12 18.5" />
        <path d="M12 4v15" />
      </>
    ),

    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </>
    ),

    clock: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path d="M12 7v5l3 2" />
      </>
    ),

    play: (
      <path d="m9 6 9 6-9 6V6z" />
    ),

    check: (
      <path d="m5 12 4 4L19 6" />
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
    >
      {icons[type]}
    </svg>
  );
}

/* =========================================================
   AUTH
========================================================= */

async function getFirebaseUser() {
  return new Promise(
    (resolve) => {
      let done = false;

      const unsubscribe =
        onAuthStateChanged(
          auth,
          (user) => {
            if (done) return;

            done = true;
            unsubscribe();

            resolve(user);
          }
        );
    }
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function Practice() {
  const navigate =
    useNavigate();

  const [params] =
    useSearchParams();

  const companyId =
    params.get("company");

  const role =
    params.get("role");

  const [data, setData] =
    useState(EMPTY);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedMode,
    setSelectedMode,
  ] = useState("all");

  /* =======================================================
     LOAD PRACTICE DATA
  ======================================================= */

  const loadPractice =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const user =
          await getFirebaseUser();

        if (!user) {
          throw new Error(
            "Your login session has expired. Please sign in again."
          );
        }

        const token =
          await user.getIdToken();

        const query =
          new URLSearchParams();

        if (companyId) {
          query.set(
            "companyId",
            companyId
          );
        }

        if (role) {
          query.set(
            "role",
            role
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/practice?${query}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error
              ?.message ||
              result?.error ||
              `Practice API returned ${response.status}`
          );
        }

        const incoming =
          result?.data ||
          result;

        setData({
          ...EMPTY,

          ...incoming,

          company: {
            ...EMPTY.company,
            ...(incoming.company ||
              {}),
          },

          role: {
            ...EMPTY.role,
            ...(incoming.role || {}),
          },

          stats: {
            ...EMPTY.stats,
            ...(incoming.stats || {}),
          },

          assessments:
            Array.isArray(
              incoming.assessments
            )
              ? incoming.assessments
              : [],

          coding:
            Array.isArray(
              incoming.coding
            )
              ? incoming.coding
              : [],

          technical:
            Array.isArray(
              incoming.technical
            )
              ? incoming.technical
              : [],

          recommendations:
            Array.isArray(
              incoming.recommendations
            )
              ? incoming.recommendations
              : [],

          recentActivity:
            Array.isArray(
              incoming.recentActivity
            )
              ? incoming.recentActivity
              : [],
        });
      } catch (err) {
        console.error(
          "[ENGVIVA PRACTICE]",
          err
        );

        setError(
          err?.message ||
            "Practice data could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }, [
      companyId,
      role,
    ]);

  useEffect(() => {
    loadPractice();
  }, [loadPractice]);

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const visibleCards =
    useMemo(() => {
      if (
        selectedMode ===
        "assessments"
      ) {
        return data.assessments;
      }

      if (
        selectedMode ===
        "coding"
      ) {
        return data.coding;
      }

      if (
        selectedMode ===
        "technical"
      ) {
        return data.technical;
      }

      return [
        ...data.assessments,
        ...data.coding,
        ...data.technical,
      ];
    }, [
      selectedMode,
      data,
    ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function openAssessments() {
    navigate(
      `/practice/assessments?company=${encodeURIComponent(
        companyId || ""
      )}&role=${encodeURIComponent(
        role || ""
      )}`
    );
  }

  function openCoding() {
    navigate(
      `/practice/coding?company=${encodeURIComponent(
        companyId || ""
      )}&role=${encodeURIComponent(
        role || ""
      )}`
    );
  }

  function openTechnical() {
    navigate(
      `/practice/technical?company=${encodeURIComponent(
        companyId || ""
      )}&role=${encodeURIComponent(
        role || ""
      )}`
    );
  }

  function openItem(item) {
    if (
      item?.type ===
      "coding"
    ) {
      openCoding();
      return;
    }

    if (
      item?.type ===
      "technical"
    ) {
      openTechnical();
      return;
    }

    openAssessments();
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="practice-page practice-center">
        <style>
          {styles}
        </style>

        <div className="practice-loader">
          <div className="practice-spinner" />

          <span>
            BUILDING PRACTICE PATH
          </span>

          <small>
            Reading your role, progress and available assessments
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
      <div className="practice-page practice-center">
        <style>
          {styles}
        </style>

        <div className="practice-error">
          <span>
            PRACTICE ENGINE
          </span>

          <h1>
            Unable to load practice.
          </h1>

          <p>
            {error}
          </p>

          <button
            onClick={
              loadPractice
            }
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="practice-page">
      <style>
        {styles}
      </style>

      <div className="practice-grid" />

      <div className="practice-glow one" />
      <div className="practice-glow two" />

      <main className="practice-shell">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="practice-header">

          <div>
            <span className="practice-eyebrow">
              ENGVIVA / PRACTICE ENGINE
            </span>

            <h1>
              Practice with purpose.
            </h1>

            <p>
              Your preparation environment
              changes with your selected role,
              performance and recruitment path.
            </p>
          </div>

          <div className="practice-context">

            <span>
              TARGET
            </span>

            <strong>
              {data.company?.name ||
                "GENERAL"}
            </strong>

            <b>
              {data.role?.name ||
                "ENGINEERING"}
            </b>

          </div>

        </header>

        {/* =================================================
            READINESS STRIP
        ================================================= */}

        <section className="practice-readiness">

          <div className="practice-readiness-score">

            <span>
              CURRENT READINESS
            </span>

            <strong>
              {Math.round(
                Number(
                  data.readiness ||
                    0
                )
              )}
              %
            </strong>

          </div>

          <div className="practice-readiness-line">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Number(
                    data.readiness ||
                      0
                  )
                )}%`,
              }}
            />
          </div>

          <div className="practice-readiness-message">
            <Icon
              type="target"
              size={15}
            />

            <span>
              Practice is prioritized
              according to your current
              role readiness.
            </span>
          </div>

        </section>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <section className="practice-stats">

          <div>
            <Icon
              type="check"
              size={17}
            />

            <span>
              ASSESSMENTS
            </span>

            <strong>
              {
                data.stats
                  .assessmentsCompleted
              }
            </strong>
          </div>

          <div>
            <Icon
              type="code"
              size={17}
            />

            <span>
              CODING SOLVED
            </span>

            <strong>
              {
                data.stats
                  .codingSolved
              }
            </strong>
          </div>

          <div>
            <Icon
              type="brain"
              size={17}
            />

            <span>
              TECHNICAL
            </span>

            <strong>
              {
                data.stats
                  .technicalCompleted
              }
            </strong>
          </div>

          <div>
            <Icon
              type="chart"
              size={17}
            />

            <span>
              AVG SCORE
            </span>

            <strong>
              {
                Math.round(
                  Number(
                    data.stats
                      .averageScore ||
                      0
                  )
                )
              }
              %
            </strong>
          </div>

          <div>
            <Icon
              type="clock"
              size={17}
            />

            <span>
              STREAK
            </span>

            <strong>
              {
                data.stats
                  .streak
              }
              d
            </strong>
          </div>

        </section>

        {/* =================================================
            THREE CORE MODES
        ================================================= */}

        <section className="practice-modes">

          <PracticeMode
            number="01"
            icon="target"
            eyebrow="ASSESSMENTS"
            title="Measure yourself."
            description="Timed assessments built from the company, role and difficulty configuration selected for you."
            count={
              data.assessments
                .length
            }
            button="OPEN ASSESSMENTS"
            onClick={
              openAssessments
            }
          />

          <PracticeMode
            number="02"
            icon="code"
            eyebrow="CODING ARENA"
            title="Prove your logic."
            description="Role-aware coding problems with constraints, hidden tests, complexity evaluation and language support."
            count={
              data.coding
                .length
            }
            button="ENTER CODING"
            onClick={
              openCoding
            }
          />

          <PracticeMode
            number="03"
            icon="brain"
            eyebrow="TECHNICAL"
            title="Strengthen depth."
            description="Technical preparation across the engineering subjects and skills required for your target role."
            count={
              data.technical
                .length
            }
            button="OPEN TECHNICAL"
            onClick={
              openTechnical
            }
          />

        </section>

        {/* =================================================
            RECOMMENDED
        ================================================= */}

        <section className="practice-recommended">

          <div className="practice-section-head">

            <div>
              <span>
                ENGINE DECISION
              </span>

              <h2>
                What you should do next.
              </h2>
            </div>

            <span className="practice-live">
              LIVE FROM BACKEND
            </span>

          </div>

          <div className="practice-recommendation-list">

            {data.recommendations
              .length > 0 ? (
              data.recommendations.map(
                (
                  item,
                  index
                ) => (
                  <button
                    className="practice-recommendation"
                    key={
                      item.id ||
                      index
                    }
                    onClick={() =>
                      openItem(
                        item
                      )
                    }
                  >
                    <div className="practice-rec-number">
                      {String(
                        index +
                          1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div>
                      <span>
                        {item.type ||
                          "PRACTICE"}
                      </span>

                      <strong>
                        {item.title ||
                          "Recommended Practice"}
                      </strong>

                      <p>
                        {item.reason ||
                          "Recommended from your current preparation state."}
                      </p>
                    </div>

                    <Icon
                      type="arrow"
                      size={16}
                    />
                  </button>
                )
              )
            ) : (
              <div className="practice-empty">
                Complete your first assessment
                to generate personalized
                recommendations.
              </div>
            )}

          </div>
        </section>

        {/* =================================================
            FILTER
        ================================================= */}

        <section className="practice-library">

          <div className="practice-section-head">

            <div>
              <span>
                PRACTICE LIBRARY
              </span>

              <h2>
                Available now.
              </h2>
            </div>

            <div className="practice-filters">

              {[
                ["all", "ALL"],
                [
                  "assessments",
                  "ASSESSMENTS",
                ],
                [
                  "coding",
                  "CODING",
                ],
                [
                  "technical",
                  "TECHNICAL",
                ],
              ].map(
                ([id, label]) => (
                  <button
                    key={id}
                    className={
                      selectedMode ===
                      id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedMode(
                        id
                      )
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

          </div>

          {visibleCards.length >
          0 ? (
            <div className="practice-library-grid">

              {visibleCards
                .slice(0, 12)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <button
                      className="practice-item"
                      key={
                        item.id ||
                        index
                      }
                      onClick={() =>
                        openItem(
                          item
                        )
                      }
                    >
                      <div className="practice-item-icon">
                        <Icon
                          type={
                            item.type ===
                            "coding"
                              ? "code"
                              : item.type ===
                                "technical"
                              ? "brain"
                              : "target"
                          }
                          size={18}
                        />
                      </div>

                      <div className="practice-item-body">

                        <div className="practice-item-top">
                          <span>
                            {item.type ||
                              "ASSESSMENT"}
                          </span>

                          {item.difficulty && (
                            <b>
                              {
                                item.difficulty
                              }
                            </b>
                          )}
                        </div>

                        <h3>
                          {item.title ||
                            item.name ||
                            "Practice Session"}
                        </h3>

                        <p>
                          {item.description ||
                            "Role-specific practice session."}
                        </p>

                        <div className="practice-item-meta">

                          {item.duration && (
                            <span>
                              {item.duration}
                            </span>
                          )}

                          {item.questionCount && (
                            <span>
                              {
                                item.questionCount
                              }{" "}
                              QUESTIONS
                            </span>
                          )}

                        </div>

                      </div>

                      <Icon
                        type="arrow"
                        size={16}
                      />
                    </button>
                  )
                )}

            </div>
          ) : (
            <div className="practice-empty-large">
              <Icon
                type="target"
                size={24}
              />

              <h3>
                Your practice bank is being
                prepared.
              </h3>

              <p>
                Once the ENGVIVA Admin Portal
                publishes questions for this
                role, they will appear here
                automatically.
              </p>
            </div>
          )}

        </section>

        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <section className="practice-activity">

          <div className="practice-section-head">

            <div>
              <span>
                YOUR ACTIVITY
              </span>

              <h2>
                Recent performance.
              </h2>
            </div>

            <button
              className="practice-text-button"
              onClick={() =>
                navigate(
                  "/progress"
                )
              }
            >
              VIEW PROGRESS
              <Icon
                type="arrow"
                size={13}
              />
            </button>

          </div>

          {data.recentActivity
            .length > 0 ? (
            <div className="practice-activity-list">

              {data.recentActivity
                .slice(0, 6)
                .map(
                  (
                    activity,
                    index
                  ) => (
                    <div
                      className="practice-activity-row"
                      key={
                        activity.id ||
                        index
                      }
                    >
                      <div>
                        <span>
                          {
                            activity.type
                          }
                        </span>

                        <strong>
                          {
                            activity.title
                          }
                        </strong>
                      </div>

                      <span>
                        {
                          activity.score ??
                          "—"
                        }
                        {activity.score !=
                          null &&
                          "%"}
                      </span>
                    </div>
                  )
                )}

            </div>
          ) : (
            <div className="practice-empty">
              Your completed practice activity
              will appear here.
            </div>
          )}

        </section>

      </main>
    </div>
  );
}

/* =========================================================
   PRACTICE MODE
========================================================= */

function PracticeMode({
  number,
  icon,
  eyebrow,
  title,
  description,
  count,
  button,
  onClick,
}) {
  return (
    <article className="practice-mode">

      <div className="practice-mode-number">
        {number}
      </div>

      <div className="practice-mode-icon">
        <Icon
          type={icon}
          size={22}
        />
      </div>

      <span className="practice-eyebrow">
        {eyebrow}
      </span>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>

      <div className="practice-mode-bottom">

        <span>
          {count} AVAILABLE
        </span>

        <button
          onClick={onClick}
        >
          {button}

          <Icon
            type="arrow"
            size={14}
          />
        </button>

      </div>

    </article>
  );
}

/* =========================================================
   CSS
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

.practice-page {
  min-height: 100vh;

  position: relative;

  overflow-x: hidden;

  color: #eee8f4;

  background:
    radial-gradient(
      circle at 80% -10%,
      rgba(151,112,221,.12),
      transparent 32%
    ),
    radial-gradient(
      circle at -10% 70%,
      rgba(91,57,143,.09),
      transparent 30%
    ),
    #07070c;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
}

.practice-grid {
  position: fixed;

  inset: 0;

  pointer-events: none;

  opacity: .2;

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
}

.practice-glow {
  position: fixed;

  width: 420px;
  height: 420px;

  border-radius: 50%;

  filter: blur(140px);

  opacity: .07;

  pointer-events: none;

  animation:
    practiceFloat
    14s ease-in-out
    infinite alternate;
}

.practice-glow.one {
  right: -180px;
  top: 20%;

  background: #a077dc;
}

.practice-glow.two {
  left: -200px;
  bottom: -100px;

  background: #67429a;

  animation-delay: -5s;
}

.practice-shell {
  position: relative;

  z-index: 2;

  width:
    min(
      1380px,
      calc(100% - 64px)
    );

  margin: auto;

  padding:
    35px 0 80px;
}

/* HEADER */

.practice-header {
  display: flex;

  justify-content: space-between;

  align-items: flex-end;

  gap: 30px;

  margin-bottom: 27px;
}

.practice-eyebrow {
  color: #8e72b5;

  font-size: 6px;

  font-weight: 800;

  letter-spacing: 1.9px;
}

.practice-header h1 {
  margin:
    10px 0 8px;

  color: #e3dbe9;

  font-size:
    clamp(
      38px,
      5vw,
      62px
    );

  font-weight: 350;

  letter-spacing: -3px;
}

.practice-header p {
  max-width: 640px;

  margin: 0;

  color: #635c6b;

  font-size: 8px;

  line-height: 1.8;
}

.practice-context {
  min-width: 190px;

  padding:
    16px 18px;

  border:
    1px solid
    rgba(190,160,235,.07);

  border-radius: 15px;

  background:
    rgba(255,255,255,.018);

  backdrop-filter:
    blur(20px);
}

.practice-context span {
  display: block;

  color: #4d4755;

  font-size: 5px;

  letter-spacing: 1.2px;
}

.practice-context strong {
  display: block;

  margin-top: 6px;

  color: #afa3b9;

  font-size: 9px;

  font-weight: 500;
}

.practice-context b {
  display: block;

  margin-top: 3px;

  color: #735b91;

  font-size: 6px;

  font-weight: 500;
}

/* READINESS */

.practice-readiness {
  display: grid;

  grid-template-columns:
    145px 1fr auto;

  align-items: center;

  gap: 22px;

  padding:
    17px 20px;

  border:
    1px solid
    rgba(190,160,235,.065);

  border-radius: 15px;

  background:
    rgba(255,255,255,.018);

  backdrop-filter:
    blur(20px);
}

.practice-readiness-score span {
  display: block;

  color: #504957;

  font-size: 5px;

  letter-spacing: 1px;
}

.practice-readiness-score strong {
  display: block;

  margin-top: 4px;

  color: #b49bd3;

  font-size: 20px;

  font-weight: 400;
}

.practice-readiness-line {
  height: 3px;

  overflow: hidden;

  border-radius: 20px;

  background:
    rgba(190,160,235,.06);
}

.practice-readiness-line div {
  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      #70509d,
      #b18bdc
    );

  box-shadow:
    0 0 14px
    rgba(177,139,220,.35);

  transition:
    width 1s
    cubic-bezier(
      .22, 1, .36, 1
    );
}

.practice-readiness-message {
  display: flex;

  align-items: center;

  gap: 8px;

  color: #655d6c;

  font-size: 6px;

  max-width: 210px;

  line-height: 1.5;
}

/* STATS */

.practice-stats {
  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  gap: 7px;

  margin-top: 9px;
}

.practice-stats > div {
  padding:
    15px 16px;

  border:
    1px solid
    rgba(190,160,235,.05);

  border-radius: 13px;

  background:
    rgba(255,255,255,.014);

  transition: .3s;
}

.practice-stats > div:hover {
  transform:
    translateY(-2px);

  background:
    rgba(158,122,222,.025);

  border-color:
    rgba(190,160,235,.1);
}

.practice-stats svg {
  color: #8065a5;
}

.practice-stats span {
  display: block;

  margin-top: 13px;

  color: #4e4855;

  font-size: 5px;

  letter-spacing: 1px;
}

.practice-stats strong {
  display: block;

  margin-top: 4px;

  color: #aaa0b2;

  font-size: 17px;

  font-weight: 400;
}

/* MODES */

.practice-modes {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 10px;

  margin-top: 22px;
}

.practice-mode {
  position: relative;

  min-height: 300px;

  padding:
    27px;

  overflow: hidden;

  border:
    1px solid
    rgba(190,160,235,.07);

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.04),
      rgba(255,255,255,.012)
    );

  backdrop-filter:
    blur(25px);

  transition:
    transform .35s ease,
    border-color .35s ease,
    background .35s ease;
}

.practice-mode::before {
  content: "";

  position: absolute;

  width: 180px;
  height: 180px;

  right: -100px;
  top: -100px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(161,124,229,.14),
      transparent 65%
    );
}

.practice-mode:hover {
  transform:
    translateY(-5px);

  border-color:
    rgba(190,160,235,.14);

  background:
    linear-gradient(
      145deg,
      rgba(155,120,218,.055),
      rgba(255,255,255,.014)
    );
}

.practice-mode-number {
  position: absolute;

  top: 24px;
  right: 27px;

  color: #322c38;

  font-size: 9px;

  letter-spacing: 1px;
}

.practice-mode-icon {
  width: 48px;
  height: 48px;

  display: grid;

  place-items: center;

  margin-bottom: 28px;

  border:
    1px solid
    rgba(190,160,235,.1);

  border-radius: 13px;

  color: #a68bce;

  background:
    rgba(158,122,224,.035);
}

.practice-mode h2 {
  margin:
    8px 0 10px;

  color: #cfc5d8;

  font-size: 23px;

  font-weight: 400;

  letter-spacing: -.6px;
}

.practice-mode p {
  max-width: 380px;

  margin: 0;

  color: #625b69;

  font-size: 7px;

  line-height: 1.8;
}

.practice-mode-bottom {
  position: absolute;

  left: 27px;
  right: 27px;
  bottom: 22px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding-top: 14px;

  border-top:
    1px solid
    rgba(190,160,235,.05);
}

.practice-mode-bottom > span {
  color: #4d4754;

  font-size: 5px;

  letter-spacing: 1px;
}

.practice-mode-bottom button {
  display: flex;

  align-items: center;

  gap: 8px;

  padding:
    9px 11px;

  border:
    1px solid
    rgba(190,160,235,.11);

  border-radius: 7px;

  color: #a18bb9;

  background:
    rgba(155,119,221,.035);

  cursor: pointer;

  font-size: 5px;

  letter-spacing: .8px;

  transition: .25s;
}

.practice-mode-bottom button:hover {
  color: #d2c4de;

  background:
    rgba(155,119,221,.09);

  transform:
    translateX(2px);
}

/* SECTIONS */

.practice-recommended,
.practice-library,
.practice-activity {
  margin-top: 42px;
}

.practice-section-head {
  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 20px;

  margin-bottom: 14px;
}

.practice-section-head > div:first-child span {
  color: #765d98;

  font-size: 5px;

  letter-spacing: 1.3px;
}

.practice-section-head h2 {
  margin:
    7px 0 0;

  color: #cfc5d7;

  font-size: 23px;

  font-weight: 400;
}

.practice-live {
  padding:
    6px 8px;

  border:
    1px solid
    rgba(159,122,220,.1);

  border-radius: 5px;

  color: #8067a1;

  background:
    rgba(159,122,220,.025);

  font-size: 5px;

  letter-spacing: 1px;
}

/* RECOMMENDATIONS */

.practice-recommendation-list {
  display: flex;

  flex-direction: column;

  gap: 6px;
}

.practice-recommendation {
  width: 100%;

  display: grid;

  grid-template-columns:
    48px 1fr auto;

  align-items: center;

  gap: 15px;

  padding:
    17px 19px;

  border:
    1px solid
    rgba(190,160,235,.05);

  border-radius: 13px;

  color: inherit;

  text-align: left;

  background:
    rgba(255,255,255,.014);

  cursor: pointer;

  transition: .3s;
}

.practice-recommendation:hover {
  transform:
    translateX(4px);

  border-color:
    rgba(190,160,235,.12);

  background:
    rgba(155,120,220,.03);
}

.practice-rec-number {
  color: #725995;

  font-size: 7px;
}

.practice-recommendation span {
  display: block;

  color: #524b59;

  font-size: 5px;

  letter-spacing: 1px;
}

.practice-recommendation strong {
  display: block;

  margin-top: 5px;

  color: #aaa0b1;

  font-size: 9px;

  font-weight: 500;
}

.practice-recommendation p {
  margin:
    5px 0 0;

  color: #5e5765;

  font-size: 6px;
}

.practice-recommendation > svg {
  color: #705993;
}

/* FILTER */

.practice-filters {
  display: flex;

  gap: 4px;
}

.practice-filters button {
  padding:
    7px 9px;

  border:
    1px solid
    transparent;

  border-radius: 6px;

  color: #524b58;

  background: transparent;

  cursor: pointer;

  font-size: 5px;

  letter-spacing: .8px;
}

.practice-filters button.active {
  border-color:
    rgba(190,160,235,.1);

  color: #a48bbf;

  background:
    rgba(155,120,220,.035);
}

/* LIBRARY */

.practice-library-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;
}

.practice-item {
  min-height: 175px;

  display: grid;

  grid-template-columns:
    auto 1fr auto;

  gap: 13px;

  align-items: start;

  padding: 18px;

  border:
    1px solid
    rgba(190,160,235,.05);

  border-radius: 15px;

  color: inherit;

  text-align: left;

  background:
    rgba(255,255,255,.014);

  cursor: pointer;

  transition: .3s;
}

.practice-item:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(190,160,235,.13);

  background:
    rgba(155,120,220,.03);
}

.practice-item-icon {
  width: 34px;
  height: 34px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(190,160,235,.08);

  border-radius: 9px;

  color: #8f74b4;

  background:
    rgba(155,120,220,.025);
}

.practice-item-top {
  display: flex;

  justify-content: space-between;

  gap: 8px;
}

.practice-item-top span {
  color: #63586e;

  font-size: 5px;

  letter-spacing: .9px;
}

.practice-item-top b {
  color: #816d95;

  font-size: 5px;

  font-weight: 500;
}

.practice-item h3 {
  margin:
    8px 0 6px;

  color: #aaa0b1;

  font-size: 9px;

  font-weight: 500;
}

.practice-item p {
  margin: 0;

  color: #5c5663;

  font-size: 6px;

  line-height: 1.65;
}

.practice-item-meta {
  display: flex;

  gap: 10px;

  margin-top: 12px;

  color: #4e4855;

  font-size: 5px;
}

.practice-item > svg {
  color: #67527f;
}

/* ACTIVITY */

.practice-activity {
  padding-bottom: 30px;
}

.practice-text-button {
  display: flex;

  align-items: center;

  gap: 8px;

  border: 0;

  color: #8169a1;

  background: transparent;

  cursor: pointer;

  font-size: 5px;

  letter-spacing: .8px;
}

.practice-activity-list {
  border-top:
    1px solid
    rgba(190,160,235,.05);
}

.practice-activity-row {
  display: flex;

  justify-content: space-between;

  align-items: center;

  padding:
    15px 4px;

  border-bottom:
    1px solid
    rgba(190,160,235,.04);
}

.practice-activity-row span {
  display: block;

  color: #524b59;

  font-size: 5px;

  letter-spacing: .8px;
}

.practice-activity-row strong {
  display: block;

  margin-top: 5px;

  color: #928797;

  font-size: 7px;

  font-weight: 500;
}

.practice-activity-row > span {
  color: #9b84b6;

  font-size: 8px;
}

/* EMPTY */

.practice-empty,
.practice-empty-large {
  border:
    1px dashed
    rgba(190,160,235,.08);

  border-radius: 13px;

  color: #5d5664;

  background:
    rgba(255,255,255,.01);
}

.practice-empty {
  padding: 19px;

  font-size: 7px;
}

.practice-empty-large {
  min-height: 220px;

  display: flex;

  align-items: center;

  flex-direction: column;

  justify-content: center;

  text-align: center;

  padding: 30px;
}

.practice-empty-large svg {
  color: #715895;

  margin-bottom: 14px;
}

.practice-empty-large h3 {
  margin: 0;

  color: #8e8296;

  font-size: 12px;

  font-weight: 400;
}

.practice-empty-large p {
  max-width: 400px;

  margin:
    8px 0 0;

  color: #57515e;

  font-size: 7px;

  line-height: 1.7;
}

/* LOADING */

.practice-center {
  display: grid;

  place-items: center;
}

.practice-loader {
  display: flex;

  align-items: center;

  flex-direction: column;

  gap: 12px;
}

.practice-spinner {
  width: 50px;
  height: 50px;

  border:
    1px solid
    rgba(190,160,235,.07);

  border-top-color:
    #a78bd3;

  border-radius: 50%;

  animation:
    practiceSpin
    .8s linear
    infinite;
}

.practice-loader span {
  color: #766985;

  font-size: 6px;

  letter-spacing: 1.5px;
}

.practice-loader small {
  color: #49434f;

  font-size: 6px;
}

/* ERROR */

.practice-error {
  width:
    min(
      500px,
      calc(100% - 40px)
    );

  padding: 35px;

  border:
    1px solid
    rgba(190,160,235,.08);

  border-radius: 20px;

  background:
    rgba(255,255,255,.02);
}

.practice-error > span {
  color: #80669f;

  font-size: 5px;

  letter-spacing: 1.2px;
}

.practice-error h1 {
  margin:
    10px 0;

  color: #cfc5d8;

  font-size: 25px;

  font-weight: 400;
}

.practice-error p {
  color: #655e6b;

  font-size: 8px;

  line-height: 1.8;
}

.practice-error button {
  margin-top: 15px;

  padding:
    10px 14px;

  border:
    1px solid
    rgba(190,160,235,.12);

  border-radius: 8px;

  color: #c8b9d5;

  background:
    rgba(155,120,220,.06);

  cursor: pointer;

  font-size: 6px;
}

/* ANIMATION */

@keyframes practiceSpin {
  to {
    transform:
      rotate(360deg);
  }
}

@keyframes practiceFloat {
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

@media (max-width: 1050px) {
  .practice-modes {
    grid-template-columns:
      1fr;
  }

  .practice-library-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .practice-stats {
    grid-template-columns:
      repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .practice-shell {
    width:
      calc(100% - 28px);
  }

  .practice-header {
    display: block;
  }

  .practice-context {
    margin-top: 18px;
  }

  .practice-readiness {
    grid-template-columns:
      1fr;
  }

  .practice-stats {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .practice-library-grid {
    grid-template-columns:
      1fr;
  }

  .practice-section-head {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .practice-filters {
    width: 100%;

    overflow-x: auto;
  }

  .practice-mode {
    min-height: 320px;
  }
}
`;