import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

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

function formatTime(seconds) {
  const safe = Math.max(
    0,
    Number(seconds) || 0
  );

  const minutes = Math.floor(
    safe / 60
  );

  const secs = safe % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

function normalizeQuestions(payload) {
  let source = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (
    Array.isArray(payload?.questions)
  ) {
    source = payload.questions;
  } else if (
    Array.isArray(payload?.data)
  ) {
    source = payload.data;
  } else if (
    Array.isArray(
      payload?.data?.questions
    )
  ) {
    source =
      payload.data.questions;
  } else if (
    Array.isArray(
      payload?.assessment?.questions
    )
  ) {
    source =
      payload.assessment.questions;
  }

  return source
    .map((item, index) => {
      let options = [];

      if (
        Array.isArray(item?.options)
      ) {
        options = item.options;
      } else if (
        item?.options &&
        typeof item.options ===
          "object"
      ) {
        options = [
          "A",
          "B",
          "C",
          "D",
        ]
          .map(
            (letter) =>
              item.options[
                letter
              ]
          )
          .filter(
            (option) =>
              option !==
                undefined &&
              option !== null
          );
      } else if (
        Array.isArray(
          item?.choices
        )
      ) {
        options = item.choices;
      } else if (
        item?.choices &&
        typeof item.choices ===
          "object"
      ) {
        options = [
          "A",
          "B",
          "C",
          "D",
        ]
          .map(
            (letter) =>
              item.choices[
                letter
              ]
          )
          .filter(
            (option) =>
              option !==
                undefined &&
              option !== null
          );
      } else {
        options = [
          item?.A,
          item?.B,
          item?.C,
          item?.D,
        ].filter(
          (option) =>
            option !==
              undefined &&
            option !== null &&
            option !== ""
        );
      }

      return {
        id:
          firstValue(
            item?.id,
            item?.questionId,
            item?._id,
            `question-${index + 1}`
          ),

        question:
          firstValue(
            item?.question,
            item?.text,
            item?.questionText,
            `Question ${
              index + 1
            }`
          ),

        options,

        type:
          item?.type ||
          "MCQ",

        category:
          item?.category ||
          item?.source ||
          item?.topic ||
          "APTITUDE",

        difficulty:
          item?.difficulty ||
          item?.level ||
          "MIXED",

        marks:
          Number(item?.marks) ||
          1,

        correctAnswer:
          firstValue(
            item?.correctAnswer,
            item?.answer,
            item?.correct,
            item?.correctOption,
            item?.correct_option
          ),
      };
    })
    .filter(
      (question) =>
        question.options.length >=
        2
    );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AssessmentTest() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const assessment =
    location.state?.assessment ||
    location.state?.test ||
    null;

  const company =
    location.state?.company ||
    null;

  const params = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  const assessmentId =
    firstValue(
      assessment?.testId,
      assessment?.assessmentId,
      assessment?.id,
      params.get("testId"),
      params.get("assessmentId")
    ) || "";

  const companyId =
    firstValue(
      location.state?.companyId,
      company?.id,
      company?.slug,
      params.get("company")
    ) || "";

  /* =======================================================
     STATE
  ======================================================= */

  const [
    phase,
    setPhase,
  ] = useState("loading");

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    testMeta,
    setTestMeta,
  ] = useState(null);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(0);

  const [
    startedAt,
    setStartedAt,
  ] = useState(null);

  const [
    attemptId,
    setAttemptId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    showSubmitModal,
    setShowSubmitModal,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    loadingResult,
    setLoadingResult,
  ] = useState(false);

  const timerRef =
    useRef(null);

  const startedRef =
    useRef(false);

  const submittingRef =
    useRef(false);

  const answersRef =
    useRef({});

  const questionsRef =
    useRef([]);

  const remainingRef =
    useRef(0);

  const startedAtRef =
    useRef(null);

  const attemptIdRef =
    useRef(null);

  const submitAssessmentRef =
    useRef(null);

  /* =======================================================
     SYNC REFS
  ======================================================= */

  useEffect(() => {
    answersRef.current =
      answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current =
      questions;
  }, [questions]);

  useEffect(() => {
    remainingRef.current =
      remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    startedAtRef.current =
      startedAt;
  }, [startedAt]);

  useEffect(() => {
    attemptIdRef.current =
      attemptId;
  }, [attemptId]);

  /* =======================================================
     FIREBASE AUTH TOKEN
  ======================================================= */

  const getFirebaseToken =
    useCallback(
      async () => {
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
        } catch (err) {
          console.error(
            "[ASSESSMENT AUTH]",
            err
          );

          return null;
        }
      },
      []
    );

  /* =======================================================
     API FETCH
  ======================================================= */

  const apiFetch =
    useCallback(
      async (
        path,
        options = {}
      ) => {
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
      },
      [getFirebaseToken]
    );

  /* =======================================================
     LOAD QUESTIONS
  ======================================================= */

  const loadQuestions =
    useCallback(
      async () => {
        setPhase("loading");
        setError("");
        setResult(null);

        if (!assessmentId) {
          setError(
            "No assessment ID was supplied."
          );

          setPhase("error");

          return;
        }

        try {
          const response =
            await apiFetch(
              `/api/assessments/${encodeURIComponent(
                assessmentId
              )}`
            );

          const payload =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              payload?.error
                ?.message ||
                payload?.message ||
                `Unable to load assessment (${response.status}).`
            );
          }

          const data =
            payload?.data ||
            payload;

          const normalized =
            normalizeQuestions(
              data
            );

          if (
            !normalized.length
          ) {
            throw new Error(
              "This assessment contains no usable questions."
            );
          }

          const duration =
            Number(
              firstValue(
                data?.durationMinutes,
                data?.duration,
                assessment?.durationMinutes,
                assessment?.duration,
                20
              )
            ) || 20;

          const title =
            firstValue(
              data?.title,
              data?.name,
              assessment?.title,
              assessment?.name,
              "Aptitude Assessment"
            );

          setTestMeta({
            testId:
              data?.testId ||
              assessmentId,

            testNumber:
              data?.testNumber,

            label:
              data?.label,

            title,

            questionCount:
              Number(
                data?.questionCount
              ) ||
              normalized.length,

            durationMinutes:
              duration,
          });

          setQuestions(
            normalized
          );

          questionsRef.current =
            normalized;

          setRemainingSeconds(
            duration * 60
          );

          remainingRef.current =
            duration * 60;

          setCurrentIndex(0);

          setAnswers({});

          answersRef.current =
            {};

          setPhase("ready");
        } catch (err) {
          console.error(
            "[ASSESSMENT LOAD]",
            err
          );

          setError(
            err.message ||
              "Unable to load assessment."
          );

          setPhase("error");
        }
      },
      [
        apiFetch,
        assessmentId,
        assessment,
      ]
    );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  /* =======================================================
     START ATTEMPT
  ======================================================= */

  const startAttempt =
    useCallback(
      async () => {
        try {
          const response =
            await apiFetch(
              "/api/assessments/attempts/start",
              {
                method: "POST",

                body: JSON.stringify({
                  assessmentId,
                  companyId,
                }),
              }
            );

          const payload =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              payload?.error
                ?.message ||
                payload?.message ||
                "Unable to create assessment attempt."
            );
          }

          const id =
            payload?.data
              ?.attemptId ||
            payload?.attemptId ||
            payload?.id ||
            null;

          if (!id) {
            throw new Error(
              "Backend did not return an attempt ID."
            );
          }

          setAttemptId(id);

          attemptIdRef.current =
            id;

          return id;
        } catch (err) {
          console.error(
            "[ATTEMPT START]",
            err
          );

          setError(
            err.message ||
              "Unable to start assessment."
          );

          return null;
        }
      },
      [
        apiFetch,
        assessmentId,
        companyId,
      ]
    );

  /* =======================================================
     START ASSESSMENT
  ======================================================= */

  const startAssessment =
    useCallback(
      async () => {
        setError("");
        setSubmitError("");

        const id =
          await startAttempt();

        if (!id) {
          return;
        }

        const now =
          new Date().toISOString();

        const duration =
          Number(
            testMeta?.durationMinutes
          ) || 20;

        startedRef.current =
          true;

        submittingRef.current =
          false;

        setStartedAt(now);

        startedAtRef.current =
          now;

        setRemainingSeconds(
          duration * 60
        );

        remainingRef.current =
          duration * 60;

        setCurrentIndex(0);

        setAnswers({});

        answersRef.current =
          {};

        setPhase("running");
      },
      [startAttempt, testMeta]
    );

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      phase !== "running"
    ) {
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

              setTimeout(() => {
                submitAssessmentRef.current?.(
                  true
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
  }, [phase]);

  /* =======================================================
     CALCULATE RESULT
  ======================================================= */

  const calculateResult =
    useCallback(() => {
      const currentQuestions =
        questionsRef.current;

      const currentAnswers =
        answersRef.current;

      let correctAnswers = 0;

      const categoryStats =
        {};

      currentQuestions.forEach(
        (question) => {
          const category =
            question.category ||
            "GENERAL";

          if (
            !categoryStats[
              category
            ]
          ) {
            categoryStats[
              category
            ] = {
              total: 0,
              correct: 0,
            };
          }

          categoryStats[
            category
          ].total += 1;

          const selected =
            currentAnswers[
              question.id
            ];

          const correct =
            question.correctAnswer;

          if (
            selected !==
              undefined &&
            correct !==
              undefined &&
            String(
              selected
            )
              .trim()
              .toLowerCase() ===
              String(
                correct
              )
                .trim()
                .toLowerCase()
          ) {
            correctAnswers += 1;

            categoryStats[
              category
            ].correct += 1;
          }
        }
      );

      const totalQuestions =
        currentQuestions.length;

      const answeredQuestions =
        Object.keys(
          currentAnswers
        ).length;

      const unansweredQuestions =
        Math.max(
          0,
          totalQuestions -
            answeredQuestions
        );

      const percentage =
        totalQuestions
          ? Math.round(
              (correctAnswers /
                totalQuestions) *
                100
            )
          : 0;

      const accuracy =
        answeredQuestions
          ? Math.round(
              (correctAnswers /
                answeredQuestions) *
                100
            )
          : 0;

      const categoryBreakdown =
        Object.entries(
          categoryStats
        ).map(
          ([name, data]) => ({
            name,

            total:
              data.total,

            correct:
              data.correct,

            score:
              data.total
                ? Math.round(
                    (data.correct /
                      data.total) *
                      100
                  )
                : 0,
          })
        );

      return {
        totalQuestions,

        answeredQuestions,

        unansweredQuestions,

        correctAnswers,

        percentage,

        score: percentage,

        accuracy,

        categoryBreakdown,
      };
    }, []);

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submitAssessment =
    useCallback(
      async (
        automatic = false
      ) => {
        if (
          submittingRef.current ||
          !startedRef.current
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(true);
        setSubmitError("");

        clearInterval(
          timerRef.current
        );

        try {
          const calculated =
            calculateResult();

          const duration =
            Number(
              testMeta?.durationMinutes
            ) || 20;

          const resultKey =
            `${assessmentId}:${companyId || "general"}`;

          const resultPayload = {
            assessmentId,

            companyId,

            attemptId:
              attemptIdRef.current,

            resultKey,

            roundType:
              "aptitude",

            assessmentTitle:
              testMeta?.title ||
              "Aptitude Assessment",

            startedAt:
              startedAtRef.current,

            completedAt:
              new Date().toISOString(),

            totalQuestions:
              calculated.totalQuestions,

            answeredQuestions:
              calculated.answeredQuestions,

            unansweredQuestions:
              calculated.unansweredQuestions,

            correctAnswers:
              calculated.correctAnswers,

            score:
              calculated.score,

            percentage:
              calculated.percentage,

            accuracy:
              calculated.accuracy,

            categoryBreakdown:
              calculated.categoryBreakdown,

            timeAllowedSeconds:
              duration * 60,

            timeUsedSeconds:
              Math.max(
                0,
                duration * 60 -
                  remainingRef.current
              ),

            automaticSubmission:
              automatic,

            answers:
              answersRef.current,
          };

          const response =
            await apiFetch(
              "/api/assessments/submit",
              {
                method: "POST",

                body: JSON.stringify(
                  resultPayload
                ),
              }
            );

          const payload =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              payload?.error
                ?.message ||
                payload?.message ||
                `Submission failed (${response.status}).`
            );
          }

          const saved =
            payload?.data ||
            payload?.result ||
            {};

          const finalResult = {
            ...resultPayload,

            ...saved,

            score:
              saved?.score ??
              saved?.percentage ??
              calculated.score,

            percentage:
              saved?.percentage ??
              saved?.score ??
              calculated.percentage,

            accuracy:
              saved?.accuracy ??
              calculated.accuracy,

            categoryBreakdown:
              saved?.categoryBreakdown ||
              calculated.categoryBreakdown,
          };

          setResult(
            finalResult
          );

          startedRef.current =
            false;

          setShowSubmitModal(
            false
          );

          setPhase("result");
        } catch (err) {
          console.error(
            "[ASSESSMENT SUBMIT]",
            err
          );

          submittingRef.current =
            false;

          setSubmitting(false);

          setSubmitError(
            err.message ||
              "Unable to save assessment result."
          );
        }
      },
      [
        apiFetch,
        assessmentId,
        calculateResult,
        companyId,
        testMeta,
      ]
    );

  useEffect(() => {
    submitAssessmentRef.current =
      submitAssessment;
  }, [submitAssessment]);

  /* =======================================================
     ANSWER
  ======================================================= */

  const selectAnswer =
    useCallback(
      (
        questionId,
        value
      ) => {
        if (
          phase !== "running"
        ) {
          return;
        }

        setAnswers(
          (previous) => {
            const next = {
              ...previous,

              [questionId]:
                value,
            };

            answersRef.current =
              next;

            return next;
          }
        );
      },
      [phase]
    );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goToQuestion =
    useCallback(
      (index) => {
        if (
          phase !== "running"
        ) {
          return;
        }

        if (
          index < 0 ||
          index >=
            questions.length
        ) {
          return;
        }

        setCurrentIndex(index);
      },
      [phase, questions.length]
    );

  const nextQuestion =
    useCallback(() => {
      setCurrentIndex(
        (index) =>
          Math.min(
            index + 1,
            questions.length - 1
          )
      );
    }, [questions.length]);

  const previousQuestion =
    useCallback(() => {
      setCurrentIndex(
        (index) =>
          Math.max(
            index - 1,
            0
          )
      );
    }, []);

  /* =======================================================
     RETAKE
  ======================================================= */

  const retakeAssessment =
    useCallback(() => {
      clearInterval(
        timerRef.current
      );

      setResult(null);

      setAnswers({});

      answersRef.current =
        {};

      setCurrentIndex(0);

      setAttemptId(null);

      attemptIdRef.current =
        null;

      setStartedAt(null);

      startedAtRef.current =
        null;

      setSubmitError("");

      const duration =
        Number(
          testMeta?.durationMinutes
        ) || 20;

      setRemainingSeconds(
        duration * 60
      );

      remainingRef.current =
        duration * 60;

      setPhase("ready");
    }, [testMeta]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      clearInterval(
        timerRef.current
      );

      startedRef.current =
        false;
    };
  }, []);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const currentQuestion =
    questions[
      currentIndex
    ] || null;

  const answeredCount =
    useMemo(
      () =>
        questions.filter(
          (question) =>
            answers[
              question.id
            ] !== undefined
        ).length,
      [answers, questions]
    );

  const unansweredCount =
    Math.max(
      0,
      questions.length -
        answeredCount
    );

  const progressPercentage =
    questions.length
      ? Math.round(
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  const title =
    testMeta?.title ||
    assessment?.title ||
    assessment?.name ||
    "Aptitude Assessment";

  const durationMinutes =
    Number(
      testMeta?.durationMinutes
    ) || 20;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    phase === "loading"
  ) {
    return (
      <Shell>
        <div className="assessment-loading">
          <div className="loading-spinner" />

          <span className="eyebrow">
            ENGVIVA / ASSESSMENT ENGINE
          </span>

          <h1>
            Preparing your assessment
          </h1>

          <p>
            Loading the official
            question set...
          </p>
        </div>
      </Shell>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    phase === "error"
  ) {
    return (
      <Shell>
        <div className="error-page">
          <div className="error-icon">
            !
          </div>

          <span className="eyebrow">
            ASSESSMENT ENGINE
          </span>

          <h1>
            Unable to load assessment
          </h1>

          <p>
            {error}
          </p>

          <div className="error-actions">
            <button
              className="primary-button"
              onClick={
                loadQuestions
              }
            >
              RETRY
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                navigate(
                  "/practice/assessments"
                )
              }
            >
              BACK
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* =======================================================
     RESULT
  ======================================================= */

  if (
    phase === "result"
  ) {
    return (
      <ResultScreen
        result={result}
        testMeta={testMeta}
        company={company}
        onRetake={
          retakeAssessment
        }
        onDashboard={() =>
          navigate(
            "/dashboard"
          )
        }
      />
    );
  }

  /* =======================================================
     READY
  ======================================================= */

  if (
    phase === "ready"
  ) {
    return (
      <Shell>
        <div className="ready-page">
          <div className="ready-header">
            <div>
              <span className="eyebrow">
                ENGVIVA / PRACTICE
              </span>

              <h1>
                {title}
              </h1>

              <p>
                {company?.name ||
                  companyId ||
                  "Engineering Assessment"}
                {" · "}
                {questions.length}
                {" questions · "}
                {durationMinutes}
                {" minutes"}
              </p>
            </div>

            <div className="ready-badge">
              <span />
              READY TO BEGIN
            </div>
          </div>

          <div className="ready-grid">
            <section>
              <div className="overview-card">
                <div className="overview-number">
                  01
                </div>

                <div>
                  <span className="card-label">
                    ASSESSMENT OVERVIEW
                  </span>

                  <h2>
                    Test your engineering
                    aptitude.
                  </h2>

                  <p>
                    This assessment contains
                    company-focused aptitude
                    questions. Answer every
                    question carefully before
                    submitting.
                  </p>
                </div>
              </div>

              <div className="info-panel">
                <div className="panel-title">
                  <div>
                    <span>
                      WHAT TO EXPECT
                    </span>

                    <h3>
                      Simple. Direct.
                      Focused.
                    </h3>
                  </div>
                </div>

                <InfoRow
                  number="01"
                  title="Timed assessment"
                  text={`${durationMinutes} minutes to complete the test.`}
                />

                <InfoRow
                  number="02"
                  title="Dynamic questions"
                  text={`${questions.length} questions loaded from the assessment database.`}
                />

                <InfoRow
                  number="03"
                  title="Instant analysis"
                  text="Your score and category performance appear immediately after submission."
                />

                <InfoRow
                  number="04"
                  title="Retake supported"
                  text="You can attempt the same assessment again and your latest result can replace the previous dashboard result."
                />
              </div>
            </section>

            <aside>
              <div className="start-card">
                <div className="start-icon">
                  E
                </div>

                <span className="card-label">
                  TEST DETAILS
                </span>

                <h2>
                  Ready?
                </h2>

                <p>
                  There is no camera,
                  microphone or special
                  browser permission required.
                </p>

                <div className="detail-grid">
                  <Detail
                    value={
                      questions.length
                    }
                    label="QUESTIONS"
                  />

                  <Detail
                    value={`${durationMinutes}m`}
                    label="TIME"
                  />

                  <Detail
                    value="MCQ"
                    label="FORMAT"
                  />

                  <Detail
                    value="∞"
                    label="RETAKES"
                  />
                </div>

                <button
                  className="start-button"
                  onClick={
                    startAssessment
                  }
                >
                  START ASSESSMENT
                  <span>
                    →
                  </span>
                </button>

                <button
                  className="back-link"
                  onClick={() =>
                    navigate(
                      "/practice/assessments"
                    )
                  }
                >
                  Return to assessments
                </button>
              </div>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  /* =======================================================
     RUNNING
  ======================================================= */

  return (
    <div className="assessment-running">
      <style>
        {ASSESSMENT_CSS}
      </style>

      <header className="test-header">
        <div className="brand">
          <div className="brand-mark">
            E
          </div>

          <div>
            <strong>
              ENGVIVA
            </strong>

            <small>
              ASSESSMENT
            </small>
          </div>
        </div>

        <div className="test-title">
          <strong>
            {title}
          </strong>

          <span>
            {company?.name ||
              companyId ||
              "Engineering Test"}
          </span>
        </div>

        <div className="header-right">
          <div
            className={
              remainingSeconds <=
              60
                ? "timer danger"
                : "timer"
            }
          >
            <small>
              TIME LEFT
            </small>

            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>
          </div>

          <div className="question-progress">
            {answeredCount}/
            {questions.length}
          </div>
        </div>
      </header>

      <div className="progress-line">
        <span
          style={{
            width: `${progressPercentage}%`,
          }}
        />
      </div>

      <main className="test-layout">
        <aside className="question-sidebar">
          <div className="sidebar-heading">
            <strong>
              QUESTIONS
            </strong>

            <span>
              {answeredCount}/
              {questions.length}
            </span>
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

                const current =
                  index ===
                  currentIndex;

                return (
                  <button
                    key={
                      question.id
                    }
                    className={[
                      current
                        ? "current"
                        : "",
                      answered
                        ? "answered"
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      goToQuestion(
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
                );
              }
            )}
          </div>

          <div className="sidebar-legend">
            <Legend
              label="Current"
              type="current"
            />

            <Legend
              label="Answered"
              type="answered"
            />

            <Legend
              label="Unanswered"
              type="empty"
            />
          </div>

          <div className="sidebar-summary">
            <span>
              PROGRESS
            </span>

            <strong>
              {progressPercentage}%
            </strong>

            <div>
              <i
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>
        </aside>

        <section className="question-section">
          <div className="question-top">
            <div>
              <span>
                QUESTION{" "}
                {String(
                  currentIndex + 1
                ).padStart(
                  2,
                  "0"
                )}{" "}
                /{" "}
                {String(
                  questions.length
                ).padStart(
                  2,
                  "0"
                )}
              </span>

              <b>
                {
                  currentQuestion?.category
                }
              </b>
            </div>

            <em>
              {
                currentQuestion?.difficulty
              }
            </em>
          </div>

          <div className="question-card">
            <div className="question-number">
              {String(
                currentIndex + 1
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

            <div className="options">
              {currentQuestion?.options.map(
                (
                  option,
                  optionIndex
                ) => {
                  const value =
                    typeof option ===
                    "object"
                      ? firstValue(
                          option?.value,
                          option?.text,
                          option?.label
                        )
                      : option;

                  const selected =
                    answers[
                      currentQuestion
                        .id
                    ] === value;

                  return (
                    <button
                      key={`${currentQuestion.id}-${optionIndex}`}
                      className={
                        selected
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          value
                        )
                      }
                    >
                      <b>
                        {String.fromCharCode(
                          65 +
                            optionIndex
                        )}
                      </b>

                      <span>
                        {value}
                      </span>

                      {selected && (
                        <i>
                          ✓
                        </i>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="question-actions">
            <button
              className="previous-button"
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

            <div className="answer-state">
              {answers[
                currentQuestion?.id
              ] !== undefined
                ? "✓ ANSWER SAVED"
                : "○ NOT ANSWERED"}
            </div>

            {currentIndex <
            questions.length - 1 ? (
              <button
                className="next-button"
                onClick={
                  nextQuestion
                }
              >
                NEXT QUESTION →
              </button>
            ) : (
              <button
                className="finish-button"
                onClick={() =>
                  setShowSubmitModal(
                    true
                  )
                }
              >
                FINISH TEST ✓
              </button>
            )}
          </div>
        </section>
      </main>

      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="submit-modal">
            <div className="modal-icon">
              ✓
            </div>

            <span className="eyebrow">
              FINAL SUBMISSION
            </span>

            <h2>
              Submit assessment?
            </h2>

            <p>
              Once submitted, your
              answers will be evaluated
              and your performance
              analysis will be generated.
            </p>

            <div className="modal-stats">
              <Detail
                value={
                  answeredCount
                }
                label="ANSWERED"
              />

              <Detail
                value={
                  unansweredCount
                }
                label="UNANSWERED"
              />

              <Detail
                value={formatTime(
                  remainingSeconds
                )}
                label="TIME LEFT"
              />
            </div>

            {submitError && (
              <div className="submit-error">
                {submitError}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="secondary-button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setShowSubmitModal(
                    false
                  )
                }
              >
                CONTINUE TEST
              </button>

              <button
                className="primary-button"
                disabled={
                  submitting
                }
                onClick={() =>
                  submitAssessment(
                    false
                  )
                }
              >
                {submitting
                  ? "SAVING RESULT..."
                  : "SUBMIT & ANALYSE →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   RESULT SCREEN
========================================================= */

function ResultScreen({
  result,
  testMeta,
  company,
  onRetake,
  onDashboard,
}) {
  const score =
    Number(
      result?.percentage ??
        result?.score ??
        0
    );

  const accuracy =
    Number(
      result?.accuracy ||
        0
    );

  const correct =
    Number(
      result?.correctAnswers ||
        0
    );

  const total =
    Number(
      result?.totalQuestions ||
        0
    );

  const answered =
    Number(
      result?.answeredQuestions ||
        0
    );

  const breakdown =
    Array.isArray(
      result?.categoryBreakdown
    )
      ? result.categoryBreakdown
      : [];

  let verdict =
    "Keep practising";

  if (score >= 90) {
    verdict =
      "Outstanding performance";
  } else if (score >= 80) {
    verdict =
      "Excellent performance";
  } else if (score >= 70) {
    verdict =
      "Strong performance";
  } else if (score >= 50) {
    verdict =
      "Developing performance";
  }

  return (
    <div className="result-screen">
      <style>
        {RESULT_CSS}
      </style>

      <div className="result-container">
        <header className="result-header">
          <div>
            <span className="eyebrow">
              ASSESSMENT COMPLETE
            </span>

            <h1>
              Your performance.
            </h1>

            <p>
              {company?.name ||
                "Engineering Assessment"}
              {" · "}
              {testMeta?.title ||
                "Aptitude Assessment"}
            </p>
          </div>

          <div className="completed-badge">
            <span>
              ✓
            </span>

            COMPLETED
          </div>
        </header>

        <section className="score-hero">
          <div className="score-circle">
            <div>
              <strong>
                {score}
              </strong>

              <span>
                / 100
              </span>
            </div>
          </div>

          <div className="score-copy">
            <span>
              OVERALL PERFORMANCE
            </span>

            <h2>
              {verdict}
            </h2>

            <p>
              You answered{" "}
              <strong>
                {correct}
              </strong>{" "}
              correctly out of{" "}
              <strong>
                {total}
              </strong>{" "}
              questions.
            </p>

            <small>
              Latest result saved for
              this assessment.
            </small>
          </div>
        </section>

        <section className="metrics">
          <Metric
            value={`${score}%`}
            label="SCORE"
          />

          <Metric
            value={`${accuracy}%`}
            label="ACCURACY"
          />

          <Metric
            value={correct}
            label="CORRECT"
          />

          <Metric
            value={answered}
            label="ANSWERED"
          />
        </section>

        <section className="analysis-panel">
          <div className="analysis-heading">
            <div>
              <span>
                PERFORMANCE ANALYSIS
              </span>

              <h2>
                Category breakdown
              </h2>
            </div>

            <small>
              LATEST ATTEMPT
            </small>
          </div>

          {breakdown.length >
          0 ? (
            <div className="breakdown-list">
              {breakdown.map(
                (
                  item,
                  index
                ) => {
                  const value =
                    Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          item?.score
                        ) || 0
                      )
                    );

                  return (
                    <div
                      className="breakdown-row"
                      key={`${item?.name}-${index}`}
                    >
                      <div className="breakdown-title">
                        <span>
                          {item?.name ||
                            "General"}
                        </span>

                        <strong>
                          {value}%
                        </strong>
                      </div>

                      <div className="breakdown-track">
                        <i
                          style={{
                            width: `${value}%`,
                          }}
                        />
                      </div>

                      <div className="breakdown-meta">
                        {item?.correct ??
                          0}{" "}
                        correct /{" "}
                        {item?.total ??
                          0}{" "}
                        questions
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="empty-analysis">
              <div>
                —
              </div>

              <p>
                Category-level analysis
                is not available for
                this assessment.
              </p>
            </div>
          )}
        </section>

        <div className="result-note">
          <div>
            ✓
          </div>

          <p>
            This result is stored as
            the latest performance for
            this assessment. If you
            retake the same assessment,
            the latest result can update
            the dashboard analysis.
          </p>
        </div>

        <div className="result-actions">
          <button
            className="result-secondary"
            onClick={
              onRetake
            }
          >
            RETAKE ASSESSMENT
          </button>

          <button
            className="result-primary"
            onClick={
              onDashboard
            }
          >
            VIEW DASHBOARD →
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Shell({
  children,
}) {
  return (
    <div className="assessment-shell">
      <style>
        {ASSESSMENT_CSS}
      </style>

      {children}
    </div>
  );
}

function InfoRow({
  number,
  title,
  text,
}) {
  return (
    <div className="info-row">
      <div className="info-number">
        {number}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
  );
}

function Detail({
  value,
  label,
}) {
  return (
    <div className="detail">
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

function Legend({
  label,
  type,
}) {
  return (
    <div className="legend">
      <i
        className={type}
      />

      <span>
        {label}
      </span>
    </div>
  );
}

function Metric({
  value,
  label,
}) {
  return (
    <div className="metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   MAIN / ASSESSMENT CSS
========================================================= */

const ASSESSMENT_CSS = `
* {
  box-sizing: border-box;
}

button {
  font: inherit;
}

.assessment-shell,
.assessment-running {
  min-height: 100vh;
  width: 100%;
  color: #f7f5fb;
  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(160,110,255,.12),
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

.eyebrow {
  color: #a88bd0;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 2px;
}

.assessment-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  padding: 30px;
}

.loading-spinner {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border:
    4px solid rgba(201,167,255,.12);
  border-top-color: #c9a7ff;
  animation:
    assessment-spin
    1s linear infinite;
  margin-bottom: 25px;
}

@keyframes assessment-spin {
  to {
    transform: rotate(360deg);
  }
}

.assessment-loading h1 {
  margin: 12px 0 8px;
  font-size: 36px;
}

.assessment-loading p {
  margin: 0;
  color: #807986;
  font-size: 14px;
}

.error-page {
  width:
    min(650px, calc(100% - 30px));
  margin: 12vh auto;
  padding: 45px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 28px;
  background:
    rgba(255,255,255,.03);
  text-align: center;
}

.error-icon {
  width: 65px;
  height: 65px;
  margin: 0 auto 20px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #ff8b9b;
  background:
    rgba(255,80,100,.08);
  border:
    1px solid rgba(255,80,100,.18);
  font-size: 25px;
  font-weight: 950;
}

.error-page h1 {
  font-size: 34px;
  margin: 12px 0;
}

.error-page p {
  color: #817b88;
  line-height: 1.7;
  font-size: 14px;
}

.error-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 25px;
}

.primary-button,
.secondary-button {
  min-height: 50px;
  border-radius: 13px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 1px;
  cursor: pointer;
}

.primary-button {
  border: 0;
  color: #160d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #ad82ec
    );
}

.secondary-button {
  border:
    1px solid rgba(255,255,255,.08);
  color: #b5aebb;
  background:
    rgba(255,255,255,.035);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* READY */

.ready-page {
  width:
    min(1250px, calc(100% - 50px));
  margin: auto;
  padding: 55px 0 80px;
}

.ready-header {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  align-items: flex-start;
  margin-bottom: 35px;
}

.ready-header h1 {
  margin: 10px 0 7px;
  font-size:
    clamp(38px, 5vw, 62px);
  line-height: 1;
  letter-spacing: -2px;
}

.ready-header p {
  color: #817b88;
  font-size: 14px;
  margin: 0;
}

.ready-badge {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 15px;
  border-radius: 13px;
  border:
    1px solid rgba(120,215,150,.16);
  background:
    rgba(120,215,150,.04);
  color: #91dba8;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1px;
}

.ready-badge span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7edb9b;
  box-shadow:
    0 0 12px rgba(126,219,155,.8);
}

.ready-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.25fr)
    minmax(350px, .75fr);
  gap: 20px;
}

.overview-card,
.info-panel,
.start-card {
  border:
    1px solid rgba(255,255,255,.07);
  border-radius: 26px;
  background:
    rgba(255,255,255,.025);
}

.overview-card {
  display: flex;
  gap: 20px;
  padding: 30px;
  margin-bottom: 18px;
}

.overview-number {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background:
    rgba(201,167,255,.08);
  color: #c9a7ff;
  font-weight: 950;
}

.card-label {
  color: #7f7788;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.6px;
}

.overview-card h2 {
  margin: 9px 0;
  font-size: 27px;
}

.overview-card p {
  margin: 0;
  max-width: 720px;
  color: #85808d;
  font-size: 14px;
  line-height: 1.75;
}

.info-panel {
  padding: 25px;
}

.panel-title {
  padding-bottom: 16px;
  border-bottom:
    1px solid rgba(255,255,255,.06);
}

.panel-title h3 {
  margin: 7px 0 0;
  font-size: 18px;
}

.info-row {
  display: flex;
  gap: 14px;
  padding: 17px 0;
  border-bottom:
    1px solid rgba(255,255,255,.05);
}

.info-row:last-child {
  border-bottom: 0;
}

.info-number {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background:
    rgba(201,167,255,.07);
  color: #a88bd0;
  font-size: 9px;
  font-weight: 950;
}

.info-row strong,
.info-row span {
  display: block;
}

.info-row strong {
  font-size: 13px;
  margin-bottom: 4px;
}

.info-row span {
  color: #77717e;
  font-size: 11px;
  line-height: 1.55;
}

.start-card {
  padding: 28px;
  position: sticky;
  top: 20px;
}

.start-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  margin-bottom: 25px;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a87ce7
    );
  color: #180d21;
  font-weight: 950;
  font-size: 20px;
}

.start-card h2 {
  margin: 10px 0;
  font-size: 32px;
}

.start-card p {
  color: #7e7885;
  font-size: 12px;
  line-height: 1.65;
}

.detail-grid {
  display: grid;
  grid-template-columns:
    repeat(2, 1fr);
  gap: 9px;
  margin: 20px 0;
}

.detail {
  min-height: 75px;
  border-radius: 14px;
  border:
    1px solid rgba(255,255,255,.06);
  background:
    rgba(255,255,255,.025);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 4px;
}

.detail strong {
  font-size: 20px;
}

.detail span {
  color: #716a79;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.start-button {
  width: 100%;
  height: 54px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 17px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 1px;
}

.start-button span {
  font-size: 18px;
}

.back-link {
  width: 100%;
  border: 0;
  background: transparent;
  color: #68616e;
  margin-top: 13px;
  cursor: pointer;
  font-size: 10px;
}

/* RUNNING */

.assessment-running {
  display: flex;
  flex-direction: column;
}

.test-header {
  min-height: 76px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 25px;
  border-bottom:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(8,7,12,.98);
}

.brand {
  min-width: 175px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
  font-weight: 950;
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  font-size: 12px;
  letter-spacing: 1px;
}

.brand small {
  color: #6d6675;
  font-size: 7px;
  margin-top: 2px;
  letter-spacing: 1.5px;
  font-weight: 900;
}

.test-title {
  flex: 1;
}

.test-title strong,
.test-title span {
  display: block;
}

.test-title strong {
  font-size: 13px;
}

.test-title span {
  color: #716a78;
  font-size: 9px;
  margin-top: 3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer {
  min-width: 115px;
  padding: 8px 13px;
  border-radius: 12px;
  border:
    1px solid rgba(201,167,255,.13);
  background:
    rgba(201,167,255,.06);
  display: flex;
  align-items: center;
  gap: 9px;
  color: #d7c1fa;
}

.timer small {
  color: #716a78;
  font-size: 7px;
  letter-spacing: 1px;
}

.timer strong {
  font-size: 17px;
}

.timer.danger {
  color: #ff8999;
  border-color:
    rgba(255,80,100,.25);
  background:
    rgba(255,80,100,.08);
}

.question-progress {
  padding: 11px 14px;
  border-radius: 12px;
  color: #aaa2af;
  background:
    rgba(255,255,255,.035);
  font-size: 10px;
  font-weight: 900;
}

.progress-line {
  height: 3px;
  background:
    rgba(255,255,255,.05);
}

.progress-line span {
  display: block;
  height: 100%;
  background:
    linear-gradient(
      90deg,
      #a87ce7,
      #dccaff
    );
  transition: width .2s ease;
}

.test-layout {
  flex: 1;
  min-height:
    calc(100vh - 79px);
  display: grid;
  grid-template-columns:
    245px
    minmax(0, 1fr);
}

.question-sidebar {
  padding: 20px;
  border-right:
    1px solid rgba(255,255,255,.06);
  background:
    rgba(255,255,255,.012);
  display: flex;
  flex-direction: column;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 17px;
}

.sidebar-heading strong {
  color: #817a89;
  font-size: 9px;
  letter-spacing: 1.7px;
}

.sidebar-heading span {
  color: #c9a7ff;
  font-size: 10px;
  font-weight: 950;
}

.question-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 7px;
}

.question-grid button {
  aspect-ratio: 1;
  border-radius: 10px;
  cursor: pointer;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
  color: #77717f;
  font-size: 9px;
  font-weight: 950;
}

.question-grid button.current {
  border-color:
    rgba(201,167,255,.45);
  background:
    rgba(201,167,255,.14);
  color: #dfcfff;
}

.question-grid button.answered {
  border-color:
    rgba(120,215,150,.22);
  background:
    rgba(120,215,150,.07);
  color: #91dba8;
}

.question-grid button.current.answered {
  border-color:
    rgba(201,167,255,.45);
  background:
    rgba(201,167,255,.14);
  color: #dfcfff;
}

.sidebar-legend {
  margin-top: 20px;
  padding-top: 17px;
  border-top:
    1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.legend {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6d6674;
  font-size: 9px;
}

.legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #45404b;
}

.legend i.current {
  background: #c9a7ff;
}

.legend i.answered {
  background: #80d69a;
}

.sidebar-summary {
  margin-top: auto;
  padding: 15px;
  border-radius: 14px;
  background:
    rgba(201,167,255,.035);
  border:
    1px solid rgba(201,167,255,.07);
}

.sidebar-summary > span {
  color: #716a78;
  font-size: 8px;
  letter-spacing: 1px;
  font-weight: 900;
}

.sidebar-summary strong {
  display: block;
  margin: 7px 0;
  font-size: 24px;
}

.sidebar-summary > div {
  height: 5px;
  overflow: hidden;
  border-radius: 20px;
  background:
    rgba(255,255,255,.06);
}

.sidebar-summary i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #a87ce7,
      #dccaff
    );
}

.question-section {
  padding:
    38px
    clamp(25px, 5vw, 75px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.question-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.question-top > div > span {
  display: block;
  color: #89818f;
  font-size: 9px;
  letter-spacing: 1.7px;
  font-weight: 950;
}

.question-top b {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 9px;
  border-radius: 8px;
  background:
    rgba(201,167,255,.06);
  color: #aa8ed0;
  font-size: 8px;
}

.question-top em {
  padding: 7px 10px;
  border:
    1px solid rgba(255,255,255,.07);
  border-radius: 9px;
  color: #77707f;
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
}

.question-card {
  flex: 1;
  padding:
    clamp(25px, 4vw, 55px);
  border-radius: 26px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.018)
    );
  border:
    1px solid rgba(255,255,255,.075);
}

.question-number {
  color: #a88bc8;
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 950;
  margin-bottom: 18px;
}

.question-card h1 {
  max-width: 1000px;
  margin: 0;
  font-size:
    clamp(23px, 3vw, 34px);
  line-height: 1.4;
  letter-spacing: -.5px;
}

.options {
  margin-top: 34px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.options button {
  width: 100%;
  min-height: 66px;
  border-radius: 15px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  text-align: left;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
  color: #c4becb;
}

.options button:hover {
  background:
    rgba(255,255,255,.05);
}

.options button.selected {
  border-color:
    rgba(201,167,255,.45);
  background:
    rgba(201,167,255,.09);
  color: #fff;
}

.options button > b {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background:
    rgba(255,255,255,.045);
  color: #837b8d;
}

.options button.selected > b {
  color: #decaff;
  background:
    rgba(201,167,255,.16);
}

.options button > span {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
}

.options button > i {
  color: #c9a7ff;
  font-size: 18px;
  font-style: normal;
  font-weight: 950;
}

.question-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.previous-button,
.next-button,
.finish-button {
  min-height: 46px;
  padding: 0 17px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1px;
}

.previous-button {
  color: #b0a9b6;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.035);
}

.previous-button:disabled {
  opacity: .3;
  cursor: not-allowed;
}

.next-button {
  border: 0;
  color: #170d20;
  background:
    linear-gradient(
      135deg,
      #dccaff,
      #a97de8
    );
}

.finish-button {
  border: 0;
  color: #0b1b10;
  background:
    linear-gradient(
      135deg,
      #9ee6b4,
      #69cf8a
    );
}

.answer-state {
  color: #77707e;
  font-size: 9px;
  font-weight: 900;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
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
    min(540px, 100%);
  padding: 34px;
  border-radius: 26px;
  border:
    1px solid rgba(255,255,255,.1);
  background:
    linear-gradient(
      145deg,
      #17131e,
      #0d0b11
    );
  box-shadow:
    0 35px 100px
    rgba(0,0,0,.5);
}

.modal-icon {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: #c9a7ff;
  background:
    rgba(201,167,255,.1);
  font-size: 20px;
  font-weight: 950;
  margin-bottom: 18px;
}

.submit-modal h2 {
  margin: 9px 0;
  font-size: 28px;
}

.submit-modal p {
  color: #85808d;
  font-size: 13px;
  line-height: 1.65;
}

.modal-stats {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);
  gap: 8px;
  margin: 20px 0;
}

.modal-actions {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 10px;
}

.submit-error {
  margin: 12px 0;
  padding: 12px;
  border-radius: 10px;
  color: #ff9aa7;
  background:
    rgba(255,80,100,.06);
  border:
    1px solid rgba(255,80,100,.12);
  font-size: 10px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .ready-grid {
    grid-template-columns: 1fr;
  }

  .start-card {
    position: static;
  }

  .test-layout {
    grid-template-columns:
      190px
      minmax(0, 1fr);
  }

  .test-title {
    display: none;
  }

  .brand {
    min-width: auto;
  }
}

@media (max-width: 700px) {
  .ready-page {
    width:
      calc(100% - 28px);
    padding-top: 30px;
  }

  .ready-header {
    flex-direction: column;
  }

  .ready-header h1 {
    font-size: 38px;
  }

  .error-actions,
  .modal-actions {
    grid-template-columns: 1fr;
  }

  .test-header {
    padding: 0 12px;
  }

  .header-right {
    margin-left: auto;
  }

  .question-progress {
    display: none;
  }

  .test-layout {
    grid-template-columns: 1fr;
  }

  .question-sidebar {
    display: none;
  }

  .question-section {
    padding:
      25px 15px;
  }

  .question-card {
    padding: 22px;
  }

  .question-card h1 {
    font-size: 22px;
  }

  .question-actions {
    flex-wrap: wrap;
  }

  .answer-state {
    width: 100%;
    text-align: center;
    order: 3;
  }
}

@media (max-width: 480px) {
  .timer {
    min-width: 92px;
  }

  .timer small {
    display: none;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
  }

  .brand strong {
    font-size: 10px;
  }

  .options button {
    min-height: 60px;
  }

  .options button > span {
    font-size: 13px;
  }

  .modal-stats {
    grid-template-columns: 1fr;
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

.result-screen {
  min-height: 100vh;
  color: #f8f5fb;
  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(160,110,255,.14),
      transparent 34%
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
  padding: 45px 20px 70px;
}

.result-container {
  width:
    min(1100px, 100%);
  margin: auto;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 25px;
  margin-bottom: 30px;
}

.result-header h1 {
  margin: 9px 0 6px;
  font-size:
    clamp(38px, 5vw, 62px);
  line-height: 1;
  letter-spacing: -2px;
}

.result-header p {
  margin: 0;
  color: #817a88;
  font-size: 13px;
}

.completed-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 13px;
  border:
    1px solid rgba(120,215,150,.17);
  background:
    rgba(120,215,150,.04);
  color: #91dba8;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1px;
}

.completed-badge span {
  font-size: 14px;
}

.score-hero {
  min-height: 270px;
  padding: 35px;
  border-radius: 28px;
  border:
    1px solid rgba(255,255,255,.08);
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.05),
      rgba(255,255,255,.018)
    );
  display: flex;
  align-items: center;
  gap: 50px;
}

.score-circle {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(
      circle,
      #110d16 62%,
      transparent 63%
    ),
    conic-gradient(
      #c9a7ff 0deg,
      #a67ae5 280deg,
      rgba(255,255,255,.06) 280deg
    );
}

.score-circle > div {
  display: flex;
  align-items: baseline;
}

.score-circle strong {
  font-size: 55px;
  letter-spacing: -3px;
}

.score-circle span {
  color: #77707e;
  font-size: 13px;
}

.score-copy > span {
  color: #817989;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.8px;
}

.score-copy h2 {
  margin: 9px 0;
  font-size: 32px;
}

.score-copy p {
  margin: 0;
  color: #89828f;
  font-size: 14px;
  line-height: 1.7;
}

.score-copy p strong {
  color: #ddd5e2;
}

.score-copy small {
  display: block;
  margin-top: 14px;
  color: #6e6875;
  font-size: 10px;
}

.metrics {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 10px;
  margin: 14px 0;
}

.metric {
  padding: 20px;
  border-radius: 17px;
  border:
    1px solid rgba(255,255,255,.06);
  background:
    rgba(255,255,255,.025);
}

.metric span,
.metric strong {
  display: block;
}

.metric span {
  color: #706a78;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1.4px;
}

.metric strong {
  margin-top: 7px;
  font-size: 25px;
}

.analysis-panel {
  padding: 27px;
  border-radius: 24px;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
}

.analysis-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 23px;
}

.analysis-heading span {
  color: #817989;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1.7px;
}

.analysis-heading h2 {
  margin: 8px 0 0;
  font-size: 22px;
}

.analysis-heading small {
  color: #6c6673;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.breakdown-row {
  padding-bottom: 20px;
  border-bottom:
    1px solid rgba(255,255,255,.05);
}

.breakdown-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.breakdown-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.breakdown-title span {
  color: #c4beca;
  font-size: 13px;
  font-weight: 800;
}

.breakdown-title strong {
  color: #c9a7ff;
  font-size: 13px;
}

.breakdown-track {
  height: 8px;
  border-radius: 20px;
  overflow: hidden;
  background:
    rgba(255,255,255,.06);
}

.breakdown-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #a87ce7,
      #dccaff
    );
}

.breakdown-meta {
  color: #66606c;
  font-size: 9px;
  margin-top: 7px;
}

.empty-analysis {
  min-height: 150px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #6e6875;
}

.empty-analysis div {
  font-size: 35px;
}

.empty-analysis p {
  font-size: 11px;
}

.result-note {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 13px;
  padding: 15px;
  border-radius: 14px;
  border:
    1px solid rgba(201,167,255,.08);
  background:
    rgba(201,167,255,.025);
}

.result-note > div {
  width: 29px;
  height: 29px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #c9a7ff;
  background:
    rgba(201,167,255,.08);
}

.result-note p {
  margin: 0;
  color: #716b78;
  font-size: 10px;
  line-height: 1.55;
}

.result-actions {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.result-primary,
.result-secondary {
  min-height: 53px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 1px;
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

.result-secondary {
  color: #b7afbc;
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.035);
}

@media (max-width: 750px) {
  .result-screen {
    padding:
      30px 14px 50px;
  }

  .result-header {
    flex-direction: column;
  }

  .score-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 25px;
    padding: 25px;
  }

  .score-circle {
    width: 155px;
    height: 155px;
  }

  .score-circle strong {
    font-size: 45px;
  }

  .metrics {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .result-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 450px) {
  .metrics {
    grid-template-columns: 1fr 1fr;
  }

  .analysis-panel {
    padding: 20px;
  }
}
`;