import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

const AVATAR_KEY = "engviva_profile_avatar_";

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

const ROLES = [
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
];

const SKILLS = [
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

const LANGUAGES = [
  "C",
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "Go",
  "Rust",
];

const DOMAINS = [
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

const LOCATIONS = [
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
];

const COMPANIES = [
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
];

function arr(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function initials(name) {
  const parts = String(name || "")
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

function normalize(data = {}) {
  const p = data.profile || {};
  const e = data.engineering || {};

  return {
    profile: {
      ...EMPTY_PROFILE,
      ...p,
      email: p.email || data.email || "",
    },

    engineering: {
      ...EMPTY_ENGINEERING,
      ...e,
      skills: arr(e.skills),
      preferredLocations: arr(e.preferredLocations),
      preferredCompanies: arr(e.preferredCompanies),
      codingLanguages: arr(e.codingLanguages),
      domains: arr(e.domains),
    },

    resume: data.resume || {},

    profileCompleted:
      data.profileCompleted === true,
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const avatarInput = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [engineering, setEngineering] = useState(
    EMPTY_ENGINEERING
  );
  const [resume, setResume] = useState({});

  const [avatar, setAvatar] = useState("");
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState("identity");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ============================================================
     AUTH + PROFILE LOAD
     ============================================================ */

  useEffect(() => {
    let alive = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!alive) return;

        if (!currentUser) {
          navigate("/login", { replace: true });
          return;
        }

        setUser(currentUser);

        const localAvatar = localStorage.getItem(
          AVATAR_KEY + currentUser.uid
        );

        if (localAvatar) {
          setAvatar(localAvatar);
        }

        await loadProfile(currentUser, alive);
      }
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [navigate]);

  async function loadProfile(currentUser, alive = true) {
    try {
      setLoading(true);
      setError("");

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${API_BASE}/api/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 404) {
        if (alive) {
          navigate("/profile-setup", {
            replace: true,
          });
        }
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error?.message ||
            "Unable to load profile."
        );
      }

      const data = result?.data || result;

      /*
       * IMPORTANT:
       * Profile screen does NOT decide completion
       * from random fields.
       *
       * Backend profileCompleted is authoritative.
       */

      if (data?.profileCompleted !== true) {
        if (alive) {
          navigate("/profile-setup", {
            replace: true,
          });
        }
        return;
      }

      const normalized = normalize(data);

      if (!alive) return;

      setProfile(normalized.profile);
      setEngineering(normalized.engineering);
      setResume(normalized.resume);
    } catch (err) {
      console.error("[ENGVIVA PROFILE]", err);

      if (alive) {
        setError(
          err.message || "Unable to load profile."
        );
      }
    } finally {
      if (alive) {
        setLoading(false);
      }
    }
  }

  /* ============================================================
     FIELD UPDATES
     ============================================================ */

  function updateProfile(field, value) {
    setProfile((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function updateEngineering(field, value) {
    setEngineering((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function toggle(field, value) {
    setEngineering((old) => {
      const current = arr(old[field]);
      const exists = current.includes(value);

      return {
        ...old,
        [field]: exists
          ? current.filter((x) => x !== value)
          : [...current, value],
      };
    });
  }

  /* ============================================================
     COMPLETION
     ============================================================ */

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

    const done = required.filter(Boolean).length;

    return Math.round(
      (done / required.length) * 100
    );
  }, [profile, engineering]);

  /* ============================================================
     SAVE
     ============================================================ */

  async function saveProfile() {
    if (!user || saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const missing = [];

      if (!profile.fullName.trim())
        missing.push("Full name");

      if (!profile.college.trim())
        missing.push("College");

      if (!profile.degree)
        missing.push("Degree");

      if (!profile.branch)
        missing.push("Branch");

      if (!profile.graduationYear)
        missing.push("Graduation year");

      if (!engineering.primaryRole)
        missing.push("Primary role");

      if (!engineering.skills?.length)
        missing.push("At least one technical skill");

      if (missing.length) {
        setError(
          `Complete: ${missing.join(", ")}`
        );

        setSection("identity");
        return;
      }

      const token = await user.getIdToken();

      /*
       * IMPORTANT:
       * Avatar is NOT included.
       * Resume PDF is NOT included.
       * Only resume text intelligence is included.
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
          skills: arr(engineering.skills),
          preferredLocations: arr(
            engineering.preferredLocations
          ),
          preferredCompanies: arr(
            engineering.preferredCompanies
          ),
          codingLanguages: arr(
            engineering.codingLanguages
          ),
          domains: arr(engineering.domains),
        },

        resume: {
          status:
            resume?.status ||
            "not_uploaded",

          rawText:
            resume?.rawText || "",

          parsed:
            resume?.parsed || {},
        },
      };

      const response = await fetch(
        `${API_BASE}/api/profile`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const result =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error?.message ||
            "Unable to save profile."
        );
      }

      const completed =
        result?.profileCompleted === true ||
        result?.data?.profileCompleted === true;

      if (!completed) {
        setError(
          "Profile saved, but the backend has not marked it as completed yet."
        );
        return;
      }

      setMessage(
        "Profile synchronized successfully."
      );

      setEditing(false);

      /*
       * SAVE → DASHBOARD
       */
      setTimeout(() => {
        navigate("/dashboard", {
          replace: true,
        });
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

  /* ============================================================
     LOCAL AVATAR
     ============================================================ */

  function uploadAvatar(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(
        "Profile image must be smaller than 2 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        localStorage.setItem(
          AVATAR_KEY + user.uid,
          reader.result
        );

        setAvatar(reader.result);

        setMessage(
          "Profile image stored locally on this device."
        );
      } catch {
        setError(
          "Could not store image locally."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    if (!user) return;

    localStorage.removeItem(
      AVATAR_KEY + user.uid
    );

    setAvatar("");
  }

  /* ============================================================
     NAVIGATION
     ============================================================ */

  async function logout() {
    try {
      await signOut(auth);

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error(err);
    }
  }

  function go(route) {
    navigate(route);
  }

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <>
        <style>{CSS}</style>

        <div className="pv-loading">
          <div className="pv-loader">
            <i />
            <i />
            <i />
          </div>

          <h2>
            Loading your engineering identity
          </h2>

          <p>
            Synchronizing with ENGVIVA...
          </p>
        </div>
      </>
    );
  }

  /* ============================================================
     UI
     ============================================================ */

  return (
    <>
      <style>{CSS}</style>

      <div className="pv-page">

        <div className="pv-orb pv-orb-one" />
        <div className="pv-orb pv-orb-two" />

        {/* SIDEBAR */}

        <aside className="pv-sidebar">

          <div className="pv-brand">
            <div className="pv-logo">
              E
            </div>

            <div>
              <b>ENGVIVA</b>
              <small>
                ENGINEERING INTELLIGENCE
              </small>
            </div>
          </div>

          <nav className="pv-nav">

            <Nav
              icon="⌂"
              text="Dashboard"
              onClick={() =>
                go("/dashboard")
              }
            />

            <Nav
              icon="◈"
              text="Companies"
              onClick={() =>
                go("/companies")
              }
            />

            <Nav
              icon="◆"
              text="Roles"
              onClick={() =>
                go("/roles")
              }
            />

            <Nav
              icon="⌁"
              text="Practice"
              onClick={() =>
                go("/practice")
              }
            />

            <Nav
              icon="◉"
              text="Interviews"
              onClick={() =>
                go("/interviews")
              }
            />

            <Nav
              icon="▤"
              text="Resume"
              onClick={() =>
                go("/resume")
              }
            />

            <Nav
              icon="◫"
              text="Reports"
              onClick={() =>
                go("/reports")
              }
            />

            <Nav
              icon="↗"
              text="Progress"
              onClick={() =>
                go("/progress")
              }
            />

            <Nav
              icon="◌"
              text="Notifications"
              onClick={() =>
                go("/notifications")
              }
            />

          </nav>

          <div className="pv-sidebar-bottom">

            <Nav
              icon="⚙"
              text="Settings"
              onClick={() =>
                go("/settings")
              }
            />

            <Nav
              icon="↪"
              text="Sign out"
              danger
              onClick={logout}
            />

          </div>

        </aside>

        {/* MAIN */}

        <main className="pv-main">

          <header className="pv-header">

            <div>
              <label>
                ENGINEERING IDENTITY
              </label>

              <h1>
                Your Profile
              </h1>

              <p>
                Your engineering identity powers
                company matching, role intelligence,
                practice and interview preparation.
              </p>
            </div>

            <div className="pv-actions">

              <button
                className="pv-secondary"
                onClick={() =>
                  go("/dashboard")
                }
              >
                Dashboard
              </button>

              {!editing ? (
                <button
                  className="pv-primary"
                  onClick={() =>
                    setEditing(true)
                  }
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  className="pv-primary"
                  disabled={saving}
                  onClick={saveProfile}
                >
                  {saving
                    ? "Synchronizing..."
                    : "Save Changes"}
                </button>
              )}

            </div>

          </header>

          {/* ALERT */}

          {(message || error) && (
            <div
              className={
                error
                  ? "pv-alert pv-alert-error"
                  : "pv-alert pv-alert-success"
              }
            >
              <strong>
                {error ? "!" : "✓"}
              </strong>

              <span>
                {error || message}
              </span>
            </div>
          )}

          {/* HERO */}

          <section className="pv-hero">

            <div className="pv-avatar-box">

              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                />
              ) : (
                <div className="pv-avatar-fallback">
                  {initials(
                    profile.fullName
                  )}
                </div>
              )}

              {editing && (
                <button
                  className="pv-avatar-add"
                  onClick={() =>
                    avatarInput.current?.click()
                  }
                >
                  +
                </button>
              )}

              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                hidden
                onChange={uploadAvatar}
              />

              {editing && (
                <div className="pv-avatar-actions">
                  <button
                    onClick={() =>
                      avatarInput.current?.click()
                    }
                  >
                    Change
                  </button>

                  {avatar && (
                    <button
                      onClick={removeAvatar}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              <small>
                Local device only
              </small>

            </div>

            <div className="pv-identity">

              <div className="pv-name-line">

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

                <span className="pv-verified">
                  ✓ PROFILE VERIFIED
                </span>

              </div>

              <div className="pv-meta">

                <span>
                  ✉{" "}
                  {profile.email ||
                    user?.email ||
                    "No email"}
                </span>

                <span>
                  ◇{" "}
                  {profile.college ||
                    "College not configured"}
                </span>

                <span>
                  ◎{" "}
                  {profile.branch ||
                    "Branch not configured"}
                </span>

                <span>
                  ◷{" "}
                  {profile.graduationYear ||
                    "Graduation year"}
                </span>

              </div>

              <div className="pv-strength">

                <div>
                  <span>
                    PROFILE STRENGTH
                  </span>

                  <b>
                    {completion}%
                  </b>
                </div>

                <div className="pv-progress">
                  <div
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>

              </div>

            </div>

          </section>

          {/* TABS */}

          <div className="pv-tabs">

            {[
              ["identity", "Identity"],
              ["education", "Education"],
              ["engineering", "Engineering"],
              ["career", "Career"],
              ["resume", "Resume Intelligence"],
            ].map(([key, text]) => (
              <button
                key={key}
                className={
                  section === key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSection(key)
                }
              >
                {text}
              </button>
            ))}

          </div>

          {/* IDENTITY */}

          {section === "identity" && (
            <Panel
              number="01"
              title="Personal Identity"
              description="The information used across your ENGVIVA candidate identity."
            >

              <div className="pv-grid">

                <Field
                  label="Full Name"
                  value={profile.fullName}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "fullName",
                      v
                    )
                  }
                />

                <Field
                  label="Email"
                  value={
                    profile.email ||
                    user?.email
                  }
                  disabled
                  hint="Firebase Authentication"
                />

                <Field
                  label="Phone"
                  value={profile.phone}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "phone",
                      v
                    )
                  }
                />

                <Field
                  label="Location"
                  value={profile.location}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "location",
                      v
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
                  onChange={(v) =>
                    updateProfile(
                      "dateOfBirth",
                      v
                    )
                  }
                />

                <Select
                  label="Gender"
                  value={profile.gender}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "gender",
                      v
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

              <TextArea
                label="Professional Bio"
                value={profile.bio}
                disabled={!editing}
                onChange={(v) =>
                  updateProfile(
                    "bio",
                    v
                  )
                }
                placeholder="Describe your engineering journey..."
              />

            </Panel>
          )}

          {/* EDUCATION */}

          {section === "education" && (
            <Panel
              number="02"
              title="Engineering Education"
              description="Your academic foundation for role matching and preparation."
            >

              <div className="pv-grid">

                <Field
                  label="College / University"
                  value={profile.college}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "college",
                      v
                    )
                  }
                />

                <Select
                  label="Degree"
                  value={profile.degree}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "degree",
                      v
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
                  onChange={(v) =>
                    updateProfile(
                      "branch",
                      v
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
                  onChange={(v) =>
                    updateProfile(
                      "graduationYear",
                      v
                    )
                  }
                />

                <Field
                  label="CGPA"
                  value={profile.cgpa}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "cgpa",
                      v
                    )
                  }
                />

                <Field
                  label="10th Percentage"
                  value={
                    profile.tenthPercentage
                  }
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "tenthPercentage",
                      v
                    )
                  }
                />

                <Field
                  label="12th Percentage"
                  value={
                    profile.twelfthPercentage
                  }
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "twelfthPercentage",
                      v
                    )
                  }
                />

              </div>

            </Panel>
          )}

          {/* ENGINEERING */}

          {section === "engineering" && (
            <Panel
              number="03"
              title="Engineering Intelligence"
              description="Technical abilities used to personalize your preparation."
            >

              <div className="pv-grid">

                <Select
                  label="Primary Target Role"
                  value={
                    engineering.primaryRole
                  }
                  disabled={!editing}
                  onChange={(v) =>
                    updateEngineering(
                      "primaryRole",
                      v
                    )
                  }
                  options={[
                    "",
                    ...ROLES,
                  ]}
                />

                <Select
                  label="Secondary Target Role"
                  value={
                    engineering.secondaryRole
                  }
                  disabled={!editing}
                  onChange={(v) =>
                    updateEngineering(
                      "secondaryRole",
                      v
                    )
                  }
                  options={[
                    "",
                    ...ROLES,
                  ]}
                />

                <Select
                  label="Experience Level"
                  value={
                    engineering.experienceLevel
                  }
                  disabled={!editing}
                  onChange={(v) =>
                    updateEngineering(
                      "experienceLevel",
                      v
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

              <Chips
                title="Technical Skills"
                options={SKILLS}
                selected={
                  engineering.skills
                }
                disabled={!editing}
                onToggle={(v) =>
                  toggle(
                    "skills",
                    v
                  )
                }
              />

              <Chips
                title="Programming Languages"
                options={LANGUAGES}
                selected={
                  engineering.codingLanguages
                }
                disabled={!editing}
                onToggle={(v) =>
                  toggle(
                    "codingLanguages",
                    v
                  )
                }
              />

              <Chips
                title="Engineering Domains"
                options={DOMAINS}
                selected={
                  engineering.domains
                }
                disabled={!editing}
                onToggle={(v) =>
                  toggle(
                    "domains",
                    v
                  )
                }
              />

            </Panel>
          )}

          {/* CAREER */}

          {section === "career" && (
            <Panel
              number="04"
              title="Career Preferences"
              description="These preferences influence company and role recommendations."
            >

              <Chips
                title="Preferred Locations"
                options={LOCATIONS}
                selected={
                  engineering.preferredLocations
                }
                disabled={!editing}
                onToggle={(v) =>
                  toggle(
                    "preferredLocations",
                    v
                  )
                }
              />

              <Chips
                title="Preferred Companies"
                options={COMPANIES}
                selected={
                  engineering.preferredCompanies
                }
                disabled={!editing}
                onToggle={(v) =>
                  toggle(
                    "preferredCompanies",
                    v
                  )
                }
              />

              <div className="pv-grid pv-career-links">

                <Field
                  label="LinkedIn"
                  value={profile.linkedin}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "linkedin",
                      v
                    )
                  }
                />

                <Field
                  label="GitHub"
                  value={profile.github}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "github",
                      v
                    )
                  }
                />

                <Field
                  label="Portfolio"
                  value={profile.portfolio}
                  disabled={!editing}
                  onChange={(v) =>
                    updateProfile(
                      "portfolio",
                      v
                    )
                  }
                />

              </div>

            </Panel>
          )}

          {/* RESUME */}

          {section === "resume" && (
            <Panel
              number="05"
              title="Resume Intelligence"
              description="ENGVIVA uses extracted resume text for intelligence. The original PDF is not stored here."
            >

              <div className="pv-resume-card">

                <div className="pv-resume-icon">
                  CV
                </div>

                <div>
                  <small>
                    RESUME INTELLIGENCE
                  </small>

                  <h3>
                    {resume?.rawText
                      ? "Resume text available"
                      : "No resume intelligence yet"}
                  </h3>

                  <p>
                    {resume?.rawText
                      ? `${resume.rawText.length.toLocaleString()} characters extracted`
                      : "Open Resume to process your resume."}
                  </p>
                </div>

                <button
                  className="pv-primary"
                  onClick={() =>
                    go("/resume")
                  }
                >
                  Open Resume
                </button>

              </div>

              {resume?.rawText && (
                <div className="pv-resume-preview">

                  <div>
                    EXTRACTED TEXT · READ ONLY
                  </div>

                  <p>
                    {resume.rawText.slice(
                      0,
                      2000
                    )}

                    {resume.rawText.length >
                    2000
                      ? "..."
                      : ""}
                  </p>

                </div>
              )}

            </Panel>
          )}

          {/* SAVE BAR */}

          {editing && (
            <div className="pv-savebar">

              <div>
                <b>
                  Unsaved changes
                </b>

                <span>
                  Save to synchronize with
                  your ENGVIVA profile.
                </span>
              </div>

              <div>

                <button
                  className="pv-secondary"
                  disabled={saving}
                  onClick={() => {
                    if (user) {
                      loadProfile(user);
                    }

                    setEditing(false);
                    setMessage("");
                    setError("");
                  }}
                >
                  Discard
                </button>

                <button
                  className="pv-primary"
                  disabled={saving}
                  onClick={saveProfile}
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
    </>
  );
}

/* ==============================================================
   COMPONENTS
   ============================================================== */

function Nav({
  icon,
  text,
  onClick,
  danger = false,
}) {
  return (
    <button
      className={
        danger ? "pv-nav-danger" : ""
      }
      onClick={onClick}
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}

function Panel({
  number,
  title,
  description,
  children,
}) {
  return (
    <section className="pv-panel">

      <div className="pv-panel-header">

        <div className="pv-number">
          {number}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

      </div>

      {children}

    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  hint,
}) {
  return (
    <label className="pv-field">

      <span>{label}</span>

      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
      />

      {hint && (
        <small>{hint}</small>
      )}

    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) {
  return (
    <label className="pv-field">

      <span>{label}</span>

      <select
        value={value || ""}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option || `Select ${label}`}
          </option>
        ))}
      </select>

    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}) {
  return (
    <label className="pv-field pv-full">

      <span>{label}</span>

      <textarea
        value={value || ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

    </label>
  );
}

function Chips({
  title,
  options,
  selected = [],
  onToggle,
  disabled,
}) {
  return (
    <div className="pv-chip-section">

      <div className="pv-chip-title">
        {title}
      </div>

      <div className="pv-chips">

        {options.map((option) => {
          const active =
            selected.includes(option);

          return (
            <button
              key={option}
              disabled={disabled}
              className={
                active
                  ? "pv-chip active"
                  : "pv-chip"
              }
              onClick={() =>
                onToggle(option)
              }
            >
              {active && "✓ "}
              {option}
            </button>
          );
        })}

      </div>

    </div>
  );
}

/* ==============================================================
   ALL CSS IN SAME FILE
   ============================================================== */

const CSS = `
* {
  box-sizing: border-box;
}

.pv-page {
  min-height: 100vh;
  color: #f4effc;
  background:
    radial-gradient(
      circle at 80% 5%,
      rgba(164, 103, 255, .17),
      transparent 32%
    ),
    radial-gradient(
      circle at 10% 90%,
      rgba(93, 69, 180, .12),
      transparent 30%
    ),
    #07060b;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  overflow-x: hidden;
}

.pv-orb {
  position: fixed;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(110px);
  opacity: .1;
  pointer-events: none;
  z-index: 0;
}

.pv-orb-one {
  background: #a15cff;
  top: -230px;
  right: 0;
}

.pv-orb-two {
  background: #5b42d8;
  bottom: -250px;
  left: 20%;
}

.pv-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 250px;
  padding: 25px 17px;
  display: flex;
  flex-direction: column;
  z-index: 20;
  background: rgba(9, 8, 14, .84);
  border-right: 1px solid rgba(255,255,255,.07);
  backdrop-filter: blur(25px);
}

.pv-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 30px;
}

.pv-logo {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #180d25;
  background: linear-gradient(135deg,#ebd9ff,#9561ed);
  font-size: 20px;
  font-weight: 950;
  box-shadow: 0 10px 35px rgba(150,90,240,.25);
}

.pv-brand b {
  display: block;
  font-size: 16px;
  letter-spacing: .14em;
}

.pv-brand small {
  display: block;
  margin-top: 4px;
  color: #716b7c;
  font-size: 8px;
  letter-spacing: .1em;
}

.pv-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pv-nav button,
.pv-sidebar-bottom button {
  min-height: 45px;
  padding: 0 13px;
  border: 0;
  border-radius: 11px;
  color: #858091;
  background: transparent;
  text-align: left;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: .2s ease;
}

.pv-nav button:hover,
.pv-sidebar-bottom button:hover {
  color: #fff;
  background: rgba(255,255,255,.055);
  transform: translateX(3px);
}

.pv-nav button span,
.pv-sidebar-bottom button span {
  display: inline-block;
  width: 30px;
  color: #ae7bff;
  font-size: 16px;
}

.pv-nav-danger {
  color: #b77784 !important;
}

.pv-sidebar-bottom {
  margin-top: auto;
}

.pv-main {
  position: relative;
  z-index: 1;
  width: calc(100% - 250px);
  margin-left: 250px;
  min-height: 100vh;
  padding: 45px 50px 130px;
}

.pv-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 25px;
  margin-bottom: 28px;
}

.pv-header label {
  color: #a875ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .2em;
}

.pv-header h1 {
  margin: 8px 0 0;
  font-size: clamp(35px,4vw,52px);
  line-height: 1;
  letter-spacing: -.055em;
}

.pv-header p {
  max-width: 700px;
  margin: 14px 0 0;
  color: #817b8c;
  font-size: 13px;
  line-height: 1.6;
}

.pv-actions {
  display: flex;
  gap: 9px;
}

.pv-primary,
.pv-secondary {
  min-height: 43px;
  padding: 0 17px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition: .2s ease;
}

.pv-primary {
  color: #170d22;
  border: 0;
  background: linear-gradient(135deg,#e8d5ff,#a26cf3);
  box-shadow: 0 12px 30px rgba(153,94,240,.18);
}

.pv-secondary {
  color: #d6d0df;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(255,255,255,.045);
}

.pv-primary:hover,
.pv-secondary:hover {
  transform: translateY(-2px);
}

.pv-primary:disabled,
.pv-secondary:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.pv-alert {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
  padding: 13px 16px;
  border-radius: 13px;
  font-size: 12px;
}

.pv-alert strong {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.pv-alert-success {
  color: #caffdf;
  border: 1px solid rgba(70,210,135,.16);
  background: rgba(70,210,135,.07);
}

.pv-alert-success strong {
  background: rgba(70,210,135,.15);
}

.pv-alert-error {
  color: #ffd4dc;
  border: 1px solid rgba(255,70,100,.16);
  background: rgba(255,70,100,.07);
}

.pv-alert-error strong {
  background: rgba(255,70,100,.15);
}

.pv-hero {
  display: flex;
  align-items: center;
  gap: 30px;
  min-height: 225px;
  padding: 28px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 23px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,.07),
    rgba(255,255,255,.025)
  );
  box-shadow: 0 25px 70px rgba(0,0,0,.25);
  backdrop-filter: blur(25px);
}

.pv-avatar-box {
  position: relative;
  min-width: 135px;
  text-align: center;
}

.pv-avatar-box img,
.pv-avatar-fallback {
  width: 120px;
  height: 120px;
  border-radius: 34px;
  border: 2px solid rgba(190,145,255,.4);
  box-shadow: 0 20px 55px rgba(121,70,220,.2);
}

.pv-avatar-box img {
  display: block;
  object-fit: cover;
}

.pv-avatar-fallback {
  display: grid;
  place-items: center;
  color: #1a1024;
  background: linear-gradient(135deg,#ead9ff,#9a65ee);
  font-size: 35px;
  font-weight: 950;
}

.pv-avatar-add {
  position: absolute;
  right: 1px;
  bottom: 22px;
  width: 35px;
  height: 35px;
  border: 3px solid #0c0a11;
  border-radius: 50%;
  color: #1a1024;
  background: #d4b4ff;
  font-size: 21px;
  cursor: pointer;
}

.pv-avatar-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 9px;
}

.pv-avatar-actions button {
  border: 0;
  color: #b993f0;
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}

.pv-avatar-box > small {
  display: block;
  margin-top: 6px;
  color: #65606e;
  font-size: 8px;
}

.pv-identity {
  flex: 1;
}

.pv-name-line {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.pv-name-line h2 {
  margin: 0;
  font-size: 29px;
  letter-spacing: -.035em;
}

.pv-name-line p {
  margin: 6px 0 0;
  color: #ae7cff;
  font-size: 13px;
  font-weight: 750;
}

.pv-verified {
  align-self: flex-start;
  padding: 7px 10px;
  border: 1px solid rgba(76,213,140,.17);
  border-radius: 999px;
  color: #aef6cb;
  background: rgba(76,213,140,.07);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
  white-space: nowrap;
}

.pv-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 23px;
}

.pv-meta span {
  padding: 8px 11px;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 9px;
  color: #9e98a8;
  background: rgba(255,255,255,.025);
  font-size: 10px;
}

.pv-strength {
  margin-top: 21px;
}

.pv-strength > div:first-child {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #777180;
  font-size: 9px;
  font-weight: 850;
}

.pv-strength b {
  color: #d2b2ff;
}

.pv-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255,255,255,.07);
}

.pv-progress div {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg,#7c4dd8,#d7b7ff);
  transition: width .4s ease;
}

.pv-tabs {
  display: flex;
  gap: 4px;
  padding: 5px;
  margin-bottom: 20px;
  overflow-x: auto;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px;
  background: rgba(255,255,255,.025);
}

.pv-tabs button {
  min-height: 38px;
  padding: 0 15px;
  border: 0;
  border-radius: 9px;
  color: #777181;
  background: transparent;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.pv-tabs button.active {
  color: #e4d4fa;
  background: rgba(160,106,244,.12);
}

.pv-panel {
  padding: 28px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,.065),
    rgba(255,255,255,.02)
  );
  box-shadow: 0 25px 70px rgba(0,0,0,.2);
  backdrop-filter: blur(25px);
  animation: pvIn .3s ease;
}

@keyframes pvIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pv-panel-header {
  display: flex;
  gap: 14px;
  margin-bottom: 27px;
}

.pv-number {
  width: 37px;
  height: 37px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(168,119,255,.15);
  border-radius: 11px;
  color: #bd91ff;
  background: rgba(168,119,255,.08);
  font-size: 10px;
  font-weight: 900;
}

.pv-panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.pv-panel-header p {
  max-width: 680px;
  margin: 5px 0 0;
  color: #777180;
  font-size: 11px;
  line-height: 1.6;
}

.pv-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 17px;
}

.pv-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pv-field > span {
  color: #a39cae;
  font-size: 10px;
  font-weight: 800;
}

.pv-field input,
.pv-field select,
.pv-field textarea {
  width: 100%;
  color: #eeeaf4;
  outline: none;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 11px;
  background: rgba(0,0,0,.19);
  font: inherit;
  font-size: 12px;
}

.pv-field input,
.pv-field select {
  height: 46px;
  padding: 0 13px;
}

.pv-field textarea {
  min-height: 120px;
  padding: 13px;
  resize: vertical;
  line-height: 1.6;
}

.pv-field input:focus,
.pv-field select:focus,
.pv-field textarea:focus {
  border-color: rgba(174,126,255,.5);
  box-shadow: 0 0 0 3px rgba(174,126,255,.07);
}

.pv-field input:disabled,
.pv-field select:disabled,
.pv-field textarea:disabled {
  opacity: .68;
}

.pv-field small {
  color: #66606e;
  font-size: 9px;
}

.pv-full {
  margin-top: 18px;
}

.pv-chip-section {
  margin-top: 27px;
}

.pv-chip-title {
  margin-bottom: 11px;
  color: #a39cae;
  font-size: 10px;
  font-weight: 850;
}

.pv-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.pv-chip {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 9px;
  color: #87808f;
  background: rgba(255,255,255,.025);
  font-size: 10px;
  cursor: pointer;
  transition: .18s ease;
}

.pv-chip:hover:not(:disabled) {
  color: #eee7f7;
  transform: translateY(-1px);
}

.pv-chip.active {
  color: #e8d7ff;
  border-color: rgba(174,126,255,.3);
  background: rgba(160,105,244,.13);
}

.pv-chip:disabled {
  cursor: default;
}

.pv-career-links {
  margin-top: 27px;
}

.pv-resume-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 16px;
  background: rgba(255,255,255,.03);
}

.pv-resume-icon {
  width: 51px;
  height: 51px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #d3b2ff;
  background: rgba(161,105,244,.11);
  font-size: 11px;
  font-weight: 900;
}

.pv-resume-card small {
  color: #726b7c;
  font-size: 8px;
  letter-spacing: .1em;
}

.pv-resume-card h3 {
  margin: 4px 0;
  font-size: 14px;
}

.pv-resume-card p {
  margin: 0;
  color: #706a79;
  font-size: 10px;
}

.pv-resume-card .pv-primary {
  margin-left: auto;
}

.pv-resume-preview {
  margin-top: 17px;
  padding: 18px;
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 14px;
  background: rgba(0,0,0,.17);
}

.pv-resume-preview > div {
  color: #777080;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .1em;
}

.pv-resume-preview p {
  margin: 12px 0 0;
  color: #918a9b;
  white-space: pre-wrap;
  font-size: 11px;
  line-height: 1.7;
}

.pv-savebar {
  position: fixed;
  left: 300px;
  right: 50px;
  bottom: 18px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 17px;
  border: 1px solid rgba(170,120,255,.2);
  border-radius: 16px;
  background: rgba(16,12,24,.9);
  box-shadow: 0 20px 70px rgba(0,0,0,.45);
  backdrop-filter: blur(25px);
}

.pv-savebar b {
  display: block;
  font-size: 11px;
}

.pv-savebar span {
  display: block;
  margin-top: 3px;
  color: #706978;
  font-size: 9px;
}

.pv-savebar > div:last-child {
  display: flex;
  gap: 7px;
}

.pv-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #eee8f7;
  background: #07060b;
}

.pv-loading h2 {
  margin: 16px 0 5px;
  font-size: 17px;
}

.pv-loading p {
  margin: 0;
  color: #706979;
  font-size: 11px;
}

.pv-loader {
  position: relative;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(175,125,255,.2);
  border-radius: 50%;
  animation: pvSpin 1.8s linear infinite;
}

.pv-loader i {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c39bff;
  box-shadow: 0 0 18px rgba(195,155,255,.8);
}

.pv-loader i:nth-child(1) {
  top: -4px;
  left: 25px;
}

.pv-loader i:nth-child(2) {
  bottom: 5px;
  left: -1px;
}

.pv-loader i:nth-child(3) {
  right: -1px;
  bottom: 5px;
}

@keyframes pvSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1050px) {
  .pv-sidebar {
    width: 215px;
  }

  .pv-main {
    width: calc(100% - 215px);
    margin-left: 215px;
    padding: 35px 25px 130px;
  }

  .pv-savebar {
    left: 235px;
    right: 25px;
  }
}

@media (max-width: 800px) {
  .pv-sidebar {
    position: relative;
    width: 100%;
    height: auto;
    padding: 14px;
    border-right: 0;
    border-bottom: 1px solid rgba(255,255,255,.07);
  }

  .pv-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .pv-nav button {
    min-width: max-content;
  }

  .pv-sidebar-bottom {
    display: none;
  }

  .pv-main {
    width: 100%;
    margin-left: 0;
    padding: 25px 17px 140px;
  }

  .pv-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .pv-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .pv-grid {
    grid-template-columns: 1fr;
  }

  .pv-savebar {
    left: 12px;
    right: 12px;
    bottom: 10px;
  }
}

@media (max-width: 520px) {
  .pv-header h1 {
    font-size: 36px;
  }

  .pv-actions {
    width: 100%;
  }

  .pv-actions button {
    flex: 1;
  }

  .pv-name-line {
    flex-direction: column;
  }

  .pv-resume-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .pv-resume-card .pv-primary {
    margin-left: 0;
  }

  .pv-savebar {
    flex-direction: column;
    align-items: stretch;
  }

  .pv-savebar > div:last-child {
    width: 100%;
  }

  .pv-savebar button {
    flex: 1;
  }
}
`;