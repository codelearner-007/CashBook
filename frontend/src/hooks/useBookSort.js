import { useState, useMemo, useCallback } from 'react';

export function useBookSort(books) {
  const [sortMode,    setSortMode]    = useState('updated'); // 'updated'|'high'|'low'|'custom'
  const [customBooks, setCustomBooks] = useState(null);       // null = not yet set
  const [showSort,    setShowSort]    = useState(false);

  const sortedBooks = useMemo(() => {
    if (sortMode === 'custom')  return customBooks ?? books;
    if (sortMode === 'high')    return [...books].sort((a, b) => (b.net_balance ?? 0) - (a.net_balance ?? 0));
    if (sortMode === 'low')     return [...books].sort((a, b) => (a.net_balance ?? 0) - (b.net_balance ?? 0));
    return books; // 'updated' — server order is already newest-first
  }, [books, sortMode, customBooks]);

  const handleSortSelect = useCallback((key) => {
    if (key === 'custom' && sortMode !== 'custom') {
      // Seed the custom list with the current sorted order
      setCustomBooks([...sortedBooks]);
    }
    if (key !== 'custom') {
      setCustomBooks(null);
    }
    setSortMode(key);
  }, [sortMode, sortedBooks]);

  const sortLabel = {
    updated: 'Last Updated',
    high:    'Highest Balance',
    low:     'Lowest Balance',
    custom:  'Custom Order',
  }[sortMode];

  return {
    sortMode,
    sortedBooks,
    showSort,
    setShowSort,
    handleSortSelect,
    setCustomBooks,
    sortLabel,
  };
}
