import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const COMPANY_FALLBACKS = {
  infosys: { name: "Infosys", logo: "I" },
  tcs: { name: "TCS", logo: "T" },
  wipro: { name: "Wipro", logo: "W" },
  accenture: { name: "Accenture", logo: "A" },
  cognizant: { name: "Cognizant", logo: "C" },
  amazon: { name: "Amazon", logo: "A" },
  microsoft: { name: "Microsoft", logo: "M" },
  google: { name: "Google", logo: "G" },
  nvidia: { name: "NVIDIA", logo: "N" },
};

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getCompanyId(location) {
  const params = new URLSearchParams(location.search);

  return (
    params.get("companyId") ||
    params.get("company") ||
    location.state?.companyId ||
    location.state?.company?.id ||
    location.state?.company?.slug ||
    ""
  );
}

function normalizeAssessments(payload) {
  if (!payload) return [];

  let source = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (Array.isArray(payload.assessments)) {
    source = payload.assessments;
  } else if (Array.isArray(payload.tests)) {
    source = payload.tests;
  } else if (Array.isArray(payload.data)) {
    source = payload.data;
  }

  return source.map((item, index) => ({
    id:
      item.id ||
      item.testId ||
      item.assessmentId ||
      `aptitude-${index + 1}`,

    title:
      item.title ||
      item.name ||
      item.testName ||
      `Aptitude Assessment ${index + 1}`,

    description:
      item.description ||
      "Company-specific aptitude assessment.",

    questions:
      Number(
        item.questions ||
          item.questionsCount ||
          item.questionCount ||
          item.totalQuestions
      ) || 20,

    duration:
      Number(
        item.duration ||
          item.durationMinutes ||
          item.timeLimit
      ) || 20,

    difficulty:
      item.difficulty ||
      item.level ||
      "Mixed",

    completed: Boolean(item.completed),

    score:
      item.score !== undefined && item.score !== null
        ? item.score
        : null,
  }));
}

export default function Assessments() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");

  const companyId = useMemo(
    () => normalizeId(getCompanyId(location)),
    [location]
  );

  const company = useMemo(() => {
    return (
      COMPANY_FALLBACKS[companyId] || {
        name:
          location.state?.company?.name ||
          location.state?.companyName ||
          "Selected Company",
        logo: "C",
      }
    );
  }, [companyId, location.state]);

  const getToken = async () => {
    try {
      const firebase = await import("../firebase");

      const auth =
        firebase.auth ||
        firebase.default?.auth ||
        null;

      if (auth?.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch (err) {
      console.warn("[ENGVIVA] Firebase token unavailable", err);
    }

    return null;
  };

  const loadAssessments = useCallback(async () => {
    setError("");

    try {
      const token = await getToken();

      const headers = {
        Accept: "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const params = new URLSearchParams();

      params.set("type", "aptitude");

      if (companyId) {
        params.set("company", companyId);
      }

      const url = `${API_BASE}/api/assessments?${params.toString()}`;

      console.log("[ENGVIVA] Loading assessments:", url);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Assessment API returned ${response.status}`
        );
      }

      const payload = await response.json();

      console.log("[ENGVIVA] Assessment response:", payload);

      const normalized = normalizeAssessments(payload);

      setTests(normalized);
    } catch (err) {
      console.error("[ENGVIVA] Assessment loading failed:", err);

      setTests([]);

      setError(
        "Unable to connect to the assessment service."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const refresh = () => {
    setRefreshing(true);
    loadAssessments();
  };

  const goBack = () => {
    if (companyId) {
      navigate(`/companies/${companyId}`);
    } else {
      navigate("/practice");
    }
  };

  const startAssessment = (assessment) => {
    /*
     * IMPORTANT:
     * We are not creating another screen yet.
     *
     * This route will be connected to the existing assessment
     * execution/proctoring architecture in the next step.
     */

    navigate("/practice/assessments/test", {
      state: {
        companyId,
        company,
        assessment,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <button
            onClick={goBack}
            style={styles.backButton}
          >
            ←
          </button>

          <div style={styles.headerContent}>
            <div style={styles.eyebrow}>
              PLACEMENT PRACTICE / APTITUDE
            </div>

            <h1 style={styles.title}>
              Aptitude{" "}
              <span style={styles.accent}>
                Lab
              </span>
            </h1>

            <p style={styles.subtitle}>
              Practice the aptitude patterns configured
              specifically for {company.name}.
            </p>
          </div>

          <div style={styles.companyBadge}>
            {company.logo}
          </div>
        </div>

        {/* COMPANY HERO */}

        <div style={styles.heroCard}>
          <div style={styles.companyLogo}>
            {company.logo}
          </div>

          <div style={styles.heroInfo}>
            <div style={styles.smallLabel}>
              CURRENT COMPANY
            </div>

            <div style={styles.companyName}>
              {company.name}
            </div>

            <div style={styles.companyDescription}>
              Company-specific aptitude assessments,
              generated from the ENGVIVA question database.
            </div>
          </div>

          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            DATABASE LIVE
          </div>
        </div>

        {/* STATS */}

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              {tests.length}
            </div>
            <div style={styles.statLabel}>
              AVAILABLE TESTS
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              20
            </div>
            <div style={styles.statLabel}>
              QUESTIONS / TEST
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              ∞
            </div>
            <div style={styles.statLabel}>
              PRACTICE ACCESS
            </div>
          </div>
        </div>

        {/* SECTION */}

        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionEyebrow}>
              ASSESSMENT MODULES
            </div>

            <h2 style={styles.sectionTitle}>
              Choose your test
            </h2>
          </div>

          <div style={styles.moduleCount}>
            {tests.length} MODULES
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>
              Assessment service unavailable
            </div>

            <div style={styles.errorText}>
              {error}
            </div>

            <button
              onClick={loadAssessments}
              style={styles.retryButton}
            >
              RETRY
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />

            <div style={styles.loadingText}>
              Loading company assessments...
            </div>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          tests.length === 0 && (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>
                A
              </div>

              <h3 style={styles.emptyTitle}>
                No assessments available
              </h3>

              <p style={styles.emptyText}>
                The backend is reachable, but no aptitude
                assessments were returned for {company.name}.
                Once your question database is connected,
                they will automatically appear here.
              </p>

              <button
                onClick={refresh}
                style={styles.secondaryButton}
              >
                CHECK AGAIN
              </button>
            </div>
          )}

        {/* TEST LIST */}

        {!loading &&
          tests.map((test, index) => (
            <div
              key={test.id}
              style={styles.testCard}
            >
              <div style={styles.testHeader}>

                <div style={styles.testNumber}>
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div style={styles.testInfo}>
                  <div style={styles.testTitleRow}>
                    <h3 style={styles.testTitle}>
                      {test.title}
                    </h3>

                    {test.completed && (
                      <span style={styles.completedBadge}>
                        COMPLETED
                      </span>
                    )}
                  </div>

                  <p style={styles.testDescription}>
                    {test.description}
                  </p>
                </div>
              </div>

              <div style={styles.metadata}>

                <div style={styles.meta}>
                  <strong>
                    {test.questions}
                  </strong>

                  <span>
                    QUESTIONS
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.meta}>
                  <strong>
                    {test.duration}
                  </strong>

                  <span>
                    MINUTES
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.meta}>
                  <strong>
                    {test.difficulty}
                  </strong>

                  <span>
                    DIFFICULTY
                  </span>
                </div>

                {test.score !== null && (
                  <>
                    <div style={styles.divider} />

                    <div style={styles.meta}>
                      <strong>
                        {test.score}%
                      </strong>

                      <span>
                        LAST SCORE
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() =>
                  startAssessment(test)
                }
                style={styles.startButton}
              >
                <span>
                  {test.completed
                    ? "PRACTICE AGAIN"
                    : "START ASSESSMENT"}
                </span>

                <span style={styles.startArrow}>
                  →
                </span>
              </button>
            </div>
          ))}

        {/* REFRESH */}

        {!loading && (
          <button
            onClick={refresh}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            {refreshing
              ? "REFRESHING..."
              : "↻ REFRESH ASSESSMENTS"}
          </button>
        )}

        <div style={styles.footerNote}>
          ENGVIVA · Assessment activity and performance
          will be connected to your candidate profile.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at 80% 10%, rgba(150,100,255,.12), transparent 30%), #07060c",
    color: "#fff",
    position: "relative",
    overflowX: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  backgroundGlowOne: {
    position: "fixed",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(172,120,255,.08)",
    filter: "blur(100px)",
    top: -180,
    right: -100,
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(100,80,255,.06)",
    filter: "blur(100px)",
    bottom: -150,
    left: -100,
    pointerEvents: "none",
  },

  container: {
    position: "relative",
    width: "min(1200px, calc(100% - 48px))",
    margin: "0 auto",
    padding: "38px 0 70px",
    zIndex: 1,
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    border: "1px solid rgba(255,255,255,.09)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 2.4,
    color: "#9887ae",
  },

  title: {
    margin: "5px 0 0",
    fontSize: "clamp(32px, 5vw, 46px)",
    lineHeight: 1,
    letterSpacing: -1.5,
    fontWeight: 900,
  },

  accent: {
    color: "#c9a7ff",
  },

  subtitle: {
    margin: "9px 0 0",
    maxWidth: 680,
    color: "#89838f",
    fontSize: 14,
    lineHeight: 1.6,
  },

  companyBadge: {
    width: 58,
    height: 58,
    borderRadius: 19,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(201,167,255,.1)",
    border: "1px solid rgba(201,167,255,.22)",
    color: "#d6c0ff",
    fontWeight: 900,
    fontSize: 21,
  },

  heroCard: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: 24,
    borderRadius: 25,
    background: "rgba(255,255,255,.035)",
    border: "1px solid rgba(255,255,255,.075)",
    backdropFilter: "blur(22px)",
    marginBottom: 16,
  },

  companyLogo: {
    width: 70,
    height: 70,
    borderRadius: 21,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(201,167,255,.1)",
    border: "1px solid rgba(201,167,255,.2)",
    color: "#d7c1ff",
    fontSize: 28,
    fontWeight: 900,
  },

  heroInfo: {
    flex: 1,
  },

  smallLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: 800,
    color: "#81798d",
  },

  companyName: {
    marginTop: 4,
    fontSize: 27,
    fontWeight: 900,
  },

  companyDescription: {
    marginTop: 4,
    color: "#8b8592",
    fontSize: 13,
    lineHeight: 1.5,
  },

  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 12px",
    borderRadius: 20,
    background: "rgba(201,167,255,.07)",
    border: "1px solid rgba(201,167,255,.15)",
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#c9a7ff",
    boxShadow: "0 0 12px #c9a7ff",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 40,
  },

  statCard: {
    padding: 20,
    borderRadius: 20,
    background: "rgba(255,255,255,.025)",
    border: "1px solid rgba(255,255,255,.065)",
  },

  statNumber: {
    fontSize: 28,
    fontWeight: 900,
  },

  statLabel: {
    marginTop: 4,
    color: "#706a77",
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: 800,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  sectionEyebrow: {
    color: "#9786ad",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: 800,
  },

  sectionTitle: {
    margin: "5px 0 0",
    fontSize: 24,
    fontWeight: 900,
  },

  moduleCount: {
    color: "#6d6675",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
  },

  errorCard: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 20,
    border: "1px solid rgba(255,100,100,.16)",
    background: "rgba(255,80,80,.035)",
  },

  errorTitle: {
    fontWeight: 800,
    fontSize: 15,
  },

  errorText: {
    marginTop: 5,
    color: "#918a97",
    fontSize: 12,
  },

  retryButton: {
    marginTop: 13,
    padding: "9px 15px",
    borderRadius: 10,
    border: "1px solid rgba(201,167,255,.2)",
    background: "rgba(201,167,255,.08)",
    color: "#c9a7ff",
    fontWeight: 900,
    fontSize: 9,
    cursor: "pointer",
  },

  loadingCard: {
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.06)",
  },

  spinner: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "3px solid rgba(201,167,255,.15)",
    borderTopColor: "#c9a7ff",
    animation: "engviva-spin 1s linear infinite",
  },

  loadingText: {
    marginTop: 14,
    color: "#85808c",
    fontSize: 13,
  },

  emptyCard: {
    padding: 45,
    textAlign: "center",
    borderRadius: 24,
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.06)",
  },

  emptyIcon: {
    width: 65,
    height: 65,
    margin: "0 auto 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    background: "rgba(201,167,255,.08)",
    border: "1px solid rgba(201,167,255,.15)",
    color: "#c9a7ff",
    fontSize: 26,
    fontWeight: 900,
  },

  emptyTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  emptyText: {
    maxWidth: 650,
    margin: "9px auto 0",
    color: "#85808d",
    fontSize: 13,
    lineHeight: 1.6,
  },

  secondaryButton: {
    marginTop: 20,
    padding: "11px 18px",
    borderRadius: 12,
    background: "rgba(201,167,255,.08)",
    border: "1px solid rgba(201,167,255,.2)",
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
    cursor: "pointer",
  },

  testCard: {
    marginBottom: 15,
    padding: 23,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.018))",
    border: "1px solid rgba(255,255,255,.075)",
    backdropFilter: "blur(20px)",
  },

  testHeader: {
    display: "flex",
    gap: 17,
  },

  testNumber: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(201,167,255,.08)",
    border: "1px solid rgba(201,167,255,.14)",
    color: "#c9a7ff",
    fontSize: 12,
    fontWeight: 900,
  },

  testInfo: {
    flex: 1,
  },

  testTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  testTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
  },

  completedBadge: {
    padding: "4px 8px",
    borderRadius: 9,
    background: "rgba(201,167,255,.08)",
    color: "#c9a7ff",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  testDescription: {
    margin: "5px 0 0",
    color: "#85808c",
    fontSize: 12,
    lineHeight: 1.55,
  },

  metadata: {
    display: "flex",
    alignItems: "center",
    marginTop: 20,
    padding: "15px 0",
    borderTop: "1px solid rgba(255,255,255,.055)",
    borderBottom: "1px solid rgba(255,255,255,.055)",
  },

  meta: {
    flex: 1,
    textAlign: "center",
  },

  metaStrong: {
    color: "#fff",
  },

  divider: {
    width: 1,
    height: 30,
    background: "rgba(255,255,255,.07)",
  },

  startButton: {
    width: "100%",
    marginTop: 16,
    minHeight: 48,
    border: 0,
    borderRadius: 14,
    background:
      "linear-gradient(135deg, #d8c0ff, #b895f5)",
    color: "#170d22",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.1,
    cursor: "pointer",
    boxShadow:
      "0 10px 35px rgba(185,145,255,.12)",
  },

  startArrow: {
    fontSize: 20,
  },

  refreshButton: {
    display: "block",
    margin: "22px auto 0",
    padding: "11px 18px",
    borderRadius: 12,
    background: "transparent",
    border: "1px solid rgba(255,255,255,.08)",
    color: "#77717f",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
    cursor: "pointer",
  },

  footerNote: {
    textAlign: "center",
    marginTop: 25,
    color: "#504b56",
    fontSize: 10,
  },
};

/*
 * Web animation.
 *
 * We inject this once because this file is intentionally self-contained.
 */
if (
  typeof document !== "undefined" &&
  !document.getElementById("engviva-assessment-animation")
) {
  const style = document.createElement("style");

  style.id = "engviva-assessment-animation";

  style.textContent = `
    @keyframes engviva-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 700px) {
      .engviva-assessment-mobile {
        display: block;
      }
    }
  `;

  document.head.appendChild(style);
}