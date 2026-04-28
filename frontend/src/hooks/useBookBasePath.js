import { useSegments } from 'expo-router';

export function useBookBasePath() {
  const segments = useSegments();
  return segments.includes('dashboard')
    ? '/(app)/dashboard/books'
    : '/(app)/books';
}
