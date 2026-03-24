'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProfileItem } from '@/lib/api/endpoints/profiles';
import { useEndorseSkill, useRemoveSkill } from '@/hooks/queries/useSkillMutations';
import { AddSkillDialog } from './AddSkillDialog';

interface SkillSectionProps {
  skills: NonNullable<ProfileItem['skills']>;
  isOwnProfile: boolean;
}

export function SkillSection({ skills, isOwnProfile }: SkillSectionProps) {
  const [open, setOpen] = useState(false);
  const removeSkill = useRemoveSkill();
  const endorseSkill = useEndorseSkill();

  const handleRemove = async (skillId: string) => {
    try {
      await removeSkill.mutateAsync(skillId);
      toast.success('스킬을 삭제했습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '스킬 삭제에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleEndorse = async (userSkillId: string) => {
    try {
      await endorseSkill.mutateAsync({ userSkillId });
      toast.success('스킬을 추천했습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '스킬 추천에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">스킬</CardTitle>
        {isOwnProfile && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            스킬 추가
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 등록된 스킬이 없습니다.
          </p>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{skill.skillName}</span>
                  <Badge variant="outline" className="text-xs">
                    {skill.skillCategory}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-ssoo-primary"
                      style={{ width: `${(skill.proficiencyLevel / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {skill.endorsementCount} 추천
                  </span>
                </div>
              </div>
              {isOwnProfile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void handleRemove(skill.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={skill.isEndorsedByMe || endorseSkill.isPending}
                  onClick={() => void handleEndorse(skill.id)}
                >
                  {skill.isEndorsedByMe ? '추천 완료' : '추천'}
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
      <AddSkillDialog
        existingSkillIds={skills.map((skill) => skill.skillId)}
        open={open}
        onOpenChange={setOpen}
      />
    </Card>
  );
}
