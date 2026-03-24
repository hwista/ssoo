'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSkills } from '@/hooks/queries/useSearch';
import { useAddSkill } from '@/hooks/queries/useSkillMutations';

interface AddSkillDialogProps {
  existingSkillIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSkillDialog({
  existingSkillIds,
  open,
  onOpenChange,
}: AddSkillDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const skillsQuery = useSkills();
  const addSkill = useAddSkill();

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (skillsQuery.data?.data?.data ?? []).filter((skill) => {
      if (existingSkillIds.includes(skill.id)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return (
        skill.skillName.toLowerCase().includes(normalized) ||
        skill.skillCategory.toLowerCase().includes(normalized)
      );
    });
  }, [existingSkillIds, query, skillsQuery.data?.data?.data]);

  const handleSubmit = async () => {
    if (!selectedSkillId) {
      toast.error('추가할 스킬을 선택하세요.');
      return;
    }

    try {
      await addSkill.mutateAsync({ skillId: selectedSkillId });
      toast.success('스킬을 추가했습니다.');
      setSelectedSkillId(null);
      setQuery('');
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '스킬 추가에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>스킬 추가</DialogTitle>
          <DialogDescription>
            검색 후 추가할 스킬을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="스킬 또는 카테고리 검색"
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-72 pr-3">
          <div className="space-y-2">
            {filteredSkills.map((skill) => {
              const selected = selectedSkillId === skill.id;
              return (
                <button
                  key={skill.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    selected ? 'border-ssoo-primary bg-ssoo-content-bg' : 'hover:bg-ssoo-content-bg'
                  }`}
                  onClick={() => setSelectedSkillId(skill.id)}
                >
                  <div>
                    <p className="text-sm font-semibold">{skill.skillName}</p>
                    <p className="text-xs text-muted-foreground">
                      {skill.description || '설명 없음'}
                    </p>
                  </div>
                  <Badge variant="outline">{skill.skillCategory}</Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={addSkill.isPending}>
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
