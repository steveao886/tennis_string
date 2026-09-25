import { useState, type Dispatch } from 'react';
import type { SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useBag, type BagFileStatus } from '../../state/useBag';
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
  const [rackets, setRackets, file] = useBag();
  const [adding, setAdding] = useState(false);
  // In dev the file replaces whatever localStorage had; hide the old bag until it lands.
  const loading = file.kind === 'loading';
  const shown = loading ? [] : rackets;

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

      <BagNote file={file} />

      {shown.length === 0 && !adding && !loading && <p className="bag-blank muted">{t('bag.empty')}</p>}

      <div className="bag-grid">
        {shown.map((r, i) => (
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

/** The note above the grid says where the bag is coming from, and whether it is being saved. */
function BagNote({ file }: { file: BagFileStatus }): JSX.Element | null {
  const { t } = useI18n();
  const text =
    file.kind === 'off'
      ? t('bag.seedNote')
      : file.kind === 'synced'
        ? t('bag.fileSynced')
        : file.kind === 'unreadable'
          ? t('bag.fileUnreadable')
          : file.kind === 'partial'
            ? t('bag.filePartial', { n: file.dropped })
            : file.kind === 'failed'
              ? t('bag.fileFailed')
              : null;
  if (!text) return null;

  const info = file.kind === 'synced';
  return (
    <div className={info ? 'bag-note bag-note--info' : 'bag-note'}>
      <span className="bag-note__icon">{info ? 'i' : '!'}</span>
      <p>{text}</p>
    </div>
  );
}
