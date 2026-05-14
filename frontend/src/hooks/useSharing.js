import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetSharedBooks,
  apiGetBookShares,
  apiAddCollaborator,
  apiUpdateShare,
  apiRemoveCollaborator,
  apiLeaveSharedBook,
  apiRespondToInvitation,
  apiGetReceivedInvitations,
  apiGetGivenInvitations,
} from '../lib/api';

// Remove a collaborator or cancel a pending invitation from the "Given" tab.
// Accepts { bookId, shareId } so it works across multiple books on one screen.
export const useRemoveShareByOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, shareId }) => apiRemoveCollaborator(bookId, shareId),
    onSuccess:  (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
      qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
    },
  });
};

export const useSharedBooks = () =>
  useQuery({
    queryKey:          ['shared-books'],
    queryFn:           apiGetSharedBooks,
    staleTime:         0,
    refetchOnFocus:    true,
  });

export const useBookShares = (bookId) =>
  useQuery({
    queryKey:        ['book-shares', bookId],
    queryFn:         () => apiGetBookShares(bookId),
    staleTime:       0,
    refetchOnFocus:  true,
    refetchInterval: 10000,   // poll every 10 s so accept/reject appear on owner's screen immediately
    enabled:         !!bookId,
  });

// All invitations received by the current user (all statuses)
export const useReceivedInvitations = () =>
  useQuery({
    queryKey:        ['invitations', 'received'],
    queryFn:         apiGetReceivedInvitations,
    staleTime:       0,
    refetchOnFocus:  true,
    refetchInterval: 30000,  // poll every 30 s so new invitations appear without manual refresh
  });

// All invitations sent by the current user (all books, all statuses)
export const useGivenInvitations = () =>
  useQuery({
    queryKey:       ['invitations', 'given'],
    queryFn:        apiGetGivenInvitations,
    staleTime:      0,
    refetchOnFocus: true,
    // no interval — mutations (respond, add, remove) invalidate this query directly
  });

export const useRespondToInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, shareId, action }) =>
      apiRespondToInvitation(bookId, shareId, action),
    onSuccess: (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: ['invitations', 'received'] });
      qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
      qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
      qc.invalidateQueries({ queryKey: ['shared-books'] });
    },
  });
};

export const useAddCollaborator = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiAddCollaborator(bookId, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
      qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
    },
  });
};

export const useUpdateShare = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, payload }) => apiUpdateShare(bookId, shareId, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
      qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
    },
  });
};

export const useRemoveCollaborator = (bookId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId) => apiRemoveCollaborator(bookId, shareId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
      qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
    },
  });
};

export const useLeaveSharedBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId) => apiLeaveSharedBook(bookId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['shared-books'] });
      qc.invalidateQueries({ queryKey: ['invitations', 'received'] });
    },
  });
};
