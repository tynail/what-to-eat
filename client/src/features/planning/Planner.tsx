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
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            WEEK OF {pretty(planner.week).toUpperCase()}
          </p>
          <h2>
            Your weekly lineup{' '}
            <span className="count">{planner.selection.length}</span>
          </h2>
        </div>
        <span className="pill">
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
        <div className="save-bar">
          <p>Looking good? Keep this week’s recipes exactly as they are.</p>
          <button
            className="primary"
            disabled={planner.busy}
            onClick={() => void planner.save()}
          >
            Save week <ArrowRight size={16} />
          </button>
          <button onClick={planner.discard}>Discard preview</button>
        </div>
      )}
      {planner.saved && (
        <button
          className="text-button danger"
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
