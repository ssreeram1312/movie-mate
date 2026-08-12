import { useState, useEffect } from 'react'

/**
 * Debounce hook — delays a value update until the user stops changing it.
 * Used for TMDB search: fires API call 300ms after user stops typing.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Milliseconds to wait (default 300ms)
 * @returns The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
