import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

/*
|--------------------------------------------------------------------------
| ENGVIVA TECHNICAL ASSESSMENT
|--------------------------------------------------------------------------
|
| FLOW
|
| /technical-lab
|       ↓
| company
|       ↓
| /technical-lab/:companyId/levels
|       ↓
| level
|       ↓
| /technical-lab/:companyId/level/:levelNumber
|       ↓
| proctored test
|       ↓
| /technical-lab/:companyId/level/:levelNumber/result
|
|--------------------------------------------------------------------------
| IMPORTANT FIX
|--------------------------------------------------------------------------
|
| The backend does NOT return the questions from:
|
| GET /api/technical/company/:companyId/levels/:levelNumber
|
| That endpoint returns LEVEL METADATA.
|
| The verified question endpoint is:
|
| GET
| /api/technical/company/:companyId/levels/:levelNumber/questions/:questionIndex
|
| Therefore this file loads each real question through that endpoint.
|
|--------------------------------------------------------------------------
*/

const API_BASE =
  (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000"
  ).replace(/\/+$/, "");

const PROCTOR_LIMIT = 5;

const ATTEMPT_STORAGE_KEY =
  "engviva:technical:active-attempt";

const RESULT_STORAGE_KEY =
  "engviva:technical:last-result";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");
}

function formatTime(seconds) {
  const value =
    Math.max(
      0,
      Math.floor(
        safeNumber(seconds)
      )
    );

  const hours =
    Math.floor(
      value / 3600
    );

  const minutes =
    Math.floor(
      (value % 3600) / 60
    );

  const secs =
    value % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(
        2,
        "0"
      ),
      String(minutes).padStart(
        2,
        "0"
      ),
      String(secs).padStart(
        2,
        "0"
      ),
    ].join(":");
  }

  return [
    String(minutes).padStart(
      2,
      "0"
    ),
    String(secs).padStart(
      2,
      "0"
    ),
  ].join(":");
}

/*
|--------------------------------------------------------------------------
| COMPANY FALLBACK
|--------------------------------------------------------------------------
|
| Company identity comes from the backend whenever possible.
| This fallback only prevents a blank page while the company endpoint
| is loading.
|
*/

function companyFromId(id) {
  const normalized =
    normalizeId(id);

  return {
    id: normalized,
    name:
      normalized
        ? normalized
            .split("-")
            .map(
              (part) =>
                part
                  ? part
                      .charAt(0)
                      .toUpperCase() +
                    part.slice(1)
                  : ""
            )
            .join(" ")
        : "Company",
    category:
      "Technology",
    domain:
      normalized
        ? `${normalized}.com`
        : "",
  };
}

/*
|--------------------------------------------------------------------------
| FAVICON LOGO
|--------------------------------------------------------------------------
|
| No Clearbit.
| No hardcoded logo image.
|
| The company domain is converted into a favicon URL exactly as requested.
|
*/

function CompanyLogo({
  company,
  large = false,
}) {
  const [failed, setFailed] =
    useState(false);

  const domain =
    String(
      firstValue(
        company?.domain,
        company?.websiteDomain,
        company?.website
      ) || ""
    )
      .replace(
        /^https?:\/\//i,
        ""
      )
      .replace(
        /^www\./i,
        ""
      )
      .split("/")[0];

  const src =
    domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
      : "";

  if (!src || failed) {
    return (
      <div
        className={
          large
            ? "tech-logo tech-logo-large tech-logo-fallback"
            : "tech-logo tech-logo-fallback"
        }
      >
        {String(
          company?.name ||
            "C"
        )
          .charAt(0)
          .toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={
        large
          ? "tech-logo tech-logo-large"
          : "tech-logo"
      }
    >
      <img
        src={src}
        alt={
          company?.name ||
          "Company"
        }
        onError={() =>
          setFailed(true)
        }
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| QUESTION NORMALIZER
|--------------------------------------------------------------------------
*/

function normalizeOption(
  option
) {
  if (
    option &&
    typeof option ===
      "object"
  ) {
    return String(
      firstValue(
        option.text,
        option.label,
        option.value,
        option.name,
        ""
      )
    );
  }

  return String(
    option ?? ""
  );
}

function normalizeQuestion(
  payload,
  index
) {
  /*
   * Single-question endpoint returns:
   *
   * {
   *   success: true,
   *   companyId,
   *   levelNumber,
   *   questionIndex,
   *   question: {...}
   * }
   */

  const raw =
    payload?.question ||
    payload?.data?.question ||
    payload?.data ||
    payload;

  if (
    !raw ||
    typeof raw !==
      "object"
  ) {
    return null;
  }

  const id =
    firstValue(
      raw.id,
      raw.questionId,
      raw._id
    );

  const text =
    firstValue(
      raw.question,
      raw.text,
      raw.questionText
    );

  let options =
    raw.options;

  if (
    options &&
    !Array.isArray(options) &&
    typeof options ===
      "object"
  ) {
    options =
      Object.values(
        options
      );
  }

  if (
    !Array.isArray(options)
  ) {
    options = [];
  }

  options =
    options
      .map(
        normalizeOption
      )
      .filter(
        (option) =>
          option.trim()
            .length > 0
      );

  if (
    !id ||
    !text ||
    options.length <
      2
  ) {
    return null;
  }

  return {
    id:
      String(id),

    question:
      String(text),

    options,

    number:
      safeNumber(
        firstValue(
          raw.number,
          raw.questionNumber
        ),
        index + 1
      ),

    moduleId:
      firstValue(
        raw.moduleId,
        ""
      ),

    module:
      firstValue(
        raw.module,
        raw.moduleName,
        raw.category,
        "Technical"
      ),

    difficulty:
      firstValue(
        raw.difficulty,
        "Mixed"
      ),

    images:
      Array.isArray(
        raw.images
      )
        ? raw.images
        : [],

    hasImages:
      Boolean(
        raw.hasImages ||
          (
            Array.isArray(
              raw.images
            ) &&
            raw.images.length >
              0
          )
      ),

    references:
      Array.isArray(
        raw.references
      )
        ? raw.references
        : [],
  };
}

function normalizeQuestionCollection(
  payload
) {
  const root =
    payload?.data ??
    payload;

  const source =
    Array.isArray(root)
      ? root
      : Array.isArray(
          root?.questions
        )
      ? root.questions
      : Array.isArray(
          payload?.questions
        )
      ? payload.questions
      : [];

  return source
    .map(
      (
        question,
        index
      ) =>
        normalizeQuestion(
          {
            question,
          },
          index
        )
    )
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

function readStoredAttempt() {
  try {
    return JSON.parse(
      sessionStorage.getItem(
        ATTEMPT_STORAGE_KEY
      ) || "null"
    );
  } catch {
    return null;
  }
}

function saveStoredAttempt(
  value
) {
  try {
    sessionStorage.setItem(
      ATTEMPT_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {}
}

function clearStoredAttempt() {
  try {
    sessionStorage.removeItem(
      ATTEMPT_STORAGE_KEY
    );
  } catch {}
}

function readStoredResult() {
  try {
    return JSON.parse(
      sessionStorage.getItem(
        RESULT_STORAGE_KEY
      ) || "null"
    );
  } catch {
    return null;
  }
}

function saveStoredResult(
  value
) {
  try {
    sessionStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {}
}

function clearStoredResult() {
  try {
    sessionStorage.removeItem(
      RESULT_STORAGE_KEY
    );
  } catch {}
}

/*
|--------------------------------------------------------------------------
| FIREBASE TOKEN
|--------------------------------------------------------------------------
*/

async function getFirebaseToken() {
  try {
    const firebase =
      await import(
        "../firebase"
      );

    const auth =
      firebase.auth ||
      firebase.default?.auth ||
      null;

    if (
      !auth?.currentUser
    ) {
      return null;
    }

    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.warn(
      "[ENGVIVA TECH AUTH]",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

async function apiFetch(
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

    ...(options.headers ||
      {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

  const payload =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (
    !response.ok
  ) {
    const message =
      firstValue(
        payload?.error?.message,
        typeof payload?.error ===
          "string"
          ? payload.error
          : "",
        payload?.message,
        `Request failed (${response.status}).`
      );

    const error =
      new Error(
        message
      );

    error.status =
      response.status;

    throw error;
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| FULLSCREEN
|--------------------------------------------------------------------------
*/

async function enterFullscreen() {
  try {
    if (
      !document.fullscreenElement &&
      document.documentElement
        ?.requestFullscreen
    ) {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn(
      "[ENGVIVA PROCTOR] Fullscreen unavailable",
      error
    );
  }
}

async function exitFullscreen() {
  try {
    if (
      document.fullscreenElement &&
      document.exitFullscreen
    ) {
      await document.exitFullscreen();
    }
  } catch {}
}

/*
|--------------------------------------------------------------------------
| CSS
|--------------------------------------------------------------------------
*/

const STYLES = `
* {
  box-sizing: border-box;
}

.technical-page {
  min-height: 100vh;
  background: #080808;
  color: #f5f5f5;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.technical-page button {
  font: inherit;
}

.technical-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 28px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(8,8,8,.94);
  backdrop-filter: blur(18px);
}

.technical-topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.tech-back {
  border: 1px solid rgba(255,255,255,.12);
  background: #111;
  color: #fff;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
}

.tech-back:hover {
  background: #181818;
}

.tech-top-title {
  font-weight: 800;
  font-size: 15px;
}

.tech-top-subtitle {
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}

.technical-container {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto;
  padding: 46px 0 80px;
}

.hero-block {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  padding: 36px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 28px;
  background: linear-gradient(135deg,#111,#0b0b0b);
  margin-bottom: 46px;
}

.technical-eyebrow {
  color: #6f2de9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .18em;
}

.hero-block h1 {
  font-size: clamp(34px,5vw,64px);
  line-height: .98;
  margin: 14px 0 18px;
  max-width: 760px;
}

.hero-block p {
  color: #9a9a9a;
  max-width: 680px;
  line-height: 1.7;
}

.hero-stat {
  min-width: 130px;
  height: 130px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #101010;
}

.hero-stat strong {
  font-size: 40px;
}

.hero-stat span {
  color: #777;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .15em;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.section-heading span {
  color: #777;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .14em;
}

.section-heading h2 {
  margin: 7px 0 0;
  font-size: 28px;
}

.company-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(220px,1fr));
  gap: 14px;
}

.company-card {
  text-align: left;
  border: 1px solid rgba(255,255,255,.08);
  background: #0e0e0e;
  color: #fff;
  border-radius: 20px;
  padding: 22px;
  cursor: pointer;
  transition: .18s ease;
}

.company-card:hover {
  transform: translateY(-3px);
  border-color: rgba(144, 27, 240, 0.92)0.45);
  background: #121212;
}

.company-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.company-card h3 {
  margin: 18px 0 6px;
  font-size: 18px;
}

.company-card p {
  color: #777;
  font-size: 12px;
  margin: 0;
}

.tech-logo {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
  flex: 0 0 auto;
}

.tech-logo img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.tech-logo-large {
  width: 82px;
  height: 82px;
  border-radius: 22px;
}

.tech-logo-large img {
  width: 60px;
  height: 60px;
}

.tech-logo-fallback {
  background: #6f2de9;
  color: #080808;
  font-weight: 900;
  font-size: 24px;
}

.company-hero {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 30px;
  border-radius: 26px;
  border: 1px solid rgba(255,255,255,.08);
  background: #0d0d0d;
  margin-bottom: 30px;
}

.company-hero-copy {
  flex: 1;
}

.company-hero-copy span {
  color: #888;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .15em;
}

.company-hero-copy h1 {
  font-size: 38px;
  margin: 7px 0;
}

.company-hero-copy p {
  color: #777;
  margin: 0;
}

.company-level-count {
  text-align: center;
  min-width: 110px;
}

.company-level-count strong {
  display: block;
  font-size: 38px;
}

.company-level-count span {
  color: #777;
  font-size: 10px;
  letter-spacing: .15em;
  font-weight: 900;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(260px,1fr));
  gap: 16px;
}

.level-card {
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 22px;
  background: #0d0d0d;
  padding: 24px;
}

.level-number {
  color: #6f2de9;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .14em;
}

.level-card h3 {
  font-size: 21px;
  margin: 12px 0 8px;
}

.level-card p {
  color: #777;
  line-height: 1.55;
  min-height: 55px;
}

.level-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 18px 0;
}

.level-pill {
  padding: 7px 9px;
  border-radius: 999px;
  background: #151515;
  border: 1px solid rgba(255,255,255,.07);
  color: #aaa;
  font-size: 10px;
  font-weight: 800;
}

.primary-button,
.secondary-button,
.danger-button {
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 800;
}

.primary-button {
  background: #6f2de9;
  color: #070707;
}

.primary-button:hover {
  background: #6f2de9;
}

.secondary-button {
  background: #171717;
  border: 1px solid rgba(255,255,255,.1);
  color: #fff;
}

.danger-button {
  background: #7d1717;
  color: #fff;
}

.loading-block,
.error-banner,
.empty-block {
  padding: 24px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: #0d0d0d;
  margin-bottom: 20px;
}

.error-banner {
  color: #ff8585;
  border-color: rgba(255,80,80,.2);
}

.test-page {
  min-height: 100vh;
  background: #050505;
  color: #fff;
}

.test-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
  padding: 14px 24px;
  background: rgba(5,5,5,.96);
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.test-brand {
  font-weight: 900;
}

.test-brand small {
  display: block;
  color: #777;
  font-size: 10px;
  margin-top: 3px;
}

.test-timer {
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  font-size: 22px;
}

.test-timer.warning {
  color: #ff8b8b;
}

.test-status {
  text-align: right;
  color: #6f2de9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
}

.proctor-banner {
  background: #221c00;
  color: #ffd65a;
  border-bottom: 1px solid rgba(255,214,90,.2);
  padding: 11px 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.test-container {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 30px 0 70px;
}

.test-progress {
  height: 5px;
  background: #181818;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 20px;
}

.test-progress > div {
  height: 100%;
  background: #6f2de9;
}

.test-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 280px;
  gap: 18px;
}

.question-card {
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  padding: 30px;
}

.question-number {
  color: #6f2de9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .13em;
}

.question-module {
  color: #777;
  font-size: 11px;
  margin-top: 6px;
}

.question-text {
  font-size: clamp(21px,3vw,31px);
  line-height: 1.35;
  margin: 20px 0 28px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.options {
  display: grid;
  gap: 11px;
}

.option {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 16px;
  border-radius: 15px;
  background: #111;
  border: 1px solid rgba(255,255,255,.08);
  color: #ddd;
  cursor: pointer;
  text-align: left;
}

.option:hover {
  border-color: rgba(167,255,0,.35);
}

.option.selected {
  border-color: #6f2de9;
  background: #141a0c;
  color: #fff;
}

.option-index {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #1b1b1b;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-weight: 900;
}

.option.selected .option-index {
  background: #6f2de9;
  color: #080808;
}

.question-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 28px;
}

.question-actions-right {
  display: flex;
  gap: 10px;
}

.question-nav {
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 22px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 105px;
}

.question-nav h3 {
  margin: 0 0 5px;
}

.question-nav p {
  color: #777;
  font-size: 11px;
  margin: 0 0 15px;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(5,1fr);
  gap: 7px;
}

.question-jump {
  aspect-ratio: 1;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.08);
  background: #151515;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.question-jump.current {
  border-color: #6f2de9;
  color: #6f2de9;
}

.question-jump.answered {
  background: #26320f;
  color: #6f2de9;
}

.submit-box {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.proctor-info {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
  color: #777;
  font-size: 10px;
}

.result-container {
  width: min(900px, calc(100% - 40px));
  margin: 0 auto;
  padding: 70px 0;
}

.result-card {
  text-align: center;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 28px;
  background: #0d0d0d;
  padding: 45px;
}

.result-score {
  font-size: 90px;
  line-height: 1;
  font-weight: 900;
  color: #6f2de9;
}

.result-label {
  color: #777;
  letter-spacing: .15em;
  font-size: 11px;
  font-weight: 900;
  margin-top: 8px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 10px;
  margin: 35px 0;
}

.result-stat {
  padding: 18px;
  border-radius: 16px;
  background: #151515;
}

.result-stat strong {
  display: block;
  font-size: 25px;
}

.result-stat span {
  color: #777;
  font-size: 10px;
}

@media (max-width: 850px) {
  .hero-block,
  .company-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .test-layout {
    grid-template-columns: 1fr;
  }

  .question-nav {
    position: static;
    order: 2;
  }

  .test-topbar {
    grid-template-columns: 1fr auto;
  }

  .test-status {
    display: none;
  }

  .result-grid {
    grid-template-columns: repeat(2,1fr);
  }
}

@media (max-width: 600px) {
  .technical-container,
  .test-container {
    width: min(100% - 24px, 1180px);
  }

  .hero-block,
  .company-hero,
  .question-card,
  .result-card {
    padding: 22px;
  }

  .company-level-count {
    text-align: left;
  }

  .question-actions {
    flex-direction: column;
  }

  .question-actions-right {
    width: 100%;
  }

  .question-actions-right button {
    flex: 1;
  }
}
`;

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function TechnicalAssessment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    companyId:
      routeCompanyId,
    levelNumber:
      routeLevelNumber,
  } = useParams();

  /*
   * ----------------------------------------------------------
   * ROUTE STATE
   * ----------------------------------------------------------
   */

  const routeCompany =
    normalizeId(
      firstValue(
        routeCompanyId,
        location.state
          ?.companyId,
        location.state
          ?.company?.id,
        new URLSearchParams(
          location.search
        ).get("company"),
        new URLSearchParams(
          location.search
        ).get("companyId")
      )
    );

  const routeLevel =
    safeNumber(
      firstValue(
        routeLevelNumber,
        location.state
          ?.levelNumber,
        new URLSearchParams(
          location.search
        ).get("level")
      ),
      0
    );

  const isResultRoute =
    location.pathname.endsWith(
      "/result"
    );

  /*
   * ----------------------------------------------------------
   * SCREEN
   * ----------------------------------------------------------
   */

  const initialScreen =
    routeLevel > 0
      ? "running"
      : routeCompany
      ? "levels"
      : "companies";

  const [
    screen,
    setScreen,
  ] = useState(
    initialScreen
  );

  /*
   * ----------------------------------------------------------
   * COMPANY
   * ----------------------------------------------------------
   */

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    routeCompany
      ? companyFromId(
          routeCompany
        )
      : null
  );

  const company =
    selectedCompany ||
    (
      routeCompany
        ? companyFromId(
            routeCompany
          )
        : null
    );

  /*
   * ----------------------------------------------------------
   * LEVELS
   * ----------------------------------------------------------
   */

  const [
    levels,
    setLevels,
  ] = useState([]);

  const [
    loadingLevels,
    setLoadingLevels,
  ] = useState(false);

  /*
   * ----------------------------------------------------------
   * TEST
   * ----------------------------------------------------------
   */

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState(
    routeLevel || null
  );

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const questionsRef =
    useRef([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const answersRef =
    useRef({});

  const [
    attemptId,
    setAttemptId,
  ] = useState(null);

  const attemptIdRef =
    useRef(null);

  const [
    startedAt,
    setStartedAt,
  ] = useState(null);

  const startedAtRef =
    useRef(null);

  const [
    timeAllowed,
    setTimeAllowed,
  ] = useState(0);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(0);

  const remainingRef =
    useRef(0);

  const [
    loadingTest,
    setLoadingTest,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const submittingRef =
    useRef(false);

  const [
    result,
    setResult,
  ] = useState(
    isResultRoute
      ? readStoredResult()
      : null
  );

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ----------------------------------------------------------
   * PROCTORING
   * ----------------------------------------------------------
   */

  const [
    violations,
    setViolations,
  ] = useState([]);

  const violationsRef =
    useRef([]);

  const [
    proctorWarning,
    setProctorWarning,
  ] = useState("");

  const [
    proctorLocked,
    setProctorLocked,
  ] = useState(false);

  const timerRef =
    useRef(null);

  const submitRef =
    useRef(null);

  /*
   * ----------------------------------------------------------
   * REFS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    questionsRef.current =
      questions;
  }, [questions]);

  useEffect(() => {
    answersRef.current =
      answers;
  }, [answers]);

  useEffect(() => {
    attemptIdRef.current =
      attemptId;
  }, [attemptId]);

  useEffect(() => {
    startedAtRef.current =
      startedAt;
  }, [startedAt]);

  useEffect(() => {
    remainingRef.current =
      remainingSeconds;
  }, [
    remainingSeconds,
  ]);

  useEffect(() => {
    violationsRef.current =
      violations;
  }, [violations]);

  /*
   * ----------------------------------------------------------
   * CLEANUP
   * ----------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      clearInterval(
        timerRef.current
      );

      document.body.style.overflow =
        "";

      exitFullscreen();
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * COMPANY LIST
   * ----------------------------------------------------------
   *
   * The technical backend company endpoint is used.
   * We do NOT hardcode a fake company list.
   */

  const [
    companies,
    setCompanies,
  ] = useState([]);

  const [
    companiesLoading,
    setCompaniesLoading,
  ] = useState(false);

  const loadCompanies =
    useCallback(
      async () => {
        setCompaniesLoading(
          true
        );

        setError("");

        try {
          /*
           * Existing technical company discovery endpoint.
           */

          const payload =
            await apiFetch(
              "/api/technical/companies"
            );

          const root =
            payload?.data ??
            payload;

          const raw =
            Array.isArray(root)
              ? root
              : Array.isArray(
                  root?.companies
                )
              ? root.companies
              : Array.isArray(
                  root?.items
                )
              ? root.items
              : [];

          const parsed =
            raw
              .map(
                (item) => ({
                  ...item,
                  id:
                    normalizeId(
                      item?.id
                    ),
                  name:
                    firstValue(
                      item?.name,
                      item?.companyName,
                      item?.id
                    ),
                  category:
                    firstValue(
                      item?.category,
                      "Technology"
                    ),
                  domain:
                    firstValue(
                      item?.domain,
                      item?.websiteDomain,
                      item?.website,
                      ""
                    ),
                })
              )
              .filter(
                (item) =>
                  item.id
              );

          /*
           * If deployment does not expose /companies,
           * do not invent data. The user can still open a
           * company directly through the route.
           */

          setCompanies(
            parsed
          );
        } catch (err) {
          console.warn(
            "[TECHNICAL COMPANIES]",
            err
          );

          setCompanies([]);
          setError(
            err.message ||
              "Unable to load technical companies."
          );
        } finally {
          setCompaniesLoading(
            false
          );
        }
      },
      []
    );

  /*
   * Load companies only on company screen.
   */

  useEffect(() => {
    if (
      screen ===
      "companies"
    ) {
      loadCompanies();
    }
  }, [
    screen,
    loadCompanies,
  ]);

  /*
   * ----------------------------------------------------------
   * LOAD COMPANY DETAILS
   * ----------------------------------------------------------
   */

  const resolveCompany =
    useCallback(
      async (id) => {
        const normalized =
          normalizeId(id);

        if (!normalized) {
          return null;
        }

        try {
          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                normalized
              )}`
            );

          const root =
            payload?.data ??
            payload;

          const raw =
            root?.company ??
            root;

          if (
            raw &&
            typeof raw ===
              "object"
          ) {
            return {
              ...raw,
              id:
                normalizeId(
                  firstValue(
                    raw.id,
                    normalized
                  )
                ),
              name:
                firstValue(
                  raw.name,
                  normalized
                ),
              category:
                firstValue(
                  raw.category,
                  "Technology"
                ),
              domain:
                firstValue(
                  raw.domain,
                  raw.websiteDomain,
                  raw.website,
                  ""
                ),
            };
          }
        } catch (err) {
          /*
           * Company summary endpoint may be
           * the available endpoint in this deployment.
           * Do not block technical navigation.
           */
          console.warn(
            "[TECHNICAL COMPANY DETAILS]",
            err
          );
        }

        return companyFromId(
          normalized
        );
      },
      []
    );

  /*
   * ----------------------------------------------------------
   * LOAD LEVELS
   * ----------------------------------------------------------
   */

  const loadLevels =
    useCallback(
      async (id) => {
        const normalized =
          normalizeId(id);

        if (!normalized) {
          return;
        }

        setLoadingLevels(
          true
        );

        setError("");

        try {
          const payload =
            await apiFetch(
              `/api/technical/company/${encodeURIComponent(
                normalized
              )}/levels`
            );

          const root =
            payload?.data ??
            payload;

          const source =
            Array.isArray(root)
              ? root
              : Array.isArray(
                  root?.levels
                )
              ? root.levels
              : Array.isArray(
                  root?.items
                )
              ? root.items
              : [];

          const parsed =
            source
              .map(
                (
                  level,
                  index
                ) => {
                  const number =
                    safeNumber(
                      firstValue(
                        level?.level,
                        level?.levelNumber
                      ),
                      index + 1
                    );

                  return {
                    ...level,

                    level:
                      number,

                    levelNumber:
                      number,

                    title:
                      firstValue(
                        level?.title,
                        `Level ${number}`
                      ),

                    difficulty:
                      firstValue(
                        level?.difficulty,
                        "Technical"
                      ),

                    questionCount:
                      safeNumber(
                        level?.questionCount,
                        0
                      ),

                    estimatedMinutes:
                      safeNumber(
                        level?.estimatedMinutes,
                        0
                      ),
                  };
                }
              )
              .filter(
                (level) =>
                  level.level > 0
              );

          if (
            !parsed.length
          ) {
            throw new Error(
              "No technical assessment levels are available for this company."
            );
          }

          setLevels(
            parsed
          );
        } catch (err) {
          console.error(
            "[TECHNICAL LEVELS]",
            err
          );

          setLevels([]);

          setError(
            err.message ||
              "Unable to load technical levels."
          );
        } finally {
          setLoadingLevels(
            false
          );
        }
      },
      []
    );

  /*
   * Load levels whenever company changes.
   */

  useEffect(() => {
    if (
      screen ===
        "levels" &&
      company?.id
    ) {
      loadLevels(
        company.id
      );
    }
  }, [
    screen,
    company?.id,
    loadLevels,
  ]);

  /*
   * ----------------------------------------------------------
   * NAVIGATION: COMPANIES
   * ----------------------------------------------------------
   */

  const goCompanies =
    useCallback(
      async () => {
        clearStoredAttempt();
        clearStoredResult();

        await exitFullscreen();

        setSelectedCompany(
          null
        );

        setLevels([]);

        setSelectedLevel(
          null
        );

        setQuestions([]);

        setAnswers({});

        answersRef.current =
          {};

        setAttemptId(
          null
        );

        attemptIdRef.current =
          null;

        setStartedAt(
          null
        );

        setResult(
          null
        );

        setViolations([]);

        violationsRef.current =
          [];

        setProctorWarning(
          ""
        );

        setProctorLocked(
          false
        );

        setError("");

        setScreen(
          "companies"
        );

        navigate(
          "/technical-lab",
          {
            replace: true,
          }
        );
      },
      [navigate]
    );

  /*
   * ----------------------------------------------------------
   * NAVIGATION: LEVELS
   * ----------------------------------------------------------
   */

  const goLevels =
    useCallback(
      async (id) => {
        const normalized =
          normalizeId(id);

        if (!normalized) {
          await goCompanies();
          return;
        }

        clearStoredAttempt();
        clearStoredResult();

        await exitFullscreen();

        setQuestions([]);

        setAnswers({});

        answersRef.current =
          {};

        setAttemptId(
          null
        );

        attemptIdRef.current =
          null;

        setStartedAt(
          null
        );

        setResult(
          null
        );

        setViolations([]);

        violationsRef.current =
          [];

        setProctorWarning(
          ""
        );

        setProctorLocked(
          false
        );

        setSelectedLevel(
          null
        );

        const resolved =
          await resolveCompany(
            normalized
          );

        setSelectedCompany(
          resolved ||
            companyFromId(
              normalized
            )
        );

        setScreen(
          "levels"
        );

        navigate(
          `/technical-lab/${encodeURIComponent(
            normalized
          )}/levels`,
          {
            replace: true,
          }
        );
      },
      [
        goCompanies,
        navigate,
        resolveCompany,
      ]
    );

  /*
   * ----------------------------------------------------------
   * SELECT COMPANY
   * ----------------------------------------------------------
   */

  const chooseCompany =
    useCallback(
      async (item) => {
        const id =
          normalizeId(
            item?.id
          );

        if (!id) {
          return;
        }

        clearStoredAttempt();
        clearStoredResult();

        await exitFullscreen();

        const resolved =
          await resolveCompany(
            id
          );

        setSelectedCompany(
          resolved ||
            item ||
            companyFromId(id)
        );

        setLevels([]);

        setQuestions([]);

        setAnswers({});

        answersRef.current =
          {};

        setSelectedLevel(
          null
        );

        setAttemptId(
          null
        );

        setResult(
          null
        );

        setError("");

        setScreen(
          "levels"
        );

        /*
         * Clean route.
         *
         * CompanyDetails should navigate to
         * /technical-lab/:companyId/levels
         */

        navigate(
          `/technical-lab/${encodeURIComponent(
            id
          )}/levels`,
          {
            replace: true,
          }
        );
      },
      [
        navigate,
        resolveCompany,
      ]
    );

  /*
   * ----------------------------------------------------------
   * THE IMPORTANT QUESTION LOADER
   * ----------------------------------------------------------
   *
   * DO NOT call:
   *
   * /levels/:level
   *
   * expecting questions.
   *
   * That endpoint is level metadata.
   *
   * Instead:
   *
   * /levels/:level/questions/0
   * /levels/:level/questions/1
   * /levels/:level/questions/2
   * ...
   *
   * We load them in parallel batches.
   */

  const loadLevelQuestions =
    useCallback(
      async (
        companyId,
        levelNumber,
        expectedCount
      ) => {
        const id =
          normalizeId(
            companyId
          );

        const level =
          safeNumber(
            levelNumber,
            0
          );

        if (
          !id ||
          !level
        ) {
          throw new Error(
            "Invalid company or technical level."
          );
        }

        /*
         * First get authoritative level metadata.
         *
         * This is NOT used as the question source.
         */
        const metadata =
          await apiFetch(
            `/api/technical/company/${encodeURIComponent(
              id
            )}/levels/${level}`
          );

        const metadataRoot =
          metadata?.data ??
          metadata;

        /*
         * If this deployment ever returns the entire
         * question array, use it immediately.
         *
         * This makes the frontend compatible with both
         * implementations.
         */

        const direct =
          normalizeQuestionCollection(
            metadata
          );

        if (
          direct.length > 0
        ) {
          return {
            questions:
              direct,
            metadata:
              metadataRoot,
          };
        }

        /*
         * Normal verified deployment:
         *
         * metadataRoot.questionCount
         */
        const count =
          Math.max(
            0,
            safeNumber(
              firstValue(
                expectedCount,
                metadataRoot?.level?.questionCount,
                metadataRoot?.questionCount,
                metadataRoot?.level?.questionsCount
              ),
              0
            )
          );

        if (
          count <= 0
        ) {
          throw new Error(
            "The selected technical level reports zero questions."
          );
        }

        /*
         * Batch requests so 60 questions don't create
         * 60 simultaneous connections.
         */
        const BATCH_SIZE =
          8;

        const loaded = [];

        for (
          let start = 0;
          start < count;
          start += BATCH_SIZE
        ) {
          const end =
            Math.min(
              start +
                BATCH_SIZE,
              count
            );

          const indexes =
            [];

          for (
            let index =
              start;
            index <
              end;
            index++
          ) {
            indexes.push(
              index
            );
          }

          const batch =
            await Promise.all(
              indexes.map(
                async (
                  questionIndex
                ) => {
                  try {
                    const payload =
                      await apiFetch(
                        `/api/technical/company/${encodeURIComponent(
                          id
                        )}/levels/${encodeURIComponent(
                          level
                        )}/questions/${questionIndex}`
                      );

                    return normalizeQuestion(
                      payload,
                      questionIndex
                    );
                  } catch (error) {
                    /*
                     * A missing question index should
                     * not destroy the whole assessment.
                     */
                    console.warn(
                      `[TECHNICAL QUESTION ${questionIndex}]`,
                      error
                    );

                    return null;
                  }
                }
              )
            );

          loaded.push(
            ...batch.filter(
              Boolean
            )
          );
        }

        /*
         * Preserve dataset order.
         */
        loaded.sort(
          (a, b) =>
            safeNumber(
              a.number
            ) -
            safeNumber(
              b.number
            )
        );

        /*
         * Deduplicate IDs.
         */
        const unique =
          [];

        const seen =
          new Set();

        for (
          const question of
            loaded
        ) {
          if (
            !seen.has(
              question.id
            )
          ) {
            seen.add(
              question.id
            );

            unique.push(
              question
            );
          }
        }

        if (
          unique.length ===
          0
        ) {
          throw new Error(
            "The selected technical level contains no usable questions."
          );
        }

        return {
          questions:
            unique,
          metadata:
            metadataRoot,
        };
      },
      []
    );

  /*
   * ----------------------------------------------------------
   * START LEVEL
   * ----------------------------------------------------------
   */

  const startLevel =
    useCallback(
      async (level) => {
        if (
          !selectedCompany ||
          loadingTest
        ) {
          return;
        }

        const levelNumber =
          safeNumber(
            firstValue(
              level?.level,
              level?.levelNumber
            ),
            0
          );

        if (
          !levelNumber
        ) {
          setError(
            "Invalid technical level."
          );

          return;
        }

        setLoadingTest(
          true
        );

        setError("");

        /*
         * Fullscreen must happen from the button
         * gesture before asynchronous work.
         */
        await enterFullscreen();

        try {
          /*
           * --------------------------------------------------
           * 1. LOAD REAL QUESTIONS
           * --------------------------------------------------
           */

          const questionData =
            await loadLevelQuestions(
              selectedCompany.id,
              levelNumber,
              level?.questionCount
            );

          const normalized =
            questionData.questions;

          if (
            !normalized.length
          ) {
            throw new Error(
              "This technical level contains no usable questions."
            );
          }

          /*
           * --------------------------------------------------
           * 2. CREATE AUTHORITATIVE SERVER ATTEMPT
           * --------------------------------------------------
           */

          const startPayload =
            await apiFetch(
              "/api/technical/assessment/start",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    companyId:
                      selectedCompany.id,

                    levelNumber,

                    totalQuestions:
                      normalized.length,

                    mode:
                      "proctored",

                    proctoringMode:
                      "browser_fullscreen",
                  }),
              }
            );

          const attempt =
            startPayload?.data ??
            startPayload;

          const id =
            firstValue(
              attempt?.attemptId,
              attempt?.assessmentId,
              attempt?.id,
              startPayload?.attemptId
            );

          if (!id) {
            throw new Error(
              "The backend did not return an attempt ID."
            );
          }

          /*
           * --------------------------------------------------
           * 3. TIME
           * --------------------------------------------------
           */

          const minutes =
            Math.max(
              1,
              safeNumber(
                firstValue(
                  attempt?.estimatedMinutes,
                  attempt?.level?.estimatedMinutes,
                  questionData
                    ?.metadata
                    ?.estimatedMinutes,
                  level?.estimatedMinutes,
                  60
                ),
                60
              )
            );

          const seconds =
            Math.max(
              60,
              Math.round(
                minutes *
                  60
              )
            );

          const now =
            new Date().toISOString();

          /*
           * --------------------------------------------------
           * 4. LOCAL RECOVERY STATE
           * --------------------------------------------------
           */

          const session = {
            attemptId:
              String(id),

            companyId:
              selectedCompany.id,

            levelNumber,

            startedAt:
              now,

            timeAllowed:
              seconds,

            questions:
              normalized,

            answers: {},

            currentIndex:
              0,

            violations: [],

            mode:
              "proctored",

            proctoringMode:
              "browser_fullscreen",
          };

          saveStoredAttempt(
            session
          );

          clearStoredResult();

          /*
           * --------------------------------------------------
           * 5. STATE
           * --------------------------------------------------
           */

          setAttemptId(
            String(id)
          );

          attemptIdRef.current =
            String(id);

          setSelectedLevel(
            levelNumber
          );

          setQuestions(
            normalized
          );

          questionsRef.current =
            normalized;

          setAnswers({});

          answersRef.current =
            {};

          setCurrentIndex(
            0
          );

          setStartedAt(
            now
          );

          startedAtRef.current =
            now;

          setTimeAllowed(
            seconds
          );

          setRemainingSeconds(
            seconds
          );

          remainingRef.current =
            seconds;

          setViolations([]);

          violationsRef.current =
            [];

          setProctorWarning(
            ""
          );

          setProctorLocked(
            false
          );

          setResult(
            null
          );

          setScreen(
            "running"
          );

          /*
           * --------------------------------------------------
           * 6. CLEAN TEST URL
           * --------------------------------------------------
           */

          navigate(
            `/technical-lab/${encodeURIComponent(
              selectedCompany.id
            )}/level/${levelNumber}`,
            {
              replace: true,
            }
          );
        } catch (err) {
          console.error(
            "[TECHNICAL START]",
            err
          );

          await exitFullscreen();

          setError(
            err.message ||
              "Unable to start technical assessment."
          );
        } finally {
          setLoadingTest(
            false
          );
        }
      },
      [
        selectedCompany,
        loadingTest,
        loadLevelQuestions,
        navigate,
      ]
    );

  /*
   * ----------------------------------------------------------
   * RESTORE ACTIVE ATTEMPT
   * ----------------------------------------------------------
   *
   * Refreshing the page during a test should not create
   * another attempt.
   */

  useEffect(() => {
    if (
      screen !==
        "running" ||
      questions.length > 0
    ) {
      return;
    }

    const saved =
      readStoredAttempt();

    if (
      !saved ||
      !saved.attemptId
    ) {
      return;
    }

    if (
      normalizeId(
        saved.companyId
      ) !==
      normalizeId(
        company?.id
      )
    ) {
      return;
    }

    if (
      safeNumber(
        saved.levelNumber
      ) <= 0
    ) {
      return;
    }

    const started =
      new Date(
        saved.startedAt
      ).getTime();

    if (
      !Number.isFinite(
        started
      )
    ) {
      clearStoredAttempt();
      return;
    }

    const elapsed =
      Math.floor(
        (
          Date.now() -
          started
        ) / 1000
      );

    const remaining =
      Math.max(
        0,
        safeNumber(
          saved.timeAllowed
        ) -
          elapsed
      );

    if (
      remaining <= 0
    ) {
      clearStoredAttempt();
      return;
    }

    const restoredQuestions =
      Array.isArray(
        saved.questions
      )
        ? saved.questions
        : [];

    if (
      restoredQuestions.length ===
      0
    ) {
      return;
    }

    setAttemptId(
      String(
        saved.attemptId
      )
    );

    attemptIdRef.current =
      String(
        saved.attemptId
      );

    setSelectedLevel(
      safeNumber(
        saved.levelNumber
      )
    );

    setQuestions(
      restoredQuestions
    );

    questionsRef.current =
      restoredQuestions;

    setAnswers(
      saved.answers ||
        {}
    );

    answersRef.current =
      saved.answers ||
      {};

    setCurrentIndex(
      Math.min(
        safeNumber(
          saved.currentIndex
        ),
        Math.max(
          0,
          restoredQuestions.length -
            1
        )
      )
    );

    setStartedAt(
      saved.startedAt
    );

    startedAtRef.current =
      saved.startedAt;

    setTimeAllowed(
      safeNumber(
        saved.timeAllowed
      )
    );

    setRemainingSeconds(
      remaining
    );

    remainingRef.current =
      remaining;

    setViolations(
      Array.isArray(
        saved.violations
      )
        ? saved.violations
        : []
    );

    violationsRef.current =
      Array.isArray(
        saved.violations
      )
        ? saved.violations
        : [];

    setProctorLocked(
      false
    );

    setScreen(
      "running"
    );
  }, [
    screen,
    questions.length,
    company?.id,
  ]);

  /*
   * ----------------------------------------------------------
   * ANSWER
   * ----------------------------------------------------------
   */

  const chooseAnswer =
    useCallback(
      (
        questionId,
        optionIndex
      ) => {
        if (
          screen !==
            "running" ||
          proctorLocked ||
          submitting
        ) {
          return;
        }

        setAnswers(
          (previous) => {
            const next = {
              ...previous,

              [questionId]:
                optionIndex,
            };

            answersRef.current =
              next;

            const stored =
              readStoredAttempt();

            if (
              stored &&
              String(
                stored.attemptId
              ) ===
                String(
                  attemptIdRef.current
                )
            ) {
              stored.answers =
                next;

              stored.currentIndex =
                currentIndex;

              saveStoredAttempt(
                stored
              );
            }

            return next;
          }
        );
      },
      [
        screen,
        proctorLocked,
        submitting,
        currentIndex,
      ]
    );

  /*
   * ----------------------------------------------------------
   * PROCTORING VIOLATION
   * ----------------------------------------------------------
   */

  const addViolation =
    useCallback(
      (
        type,
        details = ""
      ) => {
        if (
          screen !==
            "running"
        ) {
          return;
        }

        const item = {
          type,
          details:
            String(
              details ||
                ""
            ),

          timestamp:
            new Date().toISOString(),
        };

        setViolations(
          (previous) => {
            const next = [
              ...previous,
              item,
            ];

            violationsRef.current =
              next;

            const stored =
              readStoredAttempt();

            if (
              stored &&
              String(
                stored.attemptId
              ) ===
                String(
                  attemptIdRef.current
                )
            ) {
              stored.violations =
                next;

              saveStoredAttempt(
                stored
              );
            }

            return next;
          }
        );

        setProctorWarning(
          `Proctoring event detected: ${type.replace(
            /_/g,
            " "
          )}`
        );
      },
      [screen]
    );

  /*
   * ----------------------------------------------------------
   * PROCTOR EVENT LISTENERS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      screen !==
      "running"
    ) {
      return;
    }

    const onVisibility =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          addViolation(
            "TAB_HIDDEN"
          );
        }
      };

    const onFullscreen =
      () => {
        if (
          !document.fullscreenElement
        ) {
          addViolation(
            "FULLSCREEN_EXIT"
          );
        }
      };

    const onBlur =
      () => {
        addViolation(
          "WINDOW_BLUR"
        );
      };

    const onContext =
      (event) => {
        event.preventDefault();

        addViolation(
          "CONTEXT_MENU"
        );
      };

    const onCopy =
      (event) => {
        event.preventDefault();

        addViolation(
          "COPY_ATTEMPT"
        );
      };

    const onCut =
      (event) => {
        event.preventDefault();

        addViolation(
          "CUT_ATTEMPT"
        );
      };

    const onPaste =
      (event) => {
        event.preventDefault();

        addViolation(
          "PASTE_ATTEMPT"
        );
      };

    const onKey =
      (event) => {
        const key =
          String(
            event.key ||
              ""
          ).toLowerCase();

        const blocked =
          (
            event.ctrlKey &&
            [
              "c",
              "x",
              "v",
              "a",
              "u",
              "s",
              "p",
            ].includes(
              key
            )
          ) ||
          key ===
            "f12" ||
          (
            event.ctrlKey &&
            event.shiftKey &&
            [
              "i",
              "j",
              "c",
            ].includes(
              key
            )
          );

        if (
          blocked
        ) {
          event.preventDefault();

          addViolation(
            "BLOCKED_KEYBOARD_ACTION",
            key
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    document.addEventListener(
      "fullscreenchange",
      onFullscreen
    );

    window.addEventListener(
      "blur",
      onBlur
    );

    document.addEventListener(
      "contextmenu",
      onContext
    );

    document.addEventListener(
      "copy",
      onCopy
    );

    document.addEventListener(
      "cut",
      onCut
    );

    document.addEventListener(
      "paste",
      onPaste
    );

    document.addEventListener(
      "keydown",
      onKey,
      true
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );

      document.removeEventListener(
        "fullscreenchange",
        onFullscreen
      );

      window.removeEventListener(
        "blur",
        onBlur
      );

      document.removeEventListener(
        "contextmenu",
        onContext
      );

      document.removeEventListener(
        "copy",
        onCopy
      );

      document.removeEventListener(
        "cut",
        onCut
      );

      document.removeEventListener(
        "paste",
        onPaste
      );

      document.removeEventListener(
        "keydown",
        onKey,
        true
      );
    };
  }, [
    screen,
    addViolation,
  ]);

  /*
   * ----------------------------------------------------------
   * PROCTOR LIMIT
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      screen !==
        "running" ||
      violations.length <
        PROCTOR_LIMIT
    ) {
      return;
    }

    setProctorLocked(
      true
    );

    setProctorWarning(
      "Maximum proctoring violations reached. The attempt will be submitted."
    );

    const timer =
      setTimeout(
        () => {
          submitRef.current?.(
            true,
            "PROCTORING_VIOLATION_LIMIT"
          );
        },
        700
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [
    screen,
    violations.length,
  ]);

  /*
   * ----------------------------------------------------------
   * SUBMIT
   * ----------------------------------------------------------
   */

  const submitAssessment =
    useCallback(
      async (
        automatic = false,
        automaticReason = ""
      ) => {
        if (
          !attemptIdRef.current ||
          submittingRef.current
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(
          true
        );

        clearInterval(
          timerRef.current
        );

        try {
          const completedAt =
            new Date().toISOString();

          const timeUsed =
            Math.max(
              0,
              safeNumber(
                timeAllowed
              ) -
                safeNumber(
                  remainingRef.current
                )
            );

          /*
           * SERVER IS AUTHORITATIVE.
           *
           * Never calculate the final score here.
           */

          const payload =
            await apiFetch(
              "/api/technical/assessment/submit",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    attemptId:
                      attemptIdRef.current,

                    companyId:
                      company?.id,

                    levelNumber:
                      selectedLevel,

                    answers:
                      answersRef.current,

                    startedAt:
                      startedAtRef.current,

                    completedAt,

                    timeAllowedSeconds:
                      timeAllowed,

                    timeUsedSeconds:
                      timeUsed,

                    automaticSubmission:
                      automatic,

                    autoSubmissionReason:
                      automaticReason ||
                      (
                        automatic
                          ? "TIME_EXPIRED"
                          : ""
                      ),

                    mode:
                      "proctored",

                    proctoring: {
                      mode:
                        "browser_fullscreen",

                      violationCount:
                        violationsRef.current
                          .length,

                      violations:
                        violationsRef.current,

                      locked:
                        proctorLocked ||
                        violationsRef.current
                          .length >=
                          PROCTOR_LIMIT,
                    },
                  }),
              }
            );

          const serverResult =
            payload?.data ??
            payload?.result ??
            payload;

          if (
            !serverResult ||
            typeof serverResult !==
              "object"
          ) {
            throw new Error(
              "The server returned an invalid assessment result."
            );
          }

          /*
           * Save result locally only for route recovery.
           * Firebase/backend remains authoritative.
           */

          saveStoredResult(
            serverResult
          );

          clearStoredAttempt();

          setResult(
            serverResult
          );

          setScreen(
            "result"
          );

          await exitFullscreen();

          navigate(
            `/technical-lab/${encodeURIComponent(
              company?.id
            )}/level/${selectedLevel}/result`,
            {
              replace: true,
            }
          );
        } catch (err) {
          console.error(
            "[TECHNICAL SUBMIT]",
            err
          );

          setError(
            err.message ||
              "Unable to submit technical assessment."
          );

          submittingRef.current =
            false;

          setSubmitting(
            false
          );
        }
      },
      [
        company?.id,
        selectedLevel,
        timeAllowed,
        proctorLocked,
        navigate,
      ]
    );

  useEffect(() => {
    submitRef.current =
      submitAssessment;
  }, [
    submitAssessment,
  ]);

  /*
   * ----------------------------------------------------------
   * TIMER
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      screen !==
        "running"
    ) {
      clearInterval(
        timerRef.current
      );

      return;
    }

    clearInterval(
      timerRef.current
    );

    timerRef.current =
      setInterval(
        () => {
          setRemainingSeconds(
            (previous) => {
              const next =
                Math.max(
                  0,
                  previous - 1
                );

              remainingRef.current =
                next;

              if (
                next === 0
              ) {
                clearInterval(
                  timerRef.current
                );

                setTimeout(
                  () => {
                    submitRef.current?.(
                      true,
                      "TIME_EXPIRED"
                    );
                  },
                  0
                );
              }

              return next;
            }
          );
        },
        1000
      );

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [
    screen,
  ]);

  /*
   * ----------------------------------------------------------
   * CURRENT QUESTION
   * ----------------------------------------------------------
   */

  const currentQuestion =
    questions[
      currentIndex
    ] || null;

  const answeredCount =
    questions.filter(
      (question) =>
        answers[
          question.id
        ] !== undefined
    ).length;

  const unansweredCount =
    Math.max(
      0,
      questions.length -
        answeredCount
    );

  const progress =
    questions.length
      ? Math.round(
          (
            answeredCount /
            questions.length
          ) *
            100
        )
      : 0;

  /*
   * ----------------------------------------------------------
   * RESULT ROUTE
   * ----------------------------------------------------------
   */

  if (
    isResultRoute ||
    screen ===
      "result"
  ) {
    const finalResult =
      result ||
      readStoredResult();

    if (
      !finalResult
    ) {
      /*
       * Never show a fake result.
       */
      return (
        <>
          <style>
            {STYLES}
          </style>

          <div className="technical-page">
            <div className="technical-topbar">
              <div>
                <div className="tech-top-title">
                  Technical Assessment
                </div>

                <div className="tech-top-subtitle">
                  Result unavailable
                </div>
              </div>

              <button
                className="secondary-button"
                onClick={
                  goCompanies
                }
              >
                Technical Lab
              </button>
            </div>

            <main className="result-container">
              <section className="result-card">
                <h1>
                  Result not found
                </h1>

                <p
                  style={{
                    color:
                      "#777",
                  }}
                >
                  No completed assessment
                  result is available
                  for this route.
                </p>

                <button
                  className="primary-button"
                  onClick={
                    goCompanies
                  }
                >
                  Back to Technical Lab
                </button>
              </section>
            </main>
          </div>
        </>
      );
    }

    const score =
      safeNumber(
        firstValue(
          finalResult.percentage,
          finalResult.score
        ),
        0
      );

    return (
      <>
        <style>
          {STYLES}
        </style>

        <div className="technical-page">
          <div className="technical-topbar">
            <div className="technical-topbar-left">
              <div>
                <div className="tech-top-title">
                  Technical Assessment
                </div>

                <div className="tech-top-subtitle">
                  Completed
                </div>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={
                goCompanies
              }
            >
              Technical Lab
            </button>
          </div>

          <main className="result-container">
            <section className="result-card">
              <div
                className="result-score"
              >
                {score}%
              </div>

              <div className="result-label">
                SERVER EVALUATED SCORE
              </div>

              <h1
                style={{
                  marginTop:
                    25,
                }}
              >
                {firstValue(
                  finalResult.performance,
                  "Assessment completed"
                )}
              </h1>

              <p
                style={{
                  color:
                    "#777",
                }}
              >
                {firstValue(
                  finalResult.companyName,
                  company?.name,
                  "Technical Assessment"
                )}{" "}
                · Level{" "}
                {firstValue(
                  finalResult.levelNumber,
                  selectedLevel,
                  routeLevel
                )}
              </p>

              <div className="result-grid">
                <div className="result-stat">
                  <strong>
                    {safeNumber(
                      finalResult.totalQuestions
                    )}
                  </strong>

                  <span>
                    QUESTIONS
                  </span>
                </div>

                <div className="result-stat">
                  <strong>
                    {safeNumber(
                      finalResult.answeredQuestions
                    )}
                  </strong>

                  <span>
                    ANSWERED
                  </span>
                </div>

                <div className="result-stat">
                  <strong>
                    {safeNumber(
                      finalResult.correctAnswers
                    )}
                  </strong>

                  <span>
                    CORRECT
                  </span>
                </div>

                <div className="result-stat">
                  <strong>
                    {safeNumber(
                      finalResult.accuracy
                    )}
                    %
                  </strong>

                  <span>
                    ACCURACY
                  </span>
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "center",
                  gap: 10,
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  className="primary-button"
                  onClick={() =>
                    goLevels(
                      firstValue(
                        finalResult.companyId,
                        company?.id
                      )
                    )
                  }
                >
                  Back to Levels
                </button>

                <button
                  className="secondary-button"
                  onClick={
                    goCompanies
                  }
                >
                  All Companies
                </button>
              </div>
            </section>
          </main>
        </div>
      </>
    );
  }

  /*
   * ----------------------------------------------------------
   * RUNNING TEST
   * ----------------------------------------------------------
   */

  if (
    screen ===
      "running" &&
    questions.length >
      0
  ) {
    const timerWarning =
      remainingSeconds <=
      Math.max(
        60,
        Math.round(
          timeAllowed *
            0.15
        )
      );

    return (
      <>
        <style>
          {STYLES}
        </style>

        <div
          className="test-page"
          onContextMenu={(event) =>
            event.preventDefault()
          }
        >
          <header className="test-topbar">
            <div className="test-brand">
              ENGVIVA
              <small>
                {company?.name ||
                  "Technical"}
                {" · "}
                Level{" "}
                {selectedLevel}
              </small>
            </div>

            <div
              className={
                timerWarning
                  ? "test-timer warning"
                  : "test-timer"
              }
            >
              {formatTime(
                remainingSeconds
              )}
            </div>

            <div className="test-status">
              PROCTORED MODE
            </div>
          </header>

          {proctorWarning && (
            <div className="proctor-banner">
              {proctorWarning}
            </div>
          )}

          <main className="test-container">
            <div className="test-progress">
              <div
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div className="test-layout">
              <section className="question-card">
                <div className="question-number">
                  QUESTION{" "}
                  {currentIndex +
                    1}{" "}
                  /{" "}
                  {questions.length}
                </div>

                <div className="question-module">
                  {currentQuestion?.module ||
                    "Technical"}
                  {" · "}
                  {currentQuestion?.difficulty ||
                    "Mixed"}
                </div>

                <div className="question-text">
                  {currentQuestion?.question}
                </div>

                <div className="options">
                  {currentQuestion?.options?.map(
                    (
                      option,
                      index
                    ) => {
                      const selected =
                        answers[
                          currentQuestion.id
                        ] ===
                        index;

                      return (
                        <button
                          key={`${currentQuestion.id}-${index}`}
                          type="button"
                          className={
                            selected
                              ? "option selected"
                              : "option"
                          }
                          onClick={() =>
                            chooseAnswer(
                              currentQuestion.id,
                              index
                            )
                          }
                          disabled={
                            proctorLocked ||
                            submitting
                          }
                        >
                          <span className="option-index">
                            {String.fromCharCode(
                              65 +
                                index
                            )}
                          </span>

                          <span>
                            {option}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="question-actions">
                  <button
                    className="secondary-button"
                    disabled={
                      currentIndex ===
                        0 ||
                      submitting
                    }
                    onClick={() =>
                      setCurrentIndex(
                        (value) =>
                          Math.max(
                            0,
                            value -
                              1
                          )
                      )
                    }
                  >
                    Previous
                  </button>

                  <div className="question-actions-right">
                    {currentIndex <
                    questions.length -
                      1 ? (
                      <button
                        className="primary-button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          setCurrentIndex(
                            (value) =>
                              Math.min(
                                questions.length -
                                  1,
                                value +
                                  1
                              )
                          )
                        }
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          submitAssessment(
                            false,
                            ""
                          )
                        }
                      >
                        {submitting
                          ? "Submitting..."
                          : "Finish Assessment"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="proctor-info">
                  <span>
                    PROCTOR FLAGS:{" "}
                    {violations.length}
                    {" / "}
                    {PROCTOR_LIMIT}
                  </span>

                  <span>
                    {answeredCount} answered
                    {" · "}
                    {unansweredCount} unanswered
                  </span>
                </div>
              </section>

              <aside className="question-nav">
                <h3>
                  Questions
                </h3>

                <p>
                  Jump to any question.
                  Your answers are retained
                  during the attempt.
                </p>

                <div className="question-grid">
                  {questions.map(
                    (
                      question,
                      index
                    ) => {
                      const answered =
                        answers[
                          question.id
                        ] !==
                        undefined;

                      const current =
                        currentIndex ===
                        index;

                      return (
                        <button
                          key={
                            question.id
                          }
                          className={[
                            "question-jump",
                            current
                              ? "current"
                              : "",
                            answered
                              ? "answered"
                              : "",
                          ]
                            .join(
                              " "
                            )
                            .trim()}
                          onClick={() =>
                            setCurrentIndex(
                              index
                            )
                          }
                        >
                          {index +
                            1}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="submit-box">
                  <button
                    className="primary-button"
                    style={{
                      width:
                        "100%",
                    }}
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      submitAssessment(
                        false,
                        ""
                      )
                    }
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Test"}
                  </button>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </>
    );
  }

  /*
   * ----------------------------------------------------------
   * LEVELS SCREEN
   * ----------------------------------------------------------
   */

  if (
    screen ===
    "levels"
  ) {
    return (
      <>
        <style>
          {STYLES}
        </style>

        <div className="technical-page">
          <header className="technical-topbar">
            <div className="technical-topbar-left">
              <button
                className="tech-back"
                onClick={
                  goCompanies
                }
              >
                ←
              </button>

              <div>
                <div className="tech-top-title">
                  {company?.name ||
                    "Company"}
                </div>

                <div className="tech-top-subtitle">
                  Technical assessment
                  levels
                </div>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={
                goCompanies
              }
            >
              All Companies
            </button>
          </header>

          <main className="technical-container">
            <section className="company-hero">
              <CompanyLogo
                company={
                  company
                }
                large
              />

              <div className="company-hero-copy">
                <span>
                  {(
                    company?.category ||
                    "TECHNOLOGY"
                  ).toUpperCase()}
                </span>

                <h1>
                  {company?.name ||
                    "Company"}
                </h1>

                <p>
                  Select a level to begin
                  a server-evaluated
                  proctored technical
                  assessment.
                </p>
              </div>

              <div className="company-level-count">
                <strong>
                  {levels.length ||
                    "—"}
                </strong>

                <span>
                  LEVELS
                </span>
              </div>
            </section>

            {error && (
              <div className="error-banner">
                {error}

                <button
                  className="secondary-button"
                  style={{
                    marginLeft:
                      10,
                  }}
                  onClick={() =>
                    loadLevels(
                      company?.id
                    )
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {loadingLevels ? (
              <div className="loading-block">
                Loading technical
                levels…
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <span>
                      SERVER DATASET
                    </span>

                    <h2>
                      Choose your level
                    </h2>
                  </div>

                  <span>
                    PROCTORED ASSESSMENT
                  </span>
                </div>

                <section className="levels-grid">
                  {levels.map(
                    (
                      level,
                      index
                    ) => {
                      const number =
                        safeNumber(
                          firstValue(
                            level?.level,
                            level?.levelNumber
                          ),
                          index +
                            1
                        );

                      const title =
                        firstValue(
                          level?.title,
                          `Level ${number}`
                        );

                      const difficulty =
                        firstValue(
                          level?.difficulty,
                          "Technical"
                        );

                      const count =
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
                        <article
                          key={`${company?.id}-${number}`}
                          className="level-card"
                        >
                          <span className="level-number">
                            LEVEL{" "}
                            {number}
                          </span>

                          <h3>
                            {title}
                          </h3>

                          <p>
                            {firstValue(
                              level?.description,
                              "Questions are loaded directly from the configured technical dataset."
                            )}
                          </p>

                          <div className="level-meta">
                            <span className="level-pill">
                              {
                                difficulty
                              }
                            </span>

                            {count >
                              0 && (
                              <span className="level-pill">
                                {count}{" "}
                                QUESTIONS
                              </span>
                            )}

                            {minutes >
                              0 && (
                              <span className="level-pill">
                                {minutes}{" "}
                                MIN
                              </span>
                            )}
                          </div>

                          <button
                            className="primary-button"
                            style={{
                              width:
                                "100%",
                            }}
                            disabled={
                              loadingTest
                            }
                            onClick={() =>
                              startLevel(
                                level
                              )
                            }
                          >
                            {loadingTest
                              ? "Loading..."
                              : "Start Proctored Test"}
                          </button>
                        </article>
                      );
                    }
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </>
    );
  }

  /*
   * ----------------------------------------------------------
   * COMPANY SCREEN
   * ----------------------------------------------------------
   */

  return (
    <>
      <style>
        {STYLES}
      </style>

      <div className="technical-page">
        <header className="technical-topbar">
          <div className="technical-topbar-left">
            <button
              className="tech-back"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              ←
            </button>

            <div>
              <div className="tech-top-title">
                Technical Lab
              </div>

              <div className="tech-top-subtitle">
                Engineering preparation
              </div>
            </div>
          </div>

          <button
            className="secondary-button"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
          >
            Dashboard
          </button>
        </header>

        <main className="technical-container">
          <section className="hero-block">
            <div>
              <span className="technical-eyebrow">
                ENGVIVA / TECHNICAL
              </span>

              <h1>
                Train for the
                companies you want.
              </h1>

              <p>
                Select a company, choose a
                technical level and enter a
                server-evaluated proctored
                assessment. Questions are
                loaded from the installed
                technical dataset.
              </p>
            </div>

            <div className="hero-stat">
              <strong>
                {companies.length}
              </strong>

              <span>
                COMPANIES
              </span>
            </div>
          </section>

          {error && (
            <div className="error-banner">
              {error}

              <button
                className="secondary-button"
                style={{
                  marginLeft:
                    10,
                }}
                onClick={
                  loadCompanies
                }
              >
                Retry
              </button>
            </div>
          )}

          <section>
            <div className="section-heading">
              <div>
                <span>
                  TECHNICAL TRAINING
                </span>

                <h2>
                  Select a company
                </h2>
              </div>

              <span>
                DATASET DRIVEN
              </span>
            </div>

            {companiesLoading ? (
              <div className="loading-block">
                Loading technical
                companies…
              </div>
            ) : companies.length >
              0 ? (
              <div className="company-grid">
                {companies.map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      className="company-card"
                      onClick={() =>
                        chooseCompany(
                          item
                        )
                      }
                    >
                      <div className="company-card-head">
                        <CompanyLogo
                          company={
                            item
                          }
                        />

                        <span
                          style={{
                            color:
                              "#555",
                            fontSize:
                              18,
                          }}
                        >
                          →
                        </span>
                      </div>

                      <h3>
                        {item.name}
                      </h3>

                      <p>
                        {item.category ||
                          "Technology"}
                      </p>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="empty-block">
                <strong>
                  No technical companies
                  returned.
                </strong>

                <p
                  style={{
                    color:
                      "#777",
                  }}
                >
                  The technical API did not
                  return a company collection.
                  Open a company from
                  Company Details to enter
                  its technical levels.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}