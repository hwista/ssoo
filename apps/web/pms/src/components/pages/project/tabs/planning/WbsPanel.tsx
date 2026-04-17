'use client';

import { useMemo, useState } from 'react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateWbs,
  useDeleteWbs,
  useProjectObjectives,
  useProjectWbs,
  useUpdateWbs,
} from '@/hooks/queries/useProjects';

const NO_OBJECTIVE = '__none__';
const NO_PARENT_WBS = '__none__';

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface WbsFormState {
  objectiveId: string;
  parentWbsId: string;
  wbsCode: string;
  wbsName: string;
  statusCode: string;
  description: string;
}

const INITIAL_FORM: WbsFormState = {
  objectiveId: NO_OBJECTIVE,
  parentWbsId: NO_PARENT_WBS,
  wbsCode: '',
  wbsName: '',
  statusCode: 'not_started',
  description: '',
};

interface Props {
  projectId: number;
  canManageWbs: boolean;
}

export function WbsPanel({ projectId, canManageWbs }: Props) {
  const { data: objectiveResponse } = useProjectObjectives(projectId);
  const { data: wbsResponse, isLoading } = useProjectWbs(projectId);

  const objectiveData = objectiveResponse?.data;
  const objectives = objectiveData ?? [];
  const wbsData = wbsResponse?.data;
  const wbsItems = wbsData ?? [];

  const createWbs = useCreateWbs();
  const updateWbs = useUpdateWbs();
  const deleteWbs = useDeleteWbs();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<WbsFormState>(INITIAL_FORM);

  const objectiveMap = useMemo(
    () => new Map((objectiveData ?? []).map((objective) => [String(objective.id), objective])),
    [objectiveData],
  );
  const wbsMap = useMemo(
    () => new Map((wbsData ?? []).map((wbs) => [String(wbs.id), wbs])),
    [wbsData],
  );

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowCreateDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.wbsCode.trim() || !formData.wbsName.trim()) {
      return;
    }

    await createWbs.mutateAsync({
      projectId,
      data: {
        wbsCode: formData.wbsCode,
        wbsName: formData.wbsName,
        statusCode: formData.statusCode,
        ...(formData.objectiveId !== NO_OBJECTIVE ? { objectiveId: formData.objectiveId } : {}),
        ...(formData.parentWbsId !== NO_PARENT_WBS ? { parentWbsId: formData.parentWbsId } : {}),
        ...(formData.description.trim() ? { description: formData.description } : {}),
      },
    });

    setShowCreateDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = (wbsId: string, statusCode: string) => {
    updateWbs.mutate({
      projectId,
      wbsId,
      data: { statusCode },
    });
  };

  const handleDelete = (wbsId: string) => {
    deleteWbs.mutate({ projectId, wbsId });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="h-4 w-4" />
          WBS ({wbsItems.length})
        </h4>
        {canManageWbs && (
          <Button size="sm" variant="outline" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4" />
            WBS 추가
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">WBS를 불러오는 중...</div>
      ) : wbsItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">아직 등록된 WBS가 없습니다.</div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-medium">코드</th>
                <th className="p-3 text-left font-medium">WBS명</th>
                <th className="p-3 text-left font-medium">목표</th>
                <th className="p-3 text-left font-medium">상위WBS</th>
                <th className="p-3 text-center font-medium">상태</th>
                <th className="w-10 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {wbsItems.map((wbs) => {
                const objective = wbs.objectiveId ? objectiveMap.get(String(wbs.objectiveId)) : null;
                const parentWbs = wbs.parentWbsId ? wbsMap.get(String(wbs.parentWbsId)) : null;

                return (
                  <tr key={String(wbs.id)} className="group hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs" style={{ paddingLeft: `${(wbs.depth * 16) + 12}px` }}>
                      {wbs.wbsCode}
                    </td>
                    <td className="p-3">{wbs.wbsName}</td>
                    <td className="p-3 text-muted-foreground">
                      {objective ? `${objective.objectiveCode} · ${objective.objectiveName}` : '-'}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {parentWbs ? `${parentWbs.wbsCode} · ${parentWbs.wbsName}` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Select
                        value={wbs.statusCode}
                        onValueChange={(value) => handleStatusChange(String(wbs.id), value)}
                        disabled={!canManageWbs}
                      >
                        <SelectTrigger className="mx-auto h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-center">
                      {canManageWbs && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(String(wbs.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WBS 추가</DialogTitle>
            <DialogDescription>태스크가 연결될 planning WBS를 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">코드 *</label>
                <Input
                  placeholder="예: WBS-001"
                  value={formData.wbsCode}
                  onChange={(event) => setFormData({ ...formData, wbsCode: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WBS명 *</label>
                <Input
                  placeholder="WBS명 입력"
                  value={formData.wbsName}
                  onChange={(event) => setFormData({ ...formData, wbsName: event.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">목표</label>
                <Select
                  value={formData.objectiveId}
                  onValueChange={(value) => setFormData({ ...formData, objectiveId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="없음" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OBJECTIVE}>없음</SelectItem>
                    {objectives.map((objective) => (
                      <SelectItem key={String(objective.id)} value={String(objective.id)}>
                        {objective.objectiveCode} · {objective.objectiveName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">상위WBS</label>
                <Select
                  value={formData.parentWbsId}
                  onValueChange={(value) => setFormData({ ...formData, parentWbsId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="없음" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_WBS}>없음</SelectItem>
                    {wbsItems.map((wbs) => (
                      <SelectItem key={String(wbs.id)} value={String(wbs.id)}>
                        {wbs.wbsCode} · {wbs.wbsName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">상태</label>
                <Select
                  value={formData.statusCode}
                  onValueChange={(value) => setFormData({ ...formData, statusCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                rows={3}
                placeholder="WBS 설명 (선택)"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canManageWbs || !formData.wbsCode.trim() || !formData.wbsName.trim() || createWbs.isPending}
            >
              {createWbs.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
