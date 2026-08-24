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

const RULES = [
  "Camera and microphone must remain enabled.",
  "Fullscreen must remain active for the entire attempt.",
  "Switching tabs, minimizing the browser, or leaving the page terminates the attempt.",
  "Copy, paste, cut, context-menu and common developer-tool shortcuts are disabled.",
  "Answers are synchronized with the active assessment attempt.",
];

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);

  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}
function normalizeQuestions(payload) {
  let source = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (Array.isArray(payload?.questions)) {
    source = payload.questions;
  } else if (Array.isArray(payload?.data)) {
    source = payload.data;
  } else if (
    Array.isArray(payload?.data?.questions)
  ) {
    source = payload.data.questions;
  } else if (
    Array.isArray(payload?.assessment?.questions)
  ) {
    source = payload.assessment.questions;
  }

  return source
    .map((item, index) => {
      /*
       * Backend JSON currently uses:
       *
       * {
       *   A: "...",
       *   B: "...",
       *   C: "...",
       *   D: "..."
       * }
       *
       * Convert it into the array expected by the UI.
       */

      let options = [];

      if (Array.isArray(item?.options)) {
        options = item.options;
      } else if (
        item?.options &&
        typeof item.options === "object"
      ) {
        options = ["A", "B", "C", "D"]
          .map((letter) => item.options[letter])
          .filter(
            (option) =>
              option !== undefined &&
              option !== null
          );
      } else if (Array.isArray(item?.choices)) {
        options = item.choices;
      } else if (
        item?.choices &&
        typeof item.choices === "object"
      ) {
        options = ["A", "B", "C", "D"]
          .map((letter) => item.choices[letter])
          .filter(
            (option) =>
              option !== undefined &&
              option !== null
          );
      }

      return {
        id:
          item?.id ||
          item?.questionId ||
          item?._id ||
          `question-${index + 1}`,

        question:
          item?.question ||
          item?.text ||
          item?.questionText ||
          `Question ${index + 1}`,

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
          Number(item?.marks) || 1,
      };
    })
    .filter(
      (question) =>
        question.options.length >= 2
    );
}

export default function AssessmentTest() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [phase, setPhase] =
    useState("loading");

  const [questions, setQuestions] =
    useState([]);

  const [testMeta, setTestMeta] =
    useState(null);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] =
    useState({});

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [startedAt, setStartedAt] =
    useState(null);

  const [attemptId, setAttemptId] =
    useState(null);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [microphoneReady, setMicrophoneReady] =
    useState(false);

  const [fullscreenReady, setFullscreenReady] =
    useState(false);

  const [proctorStatus, setProctorStatus] =
    useState("CHECKING");

  const [violations, setViolations] =
    useState([]);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [showSubmitModal, setShowSubmitModal] =
    useState(false);

  const [terminationReason, setTerminationReason] =
    useState("");

  const cameraRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const timerRef =
    useRef(null);

  const violationTimerRef =
    useRef(null);

  const startedRef =
    useRef(false);

  const terminatingRef =
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

  const violationsRef =
    useRef([]);

  const handleViolationRef =
    useRef(null);

  const submitAssessmentRef =
    useRef(null);

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

  useEffect(() => {
    violationsRef.current =
      violations;
  }, [violations]);

  const getFirebaseToken =
    useCallback(async () => {
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
      } catch (err) {
        console.error(
          "[ASSESSMENT AUTH]",
          err
        );

        return null;
      }
    }, []);

  const apiFetch =
    useCallback(
      async (path, options = {}) => {
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

  const loadQuestions =
    useCallback(async () => {
      setPhase("loading");
      setError("");

      if (!assessmentId) {
        setError(
          "No testId was supplied. Open the assessment from the assessment list or use ?testId=..."
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
            payload?.error?.message ||
              `Unable to load assessment (${response.status}).`
          );
        }

        const data =
          payload?.data ||
          payload;

        const normalized =
          normalizeQuestions(data);

        if (!normalized.length) {
          throw new Error(
            "The selected test contains no usable questions."
          );
        }

        const duration =
          Number(
            firstValue(
              data.durationMinutes,
              assessment?.durationMinutes,
              assessment?.duration,
              20
            )
          ) || 20;

        setTestMeta({
          testId:
            data.testId ||
            assessmentId,

          testNumber:
            data.testNumber,

          label:
            data.label,

          title:
            data.title ||
            assessment?.title ||
            assessment?.name ||
            "Aptitude Assessment",

          questionCount:
            Number(
              data.questionCount
            ) ||
            normalized.length,

          durationMinutes:
            duration,
        });

        setQuestions(
          normalized
        );

        setRemainingSeconds(
          duration * 60
        );

        setCurrentIndex(0);

        setAnswers({});

        setPhase("ready");
      } catch (err) {
        console.error(
          "[ASSESSMENT LOAD]",
          err
        );

        setError(
          err.message ||
            "Unable to load the assessment."
        );

        setPhase("error");
      }
    }, [
      assessmentId,
      apiFetch,
      assessment,
    ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const stopMedia =
    useCallback(() => {
      if (!mediaStreamRef.current) {
        return;
      }

      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.onended = null;
          track.stop();
        });

      mediaStreamRef.current =
        null;

      setCameraReady(false);
      setMicrophoneReady(false);
    }, []);

  const exitFullscreen =
    useCallback(async () => {
      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
        }
      } catch {
        // Already exited.
      }
    }, []);

  const requestMedia =
    useCallback(async () => {
      setError("");

      try {
        if (
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error(
            "Camera and microphone access is not supported by this browser."
          );
        }

        if (
          mediaStreamRef.current
        ) {
          const videoOK =
            mediaStreamRef.current
              .getVideoTracks()
              .some(
                (track) =>
                  track.readyState ===
                  "live"
              );

          const audioOK =
            mediaStreamRef.current
              .getAudioTracks()
              .some(
                (track) =>
                  track.readyState ===
                  "live"
              );

          if (
            videoOK &&
            audioOK
          ) {
            setCameraReady(true);
            setMicrophoneReady(true);

            if (
              cameraRef.current
            ) {
              cameraRef.current.srcObject =
                mediaStreamRef.current;

              await cameraRef.current
                .play()
                .catch(() => {});
            }

            return true;
          }
        }

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
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
            }
          );

        mediaStreamRef.current =
          stream;

        const videoTracks =
          stream.getVideoTracks();

        const audioTracks =
          stream.getAudioTracks();

        const cameraOK =
          videoTracks.length > 0;

        const microphoneOK =
          audioTracks.length > 0;

        setCameraReady(
          cameraOK
        );

        setMicrophoneReady(
          microphoneOK
        );

        const handleTrackEnded =
          () => {
            if (
              !startedRef.current
            ) {
              return;
            }

            const cameraLive =
              stream
                .getVideoTracks()
                .some(
                  (track) =>
                    track.readyState ===
                    "live"
                );

            const microphoneLive =
              stream
                .getAudioTracks()
                .some(
                  (track) =>
                    track.readyState ===
                    "live"
                );

            setCameraReady(
              cameraLive
            );

            setMicrophoneReady(
              microphoneLive
            );

            if (!cameraLive) {
              handleViolationRef.current?.(
                "CAMERA_DISABLED"
              );
            } else if (
              !microphoneLive
            ) {
              handleViolationRef.current?.(
                "MICROPHONE_DISABLED"
              );
            }
          };

        [
          ...videoTracks,
          ...audioTracks,
        ].forEach(
          (track) => {
            track.onended =
              handleTrackEnded;
          }
        );

        if (
          cameraRef.current
        ) {
          cameraRef.current.srcObject =
            stream;

          await cameraRef.current
            .play()
            .catch(() => {});
        }

        if (
          !cameraOK ||
          !microphoneOK
        ) {
          throw new Error(
            "Both camera and microphone are required."
          );
        }

        return true;
      } catch (err) {
        console.error(
          "[PROCTOR MEDIA]",
          err
        );

        setCameraReady(false);
        setMicrophoneReady(false);

        setError(
          err.message ||
            "Camera and microphone permission is required."
        );

        return false;
      }
    }, []);

  const enterFullscreen =
    useCallback(async () => {
      try {
        if (
          !document.fullscreenElement
        ) {
          await document.documentElement.requestFullscreen();
        }

        const ok =
          Boolean(
            document.fullscreenElement
          );

        setFullscreenReady(ok);

        if (!ok) {
          throw new Error(
            "Fullscreen could not be activated."
          );
        }

        return true;
      } catch (err) {
        console.error(
          "[PROCTOR FULLSCREEN]",
          err
        );

        setFullscreenReady(
          false
        );

        setError(
          "Fullscreen permission is required before the assessment can start."
        );

        return false;
      }
    }, []);

  const sendProctorEvent =
    useCallback(
      async (
        type,
        extra = {}
      ) => {
        const id =
          attemptIdRef.current;

        if (!id) {
          return;
        }

        try {
          await apiFetch(
            `/api/assessments/attempts/${encodeURIComponent(
              id
            )}/events`,
            {
              method: "POST",

              body: JSON.stringify({
                type,

                timestamp:
                  new Date().toISOString(),

                ...extra,
              }),
            }
          );
        } catch (err) {
          console.warn(
            "[PROCTOR EVENT]",
            err
          );
        }
      },
      [apiFetch]
    );

  const terminateAssessment =
    useCallback(
      async (reason) => {
        if (
          terminatingRef.current ||
          submittingRef.current ||
          !startedRef.current
        ) {
          return;
        }

        terminatingRef.current =
          true;

        const violation = {
          type: reason,
          timestamp:
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

        setTerminationReason(
          reason
        );

        setProctorStatus(
          "TERMINATED"
        );

        await sendProctorEvent(
          "TERMINATED",
          {
            reason,
            violations:
              nextViolations,
          }
        );

        try {
          const duration =
            Number(
              testMeta?.durationMinutes
            ) || 20;

          const response =
            await apiFetch(
              "/api/assessments/submit",
              {
                method: "POST",

                body: JSON.stringify({
                  assessmentId,
                  companyId,

                  attemptId:
                    attemptIdRef.current,

                  startedAt:
                    startedAtRef.current,

                  completedAt:
                    new Date().toISOString(),

                  answers:
                    answersRef.current,

                  totalQuestions:
                    questionsRef.current
                      .length,

                  answeredQuestions:
                    Object.keys(
                      answersRef.current
                    ).length,

                  unansweredQuestions:
                    Math.max(
                      0,
                      questionsRef.current
                        .length -
                        Object.keys(
                          answersRef.current
                        ).length
                    ),

                  timeAllowedSeconds:
                    duration * 60,

                  timeUsedSeconds:
                    Math.max(
                      0,
                      duration * 60 -
                        remainingRef.current
                    ),

                  automaticSubmission:
                    true,

                  terminated:
                    true,

                  proctoring: {
                    status:
                      "TERMINATED",

                    violations:
                      nextViolations,

                    camera:
                      cameraReady,

                    microphone:
                      microphoneReady,

                    fullscreen:
                      Boolean(
                        document.fullscreenElement
                      ),
                  },
                }),
              }
            );

          const result =
            await response
              .json()
              .catch(() => ({}));

          if (response.ok) {
            const reportId =
              result?.data?.attemptId ||
              result?.attemptId ||
              attemptIdRef.current;

            stopMedia();

            await exitFullscreen();

            startedRef.current =
              false;

            navigate(
              `/reports/${encodeURIComponent(
                reportId
              )}`,
              {
                replace: true,

                state: {
                  source:
                    "assessment",

                  status:
                    "terminated",

                  result,
                },
              }
            );

            return;
          }
        } catch (err) {
          console.error(
            "[TERMINATION SUBMIT]",
            err
          );
        }

        stopMedia();

        await exitFullscreen();

        startedRef.current =
          false;

        setPhase(
          "terminated"
        );
      },
      [
        apiFetch,
        assessmentId,
        cameraReady,
        companyId,
        exitFullscreen,
        microphoneReady,
        navigate,
        sendProctorEvent,
        stopMedia,
        testMeta,
      ]
    );

  useEffect(() => {
    handleViolationRef.current =
      terminateAssessment;
  }, [terminateAssessment]);

  const startAttempt =
    useCallback(async () => {
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
            payload?.error?.message ||
              "Unable to create assessment attempt."
          );
        }

        const id =
          payload?.data?.attemptId ||
          payload?.attemptId ||
          payload?.id;

        if (!id) {
          throw new Error(
            "Backend did not return an assessment attempt ID."
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
            "Unable to start the secure assessment."
        );

        return null;
      }
    }, [
      apiFetch,
      assessmentId,
      companyId,
    ]);

  const startAssessment =
    async () => {
      setError("");

      const mediaOK =
        await requestMedia();

      if (!mediaOK) {
        return;
      }

      const fullscreenOK =
        await enterFullscreen();

      if (!fullscreenOK) {
        return;
      }

      const id =
        await startAttempt();

      if (!id) {
        await exitFullscreen();

        return;
      }

      startedRef.current =
        true;

      terminatingRef.current =
        false;

      submittingRef.current =
        false;

      const now =
        new Date().toISOString();

      const duration =
        Number(
          testMeta?.durationMinutes
        ) || 20;

      setStartedAt(now);

      startedAtRef.current =
        now;

      setRemainingSeconds(
        duration * 60
      );

      remainingRef.current =
        duration * 60;

      setCurrentIndex(0);

      setProctorStatus(
        "ACTIVE"
      );

      setPhase("running");
    };

  useEffect(() => {
    if (
      phase !== "running"
    ) {
      return;
    }

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          handleViolationRef.current?.(
            "TAB_SWITCH_OR_PAGE_HIDDEN"
          );
        }
      };

    const onBlur =
      () => {
        clearTimeout(
          violationTimerRef.current
        );

        violationTimerRef.current =
          setTimeout(() => {
            if (
              startedRef.current &&
              document.visibilityState ===
                "visible"
            ) {
              handleViolationRef.current?.(
                "WINDOW_FOCUS_LOST"
              );
            }
          }, 250);
      };

    const onFullscreenChange =
      () => {
        const active =
          Boolean(
            document.fullscreenElement
          );

        setFullscreenReady(
          active
        );

        if (
          startedRef.current &&
          !active
        ) {
          handleViolationRef.current?.(
            "FULLSCREEN_EXIT"
          );
        }
      };

    const onContextMenu =
      (event) => {
        event.preventDefault();
      };

    const onCopy =
      (event) =>
        event.preventDefault();

    const onCut =
      (event) =>
        event.preventDefault();

    const onPaste =
      (event) =>
        event.preventDefault();

    const onKeyDown =
      (event) => {
        const key =
          event.key.toLowerCase();

        const modifier =
          event.ctrlKey ||
          event.metaKey;

        if (
          (
            modifier &&
            [
              "c",
              "v",
              "x",
              "u",
              "s",
              "p",
            ].includes(key)
          ) ||
          key === "f12" ||
          (
            event.ctrlKey &&
            event.shiftKey &&
            [
              "i",
              "j",
              "c",
            ].includes(key)
          )
        ) {
          event.preventDefault();

          handleViolationRef.current?.(
            "PROHIBITED_KEYBOARD_ACTION"
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    window.addEventListener(
      "blur",
      onBlur
    );

    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    document.addEventListener(
      "contextmenu",
      onContextMenu
    );

    document.addEventListener(
      "copy",
      onCopy
    );

    document.addEventListener(
      "cut",
      onCut
    );

    document.addEventListener(
      "paste",
      onPaste
    );

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      clearTimeout(
        violationTimerRef.current
      );

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      window.removeEventListener(
        "blur",
        onBlur
      );

      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );

      document.removeEventListener(
        "contextmenu",
        onContextMenu
      );

      document.removeEventListener(
        "copy",
        onCopy
      );

      document.removeEventListener(
        "cut",
        onCut
      );

      document.removeEventListener(
        "paste",
        onPaste
      );

      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [phase]);

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

            if (next === 0) {
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

  const submitAssessment =
    useCallback(
      async (
        automatic = false
      ) => {
        if (
          submittingRef.current ||
          !startedRef.current ||
          terminatingRef.current
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
          const duration =
            Number(
              testMeta?.durationMinutes
            ) || 20;

          const currentAnswers =
            answersRef.current;

          const currentQuestions =
            questionsRef.current;

          const response =
            await apiFetch(
              "/api/assessments/submit",
              {
                method: "POST",

                body: JSON.stringify({
                  assessmentId,

                  companyId,

                  attemptId:
                    attemptIdRef.current,

                  assessmentTitle:
                    testMeta?.title ||
                    "Aptitude Assessment",

                  startedAt:
                    startedAtRef.current,

                  completedAt:
                    new Date().toISOString(),

                  answers:
                    currentAnswers,

                  totalQuestions:
                    currentQuestions.length,

                  answeredQuestions:
                    Object.keys(
                      currentAnswers
                    ).length,

                  unansweredQuestions:
                    Math.max(
                      0,
                      currentQuestions.length -
                        Object.keys(
                          currentAnswers
                        ).length
                    ),

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

                  terminated:
                    false,

                  proctoring: {
                    status:
                      violationsRef.current
                        .length
                        ? "VIOLATION"
                        : "COMPLETED",

                    violations:
                      violationsRef.current,

                    camera:
                      cameraReady,

                    microphone:
                      microphoneReady,

                    fullscreen:
                      Boolean(
                        document.fullscreenElement
                      ),
                  },
                }),
              }
            );

          const result =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              result?.error?.message ||
                `Submission failed (${response.status}).`
            );
          }

          const reportId =
            result?.data?.attemptId ||
            result?.attemptId ||
            attemptIdRef.current;

          if (!reportId) {
            throw new Error(
              "Assessment was submitted but no report ID was returned."
            );
          }

          stopMedia();

          await exitFullscreen();

          startedRef.current =
            false;

          setProctorStatus(
            "COMPLETED"
          );

          navigate(
            `/reports/${encodeURIComponent(
              reportId
            )}`,
            {
              replace: true,

              state: {
                source:
                  "assessment",

                assessmentId,

                companyId,

                assessmentTitle:
                  testMeta?.title ||
                  "Aptitude Assessment",

                result,
              },
            }
          );
        } catch (err) {
          console.error(
            "[ASSESSMENT SUBMIT]",
            err
          );

          submittingRef.current =
            false;

          setSubmitting(false);

          setError(
            err.message ||
              "Unable to submit assessment."
          );
        }
      },
      [
        apiFetch,
        assessmentId,
        cameraReady,
        companyId,
        exitFullscreen,
        microphoneReady,
        navigate,
        stopMedia,
        testMeta,
      ]
    );

  useEffect(() => {
    submitAssessmentRef.current =
      submitAssessment;
  }, [submitAssessment]);

  useEffect(() => {
    if (
      phase !== "running"
    ) {
      return;
    }

    const heartbeat =
      setInterval(() => {
        sendProctorEvent(
          "HEARTBEAT",
          {
            answerCount:
              Object.keys(
                answersRef.current
              ).length,

            remainingSeconds:
              remainingRef.current,
          }
        );
      }, 15000);

    return () =>
      clearInterval(
        heartbeat
      );
  }, [
    phase,
    sendProctorEvent,
  ]);

  const selectAnswer =
    (questionId, value) => {
      if (
        phase !== "running"
      ) {
        return;
      }

      setAnswers(
        (previous) => ({
          ...previous,

          [questionId]:
            value,
        })
      );

      sendProctorEvent(
        "ANSWER_CHANGED",
        {
          questionId,
        }
      );
    };

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

  const currentQuestion =
    questions[currentIndex] ||
    null;

  const goToQuestion =
    (index) => {
      if (
        phase !== "running" ||
        index < 0 ||
        index >= questions.length
      ) {
        return;
      }

      setCurrentIndex(index);
    };

  const nextQuestion =
    () => {
      setCurrentIndex(
        (index) =>
          Math.min(
            index + 1,
            questions.length - 1
          )
      );
    };

  const previousQuestion =
    () => {
      setCurrentIndex(
        (index) =>
          Math.max(
            index - 1,
            0
          )
      );
    };

  useEffect(() => {
    return () => {
      clearInterval(
        timerRef.current
      );

      clearTimeout(
        violationTimerRef.current
      );

      stopMedia();
    };
  }, [stopMedia]);

  const title =
    testMeta?.title ||
    assessment?.title ||
    assessment?.name ||
    "Aptitude Assessment";

  const durationMinutes =
    Number(
      testMeta?.durationMinutes
    ) || 20;

  if (
    phase === "loading"
  ) {
    return (
      <Shell>
        <div className="at-loading">
          <div className="at-spinner" />

          <div className="at-eyebrow">
            ASSESSMENT ENGINE
          </div>

          <h1>
            Preparing your secure test
          </h1>

          <p>
            Loading the official
            question set...
          </p>
        </div>
      </Shell>
    );
  }

  if (
    phase === "error"
  ) {
    return (
      <Shell>
        <div className="at-error-card">
          <div className="at-danger-icon">
            !
          </div>

          <div className="at-eyebrow">
            ASSESSMENT ENGINE
          </div>

          <h1>
            Unable to load test
          </h1>

          <p>
            {error}
          </p>

          <div className="at-actions">
            <button
              className="at-primary"
              onClick={loadQuestions}
            >
              RETRY ↻
            </button>

            <button
              className="at-secondary"
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

  if (
    phase === "terminated"
  ) {
    return (
      <Shell>
        <div className="at-error-card">
          <div className="at-danger-icon">
            !
          </div>

          <div className="at-eyebrow">
            PROCTORING TERMINATED
          </div>

          <h1>
            Assessment failed
          </h1>

          <p>
            This attempt was
            terminated because a
            proctoring rule was
            violated.
          </p>

          <div className="at-reason">
            <span>
              VIOLATION
            </span>

            <strong>
              {terminationReason}
            </strong>
          </div>

          <button
            className="at-primary"
            onClick={() =>
              navigate(
                "/practice/assessments"
              )
            }
          >
            BACK TO ASSESSMENTS →
          </button>
        </div>
      </Shell>
    );
  }

  if (
    phase === "ready"
  ) {
    const mediaReady =
      cameraReady &&
      microphoneReady;

    return (
      <Shell>
        <div className="at-pre">
          <header className="at-pre-head">
            <div>
              <div className="at-eyebrow">
                ENGVIVA / PROCTORED LAB
              </div>

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

            <div className="at-secure">
              <i />
              SECURE SESSION
            </div>
          </header>

          <div className="at-pre-grid">
            <section>
              <div className="at-intro-card">
                <div className="at-number">
                  01
                </div>

                <div>
                  <div className="at-card-label">
                    ASSESSMENT OVERVIEW
                  </div>

                  <h2>
                    You're entering
                    proctoring mode.
                  </h2>

                  <p>
                    Camera, microphone
                    and fullscreen are
                    checked before the
                    timer starts.
                    Leaving the
                    assessment can
                    terminate it
                    automatically.
                  </p>
                </div>
              </div>

              <div className="at-panel">
                <div className="at-panel-head">
                  <h3>
                    Proctoring rules
                  </h3>

                  <span>
                    REQUIRED
                  </span>
                </div>

                {RULES.map(
                  (rule, index) => (
                    <div
                      className="at-rule"
                      key={rule}
                    >
                      <b>
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </b>

                      <span>
                        {rule}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>

            <aside>
              <div className="at-panel">
                <div className="at-panel-head">
                  <h3>
                    System check
                  </h3>

                  <span
                    className={
                      mediaReady
                        ? "at-pass"
                        : "at-wait"
                    }
                  >
                    {mediaReady
                      ? "READY"
                      : "ACTION REQUIRED"}
                  </span>
                </div>

                <SystemCheck
                  title="Camera"
                  text="Live camera feed"
                  ready={
                    cameraReady
                  }
                />

                <SystemCheck
                  title="Microphone"
                  text="Live audio input"
                  ready={
                    microphoneReady
                  }
                />

                <SystemCheck
                  title="Fullscreen"
                  text="Activated when test starts"
                  ready={
                    fullscreenReady
                  }
                />

                <button
                  className="at-check"
                  onClick={
                    requestMedia
                  }
                >
                  CHECK CAMERA & MIC
                </button>

                {cameraReady && (
                  <div className="at-preview">
                    <video
                      ref={
                        cameraRef
                      }
                      autoPlay
                      muted
                      playsInline
                    />

                    <span>
                      CAMERA PREVIEW
                    </span>
                  </div>
                )}
              </div>

              <div className="at-stats">
                <Stat
                  value={
                    questions.length
                  }
                  label="QUESTIONS"
                />

                <Stat
                  value={`${durationMinutes}m`}
                  label="TIME LIMIT"
                />

                <Stat
                  value="MCQ"
                  label="FORMAT"
                />
              </div>

              {error && (
                <div className="at-inline-error">
                  {error}
                </div>
              )}

              <button
                className={
                  mediaReady
                    ? "at-start"
                    : "at-start disabled"
                }
                disabled={
                  !mediaReady
                }
                onClick={
                  startAssessment
                }
              >
                ENTER PROCTORED TEST →
              </button>

              <button
                className="at-link"
                onClick={() =>
                  navigate(
                    "/practice/assessments"
                  )
                }
              >
                Cancel and return
              </button>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <div className="at-running">
      <style>
        {CSS}
      </style>

      <header className="at-top">
        <div className="at-brand">
          <b>E</b>

          <div>
            <strong>
              ENGVIVA
            </strong>

            <small>
              PROCTORED LAB
            </small>
          </div>
        </div>

        <div className="at-identity">
          <strong>
            {title}
          </strong>

          <span>
            {company?.name ||
              companyId ||
              "Engineering Test"}
          </span>
        </div>

        <div className="at-top-right">
          <div
            className={
              remainingSeconds <=
              60
                ? "at-timer danger"
                : "at-timer"
            }
          >
            <small>
              TIME
            </small>

            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>
          </div>

          <div className="at-live">
            <i />

            {proctorStatus ===
            "ACTIVE"
              ? "PROCTOR ACTIVE"
              : proctorStatus}
          </div>
        </div>
      </header>

      <div className="at-progress">
        <span
          style={{
            width: `${progressPercentage}%`,
          }}
        />
      </div>

      <main className="at-layout">
        <aside className="at-question-nav">
          <div className="at-nav-head">
            <strong>
              QUESTIONS
            </strong>

            <span>
              {answeredCount}/
              {questions.length}
            </span>
          </div>

          <div className="at-question-grid">
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
                    onClick={() =>
                      goToQuestion(
                        index
                      )
                    }
                    className={[
                      current
                        ? "current"
                        : "",
                      answered
                        ? "answered"
                        : "",
                    ].join(" ")}
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

          <div className="at-legend">
            <Legend
              label="Current"
              className="current"
            />

            <Legend
              label="Answered"
              className="answered"
            />

            <Legend
              label="Unanswered"
              className="empty"
            />
          </div>

          <div className="at-nav-footer">
            <i />

            <div>
              <strong>
                PROCTORING
              </strong>

              <span>
                Camera active
              </span>
            </div>
          </div>
        </aside>

        <section className="at-question-area">
          <div className="at-q-head">
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

          <div className="at-question-card">
            <div className="at-q-number">
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

            <div className="at-options">
              {currentQuestion?.options.map(
                (
                  option,
                  optionIndex
                ) => {
                  const value =
                    typeof option ===
                    "object"
                      ? firstValue(
                          option.value,
                          option.text,
                          option.label
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

          <div className="at-q-actions">
            <button
              className="at-prev"
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

            <div className="at-answer-state">
              {answers[
                currentQuestion?.id
              ] !== undefined
                ? "✓ ANSWER SAVED"
                : "○ NOT ANSWERED"}
            </div>

            {currentIndex <
            questions.length - 1 ? (
              <button
                className="at-next"
                onClick={
                  nextQuestion
                }
              >
                NEXT QUESTION →
              </button>
            ) : (
              <button
                className="at-finish"
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

        <aside className="at-proctor">
          <div className="at-camera">
            <div className="at-camera-head">
              <div>
                <strong>
                  LIVE CAMERA
                </strong>

                <span>
                  <i /> MONITORING
                </span>
              </div>

              <b>
                ● REC
              </b>
            </div>

            <div className="at-video">
              <video
                ref={cameraRef}
                autoPlay
                muted
                playsInline
              />

              <span>
                ENGVIVA PROCTOR
              </span>
            </div>

            <CheckLine
              title="Camera"
              ready={
                cameraReady
              }
            />

            <CheckLine
              title="Microphone"
              ready={
                microphoneReady
              }
            />

            <CheckLine
              title="Fullscreen"
              ready={
                fullscreenReady
              }
            />
          </div>

          <div className="at-security">
            <b>
              ◈
            </b>

            <div>
              <strong>
                Secure session
              </strong>

              <p>
                Tab switching,
                fullscreen exit
                and window focus
                loss can terminate
                this attempt.
              </p>
            </div>
          </div>
        </aside>
      </main>

      {showSubmitModal && (
        <div className="at-modal-backdrop">
          <div className="at-modal">
            <div className="at-modal-icon">
              ✓
            </div>

            <div className="at-eyebrow">
              FINAL SUBMISSION
            </div>

            <h2>
              Submit your assessment?
            </h2>

            <p>
              You cannot modify
              your answers after
              submission.
            </p>

            <div className="at-summary">
              <Stat
                value={
                  answeredCount
                }
                label="ANSWERED"
              />

              <Stat
                value={
                  unansweredCount
                }
                label="UNANSWERED"
              />

              <Stat
                value={formatTime(
                  remainingSeconds
                )}
                label="TIME LEFT"
              />
            </div>

            <div className="at-modal-actions">
              <button
                className="at-secondary"
                onClick={() =>
                  setShowSubmitModal(
                    false
                  )
                }
                disabled={
                  submitting
                }
              >
                CONTINUE TEST
              </button>

              <button
                className="at-primary"
                onClick={() =>
                  submitAssessment(
                    false
                  )
                }
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "SUBMITTING..."
                  : "SUBMIT ASSESSMENT →"}
              </button>
            </div>

            {error && (
              <div className="at-inline-error">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Shell({
  children,
}) {
  return (
    <div className="at-shell">
      <style>
        {CSS}
      </style>

      {children}
    </div>
  );
}

function SystemCheck({
  title,
  text,
  ready,
}) {
  return (
    <div className="at-system">
      <div className="at-system-icon">
        {ready
          ? "✓"
          : "○"}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>

      <b
        className={
          ready
            ? "ready"
            : ""
        }
      >
        {ready
          ? "READY"
          : "WAITING"}
      </b>
    </div>
  );
}

function CheckLine({
  title,
  ready,
}) {
  return (
    <div className="at-check-line">
      <span
        className={
          ready
            ? "ready"
            : ""
        }
      >
        {ready
          ? "✓"
          : "○"}
      </span>

      <strong>
        {title}
      </strong>

      <em>
        {ready
          ? "READY"
          : "WAIT"}
      </em>
    </div>
  );
}

function Legend({
  label,
  className,
}) {
  return (
    <div className="at-legend-item">
      <i
        className={
          className
        }
      />

      {label}
    </div>
  );
}

function Stat({
  value,
  label,
}) {
  return (
    <div className="at-stat">
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

const CSS = `
* {
  box-sizing: border-box;
}

button {
  font: inherit;
}

.at-shell,
.at-running {
  min-height: 100vh;
  color: #f7f5fb;
  background:
    radial-gradient(
      circle at 85% 5%,
      rgba(171,130,255,.12),
      transparent 30%
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

.at-loading,
.at-error-card {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
}

.at-spinner {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 4px solid rgba(201,167,255,.15);
  border-top-color: #c9a7ff;
  animation: atspin 1s linear infinite;
  margin-bottom: 25px;
}

@keyframes atspin {
  to {
    transform: rotate(360deg);
  }
}

.at-loading h1,
.at-error-card h1 {
  margin: 8px 0;
  font-size: 34px;
  letter-spacing: -1px;
}

.at-loading p,
.at-error-card > p {
  color: #85808d;
  font-size: 13px;
  line-height: 1.6;
  max-width: 580px;
}

.at-error-card {
  width: min(620px, calc(100% - 30px));
  min-height: auto;
  margin: 12vh auto;
  padding: 40px;
  border:
    1px solid rgba(255,255,255,.08);
  border-radius: 28px;
  background:
    rgba(255,255,255,.035);
}

.at-danger-icon {
  width: 66px;
  height: 66px;
  border-radius: 20px;
  background:
    rgba(255,80,100,.08);
  border:
    1px solid rgba(255,80,100,.18);
  color: #ff8192;
  display: grid;
  place-items: center;
  font-size: 25px;
  font-weight: 950;
  margin-bottom: 20px;
}

.at-actions,
.at-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}

.at-primary,
.at-secondary,
.at-check,
.at-start,
.at-link {
  border-radius: 13px;
  min-height: 48px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 1px;
}

.at-primary {
  border: 0;
  background:
    linear-gradient(
      135deg,
      #d8c2ff,
      #b38bf1
    );
  color: #160c1e;
}

.at-secondary {
  border:
    1px solid rgba(255,255,255,.08);
  background:
    rgba(255,255,255,.035);
  color: #aaa3b0;
}

.at-pre {
  width: min(1250px, calc(100% - 50px));
  margin: auto;
  padding: 55px 0 80px;
}

.at-pre-head {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  align-items: flex-start;
  margin-bottom: 35px;
}

.at-pre-head h1 {
  margin: 9px 0 5px;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1;
  letter-spacing: -2px;
}

.at-pre-head p {
  margin: 0;
  color: #827b89;
  font-size: 13px;
}

.at-secure {
  padding: 10px 14px;
  border:
    1px solid rgba(201,167,255,.18);
  border-radius: 14px;
  color: #c9a7ff;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.at-secure i,
.at-live i,
.at-camera-head span i,
.at-nav-footer > i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7edb9b;
  box-shadow:
    0 0 12px rgba(126,219,155,.8);
  display: inline-block;
}

.at-pre-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.25fr)
    minmax(350px, .75fr);
  gap: 20px;
}

.at-intro-card,
.at-panel {
  border:
    1px solid rgba(255,255,255,.07);
  border-radius: 25px;
  background:
    rgba(255,255,255,.025);
}

.at-intro-card {
  padding: 30px;
  display: flex;
  gap: 20px;
  margin-bottom: 18px;
}

.at-number {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background:
    rgba(201,167,255,.08);
  color: #c9a7ff;
  display: grid;
  place-items: center;
  font-weight: 950;
  flex-shrink: 0;
}

.at-card-label {
  color: #7d7586;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.7px;
}

.at-intro-card h2 {
  margin: 8px 0;
  font-size: 25px;
}

.at-intro-card p {
  margin: 0;
  color: #88818e;
  font-size: 13px;
  line-height: 1.7;
}

.at-panel {
  padding: 24px;
}

.at-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.at-panel-head h3 {
  margin: 0;
  font-size: 16px;
}

.at-panel-head > span {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #c9a7ff;
}

.at-panel-head .at-pass {
  color: #9ee6b4;
}

.at-panel-head .at-wait {
  color: #c9a7ff;
}

.at-rule {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 0;
  border-top:
    1px solid rgba(255,255,255,.05);
  color: #a39ca9;
  font-size: 12px;
  line-height: 1.5;
}

.at-rule b {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background:
    rgba(201,167,255,.06);
  color: #a88bcf;
  display: grid;
  place-items: center;
  font-size: 8px;
  flex-shrink: 0;
}

.at-system {
  display: grid;
  grid-template-columns:
    38px 1fr auto;
  gap: 11px;
  align-items: center;
  padding: 13px 0;
  border-top:
    1px solid rgba(255,255,255,.05);
}

.at-system-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background:
    rgba(201,167,255,.07);
  color: #8a778f;
  display: grid;
  place-items: center;
  font-weight: 950;
}

.at-system strong {
  display: block;
  font-size: 12px;
}

.at-system span {
  display: block;
  color: #77707f;
  font-size: 9px;
  margin-top: 3px;
}

.at-system > b {
  color: #77707f;
  font-size: 8px;
}

.at-system > b.ready {
  color: #9ee6b4;
}

.at-check {
  width: 100%;
  margin-top: 13px;
  background:
    rgba(201,167,255,.07);
  border:
    1px solid rgba(201,167,255,.16);
  color: #c9a7ff;
}

.at-preview {
  height: 175px;
  margin-top: 14px;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
  background: #020204;
}

.at-preview video,
.at-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.at-preview span,
.at-video > span {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 5px 7px;
  border-radius: 6px;
  background:
    rgba(0,0,0,.65);
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 1px;
}

.at-stats,
.at-summary {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);
  gap: 9px;
  margin: 12px 0;
}

.at-stat {
  padding: 14px 8px;
  border-radius: 14px;
  background:
    rgba(255,255,255,.025);
  border:
    1px solid rgba(255,255,255,.055);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.at-stat strong {
  font-size: 18px;
}

.at-stat span {
  color: #706a77;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
}

.at-start {
  width: 100%;
  border: 0;
  background:
    linear-gradient(
      135deg,
      #d8c2ff,
      #b38bf1
    );
  color: #160c1e;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.at-start.disabled {
  background:
    rgba(255,255,255,.06);
  color: #5f5965;
  cursor: not-allowed;
}

.at-link {
  display: block;
  margin: 12px auto 0;
  background: transparent;
  border: 0;
  color: #696270;
}

.at-inline-error {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background:
    rgba(255,80,100,.06);
  border:
    1px solid rgba(255,80,100,.12);
  color: #ff9aa7;
  font-size: 10px;
  line-height: 1.5;
}

.at-running {
  display: flex;
  flex-direction: column;
}

.at-top {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 25px;
  padding: 0 24px;
  background:
    rgba(10,9,15,.97);
  border-bottom:
    1px solid rgba(255,255,255,.07);
}

.at-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 175px;
}

.at-brand > b {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background:
    linear-gradient(
      135deg,
      #d9c1ff,
      #a77be9
    );
  color: #170d20;
  display: grid;
  place-items: center;
  font-weight: 950;
}

.at-brand strong,
.at-brand small {
  display: block;
}

.at-brand strong {
  font-size: 12px;
  letter-spacing: 1px;
}

.at-brand small {
  margin-top: 2px;
  color: #716b78;
  font-size: 7px;
  letter-spacing: 1.5px;
  font-weight: 800;
}

.at-identity {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.at-identity strong {
  font-size: 13px;
}

.at-identity span {
  color: #716b78;
  font-size: 9px;
}

.at-top-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.at-timer {
  min-width: 105px;
  padding: 8px 12px;
  border-radius: 12px;
  background:
    rgba(201,167,255,.07);
  border:
    1px solid rgba(201,167,255,.13);
  display: flex;
  gap: 8px;
  align-items: center;
  color: #d5bfff;
}

.at-timer.danger {
  color: #ff8797;
  background:
    rgba(255,80,100,.1);
  border-color:
    rgba(255,80,100,.25);
}

.at-timer small {
  color: #716a78;
  font-size: 7px;
  letter-spacing: 1px;
}

.at-live {
  padding: 10px 12px;
  border-radius: 12px;
  background:
    rgba(130,220,160,.05);
  color: #91dba8;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.at-progress {
  height: 3px;
  background:
    rgba(255,255,255,.05);
}

.at-progress span {
  display: block;
  height: 100%;
  background:
    linear-gradient(
      90deg,
      #a77be9,
      #d6c0ff
    );
  transition:
    width .2s;
}

.at-layout {
  flex: 1;
  display: grid;
  grid-template-columns:
    235px
    minmax(0,1fr)
    265px;
  min-height:
    calc(100vh - 79px);
}

.at-question-nav,
.at-proctor {
  background:
    rgba(255,255,255,.012);
}

.at-question-nav {
  border-right:
    1px solid rgba(255,255,255,.06);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.at-proctor {
  border-left:
    1px solid rgba(255,255,255,.06);
  padding: 18px;
}

.at-nav-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 17px;
}

.at-nav-head strong {
  color: #827a8a;
  font-size: 9px;
  letter-spacing: 1.7px;
}

.at-nav-head span {
  color: #c9a7ff;
  font-size: 10px;
  font-weight: 900;
}

.at-question-grid {
  display: grid;
  grid-template-columns:
    repeat(4,1fr);
  gap: 7px;
}

.at-question-grid button {
  aspect-ratio: 1;
  border-radius: 10px;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
  color: #77707f;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.at-question-grid button.current {
  background:
    rgba(201,167,255,.15);
  border-color:
    rgba(201,167,255,.45);
  color: #e0cfff;
}

.at-question-grid button.answered {
  background:
    rgba(120,215,150,.07);
  border-color:
    rgba(120,215,150,.2);
  color: #91dba8;
}

.at-legend {
  margin-top: 20px;
  padding-top: 17px;
  border-top:
    1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.at-legend-item {
  color: #6d6674;
  font-size: 9px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.at-legend-item i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #45404b;
}

.at-legend-item i.current {
  background: #c9a7ff;
}

.at-legend-item i.answered {
  background: #80d69a;
}

.at-nav-footer {
  margin-top: auto;
  padding: 12px;
  border-radius: 13px;
  background:
    rgba(120,215,150,.035);
  border:
    1px solid rgba(120,215,150,.09);
  display: flex;
  gap: 9px;
  align-items: center;
}

.at-nav-footer strong,
.at-nav-footer span {
  display: block;
}

.at-nav-footer strong {
  font-size: 8px;
}

.at-nav-footer span {
  color: #6d6674;
  font-size: 7px;
  margin-top: 3px;
}

.at-question-area {
  padding: 38px
    clamp(25px,5vw,70px);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.at-q-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 22px;
}

.at-q-head span {
  display: block;
  color: #8b8295;
  font-size: 9px;
  letter-spacing: 1.7px;
  font-weight: 900;
}

.at-q-head b {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 9px;
  border-radius: 8px;
  background:
    rgba(201,167,255,.06);
  color: #aa8ed0;
  font-size: 8px;
}

.at-q-head em {
  padding: 7px 10px;
  border:
    1px solid rgba(255,255,255,.07);
  border-radius: 9px;
  color: #77707f;
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
}

.at-question-card {
  flex: 1;
  padding:
    clamp(25px,4vw,50px);
  border-radius: 25px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.018)
    );
  border:
    1px solid rgba(255,255,255,.075);
}

.at-q-number {
  color: #9e88bb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 17px;
}

.at-question-card h1 {
  margin: 0;
  max-width: 900px;
  font-size:
    clamp(22px,3vw,32px);
  line-height: 1.35;
}

.at-options {
  margin-top: 34px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.at-options button {
  width: 100%;
  min-height: 64px;
  padding: 9px 15px;
  border-radius: 15px;
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.025);
  color: #c4becb;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
}

.at-options button.selected {
  border-color:
    rgba(201,167,255,.45);
  background:
    rgba(201,167,255,.09);
  color: #fff;
}

.at-options button > b {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  background:
    rgba(255,255,255,.045);
  display: grid;
  place-items: center;
  color: #837b8d;
  flex-shrink: 0;
}

.at-options button.selected > b {
  background:
    rgba(201,167,255,.16);
  color: #d9c4ff;
}

.at-options button span {
  flex: 1;
  font-size: 14px;
  line-height: 1.45;
}

.at-options button i {
  color: #c9a7ff;
  font-style: normal;
  font-weight: 950;
  font-size: 18px;
}

.at-q-actions {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.at-prev,
.at-next,
.at-finish {
  min-height: 45px;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 9px;
  font-weight: 950;
  cursor: pointer;
}

.at-prev {
  border:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(255,255,255,.035);
  color: #b0a9b6;
}

.at-prev:disabled {
  opacity: .3;
  cursor: not-allowed;
}

.at-next {
  border: 0;
  background:
    linear-gradient(
      135deg,
      #d6bfff,
      #b48bf0
    );
  color: #170d20;
}

.at-finish {
  border: 0;
  background:
    linear-gradient(
      135deg,
      #9ee6b4,
      #6ecf8c
    );
  color: #0b1b10;
}

.at-answer-state {
  color: #77707e;
  font-size: 9px;
  font-weight: 800;
}

.at-camera {
  padding: 13px;
  border-radius: 18px;
  background:
    rgba(255,255,255,.035);
  border:
    1px solid rgba(255,255,255,.075);
}

.at-camera-head {
  display: flex;
  justify-content: space-between;
  padding:
    3px 4px 12px;
}

.at-camera-head strong,
.at-camera-head span {
  display: block;
}

.at-camera-head strong {
  color: #817989;
  font-size: 8px;
  letter-spacing: 1.3px;
}

.at-camera-head span {
  color: #87d79c;
  font-size: 7px;
  font-weight: 900;
  margin-top: 4px;
}

.at-camera-head > b {
  color: #ff7888;
  font-size: 8px;
}

.at-video {
  height: 190px;
  position: relative;
  border-radius: 13px;
  overflow: hidden;
  background: #020204;
}

.at-check-line {
  display: grid;
  grid-template-columns:
    18px 1fr auto;
  gap: 6px;
  padding: 8px 0;
  border-top:
    1px solid rgba(255,255,255,.045);
  font-size: 8px;
  align-items: center;
  color: #817b88;
}

.at-check-line span.ready {
  color: #86d69b;
}

.at-check-line em {
  color: #5c5662;
  font-style: normal;
  font-size: 7px;
}

.at-security {
  margin-top: 12px;
  padding: 13px;
  border-radius: 16px;
  background:
    rgba(201,167,255,.035);
  border:
    1px solid rgba(201,167,255,.08);
  display: flex;
  gap: 10px;
}

.at-security > b {
  color: #c9a7ff;
  font-size: 18px;
}

.at-security strong {
  font-size: 10px;
}

.at-security p {
  margin: 4px 0 0;
  color: #696270;
  font-size: 8px;
  line-height: 1.5;
}

.at-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background:
    rgba(0,0,0,.78);
  backdrop-filter:
    blur(14px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.at-modal {
  width: min(520px,100%);
  padding: 32px;
  border-radius: 26px;
  background:
    linear-gradient(
      145deg,
      #16121d,
      #0d0b11
    );
  border:
    1px solid rgba(255,255,255,.1);
  box-shadow:
    0 30px 100px rgba(0,0,0,.5);
}

.at-modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background:
    rgba(201,167,255,.1);
  color: #c9a7ff;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 20px;
  margin-bottom: 18px;
}

.at-modal h2 {
  margin: 8px 0;
  font-size: 25px;
}

.at-modal p {
  color: #85808d;
  font-size: 13px;
  line-height: 1.6;
}

button:not(:disabled):hover {
  filter: brightness(1.08);
}

button:not(:disabled):active {
  transform: translateY(1px);
}

@media (max-width: 1100px) {
  .at-layout {
    grid-template-columns:
      190px minmax(0,1fr);
  }

  .at-proctor {
    display: none;
  }
}

@media (max-width: 850px) {
  .at-pre-grid {
    grid-template-columns: 1fr;
  }

  .at-pre-head {
    flex-direction: column;
  }

  .at-top {
    gap: 10px;
  }

  .at-brand {
    min-width: auto;
  }

  .at-identity {
    display: none;
  }

  .at-top-right {
    margin-left: auto;
  }

  .at-layout {
    grid-template-columns: 1fr;
  }

  .at-question-nav {
    display: none;
  }

  .at-question-area {
    padding:
      25px 18px;
  }

  .at-q-actions {
    flex-wrap: wrap;
  }

  .at-answer-state {
    order: 3;
    width: 100%;
    text-align: center;
  }

  .at-actions,
  .at-modal-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .at-pre {
    width:
      min(
        calc(100% - 28px),
        1250px
      );
    padding-top: 30px;
  }

  .at-pre-head h1 {
    font-size: 34px;
  }

  .at-top {
    height: 68px;
    padding: 0 12px;
  }

  .at-top-right .at-live {
    display: none;
  }

  .at-timer {
    min-width: 90px;
  }

  .at-question-card {
    padding: 22px;
  }

  .at-question-card h1 {
    font-size: 22px;
  }

  .at-options button {
    min-height: 58px;
  }
}
`;