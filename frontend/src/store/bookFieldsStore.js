import { create } from 'zustand';

const DEFAULT_FIELDS = {
  showCustomer:    false,
  showSupplier:    false,
  showCategory:    false,
  showPaymentMode: true,
};

export const useBookFieldsStore = create((set, get) => ({
  // { [bookId]: { showCustomer, showSupplier, showCategory, showPaymentMode } }
  fields: {},

  getFields: (bookId) => get().fields[bookId] ?? DEFAULT_FIELDS,

  setField: (bookId, field, value) =>
    set((state) => ({
      fields: {
        ...state.fields,
        [bookId]: {
          ...(state.fields[bookId] ?? DEFAULT_FIELDS),
          [field]: value,
        },
      },
    })),
}));
