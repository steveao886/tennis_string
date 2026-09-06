import { useEffect, useRef, useState } from 'react';

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

function sameValues(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates a copy of `target` toward its current value with a critically-damped-ish
 * spring. Re-integrates every animation frame; settles (and snaps to target) once
 * velocity and position error both fall under threshold. Respects
 * prefers-reduced-motion by returning `target` verbatim, unanimated.
 */
export function useSpringValues(target: number[], opts?: SpringOptions): number[] {
  const { stiffness = 170, damping = 26, mass = 1 } = opts ?? {};

  const [values, setValues] = useState<number[]>(() => target.slice());

  const targetRef = useRef<number[]>(target.slice());
  const posRef = useRef<number[]>(target.slice());
  const velRef = useRef<number[]>(target.map(() => 0));
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const paramsRef = useRef({ stiffness, damping, mass });
  paramsRef.current = { stiffness, damping, mass };

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const changed = !sameValues(targetRef.current, target);
    targetRef.current = target.slice();

    if (reduced) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
      posRef.current = target.slice();
      velRef.current = target.map(() => 0);
      setValues(target.slice());
      return;
    }

    if (!changed) return;

    if (posRef.current.length !== target.length) {
      posRef.current = target.slice();
      velRef.current = target.map(() => 0);
    }

    if (rafRef.current != null) return; // loop already running; it will pick up the new target

    const step = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.032);
      lastTimeRef.current = time;

      const { stiffness: k, damping: d, mass: m } = paramsRef.current;
      const pos = posRef.current;
      const vel = velRef.current;
      const tgt = targetRef.current;

      const nextPos = new Array<number>(pos.length);
      const nextVel = new Array<number>(vel.length);
      let settled = true;

      for (let i = 0; i < pos.length; i++) {
        const acc = (k * (tgt[i] - pos[i]) - d * vel[i]) / m;
        const v = vel[i] + acc * dt;
        const p = pos[i] + v * dt;
        nextVel[i] = v;
        nextPos[i] = p;
        if (Math.abs(v) >= 0.01 || Math.abs(tgt[i] - p) >= 0.05) settled = false;
      }

      posRef.current = nextPos;
      velRef.current = nextVel;

      if (settled) {
        posRef.current = tgt.slice();
        velRef.current = tgt.map(() => 0);
        setValues(tgt.slice());
        rafRef.current = null;
        lastTimeRef.current = null;
        return;
      }

      setValues(nextPos);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return values;
}
