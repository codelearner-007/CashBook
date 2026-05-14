import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Subscribes to the books table for balance updates.
// When any collaborator adds/edits/deletes an entry, the DB trigger updates books.net_balance.
// Subscribing to books (UPDATE only) gives the owner live balance refreshes on the books list.
// Apply this hook on BooksView.
export function useRealtimeBooks() {
  const qc = useQueryClient();

  useEffect(() => {
    let channel;
    try {
      channel = supabase
        .channel('books-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'books',
        }, () => {
          qc.invalidateQueries({ queryKey: ['books'] });
          qc.invalidateQueries({ queryKey: ['shared-books'] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [qc]);
}

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

// Subscribes to book row UPDATE events for a specific book.
// Delivers field-settings changes (show_customer, show_supplier, show_category, show_attachment)
// to collaborators in real time. Requires migration 025_collaborator_books_rls.sql so
// collaborators can SELECT the books row and thus receive Realtime events.
// Patches the cache directly from payload.new (no API refetch) so the toggle is instant
// for both owner and collaborators — same pattern as entry balance updates.
// Apply this hook on BookSettingsScreen.
export function useRealtimeBookSettings(bookId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bookId) return;

    let channel;
    try {
      // No server-side filter — receive all books UPDATE events the user can SELECT
      // (RLS limits delivery to owned + accepted-shared books), then check client-side.
      // This avoids the REPLICA IDENTITY requirement for server-side filter evaluation.
      channel = supabase
        .channel(`book-settings-${bookId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'books',
        }, (payload) => {
          const row = payload?.new;
          if (!row || row.id !== bookId) return;  // client-side filter
          if (row.show_customer === undefined) {
            // Fallback: field data missing from payload, force a refetch
            qc.invalidateQueries({ queryKey: ['books'] });
            qc.invalidateQueries({ queryKey: ['shared-books'] });
            return;
          }
          const patch = {
            show_customer:   row.show_customer,
            show_supplier:   row.show_supplier,
            show_category:   row.show_category,
            show_attachment: row.show_attachment,
          };
          // Patch both caches directly — no API roundtrip, instant for everyone
          qc.setQueryData(['books'], (prev) =>
            Array.isArray(prev) ? prev.map(b => b.id === bookId ? { ...b, ...patch } : b) : prev
          );
          qc.setQueryData(['shared-books'], (prev) =>
            Array.isArray(prev) ? prev.map(b => b.id === bookId ? { ...b, ...patch } : b) : prev
          );
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
          qc.invalidateQueries({ queryKey: ['categories', bookId] });
          qc.invalidateQueries({ queryKey: ['category-entries', bookId] });
          qc.invalidateQueries({ queryKey: ['customers', bookId] });
          qc.invalidateQueries({ queryKey: ['suppliers', bookId] });
          qc.invalidateQueries({ queryKey: ['customer', bookId] });
          qc.invalidateQueries({ queryKey: ['supplier', bookId] });
          qc.invalidateQueries({ queryKey: ['customer-entries', bookId] });
          qc.invalidateQueries({ queryKey: ['supplier-entries', bookId] });
          qc.invalidateQueries({ queryKey: ['payment-modes', bookId] });
          qc.invalidateQueries({ queryKey: ['report-entries', bookId] });
        })
        .subscribe();
    } catch (_) {}

    return () => { try { if (channel) supabase.removeChannel(channel); } catch (_) {} };
  }, [bookId, qc]);
}
