import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetProfile, apiUpdateProfile } from '../lib/api';

const PROFILE_KEY = ['profile'];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: apiGetProfile,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiUpdateProfile(payload),
    onSuccess: (updated) => {
      qc.setQueryData(PROFILE_KEY, updated);
    },
  });
}
