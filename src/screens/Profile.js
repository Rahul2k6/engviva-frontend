import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import "./Profile.css";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const LOCAL_AVATAR_PREFIX = "engviva_profile_avatar_";

const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  dateOfBirth: "",
  gender: "",
  college: "",
  degree: "B.Tech",
  branch: "",
  graduationYear: "",
  cgpa: "",
  tenthPercentage: "",
  twelfthPercentage: "",
  linkedin: "",
  github: "",
  portfolio: "",
  bio: "",
};

const EMPTY_ENGINEERING = {
  primaryRole: "",
  secondaryRole: "",
  experienceLevel: "Fresher",
  skills: [],
  preferredLocations: [],
  preferredCompanies: [],
  codingLanguages: [],
  domains: [],
};

const ROLE_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Cyber Security Engineer",
  "Mobile App Developer",
  "UI/UX Engineer",
];

const SKILL_OPTIONS = [
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express",
  "SQL",
  "MongoDB",
  "Firebase",
  "Git",
  "GitHub",
  "Docker",
  "AWS",
  "Azure",
  "Machine Learning",
  "Deep Learning",
  "Data Structures",
  "Algorithms",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "System Design",
];

const LANGUAGE_OPTIONS = [
  "C",
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "Go",
  "Rust",
];

const DOMAIN_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "AI / ML",
  "Data Science",
  "Cloud",
  "Cyber Security",
  "DevOps",
  "Backend",
  "Frontend",
  "Software Engineering",
];

function normaliseArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getInitials(name = "") {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "E";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function mergeProfile(data = {}) {
  const profile = data.profile || {};
  const engineering = data.engineering || {};

  return {
    profile: {
      ...EMPTY_PROFILE,
      ...profile,
      email:
        profile.email ||
        data.email ||
        "",
    },

    engineering: {
      ...EMPTY_ENGINEERING,
      ...engineering,

      skills: normaliseArray(
        engineering.skills
      ),

      preferredLocations:
        normaliseArray(
          engineering.preferredLocations
        ),

      preferredCompanies:
        normaliseArray(
          engineering.preferredCompanies
        ),

      codingLanguages:
        normaliseArray(
          engineering.codingLanguages
        ),

      domains:
        normaliseArray(
          engineering.domains
        ),
    },

    profileCompleted:
      data.profileCompleted === true,

    resume:
      data.resume || {},
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] =
    useState(EMPTY_PROFILE);

  const [engineering, setEngineering] =
    useState(EMPTY_ENGINEERING);

  const [resume, setResume] =
    useState({});

  const [profileCompleted, setProfileCompleted] =
    useState(false);

  const [avatar, setAvatar] =
    useState("");

  const [activeSection, setActiveSection] =
    useState("identity");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [editing, setEditing] =
    useState(false);

  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!mounted) return;

          if (!currentUser) {
            navigate("/login", {
              replace: true,
            });
            return;
          }

          setUser(currentUser);

          /*
           * Avatar intentionally stays local.
           * It never goes to Firebase or Render.
           */

          const localAvatar =
            localStorage.getItem(
              LOCAL_AVATAR_PREFIX +
                currentUser.uid
            );

          if (localAvatar) {
            setAvatar(localAvatar);
          }

          await loadProfile(
            currentUser,
            mounted
          );
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate]);

  /*
   * ============================================================
   * LOAD PROFILE
   * ============================================================
   */

  async function loadProfile(
    currentUser,
    mounted = true
  ) {
    try {
      setLoading(true);
      setError("");

      const token =
        await currentUser.getIdToken();

      const response =
        await fetch(
          `${API_BASE}/api/profile`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      /*
       * User does not have a profile yet.
       *
       * ProfileSetup is responsible for creating it.
       */

      if (response.status === 404) {
        if (mounted) {
          navigate(
            "/profile-setup",
            {
              replace: true,
            }
          );
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to load engineering profile."
        );
      }

      const result =
        await response.json();

      const data =
        result?.data ||
        result;

      /*
       * IMPORTANT:
       *
       * Do NOT redirect based on whether random
       * fields exist.
       *
       * Backend's profileCompleted is the authority.
       */

      if (
        data?.profileCompleted !== true
      ) {
        if (mounted) {
          navigate(
            "/profile-setup",
            {
              replace: true,
            }
          );
        }

        return;
      }

      const merged =
        mergeProfile(data);

      if (!mounted) return;

      setProfile(
        merged.profile
      );

      setEngineering(
        merged.engineering
      );

      setResume(
        merged.resume
      );

      setProfileCompleted(
        merged.profileCompleted
      );

    } catch (err) {
      console.error(
        "[ENGVIVA PROFILE]",
        err
      );

      if (mounted) {
        setError(
          err.message ||
          "Unable to load profile."
        );
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }

  /*
   * ============================================================
   * FIELD HELPERS
   * ============================================================
   */

  function updateProfile(
    field,
    value
  ) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateEngineering(
    field,
    value
  ) {
    setEngineering(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  function toggleArrayValue(
    field,
    value
  ) {
    setEngineering(
      (previous) => {
        const current =
          normaliseArray(
            previous[field]
          );

        const exists =
          current.includes(value);

        return {
          ...previous,

          [field]: exists
            ? current.filter(
                (item) =>
                  item !== value
              )
            : [
                ...current,
                value,
              ],
        };
      }
    );
  }

  /*
   * ============================================================
   * PROFILE COMPLETION
   * ============================================================
   */

  const completion = useMemo(() => {
    const required = [
      profile.fullName,
      profile.college,
      profile.degree,
      profile.branch,
      profile.graduationYear,
      engineering.primaryRole,
      engineering.skills?.length
        ? "yes"
        : "",
    ];

    const completed =
      required.filter(Boolean)
        .length;

    return Math.round(
      (completed /
        required.length) *
        100
    );
  }, [
    profile,
    engineering,
  ]);

  /*
   * ============================================================
   * SAVE PROFILE
   * ============================================================
   */

  async function saveProfile() {
    if (!user) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      /*
       * Frontend validation.
       *
       * Backend performs the final validation.
       */

      const missing = [];

      if (!profile.fullName.trim()) {
        missing.push("Full name");
      }

      if (!profile.college.trim()) {
        missing.push("College");
      }

      if (!profile.degree) {
        missing.push("Degree");
      }

      if (!profile.branch) {
        missing.push("Branch");
      }

      if (!profile.graduationYear) {
        missing.push(
          "Graduation year"
        );
      }

      if (
        !engineering.primaryRole
      ) {
        missing.push(
          "Primary role"
        );
      }

      if (
        !engineering.skills?.length
      ) {
        missing.push(
          "At least one skill"
        );
      }

      if (missing.length) {
        setError(
          `Complete: ${missing.join(
            ", "
          )}`
        );

        setActiveSection(
          "identity"
        );

        return;
      }

      const token =
        await user.getIdToken();

      /*
       * Avatar is intentionally excluded.
       *
       * It remains in localStorage only.
       */

      const payload = {
        profile: {
          ...profile,

          email:
            user.email ||
            profile.email ||
            "",
        },

        engineering: {
          ...engineering,

          skills:
            normaliseArray(
              engineering.skills
            ),

          preferredLocations:
            normaliseArray(
              engineering.preferredLocations
            ),

          preferredCompanies:
            normaliseArray(
              engineering.preferredCompanies
            ),

          codingLanguages:
            normaliseArray(
              engineering.codingLanguages
            ),

          domains:
            normaliseArray(
              engineering.domains
            ),
        },

        /*
         * Resume is text intelligence only.
         * No PDF/blob/file is sent.
         */

        resume: {
          status:
            resume?.status ||
            "not_uploaded",

          rawText:
            resume?.rawText ||
            "",

          parsed:
            resume?.parsed ||
            {},
        },
      };

      const response =
        await fetch(
          `${API_BASE}/api/profile`,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
          result?.message ||
          "Unable to save profile."
        );
      }

      const completed =
        result?.profileCompleted === true ||
        result?.data?.profileCompleted === true;

      if (!completed) {
        setError(
          "Profile was saved, but the backend still reports incomplete information."
        );

        return;
      }

      setProfileCompleted(
        true
      );

      setEditing(false);

      setMessage(
        "Engineering profile synchronized successfully."
      );

      /*
       * Wait briefly so the success state is visible.
       */

      setTimeout(() => {
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      }, 700);

    } catch (err) {
      console.error(
        "[ENGVIVA PROFILE SAVE]",
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

  /*
   * ============================================================
   * LOCAL PROFILE IMAGE
   * ============================================================
   */

  function handleAvatarUpload(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );

      return;
    }

    /*
     * Keep local storage safe.
     */

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setError(
        "Profile image must be below 2 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const dataUrl =
        reader.result;

      if (!user) return;

      try {
        localStorage.setItem(
          LOCAL_AVATAR_PREFIX +
            user.uid,
          dataUrl
        );

        setAvatar(
          dataUrl
        );

        setMessage(
          "Profile photo saved locally on this device."
        );

      } catch (err) {
        console.error(err);

        setError(
          "Image could not be stored locally. Your browser storage may be full."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    if (!user) return;

    localStorage.removeItem(
      LOCAL_AVATAR_PREFIX +
        user.uid
    );

    setAvatar("");

    setMessage(
      "Local profile photo removed."
    );
  }

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  function goTo(route) {
    navigate(route);
  }

  async function handleLogout() {
    try {
      await signOut(auth);

      navigate(
        "/login",
        {
          replace: true,
        }
      );

    } catch (err) {
      console.error(
        "Logout error:",
        err
      );
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="profile-loading-screen">
        <div className="profile-loader-orbit">
          <div />
          <div />
          <div />
        </div>

        <h2>
          Loading engineering identity
        </h2>

        <p>
          Synchronizing your profile...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * MAIN UI
   * ============================================================
   */

  return (
    <div className="profile-page">

      {/* Background effects */}

      <div className="profile-noise" />
      <div className="profile-orb orb-one" />
      <div className="profile-orb orb-two" />

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="profile-sidebar">

        <div className="profile-brand">
          <div className="brand-mark">
            E
          </div>

          <div>
            <strong>
              ENGVIVA
            </strong>

            <span>
              ENGINEERING INTELLIGENCE
            </span>
          </div>
        </div>

        <nav className="profile-nav">

          <button
            onClick={() =>
              goTo("/dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              goTo("/companies")
            }
          >
            <span>◈</span>
            Companies
          </button>

          <button
            onClick={() =>
              goTo("/roles")
            }
          >
            <span>◆</span>
            Roles
          </button>

          <button
            onClick={() =>
              goTo("/practice")
            }
          >
            <span>⌁</span>
            Practice
          </button>

          <button
            onClick={() =>
              goTo("/interviews")
            }
          >
            <span>◉</span>
            Interviews
          </button>

          <button
            onClick={() =>
              goTo("/resume")
            }
          >
            <span>▤</span>
            Resume
          </button>

          <button
            onClick={() =>
              goTo("/reports")
            }
          >
            <span>◫</span>
            Reports
          </button>

          <button
            onClick={() =>
              goTo("/progress")
            }
          >
            <span>↗</span>
            Progress
          </button>

          <button
            onClick={() =>
              goTo("/notifications")
            }
          >
            <span>◌</span>
            Notifications
          </button>

        </nav>

        <div className="sidebar-bottom">

          <button
            onClick={() =>
              goTo("/settings")
            }
          >
            ⚙ Settings
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            ↪ Sign out
          </button>

        </div>

      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="profile-main">

        <header className="profile-header">

          <div>
            <div className="eyebrow">
              ENGINEERING IDENTITY
            </div>

            <h1>
              Your Profile
            </h1>

            <p>
              One identity. Every company,
              role, assessment and interview.
            </p>
          </div>

          <div className="header-actions">

            <button
              className="secondary-button"
              onClick={() =>
                goTo("/dashboard")
              }
            >
              Dashboard
            </button>

            {!editing ? (
              <button
                className="primary-button"
                onClick={() =>
                  setEditing(true)
                }
              >
                Edit Profile
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving
                  ? "Synchronizing..."
                  : "Save Changes"}
              </button>
            )}

          </div>

        </header>

        {/* ====================================================
            STATUS
        ==================================================== */}

        {(message || error) && (
          <div
            className={
              error
                ? "profile-alert error"
                : "profile-alert success"
            }
          >
            <span>
              {error ? "!" : "✓"}
            </span>

            <p>
              {error || message}
            </p>
          </div>
        )}

        {/* ====================================================
            HERO IDENTITY CARD
        ==================================================== */}

        <section className="identity-hero glass-card">

          <div className="identity-avatar-area">

            <div className="avatar-wrapper">

              {avatar ? (
                <img
                  src={avatar}
                  alt="Local profile"
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar avatar-fallback">
                  {getInitials(
                    profile.fullName
                  )}
                </div>
              )}

              {editing && (
                <button
                  className="avatar-edit"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  title="Change local profile photo"
                >
                  +
                </button>
              )}

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleAvatarUpload
              }
              hidden
            />

            <div className="avatar-controls">

              {editing && (
                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  Change photo
                </button>
              )}

              {avatar && (
                <button
                  onClick={
                    removeAvatar
                  }
                >
                  Remove
                </button>
              )}

              <small>
                Stored locally on this device
              </small>

            </div>

          </div>

          <div className="identity-summary">

            <div className="identity-name-row">

              <div>
                <h2>
                  {profile.fullName ||
                    "Engineering Candidate"}
                </h2>

                <p>
                  {engineering.primaryRole ||
                    "Target role not configured"}
                </p>
              </div>

              <span
                className={
                  profileCompleted
                    ? "status-pill verified"
                    : "status-pill"
                }
              >
                {profileCompleted
                  ? "PROFILE VERIFIED"
                  : "PROFILE INCOMPLETE"}
              </span>

            </div>

            <div className="identity-meta">

              <span>
                ✉ {profile.email ||
                  user?.email ||
                  "No email"}
              </span>

              <span>
                ◇ {profile.college ||
                  "College not configured"}
              </span>

              <span>
                ◎ {profile.branch ||
                  "Branch not configured"}
              </span>

              <span>
                ◷ {profile.graduationYear ||
                  "Graduation year"}
              </span>

            </div>

            <div className="completion-row">

              <div>
                <span>
                  Engineering profile strength
                </span>

                <strong>
                  {completion}%
                </strong>
              </div>

              <div className="completion-track">
                <div
                  style={{
                    width:
                      `${completion}%`,
                  }}
                />
              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            NAVIGATION TABS
        ==================================================== */}

        <div className="profile-tabs">

          <button
            className={
              activeSection === "identity"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection(
                "identity"
              )
            }
          >
            Identity
          </button>

          <button
            className={
              activeSection === "education"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection(
                "education"
              )
            }
          >
            Education
          </button>

          <button
            className={
              activeSection === "engineering"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection(
                "engineering"
              )
            }
          >
            Engineering
          </button>

          <button
            className={
              activeSection === "career"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection(
                "career"
              )
            }
          >
            Career
          </button>

          <button
            className={
              activeSection === "resume"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection(
                "resume"
              )
            }
          >
            Resume Intelligence
          </button>

        </div>

        {/* ====================================================
            IDENTITY
        ==================================================== */}

        {activeSection === "identity" && (
          <section className="glass-card profile-section">

            <SectionHeader
              number="01"
              title="Personal Identity"
              description="The information used across your ENGVIVA candidate identity."
            />

            <div className="form-grid">

              <Field
                label="Full Name"
                value={profile.fullName}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "fullName",
                    value
                  )
                }
              />

              <Field
                label="Email"
                value={
                  profile.email ||
                  user?.email ||
                  ""
                }
                disabled
                hint="Managed by Firebase Authentication"
              />

              <Field
                label="Phone"
                value={profile.phone}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "phone",
                    value
                  )
                }
              />

              <Field
                label="Location"
                value={profile.location}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "location",
                    value
                  )
                }
              />

              <Field
                label="Date of Birth"
                type="date"
                value={
                  profile.dateOfBirth
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "dateOfBirth",
                    value
                  )
                }
              />

              <SelectField
                label="Gender"
                value={profile.gender}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "gender",
                    value
                  )
                }
                options={[
                  "",
                  "Male",
                  "Female",
                  "Other",
                  "Prefer not to say",
                ]}
              />

            </div>

            <TextAreaField
              label="Professional Bio"
              value={profile.bio}
              disabled={!editing}
              onChange={(value) =>
                updateProfile(
                  "bio",
                  value
                )
              }
              placeholder="Tell recruiters and the interview engine about your engineering journey..."
            />

          </section>
        )}

        {/* ====================================================
            EDUCATION
        ==================================================== */}

        {activeSection === "education" && (
          <section className="glass-card profile-section">

            <SectionHeader
              number="02"
              title="Engineering Education"
              description="Your academic foundation used for role matching and interview preparation."
            />

            <div className="form-grid">

              <Field
                label="College / University"
                value={profile.college}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "college",
                    value
                  )
                }
              />

              <SelectField
                label="Degree"
                value={profile.degree}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "degree",
                    value
                  )
                }
                options={[
                  "B.Tech",
                  "B.E",
                  "M.Tech",
                  "MCA",
                  "BCA",
                  "M.Sc",
                  "Other",
                ]}
              />

              <Field
                label="Branch"
                value={profile.branch}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "branch",
                    value
                  )
                }
              />

              <Field
                label="Graduation Year"
                type="number"
                value={
                  profile.graduationYear
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "graduationYear",
                    value
                  )
                }
              />

              <Field
                label="CGPA"
                value={profile.cgpa}
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "cgpa",
                    value
                  )
                }
              />

              <Field
                label="10th Percentage"
                value={
                  profile.tenthPercentage
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "tenthPercentage",
                    value
                  )
                }
              />

              <Field
                label="12th Percentage"
                value={
                  profile.twelfthPercentage
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "twelfthPercentage",
                    value
                  )
                }
              />

            </div>

          </section>
        )}

        {/* ====================================================
            ENGINEERING
        ==================================================== */}

        {activeSection === "engineering" && (
          <section className="glass-card profile-section">

            <SectionHeader
              number="03"
              title="Engineering Intelligence"
              description="Skills, languages and technical domains used to personalize your preparation."
            />

            <div className="form-grid">

              <SelectField
                label="Primary Target Role"
                value={
                  engineering.primaryRole
                }
                disabled={!editing}
                onChange={(value) =>
                  updateEngineering(
                    "primaryRole",
                    value
                  )
                }
                options={[
                  "",
                  ...ROLE_OPTIONS,
                ]}
              />

              <SelectField
                label="Secondary Target Role"
                value={
                  engineering.secondaryRole
                }
                disabled={!editing}
                onChange={(value) =>
                  updateEngineering(
                    "secondaryRole",
                    value
                  )
                }
                options={[
                  "",
                  ...ROLE_OPTIONS,
                ]}
              />

              <SelectField
                label="Experience Level"
                value={
                  engineering.experienceLevel
                }
                disabled={!editing}
                onChange={(value) =>
                  updateEngineering(
                    "experienceLevel",
                    value
                  )
                }
                options={[
                  "Fresher",
                  "Intern",
                  "0–1 Years",
                  "1–3 Years",
                  "3+ Years",
                ]}
              />

            </div>

            <ChipSelector
              title="Technical Skills"
              options={SKILL_OPTIONS}
              selected={
                engineering.skills
              }
              disabled={!editing}
              onToggle={(value) =>
                toggleArrayValue(
                  "skills",
                  value
                )
              }
            />

            <ChipSelector
              title="Programming Languages"
              options={
                LANGUAGE_OPTIONS
              }
              selected={
                engineering.codingLanguages
              }
              disabled={!editing}
              onToggle={(value) =>
                toggleArrayValue(
                  "codingLanguages",
                  value
                )
              }
            />

            <ChipSelector
              title="Engineering Domains"
              options={
                DOMAIN_OPTIONS
              }
              selected={
                engineering.domains
              }
              disabled={!editing}
              onToggle={(value) =>
                toggleArrayValue(
                  "domains",
                  value
                )
              }
            />

          </section>
        )}

        {/* ====================================================
            CAREER
        ==================================================== */}

        {activeSection === "career" && (
          <section className="glass-card profile-section">

            <SectionHeader
              number="04"
              title="Career Preferences"
              description="Used to personalize companies, roles and recruitment preparation."
            />

            <ChipSelector
              title="Preferred Locations"
              options={[
                "Hyderabad",
                "Bengaluru",
                "Chennai",
                "Pune",
                "Mumbai",
                "Delhi NCR",
                "Noida",
                "Gurugram",
                "Remote",
                "Any Location",
              ]}
              selected={
                engineering.preferredLocations
              }
              disabled={!editing}
              onToggle={(value) =>
                toggleArrayValue(
                  "preferredLocations",
                  value
                )
              }
            />

            <ChipSelector
              title="Preferred Companies"
              options={[
                "Google",
                "Microsoft",
                "Amazon",
                "Apple",
                "Meta",
                "NVIDIA",
                "Infosys",
                "TCS",
                "Wipro",
                "Accenture",
                "Deloitte",
                "IBM",
              ]}
              selected={
                engineering.preferredCompanies
              }
              disabled={!editing}
              onToggle={(value) =>
                toggleArrayValue(
                  "preferredCompanies",
                  value
                )
              }
            />

            <div className="career-links">

              <Field
                label="LinkedIn"
                value={
                  profile.linkedin
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "linkedin",
                    value
                  )
                }
              />

              <Field
                label="GitHub"
                value={
                  profile.github
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "github",
                    value
                  )
                }
              />

              <Field
                label="Portfolio"
                value={
                  profile.portfolio
                }
                disabled={!editing}
                onChange={(value) =>
                  updateProfile(
                    "portfolio",
                    value
                  )
                }
              />

            </div>

          </section>
        )}

        {/* ====================================================
            RESUME INTELLIGENCE
        ==================================================== */}

        {activeSection === "resume" && (
          <section className="glass-card profile-section">

            <SectionHeader
              number="05"
              title="Resume Intelligence"
              description="ENGVIVA works with extracted resume text. The original PDF does not need to be stored here."
            />

            <div className="resume-intelligence">

              <div className="resume-status">

                <div className="resume-icon">
                  CV
                </div>

                <div>
                  <span>
                    ANALYSIS STATUS
                  </span>

                  <strong>
                    {resume?.rawText
                      ? "Resume intelligence available"
                      : "Resume intelligence not configured"}
                  </strong>

                  <p>
                    {resume?.rawText
                      ? `${resume.rawText.length.toLocaleString()} characters of extracted text`
                      : "Upload and process your resume from the Resume workspace."}
                  </p>
                </div>

              </div>

              <button
                className="primary-button"
                onClick={() =>
                  goTo("/resume")
                }
              >
                Open Resume Intelligence
              </button>

            </div>

            {resume?.rawText && (
              <div className="resume-preview">

                <div className="preview-header">
                  <span>
                    EXTRACTED INTELLIGENCE
                  </span>

                  <span>
                    READ ONLY
                  </span>
                </div>

                <p>
                  {resume.rawText.slice(
                    0,
                    1800
                  )}
                  {resume.rawText.length >
                  1800
                    ? "..."
                    : ""}
                </p>

              </div>
            )}

          </section>
        )}

        {/* ====================================================
            BOTTOM SAVE BAR
        ==================================================== */}

        {editing && (
          <div className="floating-save-bar">

            <div>
              <strong>
                Unsaved changes
              </strong>

              <span>
                Your changes remain local until
                you synchronize them.
              </span>
            </div>

            <div>

              <button
                className="secondary-button"
                onClick={() => {
                  if (user) {
                    loadProfile(
                      user
                    );
                  }

                  setEditing(false);
                }}
                disabled={saving}
              >
                Discard
              </button>

              <button
                className="primary-button"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save & Continue"}
              </button>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

/*
 * ==============================================================
 * REUSABLE COMPONENTS
 * ==============================================================
 */

function SectionHeader({
  number,
  title,
  description,
}) {
  return (
    <div className="section-header">

      <div className="section-number">
        {number}
      </div>

      <div>
        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>
      </div>

    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  hint = "",
}) {
  return (
    <label className="form-field">

      <span>
        {label}
      </span>

      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(event) =>
          onChange?.(
            event.target.value
          )
        }
      />

      {hint && (
        <small>
          {hint}
        </small>
      )}

    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) {
  return (
    <label className="form-field">

      <span>
        {label}
      </span>

      <select
        value={value || ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option ||
                `Select ${label}`}
            </option>
          )
        )}
      </select>

    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}) {
  return (
    <label className="form-field full-field">

      <span>
        {label}
      </span>

      <textarea
        value={value || ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

    </label>
  );
}

function ChipSelector({
  title,
  options,
  selected = [],
  onToggle,
  disabled,
}) {
  return (
    <div className="chip-section">

      <div className="chip-title">
        {title}
      </div>

      <div className="chip-grid">

        {options.map(
          (option) => {
            const active =
              selected.includes(
                option
              );

            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                className={
                  active
                    ? "chip active"
                    : "chip"
                }
                onClick={() =>
                  onToggle(
                    option
                  )
                }
              >
                {active && (
                  <span>
                    ✓
                  </span>
                )}

                {option}
              </button>
            );
          }
        )}

      </div>

    </div>
  );
}