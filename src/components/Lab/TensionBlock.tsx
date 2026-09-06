import type { Dispatch } from 'react';
import type { Racket } from '../../data/types';
import type { I18n } from '../../i18n/useI18n';
import type { SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { TensionSlider } from '../Slider/TensionSlider';

export function TensionBlock(props: {
  setup: SetupState;
  dispatch: Dispatch<SetupAction>;
  racket?: Racket;
  t: I18n['t'];
}): JSX.Element {
  const { setup, dispatch, racket, t } = props;

  return (
    <div className="lab-tensions lab-block">
      <div className="lab-seg">
        <button
          type="button"
          className="seg"
          aria-pressed={setup.unit === 'lb'}
          onClick={() => dispatch({ type: 'setUnit', unit: 'lb' })}
        >
          {t('unit.lb')}
        </button>
        <button
          type="button"
          className="seg"
          aria-pressed={setup.unit === 'kg'}
          onClick={() => dispatch({ type: 'setUnit', unit: 'kg' })}
        >
          {t('unit.kg')}
        </button>
      </div>

      <TensionSlider
        id="t-mains"
        label={t('lab.mainsTension')}
        valueLb={setup.mainsTension}
        unit={setup.unit}
        band={racket?.recTension ?? null}
        bandLabel={t('lab.recBand')}
        onChange={(lb) => dispatch({ type: 'setMainsTension', lb })}
      />
      <TensionSlider
        id="t-crosses"
        label={t('lab.crossesTension')}
        valueLb={setup.crossesTension}
        unit={setup.unit}
        band={racket?.recTension ?? null}
        bandLabel={t('lab.recBand')}
        onChange={(lb) => dispatch({ type: 'setCrossesTension', lb })}
      />

      <label className="lab-checkbox">
        <input
          type="checkbox"
          checked={setup.linkTensions}
          onChange={(e) => dispatch({ type: 'setLinkTensions', on: e.target.checked })}
        />
        <span>
          {t('lab.linkTensions')} <span className="muted lab-checkbox__hint">{t('lab.linkTensionsHint')}</span>
        </span>
      </label>
    </div>
  );
}
