import { Leaf } from 'lucide-react';

export function PlannerHero() {
  return (
    <section className="planner-hero">
      <div>
        <span className="pill">YOUR WEEK, SORTED</span>
        <h2>
          Good meals.
          <br />
          Less mental load.
        </h2>
        <p>
          Pick how many meals you need.
          <br />
          We’ll take care of the choosing.
        </p>
        <div className="hero-line">
          <Leaf size={18} />
          Made from your own recipe collection
        </div>
      </div>
      <div className="plate-art" aria-hidden="true">
        <div className="plate">
          <span>✦</span>
          <i />
          <b />
          <em />
        </div>
        <div className="art-caption">
          a little planning
          <br />
          <strong>a lot to look forward to</strong>
        </div>
      </div>
    </section>
  );
}
