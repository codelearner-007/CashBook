import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetCategories, apiCreateCategory,
  apiUpdateCategory, apiDeleteCategory, apiGetCategoryEntries,
} from '../lib/api';

export const categoryKeys = {
  all:     (bookId)              => ['categories', bookId],
  entries: (bookId, categoryId) => ['category-entries', bookId, categoryId],
};

export function useCategories(bookId) {
  return useQuery({
    queryKey: categoryKeys.all(bookId),
    queryFn:  () => apiGetCategories(bookId),
    staleTime: 1000 * 60 * 2,
    enabled:  !!bookId,
  });
}

export function useCategoryEntries(bookId, categoryId) {
  return useQuery({
    queryKey: categoryKeys.entries(bookId, categoryId),
    queryFn:  () => apiGetCategoryEntries(bookId, categoryId),
    staleTime: 1000 * 60 * 2,
    enabled:  !!bookId && !!categoryId,
  });
}

export function useCreateCategory(bookId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiCreateCategory(bookId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bookId) }),
  });
}

export function useUpdateCategory(bookId, categoryId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiUpdateCategory(bookId, categoryId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bookId) }),
  });
}

export function useDeleteCategory(bookId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId) => apiDeleteCategory(bookId, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all(bookId) });
      qc.invalidateQueries({ queryKey: ['entries', bookId] });
    },
  });
}
