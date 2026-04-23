/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return ''
  const digits = phone.toString().replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 11) {
    return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
  }
  return phone.trim()
}

// Add any other utility functions here
