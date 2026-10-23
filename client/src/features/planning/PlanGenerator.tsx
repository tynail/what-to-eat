import { Shuffle } from 'lucide-react';
import type { Meal } from '../../api';
import { ErrorBox } from '../../shared/ui/page';

export function PlanGenerator({
  week,
  count,
  meals,
  excluded,
  busy,
  disabled,
  error,
  onWeekChange,
  onCountChange,
  onExcludedChange,
  onGenerate,
}: {
  week: string;
  count: number;
  meals: Meal[];
  excluded: number[];
  busy: boolean;
  disabled: boolean;
  error: unknown;
  onWeekChange: (week: string) => void;
  onCountChange: (count: number) => void;
  onExcludedChange: (ids: number[]) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="panel [&&]:p-[26px] [&&]:[border:1px_solid_#e0e4d9] [&&]:bg-[#fff] [&&]:rounded-[12px] [&&]:mb-[24px] [@media(max-width:760px)]:[&&]:p-[20px] generator">
      <div className="section-title [&&]:flex [&&]:gap-[12px] [&&]:items-center [&&_h2]:text-[17px] [&&_h2]:mb-[3px] [&&_p]:text-[11px] [&&_p]:m-0">
        <span className="icon-box [&&]:bg-[#f0f3e9] [&&]:p-[9px] [&&]:rounded-[9px] [&&]:flex [&&_svg]:w-[19px]">
          <Shuffle />
        </span>
        <div>
          <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
            Let’s make a plan
          </h2>
          <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
            A fresh selection. No repeats within your week.
          </p>
        </div>
      </div>
      <div className="generate-controls [&&]:grid [&&]:grid-cols-[1.3fr_1fr_1.2fr] [&&]:items-end [&&]:gap-[17px] [&&]:mt-[23px] [&&_label]:m-0 [&&_button]:min-h-[43px] [@media(max-width:760px)]:[&&]:grid-cols-[1.3fr_1fr] [@media(max-width:760px)]:[&&]:gap-[13px] [@media(max-width:760px)]:[&&_button]:[grid-column:1/-1]">
        <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
          Week starting
          <input
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
            type="date"
            value={week}
            onChange={(e) => onWeekChange(e.target.value)}
          />
        </label>
        <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
          Number of meals
          <input
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) => onCountChange(Number(e.target.value))}
          />
        </label>
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
          disabled={disabled}
          onClick={onGenerate}
        >
          <Shuffle size={18} />
          {busy ? 'Working…' : 'Pick my meals'}
        </button>
      </div>
      <details className="exclusions [&&]:[border-top:1px_solid_#edf0e6] [&&]:mt-[20px] [&&]:pt-[14px] [&&]:text-[11px]">
        <summary className="[&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] cursor-pointer">
          Leave something out{' '}
          <span className="muted [&&]:text-[#768076]">
            ({excluded.length} excluded)
          </span>
        </summary>
        <div className="checks [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:mt-[12px]">
          {meals.map((m) => (
            <label
              className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px] check [&&]:flex [&&]:gap-[9px] [&&]:items-center [&&]:m-0 [&&_input]:w-[16px] [&&_input]:h-[16px] [&&_input]:[accent-color:#31593d]"
              key={m.id}
            >
              <input
                className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
                type="checkbox"
                checked={excluded.includes(m.id)}
                onChange={(e) =>
                  onExcludedChange(
                    e.target.checked
                      ? [...excluded, m.id]
                      : excluded.filter((id) => id !== m.id),
                  )
                }
              />
              {m.name}
            </label>
          ))}
        </div>
      </details>
      <ErrorBox error={error} />
    </section>
  );
}
