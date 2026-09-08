import { useState, type Dispatch } from 'react';
import type { SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useBag } from '../../state/useBag';
import {
  addJob,
  addRacket,
  removeJob,
  removeRacket,
  updateRacket,
  type BagRacket,
  type StringJob,
} from '../../state/bag';
import { useI18n } from '../../i18n/useI18n';
import { useToast } from '../Toast/Toast';
import { BagCard } from './BagCard';
import { RacketForm } from './RacketForm';
import './Bag.css';

export function Bag(props: {
  setup: SetupState;
  dispatch: Dispatch<SetupAction>;
  onGoLab: () => void;
}): JSX.Element {
  const { setup, dispatch, onGoLab } = props;
  const { t } = useI18n();
  const { show } = useToast();
  const [rackets, setRackets] = useBag();
  const [adding, setAdding] = useState(false);

  function handleLoad(racket: BagRacket, job: StringJob) {
    dispatch({ type: 'loadJob', racketId: racket.racketId, job });
    show(t('toast.loadedJob', { name: racket.nickname }));
    onGoLab();
  }

  function handleAddJob(racket: BagRacket, job: StringJob) {
    setRackets((list) => addJob(list, racket.id, job));
    show(t('toast.savedJob', { name: racket.nickname }));
  }

  return (
    <section>
      <div className="section-head">
        <h2>{t('bag.title')}</h2>
        <p>{t('bag.subtitle')}</p>
      </div>

      <div className="bag-note">
        <span className="bag-note__icon">!</span>
        <p>{t('bag.seedNote')}</p>
      </div>

      {rackets.length === 0 && !adding && <p className="bag-blank muted">{t('bag.empty')}</p>}

      <div className="bag-grid">
        {rackets.map((r, i) => (
          <BagCard
            key={r.id}
            racket={r}
            unit={setup.unit}
            index={i}
            onUpdate={(next) =>
              setRackets((list) =>
                updateRacket(list, next.id, {
                  racketId: next.racketId,
                  nickname: next.nickname,
                  hoursPerWeek: next.hoursPerWeek,
                }),
              )
            }
            onRemove={() => setRackets((list) => removeRacket(list, r.id))}
            onAddJob={(job) => handleAddJob(r, job)}
            onRemoveJob={(jobId) => setRackets((list) => removeJob(list, r.id, jobId))}
            onLoad={(job) => handleLoad(r, job)}
          />
        ))}
      </div>

      {adding ? (
        <div className="bag-add">
          <RacketForm
            onSubmit={(r) => {
              setRackets((list) => addRacket(list, r));
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <div className="bag-add">
          <button type="button" className="btn btn-accent" onClick={() => setAdding(true)}>
            {t('bag.addRacket')}
          </button>
        </div>
      )}
    </section>
  );
}
