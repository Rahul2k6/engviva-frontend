import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { auth } from "../firebase";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

/*
 * Fallback catalog.
 *
 * Once /api/companies is available,
 * backend data will automatically take priority.
 */
const FALLBACK_COMPANIES = [
  {
    id: "google",
    name: "Google",
    domain: "google.com",
    category: "Technology",
    description:
      "Product engineering, cloud, AI and software development opportunities.",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "ML Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    color: "#4285F4",
  },

  {
    id: "microsoft",
    name: "Microsoft",
    domain: "microsoft.com",
    category: "Technology",
    description:
      "Software, cloud, AI, infrastructure and enterprise engineering roles.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "AI Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
    color: "#7FBA00",
  },

  {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    category: "Technology",
    description:
      "Large-scale software, cloud, infrastructure and data engineering.",
    roles: [
      "Software Development Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Solutions Architect",
    ],
    color: "#FF9900",
  },

  {
    id: "apple",
    name: "Apple",
    domain: "apple.com",
    category: "Technology",
    description:
      "Software, systems, hardware and platform engineering opportunities.",
    roles: [
      "Software Engineer",
      "iOS Developer",
      "Systems Engineer",
      "ML Engineer",
    ],
    color: "#A3AAAE",
  },

  {
    id: "meta",
    name: "Meta",
    domain: "meta.com",
    category: "Technology",
    description:
      "Software, AI, infrastructure and product engineering roles.",
    roles: [
      "Software Engineer",
      "ML Engineer",
      "Data Engineer",
      "Infrastructure Engineer",
    ],
    color: "#0866FF",
  },

  {
    id: "nvidia",
    name: "NVIDIA",
    domain: "nvidia.com",
    category: "AI & Semiconductor",
    description:
      "AI, GPU computing, systems and semiconductor engineering.",
    roles: [
      "Software Engineer",
      "AI Engineer",
      "ML Engineer",
      "Systems Engineer",
    ],
    color: "#76B900",
  },

  {
    id: "ibm",
    name: "IBM",
    domain: "ibm.com",
    category: "Technology",
    description:
      "Enterprise software, cloud, AI, cybersecurity and consulting.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "AI Engineer",
      "Cybersecurity Engineer",
    ],
    color: "#0F62FE",
  },

  {
    id: "oracle",
    name: "Oracle",
    domain: "oracle.com",
    category: "Enterprise",
    description:
      "Cloud infrastructure, enterprise software and database engineering.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Database Engineer",
      "DevOps Engineer",
    ],
    color: "#F80000",
  },

  {
    id: "salesforce",
    name: "Salesforce",
    domain: "salesforce.com",
    category: "SaaS",
    description:
      "Cloud software, platform engineering and enterprise applications.",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    color: "#00A1E0",
  },

  {
    id: "adobe",
    name: "Adobe",
    domain: "adobe.com",
    category: "Technology",
    description:
      "Creative software, cloud products, AI and platform engineering.",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "ML Engineer",
    ],
    color: "#FF0000",
  },

  {
    id: "cisco",
    name: "Cisco",
    domain: "cisco.com",
    category: "Networking",
    description:
      "Networking, cybersecurity, cloud and infrastructure engineering.",
    roles: [
      "Network Engineer",
      "Software Engineer",
      "Cybersecurity Engineer",
      "Cloud Engineer",
    ],
    color: "#1BA0D7",
  },

  {
    id: "intel",
    name: "Intel",
    domain: "intel.com",
    category: "Semiconductor",
    description:
      "Processors, systems, software and semiconductor engineering.",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "Embedded Engineer",
      "AI Engineer",
    ],
    color: "#0071C5",
  },

  {
    id: "accenture",
    name: "Accenture",
    domain: "accenture.com",
    category: "Consulting",
    description:
      "Technology consulting, cloud, data, AI and enterprise engineering.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Cybersecurity Engineer",
    ],
    color: "#A100FF",
  },

  {
    id: "deloitte",
    name: "Deloitte",
    domain: "deloitte.com",
    category: "Consulting",
    description:
      "Technology consulting, analytics, cloud and enterprise solutions.",
    roles: [
      "Software Engineer",
      "Data Analyst",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
    color: "#86BC25",
  },

  {
    id: "tcs",
    name: "TCS",
    domain: "tcs.com",
    category: "Indian IT",
    description:
      "IT services, software engineering, cloud and enterprise technology.",
    roles: [
      "Software Engineer",
      "System Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    color: "#0056A6",
  },

  {
    id: "infosys",
    name: "Infosys",
    domain: "infosys.com",
    category: "Indian IT",
    description:
      "Digital engineering, consulting, cloud and enterprise technology.",
    roles: [
      "Systems Engineer",
      "Software Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
    color: "#007CC3",
  },

  {
    id: "wipro",
    name: "Wipro",
    domain: "wipro.com",
    category: "Indian IT",
    description:
      "IT services, cloud, cybersecurity and digital engineering.",
    roles: [
      "Project Engineer",
      "Software Engineer",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
    color: "#341F6E",
  },

  {
    id: "hcltech",
    name: "HCLTech",
    domain: "hcltech.com",
    category: "Indian IT",
    description:
      "Engineering services, cloud, software and digital transformation.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
    color: "#0070C0",
  },

  {
    id: "techmahindra",
    name: "Tech Mahindra",
    domain: "techmahindra.com",
    category: "Indian IT",
    description:
      "Digital engineering, telecom, cloud and enterprise technology.",
    roles: [
      "Software Engineer",
      "Network Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    color: "#E31837",
  },

  {
    id: "cognizant",
    name: "Cognizant",
    domain: "cognizant.com",
    category: "Indian IT",
    description:
      "Digital engineering, cloud, AI and enterprise technology.",
    roles: [
      "Programmer Analyst",
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    color: "#0033A0",
  },

  {
    id: "ltimindtree",
    name: "LTIMindtree",
    domain: "ltimindtree.com",
    category: "Indian IT",
    description:
      "Digital transformation, cloud, data and software engineering.",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    color: "#1D4380",
  },

  {
    id: "persistent",
    name: "Persistent Systems",
    domain: "persistent.com",
    category: "Indian IT",
    description:
      "Digital engineering, cloud, data and software products.",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
    color: "#E31837",
  },

  {
    id: "zoho",
    name: "Zoho",
    domain: "zoho.com",
    category: "SaaS",
    description:
      "Business software, cloud applications and product engineering.",
    roles: [
      "Software Developer",
      "Backend Developer",
      "Frontend Developer",
      "QA Engineer",
    ],
    color: "#F44336",
  },

  {
    id: "freshworks",
    name: "Freshworks",
    domain: "freshworks.com",
    category: "SaaS",
    description:
      "Cloud software, customer experience and SaaS engineering.",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Data Engineer",
    ],
    color: "#2D2D2D",
  },

  {
    id: "flipkart",
    name: "Flipkart",
    domain: "flipkart.com",
    category: "Indian Product",
    description:
      "E-commerce, distributed systems, logistics and product engineering.",
    roles: [
      "Software Development Engineer",
      "Data Engineer",
      "Backend Developer",
      "ML Engineer",
    ],
    color: "#2874F0",
  },

  {
    id: "phonepe",
    name: "PhonePe",
    domain: "phonepe.com",
    category: "FinTech",
    description:
      "Digital payments, financial technology and large-scale backend systems.",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "Android Developer",
    ],
    color: "#5F259F",
  },

  {
    id: "razorpay",
    name: "Razorpay",
    domain: "razorpay.com",
    category: "FinTech",
    description:
      "Payments infrastructure, financial technology and platform engineering.",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Frontend Developer",
      "Data Engineer",
    ],
    color: "#3395FF",
  },

  {
    id: "swiggy",
    name: "Swiggy",
    domain: "swiggy.com",
    category: "Indian Product",
    description:
      "Consumer technology, logistics, data and large-scale systems.",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
    color: "#FC8019",
  },

  {
    id: "zomato",
    name: "Zomato",
    domain: "zomato.com",
    category: "Indian Product",
    description:
      "Consumer technology, logistics and data-driven products.",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
    color: "#E23744",
  },

  {
    id: "siemens",
    name: "Siemens",
    domain: "siemens.com",
    category: "Engineering",
    description:
      "Industrial automation, digital engineering and intelligent infrastructure.",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automation Engineer",
      "Data Engineer",
    ],
    color: "#009999",
  },

  {
    id: "bosch",
    name: "Bosch",
    domain: "bosch.com",
    category: "Engineering",
    description:
      "Automotive, embedded systems, IoT and engineering technology.",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automotive Engineer",
      "Data Engineer",
    ],
    color: "#E20015",
  },

  {
    id: "qualcomm",
    name: "Qualcomm",
    domain: "qualcomm.com",
    category: "Semiconductor",
    description:
      "Wireless technology, embedded systems, AI and semiconductor engineering.",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Systems Engineer",
      "AI Engineer",
    ],
    color: "#3253DC",
  },

  {
    id: "amd",
    name: "AMD",
    domain: "amd.com",
    category: "Semiconductor",
    description:
      "Processors, GPUs, systems and high-performance computing.",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "AI Engineer",
      "Embedded Engineer",
    ],
    color: "#ED1C24",
  },

  {
    id: "mckinsey",
    name: "McKinsey & Company",
    domain: "mckinsey.com",
    category: "Consulting",
    description:
      "Technology consulting, analytics and digital transformation.",
    roles: [
      "Technology Analyst",
      "Data Engineer",
      "Software Engineer",
      "Data Scientist",
    ],
    color: "#1F1F1F",
  },

  {
    id: "pwc",
    name: "PwC",
    domain: "pwc.com",
    category: "Consulting",
    description:
      "Technology consulting, cybersecurity, analytics and enterprise systems.",
    roles: [
      "Technology Consultant",
      "Software Engineer",
      "Data Analyst",
      "Cybersecurity Engineer",
    ],
    color: "#D04A02",
  },
  {
  "id": "pitti",
  "name": "Pitti Engineering",
  "domain": "pitti.in",
  "category": "Manufacturing",
  "description": "India's largest manufacturer of electrical steel laminations, motor cores, sub-assemblies, die-cast rotors, and high-precision machined components.",
  "roles": [
    "Mechanical Engineer",
    "Production Engineer",
    "CNC Machinist",
    "Quality Control Inspector"
  ],
  "color": "#D04A02" 
},

];

/* =========================================================
   LOGO
========================================================= */

function getCompanyLogo(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/* =========================================================
   COMPANY LOGO COMPONENT
========================================================= */

function CompanyLogo({
  company,
  large = false,
}) {
  const [failed, setFailed] =
    useState(false);

  return (
    <div
      className={
        large
          ? "company-logo large"
          : "company-logo"
      }
      style={{
        "--company-color":
          company.color ||
          "#a78bfa",
      }}
    >
      {!failed ? (
        <img
          src={getCompanyLogo(
            company.domain
          )}
          alt=""
          loading="lazy"
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <span>
          {company.name
            .split(" ")
            .map(
              (word) =>
                word[0]
            )
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

/* =========================================================
   COMPANY CARD
========================================================= */

function CompanyCard({
  company,
  index,
  onOpen,
}) {
  return (
    <article
      className="company-card"
      style={{
        "--delay":
          `${index * 35}ms`,
        "--company-color":
          company.color ||
          "#a78bfa",
      }}
      onClick={() =>
        onOpen(company)
      }
    >
      <div className="card-top">

        <CompanyLogo
          company={company}
        />

        <span className="company-category">
          {company.category}
        </span>

      </div>

      <div className="company-main">

        <h3>
          {company.name}
        </h3>

        <p>
          {company.description}
        </p>

      </div>

      <div className="company-roles">

        <div className="roles-heading">
          <span>
            AVAILABLE ROLES
          </span>

          <strong>
            {company.roles?.length ||
              0}
          </strong>
        </div>

        <div className="role-preview">

          {(
            company.roles || []
          )
            .slice(0, 3)
            .map(
              (role) => (
                <span
                  key={role}
                >
                  {role}
                </span>
              )
            )}

          {company.roles?.length >
            3 && (
            <span className="more-role">
              +
              {company.roles.length -
                3}
            </span>
          )}

        </div>

      </div>

      <div className="card-bottom">

        <span>
          EXPLORE COMPANY
        </span>

        <div className="arrow">
          →
        </div>

      </div>

      <div className="card-shine" />
    </article>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function Companies() {
  const navigate =
    useNavigate();

  const [
    companies,
    setCompanies,
  ] = useState(
    FALLBACK_COMPANIES
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All");

  const [
    viewMode,
    setViewMode,
  ] = useState("grid");

  const [
    backendStatus,
    setBackendStatus,
  ] = useState("fallback");

  /* =======================================================
     LOAD COMPANIES
  ======================================================= */

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      const headers = {};

      if (user) {
        const token =
          await user.getIdToken();

        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          `${API_BASE}/api/companies`,
          {
            headers,
          }
        );

      if (!response.ok) {
        throw new Error(
          "Company API unavailable"
        );
      }

      const result =
        await response.json();

      /*
       * Support both:
       *
       * { companies: [...] }
       *
       * and
       *
       * { data: [...] }
       */

      const remoteCompanies =
        result.companies ||
        result.data;

      if (
        Array.isArray(
          remoteCompanies
        ) &&
        remoteCompanies.length
      ) {
        setCompanies(
          remoteCompanies
        );

        setBackendStatus(
          "connected"
        );
      }
    } catch (error) {
      console.warn(
        "[ENGVIVA] Company API unavailable. Using local catalog.",
        error
      );

      setBackendStatus(
        "fallback"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories =
    useMemo(() => {
      const values =
        companies
          .map(
            (company) =>
              company.category
          )
          .filter(Boolean);

      return [
        "All",
        ...Array.from(
          new Set(values)
        ),
      ];
    }, [companies]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredCompanies =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return companies.filter(
        (company) => {
          const matchesSearch =
            !query ||
            company.name
              .toLowerCase()
              .includes(query) ||
            company.category
              ?.toLowerCase()
              .includes(query) ||
            company.roles?.some(
              (role) =>
                role
                  .toLowerCase()
                  .includes(query)
            );

          const matchesCategory =
            activeCategory ===
              "All" ||
            company.category ===
              activeCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      companies,
      search,
      activeCategory,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats =
    useMemo(() => {
      const roleSet =
        new Set();

      companies.forEach(
        (company) => {
          (
            company.roles || []
          ).forEach(
            (role) =>
              roleSet.add(
                role
              )
          );
        }
      );

      return {
        companies:
          companies.length,

        categories:
          categories.length -
          1,

        roles:
          roleSet.size,
      };
    }, [
      companies,
      categories,
    ]);

  /* =======================================================
     OPEN COMPANY
  ======================================================= */

  function openCompany(
    company
  ) {
    navigate(
      `/companies/${company.id}`
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="companies-page">

      <style>{styles}</style>

      {/* BACKGROUND */}

      <div className="companies-orb orb-one" />
      <div className="companies-orb orb-two" />

      <div className="companies-noise" />

      <main className="companies-shell">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="companies-header">

          <div className="header-copy">

            <div className="eyebrow">
              ENGVIVA / COMPANY INTELLIGENCE
            </div>

            <h1>
              Find where
              <span>
                you belong.
              </span>
            </h1>

            <p>
              Explore engineering
              opportunities, understand
              company-specific roles and
              prepare against the recruitment
              process that actually matters.
            </p>

          </div>

          <div className="header-stats">

            <div className="stat">
              <strong>
                {stats.companies}
              </strong>

              <span>
                COMPANIES
              </span>
            </div>

            <div className="stat">
              <strong>
                {stats.categories}
              </strong>

              <span>
                INDUSTRIES
              </span>
            </div>

            <div className="stat">
              <strong>
                {stats.roles}
              </strong>

              <span>
                ROLE TYPES
              </span>
            </div>

          </div>

        </header>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="company-controls">

          <div className="search-box">

            <span className="search-icon">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search companies, roles or industries..."
            />

            {search && (
              <button
                className="clear-search"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>

          <div className="view-controls">

            <button
              className={
                viewMode === "grid"
                  ? "view-btn active"
                  : "view-btn"
              }
              onClick={() =>
                setViewMode(
                  "grid"
                )
              }
            >
              ▦
            </button>

            <button
              className={
                viewMode === "compact"
                  ? "view-btn active"
                  : "view-btn"
              }
              onClick={() =>
                setViewMode(
                  "compact"
                )
              }
            >
              ▤
            </button>

          </div>

        </section>

        {/* =================================================
            CATEGORY NAVIGATION
        ================================================= */}

        <section className="category-row">

          <div className="category-scroll">

            {categories.map(
              (category) => (
                <button
                  key={category}
                  className={
                    activeCategory ===
                    category
                      ? "category active"
                      : "category"
                  }
                  onClick={() =>
                    setActiveCategory(
                      category
                    )
                  }
                >
                  {category}
                </button>
              )
            )}

          </div>

          <div className="catalog-status">

            <span
              className={
                backendStatus ===
                "connected"
                  ? "status-dot connected"
                  : "status-dot"
              }
            />

            {backendStatus ===
            "connected"
              ? "LIVE DATABASE"
              : "LOCAL CATALOG"}

          </div>

        </section>

        {/* =================================================
            RESULTS
        ================================================= */}

        <section className="results-header">

          <div>
            <span>
              COMPANY DIRECTORY
            </span>

            <strong>
              {filteredCompanies.length}
              {" "}
              results
            </strong>
          </div>

          {search && (
            <div className="search-result">
              Results for "
              {search}"
            </div>
          )}

        </section>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="company-loading">

            <div className="loading-ring" />

            <span>
              Synchronizing company intelligence...
            </span>

          </div>
        )}

        {/* =================================================
            EMPTY
        ================================================= */}

        {!loading &&
          filteredCompanies.length ===
            0 && (
            <div className="empty-state">

              <div className="empty-icon">
                ?
              </div>

              <h2>
                No company found.
              </h2>

              <p>
                Try another company,
                role or industry.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory(
                    "All"
                  );
                }}
              >
                RESET FILTERS
              </button>

            </div>
          )}

        {/* =================================================
            COMPANY GRID
        ================================================= */}

        {!loading &&
          filteredCompanies.length >
            0 && (
            <div
              className={
                viewMode === "compact"
                  ? "company-grid compact"
                  : "company-grid"
              }
            >

              {filteredCompanies.map(
                (
                  company,
                  index
                ) => (
                  <CompanyCard
                    key={
                      company.id
                    }
                    company={
                      company
                    }
                    index={
                      index
                    }
                    onOpen={
                      openCompany
                    }
                  />
                )
              )}

            </div>
          )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="companies-footer">

          <div>
            <span className="footer-mark">
              E
            </span>

            <span>
              ENGVIVA COMPANY INTELLIGENCE
            </span>
          </div>

          <span>
            COMPANY DATA POWERS
            ROLE-SPECIFIC PREPARATION
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

.companies-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;

  background:
    radial-gradient(
      circle at 72% 8%,
      rgba(151,115,255,.13),
      transparent 29%
    ),
    radial-gradient(
      circle at 4% 80%,
      rgba(95,61,180,.08),
      transparent 30%
    ),
    #07070c;

  color: #f5f1ff;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.companies-shell {
  position: relative;
  z-index: 2;

  width:
    min(1420px, calc(100% - 56px));

  margin: auto;

  padding:
    55px 0 70px;
}

/* =========================================================
   BACKGROUND
========================================================= */

.companies-orb {
  position: fixed;

  width: 430px;
  height: 430px;

  border-radius: 50%;

  filter: blur(130px);

  opacity: .09;

  pointer-events: none;

  animation:
    floatingOrb
    12s ease-in-out
    infinite alternate;
}

.orb-one {
  right: -170px;
  top: 150px;

  background: #a27cff;
}

.orb-two {
  left: -220px;
  bottom: -120px;

  background: #5b35bd;

  animation-delay:
    -5s;
}

.companies-noise {
  position: fixed;
  inset: 0;

  pointer-events: none;

  z-index: 1;

  opacity: .025;

  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* =========================================================
   HEADER
========================================================= */

.companies-header {
  display: flex;

  align-items: flex-end;

  justify-content:
    space-between;

  gap: 50px;

  margin-bottom: 50px;
}

.header-copy {
  max-width: 720px;
}

.eyebrow {
  color: #a88cf1;

  font-size: 8px;

  font-weight: 800;

  letter-spacing: 2.8px;
}

.header-copy h1 {
  margin:
    13px 0 16px;

  font-size:
    clamp(
      46px,
      6vw,
      78px
    );

  line-height: .94;

  letter-spacing:
    -4px;

  font-weight: 750;
}

.header-copy h1 span {
  display: block;

  color: #ad91ff;

  text-shadow:
    0 0 45px
    rgba(161,126,255,.18);
}

.header-copy p {
  max-width: 620px;

  margin: 0;

  color: #716c7b;

  font-size: 12px;

  line-height: 1.85;
}

.header-stats {
  display: flex;

  min-width: 350px;

  padding:
    17px 0;

  border-top:
    1px solid
    rgba(211,197,255,.09);

  border-bottom:
    1px solid
    rgba(211,197,255,.09);
}

.stat {
  flex: 1;

  padding:
    0 20px;

  border-right:
    1px solid
    rgba(211,197,255,.07);
}

.stat:last-child {
  border-right: 0;
}

.stat strong {
  display: block;

  color: #d8ccf5;

  font-size: 22px;

  font-weight: 700;
}

.stat span {
  display: block;

  margin-top: 5px;

  color: #575260;

  font-size: 7px;

  letter-spacing: 1.5px;

  font-weight: 700;
}

/* =========================================================
   CONTROLS
========================================================= */

.company-controls {
  display: flex;

  gap: 12px;

  margin-bottom: 16px;
}

.search-box {
  position: relative;

  flex: 1;

  height: 48px;
}

.search-box input {
  width: 100%;
  height: 100%;

  padding:
    0 45px;

  border:
    1px solid
    rgba(211,197,255,.09);

  outline: none;

  border-radius: 13px;

  background:
    rgba(255,255,255,.035);

  color: #e8e2f5;

  font:
    inherit;

  font-size: 10px;

  backdrop-filter:
    blur(20px);

  transition:
    .25s ease;
}

.search-box input:focus {
  border-color:
    rgba(174,145,255,.35);

  background:
    rgba(151,115,255,.045);

  box-shadow:
    0 0 35px
    rgba(130,95,220,.06);
}

.search-box input::placeholder {
  color: #514d59;
}

.search-icon {
  position: absolute;

  left: 17px;
  top: 50%;

  transform:
    translateY(-50%);

  color: #7d7195;

  font-size: 19px;

  z-index: 2;
}

.clear-search {
  position: absolute;

  right: 13px;
  top: 50%;

  transform:
    translateY(-50%);

  border: 0;

  color: #756d80;

  background: transparent;

  cursor: pointer;

  font-size: 17px;
}

.view-controls {
  display: flex;

  gap: 4px;

  padding: 4px;

  border:
    1px solid
    rgba(211,197,255,.08);

  border-radius: 13px;

  background:
    rgba(255,255,255,.025);
}

.view-btn {
  width: 40px;
  height: 40px;

  border: 0;

  border-radius: 9px;

  color: #625d6b;

  background:
    transparent;

  cursor: pointer;

  font-size: 17px;

  transition: .2s;
}

.view-btn.active {
  color: #d1c2f4;

  background:
    rgba(161,126,255,.12);

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.06);
}

/* =========================================================
   CATEGORIES
========================================================= */

.category-row {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 20px;

  margin-bottom: 34px;
}

.category-scroll {
  display: flex;

  gap: 7px;

  overflow-x: auto;

  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category {
  white-space: nowrap;

  padding:
    9px 13px;

 border:
    1px solid
    rgba(82,227,164,.08);

  border-radius: 9px;

  color: #686370;

  background:
    rgba(255,255,255,.025);

  cursor: pointer;

  font-size: 8px;

  transition:
    .22s ease;
}

.category:hover {
  color: #b7a5db;

  border-color:
    rgba(175,145,255,.22);
}

.category.active {
  color: #d8cbf7;

  border-color:
    rgba(175,145,255,.3);

  background:
    rgba(154,119,245,.1);

  box-shadow:
    0 5px 25px
    rgba(120,80,210,.08);
}

.catalog-status {
  display: flex;

  align-items: center;

  gap: 7px;

  white-space: nowrap;

  color: #575260;

  font-size: 7px;

  letter-spacing: 1px;
}

.status-dot {
  width: 5px;
  height: 5px;

  border-radius: 50%;

  background: #d6a056;

  box-shadow:
    0 0 9px
    rgba(214,160,86,.5);
}

.status-dot.connected {
  background: #63dfa8;

  box-shadow:
    0 0 10px
    rgba(99,223,168,.7);
}

/* =========================================================
   RESULTS HEADER
========================================================= */

.results-header {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  margin-bottom: 16px;
}

.results-header > div:first-child {
  display: flex;

  align-items: center;

  gap: 10px;
}

.results-header span {
  color: #5a5563;

  font-size: 7px;

  letter-spacing: 1.5px;

  font-weight: 700;
}

.results-header strong {
  color: #aaa1b8;

  font-size: 9px;

  font-weight: 500;
}

.search-result {
  color: #625c6b;

  font-size: 8px;
}

/* =========================================================
   COMPANY GRID
========================================================= */

.company-grid {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 14px;
}

.company-grid.compact {
  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );
}

.company-card {
  position: relative;

  min-height: 330px;

  padding: 21px;

  overflow: hidden;

  border:
    1px solid
    rgba(213,199,255,.085);

  border-radius: 21px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.052),
      rgba(255,255,255,.018)
    );

  backdrop-filter:
    blur(26px);

  cursor: pointer;

  opacity: 0;

  animation:
    cardEnter
    .65s
    cubic-bezier(.2,.8,.2,1)
    forwards;

  animation-delay:
    var(--delay);

  transition:
    transform .4s
      cubic-bezier(.2,.8,.2,1),
    border-color .35s ease,
    box-shadow .35s ease,
    background .35s ease;
}

.company-card:hover {
  transform:
    translateY(-7px);

  border-color:
    color-mix(
      in srgb,
      var(--company-color)
      25%,
      rgba(211,197,255,.16)
    );

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.075),
      rgba(145,110,235,.035)
    );

  box-shadow:
    0 25px 70px
    rgba(0,0,0,.25),

    0 0 45px
    color-mix(
      in srgb,
      var(--company-color)
      8%,
      transparent
    );
}

.card-shine {
  position: absolute;

  width: 220px;
  height: 220px;

  top: -150px;
  right: -100px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      var(--company-color),
      transparent 70%
    );

  opacity: .035;

  transition:
    .5s ease;

  pointer-events: none;
}

.company-card:hover
.card-shine {
  opacity: .09;

  transform:
    scale(1.25);
}

.card-top {
  display: flex;

  align-items: flex-start;

  justify-content:
    space-between;
}

.company-logo {
  width: 54px;
  height: 54px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(255,255,255,.1);

  border-radius: 15px;

  background:
    rgba(255,255,255,.055);

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.08),

    0 12px 30px
    rgba(0,0,0,.15);

  overflow: hidden;

  transition:
    transform .35s ease;
}

.company-card:hover
.company-logo {
  transform:
    translateY(-2px)
    rotate(-3deg)
    scale(1.04);
}

.company-logo img {
  width: 35px;
  height: 35px;

  object-fit: contain;
}

.company-logo span {
  color: #ddd4f0;

  font-size: 13px;

  font-weight: 800;

  letter-spacing: -1px;
}

.company-category {
  padding:
    6px 8px;

  border:
    1px solid
    rgba(211,197,255,.07);

  border-radius: 7px;

  color: #67616f;

  background:
    rgba(255,255,255,.025);

  font-size: 6px;

  letter-spacing: 1px;

  font-weight: 700;
}

/* =========================================================
   CARD MAIN
========================================================= */

.company-main {
  margin-top: 26px;
}

.company-main h3 {
  margin: 0;

  color: #e4dff0;

  font-size: 19px;

  letter-spacing: -.5px;
}

.company-main p {
  min-height: 52px;

  margin:
    9px 0 0;

  color: #66616e;

  font-size: 8.5px;

  line-height: 1.7;
}

/* =========================================================
   ROLES
========================================================= */

.company-roles {
  margin-top: 21px;

  padding-top: 15px;

  border-top:
    1px solid
    rgba(211,197,255,.055);
}

.roles-heading {
  display: flex;

  justify-content:
    space-between;

  align-items: center;
}

.roles-heading span {
  color: #55505d;

  font-size: 6px;

  letter-spacing: 1.2px;

  font-weight: 700;
}

.roles-heading strong {
  color: #a994d1;

  font-size: 8px;
}

.role-preview {
  display: flex;

  flex-wrap: wrap;

  gap: 5px;

  margin-top: 10px;
}

.role-preview span {
  max-width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  padding:
    5px 7px;

  border:
    1px solid
    rgba(211,197,255,.055);

  border-radius: 6px;

  color: #716b7a;

  background:
    rgba(255,255,255,.018);

  font-size: 6.5px;
}

.role-preview .more-role {
  color: #a58ce0;

  border-color:
    rgba(165,140,224,.12);

  background:
    rgba(165,140,224,.05);
}

/* =========================================================
   CARD FOOTER
========================================================= */

.card-bottom {
  position: absolute;

  left: 21px;
  right: 21px;
  bottom: 18px;

  display: flex;

  align-items: center;

  justify-content:
    space-between;

  padding-top: 14px;

  border-top:
    1px solid
    rgba(211,197,255,.05);

  color: #68616f;

  font-size: 6px;

  letter-spacing: 1.5px;

  font-weight: 700;
}

.arrow {
  width: 27px;
  height: 27px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(211,197,255,.08);

  border-radius: 8px;

  color: #aaa0bb;

  font-size: 13px;

  transition:
    .3s ease;
}

.company-card:hover
.arrow {
  color: white;

  background:
    rgba(160,125,255,.13);

  border-color:
    rgba(176,145,255,.25);

  transform:
    translateX(3px);
}

/* =========================================================
   LOADING
========================================================= */

.company-loading {
  min-height: 380px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 15px;

  color: #5e5868;

  font-size: 8px;

  letter-spacing: 1px;
}

.loading-ring {
  width: 35px;
  height: 35px;

  border:
    1px solid
    rgba(177,148,255,.12);

  border-top-color:
    #b49aff;

  border-radius: 50%;

  animation:
    spin
    .8s linear
    infinite;
}

/* =========================================================
   EMPTY
========================================================= */

.empty-state {
  min-height: 380px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  text-align: center;
}

.empty-icon {
  width: 55px;
  height: 55px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(211,197,255,.1);

  border-radius: 17px;

  color: #9a88ba;

  background:
    rgba(255,255,255,.035);

  font-size: 18px;
}

.empty-state h2 {
  margin:
    17px 0 5px;

  font-size: 18px;
}

.empty-state p {
  margin: 0;

  color: #625c69;

  font-size: 9px;
}

.empty-state button {
  margin-top: 20px;

  padding:
    10px 14px;

  border:
    1px solid
    rgba(177,148,255,.2);

  border-radius: 9px;

  color: #bba8e0;

  background:
    rgba(151,115,255,.06);

  cursor: pointer;

  font-size: 7px;

  letter-spacing: 1px;
}

/* =========================================================
   FOOTER
========================================================= */

.companies-footer {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  margin-top: 60px;

  padding-top: 20px;

  border-top:
    1px solid
    rgba(211,197,255,.055);

  color: #403b48;

  font-size: 6px;

  letter-spacing: 1.5px;
}

.companies-footer > div {
  display: flex;

  align-items: center;

  gap: 8px;
}

.footer-mark {
  width: 18px;
  height: 18px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(174,145,255,.18);

  border-radius: 5px;

  color: #9e87d1;

  font-weight: 800;
}

/* =========================================================
   ANIMATIONS
========================================================= */

@keyframes cardEnter {
  from {
    opacity: 0;

    transform:
      translateY(18px)
      scale(.985);
  }

  to {
    opacity: 1;

    transform:
      translateY(0)
      scale(1);
  }
}

@keyframes floatingOrb {
  from {
    transform:
      translate3d(
        -15px,
        0,
        0
      );
  }

  to {
    transform:
      translate3d(
        20px,
        -25px,
        0
      );
  }
}

@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (
  max-width: 1150px
) {
  .company-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
  }

  .header-stats {
    min-width: 300px;
  }
}

@media (
  max-width: 850px
) {
  .companies-shell {
    width:
      min(
        100% - 28px,
        1420px
      );

    padding-top: 35px;
  }

  .companies-header {
    flex-direction: column;

    align-items: flex-start;
  }

  .header-stats {
    width: 100%;
  }

  .company-grid,
  .company-grid.compact {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }
}

@media (
  max-width: 560px
) {
  .companies-header {
    margin-bottom: 30px;
  }

  .header-copy h1 {
    font-size: 43px;
    letter-spacing: -2.5px;
  }

  .company-controls {
    flex-direction: column;
  }

  .view-controls {
    width: 100%;
  }

  .view-btn {
    flex: 1;
  }

  .category-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .catalog-status {
    display: none;
  }

  .company-grid,
  .company-grid.compact {
    grid-template-columns: 1fr;
  }

  .companies-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
`;