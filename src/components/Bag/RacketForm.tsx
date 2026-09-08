import { useMemo, useState } from 'react';
import { racketById, rackets } from '../../data';
import type { Racket } from '../../data/types';
import { DEFAULT_HOURS_PER_WEEK, HOURS_PER_WEEK_MAX, newId, type BagRacket } from '../../state/bag';
import { useI18n } from '../../i18n/useI18n';
import { Select, type SelectGroup } from '../Select/Select';

const BRANDS: Racket['brand'][] = ['Wilson', 'Head'];

/** Adds a racket, or edits the label and play frequency of one already in the bag. */
export function RacketForm(props: {
  initial?: BagRacket | null;
  onSubmit: (r: BagRacket) => void;
  onCancel: () => void;
}): JSX.Element {
  const { initial, onSubmit, onCancel } = props;
  const { t } = useI18n();

  const [racketId, setRacketId] = useState(initial?.racketId ?? rackets[0].id);
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [hoursPerWeek, setHoursPerWeek] = useState(initial?.hoursPerWeek ?? DEFAULT_HOURS_PER_WEEK);

  const groups: SelectGroup<string>[] = useMemo(
    () =>
      BRANDS.map((brand) => ({
        label: brand,
        options: rackets.filter((r) => r.brand === brand).map((r) => ({ value: r.id, label: r.name })),
      })),
    [],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      id: initial?.id ?? newId('rk'),
      racketId,
      nickname: nickname.trim() || racketById.get(racketId)!.name,
      hoursPerWeek: Math.min(HOURS_PER_WEEK_MAX, Math.max(0, hoursPerWeek)),
      jobs: initial?.jobs ?? [],
    });
  }

  return (
    <form className="bag-form panel" onSubmit={submit}>
      <Select
        id="bag-frame"
        label={t('bag.frame')}
        value={racketId}
        onChange={setRacketId}
        groups={groups}
        disabled={Boolean(initial)}
        compact
      />

      <div className="bag-form__grid">
        <label className="bag-field">
          <span className="bag-field__label">{t('bag.nickname')}</span>
          <input
            type="text"
            className="bag-field__input"
            placeholder={t('bag.nicknameHint')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        <label className="bag-field">
          <span className="bag-field__label">
            {t('bag.hoursPerWeek')} <span className="muted">({t('bag.hoursUnit')})</span>
          </span>
          <input
            type="number"
            className="bag-field__input num"
            min={0}
            max={HOURS_PER_WEEK_MAX}
            step={0.5}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="bag-form__hint muted">{t('bag.hoursHint')}</p>

      <div className="bag-form__actions">
        <button type="submit" className="btn btn-accent btn-sm">
          {t('bag.save')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t('bag.cancel')}
        </button>
      </div>
    </form>
  );
}
