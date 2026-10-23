import { ArrowRight, CalendarDays } from 'lucide-react';
import type { Plan } from '../../api';
import { pretty } from './dates';

/** Renders saved plans in the supplied order; selecting one reports its week to `onSelect`. */
export function PlanHistory({
  plans,
  onSelect,
}: {
  plans: Plan[];
  onSelect: (week: string) => void;
}) {
  return (
    <section className="past-weeks [&&]:mt-[40px] [&&]:[border-top:1px_solid_#e4e8dc] [&&]:pt-[23px] [&&_h2]:[font:21px_Georgia,_serif]">
      <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
        Previously at your table
      </h2>
      {plans?.length ? (
        <div className="history-list [&&]:grid [&&]:grid-cols-[1fr_1fr] [&&]:gap-[10px] [&&_button]:justify-start [&&_small]:ml-[auto] [&&_small]:text-[#879378] [@media(max-width:760px)]:[&&]:grid-cols-[1fr]">
          {plans.map((p) => (
            <button
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
              key={p.id}
              onClick={() => onSelect(p.week)}
            >
              <CalendarDays size={18} />
              <span>{pretty(p.week)}</span>
              <small className="text-[12px]">{p.meals.length} meals</small>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
          Saved weeks will find a home here.
        </p>
      )}
    </section>
  );
}
