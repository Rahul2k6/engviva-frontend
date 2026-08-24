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

const PROCTORING_RULES = [
  "Camera and microphone must remain enabled.",
  "The assessment must remain in fullscreen mode.",
  "Do not switch tabs or minimize the browser.",
  "Leaving the assessment window will terminate the attempt.",
  "Your answers are automatically preserved during the session.",
];

function normalizeQuestions(payload) {
  let source = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (Array.isArray(payload.questions)) {
    source = payload.questions;
  } else if (Array.isArray(payload.data)) {
    source = payload.data;
  } else if (Array.isArray(payload.assessment?.questions)) {
    source = payload.assessment.questions;
  }

  return source
    .map((item, index) => ({
      id:
        item.id ||
        item.questionId ||
        item._id ||
        `question-${index + 1}`,

      question:
        item.question ||
        item.text ||
        item.questionText ||
        `Question ${index + 1}`,

      options:
        Array.isArray(item.options)
          ? item.options
          : Array.isArray(item.choices)
          ? item.choices
          : [],

      type:
        item.type ||
        "mcq",

      category:
        item.category ||
        item.topic ||
        "Aptitude",

      difficulty:
        item.difficulty ||
        item.level ||
        "Mixed",

      marks:
        Number(item.marks) || 1,
    }))
    .filter((q) => q.options.length > 0);
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);

  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

function getAssessmentFromState(location) {
  return (
    location.state?.assessment ||
    location.state?.test ||
    null
  );
}

function getCompanyFromState(location) {
  return (
    location.state?.company ||
    null
  );
}

export default function AssessmentTest() {
  const navigate = useNavigate();
  const location = useLocation();

  const assessment = getAssessmentFromState(location);
  const company = getCompanyFromState(location);

  const assessmentId =
    assessment?.id ||
    assessment?.assessmentId ||
    assessment?.testId ||
    "";

  const companyId =
    location.state?.companyId ||
    company?.id ||
    company?.slug ||
    "";

  const assessmentTitle =
    assessment?.title ||
    assessment?.name ||
    "Aptitude Assessment";

  const durationMinutes =
    Number(
      assessment?.duration ||
        assessment?.durationMinutes ||
        assessment?.timeLimit
    ) || 20;

  /*
   * ------------------------------------------------------------
   * CORE STATE
   * ------------------------------------------------------------
   */

  const [phase, setPhase] = useState("loading");

  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState({});

  const [remainingSeconds, setRemainingSeconds] = useState(
    durationMinutes * 60
  );

  const [startedAt, setStartedAt] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [cameraReady, setCameraReady] = useState(false);

  const [microphoneReady, setMicrophoneReady] =
    useState(false);

  const [fullscreenReady, setFullscreenReady] =
    useState(false);

  const [proctorStatus, setProctorStatus] =
    useState("CHECKING");

  const [violations, setViolations] = useState([]);

  const [showSubmitModal, setShowSubmitModal] =
    useState(false);

  const [terminationReason, setTerminationReason] =
    useState("");

  const [showRules, setShowRules] = useState(true);

  const [connectionStatus, setConnectionStatus] =
    useState("CONNECTED");

  const cameraRef = useRef(null);

  const mediaStreamRef = useRef(null);

  const timerRef = useRef(null);

  const startedRef = useRef(false);

  const terminatingRef = useRef(false);

  const submittingRef = useRef(false);

  const currentQuestion =
    questions[currentIndex] || null;

  /*
   * ------------------------------------------------------------
   * FIREBASE TOKEN
   * ------------------------------------------------------------
   */

  const getFirebaseToken = useCallback(async () => {
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
      console.warn(
        "[ENGVIVA] Could not obtain Firebase token",
        err
      );
    }

    return null;
  }, []);

  /*
   * ------------------------------------------------------------
   * API HELPER
   * ------------------------------------------------------------
   */

  const apiFetch = useCallback(
    async (url, options = {}) => {
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

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [getFirebaseToken]
  );

  /*
   * ------------------------------------------------------------
   * LOAD QUESTIONS
   * ------------------------------------------------------------
   */

  const loadQuestions = useCallback(async () => {
    setPhase("loading");
    setError("");

    try {
      if (!assessmentId) {
        throw new Error(
          "No assessment was selected."
        );
      }

      const endpoints = [
        `${API_BASE}/api/assessments/${encodeURIComponent(
          assessmentId
        )}/questions?company=${encodeURIComponent(
          companyId
        )}`,

        `${API_BASE}/api/assessments/questions?assessmentId=${encodeURIComponent(
          assessmentId
        )}&company=${encodeURIComponent(companyId)}`,

        `${API_BASE}/api/assessments/${encodeURIComponent(
          assessmentId
        )}`,
      ];

      let payload = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await apiFetch(endpoint);

          if (!response.ok) {
            lastError = new Error(
              `Request failed: ${response.status}`
            );
            continue;
          }

          payload = await response.json();

          if (payload) break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!payload) {
        throw (
          lastError ||
          new Error(
            "Could not load assessment questions."
          )
        );
      }

      const normalized =
        normalizeQuestions(payload);

      if (!normalized.length) {
        throw new Error(
          "No questions were returned for this assessment."
        );
      }

      setQuestions(normalized);

      setRemainingSeconds(
        durationMinutes * 60
      );

      setPhase("ready");
    } catch (err) {
      console.error(
        "[ENGVIVA] Question loading failed:",
        err
      );

      setError(
        err.message ||
          "Unable to load the assessment."
      );

      setPhase("error");
    }
  }, [
    API_BASE,
    apiFetch,
    assessmentId,
    companyId,
    durationMinutes,
  ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  /*
   * ------------------------------------------------------------
   * CAMERA / MICROPHONE
   * ------------------------------------------------------------
   */

  const requestMedia = useCallback(async () => {
    setError("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Your browser does not support camera and microphone access."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: true,
        });

      mediaStreamRef.current = stream;

      const videoTracks =
        stream.getVideoTracks();

      const audioTracks =
        stream.getAudioTracks();

      setCameraReady(videoTracks.length > 0);

      setMicrophoneReady(
        audioTracks.length > 0
      );

      if (cameraRef.current) {
        cameraRef.current.srcObject =
          stream;
      }

      return true;
    } catch (err) {
      console.error(
        "[ENGVIVA] Media permission failed:",
        err
      );

      setCameraReady(false);
      setMicrophoneReady(false);

      setError(
        "Camera and microphone access is required for the proctored assessment."
      );

      return false;
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * FULLSCREEN
   * ------------------------------------------------------------
   */

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      setFullscreenReady(true);

      return true;
    } catch (err) {
      console.error(
        "[ENGVIVA] Fullscreen failed:",
        err
      );

      setFullscreenReady(false);

      setError(
        "Fullscreen permission is required for the proctored assessment."
      );

      return false;
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * PROCTORING TERMINATION
   * ------------------------------------------------------------
   */

  const stopMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      mediaStreamRef.current = null;
    }
  }, []);

  const leaveFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen cleanup errors.
    }
  }, []);

  const terminateAssessment = useCallback(
    async (reason) => {
      if (
        terminatingRef.current ||
        submittingRef.current
      ) {
        return;
      }

      terminatingRef.current = true;

      setTerminationReason(reason);

      setProctorStatus("TERMINATED");

      setViolations((previous) => [
        ...previous,
        {
          type: reason,
          timestamp: new Date().toISOString(),
        },
      ]);

      stopMedia();

      await leaveFullscreen();

      setPhase("terminated");
    },
    [leaveFullscreen, stopMedia]
  );

  /*
   * ------------------------------------------------------------
   * PROCTOR EVENT LISTENERS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!startedRef.current) return;

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        terminateAssessment(
          "TAB_SWITCH_OR_WINDOW_EXIT"
        );
      }
    };

    const handleBlur = () => {
      terminateAssessment(
        "WINDOW_FOCUS_LOST"
      );
    };

    const handleFullscreen = () => {
      if (
        startedRef.current &&
        !document.fullscreenElement
      ) {
        terminateAssessment(
          "FULLSCREEN_EXIT"
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "blur",
      handleBlur
    );

    document.addEventListener(
      "fullscreenchange",
      handleFullscreen
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "blur",
        handleBlur
      );

      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen
      );
    };
  }, [terminateAssessment]);

  /*
   * ------------------------------------------------------------
   * START PROCTORED SESSION
   * ------------------------------------------------------------
   */

  const startAssessment = async () => {
    setError("");

    const mediaOK =
      cameraReady && microphoneReady
        ? true
        : await requestMedia();

    if (!mediaOK) {
      return;
    }

    const fullscreenOK =
      document.fullscreenElement
        ? true
        : await enterFullscreen();

    if (!fullscreenOK) {
      return;
    }

    startedRef.current = true;

    submittingRef.current = false;

    terminatingRef.current = false;

    setStartedAt(
      new Date().toISOString()
    );

    setProctorStatus("ACTIVE");

    setPhase("running");

    setRemainingSeconds(
      durationMinutes * 60
    );

    setCurrentIndex(0);

    setShowRules(false);
  };

  /*
   * ------------------------------------------------------------
   * TIMER
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          clearInterval(timerRef.current);

          setTimeout(() => {
            setShowSubmitModal(false);

            submitAssessment(true);
          }, 0);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [phase]);

  /*
   * ------------------------------------------------------------
   * BEFORE UNLOAD
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const preventAccidentalExit = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      preventAccidentalExit
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        preventAccidentalExit
      );
    };
  }, [phase]);

  /*
   * ------------------------------------------------------------
   * CLEANUP
   * ------------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);

      stopMedia();
    };
  }, [stopMedia]);

  /*
   * ------------------------------------------------------------
   * ANSWERS
   * ------------------------------------------------------------
   */

  const selectAnswer = (questionId, value) => {
    if (phase !== "running") return;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  /*
   * ------------------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------------------
   */

  const goToQuestion = (index) => {
    if (
      index < 0 ||
      index >= questions.length ||
      phase !== "running"
    ) {
      return;
    }

    setCurrentIndex(index);
  };

  const nextQuestion = () => {
    if (
      currentIndex <
      questions.length - 1
    ) {
      setCurrentIndex(
        currentIndex + 1
      );
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(
        currentIndex - 1
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * PROGRESS
   * ------------------------------------------------------------
   */

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          answers[question.id] !==
          undefined
      ).length,
    [answers, questions]
  );

  const unansweredCount =
    questions.length -
    answeredCount;

  const progressPercentage =
    questions.length
      ? Math.round(
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  /*
   * ------------------------------------------------------------
   * SUBMIT
   * ------------------------------------------------------------
   */

  const submitAssessment = useCallback(
    async (automatic = false) => {
      if (
        submittingRef.current ||
        phase === "terminated"
      ) {
        return;
      }

      submittingRef.current = true;

      setSubmitting(true);

      clearInterval(timerRef.current);

      try {
        const completedAt =
          new Date().toISOString();

        const usedSeconds =
          durationMinutes * 60 -
          remainingSeconds;

        const payload = {
          assessmentId,
          companyId,

          assessmentTitle,

          startedAt,
          completedAt,

          answers,

          totalQuestions:
            questions.length,

          answeredQuestions:
            answeredCount,

          unansweredQuestions:
            unansweredCount,

          timeAllowedSeconds:
            durationMinutes * 60,

          timeUsedSeconds:
            Math.max(0, usedSeconds),

          automaticSubmission:
            automatic,

          proctoring: {
            status:
              violations.length > 0
                ? "VIOLATION"
                : "COMPLETED",

            violations,

            fullscreen: Boolean(
              fullscreenReady
            ),

            camera:
              cameraReady,

            microphone:
              microphoneReady,
          },
        };

        const response = await apiFetch(
          `${API_BASE}/api/assessments/submit`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Submission failed (${response.status})`
          );
        }

        const result =
          await response.json();

        stopMedia();

        await leaveFullscreen();

        startedRef.current = false;

        const attemptId =
          result.attemptId ||
          result.id ||
          result.data?.attemptId;

        if (!attemptId) {
          throw new Error(
            "Assessment submitted, but the backend did not return an attempt ID."
          );
        }

        navigate(
          `/reports/${encodeURIComponent(
            attemptId
          )}`,
          {
            replace: true,
            state: {
              source: "assessment",
              assessmentId,
              companyId,
              assessmentTitle,
              result,
            },
          }
        );
      } catch (err) {
        console.error(
          "[ENGVIVA] Assessment submission failed:",
          err
        );

        submittingRef.current = false;

        setSubmitting(false);

        setError(
          err.message ||
            "Unable to submit your assessment."
        );
      }
    },
    [
      API_BASE,
      answeredCount,
      unansweredCount,
      answers,
      assessmentId,
      assessmentTitle,
      cameraReady,
      companyId,
      durationMinutes,
      fullscreenReady,
      leaveFullscreen,
      navigate,
      phase,
      questions.length,
      remainingSeconds,
      startedAt,
      stopMedia,
      violations,
      microphoneReady,
      apiFetch,
    ]
  );

  /*
   * ------------------------------------------------------------
   * TERMINATED SCREEN
   * ------------------------------------------------------------
   */

  if (phase === "terminated") {
    return (
      <div style={styles.page}>
        <div style={styles.centerScreen}>
          <div style={styles.terminationCard}>
            <div style={styles.dangerIcon}>
              !
            </div>

            <div style={styles.overline}>
              PROCTORING TERMINATED
            </div>

            <h1 style={styles.terminationTitle}>
              Assessment Failed
            </h1>

            <p style={styles.terminationText}>
              Your proctored session was
              terminated because a
              proctoring rule was violated.
            </p>

            <div style={styles.reasonBox}>
              <span>
                VIOLATION
              </span>

              <strong>
                {terminationReason}
              </strong>
            </div>

            <button
              style={styles.primaryButton}
              onClick={() =>
                navigate(
                  `/reports/${encodeURIComponent(
                    "pending"
                  )}`,
                  {
                    state: {
                      source: "assessment",
                      status: "failed",
                      assessmentId,
                      companyId,
                      reason:
                        terminationReason,
                    },
                  }
                )
              }
            >
              VIEW RESULT
              <span>→</span>
            </button>

            <button
              style={styles.textButton}
              onClick={() =>
                navigate("/practice/assessments")
              }
            >
              BACK TO ASSESSMENTS
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * ERROR SCREEN
   * ------------------------------------------------------------
   */

  if (phase === "error") {
    return (
      <div style={styles.page}>
        <div style={styles.centerScreen}>
          <div style={styles.errorLargeCard}>
            <div style={styles.errorIcon}>
              !
            </div>

            <div style={styles.overline}>
              ASSESSMENT ENGINE
            </div>

            <h1 style={styles.largeTitle}>
              Unable to load test
            </h1>

            <p style={styles.largeDescription}>
              {error}
            </p>

            <div style={styles.errorActions}>
              <button
                style={styles.primaryButton}
                onClick={loadQuestions}
              >
                RETRY
                <span>↻</span>
              </button>

              <button
                style={styles.secondaryButton}
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
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   */

  if (phase === "loading") {
    return (
      <div style={styles.page}>
        <div style={styles.centerScreen}>
          <div style={styles.loaderRing} />

          <div style={styles.loadingTitle}>
            Preparing assessment
          </div>

          <div style={styles.loadingText}>
            Securely loading your question set...
          </div>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * PRE-TEST READY SCREEN
   * ------------------------------------------------------------
   */

  if (phase === "ready") {
    return (
      <div style={styles.page}>
        <div style={styles.preTestShell}>

          <header style={styles.preHeader}>
            <div>
              <div style={styles.overline}>
                ENGVIVA / PROCTORED LAB
              </div>

              <h1 style={styles.preTitle}>
                {assessmentTitle}
              </h1>

              <p style={styles.preSubtitle}>
                {company?.name ||
                  companyId ||
                  "Selected Company"}{" "}
                · Secure assessment session
              </p>
            </div>

            <div style={styles.secureBadge}>
              <span style={styles.secureDot} />
              SECURE SESSION
            </div>
          </header>

          <div style={styles.preGrid}>

            {/* LEFT */}

            <div>

              <div style={styles.bigIntroCard}>
                <div style={styles.introNumber}>
                  01
                </div>

                <div>
                  <div style={styles.cardLabel}>
                    ASSESSMENT OVERVIEW
                  </div>

                  <h2 style={styles.introTitle}>
                    You're about to enter
                    proctoring mode.
                  </h2>

                  <p style={styles.introText}>
                    Once you start, the
                    assessment timer begins
                    immediately. Your session
                    must remain in fullscreen.
                  </p>
                </div>
              </div>

              <div style={styles.rulesCard}>
                <div style={styles.cardHeaderRow}>
                  <h3 style={styles.cardTitle}>
                    Proctoring rules
                  </h3>

                  <span style={styles.required}>
                    REQUIRED
                  </span>
                </div>

                {PROCTORING_RULES.map(
                  (rule, index) => (
                    <div
                      key={rule}
                      style={styles.rule}
                    >
                      <div
                        style={
                          styles.ruleNumber
                        }
                      >
                        {index + 1}
                      </div>

                      <span>
                        {rule}
                      </span>
                    </div>
                  )
                )}
              </div>

            </div>

            {/* RIGHT */}

            <div>

              <div style={styles.checkCard}>
                <div style={styles.cardHeaderRow}>
                  <h3 style={styles.cardTitle}>
                    System check
                  </h3>

                  <span
                    style={
                      cameraReady &&
                      microphoneReady
                        ? styles.passBadge
                        : styles.waitBadge
                    }
                  >
                    {cameraReady &&
                    microphoneReady
                      ? "READY"
                      : "ACTION REQUIRED"}
                  </span>
                </div>

                <SystemCheck
                  icon="◉"
                  title="Camera"
                  description="Required for session monitoring"
                  ready={cameraReady}
                />

                <SystemCheck
                  icon="◌"
                  title="Microphone"
                  description="Required for environment monitoring"
                  ready={microphoneReady}
                />

                <SystemCheck
                  icon="□"
                  title="Fullscreen"
                  description="Will activate when test begins"
                  ready={fullscreenReady}
                />

                <button
                  style={styles.checkButton}
                  onClick={requestMedia}
                >
                  CHECK CAMERA & MIC
                </button>

                {cameraReady && (
                  <div style={styles.previewContainer}>
                    <video
                      ref={cameraRef}
                      autoPlay
                      muted
                      playsInline
                      style={
                        styles.cameraPreview
                      }
                    />

                    <div
                      style={
                        styles.previewBadge
                      }
                    >
                      CAMERA PREVIEW
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.sessionStats}>

                <MiniStat
                  value={questions.length}
                  label="QUESTIONS"
                />

                <MiniStat
                  value={`${durationMinutes}m`}
                  label="TIME LIMIT"
                />

                <MiniStat
                  value="MCQ"
                  label="FORMAT"
                />

              </div>

              <button
                style={
                  cameraReady &&
                  microphoneReady
                    ? styles.startLargeButton
                    : styles.startDisabledButton
                }
                disabled={
                  !cameraReady ||
                  !microphoneReady
                }
                onClick={startAssessment}
              >
                <span>
                  ENTER PROCTORED TEST
                </span>

                <span style={styles.buttonArrow}>
                  →
                </span>
              </button>

              <button
                style={styles.textButton}
                onClick={() =>
                  navigate(
                    "/practice/assessments"
                  )
                }
              >
                Cancel and return
              </button>

            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * RUNNING TEST
   * ------------------------------------------------------------
   */

  return (
    <div style={styles.testPage}>

      {/* TOP BAR */}

      <header style={styles.testTopBar}>

        <div style={styles.brandBlock}>
          <div style={styles.brandMark}>
            E
          </div>

          <div>
            <div style={styles.brandName}>
              ENGVIVA
            </div>

            <div style={styles.brandSub}>
              PROCTORED LAB
            </div>
          </div>
        </div>

        <div style={styles.testIdentity}>
          <strong>
            {assessmentTitle}
          </strong>

          <span>
            {company?.name ||
              companyId ||
              "Company"}
          </span>
        </div>

        <div style={styles.topRight}>

          <div
            style={
              remainingSeconds <= 60
                ? styles.timerDanger
                : styles.timer
            }
          >
            <span style={styles.timerLabel}>
              TIME
            </span>

            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>
          </div>

          <div style={styles.proctorLive}>
            <span
              style={styles.proctorDot}
            />
            PROCTOR ACTIVE
          </div>

        </div>
      </header>

      {/* PROGRESS */}

      <div style={styles.progressBarShell}>
        <div
          style={{
            ...styles.progressBarFill,
            width: `${progressPercentage}%`,
          }}
        />
      </div>

      {/* MAIN */}

      <main style={styles.testMain}>

        {/* QUESTION NAV */}

        <aside style={styles.questionSidebar}>

          <div style={styles.sidebarTop}>
            <div style={styles.sidebarTitle}>
              QUESTIONS
            </div>

            <div style={styles.sidebarProgress}>
              {answeredCount}/
              {questions.length}
            </div>
          </div>

          <div style={styles.questionGrid}>
            {questions.map(
              (question, index) => {

                const answered =
                  answers[
                    question.id
                  ] !== undefined;

                const current =
                  index === currentIndex;

                return (
                  <button
                    key={question.id}
                    onClick={() =>
                      goToQuestion(index)
                    }
                    style={{
                      ...styles.questionButton,
                      ...(current
                        ? styles.questionCurrent
                        : {}),
                      ...(answered &&
                      !current
                        ? styles.questionAnswered
                        : {}),
                    }}
                  >
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </button>
                );
              }
            )}
          </div>

          <div style={styles.legend}>

            <Legend
              style={styles.legendCurrent}
              text="Current"
            />

            <Legend
              style={styles.legendAnswered}
              text="Answered"
            />

            <Legend
              style={styles.legendEmpty}
              text="Unanswered"
            />

          </div>

          <div style={styles.sidebarFooter}>
            <div style={styles.proctorMini}>
              <span
                style={styles.proctorDot}
              />

              <div>
                <strong>
                  PROCTORING
                </strong>

                <span>
                  Camera active
                </span>
              </div>
            </div>
          </div>

        </aside>

        {/* QUESTION */}

        <section style={styles.questionArea}>

          <div style={styles.questionHeader}>

            <div>
              <div style={styles.questionEyebrow}>
                QUESTION{" "}
                {String(
                  currentIndex + 1
                ).padStart(2, "0")}{" "}
                /{" "}
                {String(
                  questions.length
                ).padStart(2, "0")}
              </div>

              <div style={styles.topicTag}>
                {currentQuestion?.category ||
                  "APTITUDE"}
              </div>
            </div>

            <div style={styles.difficultyTag}>
              {currentQuestion?.difficulty ||
                "MIXED"}
            </div>

          </div>

          <div style={styles.questionCard}>

            <div style={styles.questionNumberLarge}>
              {String(
                currentIndex + 1
              ).padStart(2, "0")}
            </div>

            <h1 style={styles.questionText}>
              {currentQuestion?.question}
            </h1>

            <div style={styles.optionsList}>

              {currentQuestion?.options?.map(
                (option, optionIndex) => {

                  const selected =
                    answers[
                      currentQuestion.id
                    ] === option;

                  const letter =
                    String.fromCharCode(
                      65 + optionIndex
                    );

                  return (
                    <button
                      key={`${currentQuestion.id}-${optionIndex}`}
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          option
                        )
                      }
                      style={{
                        ...styles.option,
                        ...(selected
                          ? styles.optionSelected
                          : {}),
                      }}
                    >

                      <span
                        style={{
                          ...styles.optionLetter,
                          ...(selected
                            ? styles.optionLetterSelected
                            : {}),
                        }}
                      >
                        {letter}
                      </span>

                      <span
                        style={
                          styles.optionText
                        }
                      >
                        {option}
                      </span>

                      {selected && (
                        <span
                          style={
                            styles.selectedCheck
                          }
                        >
                          ✓
                        </span>
                      )}

                    </button>
                  );
                }
              )}

            </div>

          </div>

          <div style={styles.navigationBar}>

            <button
              disabled={
                currentIndex === 0
              }
              onClick={previousQuestion}
              style={{
                ...styles.navButton,
                ...(currentIndex === 0
                  ? styles.navDisabled
                  : {}),
              }}
            >
              ←
              <span>
                PREVIOUS
              </span>
            </button>

            <div style={styles.answerStatus}>
              {answers[
                currentQuestion?.id
              ] !== undefined ? (
                <>
                  <span
                    style={
                      styles.answerCheck
                    }
                  >
                    ✓
                  </span>

                  ANSWER SAVED
                </>
              ) : (
                <>
                  <span
                    style={
                      styles.answerEmpty
                    }
                  />

                  NOT ANSWERED
                </>
              )}
            </div>

            {currentIndex <
            questions.length - 1 ? (
              <button
                onClick={nextQuestion}
                style={styles.navPrimary}
              >
                <span>
                  NEXT QUESTION
                </span>

                →
              </button>
            ) : (
              <button
                onClick={() =>
                  setShowSubmitModal(
                    true
                  )
                }
                style={styles.submitButton}
              >
                FINISH TEST
                <span>✓</span>
              </button>
            )}

          </div>

        </section>

        {/* CAMERA */}

        <aside style={styles.proctorSidebar}>

          <div style={styles.cameraCard}>

            <div style={styles.cameraHeader}>
              <div>
                <div
                  style={
                    styles.cameraLabel
                  }
                >
                  LIVE CAMERA
                </div>

                <div
                  style={
                    styles.cameraStatus
                  }
                >
                  <span
                    style={
                      styles.proctorDot
                    }
                  />

                  MONITORING
                </div>
              </div>

              <div
                style={
                  styles.recordIndicator
                }
              >
                ● REC
              </div>
            </div>

            <div
              style={
                styles.liveVideoContainer
              }
            >
              <video
                ref={cameraRef}
                autoPlay
                muted
                playsInline
                style={
                  styles.liveVideo
                }
              />

              <div
                style={
                  styles.videoOverlay
                }
              >
                ENGVIVA PROCTOR
              </div>
            </div>

            <div
              style={
                styles.proctorChecklist
              }
            >
              <CheckLine
                text="Camera"
                ready={cameraReady}
              />

              <CheckLine
                text="Microphone"
                ready={
                  microphoneReady
                }
              />

              <CheckLine
                text="Fullscreen"
                ready={
                  Boolean(
                    document.fullscreenElement
                  )
                }
              />
            </div>

          </div>

          <div style={styles.securityCard}>

            <div
              style={
                styles.securityIcon
              }
            >
              ◈
            </div>

            <div>
              <strong>
                Secure session
              </strong>

              <p>
                Switching tabs,
                exiting fullscreen or
                leaving the window may
                terminate this attempt.
              </p>
            </div>

          </div>

        </aside>

      </main>

      {/* SUBMIT MODAL */}

      {showSubmitModal && (
        <div style={styles.modalBackdrop}>

          <div style={styles.submitModal}>

            <div
              style={
                styles.modalIcon
              }
            >
              ✓
            </div>

            <div style={styles.overline}>
              FINAL SUBMISSION
            </div>

            <h2 style={styles.modalTitle}>
              Submit your assessment?
            </h2>

            <p style={styles.modalText}>
              Once submitted, you cannot
              modify your answers.
            </p>

            <div style={styles.submitSummary}>

              <SummaryItem
                value={
                  answeredCount
                }
                label="Answered"
              />

              <SummaryItem
                value={
                  unansweredCount
                }
                label="Unanswered"
              />

              <SummaryItem
                value={formatTime(
                  remainingSeconds
                )}
                label="Time left"
              />

            </div>

            <div style={styles.modalActions}>

              <button
                style={
                  styles.cancelButton
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
                style={
                  styles.confirmButton
                }
                disabled={submitting}
                onClick={() =>
                  submitAssessment(
                    false
                  )
                }
              >
                {submitting
                  ? "SUBMITTING..."
                  : "SUBMIT ASSESSMENT →"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SMALL COMPONENTS
 * ------------------------------------------------------------
 */

function SystemCheck({
  icon,
  title,
  description,
  ready,
}) {
  return (
    <div style={styles.systemCheck}>
      <div style={styles.systemIcon}>
        {icon}
      </div>

      <div style={styles.systemInfo}>
        <strong>{title}</strong>

        <span>
          {description}
        </span>
      </div>

      <div
        style={
          ready
            ? styles.systemReady
            : styles.systemWaiting
        }
      >
        {ready ? "✓ READY" : "WAITING"}
      </div>
    </div>
  );
}

function MiniStat({
  value,
  label,
}) {
  return (
    <div style={styles.miniStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Legend({
  style,
  text,
}) {
  return (
    <div style={styles.legendItem}>
      <span
        style={{
          ...styles.legendDot,
          ...style,
        }}
      />

      {text}
    </div>
  );
}

function CheckLine({
  text,
  ready,
}) {
  return (
    <div style={styles.checkLine}>
      <span
        style={
          ready
            ? styles.checkGreen
            : styles.checkGray
        }
      >
        {ready ? "✓" : "○"}
      </span>

      <span>{text}</span>

      <span>
        {ready ? "READY" : "WAIT"}
      </span>
    </div>
  );
}

function SummaryItem({
  value,
  label,
}) {
  return (
    <div style={styles.summaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * STYLES
 * ------------------------------------------------------------
 */

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at 80% 10%, rgba(177,132,255,.13), transparent 30%), #07060b",
    color: "#fff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loaderRing: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "4px solid rgba(201,167,255,.15)",
    borderTopColor: "#c9a7ff",
    animation:
      "engvivaAssessmentSpin 1s linear infinite",
  },

  loadingTitle: {
    position: "absolute",
    marginTop: 130,
    fontSize: 20,
    fontWeight: 800,
  },

  loadingText: {
    position: "absolute",
    marginTop: 180,
    color: "#817a8c",
    fontSize: 13,
  },

  preTestShell: {
    width: "min(1250px, calc(100% - 60px))",
    margin: "0 auto",
    padding: "55px 0 80px",
  },

  preHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 25,
    marginBottom: 35,
  },

  overline: {
    color: "#9a86b7",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2.4,
  },

  preTitle: {
    margin: "9px 0 5px",
    fontSize:
      "clamp(32px, 5vw, 55px)",
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: -2,
  },

  preSubtitle: {
    margin: 0,
    color: "#817b89",
    fontSize: 14,
  },

  secureBadge: {
    padding: "10px 15px",
    borderRadius: 14,
    border:
      "1px solid rgba(201,167,255,.18)",
    background:
      "rgba(201,167,255,.06)",
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  secureDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#c9a7ff",
    boxShadow:
      "0 0 12px rgba(201,167,255,.8)",
  },

  preGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.25fr) minmax(350px, .75fr)",
    gap: 20,
  },

  bigIntroCard: {
    padding: 30,
    borderRadius: 26,
    border:
      "1px solid rgba(255,255,255,.075)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.015))",
    display: "flex",
    gap: 22,
    marginBottom: 18,
  },

  introNumber: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: 16,
    background:
      "rgba(201,167,255,.09)",
    border:
      "1px solid rgba(201,167,255,.16)",
    color: "#c9a7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 13,
  },

  cardLabel: {
    color: "#7f778b",
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: 900,
  },

  introTitle: {
    margin: "8px 0 9px",
    fontSize: 25,
    lineHeight: 1.2,
    fontWeight: 900,
  },

  introText: {
    margin: 0,
    maxWidth: 650,
    color: "#88818e",
    lineHeight: 1.7,
    fontSize: 13,
  },

  rulesCard: {
    padding: 27,
    borderRadius: 25,
    border:
      "1px solid rgba(255,255,255,.065)",
    background:
      "rgba(255,255,255,.025)",
  },

  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 850,
  },

  required: {
    color: "#c9a7ff",
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: 900,
  },

  rule: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: "13px 0",
    borderTop:
      "1px solid rgba(255,255,255,.05)",
    color: "#a39ca9",
    fontSize: 12,
  },

  ruleNumber: {
    width: 25,
    height: 25,
    borderRadius: 8,
    background:
      "rgba(201,167,255,.06)",
    color: "#a88bcf",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 900,
  },

  checkCard: {
    padding: 23,
    borderRadius: 25,
    border:
      "1px solid rgba(255,255,255,.07)",
    background:
      "rgba(255,255,255,.03)",
  },

  passBadge: {
    color: "#a9e8bd",
    fontSize: 8,
    fontWeight: 900,
  },

  waitBadge: {
    color: "#c9a7ff",
    fontSize: 8,
    fontWeight: 900,
  },

  systemCheck: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 0",
    borderTop:
      "1px solid rgba(255,255,255,.05)",
  },

  systemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background:
      "rgba(201,167,255,.07)",
    color: "#c9a7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  systemInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  systemInfoStrong: {},

  systemInfoSpan: {},

  systemReady: {
    color: "#9ee6b4",
    fontSize: 8,
    fontWeight: 900,
  },

  systemWaiting: {
    color: "#77707e",
    fontSize: 8,
    fontWeight: 900,
  },

  checkButton: {
    width: "100%",
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background:
      "rgba(201,167,255,.07)",
    border:
      "1px solid rgba(201,167,255,.16)",
    color: "#c9a7ff",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  previewContainer: {
    position: "relative",
    marginTop: 14,
    height: 170,
    overflow: "hidden",
    borderRadius: 15,
    background: "#030305",
  },

  cameraPreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },

  previewBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    padding: "5px 8px",
    borderRadius: 7,
    background: "rgba(0,0,0,.6)",
    color: "#fff",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 1,
  },

  sessionStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 9,
    margin: "12px 0",
  },

  miniStat: {
    padding: "15px 10px",
    borderRadius: 15,
    textAlign: "center",
    background:
      "rgba(255,255,255,.025)",
    border:
      "1px solid rgba(255,255,255,.055)",
  },

  miniStatStrong: {},

  miniStatSpan: {},

  startLargeButton: {
    width: "100%",
    minHeight: 57,
    border: 0,
    borderRadius: 16,
    background:
      "linear-gradient(135deg, #dcc7ff, #b48cf4)",
    color: "#160d20",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: 950,
    fontSize: 11,
    letterSpacing: 1.2,
    cursor: "pointer",
    boxShadow:
      "0 15px 40px rgba(177,130,255,.16)",
  },

  startDisabledButton: {
    width: "100%",
    minHeight: 57,
    border: 0,
    borderRadius: 16,
    background:
      "rgba(255,255,255,.06)",
    color: "#5f5965",
    padding: "0 20px",
    fontWeight: 950,
    fontSize: 11,
    cursor: "not-allowed",
  },

  buttonArrow: {
    fontSize: 22,
  },

  textButton: {
    display: "block",
    margin: "13px auto 0",
    border: 0,
    background: "transparent",
    color: "#68616f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
    cursor: "pointer",
  },

  testPage: {
    minHeight: "100vh",
    background: "#07060b",
    color: "#fff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },

  testTopBar: {
    height: 76,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 25px",
    gap: 25,
    background:
      "rgba(10,9,15,.96)",
    borderBottom:
      "1px solid rgba(255,255,255,.07)",
  },

  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 180,
  },

  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#d9c1ff,#a77be9)",
    color: "#170d20",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
  },

  brandName: {
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 1,
  },

  brandSub: {
    marginTop: 2,
    color: "#716b78",
    fontSize: 7,
    letterSpacing: 1.5,
    fontWeight: 800,
  },

  testIdentity: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  testIdentityStrong: {},

  testIdentitySpan: {},

  topRight: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  timer: {
    minWidth: 100,
    padding: "8px 13px",
    borderRadius: 12,
    background:
      "rgba(201,167,255,.07)",
    border:
      "1px solid rgba(201,167,255,.13)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#d5bfff",
  },

  timerDanger: {
    minWidth: 100,
    padding: "8px 13px",
    borderRadius: 12,
    background:
      "rgba(255,80,100,.1)",
    border:
      "1px solid rgba(255,80,100,.25)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#ff8797",
  },

  timerLabel: {
    color: "#716a78",
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: 900,
  },

  proctorLive: {
    padding: "10px 13px",
    borderRadius: 12,
    background:
      "rgba(130,220,160,.05)",
    color: "#91dba8",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  proctorDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#7edb9b",
    boxShadow:
      "0 0 10px rgba(126,219,155,.8)",
  },

  progressBarShell: {
    height: 3,
    background:
      "rgba(255,255,255,.05)",
  },

  progressBarFill: {
    height: "100%",
    background:
      "linear-gradient(90deg,#a77be9,#d6c0ff)",
    transition:
      "width .3s ease",
  },

  testMain: {
    flex: 1,
    display: "grid",
    gridTemplateColumns:
      "235px minmax(500px, 1fr) 265px",
    minHeight: 0,
  },

  questionSidebar: {
    borderRight:
      "1px solid rgba(255,255,255,.06)",
    padding: 20,
    background:
      "rgba(255,255,255,.012)",
    display: "flex",
    flexDirection: "column",
  },

  sidebarTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },

  sidebarTitle: {
    color: "#827a8a",
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: 900,
  },

  sidebarProgress: {
    color: "#c9a7ff",
    fontSize: 10,
    fontWeight: 900,
  },

  questionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: 7,
  },

  questionButton: {
    aspectRatio: "1",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.07)",
    background:
      "rgba(255,255,255,.025)",
    color: "#77707f",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  questionCurrent: {
    background:
      "rgba(201,167,255,.15)",
    border:
      "1px solid rgba(201,167,255,.45)",
    color: "#e0cfff",
    boxShadow:
      "0 0 20px rgba(201,167,255,.08)",
  },

  questionAnswered: {
    background:
      "rgba(120,215,150,.07)",
    border:
      "1px solid rgba(120,215,150,.2)",
    color: "#91dba8",
  },

  legend: {
    marginTop: 20,
    paddingTop: 17,
    borderTop:
      "1px solid rgba(255,255,255,.06)",
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },

  legendItem: {
    color: "#6d6674",
    fontSize: 9,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  legendCurrent: {
    background: "#c9a7ff",
  },

  legendAnswered: {
    background: "#80d69a",
  },

  legendEmpty: {
    background: "#45404b",
  },

  sidebarFooter: {
    marginTop: "auto",
  },

  proctorMini: {
    padding: 12,
    borderRadius: 13,
    background:
      "rgba(120,215,150,.035)",
    border:
      "1px solid rgba(120,215,150,.09)",
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  questionArea: {
    padding:
      "38px clamp(30px, 5vw, 70px)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },

  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  questionEyebrow: {
    color: "#8b8295",
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: 900,
  },

  topicTag: {
    display: "inline-block",
    marginTop: 8,
    padding: "6px 9px",
    borderRadius: 8,
    background:
      "rgba(201,167,255,.06)",
    color: "#aa8ed0",
    fontSize: 8,
    fontWeight: 900,
  },

  difficultyTag: {
    padding: "7px 10px",
    borderRadius: 9,
    border:
      "1px solid rgba(255,255,255,.07)",
    color: "#77707f",
    fontSize: 8,
    fontWeight: 900,
  },

  questionCard: {
    flex: 1,
    padding:
      "clamp(25px, 4vw, 50px)",
    borderRadius: 25,
    background:
      "linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.018))",
    border:
      "1px solid rgba(255,255,255,.075)",
    boxShadow:
      "0 25px 70px rgba(0,0,0,.18)",
  },

  questionNumberLarge: {
    color: "#9e88bb",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 17,
  },

  questionText: {
    margin: 0,
    maxWidth: 850,
    fontSize:
      "clamp(22px, 3vw, 32px)",
    lineHeight: 1.35,
    fontWeight: 850,
    letterSpacing: -.6,
  },

  optionsList: {
    marginTop: 34,
    display: "flex",
    flexDirection: "column",
    gap: 11,
  },

  option: {
    width: "100%",
    minHeight: 64,
    padding: "9px 15px",
    borderRadius: 15,
    border:
      "1px solid rgba(255,255,255,.07)",
    background:
      "rgba(255,255,255,.025)",
    color: "#c4becb",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    gap: 14,
    cursor: "pointer",
    transition:
      "all .18s ease",
  },

  optionSelected: {
    border:
      "1px solid rgba(201,167,255,.45)",
    background:
      "rgba(201,167,255,.09)",
    color: "#fff",
  },

  optionLetter: {
    width: 35,
    height: 35,
    flexShrink: 0,
    borderRadius: 10,
    background:
      "rgba(255,255,255,.045)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#837b8d",
    fontSize: 11,
    fontWeight: 900,
  },

  optionLetterSelected: {
    background:
      "rgba(201,167,255,.16)",
    color: "#d9c4ff",
  },

  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 1.45,
  },

  selectedCheck: {
    color: "#c9a7ff",
    fontWeight: 950,
    fontSize: 18,
  },

  navigationBar: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  navButton: {
    padding: "12px 16px",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.07)",
    color: "#b0a9b6",
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  navDisabled: {
    opacity: .3,
    cursor: "not-allowed",
  },

  answerStatus: {
    color: "#77707e",
    fontSize: 9,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  answerCheck: {
    color: "#88d69e",
    fontSize: 14,
  },

  answerEmpty: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#55505b",
  },

  navPrimary: {
    padding: "13px 18px",
    borderRadius: 12,
    border: 0,
    background:
      "linear-gradient(135deg,#d6bfff,#b48bf0)",
    color: "#170d20",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  submitButton: {
    padding: "13px 18px",
    borderRadius: 12,
    border: 0,
    background:
      "linear-gradient(135deg,#9ee6b4,#6ecf8c)",
    color: "#0b1b10",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  proctorSidebar: {
    padding: 18,
    borderLeft:
      "1px solid rgba(255,255,255,.06)",
    background:
      "rgba(255,255,255,.012)",
  },

  cameraCard: {
    padding: 13,
    borderRadius: 18,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.075)",
  },

  cameraHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3px 4px 12px",
  },

  cameraLabel: {
    fontSize: 8,
    color: "#817989",
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  cameraStatus: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    color: "#87d79c",
    fontSize: 7,
    fontWeight: 900,
  },

  recordIndicator: {
    color: "#ff7888",
    fontSize: 8,
    fontWeight: 900,
  },

  liveVideoContainer: {
    height: 190,
    position: "relative",
    borderRadius: 13,
    overflow: "hidden",
    background: "#020204",
  },

  liveVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },

  videoOverlay: {
    position: "absolute",
    left: 9,
    bottom: 8,
    padding: "4px 6px",
    borderRadius: 5,
    background:
      "rgba(0,0,0,.6)",
    color: "#aaa3b0",
    fontSize: 6,
    fontWeight: 900,
    letterSpacing: 1,
  },

  proctorChecklist: {
    marginTop: 10,
  },

  checkLine: {
    display: "grid",
    gridTemplateColumns:
      "18px 1fr auto",
    alignItems: "center",
    gap: 6,
    padding: "8px 0",
    borderTop:
      "1px solid rgba(255,255,255,.045)",
    color: "#817b88",
    fontSize: 8,
  },

  checkGreen: {
    color: "#86d69b",
  },

  checkGray: {
    color: "#5c5662",
  },

  securityCard: {
    marginTop: 12,
    padding: 13,
    borderRadius: 16,
    background:
      "rgba(201,167,255,.035)",
    border:
      "1px solid rgba(201,167,255,.08)",
    display: "flex",
    gap: 10,
  },

  securityIcon: {
    color: "#c9a7ff",
    fontSize: 18,
  },

  securityCardStrong: {},

  securityCardP: {
    margin: "4px 0 0",
    color: "#696270",
    fontSize: 8,
    lineHeight: 1.5,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,.78)",
    backdropFilter: "blur(14px)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  submitModal: {
    width: "min(520px, 100%)",
    padding: 32,
    borderRadius: 26,
    background:
      "linear-gradient(145deg,#16121d,#0d0b11)",
    border:
      "1px solid rgba(255,255,255,.1)",
    boxShadow:
      "0 30px 100px rgba(0,0,0,.5)",
  },

  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    background:
      "rgba(201,167,255,.1)",
    color: "#c9a7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 20,
    marginBottom: 18,
  },

  modalTitle: {
    margin: "7px 0",
    fontSize: 25,
    fontWeight: 900,
  },

  modalText: {
    margin: 0,
    color: "#85808d",
    fontSize: 13,
    lineHeight: 1.6,
  },

  submitSummary: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 9,
    margin: "22px 0",
  },

  summaryItem: {
    padding: 13,
    textAlign: "center",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.035)",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  summaryItemStrong: {},

  summaryItemSpan: {},

  modalActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1.2fr",
    gap: 9,
  },

  cancelButton: {
    minHeight: 48,
    borderRadius: 12,
    border:
      "1px solid rgba(255,255,255,.08)",
    background:
      "rgba(255,255,255,.035)",
    color: "#aaa3b0",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  confirmButton: {
    minHeight: 48,
    border: 0,
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#d7c0ff,#b38af1)",
    color: "#170d20",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  terminationCard: {
    width: "min(520px, 100%)",
    padding: 40,
    borderRadius: 28,
    background:
      "linear-gradient(145deg,#181019,#0d0b11)",
    border:
      "1px solid rgba(255,100,120,.16)",
    textAlign: "center",
  },

  dangerIcon: {
    width: 70,
    height: 70,
    margin: "0 auto 22px",
    borderRadius: 22,
    background:
      "rgba(255,80,100,.08)",
    border:
      "1px solid rgba(255,80,100,.18)",
    color: "#ff7c8c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 950,
  },

  terminationTitle: {
    margin: "8px 0",
    fontSize: 32,
    fontWeight: 950,
  },

  terminationText: {
    color: "#88818e",
    lineHeight: 1.6,
    fontSize: 13,
  },

  reasonBox: {
    margin: "20px 0",
    padding: 14,
    borderRadius: 13,
    background:
      "rgba(255,80,100,.05)",
    border:
      "1px solid rgba(255,80,100,.12)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  reasonBoxSpan: {},

  reasonBoxStrong: {
    color: "#ff8797",
    fontSize: 11,
  },

  primaryButton: {
    width: "100%",
    minHeight: 50,
    border: 0,
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#d7c0ff,#b38af1)",
    color: "#170d20",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 17px",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 50,
    marginTop: 10,
    borderRadius: 13,
    border:
      "1px solid rgba(255,255,255,.08)",
    background:
      "rgba(255,255,255,.035)",
    color: "#aaa3b0",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  errorLargeCard: {
    width: "min(560px,100%)",
    padding: 40,
    borderRadius: 28,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.08)",
    textAlign: "center",
  },

  errorIcon: {
    width: 65,
    height: 65,
    margin: "0 auto 20px",
    borderRadius: 20,
    background:
      "rgba(255,90,110,.08)",
    color: "#ff8290",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 25,
    fontWeight: 950,
  },

  largeTitle: {
    margin: "8px 0",
    fontSize: 30,
    fontWeight: 950,
  },

  largeDescription: {
    color: "#85808d",
    fontSize: 13,
    lineHeight: 1.6,
  },

  errorActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: 10,
    marginTop: 25,
  },
};

/*
 * Add animation CSS without creating another stylesheet.
 */

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "engviva-assessment-test-css"
  )
) {
  const style =
    document.createElement("style");

  style.id =
    "engviva-assessment-test-css";

  style.textContent = `
    @keyframes engvivaAssessmentSpin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    * {
      box-sizing: border-box;
    }

    button {
      font-family: inherit;
    }

    button:not(:disabled):hover {
      filter: brightness(1.08);
    }

    button:not(:disabled):active {
      transform: translateY(1px);
    }

    @media (max-width: 1050px) {
      .engviva-assessment-test {
        grid-template-columns: 180px minmax(0,1fr);
      }
    }

    @media (max-width: 900px) {
      body {
        overflow-x: hidden;
      }
    }
  `;

  document.head.appendChild(style);
}