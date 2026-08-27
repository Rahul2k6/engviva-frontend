import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "https://engviva-backend.onrender.com";

/* =========================================================
   HELPERS
========================================================= */

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function getDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0];
}

/* =========================================================
   FIREBASE TOKEN
========================================================= */

async function getFirebaseToken() {
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
  } catch (error) {
    console.warn(
      "[TECHNICAL LAB AUTH]",
      error
    );

    return null;
  }
}

/* =========================================================
   API
========================================================= */

async function apiFetch(
  path,
  options = {}
) {
  const token =
    await getFirebaseToken();

  const headers = {
    Accept: "application/json",

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

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,
      }
    );

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Request failed (${response.status})`;

    const error =
      new Error(message);

    error.status =
      response.status;

    throw error;
  }

  return payload;
}

/* =========================================================
   LOGO
========================================================= */

function CompanyLogo({
  company,
  large = false,
}) {
  const domain =
    getDomain(
      company?.domain ||
      company?.website ||
      ""
    );

  if (!domain) {
    return (
      <div
        className={
          large
            ? "company-logo company-logo-large"
            : "company-logo"
        }
      >
        {String(
          company?.name || "?"
        )
          .charAt(0)
          .toUpperCase()}
      </div>
    );
  }

  return (
    <img
      className={
        large
          ? "company-logo company-logo-large"
          : "company-logo"
      }
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=256`}
      alt=""
      onError={(event) => {
        event.currentTarget.style.display =
          "none";
      }}
    />
  );
}

/* =========================================================
   STYLES
========================================================= */

const CSS = `
* {
  box-sizing: border-box;
}

.technical-page {
  min-height: 100vh;
  background: #f7f3ff;
  color: #28233a;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.technical-header {
  position: sticky;
  top: 0;
  z-index: 10;

  background: rgba(247,243,255,.92);
  backdrop-filter: blur(18px);

  border-bottom:
    1px solid #e7def5;

  padding:
    18px
    clamp(18px,4vw,56px);
}

.technical-header-inner {
  max-width: 1320px;
  margin: auto;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-button {
  border: 1px solid #ddd2ef;
  background: #ffffff;
  color: #51466b;

  width: 42px;
  height: 42px;

  border-radius: 13px;

  cursor: pointer;

  font-size: 20px;
}

.back-button:hover {
  background: #f0e8fb;
}

.brand-kicker {
  font-size: 11px;
  font-weight: 800;

  letter-spacing: .14em;

  color: #9278bd;
}

.brand-title {
  margin-top: 2px;

  font-size: 20px;
  font-weight: 900;

  color: #28233a;
}

.technical-main {
  max-width: 1320px;
  margin: auto;

  padding:
    42px
    clamp(18px,4vw,56px)
    80px;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 30px;

  margin-bottom: 34px;
}

.hero-kicker {
  font-size: 12px;
  font-weight: 800;

  letter-spacing: .16em;

  color: #9a7bc7;
}

.hero h1 {
  margin:
    8px
    0
    10px;

  font-size:
    clamp(34px,5vw,58px);

  line-height: 1;

  letter-spacing: -.04em;
}

.hero p {
  max-width: 700px;

  margin: 0;

  color: #7c738e;

  font-size: 15px;
  line-height: 1.6;
}

.status-pill {
  flex-shrink: 0;

  border:
    1px solid #dfd1ef;

  background: #ffffff;

  border-radius: 999px;

  padding:
    9px
    14px;

  color: #76638f;

  font-size: 11px;
  font-weight: 800;

  letter-spacing: .08em;
}

.error-card {
  margin-bottom: 24px;

  padding: 18px 20px;

  border:
    1px solid #e4b8cf;

  background: #fff6fa;

  color: #9d3f69;

  border-radius: 18px;

  font-weight: 700;
}

.loading-card {
  min-height: 400px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: #8d809e;

  font-weight: 700;
}

.spinner {
  width: 26px;
  height: 26px;

  border:
    3px solid #dfd5ea;

  border-top-color: #9b7ac7;

  border-radius: 50%;

  animation:
    spin .8s linear infinite;

  margin-right: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.company-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(260px, 1fr)
    );

  gap: 18px;
}

.company-card {
  border:
    1px solid #e5dcef;

  background: rgba(255,255,255,.86);

  border-radius: 24px;

  padding: 24px;

  cursor: pointer;

  transition:
    transform .18s ease,
    border-color .18s ease,
    box-shadow .18s ease;
}

.company-card:hover {
  transform: translateY(-3px);

  border-color: #c9afe7;

  box-shadow:
    0 16px 42px
    rgba(107,76,143,.10);
}

.company-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 24px;
}

.company-logo {
  width: 48px;
  height: 48px;

  object-fit: contain;

  border-radius: 14px;

  background: #ffffff;

  border:
    1px solid #e5dcef;

  padding: 9px;
}

.company-logo-large {
  width: 66px;
  height: 66px;

  border-radius: 18px;

  padding: 12px;
}

.company-arrow {
  font-size: 24px;
  color: #a78bc7;
}

.company-name {
  font-size: 21px;
  font-weight: 900;
}

.company-category {
  margin-top: 5px;

  color: #8b819a;

  font-size: 12px;
}

.company-stats {
  display: flex;
  gap: 8px;

  margin-top: 20px;

  flex-wrap: wrap;
}

.stat {
  padding:
    7px
    10px;

  border-radius: 9px;

  background: #f5effc;

  color: #77658c;

  font-size: 10px;
  font-weight: 800;

  letter-spacing: .04em;
}

.company-hero {
  display: flex;

  align-items: center;

  gap: 20px;

  padding: 24px;

  margin-bottom: 28px;

  border:
    1px solid #e5dcef;

  background: #ffffff;

  border-radius: 24px;
}

.company-hero h2 {
  margin:
    0
    0
    5px;

  font-size: 25px;
}

.company-hero p {
  margin: 0;

  color: #847a91;

  font-size: 13px;
}

.level-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(280px,1fr)
    );

  gap: 16px;
}

.level-card {
  border:
    1px solid #e5dcef;

  background: #ffffff;

  border-radius: 20px;

  padding: 22px;

  text-align: left;

  cursor: pointer;

  transition:
    transform .18s ease,
    border-color .18s ease;
}

.level-card:hover {
  transform: translateY(-2px);

  border-color: #c9afe7;
}

.level-number {
  color: #a17acb;

  font-size: 11px;
  font-weight: 900;

  letter-spacing: .12em;
}

.level-title {
  margin-top: 7px;

  font-size: 20px;
  font-weight: 900;
}

.level-meta {
  display: flex;

  gap: 8px;

  margin-top: 15px;

  flex-wrap: wrap;
}

.level-pill {
  padding:
    6px
    9px;

  border-radius: 8px;

  background: #f6f0fc;

  color: #766486;

  font-size: 10px;
  font-weight: 800;
}

.level-arrow {
  margin-top: 18px;

  color: #9d7bc5;

  font-size: 20px;
}

.empty-card {
  padding: 50px;

  text-align: center;

  border:
    1px dashed #d9cae8;

  border-radius: 20px;

  color: #877c94;

  background: rgba(255,255,255,.55);
}

@media (max-width: 700px) {
  .hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .company-hero {
    align-items: flex-start;
  }

  .technical-main {
    padding-top: 28px;
  }
}
`;

/* =========================================================
   COMPONENT
========================================================= */

export default function TechnicalLab() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    companyId: routeCompanyId,
  } = useParams();

  const companyId =
    normalizeId(
      routeCompanyId
    );

  const isLevelsPage =
    Boolean(companyId);

  const [companies, setCompanies] =
    useState([]);

  const [company, setCompany] =
    useState(null);

  const [levels, setLevels] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [backendOnline, setBackendOnline] =
    useState(false);

  /* =======================================================
     LOAD COMPANIES
  ======================================================= */

  useEffect(() => {
    if (isLevelsPage) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const payload =
          await apiFetch(
            "/api/technical/companies"
          );

        if (cancelled) {
          return;
        }

        setCompanies(
          Array.isArray(
            payload?.companies
          )
            ? payload.companies
            : []
        );

        setBackendOnline(true);
      } catch (err) {
        if (!cancelled) {
          console.error(
            "[TECHNICAL LAB COMPANIES]",
            err
          );

          setError(
            err.message ||
              "Unable to load technical companies."
          );

          setBackendOnline(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isLevelsPage]);

  /* =======================================================
     LOAD COMPANY + LEVELS
  ======================================================= */

  useEffect(() => {
    if (!isLevelsPage) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const encoded =
          encodeURIComponent(
            companyId
          );

        const [
          companyPayload,
          levelsPayload,
        ] =
          await Promise.all([
            apiFetch(
              `/api/technical/company/${encoded}`
            ),

            apiFetch(
              `/api/technical/company/${encoded}/levels`
            ),
          ]);

        if (cancelled) {
          return;
        }

        setCompany(
          companyPayload?.company ||
          companyPayload ||
          null
        );

        setLevels(
          Array.isArray(
            levelsPayload?.levels
          )
            ? levelsPayload.levels
            : []
        );

        setBackendOnline(true);
      } catch (err) {
        if (!cancelled) {
          console.error(
            "[TECHNICAL LAB COMPANY]",
            err
          );

          setCompany(null);
          setLevels([]);

          setError(
            err.message ||
              "Unable to load this company's technical levels."
          );

          setBackendOnline(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    isLevelsPage,
    companyId,
  ]);

  /* =======================================================
     SELECT COMPANY
  ======================================================= */

  function openCompany(item) {
    const id =
      normalizeId(item?.id);

    if (!id) {
      return;
    }

    navigate(
      `/technical-lab/${encodeURIComponent(
        id
      )}/levels`
    );
  }

  /* =======================================================
     OPEN LEVEL
  ======================================================= */

  function openLevel(level) {
    const number =
      safeNumber(
        level?.level ??
        level?.levelNumber,
        0
      );

    if (
      !companyId ||
      !number
    ) {
      return;
    }

    navigate(
      `/technical-lab/${encodeURIComponent(
        companyId
      )}/level/${number}`
    );
  }

  /* =======================================================
     BACK
  ======================================================= */

  function goBack() {
    if (isLevelsPage) {
      navigate(
        "/technical-lab",
        {
          replace: true,
        }
      );

      return;
    }

    navigate(
      "/dashboard",
      {
        replace: true,
      }
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="technical-page">
        <style>{CSS}</style>

        <div className="loading-card">
          <div className="spinner" />

          <span>
            Loading technical training...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="technical-page">
        <style>{CSS}</style>

        <header className="technical-header">
          <div className="technical-header-inner">
            <div className="header-left">
              <button
                className="back-button"
                onClick={goBack}
              >
                ←
              </button>

              <div>
                <div className="brand-kicker">
                  ENGVIVA
                </div>

                <div className="brand-title">
                  Technical Lab
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="technical-main">
          <div className="error-card">
            {error}
          </div>

          <button
            className="back-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Retry
          </button>
        </main>
      </div>
    );
  }

  /* =======================================================
     LEVELS
  ======================================================= */

  if (isLevelsPage) {
    const companyName =
      company?.name ||
      company?.company?.name ||
      companyId;

    return (
      <div className="technical-page">
        <style>{CSS}</style>

        <header className="technical-header">
          <div className="technical-header-inner">
            <div className="header-left">
              <button
                className="back-button"
                onClick={goBack}
              >
                ←
              </button>

              <div>
                <div className="brand-kicker">
                  TECHNICAL ROUND
                </div>

                <div className="brand-title">
                  {companyName}
                </div>
              </div>
            </div>

            <div className="status-pill">
              {levels.length} LEVELS
            </div>
          </div>
        </header>

        <main className="technical-main">
          <section className="company-hero">
            <CompanyLogo
              company={company}
              large
            />

            <div>
              <h2>
                {companyName}
              </h2>

              <p>
                Select a technical assessment
                level to begin.
              </p>
            </div>
          </section>

          {levels.length === 0 ? (
            <div className="empty-card">
              No technical assessment levels
              are currently available for this
              company.
            </div>
          ) : (
            <section className="level-grid">
              {levels.map(
                (level, index) => {
                  const number =
                    safeNumber(
                      level?.level ??
                      level?.levelNumber,
                      index + 1
                    );

                  const title =
                    level?.title ||
                    `Foundation ${number}`;

                  const questionCount =
                    safeNumber(
                      level?.questionCount,
                      0
                    );

                  const minutes =
                    safeNumber(
                      level?.estimatedMinutes,
                      0
                    );

                  return (
                    <button
                      key={
                        `${companyId}-${number}`
                      }
                      className="level-card"
                      onClick={() =>
                        openLevel(
                          level
                        )
                      }
                    >
                      <div className="level-number">
                        LEVEL {number}
                      </div>

                      <div className="level-title">
                        {title}
                      </div>

                      <div className="level-meta">
                        <span className="level-pill">
                          {questionCount}
                          {" "}
                          QUESTIONS
                        </span>

                        {minutes > 0 && (
                          <span className="level-pill">
                            {minutes}
                            {" "}
                            MIN
                          </span>
                        )}
                      </div>

                      <div className="level-arrow">
                        Start proctored test →
                      </div>
                    </button>
                  );
                }
              )}
            </section>
          )}
        </main>
      </div>
    );
  }

  /* =======================================================
     COMPANY LIST
  ======================================================= */

  return (
    <div className="technical-page">
      <style>{CSS}</style>

      <header className="technical-header">
        <div className="technical-header-inner">
          <div className="header-left">
            <button
              className="back-button"
              onClick={goBack}
            >
              ←
            </button>

            <div>
              <div className="brand-kicker">
                ENGVIVA
              </div>

              <div className="brand-title">
                Technical Lab
              </div>
            </div>
          </div>

          <div className="status-pill">
            {backendOnline
              ? "LIVE DATASET"
              : "OFFLINE"}
          </div>
        </div>
      </header>

      <main className="technical-main">
        <section className="hero">
          <div>
            <div className="hero-kicker">
              ENGINEERING PREPARATION
            </div>

            <h1>
              Technical Lab
            </h1>

            <p>
              Select a company to view its
              real technical assessment
              progression.
            </p>
          </div>

          <div className="status-pill">
            DYNAMIC DATASET
          </div>
        </section>

        {companies.length === 0 ? (
          <div className="empty-card">
            No technical companies are
            available.
          </div>
        ) : (
          <section className="company-grid">
            {companies.map(
              (item) => (
                <button
                  key={item.id}
                  className="company-card"
                  onClick={() =>
                    openCompany(item)
                  }
                >
                  <div className="company-card-top">
                    <CompanyLogo
                      company={item}
                    />

                    <span className="company-arrow">
                      →
                    </span>
                  </div>

                  <div className="company-name">
                    {item.name ||
                      item.id}
                  </div>

                  <div className="company-category">
                    {item.category ||
                      "Technology"}
                  </div>

                  <div className="company-stats">
                    {item.questionCount !==
                      undefined && (
                      <span className="stat">
                        {item.questionCount}
                        {" "}
                        QUESTIONS
                      </span>
                    )}

                    {item.moduleCount !==
                      undefined && (
                      <span className="stat">
                        {item.moduleCount}
                        {" "}
                        MODULES
                      </span>
                    )}
                  </div>
                </button>
              )
            )}
          </section>
        )}
      </main>
    </div>
  );
}