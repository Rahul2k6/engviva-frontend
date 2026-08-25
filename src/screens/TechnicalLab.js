import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| ENGVIVA — Technical Lab
|--------------------------------------------------------------------------
|
| STEP 4
|
| Backend:
|   /api/technical/companies
|   /api/technical/company/:companyId
|   /api/technical/company/:companyId/modules
|   /api/technical/company/:companyId/levels
|
| This screen intentionally does NOT contain question data.
| Everything comes from the backend.
|
|--------------------------------------------------------------------------
*/

const API_BASE =
  (
    import.meta.env.VITE_API_URL ||
    "https://engviva-backend.onrender.com"
  ).replace(/\/+$/, "");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeCompanyId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getInitials(name) {
  if (!name) return "EN";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getModuleTone(module) {
  const name = String(module?.name || "").toLowerCase();

  if (
    name.includes("python") ||
    name.includes("java") ||
    name.includes("c++")
  ) {
    return "programming";
  }

  if (
    name.includes("sql") ||
    name.includes("mysql") ||
    name.includes("mongo") ||
    name.includes("database")
  ) {
    return "database";
  }

  if (
    name.includes("git") ||
    name.includes("linux") ||
    name.includes("cloud")
  ) {
    return "systems";
  }

  if (
    name.includes("machine") ||
    name.includes("ai") ||
    name.includes("deep")
  ) {
    return "ai";
  }

  if (
    name.includes("adobe") ||
    name.includes("photoshop") ||
    name.includes("illustrator")
  ) {
    return "creative";
  }

  return "general";
}

/*
|--------------------------------------------------------------------------
| API helper
|--------------------------------------------------------------------------
*/

async function apiFetch(path, options = {}) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  if (data?.success === false) {
    throw new Error(
      data?.error ||
        "Backend request failed"
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles = `
.technical-lab {
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(
      circle at 10% 0%,
      rgba(105, 85, 255, 0.16),
      transparent 30%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(0, 220, 255, 0.10),
      transparent 28%
    ),
    #08090d;
  color: #f6f7fb;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.technical-lab *,
.technical-lab *::before,
.technical-lab *::after {
  box-sizing: border-box;
}

.technical-shell {
  width: min(1480px, 100%);
  margin: 0 auto;
  padding: 28px 28px 80px;
}

.technical-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 28px;
}

.technical-back {
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.045);
  color: #fff;
  border-radius: 14px;
  padding: 11px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: .2s ease;
}

.technical-back:hover {
  background: rgba(255,255,255,.09);
  transform: translateY(-1px);
}

.technical-api-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.035);
  border-radius: 999px;
  padding: 8px 12px;
  color: #aeb5c5;
  font-size: 12px;
  font-weight: 700;
}

.technical-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #63e6a5;
  box-shadow: 0 0 14px rgba(99,230,165,.7);
}

.technical-status-dot.offline {
  background: #ff5c7a;
  box-shadow: 0 0 14px rgba(255,92,122,.55);
}

.technical-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 28px;
  padding: 34px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.075),
      rgba(255,255,255,.025)
    );
  box-shadow:
    0 28px 80px rgba(0,0,0,.32);
}

.technical-hero::after {
  content: "";
  position: absolute;
  width: 380px;
  height: 380px;
  right: -180px;
  top: -210px;
  border-radius: 50%;
  background: rgba(113, 88, 255, .12);
  filter: blur(30px);
  pointer-events: none;
}

.technical-hero-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 28px;
}

.technical-company {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.technical-company-logo {
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  display: grid;
  place-items: center;
  border-radius: 19px;
  background:
    linear-gradient(
      135deg,
      #6c5ce7,
      #3c8cff
    );
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  box-shadow:
    0 14px 34px rgba(76,91,255,.28);
}

.technical-eyebrow {
  margin: 0 0 6px;
  color: #8d96ab;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 11px;
  font-weight: 900;
}

.technical-title {
  margin: 0;
  font-size: clamp(32px, 5vw, 58px);
  line-height: .98;
  letter-spacing: -.045em;
  font-weight: 900;
}

.technical-description {
  max-width: 760px;
  margin: 18px 0 0;
  color: #aeb5c5;
  font-size: 15px;
  line-height: 1.7;
}

.technical-hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(130px, 1fr));
  gap: 10px;
}

.technical-stat {
  min-width: 140px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 17px;
  padding: 17px;
  background: rgba(0,0,0,.18);
}

.technical-stat-label {
  color: #80899d;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .09em;
}

.technical-stat-value {
  margin-top: 8px;
  font-size: 25px;
  line-height: 1;
  font-weight: 900;
}

.technical-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
  margin-top: 22px;
}

.technical-panel {
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  background: rgba(255,255,255,.035);
  overflow: hidden;
}

.technical-panel-head {
  padding: 22px 24px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.technical-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -.02em;
}

.technical-panel-subtitle {
  margin: 5px 0 0;
  color: #858ea2;
  font-size: 12px;
  line-height: 1.5;
}

.technical-module-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(230px, 1fr)
    );
  gap: 12px;
  padding: 20px;
}

.technical-module {
  position: relative;
  min-height: 145px;
  border: 1px solid rgba(255,255,255,.075);
  border-radius: 18px;
  padding: 18px;
  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.055),
      rgba(255,255,255,.018)
    );
  transition:
    transform .2s ease,
    border-color .2s ease,
    background .2s ease;
}

.technical-module:hover {
  transform: translateY(-3px);
  border-color: rgba(131,111,255,.42);
  background:
    linear-gradient(
      145deg,
      rgba(121,105,255,.10),
      rgba(255,255,255,.025)
    );
}

.technical-module-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  margin-bottom: 14px;
  background: rgba(255,255,255,.08);
  font-size: 16px;
}

.technical-module-icon.programming {
  background: rgba(100,130,255,.13);
}

.technical-module-icon.database {
  background: rgba(74,211,169,.12);
}

.technical-module-icon.systems {
  background: rgba(255,187,79,.12);
}

.technical-module-icon.ai {
  background: rgba(190,103,255,.14);
}

.technical-module-icon.creative {
  background: rgba(255,108,161,.13);
}

.technical-module-name {
  margin: 0;
  font-size: 15px;
  font-weight: 850;
}

.technical-module-count {
  margin-top: 7px;
  color: #858ea2;
  font-size: 12px;
}

.technical-module-image {
  position: absolute;
  right: 15px;
  top: 15px;
  padding: 5px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  color: #b7bdcc;
  font-size: 10px;
  font-weight: 800;
}

.technical-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.technical-readiness {
  padding: 22px;
}

.technical-readiness-score {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.technical-readiness-number {
  font-size: 46px;
  line-height: .9;
  font-weight: 950;
  letter-spacing: -.05em;
}

.technical-readiness-caption {
  color: #80899d;
  font-size: 12px;
  margin-bottom: 5px;
}

.technical-progress {
  height: 8px;
  margin-top: 18px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  overflow: hidden;
}

.technical-progress-fill {
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #725cff,
      #4fa8ff
    );
  transition: width .5s ease;
}

.technical-readiness-text {
  margin-top: 12px;
  color: #8d96ab;
  font-size: 12px;
  line-height: 1.6;
}

.technical-action {
  width: 100%;
  border: 0;
  border-radius: 15px;
  padding: 14px 17px;
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #725cff,
      #4b91ff
    );
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  transition: .2s ease;
}

.technical-action:hover {
  transform: translateY(-2px);
  box-shadow:
    0 14px 30px rgba(80,91,255,.23);
}

.technical-action.secondary {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}

.technical-action:disabled {
  cursor: not-allowed;
  opacity: .5;
  transform: none;
}

.technical-missing {
  padding: 22px;
}

.technical-missing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.technical-missing-chip {
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 999px;
  padding: 7px 9px;
  color: #8d96ab;
  background: rgba(255,255,255,.035);
  font-size: 10px;
  font-weight: 750;
}

.technical-note {
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgba(90,162,255,.13);
  background: rgba(90,162,255,.055);
  color: #9ba9c0;
  font-size: 12px;
  line-height: 1.65;
}

.technical-error {
  margin-top: 22px;
  border: 1px solid rgba(255,75,108,.22);
  border-radius: 18px;
  padding: 18px;
  background: rgba(255,75,108,.07);
  color: #ff9aad;
  font-size: 13px;
  line-height: 1.6;
}

.technical-retry {
  margin-top: 12px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 11px;
  padding: 9px 12px;
  color: #fff;
  background: rgba(255,255,255,.06);
  cursor: pointer;
  font-weight: 800;
}

.technical-loading {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 30px;
}

.technical-loader-card {
  width: min(460px, 100%);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  padding: 28px;
  background: rgba(255,255,255,.04);
  text-align: center;
}

.technical-spinner {
  width: 34px;
  height: 34px;
  margin: 0 auto 18px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,.10);
  border-top-color: #7c67ff;
  animation:
    technical-spin .8s linear infinite;
}

@keyframes technical-spin {
  to {
    transform: rotate(360deg);
  }
}

.technical-empty {
  padding: 50px 25px;
  text-align: center;
  color: #8992a6;
}

@media (max-width: 1050px) {
  .technical-main-grid {
    grid-template-columns: 1fr;
  }

  .technical-side {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }
}

@media (max-width: 760px) {
  .technical-shell {
    padding: 18px 14px 50px;
  }

  .technical-topbar {
    align-items: flex-start;
  }

  .technical-hero {
    padding: 23px;
    border-radius: 21px;
  }

  .technical-hero-content {
    grid-template-columns: 1fr;
  }

  .technical-hero-stats {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .technical-stat {
    min-width: 0;
  }

  .technical-side {
    grid-template-columns: 1fr;
  }

  .technical-module-grid {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .technical-title {
    font-size: 37px;
  }
}
`;

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function TechnicalLab() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const query =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [location.search]
    );

  /*
   * Support:
   *
   * ?company=google
   *
   * ?companyId=google
   *
   * This avoids breaking the existing
   * CompanyDetails navigation.
   */

  const companyFromUrl =
    query.get("company") ||
    query.get("companyId") ||
    "";

  const roleFromUrl =
    query.get("role") ||
    "Software Engineer";

  const [companyId, setCompanyId] =
    useState(
      normalizeCompanyId(
        companyFromUrl
      )
    );

  const [companies, setCompanies] =
    useState([]);

  const [company, setCompany] =
    useState(null);

  const [levels, setLevels] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [companyLoading, setCompanyLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [backendOnline, setBackendOnline] =
    useState(false);

  /*
   * Load companies.
   */

  async function loadCompanies() {
    try {
      setError("");

      const data =
        await apiFetch(
          "/api/technical/companies"
        );

      setCompanies(
        data.companies || []
      );

      setBackendOnline(true);

      /*
       * If URL didn't provide a company,
       * don't silently pick a random company.
       *
       * Show the company selector.
       */

      if (
        !companyId &&
        data.companies?.length
      ) {
        const first =
          data.companies[0];

        setCompanyId(
          first.id
        );
      }
    } catch (err) {
      console.error(
        "[TechnicalLab] companies:",
        err
      );

      setBackendOnline(false);

      setError(
        err.message ||
          "Unable to connect to technical training backend."
      );
    }
  }

  /*
   * Load selected company.
   */

  async function loadCompany(
    selectedCompanyId
  ) {
    if (!selectedCompanyId) {
      return;
    }

    try {
      setCompanyLoading(true);
      setError("");

      const [
        companyData,
        levelData,
      ] =
        await Promise.all([
          apiFetch(
            `/api/technical/company/${encodeURIComponent(
              selectedCompanyId
            )}`
          ),

          apiFetch(
            `/api/technical/company/${encodeURIComponent(
              selectedCompanyId
            )}/levels`
          ),
        ]);

      setCompany(
        companyData
      );

      setLevels(
        levelData
      );

      setBackendOnline(true);
    } catch (err) {
      console.error(
        "[TechnicalLab] company:",
        err
      );

      setBackendOnline(false);

      setCompany(null);
      setLevels(null);

      setError(
        err.message ||
          "Unable to load this company's technical profile."
      );
    } finally {
      setCompanyLoading(false);
      setLoading(false);
    }
  }

  /*
   * Initial load.
   */

  useEffect(() => {
    loadCompanies();
  }, []);

  /*
   * Load company whenever
   * selected ID changes.
   */

  useEffect(() => {
    if (companyId) {
      loadCompany(
        companyId
      );
    }
  }, [companyId]);

  /*
   * Company object from API.
   */

  const companyInfo =
    company?.company || null;

  const modules =
    company?.modules || [];

  const missingModules =
    company?.missingModules || [];

  const summary =
    company?.summary || {};

  /*
   * Coverage.
   */

  const coverage =
    summary.configuredModules > 0
      ? Math.round(
          (summary.availableModules /
            summary.configuredModules) *
            100
        )
      : 0;

  /*
   * Total question pool.
   */

  const totalQuestions =
    summary.questionCount || 0;

  /*
   * Selected company in dropdown.
   */

  const selectedCompany =
    companies.find(
      (item) =>
        item.id === companyId
    );

  /*
   * Navigate to levels.
   *
   * Step 5 will consume this route.
   */
function openLevels() {
  navigate(
    `/technical-lab/${encodeURIComponent(
      companyId
    )}?role=${encodeURIComponent(
      roleFromUrl
    )}`,
    {
      state: {
        companyId,
        role: roleFromUrl,
      },
    }
  );
}

  /*
   * Keep a safe fallback route if
   * your router doesn't use the path above.
   *
   * We don't start the assessment here.
   */
function handleBack() {
  navigate("/dashboard");
}

  /*
   * Loading.
   */

  if (
    loading &&
    !company
  ) {
    return (
      <>
        <style>
          {styles}
        </style>

        <div className="technical-lab">
          <div className="technical-loading">
            <div className="technical-loader-card">
              <div className="technical-spinner" />

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                }}
              >
                Loading Technical Lab
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#858ea2",
                  fontSize: 12,
                }}
              >
                Connecting to ENGVIVA technical
                training engine...
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>
        {styles}
      </style>

      <main className="technical-lab">
        <div className="technical-shell">

          {/* =================================================
              TOP BAR
          ================================================= */}

          <div className="technical-topbar">
            <button
              type="button"
              className="technical-back"
              onClick={handleBack}
            >
              ← Back
            </button>

            <div className="technical-api-status">
              <span
                className={`technical-status-dot ${
                  backendOnline
                    ? ""
                    : "offline"
                }`}
              />

              {backendOnline
                ? "Technical engine online"
                : "Technical engine offline"}
            </div>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="technical-error">
              <strong>
                Unable to load Technical Lab
              </strong>

              <div
                style={{
                  marginTop: 5,
                }}
              >
                {error}
              </div>

              <button
                type="button"
                className="technical-retry"
                onClick={() => {
                  loadCompanies();

                  if (companyId) {
                    loadCompany(
                      companyId
                    );
                  }
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              HERO
          ================================================= */}

          <section className="technical-hero">
            <div className="technical-hero-content">

              <div>
                <div className="technical-company">
                  <div className="technical-company-logo">
                    {getInitials(
                      companyInfo?.name ||
                        selectedCompany?.name ||
                        "ENGVIVA"
                    )}
                  </div>

                  <div>
                    <p className="technical-eyebrow">
                      Technical Lab
                    </p>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#aeb5c5",
                        fontWeight: 750,
                      }}
                    >
                      {companyInfo?.category ||
                        selectedCompany?.category ||
                        "Engineering"}
                    </div>
                  </div>
                </div>

                <h1 className="technical-title">
                  {companyInfo?.name ||
                    selectedCompany?.name ||
                    "Technical Training"}
                </h1>

                <p className="technical-description">
                  Train against the technical skill
                  profile configured for this company.
                  Questions come from the verified
                  ENGVIVA technical dataset — not
                  hardcoded frontend content.
                </p>

                {roleFromUrl && (
                  <div
                    style={{
                      display: "inline-flex",
                      marginTop: 17,
                      borderRadius: 999,
                      padding:
                        "8px 11px",
                      background:
                        "rgba(255,255,255,.055)",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      color: "#aeb5c5",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    Target role · {roleFromUrl}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    color: "#858ea2",
                    fontSize: 11,
                    fontWeight: 850,
                    marginBottom: 8,
                    textTransform:
                      "uppercase",
                    letterSpacing: ".1em",
                  }}
                >
                  Change company
                </div>

                <select
                  value={
                    companyId || ""
                  }
                  onChange={(event) => {
                    const next =
                      normalizeCompanyId(
                        event.target.value
                      );

                    setCompanyId(
                      next
                    );

                    navigate(
                      `/technical-lab?company=${encodeURIComponent(
                        next
                      )}&role=${encodeURIComponent(
                        roleFromUrl
                      )}`,
                      {
                        replace: true,
                      }
                    );
                  }}
                  style={{
                    width: 230,
                    maxWidth: "100%",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    borderRadius: 13,
                    padding:
                      "12px 13px",
                    background:
                      "#151720",
                    color: "#fff",
                    outline: "none",
                    fontWeight: 750,
                    fontSize: 13,
                  }}
                >
                  {!companies.length && (
                    <option value="">
                      No companies loaded
                    </option>
                  )}

                  {companies.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* =================================================
              MAIN
          ================================================= */}

          {companyLoading ? (
            <div
              className="technical-loading"
              style={{
                minHeight: 350,
              }}
            >
              <div className="technical-loader-card">
                <div className="technical-spinner" />

                <div
                  style={{
                    fontWeight: 900,
                  }}
                >
                  Loading {selectedCompany?.name ||
                    "company"}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    color: "#858ea2",
                    fontSize: 12,
                  }}
                >
                  Resolving the live technical
                  question pool...
                </div>
              </div>
            </div>
          ) : company ? (
            <div className="technical-main-grid">

              {/* ===========================================
                  MODULES
              =========================================== */}

              <section className="technical-panel">
                <div className="technical-panel-head">
                  <div>
                    <h2 className="technical-panel-title">
                      Technical Skill Modules
                    </h2>

                    <p className="technical-panel-subtitle">
                      {modules.length} active modules ·{" "}
                      {formatNumber(
                        totalQuestions
                      )}{" "}
                      verified questions available
                    </p>
                  </div>

                  <div
                    style={{
                      color: "#8e98ac",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    LIVE DATA
                  </div>
                </div>

                {modules.length ? (
                  <div className="technical-module-grid">
                    {modules.map(
                      (module) => {
                        const tone =
                          getModuleTone(
                            module
                          );

                        return (
                          <article
                            key={
                              module.id
                            }
                            className="technical-module"
                          >
                            <div
                              className={`technical-module-icon ${tone}`}
                            >
                              {tone ===
                              "programming"
                                ? "</>"
                                : tone ===
                                  "database"
                                ? "DB"
                                : tone ===
                                  "systems"
                                ? "SYS"
                                : tone ===
                                  "ai"
                                ? "AI"
                                : tone ===
                                  "creative"
                                ? "✦"
                                : "◆"}
                            </div>

                            <h3 className="technical-module-name">
                              {
                                module.name
                              }
                            </h3>

                            <div className="technical-module-count">
                              {formatNumber(
                                module.questionCount
                              )}{" "}
                              questions
                            </div>

                            {module.hasImages && (
                              <div className="technical-module-image">
                                {module.imageCount}{" "}
                                visual
                                {module.imageCount ===
                                1
                                  ? ""
                                  : "s"}
                              </div>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="technical-empty">
                    No technical modules are currently
                    available for this company.
                  </div>
                )}
              </section>

              {/* ===========================================
                  SIDEBAR
              =========================================== */}

              <aside className="technical-side">

                {/* READINESS */}

                <section className="technical-panel">
                  <div className="technical-readiness">
                    <p className="technical-eyebrow">
                      Dataset Coverage
                    </p>

                    <div className="technical-readiness-score">
                      <div className="technical-readiness-number">
                        {coverage}%
                      </div>

                      <div className="technical-readiness-caption">
                        profile covered
                      </div>
                    </div>

                    <div className="technical-progress">
                      <div
                        className="technical-progress-fill"
                        style={{
                          width: `${coverage}%`,
                        }}
                      />
                    </div>

                    <div className="technical-readiness-text">
                      {summary.availableModules} of{" "}
                      {summary.configuredModules}{" "}
                      configured skill modules are
                      currently backed by the installed
                      dataset.
                    </div>
                  </div>
                </section>

                {/* LEVELS */}

                <section className="technical-panel">
                  <div className="technical-readiness">
                    <p className="technical-eyebrow">
                      Technical Progression
                    </p>

                    <h2
                      style={{
                        margin:
                          "7px 0 0",
                        fontSize: 23,
                        fontWeight: 900,
                        letterSpacing:
                          "-.03em",
                      }}
                    >
                      Open Technical Levels
                    </h2>

                    <p
                      style={{
                        margin:
                          "10px 0 18px",
                        color: "#858ea2",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      The level engine will generate
                      the real 20–40 level progression
                      from this company's available
                      question pool.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3,1fr)",
                        gap: 7,
                        marginBottom: 14,
                      }}
                    >
                      <div className="technical-stat">
                        <div className="technical-stat-label">
                          Min
                        </div>

                        <div className="technical-stat-value">
                          {levels?.levels?.minimum ||
                            20}
                        </div>
                      </div>

                      <div className="technical-stat">
                        <div className="technical-stat-label">
                          Max
                        </div>

                        <div className="technical-stat-value">
                          {levels?.levels?.maximum ||
                            40}
                        </div>
                      </div>

                      <div className="technical-stat">
                        <div className="technical-stat-label">
                          Est.
                        </div>

                        <div className="technical-stat-value">
                          {levels?.levels?.estimated ||
                            "—"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="technical-action"
                      onClick={
                        openLevels
                      }
                      disabled={
                        !modules.length
                      }
                    >
                      Open Technical Levels →
                    </button>
                  </div>
                </section>

                {/* MISSING */}

                <section className="technical-panel">
                  <div className="technical-missing">
                    <p className="technical-eyebrow">
                      Expansion Pool
                    </p>

                    <h2
                      style={{
                        margin:
                          "7px 0 0",
                        fontSize: 17,
                        fontWeight: 900,
                      }}
                    >
                      Additional Skills
                    </h2>

                    <p
                      style={{
                        margin:
                          "8px 0 0",
                        color: "#858ea2",
                        fontSize: 11,
                        lineHeight: 1.6,
                      }}
                    >
                      Configured for this company but
                      not present in the current dataset.
                      These are not shown as available
                      questions.
                    </p>

                    {missingModules.length ? (
                      <div className="technical-missing-list">
                        {missingModules.map(
                          (module) => (
                            <span
                              key={
                                module
                              }
                              className="technical-missing-chip"
                            >
                              {module.replace(
                                /-/g,
                                " "
                              )}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          color:
                            "#63e6a5",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        All configured modules
                        are available.
                      </div>
                    )}
                  </div>
                </section>

                {/* NOTE */}

                <div className="technical-note">
                  <strong
                    style={{
                      color:
                        "#d9e2f3",
                    }}
                  >
                    ENGVIVA technical engine
                  </strong>
                  <br />
                  The questions displayed in this
                  training system come from the backend
                  dataset. The frontend does not contain
                  a hardcoded question bank.
                </div>
              </aside>
            </div>
          ) : (
            <div className="technical-panel">
              <div className="technical-empty">
                Select a company to load its technical
                training profile.
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}