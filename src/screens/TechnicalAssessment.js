import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

/* ============================================================
   CONFIG
============================================================ */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com"
).replace(/\/+$/, "");

const STORAGE_KEY = "engviva:technical:attempt";
const RESULT_KEY = "engviva:technical:result";

const MAX_PROCTOR_FLAGS = 5;

/*
  These are ONLY fallback company metadata.
  Questions, levels, scores and assessment data NEVER come
  from this list.
*/
const FALLBACK_COMPANIES = [
  {
    id: "google",
    name: "Google",
    category: "Technology",
    domain: "google.com",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    category: "Technology",
    domain: "microsoft.com",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Technology",
    domain: "amazon.com",
  },
  {
    id: "apple",
    name: "Apple",
    category: "Technology",
    domain: "apple.com",
  },
  {
    id: "meta",
    name: "Meta",
    category: "Technology",
    domain: "meta.com",
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    category: "Technology",
    domain: "nvidia.com",
  },
  {
    id: "ibm",
    name: "IBM",
    category: "Technology",
    domain: "ibm.com",
  },
  {
    id: "oracle",
    name: "Oracle",
    category: "Technology",
    domain: "oracle.com",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "Technology",
    domain: "salesforce.com",
  },
  {
    id: "adobe",
    name: "Adobe",
    category: "Technology",
    domain: "adobe.com",
  },
  {
    id: "cisco",
    name: "Cisco",
    category: "Technology",
    domain: "cisco.com",
  },
  {
    id: "intel",
    name: "Intel",
    category: "Technology",
    domain: "intel.com",
  },
  {
    id: "accenture",
    name: "Accenture",
    category: "Consulting",
    domain: "accenture.com",
  },
  {
    id: "deloitte",
    name: "Deloitte",
    category: "Consulting",
    domain: "deloitte.com",
  },
  {
    id: "tcs",
    name: "TCS",
    category: "IT Services",
    domain: "tcs.com",
  },
  {
    id: "infosys",
    name: "Infosys",
    category: "IT Services",
    domain: "infosys.com",
  },
  {
    id: "wipro",
    name: "Wipro",
    category: "IT Services",
    domain: "wipro.com",
  },
  {
    id: "hcltech",
    name: "HCLTech",
    category: "IT Services",
    domain: "hcltech.com",
  },
  {
    id: "tech-mahindra",
    name: "Tech Mahindra",
    category: "IT Services",
    domain: "techmahindra.com",
  },
  {
    id: "cognizant",
    name: "Cognizant",
    category: "IT Services",
    domain: "cognizant.com",
  },
  {
    id: "ltimindtree",
    name: "LTIMindtree",
    category: "IT Services",
    domain: "ltimindtree.com",
  },
  {
    id: "persistent",
    name: "Persistent Systems",
    category: "Technology",
    domain: "persistent.com",
  },
  {
    id: "zoho",
    name: "Zoho",
    category: "Technology",
    domain: "zoho.com",
  },
  {
    id: "freshworks",
    name: "Freshworks",
    category: "Technology",
    domain: "freshworks.com",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    category: "Technology",
    domain: "flipkart.com",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    category: "Fintech",
    domain: "phonepe.com",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Fintech",
    domain: "razorpay.com",
  },
  {
    id: "swiggy",
    name: "Swiggy",
    category: "Technology",
    domain: "swiggy.com",
  },
  {
    id: "zomato",
    name: "Zomato",
    category: "Technology",
    domain: "zomato.com",
  },
  {
    id: "siemens",
    name: "Siemens",
    category: "Engineering",
    domain: "siemens.com",
  },
  {
    id: "bosch",
    name: "Bosch",
    category: "Engineering",
    domain: "bosch.com",
  },
  {
    id: "qualcomm",
    name: "Qualcomm",
    category: "Semiconductors",
    domain: "qualcomm.com",
  },
  {
    id: "amd",
    name: "AMD",
    category: "Semiconductors",
    domain: "amd.com",
  },
  {
    id: "pitti-engineering",
    name: "Pitti Engineering",
    category: "Engineering",
    domain: "pitti.in",
  },
];

/* ============================================================
   HELPERS
============================================================ */

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatTime(seconds) {
  const value = Math.max(
    0,
    Math.floor(safeNumber(seconds))
  );

  const minutes = Math.floor(value / 60);
  const secs = value % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

function getDomain(value) {
  if (!value) return "";

  try {
    const url = String(value).startsWith("http")
      ? String(value)
      : `https://${String(value)}`;

    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(value)
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/^www\./, "");
  }
}

/*
  IMPORTANT:
  Company logo is ALWAYS obtained through favicon service.
  No Clearbit.
  No manually supplied image URL.
*/
function getFavicon(domain) {
  const cleanDomain = getDomain(domain);

  if (!cleanDomain) return "";

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    cleanDomain
  )}&sz=256`;
}

function getFallbackCompany(id) {
  const normalized = normalizeId(id);

  return (
    FALLBACK_COMPANIES.find(
      (company) => company.id === normalized
    ) || {
      id: normalized,
      name: id || "Company",
      category: "Engineering",
      domain: "",
    }
  );
}

function normalizeCompany(raw) {
  const source = raw?.company || raw;

  const id = normalizeId(
    firstValue(
      source?.id,
      source?.companyId,
      source?.slug
    )
  );

  const fallback = getFallbackCompany(id);

  const domain = getDomain(
    firstValue(
      source?.domain,
      source?.website,
      source?.websiteUrl,
      source?.url,
      fallback.domain
    )
  );

  return {
    id,
    name: String(
      firstValue(
        source?.name,
        source?.companyName,
        fallback.name,
        id
      )
    ),
    category: String(
      firstValue(
        source?.category,
        source?.industry,
        fallback.category,
        "Engineering"
      )
    ),
    domain,
  };
}

function normalizeQuestions(payload) {
  const root = payload?.data ?? payload;

  let source = [];

  if (Array.isArray(root)) {
    source = root;
  } else if (Array.isArray(root?.questions)) {
    source = root.questions;
  } else if (Array.isArray(payload?.questions)) {
    source = payload.questions;
  }

  return source
    .map((question, index) => {
      const options = Array.isArray(question?.options)
        ? question.options
            .map((option) => {
              if (
                option &&
                typeof option === "object"
              ) {
                return String(
                  firstValue(
                    option.text,
                    option.label,
                    option.value,
                    ""
                  )
                );
              }

              return String(option ?? "");
            })
            .filter(Boolean)
        : [];

      return {
        id: String(
          firstValue(
            question?.id,
            question?.questionId,
            question?._id,
            `technical-question-${index + 1}`
          )
        ),

        question: String(
          firstValue(
            question?.question,
            question?.text,
            question?.questionText,
            ""
          )
        ),

        options,

        module: String(
          firstValue(
            question?.module,
            question?.moduleName,
            question?.category,
            "Technical"
          )
        ),

        difficulty: String(
          firstValue(
            question?.difficulty,
            question?.level,
            "Mixed"
          )
        ),

        images: Array.isArray(question?.images)
          ? question.images
          : [],
      };
    })
    .filter(
      (question) =>
        question.question &&
        question.options.length >= 2
    );
}

/* ============================================================
   FIREBASE AUTH
============================================================ */

async function getFirebaseToken() {
  try {
    const firebaseModule =
      await import("../firebase");

    const auth =
      firebaseModule.auth ||
      firebaseModule.default?.auth;

    if (!auth?.currentUser) {
      return null;
    }

    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.warn(
      "[TECHNICAL AUTH] Firebase token unavailable",
      error
    );

    return null;
  }
}

/* ============================================================
   API
============================================================ */

async function apiFetch(path, options = {}) {
  const token = await getFirebaseToken();

  const headers = {
    Accept: "application/json",
    ...(options.body
      ? {
          "Content-Type": "application/json",
        }
      : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    }
  );

  const payload = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const serverMessage =
      payload?.error?.message ||
      payload?.error ||
      payload?.message;

    if (response.status === 401) {
      throw new Error(
        serverMessage ||
          "Please sign in before starting a technical assessment."
      );
    }

    if (response.status === 404) {
      const error = new Error(
        serverMessage ||
          "The requested technical resource was not found."
      );

      error.status = 404;

      throw error;
    }

    const error = new Error(
      serverMessage ||
        `Request failed (${response.status}).`
    );

    error.status = response.status;

    throw error;
  }

  return payload;
}

/* ============================================================
   STORAGE
============================================================ */

function readAttempt() {
  try {
    return JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "null"
    );
  } catch {
    return null;
  }
}

function saveAttempt(attempt) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(attempt)
    );
  } catch {}
}

function clearAttempt() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function saveResult(result) {
  try {
    sessionStorage.setItem(
      RESULT_KEY,
      JSON.stringify(result)
    );
  } catch {}
}

function readResult() {
  try {
    return JSON.parse(
      sessionStorage.getItem(RESULT_KEY) || "null"
    );
  } catch {
    return null;
  }
}

function clearResult() {
  try {
    sessionStorage.removeItem(RESULT_KEY);
  } catch {}
}

/* ============================================================
   FULLSCREEN
============================================================ */

async function enterFullscreen() {
  try {
    if (
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    ) {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn(
      "[TECHNICAL PROCTOR] Fullscreen unavailable",
      error
    );
  }
}

async function exitFullscreen() {
  try {
    if (
      document.fullscreenElement &&
      document.exitFullscreen
    ) {
      await document.exitFullscreen();
    }
  } catch {}
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function TechnicalAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const companyId = normalizeId(
    firstValue(
      params.companyId,
      query.get("company"),
      query.get("companyId"),
      location.state?.companyId,
      location.state?.company?.id
    )
  );

  const levelNumber = safeNumber(
    firstValue(
      params.levelNumber,
      query.get("level"),
      location.state?.levelNumber
    ),
    0
  );

  const roleFromUrl = String(
    firstValue(
      query.get("role"),
      location.state?.role,
      "Software Engineer"
    )
  );

  const isResultRoute =
    location.pathname.endsWith("/result");

  const hasLevelRoute = Boolean(
    companyId && levelNumber
  );

  const [screen, setScreen] = useState(() => {
    if (isResultRoute) return "result";

    if (hasLevelRoute) return "running";

    if (companyId) return "levels";

    return "companies";
  });

  /* ----------------------------------------------------------
     COMPANY
  ---------------------------------------------------------- */

  const [companies, setCompanies] = useState(
    FALLBACK_COMPANIES
  );

  const [selectedCompany, setSelectedCompany] =
    useState(
      companyId
        ? getFallbackCompany(companyId)
        : null
    );

  const [companiesLoading, setCompaniesLoading] =
    useState(false);

  /* ----------------------------------------------------------
     LEVELS
  ---------------------------------------------------------- */

  const [levels, setLevels] = useState([]);

  const [levelsLoading, setLevelsLoading] =
    useState(false);

  /* ----------------------------------------------------------
     TEST
  ---------------------------------------------------------- */

  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] = useState({});

  const answersRef = useRef({});

  const [attemptId, setAttemptId] =
    useState(null);

  const [startedAt, setStartedAt] =
    useState(null);

  const startedAtRef = useRef(null);

  const [timeAllowed, setTimeAllowed] =
    useState(0);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const remainingRef = useRef(0);

  const [loadingTest, setLoadingTest] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [showSubmit, setShowSubmit] =
  useState(false);

  const submittingRef = useRef(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] = useState("");

  /* ----------------------------------------------------------
     PROCTORING
  ---------------------------------------------------------- */

  const [violations, setViolations] =
    useState([]);

  const violationsRef = useRef([]);

  const [proctorWarning, setProctorWarning] =
    useState("");

  const [proctorLocked, setProctorLocked] =
    useState(false);

  const timerRef = useRef(null);

  const submitRef = useRef(null);

  const violationLockRef = useRef(false);
  const fullscreenGraceRef = useRef(false);

  /* ----------------------------------------------------------
     SYNCHRONIZE REFS
  ---------------------------------------------------------- */

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    remainingRef.current =
      remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    violationsRef.current =
      violations;
  }, [violations]);

  /*
   * Keep route and screen state synchronized when React Router
   * reuses this component for a different CompanyDetails link.
   */
  useEffect(() => {
    if (screen === "running") return;

    if (isResultRoute) {
      setScreen("result");
      return;
    }

    if (companyId) {
      setSelectedCompany((current) =>
        current?.id === companyId
          ? current
          : getFallbackCompany(companyId)
      );
      setScreen("levels");
      return;
    }

    setSelectedCompany(null);
    setLevels([]);
    setScreen("companies");
  }, [companyId, isResultRoute, screen]);

  /* ----------------------------------------------------------
     COMPANY
  ---------------------------------------------------------- */

  const company = useMemo(() => {
    if (selectedCompany) {
      return selectedCompany;
    }

    if (companyId) {
      return getFallbackCompany(companyId);
    }

    return null;
  }, [
    selectedCompany,
    companyId,
  ]);

  /* ==========================================================
     LOAD COMPANIES
  ========================================================== */

  const loadCompanies = useCallback(
    async () => {
      setCompaniesLoading(true);
      setError("");

      try {
        /*
          If your backend exposes /companies this will be
          completely dynamic.

          If that endpoint is not deployed yet, the real
          fallback company metadata is used so the UI does
          not break.
        */
        const payload = await apiFetch(
          "/api/technical/companies"
        );

        const root =
          payload?.data ?? payload;

        const source = Array.isArray(root)
          ? root
          : Array.isArray(root?.companies)
          ? root.companies
          : Array.isArray(payload?.companies)
          ? payload.companies
          : [];

        if (source.length) {
          setCompanies(
            source
              .map(normalizeCompany)
              .filter((item) => item.id)
          );
        }
      } catch (error) {
        /*
          404 here must NOT break Technical Lab.
          The technical company metadata fallback is
          used only for navigation metadata.
        */

        console.warn(
          "[TECHNICAL COMPANIES] Dynamic endpoint unavailable; using metadata fallback."
        );

        setCompanies(
          FALLBACK_COMPANIES
        );
      } finally {
        setCompaniesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (screen === "companies") {
      loadCompanies();
    }
  }, [
    screen,
    loadCompanies,
  ]);

  /* ==========================================================
     LOAD LEVELS
  ========================================================== */

  const loadLevels = useCallback(
    async (id) => {
      if (!id) return;

      setLevelsLoading(true);
      setError("");

      try {
        const payload = await apiFetch(
          `/api/technical/company/${encodeURIComponent(
            id
          )}/levels`
        );

        const root =
          payload?.data ?? payload;

        const parsed = Array.isArray(root)
          ? root
          : Array.isArray(root?.levels)
          ? root.levels
          : Array.isArray(root?.items)
          ? root.items
          : Array.isArray(root?.data)
          ? root.data
          : [];

        if (!parsed.length) {
          throw new Error(
            `No technical levels are available for ${
              getFallbackCompany(id).name
            }.`
          );
        }

        setLevels(parsed);

        /*
         * Company profile is metadata only. If this endpoint is
         * unavailable, keep the safe local company metadata.
         */
        try {
          const companyPayload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                id
              )}`
            );

          const normalized =
            normalizeCompany(
              companyPayload?.data ??
                companyPayload?.company ??
                companyPayload
            );

          if (normalized.id) {
            setSelectedCompany(
              normalized
            );
          }
        } catch (profileError) {
          console.warn(
            "[TECHNICAL COMPANY PROFILE] Using fallback metadata.",
            profileError
          );
        }
      } catch (error) {
        console.error(
          "[TECHNICAL LEVELS]",
          error
        );

        setLevels([]);

        setError(
          error.message ||
            "Unable to load technical levels."
        );
      } finally {
        setLevelsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (
      screen === "levels" &&
      companyId
    ) {
      setSelectedCompany(
        (current) =>
          current?.id === companyId
            ? current
            : getFallbackCompany(
                companyId
              )
      );

      loadLevels(companyId);
    }
  }, [
    screen,
    companyId,
    loadLevels,
  ]);

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const goCompanies = useCallback(() => {
    clearAttempt();
    clearResult();

    exitFullscreen();

    setSelectedCompany(null);
    setLevels([]);
    setQuestions([]);
    setAnswers({});
    setAttemptId(null);
    setResult(null);
    setError("");

    setScreen("companies");

    navigate(
      "/technical-lab",
      {
        replace: true,
      }
    );
  }, [navigate]);

  const goLevels = useCallback(
    (id) => {
      const normalized =
        normalizeId(id);

      if (!normalized) {
        goCompanies();
        return;
      }

      clearAttempt();
      clearResult();

      setSelectedCompany(
        getFallbackCompany(
          normalized
        )
      );

      setQuestions([]);
      setAnswers({});
      setResult(null);
      setError("");

      setScreen("levels");

      navigate(
        `/technical-lab/${encodeURIComponent(
          normalized
        )}/levels`,
        {
          replace: true,
        }
      );
    },
    [
      navigate,
      goCompanies,
    ]
  );

  const chooseCompany = useCallback(
    async (item) => {
      await exitFullscreen();

      const normalized =
        normalizeCompany(item);

      setSelectedCompany(
        normalized
      );

      setLevels([]);
      setQuestions([]);
      setAnswers({});
      setError("");

      setScreen("levels");

      navigate(
        `/technical-lab/${encodeURIComponent(
          normalized.id
        )}/levels?role=${encodeURIComponent(
          roleFromUrl
        )}`,
        {
          replace: true,
          state: {
            companyId:
              normalized.id,
            company:
              normalized,
            role: roleFromUrl,
          },
        }
      );
    },
    [navigate]
  );

  /* ==========================================================
     LOAD ALL QUESTIONS
  ========================================================== */

  const loadAllQuestions =
    useCallback(
      async (id, level) => {
        /*
         * Canonical backend endpoint.
         * Older deployments may expose /questions, so only a
         * 404 activates the compatibility fallback.
         */
        try {
          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                id
              )}/levels/${level}`
            );

          const normalized =
            normalizeQuestions(
              payload
            );

          if (!normalized.length) {
            throw new Error(
              "This technical level contains no usable questions."
            );
          }

          return normalized;
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }

          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                id
              )}/levels/${level}/questions`
            );

          const normalized =
            normalizeQuestions(
              payload
            );

          if (!normalized.length) {
            throw new Error(
              "This technical level contains no usable questions."
            );
          }

          return normalized;
        }
      },
      []
    );

  /* ==========================================================
     START LEVEL
  ========================================================== */

  const startLevel = useCallback(
    async (level) => {
      if (
        !selectedCompany ||
        loadingTest
      ) {
        return;
      }

      const number = safeNumber(
        firstValue(
          level?.level,
          level?.levelNumber
        )
      );

      if (!number) {
        setError(
          "This technical level has an invalid level number."
        );
        return;
      }

      setLoadingTest(true);
      setError("");

      /*
       * Fullscreen is requested before the first network await,
       * preserving the browser user-gesture requirement.
       */
      enterFullscreen();

      try {
        /*
         * BACKEND CONTRACT:
         * POST /api/technical/assessment/start
         * body: { companyId, levelNumber }
         */
        const startPayload =
          await apiFetch(
            "/api/technical/assessment/start",
            {
              method: "POST",
              body: JSON.stringify({
                companyId:
                  selectedCompany.id,
                levelNumber: number,
              }),
            }
          );

        const attempt =
          startPayload?.data ??
          startPayload;

        const id = firstValue(
          attempt?.attemptId,
          startPayload?.attemptId
        );

        if (!id) {
          throw new Error(
            "Server did not return an attempt ID."
          );
        }

        /*
         * Load questions only after the server attempt exists.
         */
        const normalized =
          await loadAllQuestions(
            selectedCompany.id,
            number
          );

        let durationMinutes =
          Math.max(
            1,
            safeNumber(
              firstValue(
                attempt?.level?.estimatedMinutes,
                attempt?.estimatedMinutes,
                level?.estimatedMinutes,
                60
              ),
              60
            )
          );

        /*
         * Read authoritative level metadata when available.
         * Failure here must not destroy an otherwise valid test.
         */
        try {
          const levelPayload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                selectedCompany.id
              )}/levels/${number}`
            );

          const levelRoot =
            levelPayload?.data ??
            levelPayload;

          durationMinutes =
            Math.max(
              1,
              safeNumber(
                firstValue(
                  levelRoot?.estimatedMinutes,
                  levelRoot?.level?.estimatedMinutes,
                  durationMinutes
                ),
                durationMinutes
              )
            );
        } catch {
          /* Keep the valid fallback duration. */
        }

        const allowedSeconds =
          Math.max(
            60,
            Math.round(
              durationMinutes * 60
            )
          );

        const now =
          new Date().toISOString();

        const session = {
          attemptId: id,
          companyId:
            selectedCompany.id,
          levelNumber: number,
          startedAt: now,
          timeAllowed:
            allowedSeconds,
          questions: normalized,
          answers: {},
          currentIndex: 0,
          violations: [],
        };

        saveAttempt(session);
        clearResult();

        setAttemptId(id);
        setQuestions(normalized);
        setAnswers({});
        answersRef.current = {};
        setCurrentIndex(0);

        setStartedAt(now);
        startedAtRef.current = now;

        setTimeAllowed(
          allowedSeconds
        );

        setRemainingSeconds(
          allowedSeconds
        );

        remainingRef.current =
          allowedSeconds;

        setViolations([]);
        violationsRef.current = [];

        setProctorWarning("");
        setProctorLocked(false);
        setShowSubmit(false);
        setResult(null);

        /*
         * Ignore the browser's own fullscreen transition for
         * 1.5 seconds so it cannot self-trigger a violation.
         */
        fullscreenGraceRef.current = true;

        setTimeout(() => {
          fullscreenGraceRef.current = false;
        }, 1500);

        setScreen("running");

        navigate(
          `/technical-lab/${encodeURIComponent(
            selectedCompany.id
          )}/level/${number}`,
          {
            replace: true,
            state: {
              companyId:
                selectedCompany.id,
              levelNumber: number,
              role: roleFromUrl,
              attemptId: id,
            },
          }
        );
      } catch (error) {
        console.error(
          "[TECHNICAL START]",
          error
        );

        await exitFullscreen();

        setError(
          error.message ||
            "Unable to start technical assessment."
        );
      } finally {
        setLoadingTest(false);
      }
    },
    [
      selectedCompany,
      loadingTest,
      loadAllQuestions,
      navigate,
      roleFromUrl,
    ]
  );

  /* ==========================================================
     RESTORE ACTIVE ATTEMPT
  ========================================================== */

  useEffect(() => {
    if (
      !hasLevelRoute ||
      isResultRoute
    ) {
      return;
    }

    if (questions.length) {
      return;
    }

    const saved =
      readAttempt();

    if (
      !saved ||
      String(saved.companyId) !==
        String(companyId) ||
      Number(saved.levelNumber) !==
        Number(levelNumber)
    ) {
      /*
        Direct navigation to a test URL without an active
        attempt should NEVER create a fake test.
      */
      setScreen("levels");

      navigate(
        `/technical-lab/${encodeURIComponent(
          companyId
        )}/levels`,
        {
          replace: true,
        }
      );

      return;
    }

    const started =
      new Date(
        saved.startedAt
      ).getTime();

    const elapsed = Math.floor(
      (Date.now() - started) /
        1000
    );

    const remaining = Math.max(
      0,
      safeNumber(
        saved.timeAllowed
      ) - elapsed
    );

    setSelectedCompany(
      getFallbackCompany(
        companyId
      )
    );

    setAttemptId(
      saved.attemptId
    );

    setQuestions(
      saved.questions || []
    );

    setAnswers(
      saved.answers || {}
    );

    answersRef.current =
      saved.answers || {};

    setCurrentIndex(
      Math.min(
        safeNumber(
          saved.currentIndex
        ),
        Math.max(
          0,
          (saved.questions || [])
            .length - 1
        )
      )
    );

    setStartedAt(
      saved.startedAt
    );

    startedAtRef.current =
      saved.startedAt;

    setTimeAllowed(
      safeNumber(
        saved.timeAllowed
      )
    );

    setRemainingSeconds(
      remaining
    );

    remainingRef.current =
      remaining;

    setViolations(
      saved.violations || []
    );

    violationsRef.current =
      saved.violations || [];

    setScreen("running");

    if (remaining <= 0) {
      setTimeout(() => {
        submitRef.current?.(
          true,
          "TIME_EXPIRED"
        );
      }, 0);
    }
  }, [
    hasLevelRoute,
    isResultRoute,
    questions.length,
    companyId,
    levelNumber,
    navigate,
  ]);

  /* ==========================================================
     PERSIST ACTIVE TEST
  ========================================================== */

  useEffect(() => {
    if (
      screen !== "running" ||
      !attemptId ||
      !questions.length
    ) {
      return;
    }

    const persist = () => {
      saveAttempt({
        attemptId,
        companyId: company?.id,
        levelNumber,
        startedAt,
        timeAllowed,
        questions,
        answers: answersRef.current,
        currentIndex,
        violations: violationsRef.current,
      });
    };

    persist();

    window.addEventListener(
      "beforeunload",
      persist
    );

    window.addEventListener(
      "pagehide",
      persist
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        persist
      );

      window.removeEventListener(
        "pagehide",
        persist
      );
    };
  }, [
    screen,
    attemptId,
    company?.id,
    levelNumber,
    startedAt,
    timeAllowed,
    questions,
    answers,
    currentIndex,
    violations,
  ]);

  /* ==========================================================
     PROCTORING
  ========================================================== */

  const addViolation =
    useCallback(
      (type, detail) => {
        if (
          screen !== "running" ||
          submittingRef.current ||
          violationLockRef.current
        ) {
          return;
        }

        violationLockRef.current =
          true;

        const item = {
          type,
          detail:
            detail ||
            "Proctoring event detected.",
          at:
            new Date().toISOString(),
        };

        setViolations(
          (previous) => [
            ...previous,
            item,
          ]
        );

        setProctorWarning(
          item.detail
        );

        setTimeout(() => {
          violationLockRef.current =
            false;
        }, 800);
      },
      [screen]
    );

  useEffect(() => {
    if (
      screen !== "running"
    ) {
      return;
    }

    const visibilityHandler =
      () => {
        if (
          document.hidden
        ) {
          addViolation(
            "TAB_SWITCH",
            "Tab or window change detected."
          );
        }
      };

    const fullscreenHandler =
      () => {
        if (
          fullscreenGraceRef.current
        ) {
          return;
        }

        if (
          !document.fullscreenElement &&
          !document.hidden
        ) {
          addViolation(
            "FULLSCREEN_EXIT",
            "Fullscreen mode was exited."
          );
        }
      };

    const blurHandler =
      () => {
        /*
         * Ignore transient browser/UI focus changes.
         */
        setTimeout(() => {
          if (
            document.hidden ||
            document.hasFocus()
          ) {
            return;
          }

          addViolation(
            "WINDOW_BLUR",
            "Assessment window lost focus."
          );
        }, 350);
      };

    const contextHandler =
      (event) => {
        event.preventDefault();

        addViolation(
          "CONTEXT_MENU",
          "Right-click is disabled during the assessment."
        );
      };

    const copyHandler =
      (event) => {
        event.preventDefault();

        addViolation(
          "COPY",
          "Copy is disabled during the assessment."
        );
      };

    const cutHandler =
      (event) => {
        event.preventDefault();

        addViolation(
          "CUT",
          "Cut is disabled during the assessment."
        );
      };

    const pasteHandler =
      (event) => {
        event.preventDefault();

        addViolation(
          "PASTE",
          "Paste is disabled during the assessment."
        );
      };

    const dragHandler =
      (event) => {
        event.preventDefault();
      };

    const selectHandler =
      (event) => {
        event.preventDefault();
      };

    const keyHandler =
      (event) => {
        const key =
          event.key.toUpperCase();

        const blocked =
          event.key === "F12" ||
          (
            event.ctrlKey &&
            event.shiftKey &&
            ["I", "J", "C"].includes(
              key
            )
          ) ||
          (
            event.ctrlKey &&
            ["U", "S", "P"].includes(
              key
            )
          );

        if (blocked) {
          event.preventDefault();

          addViolation(
            "SHORTCUT",
            "Restricted browser shortcut detected."
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      visibilityHandler
    );

    document.addEventListener(
      "fullscreenchange",
      fullscreenHandler
    );

    window.addEventListener(
      "blur",
      blurHandler
    );

    document.addEventListener(
      "contextmenu",
      contextHandler
    );

    document.addEventListener(
      "copy",
      copyHandler
    );

    document.addEventListener(
      "cut",
      cutHandler
    );

    document.addEventListener(
      "paste",
      pasteHandler
    );

    document.addEventListener(
      "dragstart",
      dragHandler
    );

    document.addEventListener(
      "selectstart",
      selectHandler
    );

    document.addEventListener(
      "keydown",
      keyHandler,
      true
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        visibilityHandler
      );

      document.removeEventListener(
        "fullscreenchange",
        fullscreenHandler
      );

      window.removeEventListener(
        "blur",
        blurHandler
      );

      document.removeEventListener(
        "contextmenu",
        contextHandler
      );

      document.removeEventListener(
        "copy",
        copyHandler
      );

      document.removeEventListener(
        "cut",
        cutHandler
      );

      document.removeEventListener(
        "paste",
        pasteHandler
      );

      document.removeEventListener(
        "dragstart",
        dragHandler
      );

      document.removeEventListener(
        "selectstart",
        selectHandler
      );

      document.removeEventListener(
        "keydown",
        keyHandler,
        true
      );
    };
  }, [
    screen,
    addViolation,
  ]);

  /* ----------------------------------------------------------
     LOCK AFTER MAX FLAGS
  ---------------------------------------------------------- */

  useEffect(() => {
    if (
      screen !== "running" ||
      violations.length <
        MAX_PROCTOR_FLAGS
    ) {
      return;
    }

    setProctorLocked(true);

    setProctorWarning(
      "Maximum proctoring violations reached. The attempt will be submitted."
    );

    const timer =
      setTimeout(() => {
        submitRef.current?.(
          true,
          "PROCTORING_VIOLATION_LIMIT"
        );
      }, 900);

    return () =>
      clearTimeout(timer);
  }, [
    screen,
    violations.length,
  ]);

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const submitAssessment =
    useCallback(
      async (
        automatic = false,
        reason = ""
      ) => {
        if (
          !attemptId ||
          submittingRef.current
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(true);

        clearInterval(
          timerRef.current
        );

        try {
          const completedAt =
            new Date().toISOString();

          const timeUsed =
            Math.max(
              0,
              timeAllowed -
                remainingRef.current
            );

          const payload =
            await apiFetch(
              "/api/technical/assessment/submit",
              {
                method: "POST",

                body: JSON.stringify({
                  attemptId,

                  companyId:
                    company?.id,

                  levelNumber,

                  answers:
                    answersRef.current,

                  startedAt:
                    startedAtRef.current,

                  completedAt,

                  timeAllowedSeconds:
                    timeAllowed,

                  timeUsedSeconds:
                    timeUsed,

                  automaticSubmission:
                    automatic,

                  autoSubmissionReason:
                    reason,

                  mode: "proctored",

                  proctoring: {
                    mode:
                      "browser_fullscreen",

                    violationCount:
                      violationsRef.current
                        .length,

                    violations:
                      violationsRef.current,

                    locked:
                      proctorLocked ||
                      violationsRef.current
                        .length >=
                        MAX_PROCTOR_FLAGS,
                  },
                }),
              }
            );

          const serverResult =
            payload?.data ??
            payload?.result ??
            payload;

          /*
            SERVER IS AUTHORITATIVE.
            We do not calculate the score locally.
          */
          saveResult(
            serverResult
          );

          clearAttempt();

          setResult(
            serverResult
          );

          setScreen("result");

          await exitFullscreen();

          navigate(
            `/technical-lab/${encodeURIComponent(
              company?.id
            )}/level/${levelNumber}/result`,
            {
              replace: true,
            }
          );
        } catch (error) {
          console.error(
            "[TECHNICAL SUBMIT]",
            error
          );

          setError(
            error.message ||
              "Unable to submit technical assessment."
          );

          submittingRef.current =
            false;

          setSubmitting(false);
        }
      },
      [
        attemptId,
        company?.id,
        levelNumber,
        timeAllowed,
        proctorLocked,
        navigate,
      ]
    );

  useEffect(() => {
    submitRef.current =
      submitAssessment;
  }, [
    submitAssessment,
  ]);

  /* ==========================================================
     TIMER
  ========================================================== */

  useEffect(() => {
    if (
      screen !== "running" ||
      !questions.length
    ) {
      clearInterval(
        timerRef.current
      );

      return;
    }

    clearInterval(
      timerRef.current
    );

    timerRef.current =
      setInterval(() => {
        setRemainingSeconds(
          (previous) => {
            const next =
              Math.max(
                0,
                previous - 1
              );

            remainingRef.current =
              next;

            if (next === 0) {
              clearInterval(
                timerRef.current
              );

              setTimeout(() => {
                submitRef.current?.(
                  true,
                  "TIME_EXPIRED"
                );
              }, 0);
            }

            return next;
          }
        );
      }, 1000);

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [
    screen,
    questions.length,
  ]);

  /* ==========================================================
     ANSWERS
  ========================================================== */

  const chooseAnswer =
    useCallback(
      (questionId, index) => {
        if (
          screen !== "running" ||
          proctorLocked
        ) {
          return;
        }

        setAnswers(
          (previous) => {
            const next = {
              ...previous,
              [questionId]: index,
            };

            answersRef.current =
              next;

            return next;
          }
        );
      },
      [
        screen,
        proctorLocked,
      ]
    );

  const currentQuestion =
    questions[
      currentIndex
    ];

  const currentAnswer =
    currentQuestion
      ? answers[
          currentQuestion.id
        ]
      : undefined;

  const answeredCount =
    questions.filter(
      (question) =>
        answers[
          question.id
        ] !== undefined
    ).length;

  const unansweredCount =
    Math.max(
      0,
      questions.length -
        answeredCount
    );

  const progress =
    questions.length
      ? Math.round(
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  const nextQuestion =
    useCallback(() => {
      setCurrentIndex(
        (index) =>
          Math.min(
            questions.length - 1,
            index + 1
          )
      );
    }, [
      questions.length,
    ]);

  const previousQuestion =
    useCallback(() => {
      setCurrentIndex(
        (index) =>
          Math.max(
            0,
            index - 1
          )
      );
    }, []);

  /* ==========================================================
     RESULT RESTORE
  ========================================================== */

  useEffect(() => {
    if (!isResultRoute) {
      return;
    }

    const saved =
      readResult();

    if (!saved) {
      if (companyId) {
        navigate(
          `/technical-lab/${encodeURIComponent(
            companyId
          )}/levels`,
          { replace: true }
        );
      } else {
        navigate(
          "/technical-lab",
          { replace: true }
        );
      }

      return;
    }

    setResult(saved);

    const resultCompanyId =
      normalizeId(
        firstValue(
          saved?.companyId,
          companyId
        )
      );

    const fallback =
      getFallbackCompany(
        resultCompanyId
      );

    const resultCompanyName =
      firstValue(
        saved?.companyName,
        saved?.company?.name
      );

    setSelectedCompany({
      ...fallback,
      ...(resultCompanyName
        ? {
            name: String(
              resultCompanyName
            ),
          }
        : {}),
    });

    setScreen("result");
  }, [
    isResultRoute,
    companyId,
    navigate,
  ]);

  /* ==========================================================
     RETAKE
  ========================================================== */

  const retake =
    useCallback(() => {
      const level =
        levels.find(
          (item) =>
            safeNumber(
              firstValue(
                item?.level,
                item?.levelNumber
              )
            ) ===
            levelNumber
        );

      if (level) {
        startLevel(level);
      } else {
        goLevels(
          company?.id
        );
      }
    }, [
      levels,
      levelNumber,
      startLevel,
      goLevels,
      company?.id,
    ]);

  /* ==========================================================
     COMPANIES SCREEN
  ========================================================== */

  if (screen === "companies") {
    return (
      <>
        <style>
          {TECHNICAL_CSS}
        </style>

        <div className="technical-page">
          <TechnicalHeader
            title="Technical Lab"
            subtitle="Company-specific engineering assessments"
            onBack={() =>
              navigate(
                "/dashboard"
              )
            }
          />

          <main className="technical-container">
            <section className="hero-block">
              <div>
                <span className="technical-eyebrow">
                  ENGINEERING /
                  TECHNICAL
                </span>

                <h1>
                  Train for the
                  companies you want.
                </h1>

                <p>
                  Choose a company,
                  select a technical
                  level and enter a
                  server-evaluated
                  proctored assessment.
                </p>
              </div>

              <div className="hero-stat">
                <strong>
                  {companies.length}
                </strong>

                <span>
                  COMPANIES
                </span>
              </div>
            </section>

            <section>
              <div className="section-heading">
                <div>
                  <span>
                    COMPANY TRAINING
                  </span>

                  <h2>
                    Select a company
                  </h2>
                </div>

                <span>
                  TECHNICAL ROUND
                </span>
              </div>

              {companiesLoading ? (
                <LoadingBlock text="Loading companies..." />
              ) : (
                <div className="company-grid">
                  {companies.map(
                    (item) => (
                      <CompanyCard
                        key={item.id}
                        company={item}
                        onClick={() =>
                          chooseCompany(
                            item
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </main>
        </div>
      </>
    );
  }

  /* ==========================================================
     LEVELS SCREEN
  ========================================================== */

  if (screen === "levels") {
    return (
      <>
        <style>
          {TECHNICAL_CSS}
        </style>

        <div className="technical-page">
          <TechnicalHeader
            title={
              company?.name ||
              "Technical Lab"
            }
            subtitle="Technical assessment levels"
            onBack={
              goCompanies
            }
          />

          <main className="technical-container">
            <section className="company-hero">
              <CompanyLogo
                company={company}
                large
              />

              <div className="company-hero-copy">
                <span>
                  {company?.category ||
                    "ENGINEERING"}
                </span>

                <h1>
                  {company?.name ||
                    "Company"}
                </h1>

                <p>
                  Technical
                  assessment
                  progression
                </p>
              </div>

              <div className="company-level-count">
                <strong>
                  {levels.length ||
                    "—"}
                </strong>

                <span>
                  LEVELS
                </span>
              </div>
            </section>

            {error && (
              <ErrorBanner
                message={error}
                onRetry={() =>
                  loadLevels(
                    company?.id
                  )
                }
              />
            )}

            {levelsLoading ? (
              <LoadingBlock text="Loading technical levels..." />
            ) : (
              <section className="levels-section">
                <div className="section-heading">
                  <div>
                    <span>
                      {(
                        company?.name ||
                        "COMPANY"
                      ).toUpperCase()}
                    </span>

                    <h2>
                      Technical levels
                    </h2>
                  </div>

                  <span>
                    {levels.length}{" "}
                    AVAILABLE
                  </span>
                </div>

                <div className="level-list">
                  {levels.map(
                    (
                      level,
                      index
                    ) => {
                      const number =
                        safeNumber(
                          firstValue(
                            level?.level,
                            level?.levelNumber
                          ),
                          index + 1
                        );

                      return (
                        <button
                          key={`${company?.id}-${number}`}
                          className="level-card"
                          onClick={() =>
                            startLevel(
                              level
                            )
                          }
                          disabled={
                            loadingTest
                          }
                        >
                          <div className="level-number">
                            {String(
                              number
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div className="level-main">
                            <span>
                              {firstValue(
                                level?.difficulty,
                                "Technical"
                              )}
                            </span>

                            <h3>
                              {firstValue(
                                level?.title,
                                level?.name,
                                `Technical Level ${number}`
                              )}
                            </h3>

                            <p>
                              {safeNumber(
                                level?.questionCount
                              )}{" "}
                              questions
                              {" · "}
                              {safeNumber(
                                level?.moduleCount,
                                Array.isArray(
                                  level?.modules
                                )
                                  ? level
                                      .modules
                                      .length
                                  : 0
                              )}{" "}
                              modules
                            </p>
                          </div>

                          <div className="level-meta">
                            <strong>
                              {safeNumber(
                                level?.questionCount
                              )}
                            </strong>

                            <span>
                              QUESTIONS
                            </span>
                          </div>

                          <div className="level-arrow">
                            →
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            )}
          </main>

          {loadingTest && (
            <FullscreenLoader text="Preparing your proctored technical assessment..." />
          )}
        </div>
      </>
    );
  }

  /* ==========================================================
     RESULT SCREEN
  ========================================================== */

  if (
    screen === "result"
  ) {
    const score = safeNumber(
      firstValue(
        result?.percentage,
        result?.score,
        result?.overallScore
      )
    );

    return (
      <>
        <style>
          {RESULT_CSS}
        </style>

        <div className="technical-result">
          <div className="result-wrap">
            <div className="result-company">
              <CompanyLogo
                company={company}
                large
              />

              <div>
                <span>
                  {company?.name}
                </span>

                <strong>
                  Technical Assessment
                </strong>
              </div>
            </div>

            <div className="result-heading">
              <span>
                LEVEL{" "}
                {levelNumber}{" "}
                COMPLETE
              </span>

              <h1>
                Technical
                performance.
              </h1>

              <p>
                Your attempt has
                been evaluated by
                the server and saved.
              </p>
            </div>

            <div className="result-score-card">
              <div
                className="score-ring"
                style={{
                  "--score": `${Math.min(
                    100,
                    Math.max(
                      0,
                      score
                    )
                  )}%`,
                }}
              >
                <div>
                  <strong>
                    {score}
                  </strong>

                  <span>
                    /100
                  </span>
                </div>
              </div>

              <div className="score-copy">
                <span>
                  OVERALL SCORE
                </span>

                <h2>
                  {getVerdict(
                    score
                  )}
                </h2>

                <p>
                  {safeNumber(
                    result?.correctAnswers
                  )}{" "}
                  correct out of{" "}
                  {safeNumber(
                    result?.totalQuestions
                  )}{" "}
                  questions.
                </p>
              </div>
            </div>

            <div className="result-metrics">
              <ResultMetric
                label="SCORE"
                value={`${score}%`}
              />

              <ResultMetric
                label="ACCURACY"
                value={`${safeNumber(
                  result?.accuracy,
                  score
                )}%`}
              />

              <ResultMetric
                label="CORRECT"
                value={safeNumber(
                  result?.correctAnswers
                )}
              />

              <ResultMetric
                label="ANSWERED"
                value={safeNumber(
                  result?.answeredQuestions
                )}
              />
            </div>

            <section className="module-analysis">
              <div className="result-section-heading">
                <span>
                  TECHNICAL ANALYSIS
                </span>

                <h2>
                  Module performance
                </h2>
              </div>

              {Array.isArray(
                result?.moduleBreakdown
              ) &&
              result
                .moduleBreakdown
                .length ? (
                <div className="module-list">
                  {result.moduleBreakdown.map(
                    (
                      item,
                      index
                    ) => {
                      const moduleScore =
                        safeNumber(
                          item?.score
                        );

                      return (
                        <div
                          className="module-row"
                          key={`${item?.moduleId || item?.module || "module"}-${index}`}
                        >
                          <div>
                            <strong>
                              {firstValue(
                                item?.module,
                                item?.moduleId,
                                "Technical"
                              )}
                            </strong>

                            <span>
                              {safeNumber(
                                item?.correct
                              )}{" "}
                              /{" "}
                              {safeNumber(
                                item?.total
                              )}{" "}
                              correct
                            </span>
                          </div>

                          <div className="module-progress">
                            <i
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    moduleScore
                                  )
                                )}%`,
                              }}
                            />
                          </div>

                          <strong>
                            {moduleScore}%
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="no-analysis">
                  Server module analysis
                  was not returned for
                  this attempt.
                </div>
              )}
            </section>

            {violations.length >
              0 && (
              <div className="result-note">
                <span>!</span>

                <p>
                  <strong>
                    Proctoring:
                  </strong>{" "}
                  {
                    violations.length
                  }{" "}
                  browser flag(s)
                  were recorded.
                </p>
              </div>
            )}

            {error && (
              <ErrorBanner
                message={error}
                onRetry={() =>
                  setError("")
                }
              />
            )}

            <div className="result-actions">
              <button
                className="result-secondary"
                onClick={retake}
              >
                RETAKE LEVEL
              </button>

              <button
                className="result-primary"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
                }
              >
                VIEW DASHBOARD →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ==========================================================
     TEST SCREEN
  ========================================================== */

  if (
    !currentQuestion
  ) {
    return (
      <>
        <style>
          {TECHNICAL_CSS}
        </style>

        <FullscreenLoader text="Loading technical assessment..." />
      </>
    );
  }

  return (
    <>
      <style>
        {TECHNICAL_TEST_CSS}
      </style>

      <div className="technical-test proctor-shell">
        <header className="testbar">
          <div className="testbar-brand">
            <CompanyLogo
              company={company}
            />

            <div>
              <strong>
                {company?.name}
              </strong>

              <span>
                Technical · Level{" "}
                {levelNumber}
              </span>
            </div>

            <span className="proctor-badge">
              <i className="proctor-dot" />
              PROCTORED
            </span>
          </div>

          <div className="testbar-center">
            <span>
              QUESTION{" "}
              {currentIndex + 1}{" "}
              / {questions.length}
            </span>

            <div className="top-progress">
              <i
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div
            className={
              remainingSeconds <= 60
                ? "test-timer danger"
                : "test-timer"
            }
          >
            <span>
              TIME LEFT
            </span>

            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>

            <small className="proctor-count">
              {violations.length}/
              {
                MAX_PROCTOR_FLAGS
              }{" "}
              FLAGS
            </small>
          </div>
        </header>

        <div className="test-body">
          <aside className="test-sidebar">
            <div className="sidebar-top">
              <span>
                QUESTIONS
              </span>

              <strong>
                {answeredCount}/
                {questions.length}
              </strong>
            </div>

            <div className="question-palette">
              {questions.map(
                (
                  question,
                  index
                ) => (
                  <button
                    key={
                      question.id
                    }
                    className={[
                      index ===
                      currentIndex
                        ? "active"
                        : "",
                      answers[
                        question.id
                      ] !== undefined
                        ? "answered"
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      setCurrentIndex(
                        index
                      )
                    }
                  >
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </button>
                )
              )}
            </div>

            <div className="sidebar-bottom">
              <span>
                PROGRESS
              </span>

              <strong>
                {progress}%
              </strong>

              <div>
                <i
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </aside>

          <main className="test-question-area">
            <div className="question-meta">
              <span>
                {currentQuestion.module}
              </span>

              <span>
                {currentQuestion.difficulty}
              </span>
            </div>

            <div className="question-container">
              <div className="question-index">
                {String(
                  currentIndex + 1
                ).padStart(
                  2,
                  "0"
                )}
              </div>

              <h1>
                {currentQuestion.question}
              </h1>

              {currentQuestion
                .images?.length >
                0 && (
                <div className="question-images">
                  {currentQuestion.images.map(
                    (
                      image,
                      index
                    ) => {
                      const source =
                        typeof image ===
                        "string"
                          ? image
                          : image?.source ||
                            image?.url;

                      if (!source) {
                        return null;
                      }

                      return (
                        <img
                          key={`${currentQuestion.id}-image-${index}`}
                          src={source}
                          alt={
                            typeof image ===
                            "object"
                              ? image?.alt ||
                                "Question illustration"
                              : "Question illustration"
                          }
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      );
                    }
                  )}
                </div>
              )}

              <div className="answer-options">
                {currentQuestion.options.map(
                  (
                    option,
                    index
                  ) => {
                    const selected =
                      currentAnswer ===
                      index;

                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        className={
                          selected
                            ? "selected"
                            : ""
                        }
                        disabled={
                          proctorLocked
                        }
                        onClick={() =>
                          chooseAnswer(
                            currentQuestion.id,
                            index
                          )
                        }
                      >
                        <span className="option-letter">
                          {String.fromCharCode(
                            65 + index
                          )}
                        </span>

                        <span className="option-text">
                          {option}
                        </span>

                        <span className="option-check">
                          {selected
                            ? "✓"
                            : ""}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="test-navigation">
              <button
                className="nav-secondary"
                disabled={
                  currentIndex ===
                    0 ||
                  proctorLocked
                }
                onClick={
                  previousQuestion
                }
              >
                ← PREVIOUS
              </button>

              <div className="nav-status">
                {currentAnswer !==
                undefined
                  ? "ANSWER SAVED"
                  : "SELECT AN ANSWER"}
              </div>

              {currentIndex <
              questions.length -
                1 ? (
                <button
                  className="nav-primary"
                  disabled={
                    proctorLocked
                  }
                  onClick={
                    nextQuestion
                  }
                >
                  NEXT →
                </button>
              ) : (
                <button
                  className="nav-submit"
                  disabled={
                    proctorLocked ||
                    submitting
                  }
                  onClick={() =>
                    setShowSubmit(
                      true
                    )
                  }
                >
                  FINISH TEST
                </button>
              )}
            </div>
          </main>
        </div>

        {proctorWarning &&
          !proctorLocked && (
            <div className="proctor-warning">
              <strong>
                PROCTORING FLAG
              </strong>

              <span>
                {proctorWarning}
              </span>
            </div>
          )}

        {proctorLocked && (
          <div className="modal-backdrop">
            <div className="submit-modal">
              <div className="modal-symbol">
                !
              </div>

              <span>
                PROCTORING LOCK
              </span>

              <h2>
                Assessment locked.
              </h2>

              <p>
                The browser detected
                repeated restricted
                activity. Your attempt
                is being submitted with
                the proctoring audit.
              </p>
            </div>
          </div>
        )}

        {showSubmit && (
          <SubmitModal
            answered={
              answeredCount
            }
            unanswered={
              unansweredCount
            }
            time={
              remainingSeconds
            }
            submitting={
              submitting
            }
            onCancel={() =>
              setShowSubmit(
                false
              )
            }
            onSubmit={() => {
              setShowSubmit(
                false
              );

              submitAssessment(
                false,
                "USER_SUBMITTED"
              );
            }}
          />
        )}
      </div>
    </>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function CompanyCard({
  company,
  onClick,
}) {
  return (
    <button
      className="company-card"
      onClick={onClick}
    >
      <CompanyLogo
        company={company}
      />

      <div className="company-card-info">
        <span>
          {company.category}
        </span>

        <h3>
          {company.name}
        </h3>

        <p>
          Technical training
        </p>
      </div>

      <span className="company-card-arrow">
        →
      </span>
    </button>
  );
}

function CompanyLogo({
  company,
  large = false,
}) {
  const [failed, setFailed] =
    useState(false);

  const domain =
    company?.domain ||
    getFallbackCompany(
      company?.id
    ).domain;

  const favicon =
    getFavicon(domain);

  return (
    <div
      className={
        large
          ? "company-logo large"
          : "company-logo"
      }
    >
      {!failed && favicon ? (
        <img
          src={favicon}
          alt={
            company?.name ||
            "Company"
          }
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <span>
          {String(
            company?.name ||
              "E"
          )
            .trim()
            .charAt(0)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function TechnicalHeader({
  title,
  subtitle,
  onBack,
}) {
  return (
    <header className="technical-header">
      <button
        className="header-back"
        onClick={onBack}
        aria-label="Back"
      >
        ←
      </button>

      <div className="header-brand">
        <div className="engviva-mark">
          E
        </div>

        <div>
          <strong>
            ENGVIVA
          </strong>

          <span>
            TECHNICAL LAB
          </span>
        </div>
      </div>

      <div className="header-title">
        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>
      </div>
    </header>
  );
}

function LoadingBlock({
  text,
}) {
  return (
    <div className="loading-block">
      <div className="spinner" />
      <span>
        {text}
      </span>
    </div>
  );
}

function FullscreenLoader({
  text,
}) {
  return (
    <div className="fullscreen-loader">
      <div>
        <div className="spinner" />

        <strong>
          {text}
        </strong>

        <span>
          Loading securely...
        </span>
      </div>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}) {
  return (
    <div className="error-banner">
      <div>
        <strong>
          Unable to continue
        </strong>

        <span>
          {message}
        </span>
      </div>

      <button
        onClick={onRetry}
      >
        RETRY
      </button>
    </div>
  );
}

function SubmitModal({
  answered,
  unanswered,
  time,
  submitting,
  onCancel,
  onSubmit,
}) {
  return (
    <div className="modal-backdrop">
      <div className="submit-modal">
        <div className="modal-symbol">
          ✓
        </div>

        <span>
          FINAL SUBMISSION
        </span>

        <h2>
          Finish technical
          test?
        </h2>

        <p>
          Your answers will be
          sent to the server for
          secure evaluation.
        </p>

        <div className="modal-stats">
          <div>
            <strong>
              {answered}
            </strong>

            <span>
              ANSWERED
            </span>
          </div>

          <div>
            <strong>
              {unanswered}
            </strong>

            <span>
              UNANSWERED
            </span>
          </div>

          <div>
            <strong>
              {formatTime(time)}
            </strong>

            <span>
              TIME LEFT
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="modal-cancel"
            disabled={submitting}
            onClick={
              onCancel
            }
          >
            CONTINUE TEST
          </button>

          <button
            className="modal-confirm"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT TEST →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultMetric({
  label,
  value,
}) {
  return (
    <div className="result-metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function getVerdict(score) {
  if (score >= 90)
    return "Exceptional technical performance";

  if (score >= 80)
    return "Excellent technical performance";

  if (score >= 70)
    return "Strong technical performance";

  if (score >= 50)
    return "Developing technical performance";

  return "Keep building your technical depth";
}

/* ============================================================
   MAIN CSS
============================================================ */

const TECHNICAL_CSS = `
* {
  box-sizing: border-box;
}

button {
  font: inherit;
}

.technical-page {
  min-height: 100vh;
  color: #f7f4fb;
  background:
    radial-gradient(circle at 80% 0%, rgba(159,110,255,.12), transparent 32%),
    #07060b;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.technical-header {
  height: 76px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  background: rgba(7,6,11,.9);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-back {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid rgba(255,255,255,.08);
  color: #aaa3b0;
  background: rgba(255,255,255,.03);
  cursor: pointer;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.engviva-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg,#dbc8ff,#9e72df);
  color: #160d20;
  font-weight: 950;
}

.header-brand strong,
.header-brand span,
.header-title strong,
.header-title span {
  display: block;
}

.header-brand strong {
  font-size: 12px;
  letter-spacing: 1px;
}

.header-brand span {
  color: #6d6675;
  font-size: 7px;
  letter-spacing: 1.4px;
}

.header-title {
  margin-left: 20px;
  padding-left: 20px;
  border-left: 1px solid rgba(255,255,255,.07);
}

.header-title strong {
  font-size: 12px;
}

.header-title span {
  margin-top: 3px;
  color: #716a78;
  font-size: 9px;
}

.technical-container {
  width: min(1250px,calc(100% - 48px));
  margin: auto;
  padding: 58px 0 90px;
}

.hero-block {
  min-height: 300px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  padding-bottom: 50px;
}

.technical-eyebrow,
.section-heading > div > span,
.section-heading > span {
  color: #9d81c8;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.8px;
}

.hero-block h1 {
  max-width: 750px;
  margin: 12px 0;
  font-size: clamp(44px,6vw,78px);
  line-height: .98;
  letter-spacing: -4px;
}

.hero-block p {
  max-width: 650px;
  color: #827b89;
  font-size: 14px;
  line-height: 1.8;
}

.hero-stat {
  min-width: 150px;
  padding: 24px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.025);
}

.hero-stat strong,
.hero-stat span {
  display: block;
}

.hero-stat strong {
  font-size: 50px;
}

.hero-stat span {
  color: #6f6876;
  font-size: 8px;
  letter-spacing: 1.5px;
  font-weight: 950;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-heading h2 {
  margin: 7px 0 0;
  font-size: 25px;
}

.company-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 12px;
}

.company-card {
  min-height: 170px;
  position: relative;
  padding: 21px;
  text-align: left;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 21px;
  background: linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018));
  color: #f7f4fb;
  cursor: pointer;
  transition: .18s ease;
}

.company-card:hover {
  transform: translateY(-3px);
  border-color: rgba(201,167,255,.25);
}

.company-card-info {
  margin-top: 19px;
}

.company-card-info span {
  color: #726b7a;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
}

.company-card-info h3 {
  margin: 6px 0 4px;
  font-size: 17px;
}

.company-card-info p {
  margin: 0;
  color: #68616f;
  font-size: 9px;
}

.company-card-arrow {
  position: absolute;
  right: 18px;
  bottom: 18px;
  color: #9d7dca;
  font-size: 18px;
}

.company-logo {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(255,255,255,.12);
  flex-shrink: 0;
}

.company-logo.large {
  width: 92px;
  height: 92px;
  border-radius: 25px;
}

.company-logo img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.company-logo span {
  color: #151017;
  font-size: 24px;
  font-weight: 950;
}

.company-logo.large span {
  font-size: 42px;
}

.company-hero {
  min-height: 230px;
  display: flex;
  align-items: center;
  gap: 25px;
  padding-bottom: 38px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.company-hero-copy {
  flex: 1;
}

.company-hero-copy > span {
  color: #817889;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.company-hero-copy h1 {
  margin: 8px 0;
  font-size: clamp(40px,5vw,65px);
  letter-spacing: -3px;
}

.company-hero-copy p {
  margin: 0;
  color: #756e7c;
}

.company-level-count {
  min-width: 130px;
  text-align: right;
}

.company-level-count strong,
.company-level-count span {
  display: block;
}

.company-level-count strong {
  font-size: 48px;
}

.company-level-count span {
  color: #6d6675;
  font-size: 8px;
  letter-spacing: 1px;
  font-weight: 950;
}

.levels-section {
  padding-top: 38px;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.level-card {
  width: 100%;
  min-height: 90px;
  display: grid;
  grid-template-columns: 70px 1fr 100px 35px;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  border: 1px solid rgba(255,255,255,.065);
  border-radius: 17px;
  color: #f6f2fa;
  background: rgba(255,255,255,.025);
  text-align: left;
  cursor: pointer;
  transition: .18s ease;
}

.level-card:hover {
  transform: translateX(3px);
  border-color: rgba(201,167,255,.22);
  background: rgba(201,167,255,.045);
}

.level-card:disabled {
  opacity: .6;
  cursor: wait;
}

.level-number {
  color: #a889cf;
  font-size: 22px;
  font-weight: 950;
}

.level-main span {
  color: #7c7485;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.level-main h3 {
  margin: 4px 0;
  font-size: 15px;
}

.level-main p {
  margin: 0;
  color: #68616e;
  font-size: 9px;
}

.level-meta {
  text-align: right;
}

.level-meta strong,
.level-meta span {
  display: block;
}

.level-meta strong {
  font-size: 18px;
}

.level-meta span {
  color: #66606d;
  font-size: 7px;
  letter-spacing: 1px;
  margin-top: 2px;
}

.level-arrow {
  color: #9071b8;
  font-size: 19px;
}

.loading-block {
  min-height: 300px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: #77707e;
  font-size: 11px;
}

.spinner {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,.08);
  border-top-color: #c9a7ff;
  animation: technical-spin .8s linear infinite;
}

@keyframes technical-spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 18px;
  margin-top: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,90,110,.15);
  background: rgba(255,70,90,.045);
}

.error-banner strong,
.error-banner span {
  display: block;
}

.error-banner strong {
  color: #ffabb5;
  font-size: 11px;
}

.error-banner span {
  margin-top: 4px;
  color: #887b84;
  font-size: 9px;
}

.error-banner button {
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.08);
  color: #bcaec0;
  background: rgba(255,255,255,.04);
  cursor: pointer;
}

.fullscreen-loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgba(5,4,8,.84);
  backdrop-filter: blur(15px);
}

.fullscreen-loader > div {
  display: grid;
  place-items: center;
  gap: 12px;
}

.fullscreen-loader strong {
  font-size: 13px;
}

.fullscreen-loader span {
  color: #706978;
  font-size: 9px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0,0,0,.78);
  backdrop-filter: blur(15px);
}

.submit-modal {
  width: min(510px,100%);
  padding: 31px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,.1);
  background: #121017;
  box-shadow: 0 40px 100px rgba(0,0,0,.55);
}

.modal-symbol {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 14px;
  color: #c9a7ff;
  background: rgba(201,167,255,.09);
}

.submit-modal > span {
  color: #9072b4;
  font-size: 8px;
  letter-spacing: 1.5px;
  font-weight: 950;
}

.submit-modal h2 {
  margin: 9px 0;
  font-size: 27px;
}

.submit-modal p {
  color: #817a88;
  font-size: 12px;
  line-height: 1.7;
}

.modal-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  margin: 20px 0;
}

.modal-stats > div {
  padding: 15px;
  text-align: center;
  border-radius: 12px;
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.05);
}

.modal-stats strong,
.modal-stats span {
  display: block;
}

.modal-stats strong {
  font-size: 20px;
}

.modal-stats span {
  margin-top: 4px;
  color: #6e6775;
  font-size: 7px;
  letter-spacing: 1px;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.modal-cancel,
.modal-confirm {
  min-height: 48px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .8px;
}

.modal-cancel {
  color: #a49ba9;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.035);
}

.modal-confirm {
  border: 0;
  color: #170d20;
  background: linear-gradient(135deg,#dccaff,#a97de8);
}

@media (max-width:1050px) {
  .company-grid {
    grid-template-columns: repeat(3,1fr);
  }
}

@media (max-width:800px) {
  .technical-container {
    width: calc(100% - 28px);
    padding-top: 35px;
  }

  .company-grid {
    grid-template-columns: repeat(2,1fr);
  }

  .hero-block {
    align-items: flex-start;
    flex-direction: column;
  }

  .level-card {
    grid-template-columns: 50px 1fr 30px;
  }

  .level-meta,
  .company-level-count {
    display: none;
  }
}

@media (max-width:600px) {
  .technical-header {
    padding: 0 14px;
  }

  .header-title {
    display: none;
  }

  .company-grid {
    grid-template-columns: 1fr;
  }

  .hero-block h1 {
    font-size: 44px;
    letter-spacing: -2px;
  }

  .company-hero-copy h1 {
    font-size: 42px;
  }

  .company-logo.large {
    width: 72px;
    height: 72px;
  }

  .modal-stats,
  .modal-actions {
    grid-template-columns: 1fr;
  }
}
`;

/* ============================================================
   TEST CSS
============================================================ */

const TECHNICAL_TEST_CSS = `
* {
  box-sizing: border-box;
}

.technical-test {
  min-height: 100vh;
  color: #f7f4fb;
  background: #07060b;
  font-family: Inter,ui-sans-serif,system-ui,sans-serif;
}

.testbar {
  height: 76px;
  display: grid;
  grid-template-columns: 290px 1fr 150px;
  align-items: center;
  gap: 25px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  background: rgba(7,6,11,.97);
  position: sticky;
  top: 0;
  z-index: 20;
}

.testbar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.testbar-brand .company-logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
}

.testbar-brand strong,
.testbar-brand span {
  display: block;
}

.testbar-brand strong {
  font-size: 12px;
}

.testbar-brand span {
  margin-top: 3px;
  color: #6f6877;
  font-size: 8px;
  letter-spacing: .8px;
}

.testbar-center {
  max-width: 500px;
  width: 100%;
  justify-self: center;
}

.testbar-center > span {
  display: block;
  margin-bottom: 7px;
  text-align: center;
  color: #827989;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.3px;
}

.top-progress {
  height: 4px;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255,255,255,.06);
}

.top-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg,#a97ce7,#dccaff);
}

.test-timer {
  padding: 10px 13px;
  border-radius: 12px;
  border: 1px solid rgba(201,167,255,.14);
  background: rgba(201,167,255,.055);
  text-align: center;
}

.test-timer span,
.test-timer strong {
  display: block;
}

.test-timer span {
  color: #6f6877;
  font-size: 7px;
  letter-spacing: 1px;
}

.test-timer strong {
  margin-top: 3px;
  color: #d3bdf1;
  font-size: 18px;
}

.test-timer.danger {
  border-color: rgba(255,80,100,.25);
  background: rgba(255,80,100,.07);
}

.test-timer.danger strong {
  color: #ff8999;
}

.test-body {
  min-height: calc(100vh - 76px);
  display: grid;
  grid-template-columns: 230px 1fr;
}

.test-sidebar {
  padding: 22px;
  border-right: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.012);
  display: flex;
  flex-direction: column;
}

.sidebar-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.sidebar-top span {
  color: #746d7b;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.3px;
}

.sidebar-top strong {
  color: #b99bdb;
  font-size: 10px;
}

.question-palette {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 7px;
}

.question-palette button {
  aspect-ratio: 1;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.065);
  background: rgba(255,255,255,.025);
  color: #706a78;
  cursor: pointer;
  font-size: 8px;
  font-weight: 950;
}

.question-palette button.active {
  color: #eadfff;
  background: rgba(201,167,255,.14);
  border-color: rgba(201,167,255,.4);
}

.question-palette button.answered {
  color: #91dba8;
  background: rgba(100,220,140,.06);
  border-color: rgba(100,220,140,.16);
}

.question-palette button.active.answered {
  color: #eadfff;
  background: rgba(201,167,255,.14);
}

.sidebar-bottom {
  margin-top: auto;
  padding: 15px;
  border-radius: 14px;
  background: rgba(201,167,255,.035);
  border: 1px solid rgba(201,167,255,.07);
}

.sidebar-bottom span,
.sidebar-bottom strong {
  display: block;
}

.sidebar-bottom span {
  color: #6f6876;
  font-size: 7px;
  letter-spacing: 1px;
}

.sidebar-bottom strong {
  margin: 7px 0;
  font-size: 24px;
}

.sidebar-bottom > div {
  height: 5px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255,255,255,.06);
}

.sidebar-bottom i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg,#a97ce7,#dccaff);
}

.test-question-area {
  width: min(1000px,calc(100% - 60px));
  margin: auto;
  padding: 38px 0 30px;
  display: flex;
  flex-direction: column;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 13px;
}

.question-meta span {
  padding: 6px 9px;
  border-radius: 7px;
  color: #8c79a4;
  background: rgba(201,167,255,.055);
  font-size: 8px;
  font-weight: 950;
}

.question-container {
  flex: 1;
  padding: clamp(25px,4vw,52px);
  border-radius: 25px;
  border: 1px solid rgba(255,255,255,.075);
  background: linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.017));
}

.question-index {
  color: #9d7cc3;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 2px;
  margin-bottom: 18px;
}

.question-container h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(23px,3vw,35px);
  line-height: 1.42;
}

.question-images {
  margin: 25px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.question-images img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
}

.answer-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 32px;
}

.answer-options button {
  min-height: 66px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.07);
  color: #bbb4c1;
  background: rgba(255,255,255,.025);
  text-align: left;
  cursor: pointer;
}

.answer-options button.selected {
  color: #fff;
  border-color: rgba(201,167,255,.42);
  background: rgba(201,167,255,.085);
}

.option-letter {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255,255,255,.045);
  color: #817989;
  font-weight: 950;
}

.selected .option-letter {
  color: #ddcaff;
  background: rgba(201,167,255,.15);
}

.option-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
}

.option-check {
  width: 25px;
  color: #c9a7ff;
  font-size: 18px;
  font-weight: 950;
  text-align: center;
}

.test-navigation {
  min-height: 55px;
  display: grid;
  grid-template-columns: 150px 1fr 150px;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.nav-secondary,
.nav-primary,
.nav-submit {
  min-height: 46px;
  border-radius: 11px;
  cursor: pointer;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.nav-secondary {
  color: #a59da9;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.03);
}

.nav-primary {
  border: 0;
  color: #170d20;
  background: linear-gradient(135deg,#dccaff,#a97de8);
}

.nav-submit {
  border: 0;
  color: #07170d;
  background: linear-gradient(135deg,#9fe8b6,#66cc89);
}

.nav-status {
  text-align: center;
  color: #68616f;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.proctor-badge {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  margin-left: 10px;
  padding: 5px 8px;
  border-radius: 7px;
  color: #9fe8b6 !important;
  background: rgba(100,220,140,.055);
  border: 1px solid rgba(100,220,140,.12);
  font-size: 7px !important;
  font-weight: 950;
}

.proctor-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ee59b;
}

.proctor-count {
  color: #ff9aa7 !important;
  font-size: 8px !important;
}

.proctor-warning {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 80;
  max-width: 360px;
  padding: 13px 15px;
  border: 1px solid rgba(255,90,110,.22);
  border-radius: 13px;
  background: rgba(35,10,15,.94);
}

.proctor-warning strong,
.proctor-warning span {
  display: block;
}

.proctor-warning strong {
  color: #ff9aa7;
  font-size: 10px;
}

.proctor-warning span {
  margin-top: 4px;
  color: #a78d94;
  font-size: 9px;
}

@media (max-width:850px) {
  .testbar {
    grid-template-columns: 1fr auto;
  }

  .testbar-center {
    display: none;
  }

  .test-body {
    grid-template-columns: 1fr;
  }

  .test-sidebar {
    display: none;
  }

  .test-question-area {
    width: calc(100% - 28px);
    padding-top: 22px;
  }
}

@media (max-width:550px) {
  .testbar {
    height: 65px;
    padding: 0 12px;
  }

  .test-body {
    min-height: calc(100vh - 65px);
  }

  .test-question-area {
    width: calc(100% - 20px);
  }

  .question-container {
    padding: 20px;
    border-radius: 19px;
  }

  .question-container h1 {
    font-size: 21px;
  }

  .test-navigation {
    grid-template-columns: 1fr 1fr;
  }

  .nav-status {
    grid-column: 1 / -1;
    grid-row: 1;
  }
}
`;

/* ============================================================
   RESULT CSS
============================================================ */

const RESULT_CSS = `
* {
  box-sizing: border-box;
}

.technical-result {
  min-height: 100vh;
  padding: 45px 20px 80px;
  color: #f7f4fb;
  background:
    radial-gradient(circle at 80% 0%,rgba(159,110,255,.13),transparent 34%),
    #07060b;
  font-family: Inter,ui-sans-serif,system-ui,sans-serif;
}

.result-wrap {
  width: min(1050px,100%);
  margin: auto;
}

.result-company {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 45px;
}

.result-company span,
.result-company strong {
  display: block;
}

.result-company span {
  color: #746d7c;
  font-size: 8px;
  letter-spacing: 1px;
  font-weight: 950;
}

.result-company strong {
  margin-top: 4px;
  font-size: 15px;
}

.result-heading > span {
  color: #9b7dc2;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.8px;
}

.result-heading h1 {
  margin: 9px 0 7px;
  font-size: clamp(42px,6vw,70px);
  line-height: 1;
  letter-spacing: -3px;
}

.result-heading p {
  color: #817a88;
  font-size: 13px;
}

.result-score-card {
  min-height: 280px;
  display: flex;
  align-items: center;
  gap: 50px;
  margin-top: 30px;
  padding: 35px;
  border-radius: 27px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.018));
}

.score-ring {
  width: 190px;
  height: 190px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle,#100d15 61%,transparent 62%),
    conic-gradient(#c9a7ff var(--score),rgba(255,255,255,.06) 0);
}

.score-ring > div {
  display: flex;
  align-items: baseline;
}

.score-ring strong {
  font-size: 55px;
  letter-spacing: -3px;
}

.score-ring span {
  color: #6e6876;
  font-size: 11px;
}

.score-copy > span {
  color: #817989;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.5px;
}

.score-copy h2 {
  margin: 9px 0;
  font-size: 29px;
}

.score-copy p {
  color: #827b89;
  font-size: 13px;
  line-height: 1.7;
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 9px;
  margin: 12px 0;
}

.result-metric {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.025);
}

.result-metric span,
.result-metric strong {
  display: block;
}

.result-metric span {
  color: #6f6876;
  font-size: 7px;
  font-weight: 950;
  letter-spacing: 1.2px;
}

.result-metric strong {
  margin-top: 7px;
  font-size: 24px;
}

.module-analysis {
  margin-top: 12px;
  padding: 27px;
  border-radius: 23px;
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.025);
}

.result-section-heading span {
  color: #827989;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.5px;
}

.result-section-heading h2 {
  margin: 7px 0 22px;
  font-size: 21px;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.module-row {
  display: grid;
  grid-template-columns: 180px 1fr 55px;
  align-items: center;
  gap: 15px;
}

.module-row > div:first-child strong,
.module-row > div:first-child span {
  display: block;
}

.module-row > div:first-child strong {
  font-size: 12px;
}

.module-row > div:first-child span {
  margin-top: 3px;
  color: #6c6573;
  font-size: 8px;
}

.module-progress {
  height: 7px;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255,255,255,.06);
}

.module-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg,#a97ce7,#dccaff);
}

.module-row > strong {
  text-align: right;
  color: #c9a7ff;
  font-size: 11px;
}

.no-analysis {
  padding: 25px;
  border-radius: 12px;
  color: #6e6875;
  background: rgba(255,255,255,.025);
  font-size: 10px;
}

.result-note {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 15px;
  border-radius: 14px;
  border: 1px solid rgba(201,167,255,.08);
  background: rgba(201,167,255,.025);
}

.result-note > span {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #c9a7ff;
  background: rgba(201,167,255,.08);
}

.result-note p {
  margin: 0;
  color: #726b79;
  font-size: 9px;
}

.result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 12px;
}

.result-secondary,
.result-primary {
  min-height: 52px;
  border-radius: 13px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1px;
}

.result-secondary {
  color: #afa7b3;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.035);
}

.result-primary {
  border: 0;
  color: #170d20;
  background: linear-gradient(135deg,#dccaff,#a97de8);
}

@media (max-width:700px) {
  .result-score-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 25px;
  }

  .result-metrics {
    grid-template-columns: repeat(2,1fr);
  }

  .module-row {
    grid-template-columns: 1fr 50px;
  }

  .module-progress {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .result-actions {
    grid-template-columns: 1fr;
  }
}
`;