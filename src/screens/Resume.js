import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  auth,
} from "../firebase";

/*
 * =========================================================
 * ENGVIVA — RESUME
 *
 * Backend contract:
 *
 * GET  /api/resume-ai/health
 * POST /api/resume-ai/enhance
 * POST /api/resume-ai/summary
 *
 * IMPORTANT:
 * - Groq API key NEVER belongs in frontend.
 * - Authentication token is taken from Firebase Auth.
 * - Resume AI calls go through the backend.
 * =========================================================
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const RESUME_AI_BASE = `${API_BASE_URL}/api/resume-ai`;

const STORAGE_KEY = "engviva_resume_workspace_v1";

/* =========================================================
   HELPERS
========================================================= */

function safeString(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value);
}

function cleanText(value) {
  return safeString(value).trim();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  return [value];
}

function getErrorMessage(error) {
  if (
    error &&
    typeof error === "object"
  ) {
    if (error.message) {
      return String(error.message);
    }
  }

  return "Something went wrong. Please try again.";
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/*
 * Convert AI arrays into readable text.
 */
function formatArrayItem(item) {
  if (
    item === undefined ||
    item === null
  ) {
    return "";
  }

  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return String(item);
  }

  if (
    typeof item === "object"
  ) {
    const preferredKeys = [
      "title",
      "name",
      "role",
      "position",
      "company",
      "description",
      "details",
      "text",
      "content",
      "degree",
      "school",
      "institution",
    ];

    const parts = [];

    for (
      const key of preferredKeys
    ) {
      if (
        item[key] !== undefined &&
        item[key] !== null &&
        String(item[key]).trim()
      ) {
        parts.push(
          String(item[key]).trim()
        );
      }
    }

    if (parts.length > 0) {
      return parts.join(" — ");
    }

    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }

  return String(item);
}

/*
 * Turn structured AI result into useful
 * plain text for preview / download.
 */
function buildResumeDocument(result) {
  if (!result) {
    return "";
  }

  const lines = [];

  if (result.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push("");
    lines.push(
      formatArrayItem(result.summary)
    );
    lines.push("");
  }

  const sections = [
    ["SKILLS", result.skills],
    ["EXPERIENCE", result.experience],
    ["EDUCATION", result.education],
    ["PROJECTS", result.projects],
    ["CERTIFICATIONS", result.certifications],
    ["ACHIEVEMENTS", result.achievements],
  ];

  for (
    const [title, values] of sections
  ) {
    const array = asArray(values)
      .map(formatArrayItem)
      .filter(Boolean);

    if (array.length === 0) {
      continue;
    }

    lines.push(title);
    lines.push("");

    array.forEach((item) => {
      lines.push(`• ${item}`);
    });

    lines.push("");
  }

  return lines.join("\n").trim();
}

/*
 * Escape text for a basic LaTeX document.
 */
function escapeLatex(value) {
  return safeString(value)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}$&#_%])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/*
 * Generate a conservative LaTeX document from
 * information returned by the backend.
 *
 * This does NOT fabricate information.
 */
function buildLatexResume({
  result,
  sourceText,
}) {
  const r = result || {};

  const summary =
    cleanText(r.summary);

  const skills = asArray(r.skills)
    .map(formatArrayItem)
    .filter(Boolean);

  const experience = asArray(
    r.experience
  )
    .map(formatArrayItem)
    .filter(Boolean);

  const education = asArray(
    r.education
  )
    .map(formatArrayItem)
    .filter(Boolean);

  const projects = asArray(
    r.projects
  )
    .map(formatArrayItem)
    .filter(Boolean);

  const certifications = asArray(
    r.certifications
  )
    .map(formatArrayItem)
    .filter(Boolean);

  const achievements = asArray(
    r.achievements
  )
    .map(formatArrayItem)
    .filter(Boolean);

  const source =
    cleanText(sourceText);

  /*
   * We intentionally don't try to extract a person's
   * name from arbitrary source text automatically.
   */
  const documentSections = [];

  if (summary) {
    documentSections.push(`
\\section*{Professional Summary}
${escapeLatex(summary)}
`);
  }

  if (skills.length) {
    documentSections.push(`
\\section*{Skills}
${skills
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  if (experience.length) {
    documentSections.push(`
\\section*{Experience}
${experience
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  if (education.length) {
    documentSections.push(`
\\section*{Education}
${education
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  if (projects.length) {
    documentSections.push(`
\\section*{Projects}
${projects
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  if (certifications.length) {
    documentSections.push(`
\\section*{Certifications}
${certifications
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  if (achievements.length) {
    documentSections.push(`
\\section*{Achievements}
${achievements
  .map(
    (item) =>
      `\\item ${escapeLatex(item)}`
  )
  .join("\n")}
`);
  }

  /*
   * If AI hasn't been run, preserve the original
   * resume text rather than creating fake structure.
   */
  if (
    documentSections.length === 0 &&
    source
  ) {
    documentSections.push(`
\\section*{Resume}
\\begin{verbatim}
${source.replace(
  /\\end\{verbatim\}/g,
  ""
)}
\\end{verbatim}
`);
  }

  return `\\documentclass[11pt,a4paper]{article}

\\usepackage[margin=0.7in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\setlist[itemize]{
  leftmargin=*,
  itemsep=2pt,
  topsep=2pt
}

\\begin{document}

${documentSections
  .map((section) => {
    /*
     * Add itemize around list-style sections.
     */
    return section.replace(
      /((?:\\\\item .*\\n?)+)/g,
      "\\\\begin{itemize}\\n$1\\\\end{itemize}\\n"
    );
  })
  .join("\n")}

\\end{document}
`;
}

/* =========================================================
   API
========================================================= */

async function getFirebaseToken() {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error(
      "You are not signed in. Please sign in before using Resume AI."
    );
  }

  return user.getIdToken();
}

async function apiRequest(
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
    Authorization:
      `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response =
    await fetch(
      `${RESUME_AI_BASE}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

  const raw =
    await response.text();

  const data =
    safeJsonParse(raw);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      raw ||
      `Request failed (${response.status})`;

    throw new Error(
      message
    );
  }

  if (!data) {
    throw new Error(
      "Backend returned an invalid response."
    );
  }

  if (
    data.success === false
  ) {
    throw new Error(
      data?.error?.message ||
        "Resume AI request failed."
    );
  }

  return data;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Resume() {
  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(null);

  const [
    resumeText,
    setResumeText,
  ] = useState("");

  const [
    targetRole,
    setTargetRole,
  ] = useState("");

  const [
    targetCompany,
    setTargetCompany,
  ] = useState("");

  const [
    enhancedResume,
    setEnhancedResume,
  ] = useState(null);

  const [
    generatedSummary,
    setGeneratedSummary,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    isEnhancing,
    setIsEnhancing,
  ] = useState(false);

  const [
    isSummarizing,
    setIsSummarizing,
  ] = useState(false);

  const [
    isDownloading,
    setIsDownloading,
  ] = useState(false);

  const [
    backendStatus,
    setBackendStatus,
  ] = useState(
    "checking"
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  /* =======================================================
     RESTORE LOCAL WORKSPACE
  ======================================================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!saved) {
        return;
      }

      const data =
        safeJsonParse(saved);

      if (!data) {
        return;
      }

      if (
        typeof data.resumeText ===
        "string"
      ) {
        setResumeText(
          data.resumeText
        );
      }

      if (
        typeof data.targetRole ===
        "string"
      ) {
        setTargetRole(
          data.targetRole
        );
      }

      if (
        typeof data.targetCompany ===
        "string"
      ) {
        setTargetCompany(
          data.targetCompany
        );
      }

      if (
        data.enhancedResume
      ) {
        setEnhancedResume(
          data.enhancedResume
        );
      }

      if (
        typeof data.generatedSummary ===
        "string"
      ) {
        setGeneratedSummary(
          data.generatedSummary
        );
      }
    } catch {
      /*
       * Local storage failure must not
       * break the Resume screen.
       */
    }
  }, []);

  /* =======================================================
     AUTO SAVE WORKSPACE
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          resumeText,
          targetRole,
          targetCompany,
          enhancedResume,
          generatedSummary,
        })
      );
    } catch {
      /*
       * Ignore storage quota/browser errors.
       */
    }
  }, [
    resumeText,
    targetRole,
    targetCompany,
    enhancedResume,
    generatedSummary,
  ]);

  /* =======================================================
     HEALTH CHECK
  ======================================================= */

  const checkBackend =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `${RESUME_AI_BASE}/health`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            data?.success !== true
          ) {
            throw new Error(
              data?.error?.message ||
                "Resume AI backend unavailable."
            );
          }

          setBackendStatus(
            data.status ===
              "configured"
              ? "online"
              : data.status ||
                  "online"
          );
        } catch (err) {
          setBackendStatus(
            "offline"
          );
        }
      },
      []
    );

  useEffect(() => {
    checkBackend();
  }, [
    checkBackend,
  ]);

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  const handleFileChange =
    useCallback(
      async (event) => {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        setError("");
        setNotice("");
        setSelectedFile(file);

        /*
         * The current backend has no upload/OCR endpoint.
         *
         * TXT/MD/CSV/JSON can safely be read directly
         * in the browser.
         *
         * PDF/DOC/DOCX are intentionally NOT pretended
         * to be extracted here.
         */
        const name =
          file.name.toLowerCase();

        const browserReadable =
          name.endsWith(".txt") ||
          name.endsWith(".md") ||
          name.endsWith(".csv") ||
          name.endsWith(".json");

        if (!browserReadable) {
          setNotice(
            "This file is selected, but the current backend does not expose a document/OCR upload endpoint yet. Add the backend extractor before treating PDF/DOC/DOCX text as extracted."
          );

          return;
        }

        try {
          const text =
            await file.text();

          if (!cleanText(text)) {
            throw new Error(
              "The selected file contains no readable text."
            );
          }

          setResumeText(
            text
          );

          setNotice(
            `${file.name} loaded successfully.`
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err
            )
          );
        }
      },
      []
    );

  /* =======================================================
     ENHANCE
  ======================================================= */

  const handleEnhance =
    useCallback(
      async () => {
        setError("");
        setNotice("");

        const text =
          cleanText(
            resumeText
          );

        if (!text) {
          setError(
            "Paste or load your resume text first."
          );

          return;
        }

        if (
          text.length <
          30
        ) {
          setError(
            "The resume text is too short. Add more of your actual resume content."
          );

          return;
        }

        setIsEnhancing(
          true
        );

        try {
          const data =
            await apiRequest(
              "/enhance",
              {
                method: "POST",
                body: JSON.stringify({
                  resumeText:
                    text,
                  targetRole:
                    cleanText(
                      targetRole
                    ),
                  targetCompany:
                    cleanText(
                      targetCompany
                    ),
                }),
              }
            );

          if (!data?.result) {
            throw new Error(
              "Backend returned no enhanced resume."
            );
          }

          setEnhancedResume(
            data.result
          );

          setNotice(
            "Resume enhanced successfully using the backend Resume AI."
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err
            )
          );
        } finally {
          setIsEnhancing(
            false
          );
        }
      },
      [
        resumeText,
        targetRole,
        targetCompany,
      ]
    );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const handleSummary =
    useCallback(
      async () => {
        setError("");
        setNotice("");

        const text =
          cleanText(
            resumeText
          );

        if (!text) {
          setError(
            "Add resume text before generating a summary."
          );

          return;
        }

        setIsSummarizing(
          true
        );

        try {
          const data =
            await apiRequest(
              "/summary",
              {
                method: "POST",
                body: JSON.stringify({
                  resumeText:
                    text,
                  targetRole:
                    cleanText(
                      targetRole
                    ),
                }),
              }
            );

          const summary =
            cleanText(
              data?.summary
            );

          if (!summary) {
            throw new Error(
              "Backend returned an empty summary."
            );
          }

          setGeneratedSummary(
            summary
          );

          setNotice(
            "Professional summary generated."
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err
            )
          );
        } finally {
          setIsSummarizing(
            false
          );
        }
      },
      [
        resumeText,
        targetRole,
      ]
    );

  /* =======================================================
     DOWNLOAD TEXT
  ======================================================= */

  const downloadText =
    useCallback(
      (
        filename,
        content,
        mimeType
      ) => {
        const blob =
          new Blob(
            [content],
            {
              type:
                mimeType,
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          url;

        anchor.download =
          filename;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      },
      []
    );

  /* =======================================================
     DOWNLOAD RESUME
  ======================================================= */

  const handleDownloadText =
    useCallback(
      () => {
        setError("");

        const content =
          buildResumeDocument(
            enhancedResume
          ) ||
          cleanText(
            resumeText
          );

        if (!content) {
          setError(
            "There is no resume content to download."
          );

          return;
        }

        setIsDownloading(
          true
        );

        try {
          downloadText(
            "engviva-resume.txt",
            content,
            "text/plain;charset=utf-8"
          );

          setNotice(
            "Resume downloaded."
          );
        } finally {
          setIsDownloading(
            false
          );
        }
      },
      [
        enhancedResume,
        resumeText,
        downloadText,
      ]
    );

  /* =======================================================
     DOWNLOAD LATEX
  ======================================================= */

  const handleDownloadLatex =
    useCallback(
      () => {
        setError("");

        const content =
          buildLatexResume({
            result:
              enhancedResume,
            sourceText:
              resumeText,
          });

        if (
          !cleanText(
            content
          )
        ) {
          setError(
            "There is no resume content available for LaTeX."
          );

          return;
        }

        setIsDownloading(
          true
        );

        try {
          downloadText(
            "engviva-resume.tex",
            content,
            "application/x-tex;charset=utf-8"
          );

          setNotice(
            "LaTeX source downloaded."
          );
        } finally {
          setIsDownloading(
            false
          );
        }
      },
      [
        enhancedResume,
        resumeText,
        downloadText,
      ]
    );

  /* =======================================================
     CLEAR
  ======================================================= */

  const handleClear =
    useCallback(
      () => {
        setResumeText("");
        setTargetRole("");
        setTargetCompany("");
        setEnhancedResume(null);
        setGeneratedSummary("");
        setSelectedFile(null);
        setError("");
        setNotice("");

        try {
          localStorage.removeItem(
            STORAGE_KEY
          );
        } catch {
          // ignore
        }

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      },
      []
    );

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const documentPreview =
    useMemo(
      () =>
        buildResumeDocument(
          enhancedResume
        ) ||
        cleanText(
          resumeText
        ),
      [
        enhancedResume,
        resumeText,
      ]
    );

  const hasResume =
    Boolean(
      cleanText(
        resumeText
      )
    );

  const hasEnhanced =
    Boolean(
      enhancedResume
    );

  const statusLabel =
    backendStatus ===
    "configured"
      ? "AI ONLINE"
      : backendStatus ===
        "online"
      ? "BACKEND ONLINE"
      : backendStatus ===
        "checking"
      ? "CHECKING"
      : "OFFLINE";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#08070d] text-white">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08070d]/95 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              ← Dashboard
            </button>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Resume
              </h1>

              <p className="text-xs text-white/40">
                Build • Enhance • Prepare
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <span
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest ${
                backendStatus ===
                "configured"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : backendStatus ===
                    "offline"
                  ? "border-red-400/30 bg-red-400/10 text-red-300"
                  : "border-white/10 bg-white/5 text-white/50"
              }`}
            >
              {statusLabel}
            </span>

            <button
              type="button"
              onClick={
                checkBackend
              }
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white"
            >
              Refresh
            </button>

          </div>

        </div>

      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="mx-auto max-w-7xl px-5 py-8">

        {/* =================================================
            TITLE
        ================================================= */}

        <section className="mb-8">

          <div className="max-w-3xl">

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
              Resume Intelligence
            </p>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Turn your real experience
              <span className="text-purple-300">
                {" "}
                into a stronger resume.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-7 text-white/50">
              Upload or paste your existing
              resume content, choose a target
              role, and let the backend Resume AI
              improve clarity and ATS relevance
              without inventing your experience.
            </p>

          </div>

        </section>

        {/* =================================================
            NOTICES
        ================================================= */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
            <strong className="mr-2">
              Error:
            </strong>
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-2xl border border-purple-400/20 bg-purple-400/10 px-5 py-4 text-sm text-purple-100">
            {notice}
          </div>
        )}

        {/* =================================================
            GRID
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">

          {/* ===============================================
              INPUT
          =============================================== */}

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl">

            <div className="mb-5 flex items-start justify-between gap-4">

              <div>
                <h3 className="text-lg font-bold">
                  Your Resume
                </h3>

                <p className="mt-1 text-xs text-white/40">
                  Use your actual resume content.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="rounded-xl bg-purple-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-400"
              >
                Choose File
              </button>

            </div>

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

            {selectedFile && (
              <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/60">
                Selected:{" "}
                <span className="text-white">
                  {selectedFile.name}
                </span>
              </div>
            )}

            <textarea
              value={
                resumeText
              }
              onChange={(event) =>
                setResumeText(
                  event.target.value
                )
              }
              placeholder={`Paste your resume text here...

Example:

Rahul
Data Science Student

Skills
Python, C++, React, Firebase

Projects
...

Education
...

Experience
...`}
              className="min-h-[430px] w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-7 text-white outline-none placeholder:text-white/20 focus:border-purple-400/50"
            />

            <div className="mt-3 flex items-center justify-between text-[11px] text-white/30">

              <span>
                {resumeText.length.toLocaleString()} characters
              </span>

              <span>
                {hasResume
                  ? "Resume loaded"
                  : "Waiting for resume"}
              </span>

            </div>

          </section>

          {/* ===============================================
              TARGET
          =============================================== */}

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl">

            <div className="mb-6">

              <h3 className="text-lg font-bold">
                Target
              </h3>

              <p className="mt-1 text-xs text-white/40">
                Optional, but useful for tailoring.
              </p>

            </div>

            <div className="space-y-4">

              <div>
                <label className="mb-2 block text-xs font-semibold text-white/50">
                  Target Role
                </label>

                <input
                  value={
                    targetRole
                  }
                  onChange={(event) =>
                    setTargetRole(
                      event.target.value
                    )
                  }
                  placeholder="Software Engineer"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-purple-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-white/50">
                  Target Company
                </label>

                <input
                  value={
                    targetCompany
                  }
                  onChange={(event) =>
                    setTargetCompany(
                      event.target.value
                    )
                  }
                  placeholder="Google"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-purple-400/50"
                />
              </div>

            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  isEnhancing ||
                  !hasResume
                }
                onClick={
                  handleEnhance
                }
                className="rounded-2xl bg-purple-500 px-5 py-4 text-sm font-bold transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isEnhancing
                  ? "Enhancing..."
                  : "Enhance Resume"}
              </button>

              <button
                type="button"
                disabled={
                  isSummarizing ||
                  !hasResume
                }
                onClick={
                  handleSummary
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSummarizing
                  ? "Generating..."
                  : "Generate Summary"}
              </button>

            </div>

            <button
              type="button"
              onClick={
                handleClear
              }
              className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              Clear Workspace
            </button>

            {/* =============================================
                SUMMARY
            ============================================= */}

            {generatedSummary && (
              <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">

                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold">
                    AI Summary
                  </h4>

                  <span className="text-[10px] uppercase tracking-widest text-purple-300">
                    Generated
                  </span>
                </div>

                <p className="text-sm leading-7 text-white/70">
                  {generatedSummary}
                </p>

              </div>
            )}

          </section>

        </div>

        {/* =================================================
            ENHANCED RESULT
        ================================================= */}

        {hasEnhanced && (
          <section className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-400/[0.035] p-5 shadow-2xl">

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">
                  Resume AI
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Enhanced Resume
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  disabled={
                    isDownloading
                  }
                  onClick={
                    handleDownloadText
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold hover:bg-white/10 disabled:opacity-40"
                >
                  Download TXT
                </button>

                <button
                  type="button"
                  disabled={
                    isDownloading
                  }
                  onClick={
                    handleDownloadLatex
                  }
                  className="rounded-xl bg-purple-500 px-4 py-2.5 text-xs font-bold hover:bg-purple-400 disabled:opacity-40"
                >
                  Download LaTeX
                </button>

              </div>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* SUMMARY */}

              {enhancedResume.summary && (
                <ResultSection
                  title="Professional Summary"
                  value={
                    enhancedResume.summary
                  }
                  large
                />
              )}

              {/* SKILLS */}

              <ResultListSection
                title="Skills"
                values={
                  enhancedResume.skills
                }
              />

              {/* EXPERIENCE */}

              <ResultListSection
                title="Experience"
                values={
                  enhancedResume.experience
                }
              />

              {/* EDUCATION */}

              <ResultListSection
                title="Education"
                values={
                  enhancedResume.education
                }
              />

              {/* PROJECTS */}

              <ResultListSection
                title="Projects"
                values={
                  enhancedResume.projects
                }
              />

              {/* CERTIFICATIONS */}

              <ResultListSection
                title="Certifications"
                values={
                  enhancedResume.certifications
                }
              />

              {/* ACHIEVEMENTS */}

              <ResultListSection
                title="Achievements"
                values={
                  enhancedResume.achievements
                }
              />

              {/* KEYWORDS */}

              <ResultListSection
                title="ATS Keywords"
                values={
                  enhancedResume.keywords
                }
              />

            </div>

            {/* IMPROVEMENTS */}

            <ResultListSection
              title="Suggested Improvements"
              values={
                enhancedResume.improvements
              }
              fullWidth
            />

          </section>
        )}

        {/* =================================================
            PREVIEW
        ================================================= */}

        {documentPreview && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5">

            <div className="mb-4">

              <h3 className="text-lg font-bold">
                Resume Preview
              </h3>

              <p className="mt-1 text-xs text-white/40">
                Generated from your supplied content
                and AI result.
              </p>

            </div>

            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 font-sans text-sm leading-7 text-white/70">
              {documentPreview}
            </pre>

          </section>
        )}

        {/* =================================================
            BACKEND INFO
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

          <div className="grid gap-4 text-xs text-white/40 sm:grid-cols-3">

            <div>
              <span className="block text-white/20">
                AI endpoint
              </span>
              <span className="break-all">
                {RESUME_AI_BASE}/enhance
              </span>
            </div>

            <div>
              <span className="block text-white/20">
                Summary endpoint
              </span>
              <span className="break-all">
                {RESUME_AI_BASE}/summary
              </span>
            </div>

            <div>
              <span className="block text-white/20">
                Authentication
              </span>
              <span>
                Firebase ID token
              </span>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   RESULT COMPONENTS
========================================================= */

function ResultSection({
  title,
  value,
  large = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">
        {title}
      </h4>

      <p
        className={`whitespace-pre-wrap leading-7 text-white/70 ${
          large
            ? "text-sm"
            : "text-xs"
        }`}
      >
        {formatArrayItem(
          value
        )}
      </p>

    </div>
  );
}

function ResultListSection({
  title,
  values,
  fullWidth = false,
}) {
  const items =
    asArray(values)
      .map(formatArrayItem)
      .filter(Boolean);

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 p-5 ${
        fullWidth
          ? "mt-5"
          : ""
      }`}
    >

      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">
        {title}
      </h4>

      <div className="space-y-2">

        {items.map(
          (
            item,
            index
          ) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/65"
            >
              {item}
            </div>
          )
        )}

      </div>

    </div>
  );
}