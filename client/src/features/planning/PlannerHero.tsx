import { Leaf } from 'lucide-react';
import './PlannerHero.css';

export function PlannerHero() {
  return (
    <section className="planner-hero [&&]:bg-[#e9eedf] [&&]:[border:1px_solid_#dfe6d4] [&&]:rounded-[14px] [&&]:flex [&&]:justify-between [&&]:min-h-[278px] [&&]:p-[31px_36px] [&&]:overflow-hidden [&&]:mb-[26px] [&&_h2]:[font:36px/1.15_Georgia,_serif] [&&_h2]:tracking-[-0.7px] [&&_h2]:m-[17px_0_12px] [&&_p]:text-[#7e8774] [&&_p]:text-[12px] [@media(max-width:760px)]:[&&]:p-[25px] [@media(max-width:760px)]:[&&]:min-h-[248px] [@media(max-width:760px)]:[&&_h2]:text-[31px]">
      <div>
        <span className="pill [&&]:inline-flex [&&]:text-[10px] [&&]:[font-weight:650] [&&]:rounded-[20px] [&&]:bg-[#f4f6ed] [&&]:text-[#75845b] [&&]:p-[5px_11px] [&&]:tracking-[0.4px]">
          YOUR WEEK, SORTED
        </span>
        <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
          Good meals.
          <br />
          Less mental load.
        </h2>
        <p className="m-[0_0_12px]">
          Pick how many meals you need.
          <br />
          We’ll take care of the choosing.
        </p>
        <div className="hero-line [&&]:flex [&&]:items-center [&&]:gap-[7px] [&&]:text-[#788568] [&&]:text-[10px] [&&]:mt-[20px] [@media(max-width:760px)]:[&&]:text-[9px]">
          <Leaf size={18} />
          Made from your own recipe collection
        </div>
      </div>
      <div
        className="plate-art [&&]:relative [&&]:flex [&&]:items-center [&&]:justify-center [&&]:w-[42%] [&&]:[transform:rotate(-10deg)] [@media(max-width:1100px)]:[&&]:w-[38%] [@media(max-width:760px)]:[&&]:w-[33%] [@media(max-width:760px)]:[&&]:opacity-[0.85]"
        aria-hidden="true"
      >
        <div className="plate">
          <span>✦</span>
          <i />
          <b />
          <em />
        </div>
        <div className="art-caption [&&]:absolute [&&]:[bottom:0] [&&]:[right:-8px] [&&]:[font:italic_13px/1.6_Georgia,_serif] [&&]:text-[#7c896e] [&&]:[transform:rotate(10deg)] [&&_strong]:font-normal [@media(max-width:760px)]:[&&]:hidden">
          a little planning
          <br />
          <strong>a lot to look forward to</strong>
        </div>
      </div>
    </section>
  );
}
