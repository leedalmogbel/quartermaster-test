import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatRoas(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}x`;
}

/** Return green/red class based on whether value meets or exceeds target */
export function getBenchmarkColor(
  value: number,
  target: number,
  min?: number | null,
  higherIsBetter = true
): string {
  if (higherIsBetter) {
    if (value >= target) return "text-green-600 dark:text-green-400";
    if (min != null && value >= min) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  } else {
    // Lower is better (e.g. overhead %)
    if (value <= target) return "text-green-600 dark:text-green-400";
    if (min != null && value <= min) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
}
