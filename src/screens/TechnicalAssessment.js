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
| IMPORTANT:
|
| This screen is ONLY the technical assessment flow.
|
| /technical-lab
|       -> company selector
|
| /technical-lab/:companyId/levels
|       -> selected company's levels
|
| /technical-lab/:companyId/level/:levelNumber
|       -> active proctored assessment
|
| /technical-lab/:companyId/level/:levelNumber/result
|       -> server result
|
| The backend is authoritative.
| This frontend NEVER calculates the real score.
|
|--------------------------------------------------------------------------
*/

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const STORAGE_KEY =
  "engviva_technical_attempt";

const RESULT_STORAGE_KEY =
  "engviva_technical_result";

const PROCTOR_LIMIT = 3;

/* =========================================================================
   BASIC HELPERS
========================================================================= */

function safeString(value, fallback = "") {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value);
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

  return null;
}

function normalizeId(value) {
  return safeString(value)
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");
}

function formatTime(seconds) {
  const total =
    Math.max(
      0,
      Math.floor(
        safeNumber(seconds, 0)
      )
    );

  const hours =
    Math.floor(total / 3600);

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const secs =
    total % 60;

  if (hours > 0) {
    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}`
    );
  }

  return (
    `${String(minutes).padStart(2, "0")}:` +
    `${String(secs).padStart(2, "0")}`
  );
}

/* =========================================================================
   STORAGE
========================================================================= */

function readAttempt() {
  try {
    const raw =
      sessionStorage.getItem(
        STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function saveAttempt(value) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {}
}

function clearAttempt() {
  try {
    sessionStorage.removeItem(
      STORAGE_KEY
    );
  } catch {}
}

function readStoredResult() {
  try {
    const raw =
      sessionStorage.getItem(
        RESULT_STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function saveStoredResult(value) {
  try {
    sessionStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {}
}

function clearStoredResult() {
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
      await import(
        "../firebase"
      );

    const auth =
      firebase.auth ||
      firebase.default?.auth ||
      null;

    if (
      !auth?.currentUser
    ) {
      return null;
    }

    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.warn(
      "[ENGVIVA TECH AUTH]",
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
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Request failed (${response.status})`;

    const error =
      new Error(
        safeString(
          message,
          `Request failed (${response.status})`
        )
      );

    error.status =
      response.status;

    throw error;
  }

  return payload;
}

/* =========================================================================
   FULLSCREEN
========================================================================= */

async function enterFullscreen() {
  try {
    if (
      document.fullscreenElement
    ) {
      return true;
    }

    if (
      document.documentElement &&
      document.documentElement
        .requestFullscreen
    ) {
      await document.documentElement.requestFullscreen();

      return Boolean(
        document.fullscreenElement
      );
    }
  } catch (error) {
    console.warn(
      "[ENGVIVA PROCTOR] Unable to enter fullscreen",
      error
    );
  }

  return false;
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
   MARKDOWN NORMALIZATION
========================================================================= */

/*
 * IMPORTANT:
 *
 * The dataset itself is Markdown.
 *
 * We DO NOT destroy the Markdown syntax.
 *
 * The browser renderer below understands:
 *
 * **bold**
 * `inline code`
 * ```js
 * code
 * ```
 * lists
 * headings
 * links
 *
 * This prevents the old "cleanMarkdown" logic from destroying code.
 */

function normalizeMarkdown(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/* =========================================================================
   OPTION NORMALIZATION
========================================================================= */

/*
 * THIS IS ONE OF THE IMPORTANT FIXES.
 *
 * Backend/dataset can provide:
 *
 * options: [
 *   "A",
 *   "B",
 *   "C",
 *   "D"
 * ]
 *
 * OR:
 *
 * options: {
 *   A: "...",
 *   B: "...",
 *   C: "...",
 *   D: "..."
 * }
 *
 * Previous frontend versions only accepted arrays.
 */

function normalizeOptions(value) {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        (option, index) => {
          if (
            option &&
            typeof option ===
              "object"
          ) {
            return {
              key:
                firstValue(
                  option.key,
                  option.label,
                  option.id,
                  String.fromCharCode(
                    65 + index
                  )
                ),

              text:
                normalizeMarkdown(
                  firstValue(
                    option.text,
                    option.value,
                    option.label,
                    option.answer,
                    ""
                  )
                ),
            };
          }

          return {
            key:
              String.fromCharCode(
                65 + index
              ),

            text:
              normalizeMarkdown(
                option
              ),
          };
        }
      )
      .filter(
        (option) =>
          option.text.trim()
            .length > 0
      );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.entries(
      value
    )
      .map(
        ([key, option], index) => {
          if (
            option &&
            typeof option ===
              "object"
          ) {
            return {
              key:
                firstValue(
                  option.key,
                  option.label,
                  key,
                  String.fromCharCode(
                    65 + index
                  )
                ),

              text:
                normalizeMarkdown(
                  firstValue(
                    option.text,
                    option.value,
                    option.label,
                    option.answer,
                    ""
                  )
                ),
            };
          }

          return {
            key:
              key ||
              String.fromCharCode(
                65 + index
              ),

            text:
              normalizeMarkdown(
                option
              ),
          };
        }
      )
      .filter(
        (option) =>
          option.text.trim()
            .length > 0
      );
  }

  return [];
}

/* =========================================================================
   QUESTION EXTRACTION
========================================================================= */

function extractQuestionArray(
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

  if (
    Array.isArray(
      payload?.technical?.questions
    )
  ) {
    return payload.technical.questions;
  }

  return [];
}

/* =========================================================================
   QUESTION NORMALIZER
========================================================================= */

function normalizeQuestions(
  payload
) {
  const source =
    extractQuestionArray(
      payload
    );

  return source
    .map(
      (item, index) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const id =
          safeString(
            firstValue(
              item.id,
              item.questionId,
              item._id,
              `technical-question-${index + 1}`
            )
          );

        const text =
          normalizeMarkdown(
            firstValue(
              item.question,
              item.text,
              item.questionText,
              item.prompt,
              ""
            )
          );

        const options =
          normalizeOptions(
            firstValue(
              item.options,
              item.choices,
              item.answers
            )
          );

        return {
          id,

          question:
            text,

          options,

          module:
            safeString(
              firstValue(
                item.module,
                item.moduleName,
                item.moduleId,
                item.category,
                "Technical"
              )
            ),

          difficulty:
            safeString(
              firstValue(
                item.difficulty,
                item.level,
                "Mixed"
              )
            ),

          number:
            safeNumber(
              firstValue(
                item.number,
                item.questionNumber,
                index + 1
              ),
              index + 1
            ),

          images:
            Array.isArray(
              item.images
            )
              ? item.images
              : [],

          hasImages:
            Boolean(
              item.hasImages ||
                (
                  Array.isArray(
                    item.images
                  ) &&
                  item.images.length
                )
            ),
        };
      }
    )
    .filter(
      (question) =>
        question &&
        question.id &&
        question.question &&
        question.options.length >= 2
    );
}

/* =========================================================================
   COMPANY HELPERS
========================================================================= */

function normalizeCompany(
  company,
  fallbackId = ""
) {
  if (
    !company ||
    typeof company !==
      "object"
  ) {
    return {
      id:
        normalizeId(
          fallbackId
        ),

      name:
        fallbackId ||
        "Engineering Company",

      category:
        "Technology",

      domain:
        "",

      description:
        "Technical assessment preparation",
    };
  }

  return {
    ...company,

    id:
      normalizeId(
        firstValue(
          company.id,
          company.companyId,
          company.slug,
          fallbackId
        )
      ),

    name:
      safeString(
        firstValue(
          company.name,
          company.companyName,
          company.title,
          fallbackId,
          "Engineering Company"
        )
      ),

    category:
      safeString(
        firstValue(
          company.category,
          "Technology"
        )
      ),

    domain:
      safeString(
        firstValue(
          company.domain,
          company.website,
          ""
        )
      ),

    description:
      safeString(
        firstValue(
          company.description,
          "Technical assessment preparation"
        )
      ),
  };
}

/* =========================================================================
   MAIN COMPONENT
========================================================================= */

export default function TechnicalAssessment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const params =
    useParams();

  /*
   * ONLY canonical route params.
   *
   * We intentionally do NOT inspect random pathname segments.
   *
   * This prevents the old duplicate-screen behaviour.
   */

  const companyId =
    normalizeId(
      params.companyId
    );

  const levelNumber =
    safeNumber(
      params.levelNumber,
      0
    );

  const isLevelsRoute =
    Boolean(
      companyId &&
        !levelNumber
    );

  const isRunningRoute =
    Boolean(
      companyId &&
        levelNumber &&
        !location.pathname.endsWith(
          "/result"
        )
    );

  const isResultRoute =
    location.pathname.endsWith(
      "/result"
    );

  /* =======================================================================
     STATE
  ======================================================================= */

  const [
    screen,
    setScreen,
  ] = useState(() => {
    if (isResultRoute) {
      return "result";
    }

    if (isRunningRoute) {
      return "running";
    }

    if (isLevelsRoute) {
      return "levels";
    }

    return "companies";
  });

  const [
    companies,
    setCompanies,
  ] = useState([]);

  const [
    companiesLoading,
    setCompaniesLoading,
  ] = useState(false);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(null);

  const [
    levels,
    setLevels,
  ] = useState([]);

  const [
    levelsLoading,
    setLevelsLoading,
  ] = useState(false);

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

  const violationCooldownRef =
    useRef(false);

  const routeInitializedRef =
    useRef(false);

  /* =======================================================================
     SYNC REFS
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
  }, [
    remainingSeconds,
  ]);

  useEffect(() => {
    violationsRef.current =
      violations;
  }, [violations]);

  /* =======================================================================
     COMPANY ROUTE INITIALIZATION
  ======================================================================= */

  useEffect(() => {
    if (
      routeInitializedRef.current &&
      !companyId
    ) {
      return;
    }

    if (!companyId) {
      setSelectedCompany(null);

      if (
        !isRunningRoute &&
        !isResultRoute
      ) {
        setScreen(
          "companies"
        );
      }

      return;
    }

    setSelectedCompany(
      (previous) =>
        previous?.id === companyId
          ? previous
          : normalizeCompany(
              {
                id: companyId,
                name: companyId,
              },
              companyId
            )
    );

    if (
      isResultRoute
    ) {
      setScreen("result");
    } else if (
      levelNumber
    ) {
      setScreen("running");
    } else {
      setScreen("levels");
    }

    routeInitializedRef.current =
      true;
  }, [
    companyId,
    levelNumber,
    isResultRoute,
    isRunningRoute,
  ]);

  /* =======================================================================
     LOAD COMPANIES
  ======================================================================= */

  const loadCompanies =
    useCallback(
      async () => {
        setCompaniesLoading(
          true
        );

        try {
          /*
           * Technical company discovery.
           *
           * We first use the existing technical backend.
           */

          const payload =
            await apiFetch(
              "/api/technical/companies"
            );

          const source =
            Array.isArray(
              payload?.companies
            )
              ? payload.companies
              : Array.isArray(
                  payload?.data
                )
              ? payload.data
              : Array.isArray(
                  payload?.data?.companies
                )
              ? payload.data.companies
              : [];

          const normalized =
            source
              .map(
                (item) =>
                  normalizeCompany(
                    item
                  )
              )
              .filter(
                (item) =>
                  item.id &&
                  item.name
              );

          setCompanies(
            normalized
          );
        } catch (apiError) {
          /*
           * Do NOT create fake questions.
           *
           * If company discovery endpoint is
           * unavailable, leave company list empty.
           */

          console.warn(
            "[TECHNICAL COMPANIES]",
            apiError
          );

          setCompanies([]);
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
        "companies" &&
      !companyId
    ) {
      loadCompanies();
    }
  }, [
    screen,
    companyId,
    loadCompanies,
  ]);

  /* =======================================================================
     LOAD COMPANY PROFILE
  ======================================================================= */

  const loadCompany =
    useCallback(
      async (id) => {
        if (!id) {
          return null;
        }

        try {
          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                id
              )}`
            );

          const source =
            payload?.company ||
            payload?.data?.company ||
            payload?.data ||
            payload;

          const normalized =
            normalizeCompany(
              source,
              id
            );

          if (
            normalized?.id
          ) {
            setSelectedCompany(
              normalized
            );

            return normalized;
          }
        } catch (apiError) {
          /*
           * The company details page has
           * already resolved the company.
           *
           * We don't block the assessment
           * simply because optional company
           * metadata is unavailable.
           */

          console.warn(
            "[TECHNICAL COMPANY DETAILS]",
            apiError
          );
        }

        return null;
      },
      []
    );

  useEffect(() => {
    if (
      companyId &&
      (
        screen === "levels" ||
        screen === "running" ||
        screen === "result"
      )
    ) {
      loadCompany(
        companyId
      );
    }
  }, [
    companyId,
    screen,
    loadCompany,
  ]);

  /* =======================================================================
     LOAD LEVELS
  ======================================================================= */

  const loadLevels =
    useCallback(
      async (id) => {
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
                    safeString(
                      firstValue(
                        level?.title,
                        `Level ${
                          index + 1
                        }`
                      )
                    ),

                  difficulty:
                    safeString(
                      firstValue(
                        level?.difficulty,
                        "Technical"
                      )
                    ),

                  questionCount:
                    safeNumber(
                      firstValue(
                        level?.questionCount,
                        level?.questions?.length,
                        0
                      ),
                      0
                    ),

                  estimatedMinutes:
                    safeNumber(
                      firstValue(
                        level?.estimatedMinutes,
                        0
                      ),
                      0
                    ),

                  generated:
                    level?.generated !==
                      false,
                })
              )
              .filter(
                (level) =>
                  level.level > 0
              );

          setLevels(
            normalized
          );
        } catch (apiError) {
          console.error(
            "[TECHNICAL LEVELS]",
            apiError
          );

          setLevels([]);

          setError(
            apiError.message ||
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
      screen === "levels" &&
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
     LOAD ACTUAL LEVEL QUESTIONS
  ======================================================================= */

  const loadLevelQuestions =
    useCallback(
      async (
        id,
        level
      ) => {
        /*
         * THIS IS THE VERIFIED ENDPOINT.
         *
         * We intentionally use the level endpoint
         * rather than requesting questions one-by-one.
         *
         * GET:
         * /api/technical/company/:companyId/levels/:level
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

        /*
         * If this happens, it is now a REAL
         * backend payload problem rather than
         * a frontend fallback.
         */

        if (
          normalized.length === 0
        ) {
          const raw =
            extractQuestionArray(
              payload
            );

          console.error(
            "[TECHNICAL QUESTIONS EMPTY]",
            {
              payload,
              rawQuestionCount:
                raw.length,
            }
          );

          throw new Error(
            "The server returned no usable MCQ questions for this level."
          );
        }

        return {
          questions:
            normalized,

          payload,
        };
      },
      []
    );

  /* =======================================================================
     ENTER COMPANY
  ======================================================================= */

  const openCompany =
    useCallback(
      (company) => {
        const id =
          normalizeId(
            firstValue(
              company?.id,
              company?.companyId,
              company?.slug
            )
          );

        if (!id) {
          return;
        }

        /*
         * ONLY canonical technical route.
         *
         * This prevents:
         *
         * CompanyDetails
         * -> TechnicalLab
         * -> TechnicalAssessment
         * -> duplicate company page
         *
         * Instead:
         *
         * CompanyDetails
         * -> /technical-lab/google/levels
         */

        setSelectedCompany(
          normalizeCompany(
            company,
            id
          )
        );

        setLevels([]);

        setQuestions([]);

        setAnswers({});

        setResult(null);

        setError("");

        setScreen("levels");

        navigate(
          `/technical-lab/${encodeURIComponent(
            id
          )}/levels`,
          {
            replace: false,
          }
        );
      },
      [navigate]
    );

  /* =======================================================================
     GO TO COMPANY LIST
  ======================================================================= */

  const goCompanies =
    useCallback(
      async () => {
        await exitFullscreen();

        clearAttempt();

        clearStoredResult();

        setQuestions([]);

        setAnswers({});

        answersRef.current =
          {};

        setResult(null);

        setAttemptId(null);

        setSelectedCompany(
          null
        );

        setLevels([]);

        setViolations([]);

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
      },
      [navigate]
    );

  /* =======================================================================
     GO LEVELS
  ======================================================================= */

  const goLevels =
    useCallback(
      async (id = companyId) => {
        const normalized =
          normalizeId(id);

        if (!normalized) {
          await goCompanies();
          return;
        }

        await exitFullscreen();

        clearAttempt();

        clearStoredResult();

        setQuestions([]);

        setAnswers({});

        answersRef.current =
          {};

        setResult(null);

        setAttemptId(null);

        setViolations([]);

        setProctorWarning("");

        setProctorLocked(
          false
        );

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
        companyId,
        goCompanies,
        navigate,
      ]
    );

  /* =======================================================================
     START LEVEL
  ======================================================================= */

  const startLevel =
    useCallback(
      async (level) => {
        if (
          !selectedCompany ||
          loadingTest ||
          submitting
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
            "This technical level has an invalid level number."
          );

          return;
        }

        setLoadingTest(
          true
        );

        setError("");

        /*
         * Request fullscreen directly from
         * the Start button click.
         */

        await enterFullscreen();

        try {
          /*
           * STEP 1:
           * Load REAL server questions.
           */

          const questionData =
            await loadLevelQuestions(
              selectedCompany.id,
              number
            );

          const normalized =
            questionData.questions;

          /*
           * STEP 2:
           * Create REAL authenticated attempt.
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
              "The server did not return an assessment attempt ID."
            );
          }

          /*
           * STEP 3:
           * Duration.
           */

          const durationMinutes =
            Math.max(
              1,
              safeNumber(
                firstValue(
                  attempt?.estimatedMinutes,
                  attempt?.level?.estimatedMinutes,
                  level?.estimatedMinutes,
                  Math.ceil(
                    normalized.length *
                      1.5
                  )
                ),
                60
              )
            );

          const allowedSeconds =
            Math.max(
              60,
              Math.round(
                durationMinutes *
                  60
              )
            );

          const now =
            new Date().toISOString();

          /*
           * STEP 4:
           * Browser recovery state.
           *
           * This is NOT authoritative scoring.
           */

          const session = {
            attemptId:
              String(id),

            companyId:
              selectedCompany.id,

            companyName:
              selectedCompany.name,

            levelNumber:
              number,

            startedAt:
              now,

            timeAllowed:
              allowedSeconds,

            questions:
              normalized,

            answers: {},

            currentIndex:
              0,

            violations: [],
          };

          saveAttempt(
            session
          );

          clearStoredResult();

          answersRef.current =
            {};

          violationsRef.current =
            [];

          setAttemptId(
            String(id)
          );

          setSelectedLevel(
            number
          );

          setQuestions(
            normalized
          );

          setAnswers({});

          setCurrentIndex(
            0
          );

          setStartedAt(
            now
          );

          setTimeAllowed(
            allowedSeconds
          );

          setRemainingSeconds(
            allowedSeconds
          );

          remainingRef.current =
            allowedSeconds;

          setViolations([]);

          setProctorWarning("");

          setProctorLocked(
            false
          );

          setResult(null);

          setShowSubmit(
            false
          );

          setScreen("running");

          /*
           * Canonical active attempt URL.
           *
           * We use the attempt ID so refresh/recovery
           * cannot accidentally start another attempt.
           */

          navigate(
            `/technical-lab/${encodeURIComponent(
              selectedCompany.id
            )}/level/${number}/attempt/${encodeURIComponent(
              id
            )}`,
            {
              replace: true,
            }
          );
        } catch (apiError) {
          console.error(
            "[TECHNICAL START]",
            apiError
          );

          await exitFullscreen();

          setError(
            apiError.message ||
              "Unable to start technical assessment."
          );

          setScreen(
            "levels"
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
        submitting,
        loadLevelQuestions,
        navigate,
      ]
    );

  /*
   * The router may not explicitly declare /attempt/:attemptId.
   * React Router still needs the route declaration to render this
   * component. The current App route should therefore include it.
   */

  /* =======================================================================
     SELECTED LEVEL
  ======================================================================= */

  const selectedLevel =
    useMemo(
      () =>
        levels.find(
          (level) =>
            safeNumber(
              firstValue(
                level?.level,
                level?.levelNumber
              )
            ) ===
            levelNumber
        ) || null,
      [
        levels,
        levelNumber,
      ]
    );

  /* =======================================================================
     RESTORE ATTEMPT
  ======================================================================= */

  useEffect(() => {
    if (
      !companyId ||
      !levelNumber ||
      isResultRoute ||
      screen !== "running"
    ) {
      return;
    }

    /*
     * If questions already exist, this is
     * the normal newly-started flow.
     */

    if (
      questions.length > 0
    ) {
      return;
    }

    const saved =
      readAttempt();

    if (
      !saved ||
      String(
        saved.companyId
      ) !==
        String(companyId) ||
      safeNumber(
        saved.levelNumber
      ) !==
        levelNumber
    ) {
      /*
       * No recoverable attempt.
       * Never invent questions.
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

    const savedQuestions =
      normalizeQuestions(
        saved.questions || []
      );

    if (
      savedQuestions.length === 0
    ) {
      clearAttempt();

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

    const elapsed =
      Number.isFinite(started)
        ? Math.max(
            0,
            Math.floor(
              (
                Date.now() -
                started
              ) /
                1000
            )
          )
        : 0;

    const allowed =
      safeNumber(
        saved.timeAllowed,
        0
      );

    const remaining =
      Math.max(
        0,
        allowed - elapsed
      );

    setAttemptId(
      String(
        saved.attemptId
      )
    );

    setSelectedCompany(
      normalizeCompany(
        {
          id:
            saved.companyId,

          name:
            saved.companyName ||
            saved.companyId,
        },
        saved.companyId
      )
    );

    setSelectedLevel(
      safeNumber(
        saved.levelNumber
      )
    );

    setQuestions(
      savedQuestions
    );

    const recoveredAnswers =
      saved.answers &&
      typeof saved.answers ===
        "object"
        ? saved.answers
        : {};

    setAnswers(
      recoveredAnswers
    );

    answersRef.current =
      recoveredAnswers;

    setCurrentIndex(
      Math.min(
        safeNumber(
          saved.currentIndex,
          0
        ),
        Math.max(
          0,
          savedQuestions.length -
            1
        )
      )
    );

    setStartedAt(
      saved.startedAt
    );

    setTimeAllowed(
      allowed
    );

    setRemainingSeconds(
      remaining
    );

    remainingRef.current =
      remaining;

    setViolations(
      Array.isArray(
        saved.violations
      )
        ? saved.violations
        : []
    );

    if (
      remaining <= 0
    ) {
      setTimeout(
        () =>
          submitRef.current?.(
            true,
            "TIME_EXPIRED"
          ),
        0
      );
    }
  }, [
    companyId,
    levelNumber,
    isResultRoute,
    screen,
    questions.length,
    navigate,
  ]);

  /* =======================================================================
     PERSIST SESSION
  ======================================================================= */

  useEffect(() => {
    if (
      screen !== "running" ||
      !attemptId ||
      questions.length === 0
    ) {
      return;
    }

    saveAttempt({
      attemptId,

      companyId:
        selectedCompany?.id ||
        companyId,

      companyName:
        selectedCompany?.name ||
        companyId,

      levelNumber,

      startedAt,

      timeAllowed,

      questions,

      answers,

      currentIndex,

      violations,
    });
  }, [
    screen,
    attemptId,
    companyId,
    selectedCompany,
    levelNumber,
    startedAt,
    timeAllowed,
    questions,
    answers,
    currentIndex,
    violations,
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
          screen !== "running" ||
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

            return next;
          }
        );
      },
      [
        screen,
        submitting,
        proctorLocked,
      ]
    );

  /* =======================================================================
     SUBMIT ASSESSMENT
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
                      selectedCompany?.id ||
                      companyId,

                    levelNumber,

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
                      Boolean(
                        automatic
                      ),

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
                        Boolean(
                          proctorLocked
                        ),
                    },
                  }),
              }
            );

          /*
           * BACKEND RESULT IS AUTHORITATIVE.
           */

          const finalResult =
            payload?.data ??
            payload;

          if (
            !finalResult ||
            typeof finalResult !==
              "object"
          ) {
            throw new Error(
              "The server returned an invalid assessment result."
            );
          }

          setResult(
            finalResult
          );

          saveStoredResult(
            finalResult
          );

          clearAttempt();

          setScreen(
            "result"
          );

          navigate(
            `/technical-lab/${encodeURIComponent(
              selectedCompany?.id ||
                companyId
            )}/level/${levelNumber}/result`,
            {
              replace: true,
            }
          );

          await exitFullscreen();
        } catch (apiError) {
          console.error(
            "[TECHNICAL SUBMIT]",
            apiError
          );

          setError(
            apiError.message ||
              "Unable to submit technical assessment."
          );
        } finally {
          submittingRef.current =
            false;

          setSubmitting(
            false
          );
        }
      },
      [
        companyId,
        levelNumber,
        selectedCompany,
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

  /* =======================================================================
     TIMER
  ======================================================================= */

  useEffect(() => {
    if (
      screen !== "running" ||
      !attemptId
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

            if (
              next === 0
            ) {
              clearInterval(
                timerRef.current
              );

              setTimeout(
                () =>
                  submitRef.current?.(
                    true,
                    "TIME_EXPIRED"
                  ),
                0
              );
            }

            return next;
          }
        );
      }, 1000);

    return () => {
      clearInterval(
        timerRef.current
      );
    };
  }, [
    screen,
    attemptId,
  ]);

  /* =======================================================================
     PROCTORING VIOLATION
  ======================================================================= */

  const addViolation =
    useCallback(
      (
        type,
        detail
      ) => {
        if (
          screen !== "running" ||
          submittingRef.current
        ) {
          return;
        }

        if (
          violationCooldownRef.current
        ) {
          return;
        }

        violationCooldownRef.current =
          true;

        const violation = {
          type,

          detail:
            detail ||
            "Proctoring rule triggered.",

          at:
            new Date().toISOString(),
        };

        const nextViolations =
          [
            ...violationsRef.current,
            violation,
          ];

        violationsRef.current =
          nextViolations;

        setViolations(
          nextViolations
        );

        setProctorWarning(
          detail ||
            "Proctoring rule triggered."
        );

        if (
          nextViolations.length >=
          PROCTOR_LIMIT
        ) {
          setProctorLocked(
            true
          );

          setTimeout(
            () =>
              submitRef.current?.(
                true,
                "PROCTORING_VIOLATION_LIMIT"
              ),
            0
          );
        }

        setTimeout(
          () => {
            violationCooldownRef.current =
              false;
          },
          800
        );
      },
      [screen]
    );

  /* =======================================================================
     TAB / WINDOW MONITOR
  ======================================================================= */

  useEffect(() => {
    if (
      screen !== "running"
    ) {
      return undefined;
    }

    const onVisibility =
      () => {
        if (
          document.hidden
        ) {
          addViolation(
            "TAB_SWITCH",
            "Tab or browser window change detected."
          );
        }
      };

    const onBlur =
      () => {
        addViolation(
          "WINDOW_BLUR",
          "The assessment window lost focus."
        );
      };

    const onFullscreenChange =
      () => {
        if (
          !document.fullscreenElement &&
          !submittingRef.current
        ) {
          addViolation(
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
      onFullscreenChange
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
        onFullscreenChange
      );
    };
  }, [
    screen,
    addViolation,
  ]);

  /* =======================================================================
     NAVIGATION
  ======================================================================= */

  const nextQuestion =
    useCallback(
      () => {
        setCurrentIndex(
          (index) =>
            Math.min(
              questions.length - 1,
              index + 1
            )
        );
      },
      [questions.length]
    );

  const previousQuestion =
    useCallback(
      () => {
        setCurrentIndex(
          (index) =>
            Math.max(
              0,
              index - 1
            )
        );
      },
      []
    );

  const jumpQuestion =
    useCallback(
      (index) => {
        setCurrentIndex(
          Math.max(
            0,
            Math.min(
              questions.length - 1,
              index
            )
          )
        );
      },
      [questions.length]
    );

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

  const company =
    selectedCompany ||
    normalizeCompany(
      {
        id:
          companyId,

        name:
          companyId ||
          "Technical Assessment",
      },
      companyId
    );

  const currentQuestion =
    questions[
      currentIndex
    ] || null;

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
    questions.length > 0
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

  const durationMinutes =
    Math.max(
      1,
      Math.ceil(
        timeAllowed / 60
      )
    );

  /* =======================================================================
     RESULT
  ======================================================================= */

  if (
    screen === "result" ||
    isResultRoute
  ) {
    const finalResult =
      result ||
      readStoredResult();

    if (
      !finalResult
    ) {
      return (
        <Page>
          <LoadingBlock
            text="Loading assessment result..."
          />
        </Page>
      );
    }

    const score =
      safeNumber(
        firstValue(
          finalResult.percentage,
          finalResult.score,
          0
        )
      );

    const total =
      safeNumber(
        firstValue(
          finalResult.totalQuestions,
          questions.length,
          0
        )
      );

    const correct =
      safeNumber(
        finalResult.correctAnswers,
        0
      );

    const incorrect =
      safeNumber(
        finalResult.incorrectAnswers,
        0
      );

    const answered =
      safeNumber(
        finalResult.answeredQuestions,
        correct +
          incorrect
      );

    const unanswered =
      safeNumber(
        finalResult.unansweredQuestions,
        Math.max(
          0,
          total -
            answered
        )
      );

    const performance =
      safeString(
        firstValue(
          finalResult.performance,
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
        )
      );

    return (
      <Page>
        <header className="technical-header">
          <button
            className="header-back"
            onClick={() =>
              goLevels(
                firstValue(
                  finalResult.companyId,
                  company.id
                )
              )
            }
          >
            ←
          </button>

          <div className="brand-block">
            <span className="brand-name">
              ENGVIVA
            </span>

            <span className="brand-caption">
              TECHNICAL INTELLIGENCE
            </span>
          </div>

          <div className="header-status">
            COMPLETED
          </div>
        </header>

        <main className="result-container">
          <section className="result-card">
            <span className="result-kicker">
              TECHNICAL ASSESSMENT
            </span>

            <h1>
              Assessment complete.
            </h1>

            <p className="result-company">
              {firstValue(
                finalResult.companyName,
                company.name
              )}
              {" · "}
              Level{" "}
              {firstValue(
                finalResult.levelNumber,
                levelNumber
              )}
            </p>

            <div className="score-ring">
              <strong>
                {score}%
              </strong>

              <span>
                {performance}
              </span>
            </div>

            <div className="result-stats">
              <ResultStat
                value={total}
                label="QUESTIONS"
              />

              <ResultStat
                value={correct}
                label="CORRECT"
              />

              <ResultStat
                value={incorrect}
                label="INCORRECT"
              />

              <ResultStat
                value={unanswered}
                label="UNANSWERED"
              />
            </div>

            <div className="result-meta-grid">
              <div>
                <span>
                  ACCURACY
                </span>

                <strong>
                  {safeNumber(
                    finalResult.accuracy,
                    0
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>
                  PROCTORING
                </span>

                <strong>
                  {safeString(
                    finalResult?.proctoring
                      ?.status,
                    "completed"
                  ).toUpperCase()}
                </strong>
              </div>

              <div>
                <span>
                  ATTEMPT
                </span>

                <strong>
                  {safeString(
                    finalResult.attemptId ||
                      attemptId ||
                      "—"
                  ).slice(
                    0,
                    16
                  )}
                </strong>
              </div>
            </div>

            <div className="result-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  goLevels(
                    firstValue(
                      finalResult.companyId,
                      company.id
                    )
                  )
                }
              >
                BACK TO LEVELS
              </button>

              <button
                className="primary-button"
                onClick={() => {
                  clearStoredResult();

                  const retryLevel =
                    levels.find(
                      (item) =>
                        safeNumber(
                          firstValue(
                            item.level,
                            item.levelNumber
                          )
                        ) ===
                        safeNumber(
                          firstValue(
                            finalResult.levelNumber,
                            levelNumber
                          )
                        )
                    );

                  if (
                    retryLevel
                  ) {
                    startLevel(
                      retryLevel
                    );
                  } else {
                    goLevels(
                      firstValue(
                        finalResult.companyId,
                        company.id
                      )
                    );
                  }
                }}
              >
                RETAKE LEVEL
              </button>

              <button
                className="secondary-button"
                onClick={() =>
                  navigate(
                    "/dashboard",
                    {
                      replace: true,
                    }
                  )
                }
              >
                DASHBOARD
              </button>
            </div>
          </section>
        </main>
      </Page>
    );
  }

  /* =======================================================================
     RUNNING TEST
  ======================================================================= */

  if (
    screen === "running" ||
    isRunningRoute
  ) {
    if (
      !currentQuestion
    ) {
      return (
        <Page>
          <LoadingBlock
            text="Loading secure technical assessment..."
          />

          {error && (
            <div className="error-floating">
              {error}

              <button
                onClick={() =>
                  goLevels(
                    company.id
                  )
                }
              >
                BACK TO LEVELS
              </button>
            </div>
          )}
        </Page>
      );
    }

    const timerDanger =
      remainingSeconds <= 60;

    return (
      <div className="technical-page exam-page">
        <style>
          {TECHNICAL_CSS}
        </style>

        <header className="exam-header">
          <div className="exam-brand">
            <CompanyLogo
              company={company}
            />

            <div>
              <strong>
                {company.name}
              </strong>

              <span>
                LEVEL {levelNumber}
              </span>
            </div>
          </div>

          <div className="exam-header-center">
            <span>
              PROCTORED TECHNICAL ASSESSMENT
            </span>

            <div className="exam-progress">
              <div
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div
            className={`exam-timer ${
              timerDanger
                ? "timer-danger"
                : ""
            }`}
          >
            {formatTime(
              remainingSeconds
            )}
          </div>
        </header>

        <main className="test-container">
          <div className="proctor-bar">
            <div>
              <span className="proctor-dot" />

              <strong>
                PROCTORING ACTIVE
              </strong>
            </div>

            <span>
              Fullscreen · Tab monitoring ·
              Server evaluation
            </span>

            <span>
              {answeredCount}/
              {questions.length}
              {" "}ANSWERED
            </span>
          </div>

          {proctorWarning &&
            !proctorLocked && (
              <div className="warning">
                <strong>
                  PROCTORING FLAG
                </strong>

                <span>
                  {proctorWarning}
                </span>
              </div>
            )}

          <div className="question-layout">
            <aside className="question-sidebar">
              <div className="sidebar-title">
                QUESTIONS
              </div>

              <div className="question-grid">
                {questions.map(
                  (
                    question,
                    index
                  ) => {
                    const answered =
                      answers[
                        question.id
                      ] !== undefined;

                    return (
                      <button
                        key={
                          question.id
                        }
                        className={[
                          "question-number",
                          index ===
                            currentIndex
                            ? "active"
                            : "",
                          answered
                            ? "answered"
                            : "",
                        ].join(" ")}
                        onClick={() =>
                          jumpQuestion(
                            index
                          )
                        }
                        disabled={
                          proctorLocked ||
                          submitting
                        }
                      >
                        {index + 1}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="sidebar-summary">
                <span>
                  ANSWERED
                </span>

                <strong>
                  {answeredCount}
                </strong>

                <span>
                  REMAINING
                </span>

                <strong>
                  {unansweredCount}
                </strong>
              </div>
            </aside>

            <section className="question-card">
              <div className="question-meta">
                <span className="question-number-label">
                  QUESTION{" "}
                  {currentIndex + 1}
                  {" / "}
                  {questions.length}
                </span>

                <span>
                  {currentQuestion.module}
                  {" · "}
                  {
                    currentQuestion.difficulty
                  }
                </span>
              </div>

              <MarkdownBlock
                content={
                  currentQuestion.question
                }
              />

              <QuestionImages
                question={
                  currentQuestion
                }
              />

              <div className="options-list">
                {currentQuestion.options.map(
                  (
                    option,
                    optionIndex
                  ) => {
                    const selected =
                      currentAnswer ===
                      optionIndex;

                    return (
                      <button
                        key={`${currentQuestion.id}-${optionIndex}`}
                        className={`option-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          chooseAnswer(
                            currentQuestion.id,
                            optionIndex
                          )
                        }
                        disabled={
                          proctorLocked ||
                          submitting
                        }
                      >
                        <span className="option-letter">
                          {safeString(
                            option.key,
                            String.fromCharCode(
                              65 +
                                optionIndex
                            )
                          )}
                        </span>

                        <div className="option-content">
                          <MarkdownBlock
                            content={
                              option.text
                            }
                          />
                        </div>

                        <span
                          className={`option-check ${
                            selected
                              ? "visible"
                              : ""
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="question-footer">
                <button
                  className="secondary-button"
                  onClick={
                    previousQuestion
                  }
                  disabled={
                    currentIndex ===
                      0 ||
                    proctorLocked ||
                    submitting
                  }
                >
                  ← PREVIOUS
                </button>

                <div className="save-status">
                  {currentAnswer !==
                  undefined
                    ? "ANSWER SAVED"
                    : "SELECT AN ANSWER"}
                </div>

                {currentIndex <
                questions.length -
                  1 ? (
                  <button
                    className="primary-button"
                    onClick={
                      nextQuestion
                    }
                    disabled={
                      proctorLocked ||
                      submitting
                    }
                  >
                    NEXT →
                  </button>
                ) : (
                  <button
                    className="primary-button finish-button"
                    onClick={() =>
                      setShowSubmit(
                        true
                      )
                    }
                    disabled={
                      proctorLocked ||
                      submitting
                    }
                  >
                    FINISH TEST
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>

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
                Assessment terminated.
              </h2>

              <p>
                The maximum proctoring
                violation limit was reached.
                Your attempt is being
                submitted with its complete
                audit.
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

  /* =======================================================================
     LEVELS
  ======================================================================= */

  if (
    screen === "levels"
  ) {
    return (
      <Page>
        <header className="technical-header">
          <button
            className="header-back"
            onClick={() =>
              goCompanies()
            }
          >
            ←
          </button>

          <div className="brand-block">
            <span className="brand-name">
              ENGVIVA
            </span>

            <span className="brand-caption">
              TECHNICAL INTELLIGENCE
            </span>
          </div>

          <div className="header-status">
            SERVER DATASET
          </div>
        </header>

        <main className="technical-main">
          <section className="company-hero">
            <CompanyLogo
              company={company}
              large
            />

            <div>
              <span className="eyebrow">
                {safeString(
                  company.category,
                  "TECHNOLOGY"
                ).toUpperCase()}
              </span>

              <h1>
                {company.name}
              </h1>

              <p>
                Select a technical level.
                Questions are loaded from
                the configured server dataset.
              </p>
            </div>

            <div className="company-level-count">
              <strong>
                {levels.length || "—"}
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
                  company.id
                )
              }
            />
          )}

          {levelsLoading ? (
            <LoadingBlock
              text="Loading technical levels..."
            />
          ) : (
            <section className="levels-section">
              <div className="section-heading">
                <div>
                  <span>
                    TECHNICAL DATASET
                  </span>

                  <h2>
                    Choose your level
                  </h2>
                </div>

                <span>
                  PROCTORED
                </span>
              </div>

              {levels.length ===
              0 ? (
                <div className="empty-state">
                  <strong>
                    No technical levels
                    available.
                  </strong>

                  <p>
                    The backend currently has
                    no usable technical levels
                    for this company.
                  </p>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      loadLevels(
                        company.id
                      )
                    }
                  >
                    RETRY
                  </button>
                </div>
              ) : (
                <div className="levels-grid">
                  {levels.map(
                    (
                      level
                    ) => {
                      const number =
                        safeNumber(
                          firstValue(
                            level.level,
                            level.levelNumber
                          )
                        );

                      const count =
                        safeNumber(
                          level.questionCount,
                          0
                        );

                      const minutes =
                        safeNumber(
                          level.estimatedMinutes,
                          0
                        );

                      return (
                        <button
                          key={`${company.id}-${number}`}
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
                          <span className="level-number">
                            LEVEL{" "}
                            {number}
                          </span>

                          <h3>
                            {level.title}
                          </h3>

                          <p>
                            Server-generated
                            technical assessment
                            using the configured
                            engineering dataset.
                          </p>

                          <div className="level-meta">
                            <span>
                              {level.difficulty}
                            </span>

                            <span>
                              {count} QUESTIONS
                            </span>

                            {minutes >
                              0 && (
                              <span>
                                {minutes} MIN
                              </span>
                            )}
                          </div>

                          <div className="level-action">
                            {loadingTest
                              ? "STARTING..."
                              : "START LEVEL →"}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </Page>
    );
  }

  /* =======================================================================
     COMPANY SELECTOR
  ======================================================================= */

  return (
    <Page>
      <header className="technical-header">
        <button
          className="header-back"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          ←
        </button>

        <div className="brand-block">
          <span className="brand-name">
            ENGVIVA
          </span>

          <span className="brand-caption">
            TECHNICAL INTELLIGENCE
          </span>
        </div>

        <div className="header-status">
          TECHNICAL LAB
        </div>
      </header>

      <main className="technical-main">
        <section className="technical-hero">
          <span className="eyebrow">
            ENGINEERING ASSESSMENT
          </span>

          <h1>
            Technical Lab
          </h1>

          <p>
            Choose a company to access its
            server-generated technical
            assessment levels.
          </p>
        </section>

        {companiesLoading ? (
          <LoadingBlock
            text="Loading technical companies..."
          />
        ) : companies.length ===
          0 ? (
          <div className="empty-state">
            <strong>
              No technical companies
              available.
            </strong>

            <p>
              The technical company discovery
              endpoint did not return any
              companies.
            </p>

            <button
              className="secondary-button"
              onClick={
                loadCompanies
              }
            >
              RETRY
            </button>
          </div>
        ) : (
          <section className="companies-section">
            <div className="section-heading">
              <div>
                <span>
                  COMPANY DATASET
                </span>

                <h2>
                  Choose company
                </h2>
              </div>
            </div>

            <div className="companies-grid">
              {companies.map(
                (item) => (
                  <CompanyCard
                    key={item.id}
                    company={item}
                    onClick={() =>
                      openCompany(
                        item
                      )
                    }
                  />
                )
              )}
            </div>
          </section>
        )}
      </main>
    </Page>
  );
}

/* =========================================================================
   PAGE
========================================================================= */

function Page({
  children,
}) {
  return (
    <div className="technical-page">
      <style>
        {TECHNICAL_CSS}
      </style>

      {children}
    </div>
  );
}

/* =========================================================================
   MARKDOWN RENDERER
========================================================================= */

function MarkdownBlock({
  content,
}) {
  const markdown =
    normalizeMarkdown(
      content
    );

  if (!markdown) {
    return null;
  }

  /*
   * Lightweight Markdown renderer.
   *
   * No extra package is required.
   *
   * It specifically preserves fenced code blocks
   * instead of stripping backticks.
   */

  const blocks =
    parseMarkdownBlocks(
      markdown
    );

  return (
    <div className="markdown-content">
      {blocks.map(
        (
          block,
          index
        ) => {
          if (
            block.type ===
            "code"
          ) {
            return (
              <pre
                className="markdown-code"
                key={index}
              >
                <code>
                  {
                    block.content
                  }
                </code>
              </pre>
            );
          }

          if (
            block.type ===
            "heading"
          ) {
            return (
              <h4
                key={index}
              >
                {
                  renderInlineMarkdown(
                    block.content
                  )
                }
              </h4>
            );
          }

          if (
            block.type ===
            "list"
          ) {
            return (
              <ul
                key={index}
              >
                {block.items.map(
                  (
                    item,
                    itemIndex
                  ) => (
                    <li
                      key={
                        itemIndex
                      }
                    >
                      {
                        renderInlineMarkdown(
                          item
                        )
                      }
                    </li>
                  )
                )}
              </ul>
            );
          }

          if (
            block.type ===
            "image"
          ) {
            return (
              <div
                className="markdown-image-note"
                key={index}
              >
                {
                  block.alt
                }
              </div>
            );
          }

          return (
            <p
              key={index}
            >
              {
                renderInlineMarkdown(
                  block.content
                )
              }
            </p>
          );
        }
      )}
    </div>
  );
}

/* =========================================================================
   MARKDOWN PARSER
========================================================================= */

function parseMarkdownBlocks(
  markdown
) {
  const lines =
    markdown.split(
      "\n"
    );

  const blocks = [];

  let paragraph = [];

  let listItems = [];

  let codeLines = [];

  let inCode = false;

  let codeLanguage = "";

  const flushParagraph =
    () => {
      if (
        paragraph.length
      ) {
        blocks.push({
          type:
            "paragraph",

          content:
            paragraph.join(
              "\n"
            ),
        });

        paragraph = [];
      }
    };

  const flushList =
    () => {
      if (
        listItems.length
      ) {
        blocks.push({
          type:
            "list",

          items:
            listItems,
        });

        listItems = [];
      }
    };

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      lines[i];

    const fence =
      line.match(
        /^\s*```(.*)$/
      );

    if (fence) {
      if (!inCode) {
        flushParagraph();
        flushList();

        inCode = true;

        codeLanguage =
          safeString(
            fence[1]
          ).trim();

        codeLines = [];
      } else {
        blocks.push({
          type:
            "code",

          language:
            codeLanguage,

          content:
            codeLines.join(
              "\n"
            ),
        });

        inCode = false;

        codeLanguage =
          "";

        codeLines = [];
      }

      continue;
    }

    if (inCode) {
      codeLines.push(
        line
      );

      continue;
    }

    if (
      !line.trim()
    ) {
      flushParagraph();
      flushList();

      continue;
    }

    const heading =
      line.match(
        /^\s*#{1,6}\s+(.*)$/
      );

    if (heading) {
      flushParagraph();
      flushList();

      blocks.push({
        type:
          "heading",

        content:
          heading[1],
      });

      continue;
    }

    const list =
      line.match(
        /^\s*[-*+]\s+(.*)$/
      );

    if (list) {
      flushParagraph();

      listItems.push(
        list[1]
      );

      continue;
    }

    /*
     * Markdown checkbox.
     */

    const checkbox =
      line.match(
        /^\s*[-*+]\s+\[[ xX]\]\s+(.*)$/
      );

    if (checkbox) {
      flushParagraph();

      listItems.push(
        checkbox[1]
      );

      continue;
    }

    /*
     * Markdown image.
     */

    const image =
      line.match(
        /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/
      );

    if (image) {
      flushParagraph();
      flushList();

      blocks.push({
        type:
          "image",

        alt:
          image[1] ||
          "Question image",
      });

      continue;
    }

    paragraph.push(
      line
    );
  }

  if (inCode) {
    blocks.push({
      type:
        "code",

      language:
        codeLanguage,

      content:
        codeLines.join(
          "\n"
        ),
    });
  }

  flushParagraph();

  flushList();

  return blocks;
}

/* =========================================================================
   INLINE MARKDOWN
========================================================================= */

function renderInlineMarkdown(
  value
) {
  const text =
    safeString(value);

  const tokens = [];

  let remaining =
    text;

  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;

  let match;

  let lastIndex = 0;

  while (
    (match =
      pattern.exec(
        remaining
      ))
  ) {
    if (
      match.index >
      lastIndex
    ) {
      tokens.push(
        remaining.slice(
          lastIndex,
          match.index
        )
      );
    }

    const token =
      match[0];

    if (
      token.startsWith(
        "`"
      )
    ) {
      tokens.push(
        <code
          key={
            `inline-${tokens.length}`
          }
          className="markdown-inline-code"
        >
          {token.slice(
            1,
            -1
          )}
        </code>
      );
    } else if (
      token.startsWith(
        "**"
      )
    ) {
      tokens.push(
        <strong
          key={
            `bold-${tokens.length}`
          }
        >
          {token.slice(
            2,
            -2
          )}
        </strong>
      );
    } else if (
      token.startsWith(
        "*"
      )
    ) {
      tokens.push(
        <em
          key={
            `italic-${tokens.length}`
          }
        >
          {token.slice(
            1,
            -1
          )}
        </em>
      );
    } else if (
      token.startsWith(
        "["
      )
    ) {
      tokens.push(
        <span
          key={
            `link-${tokens.length}`
          }
          className="markdown-link"
          title={
            match[3] ||
            ""
          }
        >
          {match[2]}
        </span>
      );
    }

    lastIndex =
      pattern.lastIndex;
  }

  if (
    lastIndex <
    remaining.length
  ) {
    tokens.push(
      remaining.slice(
        lastIndex
      )
    );
  }

  return tokens;
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
            "Company"
          }
          onError={(event) => {
            event.currentTarget.style.display =
              "none";
          }}
        />
      ) : (
        <span>
          {safeString(
            company?.name,
            "E"
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
          {safeString(
            company?.category,
            "TECHNOLOGY"
          ).toUpperCase()}
        </span>

        <h3>
          {company?.name}
        </h3>

        <p>
          {company?.description ||
            "Technical assessment preparation"}
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
    question.images.length ===
      0
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
            typeof image ===
            "string"
              ? image
              : firstValue(
                  image?.url,
                  image?.src,
                  image?.path
                );

          if (!source) {
            return null;
          }

          return (
            <img
              key={index}
              src={source}
              alt={`Question visual ${
                index + 1
              }`}
              loading="lazy"
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
  );
}

/* =========================================================================
   RESULT STAT
========================================================================= */

function ResultStat({
  value,
  label,
}) {
  return (
    <div className="result-stat">
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

/* =========================================================================
   ERROR
========================================================================= */

function ErrorBanner({
  message,
  onRetry,
}) {
  return (
    <div className="error-banner">
      <div>
        <strong>
          Technical Lab Error
        </strong>

        <span>
          {message}
        </span>
      </div>

      {onRetry && (
        <button
          className="secondary-button"
          onClick={
            onRetry
          }
        >
          RETRY
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   LOADING
========================================================================= */

function LoadingBlock({
  text,
}) {
  return (
    <div className="loading-block">
      <div className="loader-ring" />

      <strong>
        {text}
      </strong>
    </div>
  );
}

/* =========================================================================
   SUBMIT MODAL
========================================================================= */

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
          SUBMIT ASSESSMENT
        </span>

        <h2>
          Finish this level?
        </h2>

        <p>
          Your answers will be sent to
          the ENGVIVA server for final
          evaluation.
        </p>

        <div className="submit-summary">
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
              {formatTime(
                time
              )}
            </strong>

            <span>
              REMAINING
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={
              onCancel
            }
            disabled={
              submitting
            }
          >
            CONTINUE TEST
          </button>

          <button
            className="primary-button"
            onClick={
              onSubmit
            }
            disabled={
              submitting
            }
          >
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT TEST"}
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

.technical-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 15% 10%,
      rgba(180, 150, 255, .12),
      transparent 32%
    ),
    radial-gradient(
      circle at 85% 80%,
      rgba(140, 110, 230, .10),
      transparent 30%
    ),
    #08070d;
  color: #f3efff;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.technical-header {
  height: 78px;
  padding: 0 28px;
  border-bottom:
    1px solid rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background:
    rgba(10,8,17,.86);
  backdrop-filter:
    blur(18px);
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-back {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 12px;
  background: rgba(255,255,255,.04);
  color: #eee8ff;
  font-size: 22px;
  cursor: pointer;
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-name {
  font-size: 17px;
  font-weight: 950;
  letter-spacing: .16em;
}

.brand-caption {
  font-size: 9px;
  color: #958ba8;
  letter-spacing: .18em;
  font-weight: 800;
}

.header-status {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .14em;
  color: #bba7ff;
}

.technical-main {
  width: min(1250px, calc(100% - 40px));
  margin: 0 auto;
  padding: 54px 0 90px;
}

.technical-hero {
  padding: 25px 0 48px;
  max-width: 760px;
}

.eyebrow,
.section-heading > div > span,
.result-kicker {
  color: #bca8ff;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .17em;
}

.technical-hero h1 {
  font-size:
    clamp(46px, 7vw, 82px);
  line-height: .94;
  letter-spacing: -.055em;
  margin: 13px 0 22px;
}

.technical-hero p {
  color: #a49bac;
  font-size: 16px;
  line-height: 1.7;
  max-width: 650px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 24px;
}

.section-heading h2 {
  margin: 8px 0 0;
  font-size: 27px;
  letter-spacing: -.035em;
}

.section-heading > span {
  color: #7e748d;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .14em;
}

.companies-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(280px, 1fr)
    );
  gap: 14px;
}

.company-card {
  width: 100%;
  text-align: left;
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.025);
  color: #f6f1ff;
  border-radius: 20px;
  padding: 22px;
  display: grid;
  grid-template-columns:
    54px 1fr 20px;
  gap: 16px;
  align-items: center;
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease;
}

.company-card:hover {
  transform: translateY(-3px);
  border-color:
    rgba(188,168,255,.38);
  background:
    rgba(188,168,255,.055);
}

.company-card-info span {
  color: #887d99;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .14em;
}

.company-card-info h3 {
  margin: 5px 0 6px;
  font-size: 20px;
}

.company-card-info p {
  margin: 0;
  color: #918898;
  font-size: 12px;
  line-height: 1.55;
}

.company-card-arrow {
  color: #bca8ff;
  font-size: 20px;
}

.company-logo {
  width: 54px;
  height: 54px;
  border-radius: 15px;
  background: rgba(255,255,255,.06);
  border:
    1px solid rgba(255,255,255,.09);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 auto;
}

.company-logo img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.company-logo span {
  font-size: 20px;
  font-weight: 950;
  color: #bca8ff;
}

.company-logo-large {
  width: 78px;
  height: 78px;
  border-radius: 21px;
}

.company-logo-large span {
  font-size: 29px;
}

.company-hero {
  display: grid;
  grid-template-columns:
    auto 1fr auto;
  gap: 22px;
  align-items: center;
  padding: 28px;
  margin-bottom: 44px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 25px;
  background:
    rgba(255,255,255,.025);
}

.company-hero h1 {
  margin: 6px 0 8px;
  font-size: 37px;
  letter-spacing: -.045em;
}

.company-hero p {
  margin: 0;
  color: #958b9d;
  line-height: 1.55;
  font-size: 13px;
}

.company-level-count {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.company-level-count strong {
  font-size: 44px;
  color: #c5b3ff;
  line-height: 1;
}

.company-level-count span {
  color: #746b7d;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .15em;
  margin-top: 6px;
}

.levels-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(260px, 1fr)
    );
  gap: 14px;
}

.level-card {
  text-align: left;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 20px;
  padding: 23px;
  background:
    rgba(255,255,255,.025);
  color: #f3effb;
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease;
}

.level-card:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color:
    rgba(188,168,255,.4);
  background:
    rgba(188,168,255,.045);
}

.level-card:disabled {
  opacity: .55;
  cursor: wait;
}

.level-number {
  color: #a994e8;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .15em;
}

.level-card h3 {
  margin: 11px 0 10px;
  font-size: 22px;
}

.level-card p {
  margin: 0 0 19px;
  color: #918899;
  font-size: 12px;
  line-height: 1.6;
}

.level-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 19px;
}

.level-meta span {
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 7px;
  padding: 6px 8px;
  color: #9f94a9;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
}

.level-action {
  color: #c3b0ff;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .1em;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border:
    1px solid rgba(255,100,130,.22);
  background:
    rgba(255,80,110,.055);
  border-radius: 14px;
  padding: 15px 17px;
  margin-bottom: 25px;
}

.error-banner > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.error-banner strong {
  color: #ff9caf;
  font-size: 11px;
}

.error-banner span {
  color: #b9a9b4;
  font-size: 12px;
}

.loading-block {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  color: #aaa0b4;
  font-size: 12px;
}

.loader-ring {
  width: 32px;
  height: 32px;
  border:
    2px solid rgba(255,255,255,.08);
  border-top-color:
    #bca8ff;
  border-radius: 50%;
  animation:
    engviva-spin .8s linear infinite;
}

@keyframes engviva-spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  border:
    1px dashed rgba(255,255,255,.12);
  border-radius: 20px;
  padding: 45px 30px;
  text-align: center;
  color: #a99eae;
}

.empty-state strong {
  display: block;
  color: #eee8f5;
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 12px;
  line-height: 1.6;
  margin: 0 auto 18px;
  max-width: 520px;
}

/* =========================================================================
   BUTTONS
========================================================================= */

.primary-button,
.secondary-button {
  border: 0;
  border-radius: 11px;
  padding: 12px 17px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .1em;
  cursor: pointer;
  transition:
    transform .15s ease,
    opacity .15s ease;
}

.primary-button {
  background:
    #c4b0ff;
  color:
    #100b18;
}

.secondary-button {
  background:
    rgba(255,255,255,.05);
  border:
    1px solid rgba(255,255,255,.09);
  color:
    #ddd4e7;
}

.primary-button:hover:not(:disabled),
.secondary-button:hover:not(:disabled) {
  transform:
    translateY(-1px);
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* =========================================================================
   EXAM
========================================================================= */

.exam-page {
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(186,166,255,.10),
      transparent 38%
    ),
    #08070d;
}

.exam-header {
  min-height: 78px;
  border-bottom:
    1px solid rgba(255,255,255,.07);
  display: grid;
  grid-template-columns:
    minmax(220px, 1fr)
    minmax(280px, 2fr)
    minmax(100px, 1fr);
  gap: 20px;
  align-items: center;
  padding: 12px 25px;
  background:
    rgba(8,7,13,.94);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter:
    blur(18px);
}

.exam-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.exam-brand .company-logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
}

.exam-brand div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.exam-brand strong {
  font-size: 13px;
}

.exam-brand span {
  color: #82788c;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .13em;
}

.exam-header-center {
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: center;
}

.exam-header-center > span {
  color: #8d8299;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: .15em;
}

.exam-progress {
  width: min(430px, 100%);
  height: 4px;
  background:
    rgba(255,255,255,.07);
  border-radius: 10px;
  overflow: hidden;
}

.exam-progress div {
  height: 100%;
  background:
    #bda9ff;
  transition:
    width .25s ease;
}

.exam-timer {
  justify-self: end;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  color: #d8cdf2;
  font-size: 18px;
  font-weight: 900;
}

.timer-danger {
  color: #ff9caa;
}

.test-container {
  width:
    min(1180px, calc(100% - 34px));
  margin: 0 auto;
  padding: 30px 0 70px;
}

.proctor-bar {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 15px;
  margin-bottom: 20px;
  border:
    1px solid rgba(188,168,255,.15);
  border-radius: 13px;
  background:
    rgba(188,168,255,.035);
}

.proctor-bar > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.proctor-bar strong {
  font-size: 9px;
  letter-spacing: .1em;
  color: #c7b9df;
}

.proctor-bar > span {
  color: #82788c;
  font-size: 9px;
  letter-spacing: .05em;
}

.proctor-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background:
    #bca8ff;
  box-shadow:
    0 0 12px
    rgba(188,168,255,.7);
}

.warning {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 11px 14px;
  border:
    1px solid rgba(255,160,100,.22);
  background:
    rgba(255,160,100,.055);
  border-radius: 12px;
  margin-bottom: 18px;
}

.warning strong {
  color: #ffc39e;
  font-size: 9px;
  letter-spacing: .1em;
}

.warning span {
  color: #b6a6ae;
  font-size: 11px;
}

.question-layout {
  display: grid;
  grid-template-columns:
    185px minmax(0, 1fr);
  gap: 18px;
}

.question-sidebar {
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.02);
  border-radius: 18px;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: 105px;
}

.sidebar-title {
  color: #8b8191;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .13em;
  margin-bottom: 13px;
}

.question-grid {
  display: grid;
  grid-template-columns:
    repeat(5, 1fr);
  gap: 6px;
}

.question-number {
  width: 27px;
  height: 27px;
  border-radius: 7px;
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.025);
  color: #8f8598;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.question-number.active {
  border-color:
    #bca8ff;
  color:
    #cbbcff;
  background:
    rgba(188,168,255,.10);
}

.question-number.answered {
  color:
    #d9cff2;
  background:
    rgba(188,168,255,.14);
}

.sidebar-summary {
  margin-top: 18px;
  padding-top: 15px;
  border-top:
    1px solid rgba(255,255,255,.07);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px;
}

.sidebar-summary span {
  color: #766d7d;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
}

.sidebar-summary strong {
  color: #bba7dc;
  font-size: 11px;
}

.question-card {
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 22px;
  background:
    rgba(255,255,255,.024);
  padding:
    clamp(22px, 4vw, 40px);
  min-width: 0;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  color: #766d7e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .08em;
  margin-bottom: 25px;
}

.question-number-label {
  color: #bba6f1;
}

.markdown-content {
  color: #eee8f4;
  line-height: 1.72;
  font-size: 16px;
  overflow-wrap: anywhere;
}

.markdown-content p {
  margin:
    0 0 13px;
}

.markdown-content h4 {
  margin:
    18px 0 10px;
  color:
    #f2ebfa;
  font-size:
    18px;
}

.markdown-content ul {
  margin:
    11px 0 16px;
  padding-left:
    24px;
}

.markdown-content li {
  margin:
    5px 0;
}

.markdown-inline-code {
  display: inline-block;
  padding:
    1px 6px;
  border-radius:
    6px;
  background:
    rgba(188,168,255,.09);
  color:
    #c9b8f5;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size:
    .9em;
}

.markdown-code {
  margin:
    17px 0;
  padding:
    17px 18px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius:
    12px;
  background:
    #050509;
  overflow-x:
    auto;
  color:
    #ddd5e7;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  font-size:
    13px;
  line-height:
    1.6;
  white-space:
    pre;
}

.markdown-link {
  color:
    #c1adff;
}

.question-images {
  display:
    flex;
  flex-direction:
    column;
  gap:
    12px;
  margin:
    18px 0;
}

.question-images img {
  max-width:
    100%;
  max-height:
    430px;
  object-fit:
    contain;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius:
    13px;
  background:
    #050509;
}

.markdown-image-note {
  padding:
    12px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius:
    10px;
  color:
    #877d91;
  font-size:
    11px;
}

.options-list {
  display:
    flex;
  flex-direction:
    column;
  gap:
    10px;
  margin-top:
    28px;
}

.option-card {
  width:
    100%;
  display:
    grid;
  grid-template-columns:
    40px minmax(0, 1fr) 22px;
  gap:
    13px;
  align-items:
    center;
  text-align:
    left;
  padding:
    14px 15px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius:
    14px;
  background:
    rgba(255,255,255,.02);
  color:
    #e8e1ed;
  cursor:
    pointer;
  transition:
    border-color .15s ease,
    background .15s ease,
    transform .15s ease;
}

.option-card:hover:not(:disabled) {
  transform:
    translateX(2px);
  border-color:
    rgba(188,168,255,.3);
}

.option-card.selected {
  border-color:
    rgba(188,168,255,.72);
  background:
    rgba(188,168,255,.08);
}

.option-letter {
  width:
    32px;
  height:
    32px;
  display:
    flex;
  align-items:
    center;
  justify-content:
    center;
  border:
    1px solid rgba(255,255,255,.1);
  border-radius:
    9px;
  color:
    #bba6e8;
  font-size:
    10px;
  font-weight:
    950;
}

.option-card.selected
.option-letter {
  border-color:
    #bca8ff;
  color:
    #d7cbf7;
  background:
    rgba(188,168,255,.1);
}

.option-content
.markdown-content {
  font-size:
    14px;
  line-height:
    1.55;
}

.option-content
.markdown-content p {
  margin:
    0;
}

.option-check {
  width:
    20px;
  height:
    20px;
  border-radius:
    50%;
  display:
    flex;
  align-items:
    center;
  justify-content:
    center;
  color:
    transparent;
  border:
    1px solid rgba(255,255,255,.1);
  font-size:
    10px;
}

.option-check.visible {
  color:
    #110d18;
  background:
    #bca8ff;
  border-color:
    #bca8ff;
}

.question-footer {
  display:
    grid;
  grid-template-columns:
    auto 1fr auto;
  align-items:
    center;
  gap:
    15px;
  margin-top:
    28px;
  padding-top:
    20px;
  border-top:
    1px solid rgba(255,255,255,.07);
}

.save-status {
  text-align:
    center;
  color:
    #746a7e;
  font-size:
    8px;
  font-weight:
    950;
  letter-spacing:
    .12em;
}

.finish-button {
  background:
    #c4b0ff;
}

/* =========================================================================
   RESULT
========================================================================= */

.result-container {
  width:
    min(900px, calc(100% - 36px));
  margin:
    0 auto;
  padding:
    65px 0 90px;
}

.result-card {
  text-align:
    center;
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.025);
  border-radius:
    28px;
  padding:
    clamp(30px, 7vw, 65px);
}

.result-card h1 {
  margin:
    13px 0 8px;
  font-size:
    clamp(34px, 5vw, 55px);
  letter-spacing:
    -.055em;
}

.result-company {
  margin:
    0;
  color:
    #918797;
  font-size:
    13px;
}

.score-ring {
  width:
    190px;
  height:
    190px;
  border-radius:
    50%;
  margin:
    40px auto;
  border:
    1px solid rgba(188,168,255,.35);
  background:
    radial-gradient(
      circle,
      rgba(188,168,255,.13),
      rgba(188,168,255,.025)
    );
  display:
    flex;
  flex-direction:
    column;
  align-items:
    center;
  justify-content:
    center;
}

.score-ring strong {
  font-size:
    46px;
  line-height:
    1;
  color:
    #c8b5ff;
}

.score-ring span {
  margin-top:
    9px;
  color:
    #91879a;
  font-size:
    9px;
  font-weight:
    950;
  letter-spacing:
    .13em;
}

.result-stats {
  display:
    grid;
  grid-template-columns:
    repeat(4, 1fr);
  border-top:
    1px solid rgba(255,255,255,.07);
  border-bottom:
    1px solid rgba(255,255,255,.07);
  margin:
    30px 0;
}

.result-stat {
  padding:
    19px 10px;
  border-right:
    1px solid rgba(255,255,255,.07);
}

.result-stat:last-child {
  border-right:
    0;
}

.result-stat strong {
  display:
    block;
  font-size:
    25px;
  color:
    #eee8f5;
}

.result-stat span {
  display:
    block;
  margin-top:
    5px;
  color:
    #766c7d;
  font-size:
    8px;
  font-weight:
    950;
  letter-spacing:
    .12em;
}

.result-meta-grid {
  display:
    grid;
  grid-template-columns:
    repeat(3, 1fr);
  gap:
    10px;
  margin-bottom:
    30px;
}

.result-meta-grid div {
  padding:
    15px;
  border:
    1px solid rgba(255,255,255,.07);
  border-radius:
    12px;
  background:
    rgba(255,255,255,.02);
}

.result-meta-grid span {
  display:
    block;
  color:
    #756b7c;
  font-size:
    8px;
  font-weight:
    900;
  letter-spacing:
    .1em;
  margin-bottom:
    7px;
}

.result-meta-grid strong {
  display:
    block;
  color:
    #c2b0df;
  font-size:
    11px;
  overflow:
    hidden;
  text-overflow:
    ellipsis;
}

.result-actions {
  display:
    flex;
  justify-content:
    center;
  flex-wrap:
    wrap;
  gap:
    9px;
}

/* =========================================================================
   MODALS
========================================================================= */

.modal-backdrop {
  position:
    fixed;
  inset:
    0;
  z-index:
    100;
  display:
    flex;
  align-items:
    center;
  justify-content:
    center;
  padding:
    20px;
  background:
    rgba(2,2,5,.78);
  backdrop-filter:
    blur(12px);
}

.submit-modal {
  width:
    min(500px, 100%);
  padding:
    32px;
  border:
    1px solid rgba(255,255,255,.1);
  border-radius:
    22px;
  background:
    #0d0b14;
  box-shadow:
    0 30px 90px
    rgba(0,0,0,.45);
}

.modal-symbol {
  width:
    42px;
  height:
    42px;
  border-radius:
    12px;
  display:
    flex;
  align-items:
    center;
  justify-content:
    center;
  background:
    rgba(188,168,255,.1);
  color:
    #c7b5f8;
  font-weight:
    950;
  margin-bottom:
    15px;
}

.submit-modal > span {
  color:
    #9b8aae;
  font-size:
    9px;
  font-weight:
    950;
  letter-spacing:
    .15em;
}

.submit-modal h2 {
  margin:
    8px 0;
  font-size:
    27px;
}

.submit-modal p {
  color:
    #958a9e;
  font-size:
    12px;
  line-height:
    1.65;
}

.submit-summary {
  display:
    grid;
  grid-template-columns:
    repeat(3, 1fr);
  gap:
    8px;
  margin:
    22px 0;
}

.submit-summary div {
  padding:
    13px;
  border:
    1px solid rgba(255,255,255,.07);
  border-radius:
    10px;
  text-align:
    center;
}

.submit-summary strong {
  display:
    block;
  font-size:
    18px;
  color:
    #d8cdf1;
}

.submit-summary span {
  display:
    block;
  margin-top:
    4px;
  color:
    #756c7c;
  font-size:
    7px;
  font-weight:
    900;
  letter-spacing:
    .1em;
}

.modal-actions {
  display:
    flex;
  justify-content:
    flex-end;
  flex-wrap:
    wrap;
  gap:
    8px;
}

.error-floating {
  position:
    fixed;
  bottom:
    20px;
  left:
    20px;
  right:
    20px;
  z-index:
    90;
  padding:
    13px;
  border:
    1px solid rgba(255,100,130,.25);
  border-radius:
    12px;
  background:
    #150b11;
  color:
    #ffabb8;
  display:
    flex;
  justify-content:
    space-between;
  align-items:
    center;
  gap:
    15px;
  font-size:
    11px;
}

/* =========================================================================
   RESPONSIVE
========================================================================= */

@media (max-width: 850px) {
  .question-layout {
    grid-template-columns:
      1fr;
  }

  .question-sidebar {
    position:
      static;
    order:
      2;
  }

  .question-grid {
    grid-template-columns:
      repeat(
        10,
        1fr
      );
  }

  .exam-header {
    grid-template-columns:
      1fr auto;
  }

  .exam-header-center {
    display:
      none;
  }

  .company-hero {
    grid-template-columns:
      auto 1fr;
  }

  .company-level-count {
    grid-column:
      2;
    align-items:
      start;
  }
}

@media (max-width: 620px) {
  .technical-main {
    width:
      min(100% - 24px, 1250px);
    padding-top:
      28px;
  }

  .technical-header {
    padding:
      0 13px;
  }

  .technical-hero h1 {
    font-size:
      47px;
  }

  .company-hero {
    grid-template-columns:
      1fr;
  }

  .company-level-count {
    grid-column:
      auto;
  }

  .result-stats {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .result-stat:nth-child(2) {
    border-right:
      0;
  }

  .result-meta-grid {
    grid-template-columns:
      1fr;
  }

  .question-footer {
    grid-template-columns:
      1fr;
  }

  .question-footer
  .secondary-button,
  .question-footer
  .primary-button {
    width:
      100%;
  }

  .save-status {
    order:
      -1;
  }

  .proctor-bar {
    flex-direction:
      column;
    align-items:
      flex-start;
  }

  .exam-header {
    padding:
      10px 12px;
  }

  .test-container {
    width:
      calc(100% - 20px);
  }

  .question-card {
    padding:
      20px 16px;
  }
}
`;