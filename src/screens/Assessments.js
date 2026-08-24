import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const FALLBACK_COMPANIES = {
  infosys: {
    name: "Infosys",
    short: "INFOSYS",
    logo: "I",
  },
  tcs: {
    name: "TCS",
    short: "TCS",
    logo: "T",
  },
  wipro: {
    name: "Wipro",
    short: "WIPRO",
    logo: "W",
  },
  accenture: {
    name: "Accenture",
    short: "ACCENTURE",
    logo: "A",
  },
  cognizant: {
    name: "Cognizant",
    short: "COG",
    logo: "C",
  },
  amazon: {
    name: "Amazon",
    short: "AMAZON",
    logo: "A",
  },
  microsoft: {
    name: "Microsoft",
    short: "MS",
    logo: "M",
  },
  google: {
    name: "Google",
    short: "GOOGLE",
    logo: "G",
  },
  nvidia: {
    name: "NVIDIA",
    short: "NVIDIA",
    logo: "N",
  },
};

function normalizeCompanyId(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getCompanyFromLocation(location) {
  const params = new URLSearchParams(location.search);

  const queryCompany =
    params.get("company") ||
    params.get("companyId") ||
    params.get("company_id");

  if (queryCompany) {
    return queryCompany;
  }

  const stateCompany =
    location.state?.companyId ||
    location.state?.company?.id ||
    location.state?.company?.slug;

  if (stateCompany) {
    return stateCompany;
  }

  return "";
}

function normalizeTests(payload) {
  if (!payload) return [];

  let raw = [];

  if (Array.isArray(payload)) {
    raw = payload;
  } else if (Array.isArray(payload.assessments)) {
    raw = payload.assessments;
  } else if (Array.isArray(payload.tests)) {
    raw = payload.tests;
  } else if (Array.isArray(payload.data)) {
    raw = payload.data;
  } else if (Array.isArray(payload.rounds)) {
    raw = payload.rounds.filter((item) => {
      const type = String(
        item.type || item.roundType || item.category || ""
      ).toLowerCase();

      return (
        type.includes("aptitude") ||
        type.includes("assessment") ||
        type.includes("ability")
      );
    });
  }

  return raw.map((item, index) => ({
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
      "Company-specific aptitude assessment designed around placement-style questions.",

    duration:
      item.duration ||
      item.durationMinutes ||
      item.timeLimit ||
      20,

    questions:
      item.questionsCount ||
      item.questionCount ||
      item.totalQuestions ||
      (Array.isArray(item.questions) ? item.questions.length : 20),

    difficulty:
      item.difficulty ||
      item.level ||
      "Mixed",

    attempts:
      item.attempts ||
      item.maxAttempts ||
      "Unlimited",

    status: item.status || "available",

    companyId:
      item.companyId ||
      item.company ||
      item.companySlug ||
      "",

    completed:
      Boolean(item.completed),

    score:
      item.score !== undefined && item.score !== null
        ? item.score
        : null,
  }));
}

function GlassCard({ children, style }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export default function Assessments() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState("");

  const company = useMemo(() => {
    const id = normalizeCompanyId(companyId);

    return (
      FALLBACK_COMPANIES[id] || {
        name:
          location.state?.company?.name ||
          location.state?.companyName ||
          "Selected Company",
        short: "COMPANY",
        logo: "C",
      }
    );
  }, [companyId, location.state]);

  const getAuthToken = async () => {
    try {
      const firebaseModule = await import("../firebase");

      const auth =
        firebaseModule.auth ||
        firebaseModule.default?.auth ||
        null;

      if (auth?.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch (err) {
      console.warn("Firebase token unavailable:", err);
    }

    return null;
  };

  const loadAssessments = useCallback(async () => {
    setError("");

    try {
      const currentCompany = normalizeCompanyId(
        getCompanyFromLocation(location)
      );

      setCompanyId(currentCompany);

      const token = await getAuthToken();

      const headers = {
        Accept: "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      /*
       * Company-specific assessment endpoint.
       *
       * The frontend intentionally accepts multiple backend response
       * structures so the screen remains stable while the backend
       * assessment database evolves.
       */
      const url = currentCompany
        ? `${API_BASE}/api/assessments?company=${encodeURIComponent(
            currentCompany
          )}&type=aptitude`
        : `${API_BASE}/api/assessments?type=aptitude`;

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
      const normalized = normalizeTests(payload);

      setTests(normalized);
    } catch (err) {
      console.error("[ENGVIVA] Assessment loading error:", err);

      setTests([]);

      setError(
        "Unable to load aptitude assessments right now. Please retry."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAssessments();
  };

  const startAssessment = (test) => {
    /*
     * We do NOT create another screen here.
     *
     * The existing Assessment execution route can be connected later.
     *
     * For now we preserve the complete test context in navigation state.
     */
    navigate("/practice/assessments/test", {
      state: {
        companyId,
        company,
        assessment: test,
      },
    });
  };

  const goBack = () => {
    if (location.state?.fromCompany) {
      navigate(`/companies/${companyId}`);
      return;
    }

    navigate("/practice");
  };

  return (
    <View style={styles.screen}>
      {/* Ambient background */}
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c9a7ff"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              PLACEMENT PRACTICE / APTITUDE
            </Text>

            <Text style={styles.title}>
              Aptitude{" "}
              <Text style={styles.titleAccent}>Lab</Text>
            </Text>

            <Text style={styles.subtitle}>
              Company-specific assessments. Practice without
              unnecessary locks or artificial restrictions.
            </Text>
          </View>

          <View style={styles.companyBadge}>
            <Text style={styles.companyLogo}>
              {company.logo}
            </Text>
          </View>
        </View>

        {/* Company identity */}
        <GlassCard style={styles.companyHero}>
          <View style={styles.companyLogoLarge}>
            <Text style={styles.companyLogoLargeText}>
              {company.logo}
            </Text>
          </View>

          <View style={styles.companyHeroInfo}>
            <Text style={styles.companyLabel}>
              CURRENT COMPANY
            </Text>

            <Text style={styles.companyName}>
              {company.name}
            </Text>

            <Text style={styles.companyDescription}>
              Aptitude assessments mapped to the recruitment
              pattern configured for this company.
            </Text>
          </View>

          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statNumber}>
              {tests.length}
            </Text>
            <Text style={styles.statLabel}>
              TESTS AVAILABLE
            </Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statNumber}>20</Text>
            <Text style={styles.statLabel}>
              TARGET QUESTIONS
            </Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statNumber}>∞</Text>
            <Text style={styles.statLabel}>
              PRACTICE
            </Text>
          </GlassCard>
        </View>

        {/* Error */}
        {error && (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Assessment service unavailable
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadAssessments}
            >
              <Text style={styles.retryText}>
                RETRY
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              AVAILABLE MODULES
            </Text>

            <Text style={styles.sectionTitle}>
              Choose your assessment
            </Text>
          </View>

          <Text style={styles.sectionCount}>
            {tests.length} MODULES
          </Text>
        </View>

        {/* Loading */}
        {loading && (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#c9a7ff"
            />

            <Text style={styles.loadingText}>
              Loading company assessments...
            </Text>
          </GlassCard>
        )}

        {/* Empty */}
        {!loading && !error && tests.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>A</Text>
            </View>

            <Text style={styles.emptyTitle}>
              Assessments are being prepared
            </Text>

            <Text style={styles.emptyText}>
              No aptitude assessments are currently available
              for {company.name}. Once questions are uploaded
              to the ENGVIVA assessment database, they will
              appear here automatically.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={loadAssessments}
            >
              <Text style={styles.secondaryButtonText}>
                CHECK AGAIN
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Tests */}
        {!loading &&
          tests.map((test, index) => (
            <GlassCard
              key={test.id}
              style={styles.testCard}
            >
              <View style={styles.testTop}>
                <View style={styles.testNumber}>
                  <Text style={styles.testNumberText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.testInfo}>
                  <View style={styles.testTitleRow}>
                    <Text style={styles.testTitle}>
                      {test.title}
                    </Text>

                    {test.completed && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedText}>
                          COMPLETED
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.testDescription}>
                    {test.description}
                  </Text>
                </View>
              </View>

              {/* Test metadata */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {test.questions}
                  </Text>

                  <Text style={styles.metaLabel}>
                    QUESTIONS
                  </Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {test.duration}
                  </Text>

                  <Text style={styles.metaLabel}>
                    MINUTES
                  </Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {test.difficulty}
                  </Text>

                  <Text style={styles.metaLabel}>
                    LEVEL
                  </Text>
                </View>
              </View>

              {/* Action */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.startButton}
                onPress={() => startAssessment(test)}
              >
                <Text style={styles.startButtonText}>
                  {test.completed
                    ? "PRACTICE AGAIN"
                    : "START ASSESSMENT"}
                </Text>

                <Text style={styles.arrow}>
                  →
                </Text>
              </TouchableOpacity>
            </GlassCard>
          ))}

        {/* Bottom note */}
        {!loading && tests.length > 0 && (
          <View style={styles.bottomNote}>
            <View style={styles.securityDot} />

            <Text style={styles.bottomNoteText}>
              Assessment activity, scores and performance
              analytics are stored against your ENGVIVA
              profile.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: "100vh",
    backgroundColor: "#07060c",
    overflow: "hidden",
  },

  scroll: {
    flex: 1,
  },

  container: {
    width: "100%",
    maxWidth: 1250,
    alignSelf: "center",
    paddingHorizontal: 34,
    paddingTop: 34,
    paddingBottom: 80,
  },

  orbOne: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(177, 125, 255, 0.09)",
    top: -160,
    right: -100,
    filter: "blur(80px)",
  },

  orbTwo: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(103, 82, 255, 0.06)",
    bottom: -120,
    left: -100,
    filter: "blur(90px)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 34,
    marginTop: -4,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    color: "#a996c8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 6,
  },

  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.5,
  },

  titleAccent: {
    color: "#c9a7ff",
  },

  subtitle: {
    color: "#8f8a99",
    fontSize: 14,
    marginTop: 7,
    maxWidth: 680,
    lineHeight: 21,
  },

  companyBadge: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "rgba(201,167,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  companyLogo: {
    color: "#d9c4ff",
    fontSize: 21,
    fontWeight: "900",
  },

  glassCard: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
    borderRadius: 24,
    backdropFilter: "blur(22px)",
  },

  companyHero: {
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 18,
  },

  companyLogoLarge: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "rgba(201,167,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.23)",
    justifyContent: "center",
    alignItems: "center",
  },

  companyLogoLargeText: {
    color: "#d7c1ff",
    fontSize: 28,
    fontWeight: "900",
  },

  companyHeroInfo: {
    flex: 1,
  },

  companyLabel: {
    color: "#8d829c",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  companyName: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },

  companyDescription: {
    color: "#9993a2",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(201,167,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.16)",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#c9a7ff",
  },

  liveText: {
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 38,
  },

  statCard: {
    flex: 1,
    padding: 19,
  },

  statNumber: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
  },

  statLabel: {
    color: "#817b8a",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  sectionEyebrow: {
    color: "#9887ae",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 5,
  },

  sectionCount: {
    color: "#766d80",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  testCard: {
    padding: 23,
    marginBottom: 15,
  },

  testTop: {
    flexDirection: "row",
    gap: 17,
  },

  testNumber: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(201,167,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  testNumberText: {
    color: "#c9a7ff",
    fontSize: 13,
    fontWeight: "900",
  },

  testInfo: {
    flex: 1,
  },

  testTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  testTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  testDescription: {
    color: "#8d8993",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(201,167,255,0.09)",
  },

  completedText: {
    color: "#c9a7ff",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 21,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.055)",
  },

  metaItem: {
    flex: 1,
    alignItems: "center",
  },

  metaValue: {
    color: "#e9e4ee",
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  metaLabel: {
    color: "#6f6977",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },

  metaDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  startButton: {
    marginTop: 17,
    minHeight: 49,
    borderRadius: 15,
    backgroundColor: "#c9a7ff",
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  startButtonText: {
    color: "#160e20",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  arrow: {
    color: "#160e20",
    fontSize: 22,
    fontWeight: "700",
  },

  loadingCard: {
    padding: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#85808d",
    marginTop: 14,
    fontSize: 13,
  },

  emptyCard: {
    padding: 40,
    alignItems: "center",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: "rgba(201,167,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  emptyIconText: {
    color: "#c9a7ff",
    fontSize: 26,
    fontWeight: "900",
  },

  emptyTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },

  emptyText: {
    color: "#85808c",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 600,
    textAlign: "center",
    marginTop: 8,
  },

  secondaryButton: {
    marginTop: 20,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(201,167,255,0.25)",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  secondaryButtonText: {
    color: "#c9a7ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  errorCard: {
    padding: 20,
    marginBottom: 25,
    borderColor: "rgba(255,120,120,0.16)",
  },

  errorTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  errorText: {
    color: "#918b97",
    fontSize: 12,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 13,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(201,167,255,0.1)",
  },

  retryText: {
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  bottomNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 15,
    paddingHorizontal: 4,
  },

  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#c9a7ff",
  },

  bottomNoteText: {
    flex: 1,
    color: "#625d69",
    fontSize: 10,
    lineHeight: 16,
  },
});