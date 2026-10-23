import { Shuffle } from 'lucide-react';
import type { Meal, Snapshot } from '../../api';

/**
 * Renders selected meal snapshots with cooking, reroll, and replacement actions.
 * Edit callbacks receive a zero-based selection index; replacement IDs are strings.
 * Replacement choices omit selected and excluded meals. `busy` disables edits.
 */
export function WeeklyLineup({
  selection,
  meals,
  excluded,
  busy,
  onView,
  onReroll,
  onReplace,
}: {
  selection: Snapshot[];
  meals: Meal[];
  excluded: number[];
  busy: boolean;
  onView: (meal: Snapshot) => void;
  onReroll: (index: number, meal: Snapshot) => void;
  onReplace: (index: number, id: string) => void;
}) {
  return (
    <div className="lineup [&&]:grid [&&]:gap-[10px]">
      {selection.map((m, i) => (
        <article
          className="meal-row [&&]:flex [&&]:items-center [&&]:gap-[13px] [&&]:bg-[#fff] [&&]:[border:1px_solid_#e1e6d9] [&&]:rounded-[10px] [&&]:p-[17px] [&&_button]:text-[11px] [&&_button]:p-[8px] [&&_select]:text-[11px] [&&_select]:p-[8px] [&&_select]:max-w-[120px] [@media(max-width:1100px)]:[&&]:flex-wrap [@media(max-width:760px)]:[&&]:gap-[9px] [@media(max-width:760px)]:[&&]:p-[13px] [@media(max-width:760px)]:[&&_select]:max-w-[150px]"
          key={`${m.mealId}-${i}`}
        >
          <span className="meal-number [&&]:[font:21px_Georgia,_serif] [&&]:text-[#a2ad93] [&&]:bg-[#f3f5ed] [&&]:p-[12px] [&&]:rounded-[7px] [@media(max-width:760px)]:[&&]:p-[8px]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="meal-copy [&&]:flex-1 [&&]:min-w-0 [&&_h3]:mb-[3px] [&&_h3]:text-[14px] [&&_p]:text-[11px] [&&_p]:m-0 [@media(max-width:1100px)]:[&&]:[flex-basis:60%] [@media(max-width:760px)]:[&&]:[flex-basis:70%]">
            <h3 className="m-[0_0_12px] text-[17px]">{m.name}</h3>
            <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
              {m.recipes.map((r) => r.name).join(' + ')}
            </p>
          </div>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            onClick={() => onView(m)}
          >
            Cook this
          </button>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            aria-label={`Reroll ${m.name}`}
            disabled={busy}
            onClick={() => onReroll(i, m)}
          >
            <Shuffle size={16} />
          </button>
          <select
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
            aria-label={`Replace ${m.name}`}
            value=""
            disabled={busy}
            onChange={(e) => onReplace(i, e.target.value)}
          >
            <option value="">Replace…</option>
            {meals
              ?.filter(
                (x) =>
                  !selection.some((s) => s.mealId === x.id) &&
                  !excluded.includes(x.id),
              )
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </article>
      ))}
    </div>
  );
}
