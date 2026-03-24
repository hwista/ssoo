import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/endpoints/profiles';
import { skillsApi } from '@/lib/api/endpoints/skills';

export function useAddSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profilesApi.addSkill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chs', 'profiles'] });
    },
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => profilesApi.removeSkill(skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chs', 'profiles'] });
    },
  });
}

export function useEndorseSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: skillsApi.endorse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chs', 'profiles'] });
    },
  });
}
