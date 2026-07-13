import { useSettingsStore } from '../store/settings.store';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function useThemeColors() {
  const colorPrimary = useSettingsStore((s) => s.settings.colorPrimary);
  const [h, s] = hexToHsl(colorPrimary);

  return {
    primary50: hslToHex(h, s, 96),
    primary100: hslToHex(h, s, 90),
    primary200: hslToHex(h, s, 80),
    primary300: hslToHex(h, s, 70),
    primary400: hslToHex(h, s, 60),
    primary500: hslToHex(h, s, 50),
    primary600: hslToHex(h, s, 40),
    primary700: hslToHex(h, s, 33),
    primary800: hslToHex(h, s, 26),
    primary900: hslToHex(h, s, 20),
  };
}
