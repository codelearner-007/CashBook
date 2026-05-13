import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetSharedBooks,
  apiGetBookShares,
  apiAddCollaborator,
  apiUpdateShare,
  apiRemoveCollaborator,
  apiLeaveSharedBook,
} from '../lib/api';

export const useSharedBooks = () =>
  useQuery({
    queryKey:          ['shared-books'],
    queryFn:           apiGetSharedBooks,
    staleTime:         0,               // always re-check on focus so revoked access is detected promptly
    refetchOnFocus:    true,
  });

export const useBookShares = (bookId) =>
  useQuery({
    queryKey: ['book-shares', bookId],
    queryFn:  () => apiGetBookShares(bookId),
    staleTime: 1000 * 60 * 2,
    enabled:  !!bookId,
  });

export const useAddCollaborator = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiAddCollaborator(bookId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['book-shares', bookId] }),
  });
};

export const useUpdateShare = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, payload }) => apiUpdateShare(bookId, shareId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['book-shares', bookId] }),
  });
};

export const useRemoveCollaborator = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId) => apiRemoveCollaborator(bookId, shareId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['book-shares', bookId] }),
  });
};

export const useLeaveSharedBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId) => apiLeaveSharedBook(bookId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['shared-books'] }),
  });
};
