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

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

/* =========================================================
   COMPANY CONFIGURATION
   =========================================================
   
   Keep these logo URLs identical to the ones used by
   CompanyDetails.js.

   If CompanyDetails already has a central company config,
   replace these logo values with those exact values.
========================================================= */

const COMPANIES = [
  {
    id: "google",
    name: "Google",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/google.com",
  },

  {
    id: "microsoft",
    name: "Microsoft",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/microsoft.com",
  },

  {
    id: "amazon",
    name: "Amazon",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/amazon.com",
  },

  {
    id: "apple",
    name: "Apple",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/apple.com",
  },

  {
    id: "meta",
    name: "Meta",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/meta.com",
  },

  {
    id: "nvidia",
    name: "NVIDIA",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/nvidia.com",
  },

  {
    id: "ibm",
    name: "IBM",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/ibm.com",
  },

  {
    id: "oracle",
    name: "Oracle",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/oracle.com",
  },

  {
    id: "salesforce",
    name: "Salesforce",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/salesforce.com",
  },

  {
    id: "adobe",
    name: "Adobe",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/adobe.com",
  },

  {
    id: "cisco",
    name: "Cisco",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/cisco.com",
  },

  {
    id: "intel",
    name: "Intel",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/intel.com",
  },

  {
    id: "accenture",
    name: "Accenture",
    category: "Consulting",
    logo:
      "https://logo.clearbit.com/accenture.com",
  },

  {
    id: "deloitte",
    name: "Deloitte",
    category: "Consulting",
    logo:
      "https://logo.clearbit.com/deloitte.com",
  },

  {
    id: "tcs",
    name: "TCS",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/tcs.com",
  },

  {
    id: "infosys",
    name: "Infosys",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/infosys.com",
  },

  {
    id: "wipro",
    name: "Wipro",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/wipro.com",
  },

  {
    id: "hcltech",
    name: "HCLTech",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/hcltech.com",
  },

  {
    id: "tech-mahindra",
    name: "Tech Mahindra",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/techmahindra.com",
  },

  {
    id: "cognizant",
    name: "Cognizant",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/cognizant.com",
  },

  {
    id: "ltimindtree",
    name: "LTIMindtree",
    category: "IT Services",
    logo:
      "https://logo.clearbit.com/ltimindtree.com",
  },

  {
    id: "persistent",
    name: "Persistent Systems",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/persistent.com",
  },

  {
    id: "zoho",
    name: "Zoho",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/zoho.com",
  },

  {
    id: "freshworks",
    name: "Freshworks",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/freshworks.com",
  },

  {
    id: "flipkart",
    name: "Flipkart",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/flipkart.com",
  },

  {
    id: "phonepe",
    name: "PhonePe",
    category: "Fintech",
    logo:
      "https://logo.clearbit.com/phonepe.com",
  },

  {
    id: "razorpay",
    name: "Razorpay",
    category: "Fintech",
    logo:
      "https://logo.clearbit.com/razorpay.com",
  },

  {
    id: "swiggy",
    name: "Swiggy",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/swiggy.com",
  },

  {
    id: "zomato",
    name: "Zomato",
    category: "Technology",
    logo:
      "https://logo.clearbit.com/zomato.com",
  },

  {
    id: "siemens",
    name: "Siemens",
    category: "Engineering",
    logo:
      "https://logo.clearbit.com/siemens.com",
  },

  {
    id: "bosch",
    name: "Bosch",
    category: "Engineering",
    logo:
      "https://logo.clearbit.com/bosch.com",
  },

  {
    id: "qualcomm",
    name: "Qualcomm",
    category: "Semiconductors",
    logo:
      "https://logo.clearbit.com/qualcomm.com",
  },

  {
    id: "amd",
    name: "AMD",
    category: "Semiconductors",
    logo:
      "https://logo.clearbit.com/amd.com",
  },

  {
    id: "pitti-engineering",
    name: "Pitti Engineering",
    category: "Engineering",
    logo:
      "https://logo.clearbit.com/pitti.in",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function formatTime(seconds) {
  const value = Math.max(
    0,
    safeNumber(seconds)
  );

  const minutes =
    Math.floor(value / 60);

  const secs =
    value % 60;

  return `${String(
    minutes
  ).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

function normalizeQuestions(
  payload
) {
  let source = [];

  if (
    Array.isArray(payload)
  ) {
    source = payload;
  } else if (
    Array.isArray(
      payload?.questions
    )
  ) {
    source =
      payload.questions;
  } else if (
    Array.isArray(
      payload?.data?.questions
    )
  ) {
    source =
      payload.data.questions;
  }

  return source
    .map(
      (
        question,
        index
      ) => ({
        id:
          firstValue(
            question?.id,
            question?.questionId,
            question?._id,
            `technical-question-${index + 1}`
          ),

        question:
          firstValue(
            question?.question,
            question?.text,
            question?.questionText,
            `Question ${index + 1}`
          ),

        options:
          Array.isArray(
            question?.options
          )
            ? question.options.map(
                (option) =>
                  typeof option ===
                  "object"
                    ? firstValue(
                        option?.text,
                        option?.label,
                        option?.value
                      )
                    : option
              )
            : [],

        module:
          firstValue(
            question?.module,
            question?.moduleName,
            question?.category,
            "Technical"
          ),

        difficulty:
          firstValue(
            question?.difficulty,
            question?.level,
            "Mixed"
          ),

        images:
          Array.isArray(
            question?.images
          )
            ? question.images
            : [],

        hasImages:
          Boolean(
            question?.hasImages
          ),
      })
    )
    .filter(
      (question) =>
        question.options.length >=
        2
    );
}

function normalizeCompanyId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCompany(
  companyId
) {
  return (
    COMPANIES.find(
      (company) =>
        company.id ===
        String(
          companyId
        ).toLowerCase()
    ) || {
      id: companyId,
      name:
        companyId ||
        "Engineering Company",
      category:
        "Engineering",
      logo: "",
    }
  );
}

/* =========================================================
   API
========================================================= */

async function firebaseToken() {
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
  } catch {
    return null;
  }
}

async function apiFetch(
  path,
  options = {}
) {
  const token =
    await firebaseToken();

  const headers = {
    Accept:
      "application/json",

    ...(options.body
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),

    ...(options.headers ||
      {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  return fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    }
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function TechnicalAssessment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    companyId: pathCompanyId,
    levelNumber: pathLevelNumber,
  } = useParams();

  const params =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [location.search]
    );

  // Support ALL ENGVIVA Technical Lab URLs:
  // /technical-lab?company=google
  // /technical-lab/google
  // /technical-lab/google/levels
  // and router state.
  const pathnameParts =
    location.pathname
      .split("/")
      .filter(Boolean);

  const routeCompany =
    normalizeCompanyId(
      firstValue(
        pathCompanyId,
        location.state?.companyId,
        location.state?.company?.id,
        params.get("company"),
        params.get("companyId"),
        pathnameParts[1] === "technical-lab"
          ? pathnameParts[2]
          : null
      )
    );

  const routeLevel =
    safeNumber(
      firstValue(
        pathLevelNumber,
        location.state?.levelNumber,
        params.get("level")
      ),
      0
    );

  const [
    screen,
    setScreen,
  ] = useState(
    routeCompany
      ? "levels"
      : "companies"
  );

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    routeCompany
      ? getCompany(
          routeCompany
        )
      : null
  );

  const [
    levels,
    setLevels,
  ] = useState([]);

  const [
    loadingLevels,
    setLoadingLevels,
  ] = useState(false);

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState(
    routeLevel || null
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
    loadingTest,
    setLoadingTest,
  ] = useState(false);

  const [
    attemptId,
    setAttemptId,
  ] = useState(null);

  const [
    startedAt,
    setStartedAt,
  ] = useState(null);

  const startedAtRef =
    useRef(null);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(0);

  const remainingRef =
    useRef(0);

  const [
    timeAllowed,
    setTimeAllowed,
  ] = useState(0);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

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

  const timerRef =
    useRef(null);

  const submitRef =
    useRef(null);

  /* =======================================================
     SYNC
  ======================================================= */

  useEffect(() => {
    answersRef.current =
      answers;
  }, [answers]);

  useEffect(() => {
    remainingRef.current =
      remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    startedAtRef.current =
      startedAt;
  }, [startedAt]);

  /* =======================================================
     LOAD LEVELS
  ======================================================= */

  const loadLevels =
    useCallback(
      async (
        companyId
      ) => {
        if (!companyId) {
          return;
        }

        setLoadingLevels(
          true
        );

        setError("");

        try {
          /*
           * This endpoint should be the
           * working technical company endpoint.
           *
           * Example:
           * /api/technical/company/google/levels
           */

          const response =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                companyId
              )}/levels`
            );

          const payload =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (!response.ok) {
            throw new Error(
              payload?.error ||
                payload?.message ||
                `Unable to load technical levels (${response.status}).`
            );
          }

          const data =
            payload?.data ??
            payload;

          // The backend has used more than one envelope while
          // this feature was being developed. Accept all valid
          // envelopes without inventing frontend question data.
          const nextLevels =
            Array.isArray(data)
              ? data
              : Array.isArray(data?.levels)
              ? data.levels
              : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(payload?.levels)
              ? payload.levels
              : Array.isArray(payload?.items)
              ? payload.items
              : [];

          console.log(
            "[TECHNICAL LEVELS] Response:",
            payload
          );

          console.log(
            "[TECHNICAL LEVELS] Parsed level count:",
            nextLevels.length
          );

          if (!nextLevels.length) {
            const backendMessage =
              firstValue(
                payload?.error,
                payload?.message,
                data?.error,
                data?.message
              );

            throw new Error(
              backendMessage ||
                `No technical levels are configured for ${getCompany(companyId).name}.`
            );
          }

          setLevels(
            nextLevels
          );
        } catch (err) {
          console.error(
            "[TECHNICAL LEVELS]",
            err
          );

          setError(
            err.message ||
              "Unable to load technical levels."
          );
        } finally {
          setLoadingLevels(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      selectedCompany?.id
    ) {
      loadLevels(
        selectedCompany.id
      );
    }
  }, [
    selectedCompany,
    loadLevels,
  ]);

  /* =======================================================
     SELECT COMPANY
  ======================================================= */

  const chooseCompany =
    useCallback(
      (company) => {
        setSelectedCompany(
          company
        );

        setLevels([]);

        setSelectedLevel(
          null
        );

        setError("");

        setScreen(
          "levels"
        );

        navigate(
          `/technical-lab/${encodeURIComponent(
            company.id
          )}/levels`,
          {
            replace: true,
            state: {
              companyId:
                company.id,
            },
          }
        );
      },
      [navigate]
    );

  /* =======================================================
     LOAD LEVEL QUESTIONS
  ======================================================= */

  const startLevel =
    useCallback(
      async (
        level
      ) => {
        if (
          !selectedCompany
        ) {
          return;
        }

        setLoadingTest(
          true
        );

        setError("");

        try {
          const levelNumber =
            safeNumber(
              level?.level ??
                level?.levelNumber
            );

          /*
           * First create the server attempt.
           */

          const startResponse =
            await apiFetch(
              "/api/technical/assessment/start",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    companyId:
                      selectedCompany.id,

                    levelNumber,
                  }),
              }
            );

          const startPayload =
            await startResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            !startResponse.ok
          ) {
            throw new Error(
              startPayload?.error ||
                startPayload?.message ||
                "Unable to start technical attempt."
            );
          }

          const attempt =
            startPayload?.data ||
            startPayload;

          const id =
            firstValue(
              attempt?.attemptId,
              startPayload?.attemptId
            );

          if (!id) {
            throw new Error(
              "Server did not return an attempt ID."
            );
          }

          /*
           * Now fetch the questions.
           *
           * Correct answers are intentionally
           * NOT returned by the server.
           */

          const questionResponse =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                selectedCompany.id
              )}/levels/${levelNumber}`
            );

          const questionPayload =
            await questionResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            !questionResponse.ok
          ) {
            throw new Error(
              questionPayload?.error ||
                questionPayload?.message ||
                "Unable to load technical questions."
            );
          }

          const normalized =
            normalizeQuestions(
              questionPayload
            );

          if (
            !normalized.length
          ) {
            throw new Error(
              "This technical level has no usable questions."
            );
          }

          const levelData =
            questionPayload?.data ||
            questionPayload;

          const durationMinutes =
            safeNumber(
              firstValue(
                levelData?.estimatedMinutes,
                level?.estimatedMinutes,
                60
              ),
              60
            );

          const seconds =
            Math.max(
              60,
              Math.round(
                durationMinutes *
                  60
              )
            );

          setAttemptId(
            id
          );

          setSelectedLevel(
            levelNumber
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

          setResult(
            null
          );

          setShowSubmit(
            false
          );

          setTimeAllowed(
            seconds
          );

          setRemainingSeconds(
            seconds
          );

          remainingRef.current =
            seconds;

          const now =
            new Date().toISOString();

          setStartedAt(
            now
          );

          startedAtRef.current =
            now;

          setScreen(
            "running"
          );
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
      [selectedCompany]
    );

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      screen !== "running"
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
                () => {
                  submitRef.current?.(
                    true
                  );
                },
                0
              );
            }

            return next;
          }
        );
      }, 1000);

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [screen]);

  /* =======================================================
     ANSWER
  ======================================================= */

  const chooseAnswer =
    useCallback(
      (
        questionId,
        optionIndex
      ) => {
        if (
          screen !==
          "running"
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
      [screen]
    );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const nextQuestion =
    useCallback(() => {
      setCurrentIndex(
        (current) =>
          Math.min(
            questions.length -
              1,
            current + 1
          )
      );
    }, [questions.length]);

  const previousQuestion =
    useCallback(() => {
      setCurrentIndex(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );
    }, []);

  const jumpQuestion =
    useCallback(
      (index) => {
        setCurrentIndex(
          index
        );
      },
      []
    );

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submitAssessment =
    useCallback(
      async (
        automatic = false
      ) => {
        if (
          submitting ||
          !attemptId
        ) {
          return;
        }

        setSubmitting(
          true
        );

        clearInterval(
          timerRef.current
        );

        try {
          const response =
            await apiFetch(
              "/api/technical/assessment/submit",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    attemptId,

                    companyId:
                      selectedCompany.id,

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
                  }),
              }
            );

          const payload =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (
            !response.ok
          ) {
            throw new Error(
              payload?.error ||
                payload?.message ||
                `Technical submission failed (${response.status}).`
            );
          }

          const data =
            payload?.data ||
            payload;

          setResult(
            data
          );

          setScreen(
            "result"
          );
        } catch (err) {
          console.error(
            "[TECHNICAL SUBMIT]",
            err
          );

          setError(
            err.message ||
              "Unable to submit technical assessment."
          );

          setShowSubmit(
            false
          );
        } finally {
          setSubmitting(
            false
          );
        }
      },
      [
        attemptId,
        selectedCompany,
        selectedLevel,
        submitting,
        timeAllowed,
      ]
    );

  useEffect(() => {
    submitRef.current =
      submitAssessment;
  }, [
    submitAssessment,
  ]);

  /* =======================================================
     RETAKE
  ======================================================= */

  const retake =
    useCallback(() => {
      const level =
        levels.find(
          (item) =>
            safeNumber(
              item?.level ??
                item?.levelNumber
            ) ===
            Number(
              selectedLevel
            )
        );

      if (level) {
        startLevel(
          level
        );
      }
    }, [
      levels,
      selectedLevel,
      startLevel,
    ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      clearInterval(
        timerRef.current
      );
    };
  }, []);

  /* =======================================================
     DERIVED
  ======================================================= */

  const company =
    selectedCompany ||
    getCompany(
      routeCompany
    );

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
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  const currentAnswer =
    currentQuestion
      ? answers[
          currentQuestion.id
        ]
      : undefined;

  /* =======================================================
     COMPANIES
  ======================================================= */

  if (
    screen ===
    "companies"
  ) {
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
                  ENGINEERING / TECHNICAL
                </span>

                <h1>
                  Train for the
                  companies you want.
                </h1>

                <p>
                  Choose a company to
                  explore its technical
                  assessment levels.
                  Every question is
                  sourced from the
                  technical training
                  dataset.
                </p>
              </div>

              <div className="hero-stat">
                <strong>
                  {COMPANIES.length}
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

              <div className="company-grid">
                {COMPANIES.map(
                  (item) => (
                    <CompanyCard
                      key={
                        item.id
                      }
                      company={
                        item
                      }
                      onClick={() =>
                        chooseCompany(
                          item
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          </main>
        </div>
      </>
    );
  }

  /* =======================================================
     LEVELS
  ======================================================= */

  if (
    screen === "levels"
  ) {
    return (
      <>
        <style>
          {TECHNICAL_CSS}
        </style>

        <div className="technical-page">
          <TechnicalHeader
            title={
              company.name
            }
            subtitle="Technical assessment levels"
            onBack={() => {
              setScreen(
                "companies"
              );

              setSelectedCompany(
                null
              );

              navigate(
                "/technical-lab"
              );
            }}
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
                  {company.category}
                </span>

                <h1>
                  {company.name}
                </h1>

                <p>
                  Technical assessment
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
                message={
                  error
                }
                onRetry={() =>
                  loadLevels(
                    company.id
                  )
                }
              />
            )}

            {loadingLevels ? (
              <LoadingBlock
                text="Loading technical levels..."
              />
            ) : (
              <section className="levels-section">
                <div className="section-heading">
                  <div>
                    <span>
                      {company.name.toUpperCase()}
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
                          level?.level ??
                            level?.levelNumber,
                          index +
                            1
                        );

                      const difficulty =
                        firstValue(
                          level?.difficulty,
                          "Technical"
                        );

                      return (
                        <button
                          className="level-card"
                          key={
                            number
                          }
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
                              {difficulty}
                            </span>

                            <h3>
                              {firstValue(
                                level?.title,
                                `Technical Level ${number}`
                              )}
                            </h3>

                            <p>
                              {safeNumber(
                                level?.questionCount,
                                0
                              )}{" "}
                              questions
                              {" · "}
                              {safeNumber(
                                level?.moduleCount,
                                level
                                  ?.modules
                                  ?.length ||
                                  0
                              )}{" "}
                              modules
                            </p>
                          </div>

                          <div className="level-meta">
                            <strong>
                              {safeNumber(
                                level?.questionCount,
                                0
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
            <FullscreenLoader
              text="Preparing technical assessment..."
            />
          )}
        </div>
      </>
    );
  }

  /* =======================================================
     RUNNING
  ======================================================= */

  if (
    screen ===
    "running"
  ) {
    return (
      <>
        <style>
          {TECHNICAL_TEST_CSS}
        </style>

        <div className="technical-test">
          <header className="testbar">
            <div className="testbar-brand">
              <CompanyLogo
                company={
                  company
                }
              />

              <div>
                <strong>
                  {company.name}
                </strong>

                <span>
                  Technical · Level{" "}
                  {selectedLevel}
                </span>
              </div>
            </div>

            <div className="testbar-center">
              <span>
                QUESTION{" "}
                {currentIndex +
                  1}{" "}
                /{" "}
                {questions.length}
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
                remainingSeconds <=
                60
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
                  ) => {
                    const answered =
                      answers[
                        question.id
                      ] !==
                      undefined;

                    return (
                      <button
                        key={
                          question.id
                        }
                        className={[
                          index ===
                          currentIndex
                            ? "active"
                            : "",
                          answered
                            ? "answered"
                            : "",
                        ].join(
                          " "
                        )}
                        onClick={() =>
                          jumpQuestion(
                            index
                          )
                        }
                      >
                        {String(
                          index +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </button>
                    );
                  }
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
                  {currentQuestion?.module ||
                    "TECHNICAL"}
                </span>

                <span>
                  {currentQuestion?.difficulty ||
                    "MIXED"}
                </span>
              </div>

              <div className="question-container">
                <div className="question-index">
                  {String(
                    currentIndex +
                      1
                  ).padStart(
                    2,
                    "0"
                  )}
                </div>

                <h1>
                  {
                    currentQuestion?.question
                  }
                </h1>

                {currentQuestion
                  ?.images
                  ?.length >
                  0 && (
                  <div className="question-images">
                    {currentQuestion.images.map(
                      (
                        image,
                        index
                      ) => (
                        <img
                          key={
                            index
                          }
                          src={
                            image?.source ||
                            image?.url ||
                            image
                          }
                          alt={
                            image?.alt ||
                            "Question illustration"
                          }
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      )
                    )}
                  </div>
                )}

                <div className="answer-options">
                  {currentQuestion?.options?.map(
                    (
                      option,
                      index
                    ) => {
                      const selected =
                        currentAnswer ===
                        index;

                      return (
                        <button
                          key={
                            `${currentQuestion.id}-${index}`
                          }
                          className={
                            selected
                              ? "selected"
                              : ""
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
                              65 +
                                index
                            )}
                          </span>

                          <span className="option-text">
                            {
                              option
                            }
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
                    0
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
                    onClick={
                      nextQuestion
                    }
                  >
                    NEXT →
                  </button>
                ) : (
                  <button
                    className="nav-submit"
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
              onSubmit={() =>
                submitAssessment(
                  false
                )
              }
            />
          )}
        </div>
      </>
    );
  }

  /* =======================================================
     RESULT
  ======================================================= */

  return (
    <>
      <style>
        {RESULT_CSS}
      </style>

      <div className="technical-result">
        <div className="result-wrap">
          <div className="result-company">
            <CompanyLogo
              company={
                company
              }
              large
            />

            <div>
              <span>
                {company.name}
              </span>

              <strong>
                Technical Assessment
              </strong>
            </div>
          </div>

          <div className="result-heading">
            <span>
              LEVEL{" "}
              {selectedLevel}{" "}
              COMPLETE
            </span>

            <h1>
              Technical performance.
            </h1>

            <p>
              Your latest attempt has
              been evaluated and saved.
            </p>
          </div>

          <div className="result-score-card">
            <div className="score-ring">
              <div>
                <strong>
                  {safeNumber(
                    result?.percentage ??
                      result?.score
                  )}
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
                  safeNumber(
                    result?.percentage ??
                      result?.score
                  )
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
              value={`${safeNumber(
                result?.percentage ??
                  result?.score
              )}%`}
            />

            <ResultMetric
              label="ACCURACY"
              value={`${safeNumber(
                result?.accuracy
              )}%`}
            />

            <ResultMetric
              label="CORRECT"
              value={
                result?.correctAnswers ??
                0
              }
            />

            <ResultMetric
              label="ANSWERED"
              value={
                result?.answeredQuestions ??
                0
              }
            />
          </div>

          <section className="module-analysis">
            <div className="result-section-heading">
              <div>
                <span>
                  TECHNICAL ANALYSIS
                </span>

                <h2>
                  Module performance
                </h2>
              </div>
            </div>

            {Array.isArray(
              result?.moduleBreakdown
            ) &&
            result.moduleBreakdown
              .length > 0 ? (
              <div className="module-list">
                {result.moduleBreakdown.map(
                  (
                    item,
                    index
                  ) => {
                    const score =
                      safeNumber(
                        item?.score
                      );

                    return (
                      <div
                        className="module-row"
                        key={`${item?.moduleId}-${index}`}
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
                            {
                              item?.correct
                            }{" "}
                            /{" "}
                            {
                              item?.total
                            }{" "}
                            correct
                          </span>
                        </div>

                        <div className="module-progress">
                          <i
                            style={{
                              width: `${score}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {score}%
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="no-analysis">
                Module analysis will
                appear after the server
                finishes processing the
                result.
              </div>
            )}
          </section>

          <div className="result-note">
            <span>
              ✓
            </span>

            <p>
              This is your latest technical
              attempt for{" "}
              <strong>
                {company.name}
              </strong>
              . Retaking the same level
              updates the latest result
              while preserving your attempt
              history.
            </p>
          </div>

          <div className="result-actions">
            <button
              className="result-secondary"
              onClick={
                retake
              }
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

/* =========================================================
   COMPANY CARD
========================================================= */

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

/* =========================================================
   COMPANY LOGO
========================================================= */

function CompanyLogo({
  company,
  large = false,
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);

  return (
    <div
      className={
        large
          ? "company-logo large"
          : "company-logo"
      }
    >
      {!failed &&
      company?.logo ? (
        <img
          src={
            company.logo
          }
          alt={
            company.name
          }
          onError={() =>
            setFailed(
              true
            )
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

/* =========================================================
   HEADER
========================================================= */

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

/* =========================================================
   LOADING
========================================================= */

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
          Loading questions securely...
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   ERROR
========================================================= */

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

/* =========================================================
   SUBMIT MODAL
========================================================= */

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
          Finish technical test?
        </h2>

        <p>
          Your answers will be sent to
          the server for secure
          evaluation.
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
              {formatTime(
                time
              )}
            </strong>

            <span>
              TIME LEFT
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="modal-cancel"
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
            className="modal-confirm"
            disabled={
              submitting
            }
            onClick={
              onSubmit
            }
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

/* =========================================================
   RESULT HELPERS
========================================================= */

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

function getVerdict(
  score
) {
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

/* =========================================================
   GENERAL CSS
========================================================= */

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
    radial-gradient(
      circle at 80% 0%,
      rgba(159,110,255,.12),
      transparent 32%
    ),
    #07060b;
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
  height: 76px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(7,6,11,.88);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-back {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border:
    1px solid rgba(255,255,255,.08);
  color: #aaa3b0;
  background:
    rgba(255,255,255,.03);
  cursor: pointer;
  font-size: 18px;
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
  background:
    linear-gradient(
      135deg,
      #dbc8ff,
      #9e72df
    );
  color: #160d20;
  font-weight: 950;
}

.header-brand strong,
.header-brand span {
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
  margin-top: 2px;
}

.header-title {
  margin-left: 20px;
  padding-left: 20px;
  border-left:
    1px solid rgba(255,255,255,.07);
}

.header-title strong,
.header-title span {
  display: block;
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
  width:
    min(1250px, calc(100% - 48px));
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
  font-size:
    clamp(44px, 6vw, 78px);
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
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
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
  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );
  gap: 12px;
}

.company-card {
  min-height: 170px;
  position: relative;
  padding: 21px;
  text-align: left;
  border:
    1px solid rgba(255,255,255,.07);
  border-radius: 21px;
  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.018)
    );
  color: #f7f4fb;
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease;
}

.company-card:hover {
  transform:
    translateY(-3px);
  border-color:
    rgba(201,167,255,.25);
  background:
    rgba(201,167,255,.045);
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
  background:
    #fff;
  border:
    1px solid rgba(255,255,255,.12);
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
  border-bottom:
    1px solid rgba(255,255,255,.06);
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
  font-size:
    clamp(40px, 5vw, 65px);
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
  grid-template-columns:
    70px
    1fr
    100px
    35px;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  border:
    1px solid rgba(255,255,255,.065);
  border-radius: 17px;
  color: #f6f2fa;
  background:
    rgba(255,255,255,.025);
  text-align: left;
  cursor: pointer;
  transition:
    .18s ease;
}

.level-card:hover {
  transform:
    translateX(3px);
  border-color:
    rgba(201,167,255,.22);
  background:
    rgba(201,167,255,.045);
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
  border:
    3px solid rgba(255,255,255,.08);
  border-top-color: #c9a7ff;
  animation:
    technical-spin
    .8s linear infinite;
}

@keyframes technical-spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 18px;
  margin-top: 20px;
  border-radius: 14px;
  border:
    1px solid rgba(255,90,110,.15);
  background:
    rgba(255,70,90,.045);
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
  border:
    1px solid rgba(255,255,255,.08);
  color: #bcaec0;
  background:
    rgba(255,255,255,.04);
  cursor: pointer;
}

.fullscreen-loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background:
    rgba(5,4,8,.84);
  backdrop-filter:
    blur(15px);
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

/* MODAL */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    rgba(0,0,0,.78);
  backdrop-filter:
    blur(15px);
}

.submit-modal {
  width:
    min(510px, 100%);
  padding: 31px;
  border-radius: 24px;
  border:
    1px solid rgba(255,255,255,.1);
  background:
    #121017;
  box-shadow:
    0 40px 100px
    rgba(0,0,0,.55);
}

.modal-symbol {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 14px;
  color: #c9a7ff;
  background:
    rgba(201,167,255,.09);
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
  grid-template-columns:
    repeat(3, 1fr);
  gap: 8px;
  margin: 20px 0;
}

.modal-stats > div {
  padding: 15px;
  text-align: center;
  border-radius: 12px;
  background:
    rgba(255,255,255,.035);
  border:
    1px solid rgba(255,255,255,.05);
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
  grid-template-columns:
    1fr 1fr;
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
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.035);
}

.modal-confirm {
  border: 0;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
}

.modal-cancel:disabled,
.modal-confirm:disabled {
  opacity: .5;
}

/* RESPONSIVE */

@media (max-width: 1050px) {
  .company-grid {
    grid-template-columns:
      repeat(3, 1fr);
  }
}

@media (max-width: 800px) {
  .technical-container {
    width:
      calc(100% - 28px);
    padding-top: 35px;
  }

  .company-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .hero-block {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-stat {
    min-width: 120px;
  }

  .level-card {
    grid-template-columns:
      50px
      1fr
      30px;
  }

  .level-meta {
    display: none;
  }

  .company-level-count {
    display: none;
  }
}

@media (max-width: 600px) {
  .technical-header {
    padding: 0 14px;
  }

  .header-title {
    display: none;
  }

  .company-grid {
    grid-template-columns:
      1fr;
  }

  .hero-block h1 {
    font-size: 44px;
    letter-spacing: -2px;
  }

  .company-hero {
    align-items: flex-start;
    flex-wrap: wrap;
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
    grid-template-columns:
      1fr;
  }
}
`;

/* =========================================================
   TEST CSS
========================================================= */

const TECHNICAL_TEST_CSS = `
* {
  box-sizing: border-box;
}

.technical-test {
  min-height: 100vh;
  color: #f7f4fb;
  background:
    #07060b;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
}

.testbar {
  height: 76px;
  display: grid;
  grid-template-columns:
    270px
    1fr
    150px;
  align-items: center;
  gap: 25px;
  padding: 0 24px;
  border-bottom:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(7,6,11,.97);
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
  background:
    rgba(255,255,255,.06);
}

.top-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #a97ce7,
      #dccaff
    );
  transition:
    width .2s ease;
}

.test-timer {
  padding: 10px 13px;
  border-radius: 12px;
  border:
    1px solid rgba(201,167,255,.14);
  background:
    rgba(201,167,255,.055);
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
  border-color:
    rgba(255,80,100,.25);
  background:
    rgba(255,80,100,.07);
}

.test-timer.danger strong {
  color: #ff8999;
}

.test-body {
  min-height:
    calc(100vh - 76px);
  display: grid;
  grid-template-columns:
    230px
    1fr;
}

.test-sidebar {
  padding: 22px;
  border-right:
    1px solid rgba(255,255,255,.06);
  background:
    rgba(255,255,255,.012);
  display: flex;
  flex-direction: column;
}

.sidebar-top {
  display: flex;
  align-items: center;
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
  grid-template-columns:
    repeat(4, 1fr);
  gap: 7px;
}

.question-palette button {
  aspect-ratio: 1;
  border-radius: 9px;
  border:
    1px solid rgba(255,255,255,.065);
  background:
    rgba(255,255,255,.025);
  color: #706a78;
  cursor: pointer;
  font-size: 8px;
  font-weight: 950;
}

.question-palette button.active {
  color: #eadfff;
  background:
    rgba(201,167,255,.14);
  border-color:
    rgba(201,167,255,.4);
}

.question-palette button.answered {
  color: #91dba8;
  background:
    rgba(100,220,140,.06);
  border-color:
    rgba(100,220,140,.16);
}

.question-palette button.active.answered {
  color: #eadfff;
  background:
    rgba(201,167,255,.14);
}

.sidebar-bottom {
  margin-top: auto;
  padding: 15px;
  border-radius: 14px;
  background:
    rgba(201,167,255,.035);
  border:
    1px solid rgba(201,167,255,.07);
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
  background:
    rgba(255,255,255,.06);
}

.sidebar-bottom i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #a97ce7,
      #dccaff
    );
}

.test-question-area {
  width:
    min(1000px, calc(100% - 60px));
  margin: auto;
  padding:
    38px 0 30px;
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
  background:
    rgba(201,167,255,.055);
  font-size: 8px;
  font-weight: 950;
  letter-spacing: .8px;
}

.question-container {
  flex: 1;
  padding:
    clamp(25px, 4vw, 52px);
  border-radius: 25px;
  border:
    1px solid rgba(255,255,255,.075);
  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.017)
    );
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
  font-size:
    clamp(23px, 3vw, 35px);
  line-height: 1.42;
  letter-spacing: -.6px;
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
  border:
    1px solid rgba(255,255,255,.08);
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
  border:
    1px solid rgba(255,255,255,.07);
  color: #bbb4c1;
  background:
    rgba(255,255,255,.025);
  text-align: left;
  cursor: pointer;
  transition:
    .16s ease;
}

.answer-options button:hover {
  background:
    rgba(255,255,255,.045);
  border-color:
    rgba(201,167,255,.18);
}

.answer-options button.selected {
  color: #fff;
  border-color:
    rgba(201,167,255,.42);
  background:
    rgba(201,167,255,.085);
}

.option-letter {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 10px;
  background:
    rgba(255,255,255,.045);
  color: #817989;
  font-weight: 950;
}

.selected .option-letter {
  color: #ddcaff;
  background:
    rgba(201,167,255,.15);
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
  grid-template-columns:
    150px
    1fr
    150px;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.nav-secondary,
.nav-primary,
.nav-submit {
  min-height: 46px;
  padding: 0 15px;
  border-radius: 11px;
  cursor: pointer;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.nav-secondary {
  color: #a59da9;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.03);
}

.nav-secondary:disabled {
  opacity: .25;
  cursor: not-allowed;
}

.nav-primary {
  border: 0;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
}

.nav-submit {
  border: 0;
  color: #07170d;
  background:
    linear-gradient(
      135deg,
      #9fe8b6,
      #66cc89
    );
}

.nav-status {
  text-align: center;
  color: #68616f;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

@media (max-width: 850px) {
  .testbar {
    grid-template-columns:
      1fr
      auto;
  }

  .testbar-center {
    display: none;
  }

  .test-body {
    grid-template-columns:
      1fr;
  }

  .test-sidebar {
    display: none;
  }

  .test-question-area {
    width:
      calc(100% - 28px);
    padding-top: 22px;
  }
}

@media (max-width: 550px) {
  .testbar {
    height: 65px;
    padding: 0 12px;
  }

  .test-body {
    min-height:
      calc(100vh - 65px);
  }

  .test-timer {
    padding: 8px 10px;
  }

  .test-timer strong {
    font-size: 15px;
  }

  .test-question-area {
    width:
      calc(100% - 20px);
  }

  .question-container {
    padding: 20px;
    border-radius: 19px;
  }

  .question-container h1 {
    font-size: 21px;
  }

  .answer-options button {
    min-height: 60px;
  }

  .option-text {
    font-size: 12px;
  }

  .test-navigation {
    grid-template-columns:
      1fr 1fr;
  }

  .nav-status {
    grid-column:
      1 / -1;
    grid-row: 1;
  }
}
`;

/* =========================================================
   RESULT CSS
========================================================= */

const RESULT_CSS = `
* {
  box-sizing: border-box;
}

.technical-result {
  min-height: 100vh;
  padding: 45px 20px 80px;
  color: #f7f4fb;
  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(159,110,255,.13),
      transparent 34%
    ),
    #07060b;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
}

.result-wrap {
  width:
    min(1050px, 100%);
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
  font-size:
    clamp(42px, 6vw, 70px);
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
  border:
    1px solid rgba(255,255,255,.08);
  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.05),
      rgba(255,255,255,.018)
    );
}

.score-ring {
  width: 190px;
  height: 190px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(
      circle,
      #100d15 61%,
      transparent 62%
    ),
    conic-gradient(
      #c9a7ff 0deg,
      #a97ce7 270deg,
      rgba(255,255,255,.06) 270deg
    );
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
  grid-template-columns:
    repeat(4, 1fr);
  gap: 9px;
  margin: 12px 0;
}

.result-metric {
  padding: 20px;
  border-radius: 16px;
  border:
    1px solid rgba(255,255,255,.06);
  background:
    rgba(255,255,255,.025);
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
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
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
  grid-template-columns:
    180px
    1fr
    55px;
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
  background:
    rgba(255,255,255,.06);
}

.module-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #a97ce7,
      #dccaff
    );
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
  background:
    rgba(255,255,255,.025);
  font-size: 10px;
}

.result-note {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 15px;
  border-radius: 14px;
  border:
    1px solid rgba(201,167,255,.08);
  background:
    rgba(201,167,255,.025);
}

.result-note > span {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #c9a7ff;
  background:
    rgba(201,167,255,.08);
}

.result-note p {
  margin: 0;
  color: #726b79;
  font-size: 9px;
  line-height: 1.6;
}

.result-note strong {
  color: #a999ae;
}

.result-actions {
  display: grid;
  grid-template-columns:
    1fr 1fr;
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
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.035);
}

.result-primary {
  border: 0;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
}

@media (max-width: 700px) {
  .result-score-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 25px;
    padding: 25px;
  }

  .score-ring {
    width: 155px;
    height: 155px;
  }

  .score-ring strong {
    font-size: 45px;
  }

  .result-metrics {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .module-row {
    grid-template-columns:
      1fr 50px;
  }

  .module-progress {
    grid-column:
      1 / -1;
    grid-row: 2;
  }

  .module-row > strong {
    grid-column: 2;
    grid-row: 1;
  }

  .result-actions {
    grid-template-columns:
      1fr;
  }
}
`;
