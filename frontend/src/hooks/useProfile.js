import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetProfile, apiUpdateProfile, apiUploadAvatar } from '../lib/api';

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

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mimeType }) => apiUploadAvatar(uri, mimeType),
    onSuccess: (data) => {
      qc.setQueryData(PROFILE_KEY, (old) =>
        old ? { ...old, avatar_url: data.avatar_url } : old
      );
    },
  });
}
