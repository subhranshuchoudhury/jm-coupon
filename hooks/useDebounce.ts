// useDebounce.ts
import { useState, useEffect } from 'react';

// Custom hook to debounce a value
export default function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cancel the timeout if value changes (or component unmounts)
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}