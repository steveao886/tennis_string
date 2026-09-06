export type Unit = 'lb' | 'kg';
const K = 0.45359237;
export const lbToKg = (lb: number): number => lb * K;
export const kgToLb = (kg: number): number => kg / K;
export const roundHalf = (v: number): number => Math.round(v * 2) / 2;
export function formatTension(lb: number, unit: Unit): string {
  return unit === 'lb' ? `${Math.round(lb)} lb` : `${roundHalf(lbToKg(lb)).toFixed(1)} kg`;
}
