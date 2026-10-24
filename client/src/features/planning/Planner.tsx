import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Snapshot } from '../../api';
import { Empty, Header } from '../../shared/ui/page';
import { CookingDetail } from '../../shared/cooking/CookingDetail';
import { monday, pretty } from './dates';
import { usePlanner } from './usePlanner';
import { PlannerHero } from './PlannerHero';
import { PlanGenerator } from './PlanGenerator';
import { WeeklyLineup } from './WeeklyLineup';
import { PlanHistory } from './PlanHistory';

/** Composes planner sections; requests and unsaved-selection transitions live in usePlanner. */
export function Planner() {
  const planner = usePlanner();
  const [view, setView] = useState<Snapshot | null>(null);
  return (
    <>
      <Header
        eyebrow="A FRESH WEEK, A LITTLE LESS GUESSWORK"
        title="What’s on the table?"
        text="Your favorites, a little shuffle, and dinner is decided."
      />
      <PlannerHero />
      <PlanGenerator
        week={planner.week}
        count={planner.count}
        meals={planner.meals}
        excluded={planner.excluded}
        busy={planner.busy}
        disabled={planner.generationDisabled}
        error={planner.error}
        onWeekChange={(value) => {
          if (value) planner.selectWeek(monday(new Date(`${value}T12:00:00`)));
        }}
        onCountChange={planner.setCount}
        onExcludedChange={planner.setExcluded}
        onGenerate={() => void planner.generate()}
      />
      <div className="section-heading [&&]:flex [&&]:justify-between [&&]:items-center [&&]:m-[34px_0_18px] [&&_.eyebrow]:text-[9px] [&&_.eyebrow]:mb-[6px] [&&_h2]:[font:25px_Georgia,_serif] [&&_h2]:m-0 [@media(max-width:760px)]:[&&_h2]:text-[23px] [@media(max-width:760px)]:[&&_>_.pill]:text-[9px]">
        <div>
          <p className="m-[0_0_12px] eyebrow [&&]:text-[#748166] [&&]:text-[10px] [&&]:tracking-[1.9px] [&&]:[font-weight:750] [&&]:mb-[12px]">
            WEEK OF {pretty(planner.week).toUpperCase()}
          </p>
          <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
            Your weekly lineup{' '}
            <span className="count [&&]:[font:11px_system-ui] [&&]:bg-[#edf1e6] [&&]:p-[4px_8px] [&&]:rounded-[50%] [&&]:[vertical-align:middle] [&&]:ml-[8px]">
              {planner.selection.length}
            </span>
          </h2>
        </div>
        <span className="pill [&&]:inline-flex [&&]:text-[10px] [&&]:[font-weight:650] [&&]:rounded-[20px] [&&]:bg-[#f4f6ed] [&&]:text-[#75845b] [&&]:p-[5px_11px] [&&]:tracking-[0.4px]">
          {planner.draft
            ? 'Unsaved preview'
            : planner.saved
              ? 'Saved plan'
              : 'Ready when you are'}
        </span>
      </div>
      {!planner.selection.length ? (
        <Empty
          title="A delicious week starts with a little shuffle"
          text={
            planner.meals.length
              ? 'Choose your meal count above, then hit Pick my meals.'
              : 'First, add recipes and build a few meals in your collection.'
          }
        />
      ) : (
        <WeeklyLineup
          selection={planner.selection}
          meals={planner.meals}
          excluded={planner.excluded}
          busy={planner.busy}
          onView={setView}
          onReroll={(index, meal) => void planner.reroll(index, meal)}
          onReplace={(index, id) => void planner.replace(index, id)}
        />
      )}
      {planner.draft && (
        <div className="save-bar [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:m-[22px_0] [&&]:flex-wrap [&&_p]:flex-1 [&&_p]:text-[12px] [&&_p]:text-[#78876b] [&&_p]:m-0 [@media(max-width:760px)]:[&&_p]:[flex-basis:100%]">
          <p className="m-[0_0_12px]">
            Looking good? Keep this week’s recipes exactly as they are.
          </p>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
            disabled={planner.busy}
            onClick={() => void planner.save()}
          >
            Save week <ArrowRight size={16} />
          </button>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            onClick={planner.discard}
          >
            Discard preview
          </button>
        </div>
      )}
      {planner.saved && (
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] text-button [&&]:[background:none] [&&]:border-0 [&&]:pl-[0] danger [&&]:text-[#a64e3f]"
          disabled={planner.busy}
          onClick={() => void planner.deleteSaved()}
        >
          Delete saved week
        </button>
      )}
      <PlanHistory plans={planner.plans} onSelect={planner.selectWeek} />
      {view && <CookingDetail meal={view} close={() => setView(null)} />}
    </>
  );
}
