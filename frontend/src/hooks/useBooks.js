import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetBooks, apiCreateBook, apiDeleteBook } from '../lib/api';

const BOOKS_KEY = ['books'];

export function useBooks() {
  return useQuery({
    queryKey: BOOKS_KEY,
    queryFn: apiGetBooks,
    staleTime: 1000 * 60 * 2, // 2 min — reuse cached data
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, currency }) => apiCreateBook(name, currency),
    onSuccess: (newBook) => {
      // Optimistic: prepend new book without a full refetch
      qc.setQueryData(BOOKS_KEY, (prev = []) => [newBook, ...prev]);
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId) => apiDeleteBook(bookId),
    onSuccess: (_, bookId) => {
      qc.setQueryData(BOOKS_KEY, (prev = []) => prev.filter(b => b.id !== bookId));
    },
  });
}
