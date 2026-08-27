import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  FileText,
  Upload,
  Sparkles,
  Download,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  Edit3,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Brain,
  BriefcaseBusiness,
  GraduationCap,
  Code2,
  Award,
  UserRound,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  FileDown,
  WandSparkles,
} from "lucide-react";

import { db } from "../firebase";

/* =========================================================
   CONFIG
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/*
 * IMPORTANT:
 * Keep Groq completely on the backend.
 * Never place GROQ_API_KEY in this file.
 */

const MAX_FILE_SIZE =
  15 * 1024 * 1024;

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function normalizeId(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
}

function getFileExtension(name = "") {
  const parts =
    String(name).split(".");

  return parts.length > 1
    ? parts.pop().toLowerCase()
    : "";
}

function isSupportedResume(file) {
  if (!file) return false;

  const ext =
    getFileExtension(file.name);

  return [
    "pdf",
    "doc",
    "docx",
  ].includes(ext);
}

function formatBytes(bytes) {
  const value =
    Number(bytes) || 0;

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    if (
      value?.toDate &&
      typeof value.toDate ===
        "function"
    ) {
      return value
        .toDate()
        .toLocaleString();
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleString();
  } catch {
    return "—";
  }
}

/* =========================================================
   DEFAULT RESUME BUILDER
========================================================= */

const EMPTY_RESUME = {
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
  },

  summary: "",

  skills: [],

  experience: [],

  education: [],

  projects: [],

  certifications: [],

  achievements: [],

  rawText: "",

  source: "builder",

  status: "draft",

  generated: {
    latex: "",
    plainText: "",
  },
};

/* =========================================================
   FIREBASE DOCUMENT
========================================================= */

/*
 * Single canonical document.
 *
 * users/{uid}/resume/current
 *
 * Other screens can later read exactly
 * the same document.
 */

function resumeDocumentRef(uid) {
  if (!uid) return null;

  return doc(
    db,
    "users",
    uid,
    "resume",
    "current"
  );
}

/* =========================================================
   API
========================================================= */

async function getFirebaseToken(user) {
  if (!user) {
    throw new Error(
      "You are not authenticated."
    );
  }

  return user.getIdToken();
}

async function apiRequest(
  path,
  options = {},
  user
) {
  const token =
    await getFirebaseToken(user);

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`,
  };

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Resume() {
  const fileInputRef =
    useRef(null);

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("overview");

  const [showBuilder, setShowBuilder] =
    useState(false);

  const [showRawText, setShowRawText] =
    useState(false);

  const [resume, setResume] =
    useState(EMPTY_RESUME);

  const [savedResume, setSavedResume] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [generatedLatex, setGeneratedLatex] =
    useState("");

  const [expandedSections, setExpandedSections] =
    useState({
      personal: true,
      summary: true,
      skills: true,
      experience: true,
      education: true,
      projects: true,
      certifications: false,
      achievements: false,
    });

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const auth =
      getAuth();

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  /* =======================================================
     FIREBASE LOAD
  ======================================================= */

  const loadResume =
    useCallback(
      async (currentUser) => {
        if (!currentUser) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const ref =
            resumeDocumentRef(
              currentUser.uid
            );

          const snapshot =
            await getDoc(ref);

          if (
            snapshot.exists()
          ) {
            const data =
              snapshot.data();

            const normalized = {
              ...EMPTY_RESUME,
              ...safeObject(data),

              personal: {
                ...EMPTY_RESUME.personal,
                ...safeObject(
                  data.personal
                ),
              },

              generated: {
                ...EMPTY_RESUME.generated,
                ...safeObject(
                  data.generated
                ),
              },

              skills:
                safeArray(
                  data.skills
                ),

              experience:
                safeArray(
                  data.experience
                ),

              education:
                safeArray(
                  data.education
                ),

              projects:
                safeArray(
                  data.projects
                ),

              certifications:
                safeArray(
                  data.certifications
                ),

              achievements:
                safeArray(
                  data.achievements
                ),
            };

            setResume(
              normalized
            );

            setSavedResume(
              normalized
            );

            setGeneratedLatex(
              clean(
                normalized
                  ?.generated
                  ?.latex
              )
            );
          } else {
            setResume({
              ...EMPTY_RESUME,

              personal: {
                ...EMPTY_RESUME.personal,

                fullName:
                  currentUser.displayName ||
                  "",

                email:
                  currentUser.email ||
                  "",
              },
            });
          }
        } catch (err) {
          console.error(
            "[RESUME LOAD]",
            err
          );

          setError(
            err?.message ||
              "Unable to load your resume."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    if (!authLoading) {
      loadResume(user);
    }
  }, [
    user,
    authLoading,
    loadResume,
  ]);

  /* =======================================================
     MESSAGE HELPERS
  ======================================================= */

  const flashSuccess =
    useCallback(
      (message) => {
        setSuccess(message);

        window.setTimeout(
          () => {
            setSuccess("");
          },
          3500
        );
      },
      []
    );

  const clearMessages =
    () => {
      setError("");
      setSuccess("");
    };

  /* =======================================================
     UPDATE HELPERS
  ======================================================= */

  const updatePersonal =
    (field, value) => {
      setResume(
        (previous) => ({
          ...previous,

          personal: {
            ...previous.personal,
            [field]: value,
          },

          status: "draft",
        })
      );
    };

  const updateField =
    (field, value) => {
      setResume(
        (previous) => ({
          ...previous,
          [field]: value,
          status: "draft",
        })
      );
    };

  const toggleSection =
    (section) => {
      setExpandedSections(
        (previous) => ({
          ...previous,
          [section]:
            !previous[section],
        })
      );
    };

  /* =======================================================
     ARRAY HELPERS
  ======================================================= */

  const addItem =
    (field, item) => {
      setResume(
        (previous) => ({
          ...previous,

          [field]: [
            ...safeArray(
              previous[field]
            ),
            item,
          ],

          status: "draft",
        })
      );
    };

  const updateArrayItem =
    (
      field,
      index,
      key,
      value
    ) => {
      setResume(
        (previous) => {
          const items = [
            ...safeArray(
              previous[field]
            ),
          ];

          items[index] = {
            ...safeObject(
              items[index]
            ),
            [key]: value,
          };

          return {
            ...previous,
            [field]: items,
            status: "draft",
          };
        }
      );
    };

  const removeArrayItem =
    (
      field,
      index
    ) => {
      setResume(
        (previous) => ({
          ...previous,

          [field]:
            safeArray(
              previous[field]
            ).filter(
              (_, itemIndex) =>
                itemIndex !==
                index
            ),

          status: "draft",
        })
      );
    };

  /* =======================================================
     FILE SELECT
  ======================================================= */

  const handleFileSelect =
    (event) => {
      clearMessages();

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !isSupportedResume(
          file
        )
      ) {
        setError(
          "Please upload a PDF, DOC, or DOCX resume."
        );

        event.target.value =
          "";

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setError(
          "Resume file must be 15 MB or smaller."
        );

        event.target.value =
          "";

        return;
      }

      setSelectedFile(
        file
      );
    };

  /* =======================================================
     UPLOAD + EXTRACTION
  ======================================================= */

  const uploadResume =
    async () => {
      if (!user) {
        setError(
          "Please sign in before uploading your resume."
        );

        return;
      }

      if (
        !selectedFile
      ) {
        setError(
          "Select a resume file first."
        );

        return;
      }

      clearMessages();
      setUploading(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "resume",
          selectedFile
        );

        /*
         * Existing ENGVIVA extraction
         * endpoint.
         *
         * Backend should perform:
         * PDF/DOC/DOCX extraction/OCR
         * and return normalized resume
         * intelligence.
         */

        const result =
          await apiRequest(
            "/api/profile/resume/extract",
            {
              method: "POST",
              body: formData,
            },
            user
          );

        const rawText =
          clean(
            result?.rawText ||
              result?.text ||
              result?.resumeText
          );

        const parsed =
          safeObject(
            result?.parsed ||
              result?.resume ||
              result?.intelligence
          );

        const nextResume = {
          ...resume,

          ...parsed,

          personal: {
            ...resume.personal,
            ...safeObject(
              parsed.personal
            ),
          },

          skills:
            safeArray(
              parsed.skills ||
                resume.skills
            ),

          experience:
            safeArray(
              parsed.experience ||
                resume.experience
            ),

          education:
            safeArray(
              parsed.education ||
                resume.education
            ),

          projects:
            safeArray(
              parsed.projects ||
                resume.projects
            ),

          certifications:
            safeArray(
              parsed.certifications ||
                resume.certifications
            ),

          achievements:
            safeArray(
              parsed.achievements ||
                resume.achievements
            ),

          summary:
            clean(
              parsed.summary ||
                resume.summary
            ),

          rawText,

          source: "upload",

          fileName:
            selectedFile.name,

          fileSize:
            selectedFile.size,

          fileType:
            selectedFile.type,

          status: "processed",

          extractedAt:
            new Date().toISOString(),
        };

        setResume(
          nextResume
        );

        setSelectedFile(
          null
        );

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        /*
         * Immediately persist the
         * extracted intelligence.
         */
        await saveResumeToFirebase(
          nextResume,
          user,
          false
        );

        flashSuccess(
          "Resume extracted and saved successfully."
        );

        setActiveTab(
          "overview"
        );
      } catch (err) {
        console.error(
          "[RESUME UPLOAD]",
          err
        );

        setError(
          err?.message ||
            "Resume extraction failed."
        );
      } finally {
        setUploading(false);
      }
    };

  /* =======================================================
     FIREBASE SAVE
  ======================================================= */

  const saveResumeToFirebase =
    async (
      resumeData,
      currentUser = user,
      showLoading = true
    ) => {
      if (!currentUser) {
        throw new Error(
          "Authentication required."
        );
      }

      if (showLoading) {
        setSaving(true);
      }

      try {
        const ref =
          resumeDocumentRef(
            currentUser.uid
          );

        const payload = {
          ...resumeData,

          uid:
            currentUser.uid,

          email:
            currentUser.email ||
            resumeData?.personal
              ?.email ||
            "",

          updatedAt:
            serverTimestamp(),

          /*
           * Keep a predictable status.
           */
          status:
            resumeData.status ||
            "processed",
        };

        await setDoc(
          ref,
          payload,
          {
            merge: true,
          }
        );

        setSavedResume(
          resumeData
        );

        return true;
      } finally {
        if (showLoading) {
          setSaving(false);
        }
      }
    };

  const handleSave =
    async () => {
      clearMessages();

      try {
        await saveResumeToFirebase(
          resume,
          user,
          true
        );

        flashSuccess(
          "Resume saved to Firebase."
        );
      } catch (err) {
        console.error(
          "[RESUME SAVE]",
          err
        );

        setError(
          err?.message ||
            "Unable to save resume."
        );
      }
    };

  /* =======================================================
     AI RESUME GENERATION
  ======================================================= */

  const generateResume =
    async () => {
      if (!user) {
        setError(
          "Please sign in before generating a resume."
        );

        return;
      }

      clearMessages();
      setGenerating(true);

      try {
        /*
         * Backend owns Groq.
         *
         * Frontend only sends structured
         * resume information.
         */

        const result =
          await apiRequest(
            "/api/profile/resume/generate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                resume: {
                  personal:
                    resume.personal,

                  summary:
                    resume.summary,

                  skills:
                    resume.skills,

                  experience:
                    resume.experience,

                  education:
                    resume.education,

                  projects:
                    resume.projects,

                  certifications:
                    resume.certifications,

                  achievements:
                    resume.achievements,

                  rawText:
                    resume.rawText,
                },
              }),
            },
            user
          );

        const latex =
          clean(
            result?.latex ||
              result?.data?.latex ||
              result?.resume?.latex
          );

        const plainText =
          clean(
            result?.plainText ||
              result?.text ||
              result?.data?.plainText
          );

        if (!latex) {
          throw new Error(
            "The resume generator returned no LaTeX."
          );
        }

        const nextResume = {
          ...resume,

          source:
            resume.source ||
            "builder",

          status:
            "generated",

          generated: {
            ...resume.generated,

            latex,

            plainText,

            generatedAt:
              new Date().toISOString(),
          },
        };

        setResume(
          nextResume
        );

        setGeneratedLatex(
          latex
        );

        await saveResumeToFirebase(
          nextResume,
          user,
          false
        );

        setActiveTab(
          "preview"
        );

        flashSuccess(
          "AI resume generated and saved."
        );
      } catch (err) {
        console.error(
          "[RESUME GENERATE]",
          err
        );

        setError(
          err?.message ||
            "Unable to generate the resume."
        );
      } finally {
        setGenerating(false);
      }
    };

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  const downloadGeneratedResume =
    async () => {
      if (!user) {
        setError(
          "Please sign in before downloading."
        );

        return;
      }

      if (
        !generatedLatex
      ) {
        setError(
          "Generate a resume first."
        );

        return;
      }

      clearMessages();
      setDownloading(true);

      try {
        /*
         * Backend converts LaTeX -> PDF.
         *
         * Expected response:
         * application/pdf
         *
         * If your backend returns JSON with
         * a download URL instead, adapt this
         * one endpoint without changing the
         * rest of Resume.js.
         */

        const token =
          await getFirebaseToken(
            user
          );

        const response =
          await fetch(
            `${API_URL}/api/profile/resume/download`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                latex:
                  generatedLatex,
              }),
            }
          );

        if (!response.ok) {
          let message =
            "Unable to generate PDF.";

          try {
            const data =
              await response.json();

            message =
              data?.error
                ?.message ||
              data?.message ||
              message;
          } catch {
            // ignore
          }

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        const name =
          normalizeId(
            resume.personal
              ?.fullName ||
              "engviva-resume"
          ) ||
          "engviva-resume";

        anchor.href =
          url;

        anchor.download =
          `${name}-resume.pdf`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );

        flashSuccess(
          "Resume PDF downloaded."
        );
      } catch (err) {
        console.error(
          "[RESUME DOWNLOAD]",
          err
        );

        setError(
          err?.message ||
            "Resume download failed."
        );
      } finally {
        setDownloading(false);
      }
    };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const hasResume =
    Boolean(
      clean(
        resume.rawText
      ) ||
        clean(
          resume.generated
            ?.latex
        ) ||
        safeArray(
          resume.skills
        ).length ||
        safeArray(
          resume.experience
        ).length ||
        safeArray(
          resume.education
        ).length
    );

  const hasGeneratedResume =
    Boolean(
      clean(
        generatedLatex
      )
    );

  const completion =
    useMemo(() => {
      const checks = [
        Boolean(
          clean(
            resume.personal
              ?.fullName
          )
        ),

        Boolean(
          clean(
            resume.personal
              ?.email
          )
        ),

        Boolean(
          clean(
            resume.summary
          )
        ),

        safeArray(
          resume.skills
        ).length > 0,

        safeArray(
          resume.education
        ).length > 0,

        safeArray(
          resume.experience
        ).length > 0,

        safeArray(
          resume.projects
        ).length > 0,
      ];

      return Math.round(
        (checks.filter(
          Boolean
        ).length /
          checks.length) *
          100
      );
    }, [resume]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    authLoading ||
    loading
  ) {
    return (
      <PageShell>
        <div className="resume-loading">
          <Loader2
            size={32}
            className="spin"
          />

          <span>
            Loading your resume...
          </span>
        </div>
      </PageShell>
    );
  }

  /* =======================================================
     AUTH
  ======================================================= */

  if (!user) {
    return (
      <PageShell>
        <div className="resume-empty">
          <div className="empty-icon">
            <FileText
              size={34}
            />
          </div>

          <h2>
            Sign in to manage your resume
          </h2>

          <p>
            Your resume intelligence is
            securely connected to your
            ENGVIVA account.
          </p>
        </div>
      </PageShell>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <PageShell>
      <div className="resume-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="resume-header">

          <div>
            <div className="eyebrow">
              ENGVIVA • RESUME INTELLIGENCE
            </div>

            <h1>
              Your Resume
            </h1>

            <p>
              Upload your resume, build one
              with AI, and keep your career
              information ready across ENGVIVA.
            </p>
          </div>

          <div className="header-actions">

            {hasResume && (
              <button
                className="secondary-button"
                onClick={() =>
                  setShowBuilder(
                    true
                  )
                }
              >
                <WandSparkles
                  size={17}
                />

                AI Builder
              </button>
            )}

            <button
              className="primary-button"
              onClick={
                handleSave
              }
              disabled={
                saving
              }
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="spin"
                />
              ) : (
                <Save
                  size={17}
                />
              )}

              Save
            </button>
          </div>
        </header>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <Message
            type="error"
            message={error}
            onClose={() =>
              setError("")
            }
          />
        )}

        {success && (
          <Message
            type="success"
            message={success}
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* =================================================
            STATUS
        ================================================= */}

        <section className="resume-status-card">

          <div className="status-icon">
            {hasResume ? (
              <CheckCircle2
                size={25}
              />
            ) : (
              <FileText
                size={25}
              />
            )}
          </div>

          <div className="status-content">
            <strong>
              {hasResume
                ? "Resume intelligence is ready"
                : "No resume added yet"}
            </strong>

            <span>
              {hasResume
                ? `Profile completeness ${completion}%`
                : "Upload an existing resume or create one with ENGVIVA AI."}
            </span>
          </div>

          <div className="status-progress">
            <div
              className="progress-bar"
              style={{
                width: `${completion}%`,
              }}
            />
          </div>
        </section>

        {/* =================================================
            TABS
        ================================================= */}

        <nav className="resume-tabs">

          <Tab
            active={
              activeTab ===
              "overview"
            }
            onClick={() =>
              setActiveTab(
                "overview"
              )
            }
            icon={
              <Eye size={17} />
            }
            label="Overview"
          />

          <Tab
            active={
              activeTab ===
              "edit"
            }
            onClick={() =>
              setActiveTab(
                "edit"
              )
            }
            icon={
              <Edit3 size={17} />
            }
            label="Edit"
          />

          {hasGeneratedResume && (
            <Tab
              active={
                activeTab ===
                "preview"
              }
              onClick={() =>
                setActiveTab(
                  "preview"
                )
              }
              icon={
                <FileText
                  size={17}
                />
              }
              label="AI Resume"
            />
          )}

          {resume.rawText && (
            <Tab
              active={
                activeTab ===
                "source"
              }
              onClick={() =>
                setActiveTab(
                  "source"
                )
              }
              icon={
                <Brain
                  size={17}
                />
              }
              label="Extracted Text"
            />
          )}
        </nav>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        {activeTab ===
          "overview" && (
          <div className="resume-content">

            <section className="upload-card">

              <div className="upload-icon">
                <Upload
                  size={30}
                />
              </div>

              <div className="upload-content">
                <h2>
                  {hasResume
                    ? "Update your resume"
                    : "Upload your resume"}
                </h2>

                <p>
                  PDF, DOC or DOCX •
                  maximum 15 MB
                </p>

                {selectedFile && (
                  <div className="selected-file">
                    <FileText
                      size={18}
                    />

                    <div>
                      <strong>
                        {
                          selectedFile.name
                        }
                      </strong>

                      <span>
                        {formatBytes(
                          selectedFile.size
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedFile(
                          null
                        )
                      }
                    >
                      <X
                        size={17}
                      />
                    </button>
                  </div>
                )}

                <div className="upload-actions">

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={
                      handleFileSelect
                    }
                    hidden
                  />

                  <button
                    className="secondary-button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <Upload
                      size={17}
                    />

                    Choose Resume
                  </button>

                  {selectedFile && (
                    <button
                      className="primary-button"
                      onClick={
                        uploadResume
                      }
                      disabled={
                        uploading
                      }
                    >
                      {uploading ? (
                        <>
                          <Loader2
                            size={17}
                            className="spin"
                          />

                          Extracting...
                        </>
                      ) : (
                        <>
                          <Brain
                            size={17}
                          />

                          Extract & Save
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {!hasResume && (
              <section className="builder-promo">

                <div className="builder-promo-icon">
                  <Sparkles
                    size={28}
                  />
                </div>

                <div>
                  <div className="eyebrow">
                    AI RESUME BUILDER
                  </div>

                  <h2>
                    Don't have a resume?
                  </h2>

                  <p>
                    Build a professional,
                    ATS-friendly resume with
                    ENGVIVA AI. Your information
                    is converted into a clean
                    LaTeX resume and stored with
                    your resume intelligence.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setShowBuilder(
                        true
                      )
                    }
                  >
                    <Sparkles
                      size={17}
                    />

                    Create with ENGVIVA AI
                  </button>
                </div>
              </section>
            )}

            {hasResume && (
              <ResumeOverview
                resume={resume}
                onEdit={() =>
                  setActiveTab(
                    "edit"
                  )
                }
              />
            )}
          </div>
        )}

        {/* =================================================
            EDIT
        ================================================= */}

        {activeTab ===
          "edit" && (
          <div className="resume-content">

            <ResumeEditor
              resume={resume}
              expandedSections={
                expandedSections
              }
              toggleSection={
                toggleSection
              }
              updatePersonal={
                updatePersonal
              }
              updateField={
                updateField
              }
              addItem={
                addItem
              }
              updateArrayItem={
                updateArrayItem
              }
              removeArrayItem={
                removeArrayItem
              }
            />

            <div className="editor-footer">
              <button
                className="secondary-button"
                onClick={() =>
                  setActiveTab(
                    "overview"
                  )
                }
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={
                  handleSave
                }
                disabled={
                  saving
                }
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="spin"
                  />
                ) : (
                  <Save
                    size={17}
                  />
                )}

                Save Resume
              </button>

              <button
                className="ai-button"
                onClick={
                  generateResume
                }
                disabled={
                  generating
                }
              >
                {generating ? (
                  <Loader2
                    size={17}
                    className="spin"
                  />
                ) : (
                  <Sparkles
                    size={17}
                  />
                )}

                {generating
                  ? "Generating..."
                  : "Generate AI Resume"}
              </button>
            </div>
          </div>
        )}

        {/* =================================================
            AI PREVIEW
        ================================================= */}

        {activeTab ===
          "preview" && (
          <div className="resume-content">

            <section className="preview-header">

              <div>
                <div className="eyebrow">
                  AI GENERATED
                </div>

                <h2>
                  Your generated resume
                </h2>

                <p>
                  ENGVIVA generated this
                  resume from your saved
                  career information.
                </p>
              </div>

              <div className="header-actions">

                <button
                  className="secondary-button"
                  onClick={
                    generateResume
                  }
                  disabled={
                    generating
                  }
                >
                  {generating ? (
                    <Loader2
                      size={17}
                      className="spin"
                    />
                  ) : (
                    <RefreshCw
                      size={17}
                    />
                  )}

                  Regenerate
                </button>

                <button
                  className="primary-button"
                  onClick={
                    downloadGeneratedResume
                  }
                  disabled={
                    downloading
                  }
                >
                  {downloading ? (
                    <Loader2
                      size={17}
                      className="spin"
                    />
                  ) : (
                    <Download
                      size={17}
                    />
                  )}

                  Download PDF
                </button>
              </div>
            </section>

            <div className="latex-card">

              <div className="latex-toolbar">
                <span>
                  Generated LaTeX
                </span>

                <button
                  className="icon-button"
                  title="Save changes"
                  onClick={async () => {
                    const nextResume = {
                      ...resume,

                      generated: {
                        ...resume.generated,

                        latex:
                          generatedLatex,
                      },

                      status:
                        "generated",
                    };

                    setResume(
                      nextResume
                    );

                    try {
                      await saveResumeToFirebase(
                        nextResume,
                        user,
                        true
                      );

                      flashSuccess(
                        "LaTeX saved."
                      );
                    } catch (
                      err
                    ) {
                      setError(
                        err?.message ||
                          "Unable to save LaTeX."
                      );
                    }
                  }}
                >
                  <Save
                    size={17}
                  />
                </button>
              </div>

              <textarea
                className="latex-editor"
                value={
                  generatedLatex
                }
                onChange={(event) =>
                  setGeneratedLatex(
                    event.target.value
                  )
                }
                spellCheck={
                  false
                }
              />

              <div className="latex-note">
                <AlertCircle
                  size={15}
                />

                Edit only if you understand
                LaTeX syntax. The backend
                converts this into the final PDF.
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            RAW TEXT
        ================================================= */}

        {activeTab ===
          "source" && (
          <div className="resume-content">

            <section className="source-card">

              <div className="source-header">
                <div>
                  <div className="eyebrow">
                    SOURCE DOCUMENT
                  </div>

                  <h2>
                    Extracted resume text
                  </h2>

                  <p>
                    This is the text extracted
                    from the uploaded resume.
                    ENGVIVA can reuse it for
                    other career features.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setShowRawText(
                      !showRawText
                    )
                  }
                >
                  {showRawText ? (
                    <ChevronUp
                      size={17}
                    />
                  ) : (
                    <ChevronDown
                      size={17}
                    />
                  )}

                  {showRawText
                    ? "Collapse"
                    : "Expand"}
                </button>
              </div>

              <div
                className={
                  showRawText
                    ? "raw-text expanded"
                    : "raw-text"
                }
              >
                {resume.rawText ||
                  "No extracted text available."}
              </div>

            </section>
          </div>
        )}

      </div>

      {/* ===================================================
          BUILDER MODAL
      =================================================== */}

      {showBuilder && (
        <BuilderModal
          resume={resume}
          setResume={setResume}
          onClose={() =>
            setShowBuilder(
              false
            )
          }
          onGenerate={
            async () => {
              setShowBuilder(
                false
              );

              setActiveTab(
                "edit"
              );

              /*
               * Give React a tick to finish
               * the modal transition before
               * starting generation.
               */
              window.setTimeout(
                () => {
                  generateResume();
                },
                50
              );
            }
          }
        />
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .resume-page {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 32px;
          color: #17131f;
        }

        .resume-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 26px;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #806f99;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .resume-header h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          letter-spacing: -0.045em;
          line-height: 1;
        }

        .resume-header p {
          max-width: 680px;
          margin: 14px 0 0;
          color: #746d7e;
          font-size: 15px;
          line-height: 1.65;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          font: inherit;
        }

        .primary-button,
        .secondary-button,
        .ai-button {
          border: 0;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            opacity .18s ease;
        }

        .primary-button:hover,
        .secondary-button:hover,
        .ai-button:hover {
          transform: translateY(-1px);
        }

        .primary-button:disabled,
        .secondary-button:disabled,
        .ai-button:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .primary-button {
          background: #b99ad9;
          color: #24172d;
          box-shadow: 0 8px 24px rgba(137, 103, 168, .18);
        }

        .secondary-button {
          background: #f3edf8;
          color: #4d3a5d;
        }

        .ai-button {
          background: #74548d;
          color: white;
          box-shadow: 0 8px 24px rgba(116, 84, 141, .22);
        }

        .resume-status-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 17px 18px;
          border: 1px solid #eadff1;
          background: rgba(255,255,255,.8);
          border-radius: 18px;
          margin-bottom: 18px;
        }

        .status-icon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #f1e8f6;
          color: #79588f;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .status-content {
          min-width: 190px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .status-content strong {
          font-size: 14px;
        }

        .status-content span {
          font-size: 12px;
          color: #81798a;
        }

        .status-progress {
          margin-left: auto;
          width: 220px;
          height: 8px;
          overflow: hidden;
          background: #eee7f1;
          border-radius: 999px;
        }

        .progress-bar {
          height: 100%;
          background: #a989c8;
          border-radius: inherit;
          transition: width .35s ease;
        }

        .resume-tabs {
          display: flex;
          gap: 6px;
          padding: 5px;
          background: #f5f0f8;
          border-radius: 14px;
          width: fit-content;
          margin-bottom: 20px;
        }

        .resume-tab {
          border: 0;
          background: transparent;
          color: #7c7385;
          padding: 10px 14px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .resume-tab.active {
          background: white;
          color: #4c385b;
          box-shadow: 0 3px 12px rgba(75, 54, 91, .08);
        }

        .resume-content {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .upload-card,
        .builder-promo,
        .resume-overview,
        .editor-section,
        .source-card,
        .latex-card,
        .preview-header {
          border: 1px solid #eadff1;
          background: rgba(255,255,255,.88);
          border-radius: 20px;
        }

        .upload-card {
          padding: 25px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .upload-icon,
        .builder-promo-icon {
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: #eee2f5;
          color: #74548d;
        }

        .upload-content {
          flex: 1;
        }

        .upload-content h2,
        .builder-promo h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -.025em;
        }

        .upload-content p {
          margin: 7px 0 17px;
          color: #81798a;
          font-size: 13px;
        }

        .upload-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .selected-file {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 13px;
          background: #f8f4fa;
          border: 1px solid #e8deee;
          border-radius: 12px;
          margin-bottom: 13px;
        }

        .selected-file > svg {
          color: #76578d;
        }

        .selected-file > div {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .selected-file strong {
          font-size: 13px;
          word-break: break-word;
        }

        .selected-file span {
          font-size: 11px;
          color: #8d8594;
        }

        .selected-file button {
          border: 0;
          background: transparent;
          color: #8a8191;
          cursor: pointer;
        }

        .builder-promo {
          padding: 26px;
          display: flex;
          gap: 18px;
          align-items: flex-start;
          background: linear-gradient(
            135deg,
            #fbf8fd,
            #f1e8f6
          );
        }

        .builder-promo p {
          max-width: 700px;
          color: #736b7c;
          line-height: 1.65;
          font-size: 14px;
          margin: 10px 0 17px;
        }

        .resume-overview {
          padding: 24px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .overview-stat {
          padding: 15px;
          background: #faf7fb;
          border: 1px solid #eee6f1;
          border-radius: 14px;
        }

        .overview-stat span {
          display: block;
          font-size: 11px;
          color: #8a8191;
          margin-bottom: 6px;
        }

        .overview-stat strong {
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .overview-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .overview-heading h2 {
          margin: 0;
          font-size: 18px;
        }

        .overview-heading p {
          margin: 5px 0 0;
          color: #81798a;
          font-size: 13px;
        }

        .summary-box {
          background: #faf7fb;
          border: 1px solid #eee6f1;
          border-radius: 14px;
          padding: 16px;
          color: #5e5667;
          line-height: 1.7;
          font-size: 14px;
          white-space: pre-wrap;
        }

        .chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .chip {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f0e7f5;
          color: #624a73;
          font-size: 12px;
          font-weight: 700;
        }

        .preview-header {
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .preview-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .preview-header p {
          margin: 7px 0 0;
          color: #81798a;
          font-size: 13px;
        }

        .latex-card {
          overflow: hidden;
        }

        .latex-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border-bottom: 1px solid #eadff1;
          font-size: 12px;
          font-weight: 800;
          color: #675673;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .icon-button {
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 9px;
          background: #f1e8f5;
          color: #684b79;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .latex-editor {
          width: 100%;
          min-height: 600px;
          resize: vertical;
          border: 0;
          outline: 0;
          padding: 20px;
          font-family: "SFMono-Regular", Consolas, monospace;
          font-size: 12px;
          line-height: 1.65;
          background: #17131d;
          color: #efe8f5;
        }

        .latex-note {
          padding: 11px 15px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #81798a;
          font-size: 11px;
          background: #faf7fb;
        }

        .source-card {
          overflow: hidden;
        }

        .source-header {
          padding: 22px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          border-bottom: 1px solid #eee6f1;
        }

        .source-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .source-header p {
          color: #81798a;
          font-size: 13px;
          line-height: 1.6;
          max-width: 700px;
        }

        .raw-text {
          max-height: 250px;
          overflow: auto;
          padding: 20px;
          white-space: pre-wrap;
          font-family: "SFMono-Regular", Consolas, monospace;
          font-size: 12px;
          line-height: 1.7;
          color: #5d5564;
          background: #fcfbfd;
        }

        .raw-text.expanded {
          max-height: 800px;
        }

        .editor-section {
          overflow: hidden;
        }

        .editor-section-header {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 17px 19px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          text-align: left;
        }

        .editor-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #4d3b5a;
          font-size: 14px;
          font-weight: 800;
        }

        .editor-section-title svg {
          color: #806097;
        }

        .editor-body {
          padding: 0 19px 20px;
          border-top: 1px solid #eee6f1;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 14px;
          padding-top: 18px;
        }

        .form-grid.three {
          grid-template-columns: repeat(3, minmax(0,1fr));
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-size: 11px;
          color: #7e7586;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .field input,
        .field textarea,
        .array-item input,
        .array-item textarea {
          width: 100%;
          border: 1px solid #e4d9e9;
          outline: 0;
          background: white;
          color: #33283b;
          border-radius: 10px;
          padding: 11px 12px;
          font: inherit;
          font-size: 13px;
        }

        .field textarea,
        .array-item textarea {
          min-height: 100px;
          resize: vertical;
          line-height: 1.55;
        }

        .field input:focus,
        .field textarea:focus,
        .array-item input:focus,
        .array-item textarea:focus {
          border-color: #b696cc;
          box-shadow: 0 0 0 3px rgba(182,150,204,.12);
        }

        .array-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 18px;
        }

        .array-item {
          border: 1px solid #eee6f1;
          background: #fcfbfd;
          border-radius: 14px;
          padding: 14px;
          position: relative;
        }

        .array-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 11px;
        }

        .array-item-header strong {
          font-size: 12px;
          color: #5b4967;
        }

        .danger-button {
          width: 33px;
          height: 33px;
          border: 0;
          border-radius: 9px;
          background: #faeef0;
          color: #9b5963;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .add-button {
          margin-top: 12px;
          border: 1px dashed #cbb7d5;
          background: #fbf8fc;
          color: #735687;
          border-radius: 10px;
          padding: 10px 13px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .editor-footer {
          position: sticky;
          bottom: 15px;
          z-index: 5;
          padding: 13px;
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(16px);
          border: 1px solid #eadff1;
          border-radius: 16px;
          box-shadow: 0 12px 35px rgba(47, 29, 57, .1);
        }

        .resume-loading,
        .resume-empty {
          min-height: 70vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
          color: #766d80;
          text-align: center;
          padding: 30px;
        }

        .resume-empty h2 {
          color: #35283e;
          margin: 0;
        }

        .resume-empty p {
          max-width: 520px;
          line-height: 1.6;
        }

        .empty-icon {
          width: 70px;
          height: 70px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          background: #eee4f4;
          color: #76558b;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .message.error {
          background: #fbefef;
          border: 1px solid #f1d8da;
          color: #8b4d55;
        }

        .message.success {
          background: #eff8f3;
          border: 1px solid #d5ecdf;
          color: #3d7455;
        }

        .message button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .spin {
          animation: resumeSpin 1s linear infinite;
        }

        @keyframes resumeSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .resume-page {
            padding: 20px;
          }

          .resume-header {
            flex-direction: column;
          }

          .overview-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .form-grid.three {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .status-progress {
            width: 150px;
          }
        }

        @media (max-width: 640px) {
          .resume-page {
            padding: 14px;
          }

          .resume-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .resume-tab {
            white-space: nowrap;
          }

          .upload-card,
          .builder-promo {
            flex-direction: column;
          }

          .overview-grid,
          .form-grid,
          .form-grid.three {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .resume-status-card {
            flex-wrap: wrap;
          }

          .status-progress {
            width: 100%;
            margin-left: 0;
          }

          .preview-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .editor-footer {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </PageShell>
  );
}

/* =========================================================
   PAGE SHELL
========================================================= */

function PageShell({
  children,
}) {
  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "linear-gradient(135deg,#fbf9fc 0%,#f5eef9 48%,#fbf9fc 100%)",
      }}
    >
      {children}
    </main>
  );
}

/* =========================================================
   TAB
========================================================= */

function Tab({
  active,
  onClick,
  icon,
  label,
}) {
  return (
    <button
      className={
        active
          ? "resume-tab active"
          : "resume-tab"
      }
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function Message({
  type,
  message,
  onClose,
}) {
  return (
    <div
      className={`message ${type}`}
    >
      {type ===
      "error" ? (
        <AlertCircle
          size={17}
        />
      ) : (
        <CheckCircle2
          size={17}
        />
      )}

      <span>
        {message}
      </span>

      <button
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function ResumeOverview({
  resume,
  onEdit,
}) {
  return (
    <section className="resume-overview">

      <div className="overview-heading">
        <div>
          <h2>
            Resume intelligence
          </h2>

          <p>
            Structured information extracted
            from your resume and available for
            other ENGVIVA features.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={onEdit}
        >
          <Edit3 size={16} />
          Edit
        </button>
      </div>

      <div className="overview-grid">

        <Stat
          label="Skills"
          value={
            safeArray(
              resume.skills
            ).length
          }
        />

        <Stat
          label="Experience"
          value={
            safeArray(
              resume.experience
            ).length
          }
        />

        <Stat
          label="Education"
          value={
            safeArray(
              resume.education
            ).length
          }
        />

        <Stat
          label="Projects"
          value={
            safeArray(
              resume.projects
            ).length
          }
        />
      </div>

      {resume.personal
        ?.fullName && (
        <div className="overview-heading">
          <div>
            <h2>
              {resume.personal.fullName}
            </h2>

            <p>
              {resume.personal.email ||
                "No email added"}
            </p>
          </div>
        </div>
      )}

      {resume.summary && (
        <>
          <div
            className="eyebrow"
            style={{
              marginTop: 18,
            }}
          >
            SUMMARY
          </div>

          <div className="summary-box">
            {resume.summary}
          </div>
        </>
      )}

      {safeArray(
        resume.skills
      ).length > 0 && (
        <>
          <div
            className="eyebrow"
            style={{
              marginTop: 20,
            }}
          >
            SKILLS
          </div>

          <div className="chip-list">
            {resume.skills.map(
              (skill, index) => (
                <span
                  className="chip"
                  key={index}
                >
                  {typeof skill ===
                  "string"
                    ? skill
                    : skill?.name ||
                      skill?.skill ||
                      ""}
                </span>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
}) {
  return (
    <div className="overview-stat">
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
   EDITOR
========================================================= */

function ResumeEditor({
  resume,
  expandedSections,
  toggleSection,
  updatePersonal,
  updateField,
  addItem,
  updateArrayItem,
  removeArrayItem,
}) {
  return (
    <>

      {/* PERSONAL */}

      <EditorSection
        title="Personal information"
        icon={
          <UserRound
            size={18}
          />
        }
        open={
          expandedSections.personal
        }
        onToggle={() =>
          toggleSection(
            "personal"
          )
        }
      >
        <div className="form-grid">

          <Field
            label="Full name"
            value={
              resume.personal
                ?.fullName
            }
            onChange={(value) =>
              updatePersonal(
                "fullName",
                value
              )
            }
          />

          <Field
            label="Email"
            value={
              resume.personal
                ?.email
            }
            onChange={(value) =>
              updatePersonal(
                "email",
                value
              )
            }
          />

          <Field
            label="Phone"
            value={
              resume.personal
                ?.phone
            }
            onChange={(value) =>
              updatePersonal(
                "phone",
                value
              )
            }
          />

          <Field
            label="Location"
            value={
              resume.personal
                ?.location
            }
            onChange={(value) =>
              updatePersonal(
                "location",
                value
              )
            }
          />

          <Field
            label="Website"
            value={
              resume.personal
                ?.website
            }
            onChange={(value) =>
              updatePersonal(
                "website",
                value
              )
            }
          />

          <Field
            label="LinkedIn"
            value={
              resume.personal
                ?.linkedin
            }
            onChange={(value) =>
              updatePersonal(
                "linkedin",
                value
              )
            }
          />

          <Field
            label="GitHub"
            value={
              resume.personal
                ?.github
            }
            onChange={(value) =>
              updatePersonal(
                "github",
                value
              )
            }
          />
        </div>
      </EditorSection>

      {/* SUMMARY */}

      <EditorSection
        title="Professional summary"
        icon={
          <FileText
            size={18}
          />
        }
        open={
          expandedSections.summary
        }
        onToggle={() =>
          toggleSection(
            "summary"
          )
        }
      >
        <div
          className="form-grid"
        >
          <Field
            full
            textarea
            label="Summary"
            value={
              resume.summary
            }
            onChange={(value) =>
              updateField(
                "summary",
                value
              )
            }
          />
        </div>
      </EditorSection>

      {/* SKILLS */}

      <EditorSection
        title="Skills"
        icon={
          <Code2 size={18} />
        }
        open={
          expandedSections.skills
        }
        onToggle={() =>
          toggleSection(
            "skills"
          )
        }
      >
        <SkillEditor
          skills={
            resume.skills
          }
          onChange={(skills) =>
            updateField(
              "skills",
              skills
            )
          }
        />
      </EditorSection>

      {/* EXPERIENCE */}

      <EditorSection
        title="Experience"
        icon={
          <BriefcaseBusiness
            size={18}
          />
        }
        open={
          expandedSections.experience
        }
        onToggle={() =>
          toggleSection(
            "experience"
          )
        }
      >
        <ExperienceEditor
          items={
            resume.experience
          }
          addItem={
            addItem
          }
          updateArrayItem={
            updateArrayItem
          }
          removeArrayItem={
            removeArrayItem
          }
        />
      </EditorSection>

      {/* EDUCATION */}

      <EditorSection
        title="Education"
        icon={
          <GraduationCap
            size={18}
          />
        }
        open={
          expandedSections.education
        }
        onToggle={() =>
          toggleSection(
            "education"
          )
        }
      >
        <EducationEditor
          items={
            resume.education
          }
          addItem={
            addItem
          }
          updateArrayItem={
            updateArrayItem
          }
          removeArrayItem={
            removeArrayItem
          }
        />
      </EditorSection>

      {/* PROJECTS */}

      <EditorSection
        title="Projects"
        icon={
          <Code2 size={18} />
        }
        open={
          expandedSections.projects
        }
        onToggle={() =>
          toggleSection(
            "projects"
          )
        }
      >
        <ProjectsEditor
          items={
            resume.projects
          }
          addItem={
            addItem
          }
          updateArrayItem={
            updateArrayItem
          }
          removeArrayItem={
            removeArrayItem
          }
        />
      </EditorSection>

      {/* CERTIFICATIONS */}

      <EditorSection
        title="Certifications"
        icon={
          <Award size={18} />
        }
        open={
          expandedSections.certifications
        }
        onToggle={() =>
          toggleSection(
            "certifications"
          )
        }
      >
        <SimpleListEditor
          items={
            resume.certifications
          }
          field="certifications"
          addItem={
            addItem
          }
          updateArrayItem={
            updateArrayItem
          }
          removeArrayItem={
            removeArrayItem
          }
        />
      </EditorSection>

      {/* ACHIEVEMENTS */}

      <EditorSection
        title="Achievements"
        icon={
          <Award size={18} />
        }
        open={
          expandedSections.achievements
        }
        onToggle={() =>
          toggleSection(
            "achievements"
          )
        }
      >
        <SimpleListEditor
          items={
            resume.achievements
          }
          field="achievements"
          addItem={
            addItem
          }
          updateArrayItem={
            updateArrayItem
          }
          removeArrayItem={
            removeArrayItem
          }
        />
      </EditorSection>
    </>
  );
}

/* =========================================================
   EDITOR SECTION
========================================================= */

function EditorSection({
  title,
  icon,
  open,
  onToggle,
  children,
}) {
  return (
    <section className="editor-section">

      <button
        className="editor-section-header"
        onClick={onToggle}
      >
        <span className="editor-section-title">
          {icon}
          {title}
        </span>

        {open ? (
          <ChevronUp
            size={17}
          />
        ) : (
          <ChevronDown
            size={17}
          />
        )}
      </button>

      {open && (
        <div className="editor-body">
          {children}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  textarea = false,
  full = false,
  placeholder = "",
}) {
  return (
    <div
      className={
        full
          ? "field full"
          : "field"
      }
    >
      <label>
        {label}
      </label>

      {textarea ? (
        <textarea
          value={
            value || ""
          }
          placeholder={
            placeholder
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
        />
      ) : (
        <input
          value={
            value || ""
          }
          placeholder={
            placeholder
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SKILLS
========================================================= */

function SkillEditor({
  skills,
  onChange,
}) {
  const [value, setValue] =
    useState("");

  const addSkill = () => {
    const next =
      clean(value);

    if (!next) return;

    if (
      skills.some(
        (skill) =>
          String(
            typeof skill ===
              "string"
              ? skill
              : skill?.name ||
                  skill?.skill ||
                  ""
          ).toLowerCase() ===
          next.toLowerCase()
      )
    ) {
      setValue("");
      return;
    }

    onChange([
      ...skills,
      next,
    ]);

    setValue("");
  };

  return (
    <div
      style={{
        paddingTop: 18,
      }}
    >
      <div className="chip-list">
        {safeArray(
          skills
        ).map(
          (skill, index) => {
            const label =
              typeof skill ===
              "string"
                ? skill
                : skill?.name ||
                  skill?.skill ||
                  "";

            return (
              <span
                className="chip"
                key={index}
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 6,
                }}
              >
                {label}

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      skills.filter(
                        (
                          _,
                          skillIndex
                        ) =>
                          skillIndex !==
                          index
                      )
                    )
                  }
                  style={{
                    border: 0,
                    background:
                      "transparent",
                    cursor:
                      "pointer",
                    color:
                      "inherit",
                    padding: 0,
                    display:
                      "grid",
                    placeItems:
                      "center",
                  }}
                >
                  <X
                    size={12}
                  />
                </button>
              </span>
            );
          }
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          maxWidth: 500,
        }}
      >
        <input
          style={{
            flex: 1,
            border:
              "1px solid #e4d9e9",
            borderRadius:
              10,
            padding:
              "11px 12px",
            outline: 0,
          }}
          value={value}
          placeholder="e.g. React, Python, SQL"
          onChange={(event) =>
            setValue(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key ===
              "Enter"
            ) {
              event.preventDefault();
              addSkill();
            }
          }}
        />

        <button
          className="add-button"
          onClick={
            addSkill
          }
        >
          <Plus
            size={15}
          />

          Add
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   EXPERIENCE
========================================================= */

function ExperienceEditor({
  items,
  addItem,
  updateArrayItem,
  removeArrayItem,
}) {
  return (
    <div className="array-list">

      {safeArray(
        items
      ).map(
        (item, index) => (
          <div
            className="array-item"
            key={index}
          >
            <div className="array-item-header">
              <strong>
                Experience #
                {index + 1}
              </strong>

              <button
                className="danger-button"
                onClick={() =>
                  removeArrayItem(
                    "experience",
                    index
                  )
                }
              >
                <Trash2
                  size={15}
                />
              </button>
            </div>

            <div className="form-grid">

              <Field
                label="Job title"
                value={
                  item.title
                }
                onChange={(value) =>
                  updateArrayItem(
                    "experience",
                    index,
                    "title",
                    value
                  )
                }
              />

              <Field
                label="Company"
                value={
                  item.company
                }
                onChange={(value) =>
                  updateArrayItem(
                    "experience",
                    index,
                    "company",
                    value
                  )
                }
              />

              <Field
                label="Start date"
                value={
                  item.startDate
                }
                onChange={(value) =>
                  updateArrayItem(
                    "experience",
                    index,
                    "startDate",
                    value
                  )
                }
              />

              <Field
                label="End date"
                value={
                  item.endDate
                }
                onChange={(value) =>
                  updateArrayItem(
                    "experience",
                    index,
                    "endDate",
                    value
                  )
                }
              />

              <Field
                full
                textarea
                label="Description"
                value={
                  item.description
                }
                onChange={(value) =>
                  updateArrayItem(
                    "experience",
                    index,
                    "description",
                    value
                  )
                }
              />
            </div>
          </div>
        )
      )}

      <button
        className="add-button"
        onClick={() =>
          addItem(
            "experience",
            {
              title: "",
              company: "",
              startDate: "",
              endDate: "",
              description: "",
            }
          )
        }
      >
        <Plus size={15} />
        Add experience
      </button>
    </div>
  );
}

/* =========================================================
   EDUCATION
========================================================= */

function EducationEditor({
  items,
  addItem,
  updateArrayItem,
  removeArrayItem,
}) {
  return (
    <div className="array-list">

      {safeArray(
        items
      ).map(
        (item, index) => (
          <div
            className="array-item"
            key={index}
          >
            <div className="array-item-header">
              <strong>
                Education #
                {index + 1}
              </strong>

              <button
                className="danger-button"
                onClick={() =>
                  removeArrayItem(
                    "education",
                    index
                  )
                }
              >
                <Trash2
                  size={15}
                />
              </button>
            </div>

            <div className="form-grid">

              <Field
                label="Degree"
                value={
                  item.degree
                }
                onChange={(value) =>
                  updateArrayItem(
                    "education",
                    index,
                    "degree",
                    value
                  )
                }
              />

              <Field
                label="Institution"
                value={
                  item.institution ||
                  item.school
                }
                onChange={(value) =>
                  updateArrayItem(
                    "education",
                    index,
                    "institution",
                    value
                  )
                }
              />

              <Field
                label="Start date"
                value={
                  item.startDate
                }
                onChange={(value) =>
                  updateArrayItem(
                    "education",
                    index,
                    "startDate",
                    value
                  )
                }
              />

              <Field
                label="End date"
                value={
                  item.endDate
                }
                onChange={(value) =>
                  updateArrayItem(
                    "education",
                    index,
                    "endDate",
                    value
                  )
                }
              />

              <Field
                label="Grade"
                value={
                  item.grade
                }
                onChange={(value) =>
                  updateArrayItem(
                    "education",
                    index,
                    "grade",
                    value
                  )
                }
              />
            </div>
          </div>
        )
      )}

      <button
        className="add-button"
        onClick={() =>
          addItem(
            "education",
            {
              degree: "",
              institution: "",
              startDate: "",
              endDate: "",
              grade: "",
            }
          )
        }
      >
        <Plus size={15} />
        Add education
      </button>
    </div>
  );
}

/* =========================================================
   PROJECTS
========================================================= */

function ProjectsEditor({
  items,
  addItem,
  updateArrayItem,
  removeArrayItem,
}) {
  return (
    <div className="array-list">

      {safeArray(
        items
      ).map(
        (item, index) => (
          <div
            className="array-item"
            key={index}
          >
            <div className="array-item-header">
              <strong>
                Project #
                {index + 1}
              </strong>

              <button
                className="danger-button"
                onClick={() =>
                  removeArrayItem(
                    "projects",
                    index
                  )
                }
              >
                <Trash2
                  size={15}
                />
              </button>
            </div>

            <div className="form-grid">

              <Field
                label="Project name"
                value={
                  item.name ||
                  item.title
                }
                onChange={(value) =>
                  updateArrayItem(
                    "projects",
                    index,
                    "name",
                    value
                  )
                }
              />

              <Field
                label="Technologies"
                value={
                  item.technologies ||
                  item.techStack
                }
                onChange={(value) =>
                  updateArrayItem(
                    "projects",
                    index,
                    "technologies",
                    value
                  )
                }
              />

              <Field
                label="URL"
                value={
                  item.url
                }
                onChange={(value) =>
                  updateArrayItem(
                    "projects",
                    index,
                    "url",
                    value
                  )
                }
              />

              <Field
                full
                textarea
                label="Description"
                value={
                  item.description
                }
                onChange={(value) =>
                  updateArrayItem(
                    "projects",
                    index,
                    "description",
                    value
                  )
                }
              />
            </div>
          </div>
        )
      )}

      <button
        className="add-button"
        onClick={() =>
          addItem(
            "projects",
            {
              name: "",
              technologies: "",
              url: "",
              description: "",
            }
          )
        }
      >
        <Plus size={15} />
        Add project
      </button>
    </div>
  );
}

/* =========================================================
   SIMPLE LIST
========================================================= */

function SimpleListEditor({
  items,
  field,
  addItem,
  updateArrayItem,
  removeArrayItem,
}) {
  return (
    <div className="array-list">

      {safeArray(
        items
      ).map(
        (item, index) => {
          const value =
            typeof item ===
            "string"
              ? item
              : item?.name ||
                item?.title ||
                item?.text ||
                "";

          return (
            <div
              className="array-item"
              key={index}
            >
              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                }}
              >
                <input
                  value={
                    value
                  }
                  onChange={(event) =>
                    updateArrayItem(
                      field,
                      index,
                      "name",
                      event.target.value
                    )
                  }
                />

                <button
                  className="danger-button"
                  onClick={() =>
                    removeArrayItem(
                      field,
                      index
                    )
                  }
                >
                  <Trash2
                    size={15}
                  />
                </button>
              </div>
            </div>
          );
        }
      )}

      <button
        className="add-button"
        onClick={() =>
          addItem(
            field,
            {
              name: "",
            }
          )
        }
      >
        <Plus size={15} />
        Add item
      </button>
    </div>
  );
}

/* =========================================================
   BUILDER MODAL
========================================================= */

function BuilderModal({
  resume,
  setResume,
  onClose,
  onGenerate,
}) {
  const updatePersonal =
    (field, value) => {
      setResume(
        (previous) => ({
          ...previous,

          personal: {
            ...previous.personal,
            [field]: value,
          },

          source: "builder",

          status: "draft",
        })
      );
    };

  const updateSummary =
    (value) => {
      setResume(
        (previous) => ({
          ...previous,
          summary: value,
          source: "builder",
          status: "draft",
        })
      );
    };

  const updateSkills =
    (value) => {
      setResume(
        (previous) => ({
          ...previous,
          skills:
            value
              .split(",")
              .map(
                (item) =>
                  item.trim()
              )
              .filter(
                Boolean
              ),
          source: "builder",
          status: "draft",
        })
      );
    };

  return (
    <div
      style={{
        position:
          "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "rgba(35,25,42,.48)",
        backdropFilter:
          "blur(8px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width:
            "min(760px,100%)",
          maxHeight:
            "90vh",
          overflow:
            "auto",
          background:
            "white",
          borderRadius:
            22,
          border:
            "1px solid #eadff1",
          boxShadow:
            "0 30px 90px rgba(30,20,40,.28)",
        }}
      >

        <div
          style={{
            padding:
              "20px 22px",
            borderBottom:
              "1px solid #eee6f1",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 15,
          }}
        >
          <div>
            <div className="eyebrow">
              ENGVIVA AI
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 24,
                letterSpacing:
                  "-.035em",
              }}
            >
              Create your resume
            </h2>

            <p
              style={{
                color:
                  "#81798a",
                fontSize: 13,
                lineHeight:
                  1.6,
                margin:
                  "8px 0 0",
              }}
            >
              Add your information.
              ENGVIVA will use it to
              generate an ATS-friendly
              LaTeX resume.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: 22,
            display:
              "flex",
            flexDirection:
              "column",
            gap: 17,
          }}
        >

          <div className="form-grid">

            <Field
              label="Full name"
              value={
                resume.personal
                  ?.fullName
              }
              onChange={(value) =>
                updatePersonal(
                  "fullName",
                  value
                )
              }
            />

            <Field
              label="Email"
              value={
                resume.personal
                  ?.email
              }
              onChange={(value) =>
                updatePersonal(
                  "email",
                  value
                )
              }
            />

            <Field
              label="Phone"
              value={
                resume.personal
                  ?.phone
              }
              onChange={(value) =>
                updatePersonal(
                  "phone",
                  value
                )
              }
            />

            <Field
              label="Location"
              value={
                resume.personal
                  ?.location
              }
              onChange={(value) =>
                updatePersonal(
                  "location",
                  value
                )
              }
            />

            <Field
              label="LinkedIn"
              value={
                resume.personal
                  ?.linkedin
              }
              onChange={(value) =>
                updatePersonal(
                  "linkedin",
                  value
                )
              }
            />

            <Field
              label="GitHub"
              value={
                resume.personal
                  ?.github
              }
              onChange={(value) =>
                updatePersonal(
                  "github",
                  value
                )
              }
            />

            <Field
              full
              textarea
              label="Professional summary"
              value={
                resume.summary
              }
              onChange={
                updateSummary
              }
            />

            <Field
              full
              label="Skills"
              value={
                safeArray(
                  resume.skills
                ).join(", ")
              }
              placeholder="React, Node.js, Python, SQL, Firebase"
              onChange={
                updateSkills
              }
            />
          </div>

          <div
            style={{
              padding:
                "13px 14px",
              borderRadius:
                12,
              background:
                "#f7f1fa",
              color:
                "#685674",
              fontSize: 12,
              lineHeight:
                1.55,
              display:
                "flex",
              gap: 8,
            }}
          >
            <Sparkles
              size={16}
            />

            <span>
              You can add detailed
              experience, education,
              projects and certifications
              after opening the editor.
            </span>
          </div>
        </div>

        <div
          style={{
            padding:
              "15px 22px",
            borderTop:
              "1px solid #eee6f1",
            display:
              "flex",
            justifyContent:
              "flex-end",
            gap: 9,
          }}
        >
          <button
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="ai-button"
            onClick={
              onGenerate
            }
          >
            <Sparkles
              size={17}
            />

            Generate with AI
          </button>
        </div>
      </div>
    </div>
  );
}