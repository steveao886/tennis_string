import { useMemo } from 'react';
import type { Attr, Attrs } from '../../data/types';
import { ATTRS } from '../../data/types';
import { useSpringValues } from '../../hooks/useSpringValues';
import './Radar.css';

const CENTER = 180;
const RADIUS = 118;
const LABEL_RADIUS = RADIUS + 20;
const LEVELS = [25, 50, 75, 100];

function angleFor(index: number): number {
  return ((-90 + index * 60) * Math.PI) / 180;
}

function pointAt(index: number, radius: number): [number, number] {
  const a = angleFor(index);
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
}

function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function ringPoints(radius: number): string {
  return ATTRS.map((_, i) => pointAt(i, radius).join(',')).join(' ');
}

function valuePoints(values: number[]): string {
  return values.map((v, i) => pointAt(i, (clamp01to100(v) / 100) * RADIUS).join(',')).join(' ');
}

export function Radar(props: { values: Attrs; labels: Record<Attr, string>; className?: string }): JSX.Element {
  const { values, labels, className } = props;
  const target = useMemo(() => ATTRS.map((k) => values[k]), [values]);
  const animated = useSpringValues(target);

  const titleText = ATTRS.map((k, i) => `${labels[k]} ${Math.round(animated[i])}`).join('\n');
  const svgClassName = ['radar', className].filter(Boolean).join(' ');

  return (
    <svg className={svgClassName} viewBox="0 0 360 360" role="img" aria-label={titleText}>
      <title>{titleText}</title>
      <defs>
        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--panel-3)" />
          <stop offset="100%" stopColor="var(--panel-3)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 4} fill="url(#radar-glow)" />

      {LEVELS.map((lvl) => (
        <polygon
          key={lvl}
          points={ringPoints((lvl / 100) * RADIUS)}
          fill="none"
          stroke={lvl === 100 ? 'var(--line-2)' : 'var(--line)'}
          strokeWidth={1}
        />
      ))}

      {ATTRS.map((k, i) => {
        const [x, y] = pointAt(i, RADIUS);
        return <line key={k} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />;
      })}

      <polygon
        points={valuePoints(animated)}
        fill="var(--accent)"
        fillOpacity={0.16}
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {animated.map((v, i) => {
        const [x, y] = pointAt(i, (clamp01to100(v) / 100) * RADIUS);
        return <circle key={ATTRS[i]} cx={x} cy={y} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />;
      })}

      {ATTRS.map((k, i) => {
        const [lx, ly] = pointAt(i, LABEL_RADIUS);
        const cos = Math.cos(angleFor(i));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g key={k}>
            <text x={lx} y={ly} textAnchor={anchor} className="radar-label">
              {labels[k]}
            </text>
            <text x={lx} y={ly + 15} textAnchor={anchor} className="radar-value num">
              {Math.round(animated[i])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
