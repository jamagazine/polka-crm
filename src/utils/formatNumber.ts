/**
 * Форматирует числа по правилу:
 * 1500 → 1.5к
 * 1200000 → 1.2кк
 * 840 → 840
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}кк`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}к`;
  }
  return num.toString();
}
