-- Migration 021: Invitation Confirmation for Book Sharing
-- Sharing is now a 2-step flow: owner sends invitation (pending),
-- recipient must accept or reject before getting access.
--
-- Status values:
--   'pending'  — invitation sent, awaiting response
--   'accepted' — recipient accepted, access is active
--   'rejected' — recipient declined, row kept so owner sees "Declined" on screen

ALTER TABLE public.book_shares
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'rejected'));

-- All shares created before this migration are treated as already accepted
UPDATE public.book_shares SET status = 'accepted';

-- Allow recipients to update their invitation status (accept / reject)
CREATE POLICY "Recipient responds to invitation"
  ON public.book_shares FOR UPDATE TO authenticated
  USING  (auth.uid() = shared_with_id)
  WITH CHECK (auth.uid() = shared_with_id);
