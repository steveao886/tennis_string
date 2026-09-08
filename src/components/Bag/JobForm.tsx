import { useMemo, useState } from 'react';
import { stringBrands, stringById, strings } from '../../data';
import { TENSION_MAX, TENSION_MIN, clampTension } from '../../state/hash';
import { newId, todayISO, type StringJob } from '../../state/bag';
import { useI18n } from '../../i18n/useI18n';
import { Select, type SelectGroup } from '../Select/Select';

const DEFAULT_MAINS = 'tecnifibre-triax';

const gaugeFor = (id: string, wanted: number): number => {
  const s = stringById.get(id)!;
  return s.gauges.includes(wanted) ? wanted : s.defaultGauge;
};

/**
 * Logs one stringing. `preset` prefills from the previous job so a repeat
 * stringing is two clicks, but it always produces a new entry dated today.
 */
export function JobForm(props: {
  preset?: StringJob | null;
  onSubmit: (job: StringJob) => void;
  onCancel: () => void;
}): JSX.Element {
  const { preset, onSubmit, onCancel } = props;
  const { t } = useI18n();

  const [mainsId, setMainsId] = useState(preset?.mainsId ?? DEFAULT_MAINS);
  const [mainsGauge, setMainsGauge] = useState(preset?.mainsGauge ?? stringById.get(DEFAULT_MAINS)!.defaultGauge);
  const [crossesId, setCrossesId] = useState(preset?.crossesId ?? DEFAULT_MAINS);
  const [crossesGauge, setCrossesGauge] = useState(
    preset?.crossesGauge ?? stringById.get(DEFAULT_MAINS)!.defaultGauge,
  );
  const [mainsTension, setMainsTension] = useState(preset?.mainsTension ?? 52);
  const [crossesTension, setCrossesTension] = useState(preset?.crossesTension ?? 52);
  const [strungOn, setStrungOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [same, setSame] = useState(
    preset ? preset.mainsId === preset.crossesId && preset.mainsGauge === preset.crossesGauge : true,
  );

  const stringGroups: SelectGroup<string>[] = useMemo(
    () =>
      stringBrands.map((brand) => ({
        label: brand,
        options: strings.filter((s) => s.brand === brand).map((s) => ({ value: s.id, label: s.name })),
      })),
    [],
  );
  const gaugeGroups = (id: string): SelectGroup<number>[] => [
    { label: '', options: stringById.get(id)!.gauges.map((g) => ({ value: g, label: `${g.toFixed(2)} mm` })) },
  ];

  function pickMains(id: string) {
    setMainsId(id);
    const g = gaugeFor(id, mainsGauge);
    setMainsGauge(g);
    if (same) {
      setCrossesId(id);
      setCrossesGauge(g);
    }
  }

  function toggleSame(on: boolean) {
    setSame(on);
    if (on) {
      setCrossesId(mainsId);
      setCrossesGauge(mainsGauge);
      setCrossesTension(mainsTension);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      id: newId('job'),
      mainsId,
      mainsGauge,
      crossesId: same ? mainsId : crossesId,
      crossesGauge: same ? mainsGauge : crossesGauge,
      mainsTension: clampTension(mainsTension),
      crossesTension: clampTension(same ? mainsTension : crossesTension),
      strungOn,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  }

  return (
    <form className="bag-form" onSubmit={submit}>
      <div className="bag-form__grid">
        <Select
          id="bag-mains"
          label={t('bag.mains')}
          value={mainsId}
          onChange={pickMains}
          groups={stringGroups}
          compact
        />
        <Select
          id="bag-mains-gauge"
          label={t('bag.gauge')}
          value={mainsGauge}
          onChange={(g) => {
            setMainsGauge(g);
            if (same) setCrossesGauge(g);
          }}
          groups={gaugeGroups(mainsId)}
          compact
        />
      </div>

      <label className="bag-form__check">
        <input type="checkbox" checked={same} onChange={(e) => toggleSame(e.target.checked)} />
        <span>{t('bag.sameAsMains')}</span>
      </label>

      {!same && (
        <div className="bag-form__grid">
          <Select
            id="bag-crosses"
            label={t('bag.crosses')}
            value={crossesId}
            onChange={(id) => {
              setCrossesId(id);
              setCrossesGauge(gaugeFor(id, crossesGauge));
            }}
            groups={stringGroups}
            compact
          />
          <Select
            id="bag-crosses-gauge"
            label={t('bag.gauge')}
            value={crossesGauge}
            onChange={setCrossesGauge}
            groups={gaugeGroups(crossesId)}
            compact
          />
        </div>
      )}

      <div className="bag-form__grid">
        <label className="bag-field">
          <span className="bag-field__label">{t('bag.mainsTension')}</span>
          <input
            type="number"
            className="bag-field__input num"
            min={TENSION_MIN}
            max={TENSION_MAX}
            value={mainsTension}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMainsTension(v);
              if (same) setCrossesTension(v);
            }}
          />
        </label>
        {!same && (
          <label className="bag-field">
            <span className="bag-field__label">{t('bag.crossesTension')}</span>
            <input
              type="number"
              className="bag-field__input num"
              min={TENSION_MIN}
              max={TENSION_MAX}
              value={crossesTension}
              onChange={(e) => setCrossesTension(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      <div className="bag-form__grid">
        <label className="bag-field">
          <span className="bag-field__label">{t('bag.strungOn')}</span>
          <input
            type="date"
            className="bag-field__input num"
            value={strungOn}
            onChange={(e) => setStrungOn(e.target.value)}
            required
          />
        </label>
        <label className="bag-field">
          <span className="bag-field__label">{t('bag.note')}</span>
          <input
            type="text"
            className="bag-field__input"
            placeholder={t('bag.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

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
