import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGBP(amount: number): string {
  return amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}
