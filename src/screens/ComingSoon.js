import React from "react";

export default function ComingSoon({
  title = "Module",
  description = "This ENGVIVA module is under development."
}) {
  return (
    <div className="engviva-coming">
      <div className="coming-glow coming-glow-1" />
      <div className="coming-glow coming-glow-2" />

      <div className="coming-card">

        <div className="coming-logo">
          <span />
          <span />
          <span />
        </div>

        <div className="coming-label">
          ENGVIVA / ENGINEERING INTELLIGENCE
        </div>

        <h1>{title}</h1>

        <p>{description}</p>

        <div className="coming-status">
          <span className="status-light" />
          MODULE CONNECTED · COMING SOON
        </div>

        <div className="coming-line">
          <span />
        </div>

        <div className="coming-footer">
          ENGVIVA CORE
          <span>•</span>
          ENGINEERING PLACEMENT SYSTEM
        </div>

      </div>
    </div>
  );
}
