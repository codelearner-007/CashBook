import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Subscribes to book_shares rows where the current user is the recipient.
// Any INSERT/UPDATE/DELETE instantly invalidates invitation and shared-books caches.
// Apply this hook on any screen that shows pending invite counts or shared-books lists.
export function useRealtimeInvitations(userId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let channel;
    try {
      channel = supabase
        .channel(`invitations-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'book_shares',
          filter: `shared_with_id=eq.${userId}`,
        }, () => {
          qc.invalidateQueries({ queryKey: ['invitations', 'received'] });
          qc.invalidateQueries({ queryKey: ['shared-books'] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [userId, qc]);
}

// Subscribes to book_shares rows where current user is the OWNER.
// Any accept/reject/leave by any recipient instantly refreshes the owner's given-invitations list.
// Apply this hook on ManageAccessScreen (Given tab) and ManageSharesScreen.
export function useRealtimeGivenInvitations(userId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let channel;
    try {
      channel = supabase
        .channel(`given-invitations-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'book_shares',
          filter: `owner_id=eq.${userId}`,
        }, () => {
          qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
          qc.invalidateQueries({ queryKey: ['book-shares'] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [userId, qc]);
}

// Subscribes to book_shares rows for a specific book (owner perspective).
// Any accept/reject/leave by a collaborator instantly updates the owner's collaborator list.
// Apply this hook on ManageSharesScreen.
export function useRealtimeCollaborators(bookId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bookId) return;

    let channel;
    try {
      channel = supabase
        .channel(`collaborators-${bookId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'book_shares',
          filter: `book_id=eq.${bookId}`,
        }, () => {
          qc.invalidateQueries({ queryKey: ['book-shares', bookId] });
          qc.invalidateQueries({ queryKey: ['invitations', 'given'] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [bookId, qc]);
}

// Subscribes to entries for a specific book.
// Any entry added/edited/deleted by any collaborator instantly refreshes the list for all viewers.
// Requires migration 023_collaborator_entries_rls.sql to be applied so collaborators
// can receive Supabase Realtime events (RLS must allow them to SELECT the entries rows).
// Apply this hook on BookDetailScreen.
export function useRealtimeEntries(bookId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bookId) return;

    let channel;
    try {
      channel = supabase
        .channel(`entries-${bookId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'entries',
          filter: `book_id=eq.${bookId}`,
        }, () => {
          qc.invalidateQueries({ queryKey: ['entries', bookId] });
          qc.invalidateQueries({ queryKey: ['summary', bookId] });
          qc.invalidateQueries({ queryKey: ['books'] });
          qc.invalidateQueries({ queryKey: ['shared-books'] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [bookId, qc]);
}
