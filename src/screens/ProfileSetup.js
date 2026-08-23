import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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

function Field({
  label,
  required = false,
  children,
  hint,
}) {
  return (
    <div className="profile-field">
      <label>
        {label}
        {required && (
          <span className="required">*</span>
        )}
      </label>

      {children}

      {hint && (
        <small>{hint}</small>
      )}
    </div>
  );
}

export default function ProfileSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [resumeMode, setResumeMode] =
    useState("upload");

  const [resumeFile, setResumeFile] =
    useState(null);

  const [skills, setSkills] = useState([]);

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
   * ---------------------------------------------------------
   * Load existing profile
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      if (!user) {
        setError(
          "You are not authenticated. Please login again."
        );

        return;
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          `${API_BASE}/api/profile`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (response.status === 404) {
        /*
         * New user.
         * Firebase already gives us the email.
         */
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

      if (!result.success) {
        throw new Error(
          result.error?.message ||
            "Unable to load profile."
        );
      }

      const data =
        result.data || {};

      const profile =
        data.profile || {};

      const engineering =
        data.engineering || {};

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
          profile.graduationYear || "",

        currentYear:
          profile.currentYear || "",

        cgpa:
          profile.cgpa || "",

        backlogs:
          profile.backlogs ?? "0",

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

      if (
        data.resume?.uploaded
      ) {
        setResumeMode("upload");
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * Form helpers
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * Resume
   * ---------------------------------------------------------
   */

  function handleResumeChange(event) {
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

    setError("");
    setResumeFile(file);
  }

  /*
   * ---------------------------------------------------------
   * Validation
   * ---------------------------------------------------------
   */

  const completion = useMemo(() => {
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
      (completed /
        required.length) *
        100
    );
  }, [form]);

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

    return null;
  }

  /*
   * ---------------------------------------------------------
   * Save
   * ---------------------------------------------------------
   */

  async function handleSubmit(event) {
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
        auth.currentUser;

      if (!user) {
        throw new Error(
          "Authentication expired. Please login again."
        );
      }

      const token =
        await user.getIdToken();

      /*
       * IMPORTANT:
       *
       * The backend currently expects:
       *
       * profile
       * engineering
       * resume
       *
       * So we send exactly that structure.
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

        resume: {
          /*
           * We store metadata here for now.
           *
           * Actual Firebase Storage upload
           * will be implemented in the Resume
           * Intelligence screen.
           */

          uploaded:
            resumeMode ===
              "upload" &&
            Boolean(resumeFile),

          fileName:
            resumeFile?.name ||
            "",

          status:
            resumeMode ===
            "generate"
              ? "generation_required"
              : resumeFile
              ? "uploaded"
              : "missing",
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
          result.error?.message ||
            "Unable to save profile."
        );
      }

      setSuccess(
        result.profileCompleted
          ? "Profile completed successfully."
          : "Profile saved successfully."
      );

      /*
       * Do NOT automatically navigate yet.
       *
       * We are building the screens step-by-step.
       *
       * After Resume Intelligence is complete,
       * this will redirect to /dashboard.
       */
    } catch (err) {
      console.error(
        "[PROFILE SAVE]",
        err
      );

      setError(
        err.message ||
          "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-orb" />
        <div>
          Loading engineering profile...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">

      <div className="profile-bg profile-bg-one" />
      <div className="profile-bg profile-bg-two" />

      <main className="profile-shell">

        {/* HEADER */}

        <header className="profile-header">

          <div>
            <div className="profile-eyebrow">
              ENGVIVA / INITIALIZATION
            </div>

            <h1>
              Build your
              <span>
                engineering identity.
              </span>
            </h1>

            <p>
              Tell ENGVIVA who you are.
              Your profile becomes the
              foundation for company,
              role, assessment and
              interview intelligence.
            </p>
          </div>

          <div className="completion-card">

            <div className="completion-ring">
              {completion}%
            </div>

            <div>
              <strong>
                Profile readiness
              </strong>

              <small>
                Required information
              </small>
            </div>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="message error">
            <span>!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="message success">
            <span>✓</span>
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          {/* =================================================
              PERSONAL
          ================================================= */}

          <section className="profile-section">

            <div className="section-heading">
              <span>01</span>

              <div>
                <h2>
                  Personal identity
                </h2>

                <p>
                  Basic information used
                  across your ENGVIVA profile.
                </p>
              </div>
            </div>

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
                  placeholder="Rahul Kumar"
                />
              </Field>

              <Field
                label="Email"
                required
                hint="Automatically linked to your Firebase account."
              >
                <input
                  value={
                    form.email
                  }
                  disabled
                  className="disabled-input"
                />
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
              EDUCATION
          ================================================= */}

          <section className="profile-section">

            <div className="section-heading">
              <span>02</span>

              <div>
                <h2>
                  Engineering education
                </h2>

                <p>
                  Academic information used
                  for eligibility and placement
                  analysis.
                </p>
              </div>
            </div>

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

                  <option value="1">
                    1st Year
                  </option>

                  <option value="2">
                    2nd Year
                  </option>

                  <option value="3">
                    3rd Year
                  </option>

                  <option value="4">
                    4th Year
                  </option>

                  <option value="Postgraduate">
                    Postgraduate
                  </option>
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
              ENGINEERING
          ================================================= */}

          <section className="profile-section">

            <div className="section-heading">
              <span>03</span>

              <div>
                <h2>
                  Engineering profile
                </h2>

                <p>
                  This determines which
                  preparation paths ENGVIVA
                  builds for you.
                </p>
              </div>
            </div>

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

              <div className="skill-title">
                Technical skills
                <span>
                  Select everything you actually know.
                </span>
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
                      {skills.includes(
                        skill
                      )
                        ? "✓ "
                        : "+ "}
                      {skill}
                    </button>
                  )
                )}

              </div>

            </div>

          </section>

          {/* =================================================
              PLACEMENT
          ================================================= */}

          <section className="profile-section">

            <div className="section-heading">
              <span>04</span>

              <div>
                <h2>
                  Placement preferences
                </h2>

                <p>
                  These values influence
                  company and interview
                  recommendations.
                </p>
              </div>
            </div>

            <div className="profile-grid">

              <Field
                label="Expected package"
                hint="Enter your target CTC in LPA."
              >
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
              </Field>

              <Field label="Preferred location">
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

              <span className="toggle-ui" />

              <div>
                <strong>
                  Open to relocation
                </strong>

                <small>
                  Allow ENGVIVA to recommend
                  opportunities outside your
                  current location.
                </small>
              </div>

            </label>

          </section>

          {/* =================================================
              EXPERIENCE
          ================================================= */}

          <section className="profile-section">

            <div className="section-heading">
              <span>05</span>

              <div>
                <h2>
                  Experience snapshot
                </h2>

                <p>
                  Keep it short. Your resume
                  will provide the deeper data.
                </p>
              </div>
            </div>

            <div className="profile-grid">

              <Field label="Internship experience">
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
                  placeholder="Example: 2-month frontend internship at..."
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
                  placeholder="Describe relevant work experience..."
                />
              </Field>

            </div>

          </section>

          {/* =================================================
              RESUME
          ================================================= */}

          <section className="profile-section resume-section">

            <div className="section-heading">
              <span>06</span>

              <div>
                <h2>
                  Resume
                </h2>

                <p>
                  Your resume becomes the
                  technical source for interview
                  personalization.
                </p>
              </div>
            </div>

            <div className="resume-choice">

              <button
                type="button"
                className={
                  resumeMode === "upload"
                    ? "resume-option active"
                    : "resume-option"
                }
                onClick={() =>
                  setResumeMode(
                    "upload"
                  )
                }
              >
                <strong>
                  I have a resume
                </strong>

                <span>
                  Upload PDF or DOCX
                </span>
              </button>

              <button
                type="button"
                className={
                  resumeMode === "generate"
                    ? "resume-option active"
                    : "resume-option"
                }
                onClick={() =>
                  setResumeMode(
                    "generate"
                  )
                }
              >
                <strong>
                  I don't have one
                </strong>

                <span>
                  ENGVIVA will help create it
                </span>
              </button>

            </div>

            {resumeMode ===
              "upload" && (
              <div className="resume-upload">

                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={
                    handleResumeChange
                  }
                />

                <label htmlFor="resume-file">

                  <div className="upload-icon">
                    ↑
                  </div>

                  <strong>
                    {resumeFile
                      ? resumeFile.name
                      : "Drop your resume here"}
                  </strong>

                  <span>
                    PDF / DOC / DOCX ·
                    Maximum 10 MB
                  </span>

                </label>

              </div>
            )}

            {resumeMode ===
              "generate" && (
              <div className="resume-generate">

                <div className="generate-icon">
                  ✦
                </div>

                <div>
                  <strong>
                    Resume Intelligence
                  </strong>

                  <p>
                    No resume? No problem.
                    ENGVIVA will collect your
                    projects, skills, education
                    and experience and generate
                    a professional resume in the
                    next step.
                  </p>
                </div>

              </div>
            )}

          </section>

          {/* SUBMIT */}

          <footer className="profile-submit">

            <div>
              <span>
                {completion}%
              </span>

              <small>
                profile readiness
              </small>
            </div>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Engineering Profile →"}
            </button>

          </footer>

        </form>

      </main>

      <style>{styles}</style>

    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 70% 0%,
      rgba(159,125,255,.13),
      transparent 30%
    ),
    #07070c;
  color: #f7f4ff;
  font-family:
    Inter,
    system-ui,
    sans-serif;
  overflow-x: hidden;
}

.profile-bg {
  position: fixed;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(130px);
  pointer-events: none;
  opacity: .1;
}

.profile-bg-one {
  background: #9670ff;
  right: -180px;
  top: 100px;
}

.profile-bg-two {
  background: #6037bd;
  left: -220px;
  bottom: 0;
}

.profile-shell {
  width: min(1120px, calc(100% - 40px));
  margin: auto;
  padding: 55px 0 80px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 40px;
  margin-bottom: 40px;
}

.profile-eyebrow {
  color: #a78bef;
  font-size: 9px;
  letter-spacing: 2px;
  font-weight: 700;
}

.profile-header h1 {
  margin: 12px 0;
  max-width: 720px;
  font-size: clamp(38px, 6vw, 64px);
  line-height: .98;
  letter-spacing: -3px;
}

.profile-header h1 span {
  display: block;
  color: #ad91ff;
}

.profile-header p {
  max-width: 610px;
  color: #777281;
  font-size: 13px;
  line-height: 1.8;
}

.completion-card {
  min-width: 205px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(211,195,255,.12);
  border-radius: 18px;
  background: rgba(255,255,255,.035);
  backdrop-filter: blur(25px);
}

.completion-ring {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #c8b5ff;
  border: 2px solid rgba(171,141,255,.35);
  font-size: 12px;
  font-weight: 700;
}

.completion-card strong {
  display: block;
  font-size: 11px;
}

.completion-card small {
  display: block;
  margin-top: 5px;
  color: #65616d;
  font-size: 9px;
}

.message {
  margin-bottom: 20px;
  padding: 13px 16px;
  border-radius: 12px;
  font-size: 11px;
  backdrop-filter: blur(20px);
}

.message span {
  margin-right: 9px;
}

.message.error {
  color: #ff9d9d;
  border: 1px solid rgba(255,90,90,.15);
  background: rgba(255,70,70,.06);
}

.message.success {
  color: #91e9c4;
  border: 1px solid rgba(80,220,160,.15);
  background: rgba(80,220,160,.05);
}

.profile-section {
  margin-top: 22px;
  padding: 30px;
  border: 1px solid rgba(211,195,255,.09);
  border-radius: 24px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.018)
    );
  backdrop-filter: blur(25px);
  box-shadow:
    inset 0 1px rgba(255,255,255,.035);
}

.section-heading {
  display: flex;
  gap: 15px;
  margin-bottom: 27px;
}

.section-heading > span {
  color: #9878e8;
  font-size: 9px;
  font-weight: 700;
  padding-top: 5px;
}

.section-heading h2 {
  margin: 0;
  font-size: 17px;
}

.section-heading p {
  margin: 7px 0 0;
  color: #686472;
  font-size: 10px;
}

.profile-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-field label {
  color: #aaa4b4;
  font-size: 10px;
  font-weight: 600;
}

.required {
  color: #b895ff;
  margin-left: 3px;
}

.profile-field small {
  color: #57535f;
  font-size: 8px;
}

.profile-field input,
.profile-field select,
.profile-field textarea {
  width: 100%;
  border: 1px solid rgba(215,202,255,.09);
  outline: none;
  border-radius: 12px;
  padding: 13px 14px;
  color: #e9e4f5;
  background: rgba(0,0,0,.24);
  font: inherit;
  font-size: 11px;
  transition: .2s ease;
}

.profile-field textarea {
  min-height: 105px;
  resize: vertical;
}

.profile-field input:focus,
.profile-field select:focus,
.profile-field textarea:focus {
  border-color: rgba(173,145,255,.45);
  box-shadow:
    0 0 0 3px
    rgba(150,115,255,.06);
}

.profile-field input::placeholder,
.profile-field textarea::placeholder {
  color: #4d4955;
}

.disabled-input {
  opacity: .55;
  cursor: not-allowed;
}

.skill-block {
  margin-top: 22px;
}

.skill-title {
  color: #aaa4b4;
  font-size: 10px;
  font-weight: 600;
}

.skill-title span {
  margin-left: 8px;
  color: #57535f;
  font-weight: 400;
}

.skill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}

.skill {
  border: 1px solid rgba(213,198,255,.1);
  border-radius: 9px;
  padding: 8px 11px;
  color: #797383;
  background: rgba(255,255,255,.025);
  cursor: pointer;
  font-size: 9px;
  transition: .2s ease;
}

.skill:hover {
  transform: translateY(-2px);
  color: #c6b5f4;
  border-color: rgba(174,145,255,.3);
}

.skill.active {
  color: #d4c5ff;
  border-color: rgba(174,145,255,.42);
  background: rgba(151,116,255,.12);
  box-shadow: 0 5px 20px rgba(120,80,220,.08);
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
  width: 38px;
  height: 21px;
  border-radius: 30px;
  background: #24212b;
  border: 1px solid #393442;
  position: relative;
}

.toggle-ui::after {
  content: "";
  position: absolute;
  width: 15px;
  height: 15px;
  left: 2px;
  top: 2px;
  border-radius: 50%;
  background: #68616f;
  transition: .2s;
}

.toggle-row input:checked + .toggle-ui {
  background: #7555c8;
}

.toggle-row input:checked + .toggle-ui::after {
  left: 19px;
  background: #fff;
}

.toggle-row strong {
  display: block;
  font-size: 10px;
}

.toggle-row small {
  display: block;
  color: #5d5866;
  margin-top: 4px;
  font-size: 8px;
}

.resume-choice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.resume-option {
  padding: 20px;
  text-align: left;
  border: 1px solid rgba(213,198,255,.08);
  border-radius: 15px;
  color: #827d8d;
  background: rgba(0,0,0,.18);
  cursor: pointer;
  transition: .2s;
}

.resume-option strong,
.resume-option span {
  display: block;
}

.resume-option strong {
  color: #c9c2d5;
  font-size: 11px;
}

.resume-option span {
  margin-top: 7px;
  font-size: 9px;
}

.resume-option.active {
  border-color: rgba(175,144,255,.4);
  background: rgba(145,108,240,.08);
}

.resume-upload {
  margin-top: 15px;
}

.resume-upload input {
  display: none;
}

.resume-upload label {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px dashed rgba(187,162,255,.2);
  border-radius: 16px;
  background: rgba(0,0,0,.15);
  cursor: pointer;
  text-align: center;
}

.upload-icon,
.generate-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #cdbbff;
  background: rgba(159,124,255,.1);
  font-size: 17px;
}

.resume-upload strong {
  font-size: 11px;
}

.resume-upload span {
  color: #57525f;
  font-size: 8px;
}

.resume-generate {
  margin-top: 15px;
  padding: 18px;
  display: flex;
  gap: 14px;
  border-radius: 15px;
  border: 1px solid rgba(175,144,255,.12);
  background: rgba(150,115,255,.045);
}

.resume-generate strong {
  font-size: 11px;
}

.resume-generate p {
  margin: 7px 0 0;
  color: #686270;
  font-size: 9px;
  line-height: 1.7;
}

.profile-submit {
  margin-top: 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-submit > div span {
  display: block;
  color: #b89dff;
  font-size: 20px;
  font-weight: 700;
}

.profile-submit > div small {
  color: #57525f;
  font-size: 8px;
}

.profile-submit button {
  border: none;
  border-radius: 13px;
  padding: 14px 22px;
  color: #100c18;
  background: linear-gradient(
    135deg,
    #d5c5ff,
    #9d7cff
  );
  font-weight: 700;
  font-size: 10px;
  cursor: pointer;
  box-shadow:
    0 10px 35px
    rgba(145,105,240,.15);
  transition: .2s;
}

.profile-submit button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 15px 45px
    rgba(145,105,240,.25);
}

.profile-submit button:disabled {
  opacity: .5;
  cursor: wait;
}

.profile-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: #07070c;
  color: #777281;
  font: 11px Inter, system-ui, sans-serif;
}

.loading-orb {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid rgba(173,145,255,.15);
  border-top-color: #aa8aff;
  animation: profileSpin 1s linear infinite;
}

@keyframes profileSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 750px) {

  .profile-shell {
    width: min(
      100% - 24px,
      1120px
    );
    padding-top: 30px;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .completion-card {
    width: 100%;
  }

  .profile-grid,
  .resume-choice {
    grid-template-columns: 1fr;
  }

  .profile-section {
    padding: 20px;
  }

  .profile-submit {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .profile-submit button {
    width: 100%;
  }
}
`;