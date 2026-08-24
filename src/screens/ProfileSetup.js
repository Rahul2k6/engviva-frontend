import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { auth } from "../firebase";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const branches = [
  "Computer Science Engineering",
  "Computer Science & Data Science",
  "Computer Science & AI/ML",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Other",
];

const degrees = [
  "B.Tech",
  "B.E",
  "M.Tech",
  "M.E",
  "MCA",
  "Other",
];

const roles = [
  "Software Engineer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Data Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",
  "Cybersecurity Engineer",
  "QA / Test Engineer",
  "Mobile App Developer",
  "System Engineer",
  "Other",
];

const skillSuggestions = [
  "C",
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express",
  "Next.js",
  "SQL",
  "MongoDB",
  "PostgreSQL",
  "Firebase",
  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "Linux",
  "DSA",
];

const currentYears = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate",
];

function Field({
  label,
  required = false,
  children,
  hint,
}) {
  return (
    <div className="profile-field">
      <label>
        <span>{label}</span>

        {required && (
          <b className="required">*</b>
        )}
      </label>

      {children}

      {hint && (
        <small>{hint}</small>
      )}
    </div>
  );
}

function SectionHeader({
  number,
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="section-heading">
      <div className="section-number">
        {number}
      </div>

      <div className="section-heading-copy">
        <div className="section-eyebrow">
          {eyebrow}
        </div>

        <h2>{title}</h2>

        <p>{description}</p>
      </div>

      <div className="section-signal">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function ProfileSetup() {
  const fileInputRef = useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [extractingResume, setExtractingResume] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [profileExists, setProfileExists] =
    useState(false);

  const [resumeFile, setResumeFile] =
    useState(null);

  const [resumeText, setResumeText] =
    useState("");

  const [resumeStatus, setResumeStatus] =
    useState("not_added");

  const [resumeParsed, setResumeParsed] =
    useState({
      summary: "",
      skills: [],
      education: [],
      projects: [],
      experience: [],
      certifications: [],
    });

  const [skills, setSkills] =
    useState([]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",

    college: "",
    degree: "B.Tech",
    branch: "",
    graduationYear: "",
    currentYear: "",
    cgpa: "",
    backlogs: "0",

    primaryRole: "",
    secondaryRoles: [],

    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    tools: [],

    experienceLevel: "Student",

    internshipExperience: "",
    workExperience: "",

    expectedPackage: "",
    preferredLocations: [],
    willingToRelocate: true,
  });

  /*
   * =========================================================
   * AUTHENTICATED USER
   * =========================================================
   */

  async function getAuthenticatedUser() {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        "You are not authenticated. Please login again."
      );
    }

    return user;
  }

  /*
   * =========================================================
   * PROFILE LOAD
   *
   * Backend is authoritative.
   *
   * 404 = NEW USER
   * completed = DASHBOARD
   * incomplete = SHOW PROFILE SETUP
   * =========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function initializeProfile() {
      try {
        setLoading(true);
        setError("");

        const user =
          await getAuthenticatedUser();

        const token =
          await user.getIdToken();

        const response =
          await fetch(
            `${API_BASE}/api/profile`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        /*
         * ---------------------------------------------------
         * NEW USER
         * ---------------------------------------------------
         */

        if (response.status === 404) {
          if (!mounted) return;

          setProfileExists(false);

          setForm((previous) => ({
            ...previous,

            email:
              user.email || "",

            fullName:
              user.displayName || "",
          }));

          return;
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error?.message ||
              result?.error ||
              "Unable to load profile."
          );
        }

        const data =
          result?.data || result || {};

        /*
         * ---------------------------------------------------
         * COMPLETED PROFILE
         * ---------------------------------------------------
         *
         * This is the ONLY condition that redirects.
         */

        const completed =
          data.profileCompleted === true ||
          result.profileCompleted === true;

        if (completed) {
          window.location.replace(
            "/dashboard"
          );

          return;
        }

        /*
         * ---------------------------------------------------
         * EXISTING BUT INCOMPLETE
         * ---------------------------------------------------
         */

        if (!mounted) return;

        setProfileExists(true);

        const profile =
          data.profile || {};

        const engineering =
          data.engineering || {};

        const resume =
          data.resume || {};

        setForm({
          fullName:
            profile.fullName ||
            data.name ||
            user.displayName ||
            "",

          email:
            profile.email ||
            user.email ||
            "",

          phone:
            profile.phone || "",

          location:
            profile.location || "",

          college:
            profile.college || "",

          degree:
            profile.degree ||
            data.degree ||
            "B.Tech",

          branch:
            profile.branch || "",

          graduationYear:
            profile.graduationYear ||
            "",

          currentYear:
            profile.currentYear ||
            "",

          cgpa:
            profile.cgpa || "",

          backlogs:
            profile.backlogs ??
            "0",

          primaryRole:
            engineering.primaryRole ||
            data.role ||
            "",

          secondaryRoles:
            engineering.secondaryRoles ||
            [],

          languages:
            engineering.languages ||
            [],

          frameworks:
            engineering.frameworks ||
            [],

          databases:
            engineering.databases ||
            [],

          cloud:
            engineering.cloud ||
            [],

          tools:
            engineering.tools ||
            [],

          experienceLevel:
            engineering.experienceLevel ||
            "Student",

          internshipExperience:
            engineering.internshipExperience ||
            "",

          workExperience:
            engineering.workExperience ||
            "",

          expectedPackage:
            engineering.expectedPackage ||
            "",

          preferredLocations:
            engineering.preferredLocations ||
            [],

          willingToRelocate:
            engineering.willingToRelocate ??
            true,
        });

        setSkills(
          engineering.skills || []
        );

        /*
         * Existing OCR resume
         */

        setResumeText(
          resume.rawText ||
          resume.text ||
          ""
        );

        setResumeParsed({
          summary:
            resume.parsed?.summary ||
            "",

          skills:
            resume.parsed?.skills ||
            [],

          education:
            resume.parsed?.education ||
            [],

          projects:
            resume.parsed?.projects ||
            [],

          experience:
            resume.parsed?.experience ||
            [],

          certifications:
            resume.parsed?.certifications ||
            [],
        });

        setResumeStatus(
          resume.status ||
          (
            resume.rawText
              ? "processed"
              : "not_added"
          )
        );
      } catch (err) {
        console.error(
          "[PROFILE LOAD]",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "Unable to initialize your profile."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeProfile();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * =========================================================
   * FORM HELPERS
   * =========================================================
   */

  function updateField(
    field,
    value
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function toggleArrayValue(
    field,
    value
  ) {
    setForm((previous) => {
      const current =
        previous[field] || [];

      const exists =
        current.includes(value);

      return {
        ...previous,

        [field]: exists
          ? current.filter(
              (item) =>
                item !== value
            )
          : [...current, value],
      };
    });
  }

  function toggleSkill(skill) {
    setSkills((previous) =>
      previous.includes(skill)
        ? previous.filter(
            (item) =>
              item !== skill
          )
        : [...previous, skill]
    );
  }

  /*
   * =========================================================
   * RESUME
   *
   * We intentionally do NOT store the file.
   *
   * File -> backend extraction/OCR -> text
   * -> Firestore.
   * =========================================================
   */

  async function handleResumeChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !allowed.includes(
        file.type
      )
    ) {
      setError(
        "Please upload a PDF or Word resume."
      );

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "Resume must be smaller than 10 MB."
      );

      return;
    }

    try {
      setError("");
      setSuccess("");

      setResumeFile(file);
      setExtractingResume(true);
      setResumeStatus(
        "processing"
      );

      const user =
        await getAuthenticatedUser();

      const token =
        await user.getIdToken();

      /*
       * IMPORTANT:
       *
       * The file is sent to the backend
       * only for extraction.
       *
       * The backend should NOT save the
       * uploaded binary.
       */

      const formData =
        new FormData();

      formData.append(
        "resume",
        file
      );

      const response =
        await fetch(
          `${API_BASE}/api/profile/resume/extract`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: formData,
          }
        );

      /*
       * If this endpoint doesn't exist yet,
       * don't fake OCR.
       */

      if (
        response.status === 404
      ) {
        throw new Error(
          "Resume extraction service is not configured yet."
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            result?.error ||
            "Resume extraction failed."
        );
      }

      const extracted =
        result?.data || result;

      const rawText =
        extracted.rawText ||
        extracted.text ||
        "";

      if (!rawText.trim()) {
        throw new Error(
          "No readable text was found in the resume."
        );
      }

      setResumeText(
        rawText
      );

      setResumeParsed({
        summary:
          extracted.parsed?.summary ||
          "",

        skills:
          extracted.parsed?.skills ||
          [],

        education:
          extracted.parsed?.education ||
          [],

        projects:
          extracted.parsed?.projects ||
          [],

        experience:
          extracted.parsed?.experience ||
          [],

        certifications:
          extracted.parsed?.certifications ||
          [],
      });

      setResumeStatus(
        "processed"
      );

      /*
       * Merge detected skills into
       * engineering skills.
       */

      const detectedSkills =
        extracted.parsed?.skills ||
        [];

      if (
        detectedSkills.length
      ) {
        setSkills((previous) => {
          const merged =
            new Set([
              ...previous,
              ...detectedSkills,
            ]);

          return Array.from(
            merged
          );
        });
      }

      setSuccess(
        "Resume analyzed. ENGVIVA will use the extracted text as your resume intelligence."
      );
    } catch (err) {
      console.error(
        "[RESUME EXTRACTION]",
        err
      );

      setResumeStatus(
        "failed"
      );

      setError(
        err?.message ||
          "Unable to analyze resume."
      );
    } finally {
      setExtractingResume(false);
    }
  }

  /*
   * =========================================================
   * COMPLETION
   * =========================================================
   */

  const completion =
    useMemo(() => {
      const required = [
        form.fullName,
        form.email,
        form.college,
        form.degree,
        form.branch,
        form.graduationYear,
        form.primaryRole,
      ];

      const completed =
        required.filter(Boolean)
          .length;

      return Math.round(
        (
          completed /
          required.length
        ) * 100
      );
    }, [form]);

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  function validate() {
    if (!form.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!form.college.trim()) {
      return "Please enter your college.";
    }

    if (!form.branch) {
      return "Please select your engineering branch.";
    }

    if (!form.graduationYear) {
      return "Please select your graduation year.";
    }

    if (!form.primaryRole) {
      return "Please select your primary target role.";
    }

    if (skills.length === 0) {
      return "Select at least one technical skill.";
    }

    /*
     * Resume isn't mandatory.
     *
     * ENGVIVA can still build the
     * engineering profile without one.
     */

    return null;
  }

  /*
   * =========================================================
   * SAVE PROFILE
   * =========================================================
   */

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validation =
      validate();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);

      const user =
        await getAuthenticatedUser();

      const token =
        await user.getIdToken();

      /*
       * IMPORTANT:
       *
       * NO resumeFile is sent here.
       *
       * Only OCR/text intelligence is
       * persisted.
       */

      const payload = {
        profile: {
          fullName:
            form.fullName.trim(),

          email:
            user.email ||
            form.email,

          phone:
            form.phone.trim(),

          location:
            form.location.trim(),

          college:
            form.college.trim(),

          degree:
            form.degree,

          branch:
            form.branch,

          graduationYear:
            form.graduationYear,

          currentYear:
            form.currentYear,

          cgpa:
            form.cgpa,

          backlogs:
            form.backlogs,
        },

        engineering: {
          primaryRole:
            form.primaryRole,

          secondaryRoles:
            form.secondaryRoles,

          skills,

          languages:
            form.languages,

          frameworks:
            form.frameworks,

          databases:
            form.databases,

          cloud:
            form.cloud,

          tools:
            form.tools,

          experienceLevel:
            form.experienceLevel,

          internshipExperience:
            form.internshipExperience,

          workExperience:
            form.workExperience,

          expectedPackage:
            form.expectedPackage,

          preferredLocations:
            form.preferredLocations,

          willingToRelocate:
            form.willingToRelocate,
        },

        /*
         * ---------------------------------------------------
         * RESUME INTELLIGENCE
         * ---------------------------------------------------
         *
         * No PDF.
         * No DOCX.
         * No Storage URL.
         *
         * Only extracted text + parsed intelligence.
         */

        resume: {
          status:
            resumeStatus ===
            "processed"
              ? "processed"
              : "not_added",

          rawText:
            resumeText || "",

          parsed: {
            summary:
              resumeParsed.summary ||
              "",

            skills:
              resumeParsed.skills ||
              [],

            education:
              resumeParsed.education ||
              [],

            projects:
              resumeParsed.projects ||
              [],

            experience:
              resumeParsed.experience ||
              [],

            certifications:
              resumeParsed.certifications ||
              [],
          },
        },
      };

      const response =
        await fetch(
          `${API_BASE}/api/profile`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            result?.error ||
            "Unable to save profile."
        );
      }

      /*
       * Backend decides whether profile
       * is complete.
       */

      const completed =
        result?.profileCompleted === true ||
        result?.data?.profileCompleted === true;

      if (completed) {
        setSuccess(
          "Engineering identity initialized successfully."
        );

        /*
         * Give the UI a moment to show
         * the completion state.
         */

        setTimeout(() => {
          window.location.replace(
            "/dashboard"
          );
        }, 700);

        return;
      }

      setSuccess(
        "Profile saved. Complete the remaining information to continue."
      );
    } catch (err) {
      console.error(
        "[PROFILE SAVE]",
        err
      );

      setError(
        err?.message ||
          "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-grid" />

        <div className="loading-core">
          <div className="loading-orb">
            <span />
          </div>

          <div className="loading-label">
            ENGVIVA / IDENTITY CORE
          </div>

          <div className="loading-text">
            Verifying engineering profile...
          </div>

          <div className="loading-line">
            <span />
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="profile-page">

      {/* BACKGROUND */}

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <div className="grid-overlay" />

      <main className="profile-shell">

        {/* ===================================================
            TOP BAR
        =================================================== */}

        <div className="top-bar">

          <div className="brand-mark">
            <span className="brand-symbol">
              E
            </span>

            <span>
              ENGVIVA
            </span>

            <i>
              IDENTITY CORE
            </i>
          </div>

          <div className="top-status">
            <span className="status-dot" />
            SECURE PROFILE CHANNEL
          </div>

        </div>

        {/* ===================================================
            HERO
        =================================================== */}

        <header className="profile-header">

          <div className="hero-copy">

            <div className="profile-eyebrow">
              {profileExists
                ? "PROFILE / CONTINUE INITIALIZATION"
                : "PROFILE / FIRST INITIALIZATION"}
            </div>

            <h1>
              Build the
              <span>
                engineer
              </span>
              behind the resume.
            </h1>

            <p>
              ENGVIVA uses this identity
              to personalize company
              intelligence, role preparation,
              assessments and the final HR
              interview.
            </p>

            <div className="hero-pills">

              <span>
                <b />
                FIREBASE LINKED
              </span>

              <span>
                <b />
                ROLE INTELLIGENCE
              </span>

              <span>
                <b />
                RESUME OCR
              </span>

            </div>

          </div>

          {/* READINESS */}

          <div className="readiness-card">

            <div className="readiness-glow" />

            <div className="readiness-top">

              <span>
                IDENTITY READINESS
              </span>

              <strong>
                {completion}%
              </strong>

            </div>

            <div className="readiness-track">
              <span
                style={{
                  width:
                    `${completion}%`,
                }}
              />
            </div>

            <div className="readiness-bottom">
              <span>
                {completion >= 100
                  ? "READY"
                  : "INITIALIZING"}
              </span>

              <span>
                {profileExists
                  ? "PROFILE FOUND"
                  : "NEW ENGINEER"}
              </span>
            </div>

          </div>

        </header>

        {/* ===================================================
            MESSAGES
        =================================================== */}

        {error && (
          <div className="message error">

            <div className="message-icon">
              !
            </div>

            <div>
              <strong>
                PROFILE SYSTEM
              </strong>

              <span>
                {error}
              </span>
            </div>

          </div>
        )}

        {success && (
          <div className="message success">

            <div className="message-icon">
              ✓
            </div>

            <div>
              <strong>
                IDENTITY UPDATED
              </strong>

              <span>
                {success}
              </span>
            </div>

          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          {/* =================================================
              01 PERSONAL
          ================================================= */}

          <section className="profile-section">

            <SectionHeader
              number="01"
              eyebrow="IDENTITY"
              title="Personal identity"
              description="The basic identity attached to your Firebase account."
            />

            <div className="profile-grid">

              <Field
                label="Full name"
                required
              >
                <input
                  value={
                    form.fullName
                  }
                  onChange={(e) =>
                    updateField(
                      "fullName",
                      e.target.value
                    )
                  }
                  placeholder="Your full name"
                />
              </Field>

              <Field
                label="Email"
                required
                hint="Locked to your authenticated Firebase account."
              >
                <div className="input-with-status">

                  <input
                    value={
                      form.email
                    }
                    disabled
                    className="disabled-input"
                  />

                  <span>
                    VERIFIED
                  </span>

                </div>
              </Field>

              <Field label="Phone">
                <input
                  value={
                    form.phone
                  }
                  onChange={(e) =>
                    updateField(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="+91 XXXXX XXXXX"
                />
              </Field>

              <Field label="Current location">
                <input
                  value={
                    form.location
                  }
                  onChange={(e) =>
                    updateField(
                      "location",
                      e.target.value
                    )
                  }
                  placeholder="Hyderabad, Telangana"
                />
              </Field>

            </div>

          </section>

          {/* =================================================
              02 EDUCATION
          ================================================= */}

          <section className="profile-section">

            <SectionHeader
              number="02"
              eyebrow="ACADEMIC VECTOR"
              title="Engineering education"
              description="Academic signals used for eligibility and placement intelligence."
            />

            <div className="profile-grid">

              <Field
                label="College / University"
                required
              >
                <input
                  value={
                    form.college
                  }
                  onChange={(e) =>
                    updateField(
                      "college",
                      e.target.value
                    )
                  }
                  placeholder="Your engineering college"
                />
              </Field>

              <Field
                label="Degree"
                required
              >
                <select
                  value={
                    form.degree
                  }
                  onChange={(e) =>
                    updateField(
                      "degree",
                      e.target.value
                    )
                  }
                >
                  {degrees.map(
                    (degree) => (
                      <option
                        key={degree}
                        value={degree}
                      >
                        {degree}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Engineering branch"
                required
              >
                <select
                  value={
                    form.branch
                  }
                  onChange={(e) =>
                    updateField(
                      "branch",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch}
                        value={branch}
                      >
                        {branch}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Graduation year"
                required
              >
                <select
                  value={
                    form.graduationYear
                  }
                  onChange={(e) =>
                    updateField(
                      "graduationYear",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select year
                  </option>

                  {Array.from(
                    {
                      length: 8,
                    },
                    (_, index) =>
                      new Date()
                        .getFullYear() +
                      index
                  ).map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Current year">
                <select
                  value={
                    form.currentYear
                  }
                  onChange={(e) =>
                    updateField(
                      "currentYear",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select
                  </option>

                  {currentYears.map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="CGPA">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={
                    form.cgpa
                  }
                  onChange={(e) =>
                    updateField(
                      "cgpa",
                      e.target.value
                    )
                  }
                  placeholder="8.42"
                />
              </Field>

              <Field label="Active backlogs">
                <input
                  type="number"
                  min="0"
                  value={
                    form.backlogs
                  }
                  onChange={(e) =>
                    updateField(
                      "backlogs",
                      e.target.value
                    )
                  }
                />
              </Field>

            </div>

          </section>

          {/* =================================================
              03 ENGINEERING
          ================================================= */}

          <section className="profile-section">

            <SectionHeader
              number="03"
              eyebrow="TECHNICAL VECTOR"
              title="Engineering profile"
              description="The technical foundation ENGVIVA uses to construct your preparation path."
            />

            <div className="profile-grid">

              <Field
                label="Primary target role"
                required
              >
                <select
                  value={
                    form.primaryRole
                  }
                  onChange={(e) =>
                    updateField(
                      "primaryRole",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select target role
                  </option>

                  {roles.map(
                    (role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Experience level">
                <select
                  value={
                    form.experienceLevel
                  }
                  onChange={(e) =>
                    updateField(
                      "experienceLevel",
                      e.target.value
                    )
                  }
                >
                  <option>
                    Student
                  </option>

                  <option>
                    Fresher
                  </option>

                  <option>
                    Intern
                  </option>

                  <option>
                    0-1 Years
                  </option>

                  <option>
                    1-3 Years
                  </option>
                </select>
              </Field>

            </div>

            <div className="skill-block">

              <div className="skill-title-row">

                <div>
                  <div className="skill-title">
                    Technical stack
                  </div>

                  <span>
                    Select what you can actually defend in an interview.
                  </span>
                </div>

                <div className="skill-count">
                  {skills.length}
                  <small>
                    selected
                  </small>
                </div>

              </div>

              <div className="skill-cloud">

                {skillSuggestions.map(
                  (skill) => (
                    <button
                      type="button"
                      key={skill}
                      className={
                        skills.includes(
                          skill
                        )
                          ? "skill active"
                          : "skill"
                      }
                      onClick={() =>
                        toggleSkill(
                          skill
                        )
                      }
                    >
                      <span>
                        {skills.includes(
                          skill
                        )
                          ? "✓"
                          : "+"}
                      </span>

                      {skill}
                    </button>
                  )
                )}

              </div>

            </div>

          </section>

          {/* =================================================
              04 PLACEMENT
          ================================================= */}

          <section className="profile-section">

            <SectionHeader
              number="04"
              eyebrow="PLACEMENT TARGET"
              title="Placement preferences"
              description="Signals used when matching companies, roles and recruitment paths."
            />

            <div className="profile-grid">

              <Field
                label="Expected package"
                hint="Target CTC in LPA."
              >
                <div className="input-suffix">

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.expectedPackage
                    }
                    onChange={(e) =>
                      updateField(
                        "expectedPackage",
                        e.target.value
                      )
                    }
                    placeholder="8.0"
                  />

                  <span>
                    LPA
                  </span>

                </div>
              </Field>

              <Field
                label="Preferred locations"
              >
                <input
                  value={
                    form.preferredLocations.join(
                      ", "
                    )
                  }
                  onChange={(e) =>
                    updateField(
                      "preferredLocations",
                      e.target.value
                        .split(",")
                        .map(
                          (item) =>
                            item.trim()
                        )
                        .filter(Boolean)
                    )
                  }
                  placeholder="Hyderabad, Bangalore"
                />
              </Field>

            </div>

            <label className="toggle-row">

              <input
                type="checkbox"
                checked={
                  form.willingToRelocate
                }
                onChange={(e) =>
                  updateField(
                    "willingToRelocate",
                    e.target.checked
                  )
                }
              />

              <span className="toggle-ui">
                <i />
              </span>

              <div>
                <strong>
                  Open to relocation
                </strong>

                <small>
                  Allow ENGVIVA to surface
                  opportunities outside your
                  current location.
                </small>
              </div>

            </label>

          </section>

          {/* =================================================
              05 EXPERIENCE
          ================================================= */}

          <section className="profile-section">

            <SectionHeader
              number="05"
              eyebrow="EXPERIENCE SIGNAL"
              title="Experience snapshot"
              description="Keep this concise. Your resume intelligence will provide deeper context."
            />

            <div className="profile-grid">

              <Field
                label="Internship experience"
              >
                <textarea
                  value={
                    form.internshipExperience
                  }
                  onChange={(e) =>
                    updateField(
                      "internshipExperience",
                      e.target.value
                    )
                  }
                  placeholder="Example: 2-month frontend internship..."
                />
              </Field>

              <Field label="Work experience">
                <textarea
                  value={
                    form.workExperience
                  }
                  onChange={(e) =>
                    updateField(
                      "workExperience",
                      e.target.value
                    )
                  }
                  placeholder="Describe relevant engineering experience..."
                />
              </Field>

            </div>

          </section>

          {/* =================================================
              06 RESUME INTELLIGENCE
          ================================================= */}

          <section className="profile-section resume-section">

            <div className="resume-hero">

              <SectionHeader
                number="06"
                eyebrow="RESUME INTELLIGENCE"
                title="Turn your resume into data."
                description="ENGVIVA reads your resume once and stores the extracted engineering intelligence — not the original file."
              />

              <div className="ocr-badge">
                <span className="pulse-dot" />
                OCR / TEXT PIPELINE
              </div>

            </div>

            <div className="resume-flow">

              <div className="flow-step active">
                <span>01</span>
                <strong>
                  Upload
                </strong>
                <small>
                  PDF / DOCX
                </small>
              </div>

              <div className="flow-line">
                <span />
              </div>

              <div
                className={
                  resumeStatus ===
                  "processed"
                    ? "flow-step active"
                    : "flow-step"
                }
              >
                <span>02</span>
                <strong>
                  Extract
                </strong>
                <small>
                  Text / OCR
                </small>
              </div>

              <div className="flow-line">
                <span />
              </div>

              <div
                className={
                  resumeText
                    ? "flow-step active"
                    : "flow-step"
                }
              >
                <span>03</span>
                <strong>
                  Intelligence
                </strong>
                <small>
                  Reusable data
                </small>
              </div>

            </div>

            <div className="resume-upload">

              <input
                ref={fileInputRef}
                id="resume-file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={
                  handleResumeChange
                }
              />

              <label
                htmlFor="resume-file"
                className={
                  extractingResume
                    ? "upload-zone processing"
                    : resumeText
                    ? "upload-zone processed"
                    : "upload-zone"
                }
              >

                <div className="upload-orb">

                  {extractingResume
                    ? "..."
                    : resumeText
                    ? "✓"
                    : "↑"}

                </div>

                <strong>
                  {extractingResume
                    ? "Analyzing resume..."
                    : resumeText
                    ? "Resume intelligence ready"
                    : "Drop your resume into ENGVIVA"}
                </strong>

                <span>
                  {extractingResume
                    ? "Extracting engineering information"
                    : resumeText
                    ? "Original file is not stored by this screen"
                    : "PDF / DOC / DOCX · maximum 10 MB"}
                </span>

                {resumeFile && (
                  <em>
                    {resumeFile.name}
                  </em>
                )}

              </label>

            </div>

            {resumeText && (
              <div className="resume-intelligence">

                <div className="intelligence-header">

                  <div>
                    <span>
                      EXTRACTED INTELLIGENCE
                    </span>

                    <strong>
                      Resume context available
                    </strong>
                  </div>

                  <div className="intelligence-state">
                    <b />
                    READY
                  </div>

                </div>

                <div className="intelligence-grid">

                  <div>
                    <small>
                      TEXT
                    </small>

                    <strong>
                      {resumeText
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .length}{" "}
                      words
                    </strong>
                  </div>

                  <div>
                    <small>
                      SKILLS
                    </small>

                    <strong>
                      {resumeParsed.skills
                        ?.length || 0}
                    </strong>
                  </div>

                  <div>
                    <small>
                      PROJECTS
                    </small>

                    <strong>
                      {resumeParsed.projects
                        ?.length || 0}
                    </strong>
                  </div>

                  <div>
                    <small>
                      EXPERIENCE
                    </small>

                    <strong>
                      {resumeParsed.experience
                        ?.length || 0}
                    </strong>
                  </div>

                </div>

                <div className="resume-preview">

                  <div className="preview-label">
                    RESUME TEXT PREVIEW
                  </div>

                  <p>
                    {resumeText
                      .slice(0, 900)}
                    {resumeText.length >
                    900
                      ? "..."
                      : ""}
                  </p>

                </div>

              </div>
            )}

            <div className="resume-policy">

              <div className="policy-icon">
                ◈
              </div>

              <div>
                <strong>
                  Why ENGVIVA stores text instead of your file
                </strong>

                <p>
                  Your extracted resume information
                  becomes reusable context for role
                  analysis, assessments, coding
                  preparation and the HR interview.
                  The original PDF/DOCX is not part
                  of this profile payload.
                </p>
              </div>

            </div>

          </section>

          {/* =================================================
              FINAL ACTION
          ================================================= */}

          <footer className="profile-submit">

            <div className="submit-readiness">

              <div className="submit-ring">
                <span>
                  {completion}
                </span>
                %
              </div>

              <div>
                <strong>
                  Identity readiness
                </strong>

                <small>
                  {resumeText
                    ? "Resume intelligence connected"
                    : "Profile data ready"}
                </small>
              </div>

            </div>

            <button
              type="submit"
              disabled={
                saving ||
                extractingResume
              }
            >
              <span>
                {saving
                  ? "INITIALIZING..."
                  : "INITIALIZE ENGVIVA →"}
              </span>

              <i />
            </button>

          </footer>

        </form>

      </main>

      <style>{styles}</style>

    </div>
  );
}

/*
 * ===========================================================
 * CINEMATIC UI
 * ===========================================================
 */

const styles = `
* {
  box-sizing: border-box;
}

.profile-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  color: #f8f5ff;
  background:
    radial-gradient(
      circle at 72% -5%,
      rgba(154,116,255,.22),
      transparent 31%
    ),
    radial-gradient(
      circle at -5% 70%,
      rgba(105,67,210,.14),
      transparent 28%
    ),
    #05050a;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.profile-page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;

  background:
    radial-gradient(
      circle at center,
      transparent 45%,
      rgba(0,0,0,.42) 100%
    );
}

.grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .22;

  background-image:
    linear-gradient(
      rgba(190,165,255,.035) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(190,165,255,.035) 1px,
      transparent 1px
    );

  background-size:
    60px 60px;

  mask-image:
    linear-gradient(
      to bottom,
      black,
      transparent 80%
    );
}

.ambient {
  position: fixed;
  width: 430px;
  height: 430px;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(125px);
  opacity: .11;
  animation:
    ambientFloat
    12s ease-in-out infinite alternate;
}

.ambient-one {
  top: -180px;
  right: -100px;
  background: #9c75ff;
}

.ambient-two {
  bottom: -240px;
  left: -170px;
  background: #6840d0;
  animation-delay: -5s;
}

.ambient-three {
  top: 45%;
  right: -320px;
  background: #bba3ff;
  animation-delay: -8s;
}

@keyframes ambientFloat {
  from {
    transform: translate3d(
      0,
      0,
      0
    ) scale(1);
  }

  to {
    transform: translate3d(
      0,
      -35px,
      0
    ) scale(1.08);
  }
}

.profile-shell {
  width:
    min(
      1180px,
      calc(100% - 42px)
    );

  margin: 0 auto;
  position: relative;
  z-index: 2;
  padding:
    28px
    0
    100px;
}

.top-bar {
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 55px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 9px;

  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.brand-symbol {
  width: 25px;
  height: 25px;

  display: grid;
  place-items: center;

  border-radius: 7px;

  color: #0c0815;

  background:
    linear-gradient(
      135deg,
      #eee6ff,
      #9870ff
    );

  box-shadow:
    0 0 25px
    rgba(155,112,255,.35);
}

.brand-mark i {
  margin-left: 3px;
  color: #575260;
  font-size: 7px;
  font-style: normal;
  letter-spacing: 1.4px;
}

.top-status {
  display: flex;
  align-items: center;
  gap: 7px;

  color: #696271;
  font-size: 7px;
  letter-spacing: 1.3px;
  font-weight: 700;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #a98bff;

  box-shadow:
    0 0 12px
    #a98bff;

  animation:
    statusPulse
    1.7s ease-in-out infinite;
}

@keyframes statusPulse {
  50% {
    opacity: .35;
    transform: scale(.65);
  }
}

.profile-header {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    270px;

  align-items: end;
  gap: 70px;

  margin-bottom: 45px;
}

.profile-eyebrow,
.section-eyebrow {
  color: #a98cff;
  font-size: 8px;
  letter-spacing: 2.5px;
  font-weight: 800;
}

.hero-copy h1 {
  max-width: 790px;

  margin:
    14px 0
    18px;

  font-size:
    clamp(
      46px,
      7vw,
      78px
    );

  line-height: .91;
  letter-spacing: -4.8px;
  font-weight: 800;
}

.hero-copy h1 span {
  display: inline-block;
  margin-right: 14px;

  color: #b89aff;

  text-shadow:
    0 0 45px
    rgba(160,120,255,.22);
}

.hero-copy p {
  max-width: 660px;

  margin: 0;

  color: #77717f;
  font-size: 12px;
  line-height: 1.85;
}

.hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 25px;
}

.hero-pills span {
  display: flex;
  align-items: center;
  gap: 6px;

  padding:
    7px
    10px;

  border:
    1px solid
    rgba(196,177,255,.1);

  border-radius: 999px;

  color: #797282;
  background:
    rgba(255,255,255,.025);

  font-size: 7px;
  letter-spacing: .9px;
  font-weight: 700;
}

.hero-pills b {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ad8cff;
  box-shadow:
    0 0 8px
    rgba(173,140,255,.8);
}

.readiness-card {
  position: relative;
  overflow: hidden;

  padding: 20px;

  border:
    1px solid
    rgba(204,187,255,.13);

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.065),
      rgba(255,255,255,.018)
    );

  backdrop-filter:
    blur(30px);

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.055),
    0 25px 80px
    rgba(0,0,0,.24);

  animation:
    cardEnter
    .8s
    cubic-bezier(.2,.8,.2,1)
    both;
}

.readiness-glow {
  position: absolute;
  width: 130px;
  height: 130px;
  right: -60px;
  top: -60px;
  border-radius: 50%;
  background: #9a75ff;
  filter: blur(55px);
  opacity: .18;
}

.readiness-top,
.readiness-bottom {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.readiness-top span,
.readiness-bottom {
  color: #696370;
  font-size: 7px;
  letter-spacing: 1.2px;
  font-weight: 700;
}

.readiness-top strong {
  color: #c7b3ff;
  font-size: 22px;
}

.readiness-track {
  height: 3px;
  margin: 17px 0;
  overflow: hidden;
  border-radius: 999px;
  background: #211d29;
}

.readiness-track span {
  display: block;
  height: 100%;
  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      #7050c6,
      #c4abff
    );

  box-shadow:
    0 0 16px
    rgba(172,137,255,.6);

  transition:
    width
    .6s
    cubic-bezier(.2,.8,.2,1);
}

.readiness-bottom {
  font-size: 6px;
}

.readiness-bottom span:first-child {
  color: #a98cff;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message {
  display: flex;
  align-items: center;
  gap: 13px;

  margin-bottom: 18px;
  padding: 14px 16px;

  border-radius: 14px;

  backdrop-filter: blur(25px);

  animation:
    messageIn
    .35s
    ease
    both;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(-7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-icon {
  width: 25px;
  height: 25px;

  display: grid;
  place-items: center;

  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
}

.message strong,
.message span {
  display: block;
}

.message strong {
  margin-bottom: 4px;
  font-size: 7px;
  letter-spacing: 1px;
}

.message span {
  font-size: 10px;
}

.message.error {
  color: #ffb0b0;
  border:
    1px solid
    rgba(255,90,90,.14);
  background:
    rgba(255,60,60,.045);
}

.message.error
.message-icon {
  background:
    rgba(255,70,70,.1);
}

.message.success {
  color: #9de8ca;
  border:
    1px solid
    rgba(80,220,160,.14);
  background:
    rgba(80,220,160,.045);
}

.message.success
.message-icon {
  background:
    rgba(80,220,160,.1);
}

.profile-section {
  position: relative;
  overflow: hidden;

  margin-top: 18px;
  padding: 32px;

  border:
    1px solid
    rgba(213,197,255,.09);

  border-radius: 24px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.052),
      rgba(255,255,255,.014)
    );

  backdrop-filter:
    blur(28px);

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.035),
    0 20px 80px
    rgba(0,0,0,.11);

  animation:
    sectionEnter
    .65s
    cubic-bezier(.2,.8,.2,1)
    both;
}

.profile-section::after {
  content: "";
  position: absolute;

  width: 190px;
  height: 190px;

  top: -110px;
  right: -100px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(170,140,255,.08),
      transparent 68%
    );

  pointer-events: none;
}

.profile-section:hover {
  border-color:
    rgba(195,171,255,.14);
}

@keyframes sectionEnter {
  from {
    opacity: 0;
    transform:
      translateY(18px);
  }

  to {
    opacity: 1;
    transform:
      translateY(0);
  }
}

.section-heading {
  position: relative;

  display: flex;
  gap: 15px;

  margin-bottom: 27px;
}

.section-number {
  width: 32px;
  height: 32px;

  flex: 0 0 auto;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(180,151,255,.2);

  border-radius: 10px;

  color: #b59aff;

  background:
    rgba(155,120,255,.065);

  font-size: 8px;
  font-weight: 800;

  box-shadow:
    0 0 25px
    rgba(150,110,255,.08);
}

.section-heading-copy {
  flex: 1;
}

.section-heading h2 {
  margin:
    4px 0
    6px;

  font-size: 19px;
  letter-spacing: -.5px;
}

.section-heading p {
  max-width: 590px;
  margin: 0;

  color: #696472;
  font-size: 9px;
  line-height: 1.65;
}

.section-signal {
  display: flex;
  gap: 3px;
  align-items: center;
  padding-top: 5px;
}

.section-signal span {
  width: 3px;
  border-radius: 2px;
  background: #8f70d5;
}

.section-signal span:nth-child(1) {
  height: 7px;
  opacity: .35;
}

.section-signal span:nth-child(2) {
  height: 12px;
  opacity: .6;
}

.section-signal span:nth-child(3) {
  height: 18px;
  box-shadow:
    0 0 8px
    rgba(160,125,255,.5);
}

.profile-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 18px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-field label {
  display: flex;
  gap: 3px;
  align-items: center;

  color: #aaa4b5;
  font-size: 9px;
  font-weight: 650;
}

.required {
  color: #b99bff;
}

.profile-field small {
  color: #57515f;
  font-size: 7px;
}

.profile-field input,
.profile-field select,
.profile-field textarea {
  width: 100%;

  outline: none;

  border:
    1px solid
    rgba(213,198,255,.09);

  border-radius: 12px;

  padding:
    13px
    14px;

  color: #ece7f7;

  background:
    rgba(0,0,0,.25);

  font: inherit;
  font-size: 10px;

  transition:
    border
    .22s ease,
    box-shadow
    .22s ease,
    background
    .22s ease,
    transform
    .22s ease;
}

.profile-field input:hover,
.profile-field select:hover,
.profile-field textarea:hover {
  background:
    rgba(255,255,255,.025);
}

.profile-field input:focus,
.profile-field select:focus,
.profile-field textarea:focus {
  border-color:
    rgba(177,144,255,.52);

  background:
    rgba(132,97,220,.035);

  box-shadow:
    0 0 0 3px
    rgba(150,115,255,.055),
    0 0 30px
    rgba(135,95,230,.06);

  transform:
    translateY(-1px);
}

.profile-field input::placeholder,
.profile-field textarea::placeholder {
  color: #4d4855;
}

.disabled-input {
  opacity: .48;
  cursor: not-allowed;
}

.input-with-status {
  position: relative;
}

.input-with-status input {
  padding-right: 70px;
}

.input-with-status span {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);

  color: #8edebf;
  font-size: 6px;
  letter-spacing: .8px;
  font-weight: 800;
}

.input-suffix {
  position: relative;
}

.input-suffix input {
  padding-right: 48px;
}

.input-suffix span {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);

  color: #645e6e;
  font-size: 7px;
  font-weight: 800;
}

.profile-field textarea {
  min-height: 110px;
  resize: vertical;
}

.skill-block {
  margin-top: 24px;
}

.skill-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.skill-title {
  color: #aaa4b5;
  font-size: 10px;
  font-weight: 700;
}

.skill-title-row
> div:first-child
> span {
  display: block;
  margin-top: 4px;
  color: #57515f;
  font-size: 7px;
}

.skill-count {
  min-width: 44px;
  height: 44px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  border:
    1px solid
    rgba(180,151,255,.13);

  border-radius: 11px;

  color: #c3adff;

  background:
    rgba(160,120,255,.045);

  font-size: 13px;
  font-weight: 800;
}

.skill-count small {
  margin-top: 1px;
  color: #595361;
  font-size: 5px;
  letter-spacing: .5px;
}

.skill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.skill {
  display: flex;
  align-items: center;
  gap: 6px;

  border:
    1px solid
    rgba(213,198,255,.09);

  border-radius: 9px;

  padding:
    8px
    10px;

  color: #716c7b;

  background:
    rgba(255,255,255,.02);

  cursor: pointer;

  font-size: 8px;

  transition:
    .2s
    cubic-bezier(.2,.8,.2,1);
}

.skill span {
  color: #514c58;
  font-size: 8px;
}

.skill:hover {
  color: #c9b9ed;
  border-color:
    rgba(180,148,255,.3);
  transform:
    translateY(-2px);
}

.skill.active {
  color: #d9cbff;

  border-color:
    rgba(178,145,255,.45);

  background:
    linear-gradient(
      135deg,
      rgba(155,115,255,.15),
      rgba(100,65,180,.06)
    );

  box-shadow:
    0 7px 25px
    rgba(120,80,220,.1),
    inset 0 1px
    rgba(255,255,255,.05);
}

.skill.active span {
  color: #b79aff;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;

  margin-top: 25px;

  cursor: pointer;
}

.toggle-row input {
  display: none;
}

.toggle-ui {
  position: relative;

  width: 40px;
  height: 22px;

  flex: 0 0 auto;

  border:
    1px solid
    #393442;

  border-radius: 999px;

  background:
    #211e28;

  transition: .25s;
}

.toggle-ui i {
  position: absolute;

  width: 14px;
  height: 14px;

  left: 3px;
  top: 3px;

  border-radius: 50%;

  background: #686170;

  transition: .25s;
}

.toggle-row
input:checked
+
.toggle-ui {
  border-color:
    rgba(176,142,255,.55);

  background:
    #7654c9;

  box-shadow:
    0 0 18px
    rgba(130,90,230,.25);
}

.toggle-row
input:checked
+
.toggle-ui
i {
  left: 21px;
  background: #fff;
}

.toggle-row strong {
  display: block;
  font-size: 9px;
}

.toggle-row small {
  display: block;
  margin-top: 4px;
  color: #5c5665;
  font-size: 7px;
}

.resume-section {
  border-color:
    rgba(172,143,255,.13);

  background:
    linear-gradient(
      145deg,
      rgba(153,117,255,.065),
      rgba(255,255,255,.015)
    );
}

.resume-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.resume-hero
.section-heading {
  margin-bottom: 0;
}

.ocr-badge {
  display: flex;
  align-items: center;
  gap: 7px;

  padding:
    8px
    10px;

  border:
    1px solid
    rgba(170,139,255,.16);

  border-radius: 999px;

  color: #a38ad9;

  background:
    rgba(150,115,255,.045);

  font-size: 6px;
  letter-spacing: 1px;
  font-weight: 800;
  white-space: nowrap;
}

.pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #b398ff;
  box-shadow:
    0 0 9px
    #b398ff;

  animation:
    statusPulse
    1.5s
    infinite;
}

.resume-flow {
  display: flex;
  align-items: center;
  margin-top: 30px;
  margin-bottom: 18px;
}

.flow-step {
  min-width: 100px;

  display: flex;
  flex-direction: column;
  gap: 3px;

  color: #504b58;
}

.flow-step span {
  color: #4b4652;
  font-size: 6px;
  letter-spacing: 1px;
}

.flow-step strong {
  color: #6a6473;
  font-size: 8px;
}

.flow-step small {
  color: #45404c;
  font-size: 6px;
}

.flow-step.active span {
  color: #a98bff;
}

.flow-step.active strong {
  color: #c8b8e8;
}

.flow-line {
  flex: 1;
  height: 1px;
  background: #28232f;
  overflow: hidden;
}

.flow-line span {
  display: block;
  width: 40%;
  height: 100%;
  background:
    linear-gradient(
      90deg,
      transparent,
      #8f6bda
    );
}

.upload-zone {
  position: relative;

  min-height: 190px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 8px;

  border:
    1px dashed
    rgba(187,159,255,.2);

  border-radius: 18px;

  background:
    radial-gradient(
      circle at center,
      rgba(155,115,255,.06),
      transparent 55%
    ),
    rgba(0,0,0,.16);

  cursor: pointer;

  transition:
    .25s
    ease;
}

.upload-zone:hover {
  border-color:
    rgba(187,159,255,.42);

  background:
    radial-gradient(
      circle at center,
      rgba(155,115,255,.1),
      transparent 55%
    ),
    rgba(0,0,0,.19);

  transform:
    translateY(-2px);
}

.upload-zone.processing {
  border-color:
    rgba(177,144,255,.5);

  animation:
    processingBorder
    1.3s
    ease-in-out
    infinite alternate;
}

@keyframes processingBorder {
  to {
    box-shadow:
      0 0 35px
      rgba(155,115,255,.12);
  }
}

.upload-zone.processed {
  border-color:
    rgba(92,222,170,.27);

  background:
    radial-gradient(
      circle at center,
      rgba(80,210,160,.055),
      transparent 55%
    );
}

.upload-zone input {
  display: none;
}

.upload-orb {
  width: 52px;
  height: 52px;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(181,150,255,.22);

  border-radius: 16px;

  color: #c7b3ff;

  background:
    linear-gradient(
      145deg,
      rgba(178,145,255,.15),
      rgba(95,55,180,.04)
    );

  box-shadow:
    0 0 35px
    rgba(150,110,255,.1);

  font-size: 18px;
  font-weight: 500;
}

.upload-zone strong {
  color: #d2cadf;
  font-size: 11px;
}

.upload-zone > span {
  color: #595360;
  font-size: 8px;
}

.upload-zone em {
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  margin-top: 4px;

  color: #a991da;
  font-size: 7px;
  font-style: normal;
}

.resume-intelligence {
  margin-top: 16px;

  padding: 20px;

  border:
    1px solid
    rgba(169,141,255,.13);

  border-radius: 17px;

  background:
    rgba(0,0,0,.18);

  animation:
    messageIn
    .45s
    ease
    both;
}

.intelligence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.intelligence-header span,
.preview-label {
  display: block;

  color: #777080;

  font-size: 6px;
  letter-spacing: 1.2px;
  font-weight: 800;
}

.intelligence-header strong {
  display: block;
  margin-top: 5px;
  color: #d2c7e7;
  font-size: 10px;
}

.intelligence-state {
  display: flex;
  align-items: center;
  gap: 6px;

  color: #8bd8ba;
  font-size: 6px;
  font-weight: 800;
}

.intelligence-state b {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #82d9b6;
  box-shadow:
    0 0 10px
    rgba(100,220,170,.8);
}

.intelligence-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);

  gap: 8px;

  margin-top: 17px;
}

.intelligence-grid > div {
  padding: 13px;

  border:
    1px solid
    rgba(210,194,255,.07);

  border-radius: 11px;

  background:
    rgba(255,255,255,.018);
}

.intelligence-grid small,
.intelligence-grid strong {
  display: block;
}

.intelligence-grid small {
  color: #57515e;
  font-size: 6px;
  letter-spacing: .8px;
}

.intelligence-grid strong {
  margin-top: 5px;
  color: #c9b8e9;
  font-size: 14px;
}

.resume-preview {
  margin-top: 12px;
  padding: 14px;

  border:
    1px solid
    rgba(210,194,255,.06);

  border-radius: 11px;

  background:
    rgba(255,255,255,.014);
}

.resume-preview p {
  max-height: 120px;
  overflow: auto;

  margin:
    9px 0
    0;

  color: #68616f;

  font-size: 8px;
  line-height: 1.75;

  white-space: pre-wrap;
}

.resume-policy {
  display: flex;
  gap: 12px;

  margin-top: 14px;
  padding: 14px;

  border:
    1px solid
    rgba(210,194,255,.06);

  border-radius: 13px;

  background:
    rgba(255,255,255,.014);
}

.policy-icon {
  width: 27px;
  height: 27px;

  flex: 0 0 auto;

  display: grid;
  place-items: center;

  border-radius: 8px;

  color: #b49aff;

  background:
    rgba(160,120,255,.08);

  font-size: 11px;
}

.resume-policy strong {
  display: block;
  color: #a9a1b4;
  font-size: 8px;
}

.resume-policy p {
  max-width: 720px;
  margin:
    5px
    0
    0;

  color: #5d5765;
  font-size: 7px;
  line-height: 1.7;
}

.profile-submit {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-top: 28px;
  padding: 20px;

  border:
    1px solid
    rgba(194,173,255,.1);

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.015)
    );

  backdrop-filter:
    blur(25px);
}

.submit-readiness {
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-ring {
  width: 48px;
  height: 48px;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(180,150,255,.22);

  border-radius: 50%;

  color: #756d80;
  font-size: 8px;
}

.submit-ring span {
  color: #c6b1ff;
  font-size: 14px;
  font-weight: 800;
}

.submit-readiness strong,
.submit-readiness small {
  display: block;
}

.submit-readiness strong {
  color: #bfb5ca;
  font-size: 9px;
}

.submit-readiness small {
  margin-top: 4px;
  color: #595361;
  font-size: 7px;
}

.profile-submit button {
  position: relative;
  overflow: hidden;

  min-width: 220px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  border:
    1px solid
    rgba(255,255,255,.15);

  border-radius: 13px;

  padding:
    14px
    20px;

  color: #110d1a;

  background:
    linear-gradient(
      135deg,
      #eee6ff,
      #a887ff
    );

  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;

  cursor: pointer;

  box-shadow:
    0 15px 45px
    rgba(130,90,230,.18);

  transition:
    .25s
    cubic-bezier(.2,.8,.2,1);
}

.profile-submit button::before {
  content: "";

  position: absolute;

  width: 70px;
  height: 180px;

  left: -100px;
  top: -50px;

  transform: rotate(20deg);

  background:
    rgba(255,255,255,.4);

  filter: blur(18px);

  transition:
    left
    .6s
    ease;
}

.profile-submit button:hover {
  transform:
    translateY(-3px);

  box-shadow:
    0 20px 60px
    rgba(130,90,230,.3);
}

.profile-submit button:hover::before {
  left: 120%;
}

.profile-submit button:disabled {
  opacity: .45;
  cursor: wait;
  transform: none;
}

.profile-submit button i {
  width: 5px;
  height: 5px;

  border:
    solid
    rgba(20,14,28,.65);

  border-width:
    0
    1px
    1px
    0;

  transform:
    rotate(-45deg);
}

.profile-loading {
  min-height: 100vh;

  position: relative;
  overflow: hidden;

  display: grid;
  place-items: center;

  background:
    radial-gradient(
      circle at center,
      #161021,
      #05050a 60%
    );

  color: #81788f;

  font-family:
    Inter,
    system-ui,
    sans-serif;
}

.loading-grid {
  position: absolute;
  inset: 0;

  opacity: .18;

  background-image:
    linear-gradient(
      rgba(180,150,255,.06) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(180,150,255,.06) 1px,
      transparent 1px
    );

  background-size:
    55px
    55px;

  transform:
    perspective(500px)
    rotateX(55deg)
    scale(1.6);

  transform-origin:
    center bottom;
}

.loading-core {
  position: relative;
  z-index: 2;

  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-orb {
  width: 80px;
  height: 80px;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(181,149,255,.2);

  border-radius: 50%;

  box-shadow:
    0 0 70px
    rgba(145,100,255,.16);

  animation:
    orbPulse
    2s
    ease-in-out
    infinite;
}

.loading-orb::before {
  content: "";

  position: absolute;

  width: 53px;
  height: 53px;

  border-radius: 50%;

  border:
    2px solid
    transparent;

  border-top-color: #ae8dff;

  animation:
    spin
    1s
    linear
    infinite;
}

.loading-orb span {
  width: 8px;
  height: 8px;

  border-radius: 50%;

  background: #c7adff;

  box-shadow:
    0 0 25px
    #a985ff;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes orbPulse {
  50% {
    transform: scale(1.05);
    box-shadow:
      0 0 100px
      rgba(145,100,255,.23);
  }
}

.loading-label {
  margin-top: 28px;

  color: #a98cff;

  font-size: 8px;
  letter-spacing: 2.5px;
  font-weight: 800;
}

.loading-text {
  margin-top: 8px;

  color: #615a6c;
  font-size: 9px;
}

.loading-line {
  width: 160px;
  height: 1px;

  margin-top: 18px;

  overflow: hidden;

  background: #25202e;
}

.loading-line span {
  display: block;

  width: 45%;
  height: 100%;

  background:
    linear-gradient(
      90deg,
      transparent,
      #a98cff,
      transparent
    );

  animation:
    loadingSweep
    1.3s
    ease-in-out
    infinite;
}

@keyframes loadingSweep {
  from {
    transform:
      translateX(-100%);
  }

  to {
    transform:
      translateX(300%);
  }
}

@media (max-width: 850px) {

  .profile-shell {
    width:
      min(
        100% - 24px,
        1180px
      );

    padding-top: 18px;
  }

  .top-bar {
    margin-bottom: 35px;
  }

  .top-status {
    display: none;
  }

  .profile-header {
    grid-template-columns: 1fr;
    gap: 25px;
  }

  .hero-copy h1 {
    font-size:
      clamp(
        42px,
        13vw,
        64px
      );

    letter-spacing: -3px;
  }

  .readiness-card {
    width: 100%;
  }

  .profile-section {
    padding: 22px;
  }

  .resume-hero {
    flex-direction: column;
  }

  .ocr-badge {
    align-self: flex-start;
  }

  .intelligence-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .profile-submit {
    flex-direction: column;
    align-items: stretch;
    gap: 17px;
  }

  .profile-submit button {
    width: 100%;
  }
}

@media (max-width: 600px) {

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .hero-pills {
    display: none;
  }

  .section-signal {
    display: none;
  }

  .resume-flow {
    display: none;
  }

  .intelligence-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .profile-submit {
    padding: 16px;
  }
}
`;