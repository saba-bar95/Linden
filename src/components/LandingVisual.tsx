/**
 * Dominant hero visual: a live margin cockpit plane (not interactive cards).
 * Decorative only — auth lives below the fold.
 */
export function LandingVisual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`landing-visual relative overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="landing-visual-glow" />
      <div className="landing-visual-plane">
        <div className="landing-visual-header">
          <span className="landing-visual-job">Cabinet remodel — Unit 4</span>
          <span className="landing-visual-live">Live</span>
        </div>

        <p className="landing-visual-label">Margin left</p>
        <p className="landing-visual-figure landing-visual-figure-in">
          $4,280
          <span className="landing-visual-pct">18.4%</span>
        </p>

        <div className="landing-visual-meter">
          <span className="landing-visual-meter-fill" />
        </div>

        <div className="landing-visual-flow">
          <span>Estimate</span>
          <span className="landing-visual-arrow" />
          <span>Hours · Costs · COs</span>
          <span className="landing-visual-arrow" />
          <span>Margin</span>
        </div>

        <dl className="landing-visual-rows">
          <div>
            <dt>Budget price</dt>
            <dd>$23,250</dd>
          </div>
          <div>
            <dt>Forecast cost</dt>
            <dd>$18,970</dd>
          </div>
          <div>
            <dt>Unbilled</dt>
            <dd>$6,100</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
