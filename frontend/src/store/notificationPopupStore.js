import { create } from 'zustand';

// Tracks the notification_id (notifications.id) that was tapped from the
// device notification tray so the popup can open for that specific item.
export const useNotificationPopupStore = create((set) => ({
  tappedId: null,
  setTappedId: (id) => set({ tappedId: id }),
  clearTappedId: () => set({ tappedId: null }),
}));
