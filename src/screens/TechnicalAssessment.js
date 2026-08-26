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

/*
|--------------------------------------------------------------------------
| ENGVIVA TECHNICAL ASSESSMENT
|--------------------------------------------------------------------------
|
| Canonical flow:
|
| /technical-lab
|        ↓
| company list
|        ↓
| /technical-lab/:companyId/levels
|        ↓
| /technical-lab/:companyId/level/:levelNumber
|        ↓
| proctored test
|        ↓
| /technical-lab/:companyId/level/:levelNumber/result
|
| IMPORTANT:
| - Questions come from backend.
| - Correct answers NEVER come from frontend.
| - Score NEVER calculated by frontend.
| - Backend calculates final score.
| - Firebase token is sent to protected assessment routes.
|--------------------------------------------------------------------------
*/

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com"
).replace(/\/+$/, "");

const MAX_PROCTOR_FLAGS = 3;

const ATTEMPT_STORAGE_KEY =
  "engviva_technical_active_attempt";

const RESULT_STORAGE_KEY =
  "engviva_technical_result";

/* =========================================================================
   BASIC HELPERS
========================================================================= */

function safeString(value, fallback = "") {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
}

function normalizeId(value) {
  return safeString(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(
      max,
      safeNumber(value)
    )
  );
}

/* =========================================================================
   COMPANY DATA
========================================================================= */

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
    id: "meta",
    name: "Meta",
    category: "Technology",
    domain: "meta.com",
  },
  {
    id: "apple",
    name: "Apple",
    category: "Technology",
    domain: "apple.com",
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
];

function getCompanyFromList(
  companies,
  id
) {
  const normalized =
    normalizeId(id);

  return (
    companies.find(
      (company) =>
        normalizeId(
          company?.id
        ) === normalized
    ) ||
    FALLBACK_COMPANIES.find(
      (company) =>
        normalizeId(
          company?.id
        ) === normalized
    ) ||
    null
  );
}

/* =========================================================================
   STORAGE
========================================================================= */

function saveAttempt(data) {
  try {
    sessionStorage.setItem(
      ATTEMPT_STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch {}
}

function readAttempt() {
  try {
    const value =
      sessionStorage.getItem(
        ATTEMPT_STORAGE_KEY
      );

    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function clearAttempt() {
  try {
    sessionStorage.removeItem(
      ATTEMPT_STORAGE_KEY
    );
  } catch {}
}

function saveResult(result) {
  try {
    sessionStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify(result)
    );
  } catch {}
}

function readResult() {
  try {
    const value =
      sessionStorage.getItem(
        RESULT_STORAGE_KEY
      );

    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function clearResult() {
  try {
    sessionStorage.removeItem(
      RESULT_STORAGE_KEY
    );
  } catch {}
}

/* =========================================================================
   FIREBASE AUTH
========================================================================= */

async function getFirebaseToken() {
  try {
    const firebase =
      await import("../firebase");

    const auth =
      firebase.auth ||
      firebase.default?.auth ||
      null;

    if (!auth?.currentUser) {
      return null;
    }

    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error(
      "[ENGVIVA TECHNICAL AUTH]",
      error
    );

    return null;
  }
}

/* =========================================================================
   API
========================================================================= */

async function apiFetch(
  endpoint,
  options = {}
) {
  const token =
    await getFirebaseToken();

  const headers = {
    Accept:
      "application/json",

    ...(options.body
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),

    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const message =
      firstValue(
        payload?.error?.message,
        typeof payload?.error ===
          "string"
          ? payload.error
          : "",
        payload?.message,
        `Request failed (${response.status}).`
      );

    const error =
      new Error(message);

    error.status =
      response.status;

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

/* =========================================================================
   MARKDOWN RENDERING
========================================================================= */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInlineMarkdown(text) {
  let value =
    escapeHtml(text);

  value =
    value.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  value =
    value.replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    );

  value =
    value.replace(
      /\*([^*]+)\*/g,
      "<em>$1</em>"
    );

  value =
    value.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

  return value;
}

function MarkdownText({
  children,
  className = "",
}) {
  const source =
    safeString(children);

  if (!source) {
    return null;
  }

  const lines =
    source.replace(
      /\r\n/g,
      "\n"
    ).split("\n");

  const output = [];

  let listItems = [];

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    output.push(
      <ul
        key={`list-${output.length}`}
      >
        {listItems.map(
          (item, index) => (
            <li
              key={index}
              dangerouslySetInnerHTML={{
                __html:
                  renderInlineMarkdown(
                    item
                  ),
              }}
            />
          )
        )}
      </ul>
    );

    listItems = [];
  };

  lines.forEach(
    (rawLine, index) => {
      const line =
        rawLine.trim();

      if (!line) {
        flushList();

        output.push(
          <div
            key={`space-${index}`}
            className="md-space"
          />
        );

        return;
      }

      if (
        /^[-*]\s+/.test(line)
      ) {
        listItems.push(
          line.replace(
            /^[-*]\s+/,
            ""
          )
        );

        return;
      }

      if (
        /^\d+\.\s+/.test(line)
      ) {
        listItems.push(
          line.replace(
            /^\d+\.\s+/,
            ""
          )
        );

        return;
      }

      flushList();

      if (
        /^###\s+/.test(line)
      ) {
        output.push(
          <h4
            key={index}
            dangerouslySetInnerHTML={{
              __html:
                renderInlineMarkdown(
                  line.replace(
                    /^###\s+/,
                    ""
                  )
                ),
            }}
          />
        );

        return;
      }

      if (
        /^##\s+/.test(line)
      ) {
        output.push(
          <h3
            key={index}
            dangerouslySetInnerHTML={{
              __html:
                renderInlineMarkdown(
                  line.replace(
                    /^##\s+/,
                    ""
                  )
                ),
            }}
          />
        );

        return;
      }

      if (
        /^#\s+/.test(line)
      ) {
        output.push(
          <h2
            key={index}
            dangerouslySetInnerHTML={{
              __html:
                renderInlineMarkdown(
                  line.replace(
                    /^#\s+/,
                    ""
                  )
                ),
            }}
          />
        );

        return;
      }

      if (
        /^>\s+/.test(line)
      ) {
        output.push(
          <blockquote
            key={index}
          >
            <span
              dangerouslySetInnerHTML={{
                __html:
                  renderInlineMarkdown(
                    line.replace(
                      /^>\s+/,
                      ""
                    )
                  ),
              }}
            />
          </blockquote>
        );

        return;
      }

      output.push(
        <p
          key={index}
          dangerouslySetInnerHTML={{
            __html:
              renderInlineMarkdown(
                line
              ),
          }}
        />
      );
    }
  );

  flushList();

  return (
    <div
      className={`markdown-content ${className}`}
    >
      {output}
    </div>
  );
}

/* =========================================================================
   QUESTION NORMALIZATION
========================================================================= */

function normalizeOption(option) {
  if (
    option === null ||
    option === undefined
  ) {
    return "";
  }

  if (
    typeof option ===
    "object"
  ) {
    return safeString(
      firstValue(
        option.text,
        option.label,
        option.value,
        option.option,
        option.content
      )
    );
  }

  return safeString(option);
}

function extractQuestionSource(
  payload
) {
  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.questions
    )
  ) {
    return payload.questions;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.data?.questions
    )
  ) {
    return payload.data.questions;
  }

  if (
    Array.isArray(
      payload?.level?.questions
    )
  ) {
    return payload.level.questions;
  }

  if (
    Array.isArray(
      payload?.data?.level?.questions
    )
  ) {
    return payload.data.level.questions;
  }

  return [];
}

function normalizeQuestions(
  payload
) {
  const source =
    extractQuestionSource(
      payload
    );

  return source
    .map(
      (
        item,
        index
      ) => {
        const id =
          safeString(
            firstValue(
              item?.id,
              item?.questionId,
              item?._id,
              `technical-question-${index + 1}`
            )
          );

        const markdown =
          firstValue(
            item?.questionMarkdown,
            item?.question,
            item?.text,
            item?.questionText,
            `Question ${index + 1}`
          );

        let rawOptions =
          item?.options;

        if (
          !Array.isArray(
            rawOptions
          ) &&
          rawOptions &&
          typeof rawOptions ===
            "object"
        ) {
          rawOptions =
            Object.values(
              rawOptions
            );
        }

        if (
          !Array.isArray(
            rawOptions
          )
        ) {
          rawOptions = [];
        }

        const options =
          rawOptions
            .map(
              normalizeOption
            )
            .filter(Boolean);

        return {
          id,

          question:
            safeString(
              markdown
            ),

          questionMarkdown:
            safeString(
              firstValue(
                item?.questionMarkdown,
                markdown
              )
            ),

          options,

          moduleId:
            safeString(
              item?.moduleId
            ),

          module:
            safeString(
              firstValue(
                item?.module,
                item?.moduleName,
                item?.category,
                "Technical"
              )
            ),

          difficulty:
            safeString(
              firstValue(
                item?.difficulty,
                item?.level,
                "Technical"
              )
            ),

          number:
            safeNumber(
              firstValue(
                item?.number,
                item?.questionNumber,
                index + 1
              ),
              index + 1
            ),

          images:
            Array.isArray(
              item?.images
            )
              ? item.images
              : [],

          hasImages:
            Boolean(
              item?.hasImages ||
              item?.images?.length
            ),
        };
      }
    )
    .filter(
      (question) =>
        question.id &&
        question.question &&
        question.options.length >= 2
    );
}

/* =========================================================================
   FULLSCREEN
========================================================================= */

async function enterFullscreen() {
  try {
    if (
      !document.fullscreenElement &&
      document.documentElement
        ?.requestFullscreen
    ) {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn(
      "[ENGVIVA PROCTOR] Fullscreen unavailable",
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

/* =========================================================================
   TIME
========================================================================= */

function formatTime(
  seconds
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          seconds
        )
      )
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60
    );

  const secs =
    safe % 60;

  if (hours > 0) {
    return `${String(
      hours
    ).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  return `${String(
    minutes
  ).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

/* =========================================================================
   COMPONENT
========================================================================= */

export default function TechnicalAssessment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    companyId:
      routeCompanyId,
    levelNumber:
      routeLevelNumber,
  } = useParams();

  const query =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [location.search]
    );

  const companyId =
    normalizeId(
      firstValue(
        routeCompanyId,
        query.get("company"),
        query.get("companyId"),
        location.state?.companyId
      )
    );

  const levelNumber =
    safeNumber(
      firstValue(
        routeLevelNumber,
        query.get("level"),
        location.state?.levelNumber
      ),
      0
    );

  const isResultRoute =
    location.pathname.endsWith(
      "/result"
    );

  const [screen, setScreen] =
    useState(
      isResultRoute
        ? "result"
        : levelNumber
        ? "running"
        : companyId
        ? "levels"
        : "companies"
    );

  const [
    companies,
    setCompanies,
  ] = useState(
    FALLBACK_COMPANIES
  );

  const [
    companiesLoading,
    setCompaniesLoading,
  ] = useState(false);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    getCompanyFromList(
      FALLBACK_COMPANIES,
      companyId
    )
  );

  const [
    levels,
    setLevels,
  ] = useState([]);

  const [
    levelsLoading,
    setLevelsLoading,
  ] = useState(false);

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState(
    levelNumber || null
  );

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const answersRef =
    useRef({});

  const [
    attemptId,
    setAttemptId,
  ] = useState(null);

  const attemptIdRef =
    useRef(null);

  const [
    startedAt,
    setStartedAt,
  ] = useState(null);

  const startedAtRef =
    useRef(null);

  const [
    timeAllowed,
    setTimeAllowed,
  ] = useState(0);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(0);

  const remainingRef =
    useRef(0);

  const [
    loadingTest,
    setLoadingTest,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const submittingRef =
    useRef(false);

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    showSubmit,
    setShowSubmit,
  ] = useState(false);

  const [
    violations,
    setViolations,
  ] = useState([]);

  const violationsRef =
    useRef([]);

  const [
    proctorWarning,
    setProctorWarning,
  ] = useState("");

  const [
    proctorLocked,
    setProctorLocked,
  ] = useState(false);

  const timerRef =
    useRef(null);

  const submitRef =
    useRef(null);

  /* =======================================================================
     REFS
  ======================================================================= */

  useEffect(() => {
    answersRef.current =
      answers;
  }, [answers]);

  useEffect(() => {
    attemptIdRef.current =
      attemptId;
  }, [attemptId]);

  useEffect(() => {
    startedAtRef.current =
      startedAt;
  }, [startedAt]);

  useEffect(() => {
    remainingRef.current =
      remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    submittingRef.current =
      submitting;
  }, [submitting]);

  useEffect(() => {
    violationsRef.current =
      violations;
  }, [violations]);

  /* =======================================================================
     COMPANY
  ======================================================================= */

  const company =
    selectedCompany ||
    getCompanyFromList(
      companies,
      companyId
    );

  /* =======================================================================
     NAVIGATION
  ======================================================================= */

  const goCompanies =
    useCallback(() => {
      clearAttempt();

      setSelectedCompany(
        null
      );

      setSelectedLevel(
        null
      );

      setLevels([]);

      setQuestions([]);

      setAnswers({});

      setResult(null);

      setError("");

      setScreen(
        "companies"
      );

      navigate(
        "/technical-lab",
        {
          replace: true,
        }
      );
    }, [navigate]);

  const goLevels =
    useCallback(
      (
        targetCompanyId
      ) => {
        const id =
          normalizeId(
            targetCompanyId
          );

        if (!id) {
          goCompanies();
          return;
        }

        const selected =
          getCompanyFromList(
            companies,
            id
          );

        clearAttempt();

        setSelectedCompany(
          selected
        );

        setSelectedLevel(
          null
        );

        setQuestions([]);

        setAnswers({});

        setResult(null);

        setError("");

        setScreen(
          "levels"
        );

        navigate(
          `/technical-lab/${encodeURIComponent(
            id
          )}/levels`,
          {
            replace: true,
          }
        );
      },
      [
        companies,
        goCompanies,
        navigate,
      ]
    );

  /* =======================================================================
     LOAD COMPANIES
  ======================================================================= */

  const loadCompanies =
    useCallback(
      async () => {
        setCompaniesLoading(
          true
        );

        setError("");

        try {
          /*
           * Try the company endpoint
           * first.
           *
           * If the backend does not
           * provide it, fallback data
           * keeps the screen usable.
           */

          const response =
            await fetch(
              `${API_BASE}/api/technical/companies`
            );

          const payload =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (
            response.ok
          ) {
            const source =
              Array.isArray(
                payload
                  ?.companies
              )
                ? payload.companies
                : Array.isArray(
                    payload
                      ?.data
                  )
                ? payload.data
                : [];

            if (
              source.length
            ) {
              setCompanies(
                source.map(
                  (item) => ({
                    id:
                      normalizeId(
                        firstValue(
                          item?.id,
                          item?.companyId,
                          item?.slug
                        )
                      ),

                    name:
                      firstValue(
                        item?.name,
                        item?.companyName,
                        item?.title
                      ),

                    category:
                      firstValue(
                        item?.category,
                        "Technology"
                      ),

                    domain:
                      firstValue(
                        item?.domain,
                        item?.website
                      ),

                    description:
                      firstValue(
                        item?.description,
                        "Technical assessment preparation"
                      ),
                  })
                ).filter(
                  (item) =>
                    item.id &&
                    item.name
                )
              );
            }
          }
        } catch (err) {
          console.warn(
            "[TECHNICAL COMPANIES]",
            err
          );

          /*
           * Do NOT destroy the UI
           * when optional company
           * discovery endpoint is
           * unavailable.
           */
        } finally {
          setCompaniesLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      screen ===
      "companies"
    ) {
      loadCompanies();
    }
  }, [
    screen,
    loadCompanies,
  ]);

  /* =======================================================================
     LOAD COMPANY LEVELS
  ======================================================================= */

  const loadLevels =
    useCallback(
      async (
        id
      ) => {
        if (!id) {
          return;
        }

        setLevelsLoading(
          true
        );

        setError("");

        try {
          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                id
              )}/levels`
            );

          const source =
            Array.isArray(
              payload?.levels
            )
              ? payload.levels
              : Array.isArray(
                  payload?.data?.levels
                )
              ? payload.data.levels
              : [];

          const normalized =
            source
              .map(
                (
                  level,
                  index
                ) => ({
                  ...level,

                  level:
                    safeNumber(
                      firstValue(
                        level?.level,
                        level?.levelNumber,
                        index + 1
                      ),
                      index + 1
                    ),

                  title:
                    firstValue(
                      level?.title,
                      `Level ${
                        index + 1
                      }`
                    ),

                  difficulty:
                    firstValue(
                      level?.difficulty,
                      "Technical"
                    ),

                  questionCount:
                    safeNumber(
                      level?.questionCount,
                      0
                    ),

                  estimatedMinutes:
                    safeNumber(
                      level?.estimatedMinutes,
                      0
                    ),
                })
              );

          setLevels(
            normalized
          );
        } catch (err) {
          console.error(
            "[TECHNICAL LEVELS]",
            err
          );

          setLevels([]);

          setError(
            err.message ||
              "Unable to load technical levels."
          );
        } finally {
          setLevelsLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      screen ===
        "levels" &&
      companyId
    ) {
      loadLevels(
        companyId
      );
    }
  }, [
    screen,
    companyId,
    loadLevels,
  ]);

  /* =======================================================================
     LOAD LEVEL QUESTIONS
  ======================================================================= */

  const loadLevelQuestions =
    useCallback(
      async (
        id,
        level
      ) => {
        /*
         * Your verified backend route:
         *
         * GET
         * /api/technical/company/google/levels/1
         */

        const payload =
          await apiFetch(
            `/api/technical/company/${encodeURIComponent(
              id
            )}/levels/${encodeURIComponent(
              level
            )}`
          );

        const normalized =
          normalizeQuestions(
            payload
          );

        if (
          !normalized.length
        ) {
          throw new Error(
            "This technical level contains no usable questions."
          );
        }

        return normalized;
      },
      []
    );

  /* =======================================================================
     START LEVEL
  ======================================================================= */

  const startLevel =
    useCallback(
      async (
        level
      ) => {
        if (
          !selectedCompany ||
          loadingTest
        ) {
          return;
        }

        const number =
          safeNumber(
            firstValue(
              level?.level,
              level?.levelNumber
            ),
            0
          );

        if (!number) {
          setError(
            "Invalid technical level."
          );

          return;
        }

        setLoadingTest(
          true
        );

        setError("");

        try {
          /*
           * Load the actual questions
           * before creating the attempt.
           */

          const normalized =
            await loadLevelQuestions(
              selectedCompany.id,
              number
            );

          /*
           * Start protected backend
           * attempt.
           */

          const startPayload =
            await apiFetch(
              "/api/technical/assessment/start",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    companyId:
                      selectedCompany.id,

                    levelNumber:
                      number,

                    totalQuestions:
                      normalized.length,

                    mode:
                      "proctored",

                    proctoringMode:
                      "browser_fullscreen",
                  }),
              }
            );

          const attempt =
            startPayload?.data ??
            startPayload;

          const id =
            firstValue(
              attempt?.attemptId,
              attempt?.assessmentId,
              attempt?.id,
              startPayload?.attemptId
            );

          if (!id) {
            throw new Error(
              "The backend did not return an attempt ID."
            );
          }

          const minutes =
            Math.max(
              1,
              safeNumber(
                firstValue(
                  attempt?.estimatedMinutes,
                  level?.estimatedMinutes,
                  60
                ),
                60
              )
            );

          const allowed =
            Math.max(
              60,
              Math.round(
                minutes * 60
              )
            );

          const now =
            new Date().toISOString();

          const session = {
            attemptId: id,

            companyId:
              selectedCompany.id,

            levelNumber:
              number,

            startedAt:
              now,

            timeAllowed:
              allowed,

            questions:
              normalized,

            answers: {},

            currentIndex: 0,

            violations: [],
          };

          saveAttempt(
            session
          );

          clearResult();

          setAttemptId(id);

          setSelectedLevel(
            number
          );

          setQuestions(
            normalized
          );

          setAnswers({});

          answersRef.current =
            {};

          setCurrentIndex(
            0
          );

          setStartedAt(
            now
          );

          startedAtRef.current =
            now;

          setTimeAllowed(
            allowed
          );

          setRemainingSeconds(
            allowed
          );

          remainingRef.current =
            allowed;

          setViolations([]);

          violationsRef.current =
            [];

          setProctorWarning(
            ""
          );

          setProctorLocked(
            false
          );

          setShowSubmit(
            false
          );

          setResult(null);

          /*
           * Canonical active-test
           * route.
           */

          navigate(
            `/technical-lab/${encodeURIComponent(
              selectedCompany.id
            )}/level/${number}`,
            {
              replace: true,
            }
          );

          setScreen(
            "running"
          );

          /*
           * Fullscreen must be
           * requested as part of the
           * start click.
           */

          await enterFullscreen();
        } catch (err) {
          console.error(
            "[TECHNICAL START]",
            err
          );

          setError(
            err.message ||
              "Unable to start technical assessment."
          );
        } finally {
          setLoadingTest(
            false
          );
        }
      },
      [
        selectedCompany,
        loadingTest,
        loadLevelQuestions,
        navigate,
      ]
    );

  /* =======================================================================
     RESTORE ATTEMPT
  ======================================================================= */

  useEffect(() => {
    if (
      screen !==
      "running"
    ) {
      return;
    }

    const saved =
      readAttempt();

    if (
      !saved?.attemptId
    ) {
      return;
    }

    /*
     * Restore only if the saved
     * attempt belongs to the
     * current route.
     */

    if (
      normalizeId(
        saved.companyId
      ) !==
        normalizeId(
          companyId
        ) ||
      safeNumber(
        saved.levelNumber
      ) !==
        safeNumber(
          levelNumber
        )
    ) {
      return;
    }

    setAttemptId(
      saved.attemptId
    );

    setSelectedLevel(
      saved.levelNumber
    );

    setQuestions(
      Array.isArray(
        saved.questions
      )
        ? saved.questions
        : []
    );

    setAnswers(
      saved.answers ||
        {}
    );

    answersRef.current =
      saved.answers ||
      {};

    setCurrentIndex(
      safeNumber(
        saved.currentIndex,
        0
      )
    );

    setStartedAt(
      saved.startedAt ||
        null
    );

    setTimeAllowed(
      safeNumber(
        saved.timeAllowed,
        0
      )
    );

    setViolations(
      Array.isArray(
        saved.violations
      )
        ? saved.violations
        : []
    );
  }, [
    screen,
    companyId,
    levelNumber,
  ]);

  /* =======================================================================
     ANSWER SELECTION
  ======================================================================= */

  const chooseAnswer =
    useCallback(
      (
        questionId,
        optionIndex
      ) => {
        if (
          submitting ||
          proctorLocked
        ) {
          return;
        }

        setAnswers(
          (previous) => {
            const next = {
              ...previous,

              [questionId]:
                optionIndex,
            };

            answersRef.current =
              next;

            const saved =
              readAttempt();

            if (saved) {
              saveAttempt({
                ...saved,

                answers:
                  next,

                currentIndex:
                  currentIndex,
              });
            }

            return next;
          }
        );
      },
      [
        submitting,
        proctorLocked,
        currentIndex,
      ]
    );

  /* =======================================================================
     TIMER
  ======================================================================= */

  const submitAssessment =
    useCallback(
      async (
        automatic = false,
        automaticReason = ""
      ) => {
        if (
          submittingRef.current ||
          !attemptIdRef.current
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(
          true
        );

        clearInterval(
          timerRef.current
        );

        try {
          const payload =
            await apiFetch(
              "/api/technical/assessment/submit",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    attemptId:
                      attemptIdRef.current,

                    companyId:
                      company?.id,

                    levelNumber:
                      selectedLevel,

                    answers:
                      answersRef.current,

                    startedAt:
                      startedAtRef.current,

                    completedAt:
                      new Date().toISOString(),

                    timeAllowedSeconds:
                      timeAllowed,

                    timeUsedSeconds:
                      Math.max(
                        0,
                        timeAllowed -
                          remainingRef.current
                      ),

                    automaticSubmission:
                      automatic,

                    automaticSubmissionReason:
                      automaticReason,

                    mode:
                      "proctored",

                    proctoring: {
                      mode:
                        "browser_fullscreen",

                      violationCount:
                        violationsRef.current
                          .length,

                      violations:
                        violationsRef.current,

                      locked:
                        proctorLocked,
                    },
                  }),
              }
            );

          const finalResult =
            payload?.data ??
            payload;

          /*
           * Backend result is the
           * authoritative score.
           */

          setResult(
            finalResult
          );

          saveResult(
            finalResult
          );

          clearAttempt();

          setScreen(
            "result"
          );

          navigate(
            `/technical-lab/${encodeURIComponent(
              company.id
            )}/level/${selectedLevel}/result`,
            {
              replace: true,
            }
          );

          await exitFullscreen();
        } catch (err) {
          console.error(
            "[TECHNICAL SUBMIT]",
            err
          );

          setError(
            err.message ||
              "Unable to submit technical assessment."
          );

          submittingRef.current =
            false;

          setSubmitting(
            false
          );

          return;
        }

        setSubmitting(
          false
        );

        submittingRef.current =
          false;
      },
      [
        company,
        selectedLevel,
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

  useEffect(() => {
    if (
      screen !==
      "running"
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
      setInterval(
        () => {
          setRemainingSeconds(
            (
              previous
            ) => {
              const next =
                Math.max(
                  0,
                  previous - 1
                );

              remainingRef.current =
                next;

              if (
                next === 0
              ) {
                clearInterval(
                  timerRef.current
                );

                setTimeout(
                  () => {
                    submitRef.current?.(
                      true,
                      "TIME_EXPIRED"
                    );
                  },
                  0
                );
              }

              return next;
            }
          );
        },
        1000
      );

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [screen]);

  /* =======================================================================
     PROCTORING
  ======================================================================= */

  const recordViolation =
    useCallback(
      (
        type,
        message
      ) => {
        if (
          screen !==
          "running"
        ) {
          return;
        }

        const event = {
          type,

          message,

          timestamp:
            new Date().toISOString(),
        };

        const next = [
          ...violationsRef.current,
          event,
        ];

        violationsRef.current =
          next;

        setViolations(
          next
        );

        setProctorWarning(
          message
        );

        const saved =
          readAttempt();

        if (saved) {
          saveAttempt({
            ...saved,

            violations:
              next,
          });
        }

        if (
          next.length >=
          MAX_PROCTOR_FLAGS
        ) {
          setProctorLocked(
            true
          );

          setTimeout(
            () => {
              submitRef.current?.(
                true,
                "PROCTORING_LIMIT"
              );
            },
            300
          );
        }
      },
      [screen]
    );

  useEffect(() => {
    if (
      screen !==
      "running"
    ) {
      return;
    }

    const onVisibility =
      () => {
        if (
          document.hidden
        ) {
          recordViolation(
            "TAB_HIDDEN",
            "The assessment window was hidden or another tab was activated."
          );
        }
      };

    const onBlur =
      () => {
        recordViolation(
          "WINDOW_BLUR",
          "The assessment window lost focus."
        );
      };

    const onFullscreen =
      () => {
        if (
          !document.fullscreenElement
        ) {
          recordViolation(
            "FULLSCREEN_EXIT",
            "Fullscreen mode was exited."
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    window.addEventListener(
      "blur",
      onBlur
    );

    document.addEventListener(
      "fullscreenchange",
      onFullscreen
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );

      window.removeEventListener(
        "blur",
        onBlur
      );

      document.removeEventListener(
        "fullscreenchange",
        onFullscreen
      );
    };
  }, [
    screen,
    recordViolation,
  ]);

  /* =======================================================================
     CLEANUP
  ======================================================================= */

  useEffect(() => {
    return () => {
      clearInterval(
        timerRef.current
      );
    };
  }, []);

  /* =======================================================================
     DERIVED
  ======================================================================= */

  const currentQuestion =
    questions[
      currentIndex
    ];

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
          (
            answeredCount /
            questions.length
          ) *
            100
        )
      : 0;

  const currentAnswer =
    currentQuestion
      ? answers[
          currentQuestion.id
        ]
      : undefined;

  /* =======================================================================
     RESULT ROUTE
  ======================================================================= */

  if (
    screen ===
    "result"
  ) {
    const finalResult =
      result ||
      readResult();

    if (!finalResult) {
      return (
        <div className="technical-page">
          <style>
            {TECHNICAL_CSS}
          </style>

          <LoadingBlock
            text="Loading assessment result..."
          />
        </div>
      );
    }

    return (
      <ResultScreen
        result={
          finalResult
        }
        company={
          company
        }
        selectedLevel={
          selectedLevel
        }
        onRetake={() => {
          const level =
            levels.find(
              (item) =>
                safeNumber(
                  item?.level
                ) ===
                safeNumber(
                  selectedLevel
                )
            );

          if (level) {
            startLevel(
              level
            );
          } else {
            goLevels(
              company?.id
            );
          }
        }}
        onLevels={() =>
          goLevels(
            company?.id
          )
        }
        onCompanies={
          goCompanies
        }
      />
    );
  }

  /* =======================================================================
     COMPANIES
  ======================================================================= */

  if (
    screen ===
    "companies"
  ) {
    return (
      <div className="technical-page">
        <style>
          {TECHNICAL_CSS}
        </style>

        <NormalTopBar
          title="Technical Lab"
          onBack={() =>
            navigate(
              "/dashboard",
              {
                replace: true,
              }
            )
          }
        />

        <main className="technical-container">
          <section className="lab-hero">
            <div>
              <span className="eyebrow">
                ENGVIVA / TECHNICAL
              </span>

              <h1>
                Technical Lab
              </h1>

              <p>
                Select a company to
                open its technical
                assessment levels.
              </p>
            </div>

            <div className="hero-stat">
              <strong>
                {
                  companies.length
                }
              </strong>

              <span>
                COMPANIES
              </span>
            </div>
          </section>

          {error && (
            <ErrorBanner
              message={error}
              onRetry={() =>
                loadCompanies()
              }
            />
          )}

          {companiesLoading ? (
            <LoadingBlock
              text="Loading companies..."
            />
          ) : (
            <section>
              <div className="section-heading">
                <div>
                  <span>
                    COMPANY PREPARATION
                  </span>

                  <h2>
                    Choose your target
                  </h2>
                </div>

                <span>
                  SERVER DATA
                </span>
              </div>

              <div className="company-grid">
                {companies.map(
                  (
                    item
                  ) => (
                    <CompanyCard
                      key={
                        item.id
                      }
                      company={
                        item
                      }
                      onClick={() =>
                        goLevels(
                          item.id
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  /* =======================================================================
     LEVELS
  ======================================================================= */

  if (
    screen ===
    "levels"
  ) {
    return (
      <div className="technical-page">
        <style>
          {TECHNICAL_CSS}
        </style>

        <NormalTopBar
          title={
            company?.name ||
            "Company"
          }
          onBack={() =>
            goCompanies()
          }
        />

        <main className="technical-container">
          <section className="company-hero">
            <CompanyLogo
              company={
                company
              }
              large
            />

            <div className="company-hero-copy">
              <span>
                {company?.category ||
                  "TECHNOLOGY"}
              </span>

              <h1>
                {company?.name ||
                  "Company"}
              </h1>

              <p>
                Select a technical
                assessment level.
                Every question is
                loaded from the
                server-side technical
                dataset.
              </p>
            </div>

            <div className="company-level-count">
              <strong>
                {
                  levels.length
                }
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
                  companyId
                )
              }
            />
          )}

          {levelsLoading ? (
            <LoadingBlock
              text="Loading technical levels..."
            />
          ) : (
            <section>
              <div className="section-heading">
                <div>
                  <span>
                    {
                      company?.name
                    }
                  </span>

                  <h2>
                    Technical levels
                  </h2>
                </div>

                <span>
                  SERVER EVALUATED
                </span>
              </div>

              <div className="levels-grid">
                {levels.map(
                  (
                    level
                  ) => {
                    const number =
                      safeNumber(
                        level?.level
                      );

                    return (
                      <button
                        key={`${companyId}-${number}`}
                        className="level-card"
                        disabled={
                          loadingTest
                        }
                        onClick={() =>
                          startLevel(
                            level
                          )
                        }
                      >
                        <span className="level-number">
                          LEVEL{" "}
                          {
                            number
                          }
                        </span>

                        <h3>
                          {
                            level?.title
                          }
                        </h3>

                        <p>
                          {level?.description ||
                            "Server-generated technical assessment using the configured company question pool."}
                        </p>

                        <div className="level-meta">
                          <span className="level-pill">
                            {
                              level?.difficulty
                            }
                          </span>

                          {safeNumber(
                            level?.questionCount
                          ) >
                            0 && (
                            <span className="level-pill">
                              {
                                level.questionCount
                              }{" "}
                              QUESTIONS
                            </span>
                          )}

                          {safeNumber(
                            level?.estimatedMinutes
                          ) >
                            0 && (
                            <span className="level-pill">
                              {
                                level.estimatedMinutes
                              }{" "}
                              MIN
                            </span>
                          )}
                        </div>

                        <span className="level-arrow">
                          →
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  /* =======================================================================
     RUNNING TEST
  ======================================================================= */

  if (
    screen ===
    "running"
  ) {
    if (
      !questions.length
    ) {
      return (
        <div className="technical-page">
          <style>
            {TECHNICAL_CSS}
          </style>

          <LoadingBlock
            text="Loading technical assessment..."
          />
        </div>
      );
    }

    return (
      <div className="technical-test">
        <style>
          {TECHNICAL_CSS}
        </style>

        <header className="test-header">
          <div className="test-brand">
            <CompanyLogo
              company={
                company
              }
            />

            <div>
              <strong>
                ENGVIVA
              </strong>

              <span>
                {
                  company?.name
                }{" "}
                · LEVEL{" "}
                {
                  selectedLevel
                }
              </span>
            </div>
          </div>

          <div className="test-status">
            <span>
              PROCTORED
            </span>

            <strong
              className={
                remainingSeconds <
                60
                  ? "timer-danger"
                  : ""
              }
            >
              {formatTime(
                remainingSeconds
              )}
            </strong>

            <small>
              {
                violations.length
              }
              /
              {
                MAX_PROCTOR_FLAGS
              }{" "}
              FLAGS
            </small>
          </div>
        </header>

        <main className="test-container">
          <aside className="question-sidebar">
            <div className="sidebar-heading">
              <span>
                QUESTIONS
              </span>

              <strong>
                {
                  answeredCount
                }
                /
                {
                  questions.length
                }
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div className="question-grid">
              {questions.map(
                (
                  question,
                  index
                ) => (
                  <button
                    key={
                      question.id
                    }
                    className={`question-jump ${
                      index ===
                      currentIndex
                        ? "active"
                        : ""
                    } ${
                      answers[
                        question.id
                      ] !==
                      undefined
                        ? "answered"
                        : ""
                    }`}
                    onClick={() =>
                      setCurrentIndex(
                        index
                      )
                    }
                    disabled={
                      submitting ||
                      proctorLocked
                    }
                  >
                    {
                      index + 1
                    }
                  </button>
                )
              )}
            </div>

            <div className="sidebar-note">
              <strong>
                SECURE TEST
              </strong>

              <p>
                Remain in fullscreen.
                Do not switch tabs or
                leave the assessment
                window.
              </p>
            </div>
          </aside>

          <section className="question-panel">
            <div className="question-meta">
              <span>
                QUESTION{" "}
                {
                  currentIndex +
                  1
                }{" "}
                /{" "}
                {
                  questions.length
                }
              </span>

              <span>
                {
                  currentQuestion?.module ||
                  "Technical"
                }
              </span>
            </div>

            <div className="question-content">
              <MarkdownText>
                {
                  currentQuestion?.questionMarkdown ||
                  currentQuestion?.question
                }
              </MarkdownText>

              <QuestionImages
                question={
                  currentQuestion
                }
              />

              <div className="options-list">
                {currentQuestion?.options?.map(
                  (
                    option,
                    index
                  ) => {
                    const selected =
                      String(
                        currentAnswer
                      ) ===
                      String(
                        index
                      );

                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        className={`option-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          chooseAnswer(
                            currentQuestion.id,
                            index
                          )
                        }
                        disabled={
                          proctorLocked ||
                          submitting
                        }
                      >
                        <span className="option-letter">
                          {String.fromCharCode(
                            65 +
                              index
                          )}
                        </span>

                        <span className="option-text">
                          <MarkdownText>
                            {
                              option
                            }
                          </MarkdownText>
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

            <div className="question-footer">
              <button
                className="secondary-button"
                disabled={
                  currentIndex ===
                    0 ||
                  submitting
                }
                onClick={() =>
                  setCurrentIndex(
                    (
                      value
                    ) =>
                      Math.max(
                        0,
                        value - 1
                      )
                  )
                }
              >
                ← PREVIOUS
              </button>

              <div className="footer-progress">
                {
                  currentIndex +
                  1
                }{" "}
                /{" "}
                {
                  questions.length
                }
              </div>

              {currentIndex <
              questions.length -
                1 ? (
                <button
                  className="primary-button"
                  disabled={
                    submitting
                  }
                  onClick={() =>
                    setCurrentIndex(
                      (
                        value
                      ) =>
                        Math.min(
                          questions.length -
                            1,
                          value + 1
                        )
                    )
                  }
                >
                  NEXT →
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={
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
          </section>
        </main>

        {proctorWarning &&
          !proctorLocked && (
            <div className="proctor-warning">
              <strong>
                PROCTORING FLAG
              </strong>

              <span>
                {
                  proctorWarning
                }
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
                The maximum number
                of proctoring
                violations was
                reached. The attempt
                is being submitted
                with its audit.
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
    );
  }

  return (
    <div className="technical-page">
      <style>
        {TECHNICAL_CSS}
      </style>

      <LoadingBlock
        text="Loading Technical Lab..."
      />
    </div>
  );
}

/* =========================================================================
   COMPANY LOGO
========================================================================= */

function CompanyLogo({
  company,
  large = false,
}) {
  const domain =
    safeString(
      company?.domain
    )
      .replace(
        /^https?:\/\//i,
        ""
      )
      .replace(
        /^www\./i,
        ""
      )
      .split("/")[0];

  const favicon =
    domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
      : "";

  return (
    <div
      className={`company-logo ${
        large
          ? "company-logo-large"
          : ""
      }`}
    >
      {favicon ? (
        <img
          src={favicon}
          alt={
            company?.name ||
            ""
          }
          onError={(
            event
          ) => {
            event.currentTarget.style.display =
              "none";
          }}
        />
      ) : (
        <span>
          {safeString(
            company?.name
          )
            .charAt(0)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

/* =========================================================================
   COMPANY CARD
========================================================================= */

function CompanyCard({
  company,
  onClick,
}) {
  return (
    <button
      className="company-card"
      onClick={
        onClick
      }
    >
      <CompanyLogo
        company={
          company
        }
      />

      <div className="company-card-info">
        <span>
          {
            company?.category ||
            "TECHNOLOGY"
          }
        </span>

        <h3>
          {
            company?.name
          }
        </h3>

        <p>
          {
            company?.description ||
            "Technical assessment preparation"
          }
        </p>
      </div>

      <span className="company-card-arrow">
        →
      </span>
    </button>
  );
}

/* =========================================================================
   QUESTION IMAGES
========================================================================= */

function QuestionImages({
  question,
}) {
  if (
    !Array.isArray(
      question?.images
    ) ||
    !question.images.length
  ) {
    return null;
  }

  return (
    <div className="question-images">
      {question.images.map(
        (
          image,
          index
        ) => {
          const source =
            safeString(
              image?.url ||
              image?.src ||
              image?.source
            );

          if (!source) {
            return null;
          }

          /*
           * Backend may return a
           * relative image path.
           *
           * Keep absolute URLs as-is.
           */

          const src =
            /^https?:\/\//i.test(
              source
            )
              ? source
              : `${API_BASE}/${source.replace(
                  /^\/+/,
                  ""
                )}`;

          return (
            <figure
              key={
                `${source}-${index}`
              }
            >
              <img
                src={src}
                alt={
                  image?.alt ||
                  "Question diagram"
                }
                loading="lazy"
              />
            </figure>
          );
        }
      )}
    </div>
  );
}

/* =========================================================================
   RESULT SCREEN
========================================================================= */

function ResultScreen({
  result,
  company,
  selectedLevel,
  onRetake,
  onLevels,
  onCompanies,
}) {
  const score =
    clamp(
      firstValue(
        result?.percentage,
        result?.score
      ),
      0,
      100
    );

  const total =
    safeNumber(
      result?.totalQuestions,
      0
    );

  const correct =
    safeNumber(
      result?.correctAnswers,
      0
    );

  const incorrect =
    safeNumber(
      result?.incorrectAnswers,
      0
    );

  const answered =
    safeNumber(
      result?.answeredQuestions,
      correct +
        incorrect
    );

  const unanswered =
    safeNumber(
      result?.unansweredQuestions,
      Math.max(
        0,
        total -
          answered
      )
    );

  const performance =
    firstValue(
      result?.performance,
      score >= 90
        ? "Exceptional"
        : score >= 80
        ? "Excellent"
        : score >= 70
        ? "Strong"
        : score >= 60
        ? "Good"
        : score >= 50
        ? "Developing"
        : "Needs Improvement"
    );

  return (
    <div className="technical-page">
      <style>
        {TECHNICAL_CSS}
      </style>

      <main className="result-container">
        <div className="result-header">
          <div>
            <span className="eyebrow">
              TECHNICAL ASSESSMENT
            </span>

            <h1>
              Assessment complete.
            </h1>

            <p>
              {
                company?.name
              }{" "}
              · LEVEL{" "}
              {
                selectedLevel
              }
            </p>
          </div>

          <div className="completed-badge">
            ✓ COMPLETED
          </div>
        </div>

        <section className="score-hero">
          <div className="score-circle">
            <strong>
              {
                score
              }
              %
            </strong>

            <span>
              SCORE
            </span>
          </div>

          <div className="score-copy">
            <span>
              PERFORMANCE
            </span>

            <h2>
              {
                performance
              }
            </h2>

            <p>
              Your result was
              evaluated securely
              by the ENGVIVA
              technical scoring
              engine.
            </p>
          </div>
        </section>

        <section className="result-stats">
          <ResultStat
            value={
              total
            }
            label="TOTAL"
          />

          <ResultStat
            value={
              answered
            }
            label="ANSWERED"
          />

          <ResultStat
            value={
              correct
            }
            label="CORRECT"
          />

          <ResultStat
            value={
              incorrect
            }
            label="INCORRECT"
          />

          <ResultStat
            value={
              unanswered
            }
            label="UNANSWERED"
          />
        </section>

        {Array.isArray(
          result?.moduleBreakdown
        ) &&
          result.moduleBreakdown
            .length > 0 && (
            <section className="breakdown-section">
              <div className="section-heading">
                <div>
                  <span>
                    ANALYSIS
                  </span>

                  <h2>
                    Module performance
                  </h2>
                </div>
              </div>

              <div className="breakdown-grid">
                {result.moduleBreakdown.map(
                  (
                    item
                  ) => (
                    <div
                      className="breakdown-card"
                      key={
                        item.moduleId
                      }
                    >
                      <div>
                        <strong>
                          {
                            item.module
                          }
                        </strong>

                        <span>
                          {
                            item.correct
                          }
                          /
                          {
                            item.total
                          }{" "}
                          correct
                        </span>
                      </div>

                      <strong>
                        {
                          item.score
                        }
                        %
                      </strong>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

        <div className="result-actions">
          <button
            className="secondary-button"
            onClick={
              onCompanies
            }
          >
            ALL COMPANIES
          </button>

          <button
            className="secondary-button"
            onClick={
              onLevels
            }
          >
            LEVELS
          </button>

          <button
            className="primary-button"
            onClick={
              onRetake
            }
          >
            RETAKE LEVEL →
          </button>
        </div>
      </main>
    </div>
  );
}

/* =========================================================================
   UI HELPERS
========================================================================= */

function NormalTopBar({
  title,
  onBack,
}) {
  return (
    <header className="normal-topbar">
      <button
        className="topbar-back"
        onClick={
          onBack
        }
      >
        ←
      </button>

      <div>
        <strong>
          ENGVIVA
        </strong>

        <span>
          {
            title
          }
        </span>
      </div>
    </header>
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
          Something went wrong
        </strong>

        <span>
          {
            message
          }
        </span>
      </div>

      {onRetry && (
        <button
          onClick={
            onRetry
          }
        >
          Retry
        </button>
      )}
    </div>
  );
}

function LoadingBlock({
  text,
}) {
  return (
    <div className="loading-block">
      <div className="spinner" />

      <strong>
        {
          text
        }
      </strong>
    </div>
  );
}

function ResultStat({
  value,
  label,
}) {
  return (
    <div className="result-stat">
      <strong>
        {
          value
        }
      </strong>

      <span>
        {
          label
        }
      </span>
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
          ?
        </div>

        <span>
          FINISH ASSESSMENT
        </span>

        <h2>
          Submit your test?
        </h2>

        <p>
          Your answers will
          be sent to the ENGVIVA
          backend and evaluated
          securely.
        </p>

        <div className="modal-stats">
          <div>
            <strong>
              {
                answered
              }
            </strong>

            <span>
              ANSWERED
            </span>
          </div>

          <div>
            <strong>
              {
                unanswered
              }
            </strong>

            <span>
              UNANSWERED
            </span>
          </div>

          <div>
            <strong>
              {
                formatTime(
                  time
                )
              }
            </strong>

            <span>
              REMAINING
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            disabled={
              submitting
            }
            onClick={
              onCancel
            }
          >
            CONTINUE TEST
          </button>

          <button
            className="primary-button"
            disabled={
              submitting
            }
            onClick={
              onSubmit
            }
          >
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT & ANALYSE →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   CSS
========================================================================= */

const TECHNICAL_CSS = `
* {
  box-sizing: border-box;
}

.technical-page,
.technical-test {
  min-height: 100vh;
  background: #080808;
  color: #f4f4f4;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

button {
  font: inherit;
}

.technical-container {
  width: min(
    1400px,
    calc(100% - 48px)
  );
  margin: 0 auto;
  padding: 42px 0 80px;
}

.normal-topbar {
  height: 76px;
  border-bottom: 1px solid #202020;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 28px;
  background: #0b0b0b;
  position: sticky;
  top: 0;
  z-index: 50;
}

.normal-topbar strong {
  display: block;
  font-size: 14px;
  letter-spacing: .14em;
}

.normal-topbar span {
  display: block;
  color: #777;
  font-size: 11px;
  margin-top: 3px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.topbar-back {
  width: 42px;
  height: 42px;
  border: 1px solid #292929;
  background: #111;
  color: white;
  border-radius: 10px;
  cursor: pointer;
}

.lab-hero,
.company-hero {
  border: 1px solid #222;
  border-radius: 24px;
  background:
    linear-gradient(
      135deg,
      #111,
      #0a0a0a
    );
  padding: 42px;
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 44px;
}

.lab-hero {
  justify-content: space-between;
}

.eyebrow,
.company-hero-copy > span,
.section-heading > div > span {
  color: #a8a8a8;
  font-size: 11px;
  letter-spacing: .16em;
  font-weight: 700;
}

.lab-hero h1,
.company-hero h1 {
  font-size: clamp(
    36px,
    5vw,
    72px
  );
  line-height: .95;
  margin: 14px 0;
  letter-spacing: -.055em;
}

.lab-hero p,
.company-hero p {
  max-width: 720px;
  color: #8b8b8b;
  line-height: 1.7;
  margin: 0;
}

.hero-stat,
.company-level-count {
  min-width: 130px;
  text-align: right;
}

.hero-stat strong,
.company-level-count strong {
  display: block;
  font-size: 54px;
  line-height: 1;
}

.hero-stat span,
.company-level-count span {
  display: block;
  margin-top: 8px;
  color: #777;
  font-size: 10px;
  letter-spacing: .14em;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 22px;
}

.section-heading h2 {
  margin: 7px 0 0;
  font-size: 27px;
  letter-spacing: -.03em;
}

.section-heading > span {
  color: #666;
  font-size: 10px;
  letter-spacing: .12em;
}

.company-grid,
.levels-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(
        300px,
        1fr
      )
    );
  gap: 14px;
}

.company-card,
.level-card {
  border: 1px solid #252525;
  background: #101010;
  color: white;
  border-radius: 18px;
  text-align: left;
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease;
}

.company-card:hover,
.level-card:hover {
  transform: translateY(-3px);
  border-color: #444;
  background: #141414;
}

.company-card {
  min-height: 170px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.company-card-info {
  flex: 1;
}

.company-card-info > span {
  color: #777;
  font-size: 10px;
  letter-spacing: .12em;
}

.company-card-info h3 {
  margin: 8px 0;
  font-size: 22px;
}

.company-card-info p {
  color: #777;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.company-card-arrow,
.level-arrow {
  color: #aaa;
  font-size: 22px;
}

.company-logo {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border-radius: 14px;
  background: white;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.company-logo img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.company-logo span {
  color: #111;
  font-size: 20px;
  font-weight: 800;
}

.company-logo-large {
  width: 92px;
  height: 92px;
  flex-basis: 92px;
  border-radius: 22px;
}

.company-logo-large span {
  font-size: 36px;
}

.company-hero-copy {
  flex: 1;
}

.level-card {
  position: relative;
  padding: 26px;
  min-height: 245px;
}

.level-number {
  color: #777;
  font-size: 10px;
  letter-spacing: .16em;
  font-weight: 800;
}

.level-card h3 {
  font-size: 25px;
  margin: 13px 0;
}

.level-card p {
  color: #777;
  line-height: 1.6;
  min-height: 52px;
}

.level-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 20px;
}

.level-pill {
  border: 1px solid #292929;
  background: #151515;
  color: #999;
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 9px;
  letter-spacing: .1em;
}

.level-arrow {
  position: absolute;
  right: 24px;
  bottom: 23px;
}

.error-banner {
  border: 1px solid #542b2b;
  background: #1b0d0d;
  color: #ddd;
  padding: 16px 18px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.error-banner strong,
.error-banner span {
  display: block;
}

.error-banner span {
  color: #a88;
  margin-top: 5px;
  font-size: 13px;
}

.error-banner button {
  border: 1px solid #555;
  background: #151515;
  color: white;
  border-radius: 8px;
  padding: 9px 13px;
  cursor: pointer;
}

.loading-block {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: #777;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #292929;
  border-top-color: #fff;
  border-radius: 50%;
  animation:
    spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* TEST */

.technical-test {
  background: #080808;
}

.test-header {
  height: 78px;
  border-bottom: 1px solid #242424;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(
    8,
    8,
    8,
    .97
  );
}

.test-brand {
  display: flex;
  align-items: center;
  gap: 13px;
}

.test-brand strong {
  display: block;
  letter-spacing: .12em;
}

.test-brand span {
  color: #777;
  display: block;
  font-size: 10px;
  letter-spacing: .08em;
  margin-top: 3px;
}

.test-status {
  text-align: right;
}

.test-status > span {
  color: #76c893;
  font-size: 9px;
  letter-spacing: .14em;
  display: block;
}

.test-status strong {
  font-size: 26px;
  display: block;
  margin-top: 3px;
}

.test-status small {
  color: #666;
  font-size: 9px;
}

.timer-danger {
  color: #ff6b6b;
}

.test-container {
  width: min(
    1450px,
    calc(100% - 40px)
  );
  margin: 0 auto;
  padding: 28px 0 50px;
  display: grid;
  grid-template-columns:
    250px
    minmax(
      0,
      1fr
    );
  gap: 20px;
}

.question-sidebar,
.question-panel {
  border: 1px solid #232323;
  background: #0e0e0e;
  border-radius: 18px;
}

.question-sidebar {
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 102px;
}

.sidebar-heading {
  display: flex;
  justify-content: space-between;
  color: #777;
  font-size: 10px;
  letter-spacing: .1em;
}

.sidebar-heading strong {
  color: white;
}

.progress-track {
  height: 4px;
  background: #202020;
  border-radius: 99px;
  overflow: hidden;
  margin: 15px 0 20px;
}

.progress-fill {
  height: 100%;
  background: #eee;
  transition: width .2s ease;
}

.question-grid {
  display: grid;
  grid-template-columns:
    repeat(
      5,
      1fr
    );
  gap: 7px;
}

.question-jump {
  aspect-ratio: 1;
  border: 1px solid #292929;
  background: #131313;
  color: #777;
  border-radius: 8px;
  cursor: pointer;
}

.question-jump.active {
  border-color: #fff;
  color: white;
}

.question-jump.answered {
  background: #252525;
  color: white;
}

.sidebar-note {
  border-top: 1px solid #222;
  margin-top: 20px;
  padding-top: 17px;
}

.sidebar-note strong {
  font-size: 10px;
  letter-spacing: .12em;
}

.sidebar-note p {
  color: #666;
  line-height: 1.5;
  font-size: 12px;
}

.question-panel {
  min-width: 0;
  padding: 30px;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 10px;
  letter-spacing: .12em;
  padding-bottom: 22px;
  border-bottom: 1px solid #202020;
}

.question-content {
  padding: 40px 0;
  max-width: 950px;
}

.markdown-content {
  color: #ededed;
  font-size: 20px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.markdown-content p {
  margin: 0 0 12px;
}

.markdown-content h2,
.markdown-content h3,
.markdown-content h4 {
  color: white;
  line-height: 1.25;
  margin: 12px 0;
}

.markdown-content code {
  background: #181818;
  border: 1px solid #292929;
  border-radius: 5px;
  padding: 2px 6px;
  font-family:
    "SFMono-Regular",
    Consolas,
    monospace;
  font-size: .9em;
}

.markdown-content blockquote {
  border-left: 3px solid #555;
  margin: 15px 0;
  padding-left: 15px;
  color: #999;
}

.markdown-content ul {
  padding-left: 22px;
}

.markdown-content a {
  color: white;
}

.md-space {
  height: 5px;
}

.question-images {
  display: grid;
  gap: 16px;
  margin: 25px 0;
}

.question-images figure {
  margin: 0;
  border: 1px solid #252525;
  background: #080808;
  border-radius: 12px;
  padding: 12px;
  overflow: hidden;
}

.question-images img {
  width: 100%;
  max-height: 480px;
  object-fit: contain;
  display: block;
}

.options-list {
  display: grid;
  gap: 11px;
  margin-top: 30px;
}

.option-card {
  width: 100%;
  border: 1px solid #292929;
  background: #111;
  color: white;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns:
    42px
    minmax(
      0,
      1fr
    )
    30px;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.option-card:hover {
  border-color: #444;
}

.option-card.selected {
  border-color: #fff;
  background: #181818;
}

.option-letter {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid #333;
  border-radius: 9px;
  color: #999;
  font-weight: 700;
}

.option-card.selected
.option-letter {
  color: white;
  border-color: white;
}

.option-text .markdown-content {
  font-size: 15px;
  line-height: 1.5;
}

.option-check {
  color: white;
  font-size: 20px;
  text-align: center;
}

.question-footer {
  border-top: 1px solid #222;
  padding-top: 20px;
  display: grid;
  grid-template-columns:
    1fr
    auto
    1fr;
  align-items: center;
  gap: 12px;
}

.question-footer
.primary-button {
  justify-self: end;
}

.footer-progress {
  color: #666;
  font-size: 11px;
}

.primary-button,
.secondary-button {
  border-radius: 10px;
  padding: 12px 17px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .06em;
}

.primary-button {
  background: white;
  color: black;
  border: 1px solid white;
}

.secondary-button {
  background: #151515;
  color: white;
  border: 1px solid #333;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.proctor-warning {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 100;
  border: 1px solid #5a4b26;
  background: #1d180c;
  padding: 13px 18px;
  border-radius: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: calc(100% - 30px);
  box-shadow:
    0 15px 50px
    rgba(
      0,
      0,
      0,
      .4
    );
}

.proctor-warning strong {
  font-size: 10px;
  letter-spacing: .12em;
}

.proctor-warning span {
  color: #b7aa82;
  font-size: 12px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(
    0,
    0,
    0,
    .78
  );
  display: grid;
  place-items: center;
  padding: 20px;
}

.submit-modal {
  width: min(
    520px,
    100%
  );
  border: 1px solid #333;
  border-radius: 20px;
  background: #111;
  padding: 30px;
  box-shadow:
    0 30px 100px
    rgba(
      0,
      0,
      0,
      .6
    );
}

.modal-symbol {
  width: 44px;
  height: 44px;
  border: 1px solid #444;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
}

.submit-modal > span {
  color: #777;
  font-size: 10px;
  letter-spacing: .15em;
}

.submit-modal h2 {
  font-size: 31px;
  margin: 10px 0;
}

.submit-modal p {
  color: #777;
  line-height: 1.6;
}

.modal-stats {
  display: grid;
  grid-template-columns:
    repeat(
      3,
      1fr
    );
  border: 1px solid #252525;
  border-radius: 12px;
  overflow: hidden;
  margin: 22px 0;
}

.modal-stats > div {
  padding: 15px;
  border-right: 1px solid #252525;
}

.modal-stats > div:last-child {
  border-right: 0;
}

.modal-stats strong,
.modal-stats span {
  display: block;
}

.modal-stats strong {
  font-size: 20px;
}

.modal-stats span {
  color: #666;
  font-size: 8px;
  letter-spacing: .1em;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
}

/* RESULT */

.result-container {
  width: min(
    1100px,
    calc(100% - 40px)
  );
  margin: 0 auto;
  padding: 60px 0 80px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 50px;
}

.result-header h1 {
  font-size: 52px;
  letter-spacing: -.05em;
  margin: 12px 0;
}

.result-header p {
  color: #777;
}

.completed-badge {
  border: 1px solid #31573d;
  color: #8dd6a1;
  padding: 10px 13px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: .1em;
}

.score-hero {
  display: grid;
  grid-template-columns:
    250px
    1fr;
  gap: 45px;
  align-items: center;
  padding: 45px;
  border: 1px solid #252525;
  background: #101010;
  border-radius: 22px;
}

.score-circle {
  width: 210px;
  height: 210px;
  border: 2px solid #eee;
  border-radius: 50%;
  display: grid;
  place-items: center;
  align-content: center;
  margin: auto;
}

.score-circle strong {
  font-size: 48px;
  letter-spacing: -.05em;
}

.score-circle span {
  color: #777;
  font-size: 9px;
  letter-spacing: .14em;
}

.score-copy > span {
  color: #777;
  font-size: 10px;
  letter-spacing: .15em;
}

.score-copy h2 {
  font-size: 42px;
  margin: 10px 0;
}

.score-copy p {
  color: #777;
  line-height: 1.7;
  max-width: 560px;
}

.result-stats {
  display: grid;
  grid-template-columns:
    repeat(
      5,
      1fr
    );
  margin: 18px 0;
  border: 1px solid #252525;
  border-radius: 16px;
  overflow: hidden;
}

.result-stat {
  padding: 22px;
  border-right: 1px solid #252525;
}

.result-stat:last-child {
  border-right: 0;
}

.result-stat strong {
  display: block;
  font-size: 27px;
}

.result-stat span {
  color: #666;
  display: block;
  margin-top: 6px;
  font-size: 9px;
  letter-spacing: .12em;
}

.breakdown-section {
  margin-top: 45px;
}

.breakdown-grid {
  display: grid;
  gap: 9px;
}

.breakdown-card {
  border: 1px solid #242424;
  background: #101010;
  border-radius: 12px;
  padding: 17px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-card div strong,
.breakdown-card div span {
  display: block;
}

.breakdown-card div span {
  color: #666;
  margin-top: 4px;
  font-size: 11px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 35px;
}

@media (
  max-width: 900px
) {
  .test-container {
    grid-template-columns: 1fr;
  }

  .question-sidebar {
    position: static;
  }

  .question-grid {
    grid-template-columns:
      repeat(
        10,
        1fr
      );
  }

  .score-hero {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

@media (
  max-width: 700px
) {
  .technical-container,
  .result-container {
    width: min(
      100% - 24px,
      1400px
    );
    padding-top: 24px;
  }

  .lab-hero,
  .company-hero {
    padding: 25px;
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stat,
  .company-level-count {
    text-align: left;
  }

  .company-grid,
  .levels-grid {
    grid-template-columns: 1fr;
  }

  .test-header {
    padding: 0 13px;
  }

  .test-container {
    width: calc(100% - 18px);
  }

  .question-panel {
    padding: 20px;
  }

  .question-content {
    padding: 25px 0;
  }

  .markdown-content {
    font-size: 17px;
  }

  .question-footer {
    grid-template-columns:
      1fr
      1fr;
  }

  .footer-progress {
    display: none;
  }

  .result-header {
    flex-direction: column;
  }

  .result-header h1 {
    font-size: 38px;
  }

  .result-stats {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .result-stat {
    border-bottom: 1px solid #252525;
  }

  .result-actions {
    flex-wrap: wrap;
  }

  .result-actions button {
    flex: 1;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
  }
}
`;