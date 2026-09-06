import type { L10n } from '../data/types';
import { effectiveTension, type BedInput } from './stringbed';

export type Tone = 'warn' | 'tip' | 'info';
export interface Insight { id: string; tone: Tone; text: L10n }

const isPoly = (m: string) => m === 'poly';
const isSoft = (m: string) => m === 'natural-gut' || m === 'multifilament';
const order: Record<Tone, number> = { warn: 0, tip: 1, info: 2 };

export function buildInsights(i: BedInput): Insight[] {
  const out: Insight[] = [];
  const { mains, crosses, mainsTension: mt, crossesTension: ct, racket } = i;

  if (mt > mains.refTension[1]) out.push({ id: 'mains-high', tone: 'warn', text: {
    zh: `竖线 ${mt} 磅已高于 ${mains.name} 的舒适区（${mains.refTension[0]}–${mains.refTension[1]} 磅）：控制更锐，但手感更硬、力量下降。建议降 2–4 磅试试。`,
    en: `Mains at ${mt} lb sit above ${mains.name}'s comfort zone (${mains.refTension[0]}–${mains.refTension[1]} lb): crisper control, harsher feel, less free power. Try dropping 2–4 lb.` } });
  else if (mt < mains.refTension[0]) out.push({ id: 'mains-low', tone: 'tip', text: {
    zh: `竖线 ${mt} 磅低于 ${mains.name} 的常用区间（${mains.refTension[0]}–${mains.refTension[1]} 磅）：更多弹力和舒适，但控制和线床稳定性会打折。`,
    en: `Mains at ${mt} lb are below ${mains.name}'s usual range (${mains.refTension[0]}–${mains.refTension[1]} lb): more pop and comfort, less control and string-bed stability.` } });

  if (ct > crosses.refTension[1]) out.push({ id: 'crosses-high', tone: 'warn', text: {
    zh: `横线 ${ct} 磅高于 ${crosses.name} 的舒适区（${crosses.refTension[0]}–${crosses.refTension[1]} 磅），线床会偏硬。`,
    en: `Crosses at ${ct} lb are above ${crosses.name}'s comfort zone (${crosses.refTension[0]}–${crosses.refTension[1]} lb); the bed will feel boardy.` } });
  else if (ct < crosses.refTension[0]) out.push({ id: 'crosses-low', tone: 'tip', text: {
    zh: `横线 ${ct} 磅低于 ${crosses.name} 的常用区间，会让线床更软、更有弹力。`,
    en: `Crosses at ${ct} lb are below ${crosses.name}'s usual range, softening the bed and adding pop.` } });

  if (ct > mt) out.push({ id: 'crosses-tighter', tone: 'info', text: {
    zh: '横线磅数高于竖线并不常见：通常横线低 2–4 磅让线床更圆润，你这样穿会更硬更直接。',
    en: 'Crosses tighter than mains is unusual: crosses are normally 2–4 lb lower for a rounder feel. This bed will play firmer and more direct.' } });
  else if (mt - ct >= 6) out.push({ id: 'big-differential', tone: 'info', text: {
    zh: `竖横磅差 ${mt - ct} 磅偏大：线床更软、甜区感觉更大，但竖线会更容易走线。`,
    en: `A ${mt - ct} lb mains/crosses differential is on the large side: softer bed and a bigger-feeling sweet spot, but the mains will move more.` } });

  if (isPoly(mains.material) && isPoly(crosses.material)) out.push({ id: 'full-poly', tone: 'info', text: {
    zh: '全聚酯线床：控制和旋转最强，但掉磅快，手感一般 10–15 小时后明显变差，建议按时换线。',
    en: 'Full poly bed: maximum control and spin, but tension drops fast; feel usually goes off after 10–15 hours, so restring on schedule.' } });
  else if (isPoly(mains.material) && isSoft(crosses.material)) out.push({ id: 'hybrid-poly-gut', tone: 'info', text: {
    zh: `竖线聚酯、横线${crosses.material === 'natural-gut' ? '天然肠' : '多芯'}：竖线主导，保留旋转和控制，横线补回舒适和弹力，是职业球员最常见的混穿方式。`,
    en: `Poly mains with ${crosses.material === 'natural-gut' ? 'natural gut' : 'multifilament'} crosses: mains dominate, keeping spin and control while the crosses give back comfort and pop. The most common pro hybrid.` } });
  else if (isSoft(mains.material) && isPoly(crosses.material)) out.push({ id: 'hybrid-gut-poly', tone: 'info', text: {
    zh: `竖线${mains.material === 'natural-gut' ? '天然肠' : '多芯'}、横线聚酯：费德勒式混穿，手感和力量最大化，聚酯横线负责收一点控制和耐久。`,
    en: `${mains.material === 'natural-gut' ? 'Gut' : 'Multi'} mains with poly crosses: the Federer-style hybrid, maximising feel and power while the poly crosses add some control and durability.` } });

  if (racket) {
    const T = effectiveTension(i);
    if (T > racket.recTension[1] || T < racket.recTension[0]) out.push({ id: 'racket-band', tone: 'warn', text: {
      zh: `当前有效磅数约 ${Math.round(T)} 磅，超出 ${racket.name} 的推荐区间 ${racket.recTension[0]}–${racket.recTension[1]} 磅。`,
      en: `Effective tension is about ${Math.round(T)} lb, outside ${racket.name}'s recommended ${racket.recTension[0]}–${racket.recTension[1]} lb band.` } });
    const open = racket.pattern[0] === 16 && racket.pattern[1] <= 19;
    if (open && mains.shape !== 'round') out.push({ id: 'spin-combo', tone: 'tip', text: {
      zh: `${racket.name} 的开放线床配 ${mains.name} 这类多棱/纹理线，是旋转最大化的组合。`,
      en: `${racket.name}'s open pattern with a shaped/textured mains like ${mains.name} is a spin-maximising combination.` } });
    if (racket.pattern[0] === 18 && isPoly(mains.material) && mt >= 56) out.push({ id: 'dense-stiff-high', tone: 'warn', text: {
      zh: '18x20 密线床 + 聚酯 + 高磅：控制极好，但对手臂不友好。若有肘部不适，先降磅或换软一点的聚酯。',
      en: '18x20 pattern + poly + high tension: superb control but hard on the arm. If your elbow complains, drop tension or move to a softer poly first.' } });
  }

  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 5);
}
