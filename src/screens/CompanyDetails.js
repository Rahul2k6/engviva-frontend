import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { auth } from "../firebase";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

/*
  IMPORTANT

  This page intentionally DOES NOT call:

      /api/role-preparation

  The CompanyDetails screen is only a company hub.

  Heavy question retrieval happens after entering
  Aptitude / Technical / Coding / Interview.
*/

/* =========================================================
   FALLBACK COMPANY DATA
   Used only if backend company endpoint is unavailable.
========================================================= */

const FALLBACK_COMPANIES = {
  google: {
    id: "google",
    name: "Google",
    domain: "google.com",
    category: "Technology",
    description:
      "Software, cloud, artificial intelligence, data and large-scale engineering preparation.",
    headquarters: "Mountain View, California",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "ML Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
  },

  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    domain: "microsoft.com",
    category: "Technology",
    description:
      "Software engineering, cloud, AI, infrastructure and enterprise technology preparation.",
    headquarters: "Redmond, Washington",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "AI Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
  },

  amazon: {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    category: "Technology",
    description:
      "Software, cloud, distributed systems, data and large-scale engineering preparation.",
    headquarters: "Seattle, Washington",
    roles: [
      "Software Development Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Solutions Architect",
    ],
  },

  apple: {
    id: "apple",
    name: "Apple",
    domain: "apple.com",
    category: "Technology",
    description:
      "Software, systems, platform, mobile and machine-learning engineering preparation.",
    headquarters: "Cupertino, California",
    roles: [
      "Software Engineer",
      "iOS Developer",
      "Systems Engineer",
      "ML Engineer",
    ],
  },

  meta: {
    id: "meta",
    name: "Meta",
    domain: "meta.com",
    category: "Technology",
    description:
      "Software, AI, infrastructure, backend and product engineering preparation.",
    headquarters: "Menlo Park, California",
    roles: [
      "Software Engineer",
      "ML Engineer",
      "Data Engineer",
      "Infrastructure Engineer",
    ],
  },

  nvidia: {
    id: "nvidia",
    name: "NVIDIA",
    domain: "nvidia.com",
    category: "AI & Semiconductor",
    description:
      "GPU computing, artificial intelligence, systems and high-performance engineering preparation.",
    headquarters: "Santa Clara, California",
    roles: [
      "Software Engineer",
      "AI Engineer",
      "ML Engineer",
      "Systems Engineer",
    ],
  },

  ibm: {
    id: "ibm",
    name: "IBM",
    domain: "ibm.com",
    category: "Technology",
    description:
      "Enterprise software, cloud, AI, cybersecurity and consulting engineering preparation.",
    headquarters: "Armonk, New York",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "AI Engineer",
      "Cybersecurity Engineer",
    ],
  },

  oracle: {
    id: "oracle",
    name: "Oracle",
    domain: "oracle.com",
    category: "Enterprise",
    description:
      "Cloud infrastructure, databases, enterprise software and backend engineering preparation.",
    headquarters: "Austin, Texas",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Database Engineer",
      "DevOps Engineer",
    ],
  },

  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    domain: "salesforce.com",
    category: "SaaS",
    description:
      "Cloud software, enterprise applications, platform and backend engineering preparation.",
    headquarters: "San Francisco, California",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Cloud Engineer",
      "Data Engineer",
    ],
  },

  adobe: {
    id: "adobe",
    name: "Adobe",
    domain: "adobe.com",
    category: "Technology",
    description:
      "Creative software, cloud products, AI and platform engineering preparation.",
    headquarters: "San Jose, California",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "ML Engineer",
    ],
  },

  cisco: {
    id: "cisco",
    name: "Cisco",
    domain: "cisco.com",
    category: "Networking",
    description:
      "Networking, cybersecurity, cloud and infrastructure engineering preparation.",
    headquarters: "San Jose, California",
    roles: [
      "Network Engineer",
      "Software Engineer",
      "Cybersecurity Engineer",
      "Cloud Engineer",
    ],
  },

  intel: {
    id: "intel",
    name: "Intel",
    domain: "intel.com",
    category: "Semiconductor",
    description:
      "Processors, systems, embedded software and semiconductor engineering preparation.",
    headquarters: "Santa Clara, California",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "Embedded Engineer",
      "AI Engineer",
    ],
  },

  accenture: {
    id: "accenture",
    name: "Accenture",
    domain: "accenture.com",
    category: "Consulting",
    description:
      "Technology consulting, cloud, data, AI and enterprise engineering preparation.",
    headquarters: "Dublin, Ireland",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Cybersecurity Engineer",
    ],
  },

  deloitte: {
    id: "deloitte",
    name: "Deloitte",
    domain: "deloitte.com",
    category: "Consulting",
    description:
      "Technology consulting, analytics, cloud and enterprise technology preparation.",
    headquarters: "London, United Kingdom",
    roles: [
      "Software Engineer",
      "Data Analyst",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
  },

  tcs: {
    id: "tcs",
    name: "TCS",
    domain: "tcs.com",
    category: "Indian IT",
    description:
      "IT services, software engineering, cloud and enterprise technology preparation.",
    headquarters: "Mumbai, India",
    roles: [
      "Software Engineer",
      "System Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
  },

  infosys: {
    id: "infosys",
    name: "Infosys",
    domain: "infosys.com",
    category: "Indian IT",
    description:
      "Digital engineering, consulting, cloud and enterprise technology preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Systems Engineer",
      "Software Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
  },

  wipro: {
    id: "wipro",
    name: "Wipro",
    domain: "wipro.com",
    category: "Indian IT",
    description:
      "IT services, cloud, cybersecurity and digital engineering preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Project Engineer",
      "Software Engineer",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
  },

  hcltech: {
    id: "hcltech",
    name: "HCLTech",
    domain: "hcltech.com",
    category: "Indian IT",
    description:
      "Engineering services, cloud, software and digital transformation preparation.",
    headquarters: "Noida, India",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
  },

  techmahindra: {
    id: "techmahindra",
    name: "Tech Mahindra",
    domain: "techmahindra.com",
    category: "Indian IT",
    description:
      "Digital engineering, telecom, cloud and enterprise technology preparation.",
    headquarters: "Pune, India",
    roles: [
      "Software Engineer",
      "Network Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
  },

  cognizant: {
    id: "cognizant",
    name: "Cognizant",
    domain: "cognizant.com",
    category: "Indian IT",
    description:
      "Digital engineering, cloud, AI and enterprise technology preparation.",
    headquarters: "Teaneck, New Jersey",
    roles: [
      "Programmer Analyst",
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
  },

  ltimindtree: {
    id: "ltimindtree",
    name: "LTIMindtree",
    domain: "ltimindtree.com",
    category: "Indian IT",
    description:
      "Digital transformation, cloud, data and software engineering preparation.",
    headquarters: "Mumbai, India",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
  },

  persistent: {
    id: "persistent",
    name: "Persistent Systems",
    domain: "persistent.com",
    category: "Indian IT",
    description:
      "Digital engineering, cloud, data and software product preparation.",
    headquarters: "Pune, India",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
  },

  zoho: {
    id: "zoho",
    name: "Zoho",
    domain: "zoho.com",
    category: "SaaS",
    description:
      "Business software, cloud applications and product engineering preparation.",
    headquarters: "Chennai, India",
    roles: [
      "Software Developer",
      "Backend Developer",
      "Frontend Developer",
      "QA Engineer",
    ],
  },

  freshworks: {
    id: "freshworks",
    name: "Freshworks",
    domain: "freshworks.com",
    category: "SaaS",
    description:
      "Cloud software, customer experience and SaaS engineering preparation.",
    headquarters: "San Mateo, California",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Data Engineer",
    ],
  },

  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    domain: "flipkart.com",
    category: "Indian Product",
    description:
      "E-commerce, distributed systems, logistics and product engineering preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Software Development Engineer",
      "Data Engineer",
      "Backend Developer",
      "ML Engineer",
    ],
  },

  phonepe: {
    id: "phonepe",
    name: "PhonePe",
    domain: "phonepe.com",
    category: "FinTech",
    description:
      "Digital payments, financial technology and large-scale backend engineering preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "Android Developer",
    ],
  },

  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    domain: "razorpay.com",
    category: "FinTech",
    description:
      "Payments infrastructure, financial technology and platform engineering preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Frontend Developer",
      "Data Engineer",
    ],
  },

  swiggy: {
    id: "swiggy",
    name: "Swiggy",
    domain: "swiggy.com",
    category: "Indian Product",
    description:
      "Consumer technology, logistics, data and large-scale systems preparation.",
    headquarters: "Bengaluru, India",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
  },

  zomato: {
    id: "zomato",
    name: "Zomato",
    domain: "zomato.com",
    category: "Indian Product",
    description:
      "Consumer technology, logistics and data-driven product engineering preparation.",
    headquarters: "Gurugram, India",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
  },

  siemens: {
    id: "siemens",
    name: "Siemens",
    domain: "siemens.com",
    category: "Engineering",
    description:
      "Industrial automation, digital engineering and intelligent infrastructure preparation.",
    headquarters: "Munich, Germany",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automation Engineer",
      "Data Engineer",
    ],
  },

  bosch: {
    id: "bosch",
    name: "Bosch",
    domain: "bosch.com",
    category: "Engineering",
    description:
      "Automotive, embedded systems, IoT and engineering technology preparation.",
    headquarters: "Gerlingen, Germany",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automotive Engineer",
      "Data Engineer",
    ],
  },

  qualcomm: {
    id: "qualcomm",
    name: "Qualcomm",
    domain: "qualcomm.com",
    category: "Semiconductor",
    description:
      "Wireless technology, embedded systems, AI and semiconductor engineering preparation.",
    headquarters: "San Diego, California",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Systems Engineer",
      "AI Engineer",
    ],
  },

  amd: {
    id: "amd",
    name: "AMD",
    domain: "amd.com",
    category: "Semiconductor",
    description:
      "Processors, GPUs, systems and high-performance computing preparation.",
    headquarters: "Santa Clara, California",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "AI Engineer",
      "Embedded Engineer",
    ],
  },

  pitti: {
    id: "pitti",
    name: "Pitti Engineering",
    domain: "pitti.in",
    category: "Manufacturing",
    description:
      "Engineering, manufacturing, quality, CNC and industrial technology preparation.",
    headquarters: "Hyderabad, India",
    roles: [
      "Mechanical Engineer",
      "Production Engineer",
      "CNC Machinist",
      "Quality Control Inspector",
    ],
  },
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeCompany(raw, companyId) {
  if (!raw) {
    return FALLBACK_COMPANIES[companyId] || null;
  }

  const normalized = {
    ...raw,

    id:
      raw.id ||
      raw.companyId ||
      companyId,

    name:
      raw.name ||
      raw.companyName ||
      companyId,

    domain:
      raw.domain ||
      raw.website ||
      "",

    category:
      raw.category ||
      raw.industry ||
      "Engineering",

    description:
      raw.description ||
      raw.summary ||
      "Company-focused engineering preparation.",

    headquarters:
      raw.headquarters ||
      raw.location ||
      "Global",

    roles:
      Array.isArray(raw.roles)
        ? raw.roles
        : Array.isArray(raw.targetRoles)
        ? raw.targetRoles
        : [],
  };

  if (!normalized.roles.length) {
    const fallback =
      FALLBACK_COMPANIES[companyId];

    normalized.roles =
      fallback?.roles || [];
  }

  return normalized;
}

/* =========================================================
   ICONS
========================================================= */

function ArrowIcon({
  size = 18,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function PracticeIcon({
  type,
}) {
  if (type === "aptitude") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2"
        />
        <path d="M8 7h8" />
        <path d="M8 11h2" />
        <path d="M12 11h2" />
        <path d="M16 11h0" />
        <path d="M8 15h2" />
        <path d="M12 15h2" />
        <path d="M16 15h0" />
        <path d="M8 18h8" />
      </svg>
    );
  }

  if (type === "technical") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="14"
          rx="2"
        />
        <path d="M8 21h8" />
        <path d="M12 18v3" />
        <path d="m8 10 2 2-2 2" />
        <path d="M13 14h3" />
      </svg>
    );
  }

  if (type === "coding") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 8-4 4 4 4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m14 5-4 14" />
      </svg>
    );
  }

  if (type === "interview") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle
          cx="12"
          cy="8"
          r="3"
        />
        <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
        <path d="M19 5v5" />
        <path d="M16.5 7.5h5" />
      </svg>
    );
  }

  return null;
}

function StatusDot() {
  return (
    <span className="status-dot" />
  );
}

/* =========================================================
   COMPANY LOGO
========================================================= */

function CompanyLogo({
  company,
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);

  const initials =
    String(company.name || "EN")
      .split(/\s+/)
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const domain =
    String(
      company.domain || ""
    )
      .replace(
        /^https?:\/\//,
        ""
      )
      .replace(
        /^www\./,
        ""
      )
      .split("/")[0];

  return (
    <div className="company-logo">
      {!failed && domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=256`}
          alt=""
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <span>
          {initials}
        </span>
      )}
    </div>
  );
}

/* =========================================================
   MODULE CARD
========================================================= */

function ModuleCard({
  icon,
  eyebrow,
  title,
  description,
  stats,
  button,
  onClick,
  featured = false,
}) {
  return (
    <button
      type="button"
      className={`module-card ${
        featured
          ? "module-card-featured"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="module-card-top">
        <div className="module-icon">
          <PracticeIcon
            type={icon}
          />
        </div>

        <span className="module-arrow">
          <ArrowIcon />
        </span>
      </div>

      <div className="module-copy">
        <span className="module-eyebrow">
          {eyebrow}
        </span>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>
      </div>

      <div className="module-bottom">
        <div className="module-stats">
          {stats.map(
            (
              stat,
              index
            ) => (
              <div
                className="module-stat"
                key={
                  `${title}-${index}`
                }
              >
                <strong>
                  {stat.value}
                </strong>

                <span>
                  {stat.label}
                </span>
              </div>
            )
          )}
        </div>

        <span className="module-button">
          {button}
          <ArrowIcon
            size={14}
          />
        </span>
      </div>
    </button>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function CompanyDetails() {
  const {
    companyId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    company,
    setCompany,
  ] = useState(
    () =>
      FALLBACK_COMPANIES[
        companyId
      ] || null
  );

  const [
    loading,
    setLoading,
  ] = useState(
    !FALLBACK_COMPANIES[
      companyId
    ]
  );

  const [
    backendConnected,
    setBackendConnected,
  ] = useState(false);

  const [
    selectedRole,
    setSelectedRole,
  ] = useState("");

  const [
    roleOpen,
    setRoleOpen,
  ] = useState(false);

  const [
    counts,
    setCounts,
  ] = useState({
    aptitudeTests: 20,
    aptitudeQuestions: null,
    technicalQuestions: null,
    codingEasy: null,
    codingMedium: null,
    codingHard: null,
    aptitudeCompleted: 0,
    technicalAttempted: 0,
    codingSolved: 0,
    interviewsCompleted: 0,
  });

  /* =======================================================
     LOAD COMPANY

     Lightweight request only.
     NO role-preparation request.
  ======================================================= */

  const loadCompany =
    useCallback(
      async () => {
        if (!companyId) {
          setLoading(false);
          return;
        }

        try {
          const user =
            auth.currentUser;

          const headers = {};

          if (user) {
            try {
              const token =
                await user.getIdToken();

              headers.Authorization =
                `Bearer ${token}`;
            } catch {
              // Public company data can still load.
            }
          }

          const response =
            await fetch(
              `${API_BASE}/api/companies/${encodeURIComponent(
                companyId
              )}`,
              {
                method: "GET",
                headers,
              }
            );

          if (!response.ok) {
            throw new Error(
              `Company request failed: ${response.status}`
            );
          }

          const result =
            await response.json();

          const remote =
            result?.company ||
            result?.data ||
            result;

          const normalized =
            normalizeCompany(
              remote,
              companyId
            );

          if (normalized) {
            setCompany(
              normalized
            );

            setBackendConnected(
              true
            );
          }
        } catch (error) {
          console.warn(
            "[ENGVIVA] Company API unavailable. Using local company data.",
            error
          );

          const fallback =
            FALLBACK_COMPANIES[
              companyId
            ];

          if (fallback) {
            setCompany(
              fallback
            );
          }
        } finally {
          setLoading(false);
        }
      },
      [companyId]
    );

  useEffect(() => {
    loadCompany();
  }, [
    loadCompany,
  ]);

  /* =======================================================
     DEFAULT ROLE

     Only local UI state.
     Actual saved profile/target remains server-side.
  ======================================================= */

  useEffect(() => {
    if (
      !selectedRole &&
      company?.roles?.length
    ) {
      setSelectedRole(
        company.roles[0]
      );
    }
  }, [
    company,
    selectedRole,
  ]);

  /* =======================================================
     LIGHTWEIGHT PRACTICE SUMMARY

     IMPORTANT:

     This attempts a lightweight endpoint if your backend
     exposes one.

     If unavailable, UI remains functional and does not
     block the company page.

     Expected optional response shape:

     {
       aptitude: {
         tests: 20,
         questions: 400,
         completed: 3
       },
       technical: {
         questions: 250,
         attempted: 40
       },
       coding: {
         easy: 30,
         medium: 50,
         hard: 20,
         solved: 12
       },
       interviews: {
         completed: 4
       }
     }

     If your existing server uses a different endpoint,
     only this function needs to be mapped later.
  ======================================================= */

  const loadPracticeSummary =
    useCallback(
      async () => {
        if (!companyId) return;

        try {
          const user =
            auth.currentUser;

          if (!user) {
            return;
          }

          const token =
            await user.getIdToken();

          const response =
            await fetch(
              `${API_BASE}/api/practice/summary?company=${encodeURIComponent(
                companyId
              )}`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
            return;
          }

          const result =
            await response.json();

          const data =
            result?.data ||
            result;

          if (!data) return;

          setCounts(
            (previous) => ({
              ...previous,

              aptitudeTests:
                Number(
                  data?.aptitude
                    ?.tests
                ) || 20,

              aptitudeQuestions:
                data?.aptitude
                  ?.questions ??
                previous.aptitudeQuestions,

              technicalQuestions:
                data?.technical
                  ?.questions ??
                previous.technicalQuestions,

              codingEasy:
                data?.coding?.easy ??
                previous.codingEasy,

              codingMedium:
                data?.coding?.medium ??
                previous.codingMedium,

              codingHard:
                data?.coding?.hard ??
                previous.codingHard,

              aptitudeCompleted:
                Number(
                  data?.aptitude
                    ?.completed
                ) || 0,

              technicalAttempted:
                Number(
                  data?.technical
                    ?.attempted
                ) || 0,

              codingSolved:
                Number(
                  data?.coding
                    ?.solved
                ) || 0,

              interviewsCompleted:
                Number(
                  data?.interviews
                    ?.completed
                ) || 0,
            })
          );
        } catch (error) {
          /*
            Deliberately silent.

            The CompanyDetails page MUST NOT become
            dependent on a heavy practice API.

            If summary is unavailable, the cards still
            work and the actual module retrieves its own
            database data.
          */

          console.debug(
            "[ENGVIVA] Practice summary unavailable."
          );
        }
      },
      [companyId]
    );

  useEffect(() => {
    loadPracticeSummary();
  }, [
    loadPracticeSummary,
  ]);

  /* =======================================================
     DISPLAY VALUES
  ======================================================= */

  const aptitudeStats =
    useMemo(
      () => [
        {
          value:
            counts.aptitudeTests ??
            20,
          label: "TESTS",
        },
        {
          value:
            counts.aptitudeQuestions ??
            "LIVE",
          label:
            counts.aptitudeQuestions !=
            null
              ? "QUESTIONS"
              : "DB QUESTIONS",
        },
      ],
      [counts]
    );

  const technicalStats =
    useMemo(
      () => [
        {
          value:
            counts.technicalQuestions ??
            "LIVE",
          label:
            counts.technicalQuestions !=
            null
              ? "QUESTIONS"
              : "FROM DATABASE",
        },
        {
          value:
            counts.technicalAttempted ||
            0,
          label: "ATTEMPTED",
        },
      ],
      [counts]
    );

  const codingStats =
    useMemo(
      () => [
        {
          value:
            counts.codingEasy ??
            "—",
          label: "EASY",
        },
        {
          value:
            counts.codingMedium ??
            "—",
          label: "MEDIUM",
        },
        {
          value:
            counts.codingHard ??
            "—",
          label: "HARD",
        },
      ],
      [counts]
    );

  const interviewStats =
    useMemo(
      () => [
        {
          value:
            counts.interviewsCompleted ||
            0,
          label: "COMPLETED",
        },
        {
          value: "3D",
          label: "AI SIMULATION",
        },
      ],
      [counts]
    );

  /* =======================================================
     NAVIGATION

     NO /role-preparation.

     Everything goes directly to the module.
  ======================================================= */

  const goToPractice =
    useCallback(
      (module) => {
        if (!companyId) return;

        const role =
          encodeURIComponent(
            selectedRole ||
              ""
          );

        const company =
          encodeURIComponent(
            companyId
          );

        switch (module) {
          case "aptitude":
            navigate(
              `/assessments?company=${company}&role=${role}`
            );
            break;

          case "technical":
            navigate(
              `/technical-lab?company=${company}&role=${role}`
            );
            break;

          case "coding":
            navigate(
              `/coding-lab?company=${company}&role=${role}`
            );
            break;

          case "interview":
            navigate(
              `/interviews?company=${company}&role=${role}`
            );
            break;

          default:
            break;
        }
      },
      [
        companyId,
        selectedRole,
        navigate,
      ]
    );

  const goToProgress =
    useCallback(() => {
      const company =
        encodeURIComponent(
          companyId || ""
        );

      navigate(
        `/progress?company=${company}`
      );
    }, [
      companyId,
      navigate,
    ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="company-details-page loading-page">
        <div className="loading-container">
          <div className="loading-ring" />

          <span>
            LOADING COMPANY
          </span>

          <small>
            ENGVIVA
          </small>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!company) {
    return (
      <div className="company-details-page not-found-page">
        <div className="not-found-card">
          <div className="not-found-number">
            404
          </div>

          <span className="not-found-label">
            COMPANY INTELLIGENCE
          </span>

          <h1>
            Company not found.
          </h1>

          <p>
            This company does not
            exist in the current
            ENGVIVA company index.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/companies"
              )
            }
          >
            <BackIcon />
            RETURN TO COMPANIES
          </button>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="company-details-page">
      <style>{styles}</style>

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="background-grid" />

      <main className="company-details-shell">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="company-topbar">

          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(
                "/companies"
              )
            }
          >
            <BackIcon />

            <span>
              COMPANIES
            </span>
          </button>

          <div className="live-status">
            <StatusDot />

            <span>
              {backendConnected
                ? "LIVE COMPANY DATA"
                : "COMPANY PROFILE"}
            </span>
          </div>

        </header>

        {/* =================================================
            COMPANY HERO
        ================================================= */}

        <section className="company-hero">

          <div className="hero-main">

            <div className="company-heading">

              <CompanyLogo
                company={
                  company
                }
              />

              <div className="company-title-block">

                <span className="company-category">
                  {company.category}
                </span>

                <h1>
                  {company.name}
                </h1>

                <span className="company-domain">
                  {company.domain ||
                    "Engineering company"}
                </span>

              </div>

            </div>

            <p className="company-description">
              {company.description}
            </p>

            <div className="company-meta">

              <div className="meta-item">
                <span>
                  HEADQUARTERS
                </span>

                <strong>
                  {company.headquarters ||
                    "Global"}
                </strong>
              </div>

              <div className="meta-item">
                <span>
                  ENGINEERING ROLES
                </span>

                <strong>
                  {company.roles
                    ?.length || 0}
                </strong>
              </div>

              <div className="meta-item">
                <span>
                  PRACTICE MODE
                </span>

                <strong>
                  OPEN
                </strong>
              </div>

            </div>

          </div>

          {/* =================================================
              QUICK PROGRESS
          ================================================= */}

          <button
            type="button"
            className="progress-card"
            onClick={
              goToProgress
            }
          >

            <div className="progress-card-top">

              <span>
                YOUR PROGRESS
              </span>

              <ArrowIcon
                size={15}
              />

            </div>

            <div className="progress-visual">

              <div className="progress-ring">

                <span>
                  —
                </span>

              </div>

              <div>
                <strong>
                  {company.name}
                </strong>

                <p>
                  Your attempts,
                  scores and
                  completed practice
                  are stored in
                  ENGVIVA.
                </p>
              </div>

            </div>

            <div className="progress-link">
              VIEW FULL PROGRESS
              <ArrowIcon
                size={13}
              />
            </div>

          </button>

        </section>

        {/* =================================================
            ROLE SELECTOR
        ================================================= */}

        <section className="role-section">

          <div className="section-label">
            <span>
              01
            </span>

            <div>
              <small>
                TARGET ROLE
              </small>

              <h2>
                Practice for the role
                you want.
              </h2>
            </div>
          </div>

          <div className="role-selector-wrapper">

            <button
              type="button"
              className="role-selector"
              onClick={() =>
                setRoleOpen(
                  (value) =>
                    !value
                )
              }
            >
              <div className="selected-role-icon">
                {(
                  selectedRole ||
                  "E"
                )
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="selected-role-copy">

                <span>
                  SELECTED ROLE
                </span>

                <strong>
                  {selectedRole ||
                    "Choose a role"}
                </strong>

              </div>

              <span
                className={`chevron ${
                  roleOpen
                    ? "open"
                    : ""
                }`}
              >
                ↓
              </span>
            </button>

            {roleOpen && (
              <div className="role-dropdown">

                {(
                  company.roles ||
                  []
                ).map(
                  (role) => (
                    <button
                      type="button"
                      key={role}
                      className={
                        selectedRole ===
                        role
                          ? "role-option active"
                          : "role-option"
                      }
                      onClick={() => {
                        setSelectedRole(
                          role
                        );
                        setRoleOpen(
                          false
                        );
                      }}
                    >
                      <span>
                        {role}
                      </span>

                      {selectedRole ===
                        role && (
                        <span className="check">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* =================================================
            PRACTICE
        ================================================= */}

        <section className="practice-section">

          <div className="section-heading">

            <div>
              <span className="section-number">
                02 / PRACTICE
              </span>

              <h2>
                Everything is open.
              </h2>
            </div>

            <p>
              Choose any module,
              any time. ENGVIVA
              retrieves the available
              content directly from
              the database.
            </p>

          </div>

          <div className="modules-grid">

            {/* =================================================
                APTITUDE
            ================================================= */}

            <ModuleCard
              icon="aptitude"
              eyebrow="ASSESSMENT"
              title="Aptitude"
              description={
                `Company-specific aptitude tests covering quantitative, logical and verbal reasoning.`
              }
              stats={
                aptitudeStats
              }
              button="OPEN TESTS"
              onClick={() =>
                goToPractice(
                  "aptitude"
                )
              }
              featured
            />

            {/* =================================================
                TECHNICAL
            ================================================= */}

            <ModuleCard
              icon="technical"
              eyebrow="ENGINEERING KNOWLEDGE"
              title="Technical"
              description={
                `Practice company-relevant CS and engineering concepts without artificial stage locking.`
              }
              stats={
                technicalStats
              }
              button="PRACTICE"
              onClick={() =>
                goToPractice(
                  "technical"
                )
              }
            />

            {/* =================================================
                CODING
            ================================================= */}

            <ModuleCard
              icon="coding"
              eyebrow="CODING LAB"
              title="Coding"
              description={
                `Solve available company coding problems by difficulty. Choose Easy, Medium or Hard directly.`
              }
              stats={
                codingStats
              }
              button="ENTER LAB"
              onClick={() =>
                goToPractice(
                  "coding"
                )
              }
              featured
            />

            {/* =================================================
                INTERVIEW
            ================================================= */}

            <ModuleCard
              icon="interview"
              eyebrow="AI SIMULATION"
              title="Interviews"
              description={
                `Enter technical, HR, behavioral and advanced 3D AI interview simulations.`
              }
              stats={
                interviewStats
              }
              button="START SIMULATION"
              onClick={() =>
                goToPractice(
                  "interview"
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            CODING DIFFICULTY STRIP
        ================================================= */}

        <section className="coding-strip">

          <div className="coding-strip-copy">

            <span>
              CODING LAB
            </span>

            <h2>
              Pick your difficulty.
            </h2>

            <p>
              There is no forced sequence.
              Start wherever your current
              skill level demands.
            </p>

          </div>

          <div className="difficulty-list">

            <button
              type="button"
              onClick={() =>
                goToPractice(
                  "coding"
                )
              }
            >
              <span className="difficulty-dot easy" />

              <div>
                <strong>
                  EASY
                </strong>

                <small>
                  {counts.codingEasy ??
                    "DB"}{" "}
                  AVAILABLE
                </small>
              </div>

              <ArrowIcon
                size={15}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                goToPractice(
                  "coding"
                )
              }
            >
              <span className="difficulty-dot medium" />

              <div>
                <strong>
                  MEDIUM
                </strong>

                <small>
                  {counts.codingMedium ??
                    "DB"}{" "}
                  AVAILABLE
                </small>
              </div>

              <ArrowIcon
                size={15}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                goToPractice(
                  "coding"
                )
              }
            >
              <span className="difficulty-dot hard" />

              <div>
                <strong>
                  HARD
                </strong>

                <small>
                  {counts.codingHard ??
                    "DB"}{" "}
                  AVAILABLE
                </small>
              </div>

              <ArrowIcon
                size={15}
              />
            </button>

          </div>

        </section>

        {/* =================================================
            INTERVIEW FEATURE
        ================================================= */}

        <section className="interview-feature">

          <div className="interview-feature-glow" />

          <div className="interview-feature-left">

            <div className="interview-badge">
              <span />
              ENGVIVA AI INTERVIEW
            </div>

            <h2>
              Don't just prepare.
              <br />
              <em>Enter the interview.</em>
            </h2>

            <p>
              Practice technical,
              behavioral and HR
              interviews through the
              ENGVIVA simulation
              environment. The advanced
              3D interviewer experience
              remains separate from
              ordinary practice.
            </p>

            <button
              type="button"
              onClick={() =>
                goToPractice(
                  "interview"
                )
              }
            >
              ENTER INTERVIEW
              <ArrowIcon />
            </button>

          </div>

          <div className="interview-visual">

            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="avatar-placeholder">

              <div className="avatar-head">
                AI
              </div>

              <div className="avatar-body">
                INTERVIEW
              </div>

            </div>

            <div className="visual-label label-top">
              3D
            </div>

            <div className="visual-label label-bottom">
              LIVE
            </div>

          </div>

        </section>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <section className="info-grid">

          <div className="info-card">

            <span className="info-number">
              01
            </span>

            <h3>
              Database-driven
            </h3>

            <p>
              Question counts,
              coding problems,
              attempts and progress
              come from your existing
              backend data.
            </p>

          </div>

          <div className="info-card">

            <span className="info-number">
              02
            </span>

            <h3>
              No artificial locks
            </h3>

            <p>
              You don't have to finish
              one module before entering
              another. Practice what
              you need.
            </p>

          </div>

          <div className="info-card">

            <span className="info-number">
              03
            </span>

            <h3>
              Company focused
            </h3>

            <p>
              Every module carries the
              selected company and role
              into the next screen.
            </p>

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="company-footer">

          <span>
            ENGVIVA / COMPANY INTELLIGENCE
          </span>

          <span>
            OPEN PRACTICE · LIVE DATA · AI INTERVIEWS
          </span>

        </footer>

      </main>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

.company-details-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;

  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(143, 105, 239, .14),
      transparent 28%
    ),
    radial-gradient(
      circle at 0% 55%,
      rgba(79, 47, 145, .08),
      transparent 28%
    ),
    #07070b;

  color: #eeeaf5;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================================================
   BACKGROUND
========================================================= */

.background-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;

  opacity: .025;

  background-image:
    linear-gradient(
      rgba(210, 190, 255, .5) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(210, 190, 255, .5) 1px,
      transparent 1px
    );

  background-size: 72px 72px;

  mask-image:
    linear-gradient(
      to bottom,
      black,
      transparent 80%
    );
}

.ambient {
  position: fixed;
  width: 440px;
  height: 440px;

  border-radius: 50%;

  filter: blur(140px);

  pointer-events: none;

  opacity: .08;
}

.ambient-one {
  right: -220px;
  top: 70px;

  background: #a27cff;
}

.ambient-two {
  left: -250px;
  bottom: -150px;

  background: #5631a7;
}

/* =========================================================
   SHELL
========================================================= */

.company-details-shell {
  position: relative;
  z-index: 2;

  width:
    min(
      1380px,
      calc(100% - 64px)
    );

  margin: 0 auto;

  padding:
    30px 0 70px;
}

/* =========================================================
   TOPBAR
========================================================= */

.company-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 42px;

  margin-bottom: 34px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;

  border: 0;
  outline: 0;

  color: #716a7c;
  background: transparent;

  cursor: pointer;

  font-size: 8px;
  letter-spacing: 1.7px;
  font-weight: 700;

  transition:
    color .2s ease,
    transform .2s ease;
}

.back-button:hover {
  color: #c4b8d7;
  transform: translateX(-3px);
}

.live-status {
  display: flex;
  align-items: center;
  gap: 8px;

  color: #5a5464;

  font-size: 7px;
  letter-spacing: 1.3px;
  font-weight: 700;
}

.status-dot {
  width: 6px;
  height: 6px;

  border-radius: 50%;

  background: #6de0aa;

  box-shadow:
    0 0 12px
    rgba(109, 224, 170, .7);
}

/* =========================================================
   HERO
========================================================= */

.company-hero {
  display: grid;

  grid-template-columns:
    minmax(0, 1.65fr)
    minmax(320px, .65fr);

  gap: 18px;

  margin-bottom: 66px;
}

.hero-main,
.progress-card {
  border:
    1px solid
    rgba(190, 164, 245, .09);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.045),
      rgba(255,255,255,.014)
    );

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.035);

  backdrop-filter:
    blur(25px);

  border-radius: 25px;
}

.hero-main {
  padding: 38px;
}

.company-heading {
  display: flex;
  align-items: center;
  gap: 20px;
}

.company-logo {
  width: 84px;
  height: 84px;

  flex: 0 0 auto;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(200, 178, 248, .13);

  border-radius: 21px;

  background:
    rgba(255,255,255,.035);

  box-shadow:
    0 22px 55px
    rgba(0,0,0,.22),

    inset 0 1px
    rgba(255,255,255,.08);
}

.company-logo img {
  width: 52px;
  height: 52px;

  object-fit: contain;
}

.company-logo span {
  color: #c9b9e5;

  font-size: 23px;
  font-weight: 800;
}

.company-category {
  display: block;

  color: #9a7bd0;

  font-size: 7px;
  letter-spacing: 2px;
  font-weight: 800;
}

.company-title-block h1 {
  margin:
    6px 0 4px;

  color: #eeeaf5;

  font-size:
    clamp(
      42px,
      5vw,
      70px
    );

  line-height: .92;

  letter-spacing: -3.5px;

  font-weight: 500;
}

.company-domain {
  color: #5d5766;

  font-size: 9px;
}

.company-description {
  max-width: 760px;

  margin:
    32px 0 30px;

  color: #787181;

  font-size: 11px;

  line-height: 1.8;
}

.company-meta {
  display: flex;

  border-top:
    1px solid
    rgba(190,164,245,.07);

  padding-top: 20px;
}

.meta-item {
  min-width: 170px;

  padding-right: 30px;
  margin-right: 30px;

  border-right:
    1px solid
    rgba(190,164,245,.07);
}

.meta-item:last-child {
  border-right: 0;
}

.meta-item span {
  display: block;

  color: #514c59;

  font-size: 6px;

  letter-spacing: 1.5px;

  margin-bottom: 7px;
}

.meta-item strong {
  color: #aaa1b7;

  font-size: 10px;

  font-weight: 500;
}

/* =========================================================
   PROGRESS CARD
========================================================= */

.progress-card {
  position: relative;

  width: 100%;

  padding: 29px;

  text-align: left;

  color: inherit;

  cursor: pointer;

  overflow: hidden;

  transition:
    transform .25s ease,
    border-color .25s ease,
    background .25s ease;
}

.progress-card:hover {
  transform: translateY(-4px);

  border-color:
    rgba(186,155,242,.23);

  background:
    linear-gradient(
      145deg,
      rgba(139,103,218,.08),
      rgba(255,255,255,.018)
    );
}

.progress-card::before {
  content: "";

  position: absolute;

  width: 230px;
  height: 230px;

  right: -130px;
  top: -130px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(160,125,238,.2),
      transparent 70%
    );
}

.progress-card-top {
  position: relative;

  display: flex;
  justify-content: space-between;
  align-items: center;

  color: #726783;

  font-size: 7px;

  letter-spacing: 1.7px;
  font-weight: 800;
}

.progress-visual {
  position: relative;

  display: flex;
  align-items: center;

  gap: 18px;

  margin-top: 48px;
}

.progress-ring {
  width: 88px;
  height: 88px;

  flex: 0 0 auto;

  display: grid;
  place-items: center;

  border-radius: 50%;

  border:
    1px solid
    rgba(183,153,238,.22);

  background:
    radial-gradient(
      circle,
      rgba(150,111,230,.12),
      transparent 68%
    );

  box-shadow:
    0 0 45px
    rgba(122,86,196,.12);
}

.progress-ring span {
  color: #b59adc;

  font-size: 28px;
  font-weight: 300;
}

.progress-visual strong {
  display: block;

  color: #d3c9e1;

  font-size: 15px;
  font-weight: 500;
}

.progress-visual p {
  max-width: 210px;

  margin:
    7px 0 0;

  color: #625b6a;

  font-size: 8px;

  line-height: 1.7;
}

.progress-link {
  position: relative;

  display: flex;
  align-items: center;
  gap: 7px;

  margin-top: 36px;

  color: #8f76bc;

  font-size: 7px;

  letter-spacing: 1.1px;
  font-weight: 800;
}

/* =========================================================
   SECTION LABEL
========================================================= */

.section-label {
  display: flex;
  align-items: flex-start;
  gap: 17px;

  margin-bottom: 20px;
}

.section-label > span {
  color: #9a7ed0;

  font-size: 7px;

  letter-spacing: 1.5px;

  font-weight: 800;
}

.section-label small {
  display: block;

  color: #5c5664;

  font-size: 6px;

  letter-spacing: 1.7px;

  font-weight: 800;
}

.section-label h2 {
  margin:
    7px 0 0;

  color: #dcd5e7;

  font-size: 22px;

  letter-spacing: -.7px;

  font-weight: 500;
}

/* =========================================================
   ROLE
========================================================= */

.role-section {
  margin-bottom: 67px;
}

.role-selector-wrapper {
  position: relative;

  max-width: 580px;
}

.role-selector {
  width: 100%;

  display: flex;
  align-items: center;

  gap: 13px;

  padding: 13px;

  border:
    1px solid
    rgba(190,164,245,.12);

  border-radius: 15px;

  color: inherit;

  background:
    rgba(255,255,255,.025);

  cursor: pointer;

  text-align: left;

  transition:
    border-color .2s ease,
    background .2s ease;
}

.role-selector:hover {
  border-color:
    rgba(190,164,245,.25);

  background:
    rgba(255,255,255,.04);
}

.selected-role-icon {
  width: 43px;
  height: 43px;

  display: grid;
  place-items: center;

  border-radius: 12px;

  color: #c6b2e7;

  background:
    rgba(147,109,220,.12);

  border:
    1px solid
    rgba(178,146,239,.15);

  font-size: 14px;
  font-weight: 700;
}

.selected-role-copy {
  flex: 1;
}

.selected-role-copy span {
  display: block;

  color: #5a5461;

  font-size: 6px;

  letter-spacing: 1.5px;

  margin-bottom: 5px;
}

.selected-role-copy strong {
  color: #c8bfD5;

  font-size: 11px;

  font-weight: 500;
}

.chevron {
  color: #766a84;

  transition:
    transform .2s ease;
}

.chevron.open {
  transform:
    rotate(180deg);
}

.role-dropdown {
  position: absolute;

  z-index: 30;

  top: calc(100% + 8px);
  left: 0;
  right: 0;

  padding: 7px;

  border:
    1px solid
    rgba(190,164,245,.13);

  border-radius: 15px;

  background:
    rgba(14,13,20,.97);

  box-shadow:
    0 25px 70px
    rgba(0,0,0,.45);

  backdrop-filter:
    blur(25px);
}

.role-option {
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding:
    12px 13px;

  border: 0;

  border-radius: 10px;

  color: #82798d;

  background: transparent;

  cursor: pointer;

  text-align: left;

  font-size: 9px;

  transition:
    background .2s ease,
    color .2s ease;
}

.role-option:hover,
.role-option.active {
  color: #d0c4df;

  background:
    rgba(154,115,230,.1);
}

.check {
  color: #aa8cdd;
}

/* =========================================================
   PRACTICE
========================================================= */

.practice-section {
  margin-bottom: 62px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  gap: 30px;

  margin-bottom: 22px;
}

.section-number {
  display: block;

  color: #9578c9;

  font-size: 7px;

  letter-spacing: 1.8px;

  font-weight: 800;
}

.section-heading h2 {
  margin:
    8px 0 0;

  color: #ded7e8;

  font-size: 27px;

  letter-spacing: -1px;

  font-weight: 500;
}

.section-heading p {
  max-width: 420px;

  margin: 0;

  color: #625b69;

  font-size: 9px;

  line-height: 1.75;

  text-align: right;
}

/* =========================================================
   MODULE GRID
========================================================= */

.modules-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 14px;
}

.module-card {
  position: relative;

  min-height: 285px;

  display: flex;
  flex-direction: column;

  padding: 24px;

  border:
    1px solid
    rgba(190,164,245,.09);

  border-radius: 20px;

  color: inherit;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.038),
      rgba(255,255,255,.012)
    );

  cursor: pointer;

  text-align: left;

  overflow: hidden;

  transition:
    transform .3s
      cubic-bezier(.2,.8,.2,1),
    border-color .25s ease,
    background .25s ease,
    box-shadow .3s ease;
}

.module-card::after {
  content: "";

  position: absolute;

  width: 250px;
  height: 250px;

  right: -160px;
  bottom: -170px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(143,105,239,.1),
      transparent 70%
    );

  pointer-events: none;
}

.module-card:hover {
  transform:
    translateY(-6px);

  border-color:
    rgba(190,164,245,.23);

  background:
    linear-gradient(
      145deg,
      rgba(143,105,239,.075),
      rgba(255,255,255,.018)
    );

  box-shadow:
    0 25px 65px
    rgba(0,0,0,.2);
}

.module-card-featured {
  border-color:
    rgba(164,132,235,.14);
}

.module-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.module-icon {
  width: 48px;
  height: 48px;

  display: grid;
  place-items: center;

  border:
    1px solid
    rgba(188,157,240,.14);

  border-radius: 14px;

  color: #ad90d9;

  background:
    rgba(145,105,225,.06);
}

.module-icon svg {
  width: 22px;
  height: 22px;
}

.module-arrow {
  color: #625a70;

  transition:
    color .2s ease,
    transform .2s ease;
}

.module-card:hover
.module-arrow {
  color: #bba4db;

  transform:
    translateX(3px);
}

.module-copy {
  margin-top: 30px;
}

.module-eyebrow {
  display: block;

  color: #655d70;

  font-size: 6px;

  letter-spacing: 1.6px;

  font-weight: 800;
}

.module-copy h3 {
  margin:
    7px 0 8px;

  color: #d8d0e3;

  font-size: 23px;

  letter-spacing: -.6px;

  font-weight: 500;
}

.module-copy p {
  max-width: 510px;

  margin: 0;

  color: #686171;

  font-size: 9px;

  line-height: 1.75;
}

.module-bottom {
  margin-top: auto;

  padding-top: 25px;
}

.module-stats {
  display: flex;
  align-items: center;

  gap: 20px;
}

.module-stat {
  display: flex;
  flex-direction: column;

  min-width: 55px;
}

.module-stat strong {
  color: #bda8d9;

  font-size: 15px;

  font-weight: 400;
}

.module-stat span {
  margin-top: 4px;

  color: #514b58;

  font-size: 5.5px;

  letter-spacing: 1px;

  font-weight: 800;
}

.module-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;

  margin-top: 20px;

  color: #9075ba;

  font-size: 6px;

  letter-spacing: 1.2px;

  font-weight: 800;
}

/* =========================================================
   CODING STRIP
========================================================= */

.coding-strip {
  display: grid;

  grid-template-columns:
    .75fr
    1.25fr;

  gap: 40px;

  align-items: center;

  padding: 28px 30px;

  margin-bottom: 58px;

  border:
    1px solid
    rgba(190,164,245,.08);

  border-radius: 21px;

  background:
    rgba(255,255,255,.018);
}

.coding-strip-copy > span {
  color: #8d70bd;

  font-size: 6px;

  letter-spacing: 1.7px;

  font-weight: 800;
}

.coding-strip-copy h2 {
  margin:
    8px 0 6px;

  color: #d8d0e3;

  font-size: 22px;

  font-weight: 500;
}

.coding-strip-copy p {
  max-width: 390px;

  margin: 0;

  color: #625b68;

  font-size: 8px;

  line-height: 1.7;
}

.difficulty-list {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;
}

.difficulty-list button {
  display: flex;
  align-items: center;

  gap: 10px;

  min-height: 70px;

  padding: 13px;

  border:
    1px solid
    rgba(190,164,245,.08);

  border-radius: 13px;

  color: inherit;

  background:
    rgba(255,255,255,.022);

  cursor: pointer;

  text-align: left;

  transition:
    border-color .2s ease,
    transform .2s ease;
}

.difficulty-list button:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(190,164,245,.2);
}

.difficulty-list button > div {
  flex: 1;
}

.difficulty-list strong {
  display: block;

  color: #bdb1ca;

  font-size: 8px;

  letter-spacing: 1px;
}

.difficulty-list small {
  display: block;

  margin-top: 5px;

  color: #57515e;

  font-size: 5.5px;

  letter-spacing: .8px;
}

.difficulty-list button > svg {
  color: #665d70;
}

.difficulty-dot {
  width: 7px;
  height: 7px;

  flex: 0 0 auto;

  border-radius: 50%;
}

.difficulty-dot.easy {
  background: #62d69c;

  box-shadow:
    0 0 10px
    rgba(98,214,156,.5);
}

.difficulty-dot.medium {
  background: #d4aa64;

  box-shadow:
    0 0 10px
    rgba(212,170,100,.45);
}

.difficulty-dot.hard {
  background: #d46e7c;

  box-shadow:
    0 0 10px
    rgba(212,110,124,.45);
}

/* =========================================================
   INTERVIEW FEATURE
========================================================= */

.interview-feature {
  position: relative;

  display: grid;

  grid-template-columns:
    1.1fr
    .9fr;

  min-height: 390px;

  margin-bottom: 60px;

  overflow: hidden;

  border:
    1px solid
    rgba(190,164,245,.12);

  border-radius: 25px;

  background:
    radial-gradient(
      circle at 80% 50%,
      rgba(143,105,239,.12),
      transparent 34%
    ),
    linear-gradient(
      135deg,
      rgba(143,105,239,.07),
      rgba(255,255,255,.015)
    );
}

.interview-feature-glow {
  position: absolute;

  width: 400px;
  height: 400px;

  right: -170px;
  top: -130px;

  border-radius: 50%;

  background:
    #9a70ed;

  filter: blur(130px);

  opacity: .08;
}

.interview-feature-left {
  position: relative;

  z-index: 2;

  padding: 45px;
}

.interview-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  color: #9276c2;

  font-size: 6px;

  letter-spacing: 1.7px;

  font-weight: 800;
}

.interview-badge span {
  width: 5px;
  height: 5px;

  border-radius: 50%;

  background: #9d7bd6;

  box-shadow:
    0 0 10px
    rgba(157,123,214,.7);
}

.interview-feature h2 {
  margin:
    22px 0 15px;

  color: #e0d9e9;

  font-size:
    clamp(
      30px,
      4vw,
      48px
    );

  line-height: 1.05;

  letter-spacing: -2px;

  font-weight: 400;
}

.interview-feature h2 em {
  color: #aa8cd8;

  font-style: normal;
}

.interview-feature p {
  max-width: 570px;

  color: #706878;

  font-size: 9px;

  line-height: 1.8;
}

.interview-feature-left button {
  display: inline-flex;
  align-items: center;
  gap: 17px;

  margin-top: 22px;

  padding:
    13px 17px;

  border:
    1px solid
    rgba(202,177,252,.2);

  border-radius: 10px;

  color: #e4dcef;

  background:
    rgba(150,112,228,.14);

  cursor: pointer;

  font-size: 7px;

  letter-spacing: 1.2px;

  font-weight: 800;

  transition:
    transform .2s ease,
    border-color .2s ease;
}

.interview-feature-left button:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(202,177,252,.4);
}

.interview-visual {
  position: relative;

  min-height: 390px;

  display: grid;

  place-items: center;
}

.visual-orbit {
  position: absolute;

  border:
    1px solid
    rgba(182,151,239,.12);

  border-radius: 50%;

  transform:
    rotate(-18deg);
}

.orbit-one {
  width: 330px;
  height: 150px;
}

.orbit-two {
  width: 230px;
  height: 360px;

  transform:
    rotate(30deg);
}

.avatar-placeholder {
  position: relative;
  z-index: 3;

  width: 150px;
  height: 200px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  border:
    1px solid
    rgba(202,177,252,.18);

  border-radius: 70px 70px 40px 40px;

  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(185,153,241,.18),
      transparent 42%
    ),
    rgba(20,17,28,.75);

  box-shadow:
    0 0 80px
    rgba(135,96,214,.14);
}

.avatar-head {
  width: 68px;
  height: 68px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  border:
    1px solid
    rgba(202,177,252,.18);

  color: #bca3dc;

  background:
    rgba(158,120,228,.09);

  font-size: 15px;

  font-weight: 700;
}

.avatar-body {
  margin-top: 16px;

  color: #645c70;

  font-size: 6px;

  letter-spacing: 1.3px;
}

.visual-label {
  position: absolute;

  color: #76638f;

  font-size: 6px;

  letter-spacing: 1.5px;

  font-weight: 800;
}

.label-top {
  top: 65px;
  right: 90px;
}

.label-bottom {
  bottom: 65px;
  left: 100px;
}

/* =========================================================
   INFO GRID
========================================================= */

.info-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 10px;

  margin-bottom: 55px;
}

.info-card {
  padding: 24px;

  border:
    1px solid
    rgba(190,164,245,.06);

  border-radius: 16px;

  background:
    rgba(255,255,255,.014);
}

.info-number {
  color: #8267aa;

  font-size: 6px;

  letter-spacing: 1.5px;
}

.info-card h3 {
  margin:
    15px 0 8px;

  color: #bdb3c9;

  font-size: 12px;

  font-weight: 500;
}

.info-card p {
  margin: 0;

  color: #5e5865;

  font-size: 8px;

  line-height: 1.75;
}

/* =========================================================
   FOOTER
========================================================= */

.company-footer {
  display: flex;
  justify-content: space-between;

  padding-top: 20px;

  border-top:
    1px solid
    rgba(190,164,245,.05);

  color: #403b47;

  font-size: 5.5px;

  letter-spacing: 1.4px;

  font-weight: 700;
}

/* =========================================================
   LOADING
========================================================= */

.loading-page {
  min-height: 100vh;

  display: grid;
  place-items: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;

  gap: 13px;

  color: #6a6372;

  font-size: 7px;

  letter-spacing: 1.6px;
}

.loading-container small {
  color: #393540;

  font-size: 5px;

  letter-spacing: 2px;
}

.loading-ring {
  width: 42px;
  height: 42px;

  border:
    1px solid
    rgba(190,164,245,.1);

  border-top-color:
    #a78bdc;

  border-radius: 50%;

  animation:
    companySpin
    .75s
    linear
    infinite;
}

/* =========================================================
   NOT FOUND
========================================================= */

.not-found-page {
  min-height: 100vh;

  display: grid;
  place-items: center;
}

.not-found-card {
  width:
    min(
      430px,
      calc(100% - 40px)
    );

  padding: 40px;

  border:
    1px solid
    rgba(190,164,245,.1);

  border-radius: 22px;

  background:
    rgba(255,255,255,.025);

  text-align: center;
}

.not-found-number {
  color: #9a7acb;

  font-size: 65px;

  font-weight: 300;

  letter-spacing: -4px;
}

.not-found-label {
  color: #635a70;

  font-size: 6px;

  letter-spacing: 1.7px;
}

.not-found-card h1 {
  margin:
    13px 0 8px;

  color: #d3cbdf;

  font-size: 22px;

  font-weight: 500;
}

.not-found-card p {
  color: #625b68;

  font-size: 8px;

  line-height: 1.7;
}

.not-found-card button {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  margin-top: 17px;

  padding:
    11px 15px;

  border:
    1px solid
    rgba(190,164,245,.12);

  border-radius: 9px;

  color: #a38bc5;

  background:
    rgba(143,105,239,.05);

  cursor: pointer;

  font-size: 6px;

  letter-spacing: 1px;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1050px) {

  .company-hero {
    grid-template-columns: 1fr;
  }

  .progress-card {
    min-height: 260px;
  }

  .coding-strip {
    grid-template-columns: 1fr;
  }

  .interview-feature {
    grid-template-columns: 1fr;
  }

  .interview-visual {
    min-height: 300px;
  }
}

@media (max-width: 760px) {

  .company-details-shell {
    width:
      calc(100% - 28px);

    padding-top: 20px;
  }

  .company-topbar {
    margin-bottom: 24px;
  }

  .company-hero {
    margin-bottom: 48px;
  }

  .hero-main {
    padding: 25px;
  }

  .company-heading {
    align-items: flex-start;
  }

  .company-logo {
    width: 65px;
    height: 65px;
  }

  .company-logo img {
    width: 40px;
    height: 40px;
  }

  .company-title-block h1 {
    font-size: 42px;
    letter-spacing: -2.5px;
  }

  .company-description {
    font-size: 10px;
  }

  .company-meta {
    flex-wrap: wrap;

    gap: 18px;
  }

  .meta-item {
    min-width: 130px;

    padding-right: 0;
    margin-right: 0;

    border-right: 0;
  }

  .section-heading {
    flex-direction: column;

    align-items: flex-start;

    gap: 12px;
  }

  .section-heading p {
    text-align: left;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }

  .coding-strip {
    padding: 23px;
  }

  .difficulty-list {
    grid-template-columns: 1fr;
  }

  .interview-feature-left {
    padding: 30px;
  }

  .interview-feature h2 {
    font-size: 34px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .company-footer {
    flex-direction: column;

    gap: 9px;
  }
}

@media (max-width: 480px) {

  .company-heading {
    flex-direction: column;
  }

  .company-title-block h1 {
    font-size: 38px;
  }

  .progress-visual {
    margin-top: 35px;
  }

  .progress-ring {
    width: 70px;
    height: 70px;
  }

  .progress-visual p {
    font-size: 7px;
  }

  .module-card {
    min-height: 265px;
  }

  .module-stats {
    gap: 14px;
  }

  .interview-visual {
    min-height: 270px;
  }

  .avatar-placeholder {
    width: 125px;
    height: 175px;
  }

  .visual-label {
    display: none;
  }
}

/* =========================================================
   ANIMATION
========================================================= */

@keyframes companySpin {
  to {
    transform:
      rotate(360deg);
  }
}
`;