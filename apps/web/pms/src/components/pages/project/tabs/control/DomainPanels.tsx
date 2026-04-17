'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  FileWarning,
  GitCompareArrows,
  ListChecks,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  useProjectControlIssues,
  useCreateProjectIssue,
  useUpdateProjectIssue,
  useDeleteProjectIssue,
  useProjectRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useProjectRisks,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useProjectChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useDeleteChangeRequest,
  useProjectEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@/hooks/queries/useProjects';
import type {
  ProjectIssueItem,
  ProjectRequirementItem,
  ProjectRiskItem,
  ProjectChangeRequestItem,
  ProjectEventItem,
} from '@/lib/api/endpoints/projects';
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
import { EventRollupSummary } from '../EventRollupSummary';

const PRIORITY_LABELS: Record<string, string> = {
  critical: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

const PROJECT_ISSUE_STATUS_LABELS: Record<string, string> = {
  open: '등록',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
  deferred: '보류',
};

const PROJECT_ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: '버그',
  impediment: '장애',
  inquiry: '문의',
  improvement: '개선',
};

const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  open: '열림',
  in_progress: '진행중',
  done: '완료',
  closed: '종료',
};

const RISK_STATUS_LABELS: Record<string, string> = {
  identified: '식별',
  monitoring: '모니터링',
  mitigated: '대응완료',
  closed: '종결',
};

const CHANGE_STATUS_LABELS: Record<string, string> = {
  requested: '요청',
  reviewing: '검토중',
  approved: '승인',
  rejected: '반려',
  implemented: '반영완료',
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  planned: '예정',
  completed: '완료',
  cancelled: '취소',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  general: '일반',
  meeting: '미팅',
  report: '보고',
  review: '검토',
  handoff: '인계',
};

const SCALE_LABELS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const INITIAL_PROJECT_ISSUE_FORM = {
  issueCode: '',
  issueTitle: '',
  issueTypeCode: 'bug',
  statusCode: 'open',
  priorityCode: 'normal',
  description: '',
};

const INITIAL_REQUIREMENT_FORM = {
  requirementCode: '',
  requirementTitle: '',
  statusCode: 'open',
  priorityCode: 'normal',
  description: '',
};

const INITIAL_RISK_FORM = {
  riskCode: '',
  riskTitle: '',
  statusCode: 'identified',
  impactCode: 'medium',
  likelihoodCode: 'medium',
  description: '',
  responsePlan: '',
};

const INITIAL_CHANGE_FORM = {
  changeCode: '',
  changeTitle: '',
  statusCode: 'requested',
  priorityCode: 'normal',
  description: '',
};

const INITIAL_EVENT_FORM = {
  eventCode: '',
  eventName: '',
  eventTypeCode: 'general',
  statusCode: 'planned',
  scheduledAt: '',
  summary: '',
};

interface PanelFrameProps {
  title: string;
  description?: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  canManage: boolean;
  createLabel: string;
  onCreateClick: () => void;
  children: React.ReactNode;
}

function PanelFrame({
  title,
  description,
  count,
  icon: Icon,
  canManage,
  createLabel,
  onCreateClick,
  children,
}: PanelFrameProps) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {title} ({count})
          </h4>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={onCreateClick}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface ControlDomainPanelsProps {
  projectId: number;
  canManage: boolean;
}

export function ControlDomainPanels({ projectId, canManage }: ControlDomainPanelsProps) {
  const { data: projectIssueResponse, isLoading: isProjectIssueLoading } =
    useProjectControlIssues(projectId);
  const { data: requirementResponse, isLoading: isRequirementLoading } =
    useProjectRequirements(projectId);
  const { data: riskResponse, isLoading: isRiskLoading } = useProjectRisks(projectId);
  const { data: changeResponse, isLoading: isChangeLoading } =
    useProjectChangeRequests(projectId);
  const { data: eventResponse, isLoading: isEventLoading } = useProjectEvents(projectId);

  const requirements = requirementResponse?.data ?? [];
  const risks = riskResponse?.data ?? [];
  const changeRequests = changeResponse?.data ?? [];
  const events = eventResponse?.data ?? [];
  const projectIssues = projectIssueResponse?.data ?? [];

  const createProjectIssue = useCreateProjectIssue();
  const updateProjectIssue = useUpdateProjectIssue();
  const deleteProjectIssue = useDeleteProjectIssue();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();
  const deleteRequirement = useDeleteRequirement();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();
  const createChangeRequest = useCreateChangeRequest();
  const updateChangeRequest = useUpdateChangeRequest();
  const deleteChangeRequest = useDeleteChangeRequest();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [showProjectIssueDialog, setShowProjectIssueDialog] = useState(false);
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const [projectIssueForm, setProjectIssueForm] = useState(INITIAL_PROJECT_ISSUE_FORM);
  const [requirementForm, setRequirementForm] = useState(INITIAL_REQUIREMENT_FORM);
  const [riskForm, setRiskForm] = useState(INITIAL_RISK_FORM);
  const [changeForm, setChangeForm] = useState(INITIAL_CHANGE_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);

  const handleCreateProjectIssue = async () => {
    await createProjectIssue.mutateAsync({
      projectId,
      data: {
        issueCode: projectIssueForm.issueCode,
        issueTitle: projectIssueForm.issueTitle,
        issueTypeCode: projectIssueForm.issueTypeCode,
        statusCode: projectIssueForm.statusCode,
        priorityCode: projectIssueForm.priorityCode,
        description: projectIssueForm.description || undefined,
      },
    });
    setProjectIssueForm(INITIAL_PROJECT_ISSUE_FORM);
    setShowProjectIssueDialog(false);
  };

  const handleCreateRequirement = async () => {
    await createRequirement.mutateAsync({
      projectId,
      data: {
        requirementCode: requirementForm.requirementCode,
        requirementTitle: requirementForm.requirementTitle,
        statusCode: requirementForm.statusCode,
        priorityCode: requirementForm.priorityCode,
        description: requirementForm.description || undefined,
      },
    });
    setRequirementForm(INITIAL_REQUIREMENT_FORM);
    setShowRequirementDialog(false);
  };

  const handleCreateRisk = async () => {
    await createRisk.mutateAsync({
      projectId,
      data: {
        riskCode: riskForm.riskCode,
        riskTitle: riskForm.riskTitle,
        statusCode: riskForm.statusCode,
        impactCode: riskForm.impactCode,
        likelihoodCode: riskForm.likelihoodCode,
        description: riskForm.description || undefined,
        responsePlan: riskForm.responsePlan || undefined,
      },
    });
    setRiskForm(INITIAL_RISK_FORM);
    setShowRiskDialog(false);
  };

  const handleCreateChange = async () => {
    await createChangeRequest.mutateAsync({
      projectId,
      data: {
        changeCode: changeForm.changeCode,
        changeTitle: changeForm.changeTitle,
        statusCode: changeForm.statusCode,
        priorityCode: changeForm.priorityCode,
        description: changeForm.description || undefined,
      },
    });
    setChangeForm(INITIAL_CHANGE_FORM);
    setShowChangeDialog(false);
  };

  const handleCreateEvent = async () => {
    await createEvent.mutateAsync({
      projectId,
      data: {
        eventCode: eventForm.eventCode,
        eventName: eventForm.eventName,
        eventTypeCode: eventForm.eventTypeCode,
        statusCode: eventForm.statusCode,
        scheduledAt: eventForm.scheduledAt || undefined,
        summary: eventForm.summary || undefined,
      },
    });
    setEventForm(INITIAL_EVENT_FORM);
    setShowEventDialog(false);
  };

  const renderProjectIssueTable = (items: ProjectIssueItem[]) => {
    if (isProjectIssueLoading) {
      return <div className="text-sm text-muted-foreground">정식 이슈를 불러오는 중...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">등록된 정식 이슈가 없습니다.</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">코드</th>
              <th className="p-3 text-left font-medium">제목</th>
              <th className="p-3 text-center font-medium">유형</th>
              <th className="p-3 text-center font-medium">상태</th>
              <th className="p-3 text-center font-medium">우선순위</th>
              <th className="p-3 text-center font-medium w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={String(item.projectIssueId)} className="hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{item.issueCode}</td>
                <td className="p-3">{item.issueTitle}</td>
                <td className="p-3 text-center text-xs">
                  {PROJECT_ISSUE_TYPE_LABELS[item.issueTypeCode] || item.issueTypeCode}
                </td>
                <td className="p-3 text-center">
                  <Select
                    value={item.statusCode}
                    onValueChange={(statusCode) =>
                      updateProjectIssue.mutateAsync({
                        projectId,
                        projectIssueId: String(item.projectIssueId),
                        data: { statusCode },
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="mx-auto h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_ISSUE_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center text-xs">
                  {PRIORITY_LABELS[item.priorityCode] || item.priorityCode}
                </td>
                <td className="p-3 text-center">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteProjectIssue.mutateAsync({
                          projectId,
                          projectIssueId: String(item.projectIssueId),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRequirementTable = (items: ProjectRequirementItem[]) => {
    if (isRequirementLoading) {
      return <div className="text-sm text-muted-foreground">요구사항을 불러오는 중...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">등록된 요구사항이 없습니다.</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">코드</th>
              <th className="p-3 text-left font-medium">제목</th>
              <th className="p-3 text-center font-medium">상태</th>
              <th className="p-3 text-center font-medium">우선순위</th>
              <th className="p-3 text-center font-medium w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={String(item.requirementId)} className="hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{item.requirementCode}</td>
                <td className="p-3">{item.requirementTitle}</td>
                <td className="p-3 text-center">
                  <Select
                    value={item.statusCode}
                    onValueChange={(statusCode) =>
                      updateRequirement.mutateAsync({
                        projectId,
                        requirementId: String(item.requirementId),
                        data: { statusCode },
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="mx-auto h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUIREMENT_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center text-xs">
                  {PRIORITY_LABELS[item.priorityCode] || item.priorityCode}
                </td>
                <td className="p-3 text-center">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteRequirement.mutateAsync({
                          projectId,
                          requirementId: String(item.requirementId),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRiskTable = (items: ProjectRiskItem[]) => {
    if (isRiskLoading) {
      return <div className="text-sm text-muted-foreground">리스크를 불러오는 중...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">등록된 리스크가 없습니다.</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">코드</th>
              <th className="p-3 text-left font-medium">제목</th>
              <th className="p-3 text-center font-medium">상태</th>
              <th className="p-3 text-center font-medium">영향/가능성</th>
              <th className="p-3 text-center font-medium w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={String(item.riskId)} className="hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{item.riskCode}</td>
                <td className="p-3">{item.riskTitle}</td>
                <td className="p-3 text-center">
                  <Select
                    value={item.statusCode}
                    onValueChange={(statusCode) =>
                      updateRisk.mutateAsync({
                        projectId,
                        riskId: String(item.riskId),
                        data: { statusCode },
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="mx-auto h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RISK_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center text-xs">
                  {`${SCALE_LABELS[item.impactCode] || item.impactCode} / ${SCALE_LABELS[item.likelihoodCode] || item.likelihoodCode}`}
                </td>
                <td className="p-3 text-center">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteRisk.mutateAsync({
                          projectId,
                          riskId: String(item.riskId),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChangeTable = (items: ProjectChangeRequestItem[]) => {
    if (isChangeLoading) {
      return <div className="text-sm text-muted-foreground">변경요청을 불러오는 중...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">등록된 변경요청이 없습니다.</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">코드</th>
              <th className="p-3 text-left font-medium">제목</th>
              <th className="p-3 text-center font-medium">상태</th>
              <th className="p-3 text-center font-medium">우선순위</th>
              <th className="p-3 text-center font-medium w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={String(item.changeRequestId)} className="hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{item.changeCode}</td>
                <td className="p-3">{item.changeTitle}</td>
                <td className="p-3 text-center">
                  <Select
                    value={item.statusCode}
                    onValueChange={(statusCode) =>
                      updateChangeRequest.mutateAsync({
                        projectId,
                        changeRequestId: String(item.changeRequestId),
                        data: { statusCode },
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="mx-auto h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANGE_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center text-xs">
                  {PRIORITY_LABELS[item.priorityCode] || item.priorityCode}
                </td>
                <td className="p-3 text-center">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteChangeRequest.mutateAsync({
                          projectId,
                          changeRequestId: String(item.changeRequestId),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEventTable = (items: ProjectEventItem[]) => {
    if (isEventLoading) {
      return <div className="text-sm text-muted-foreground">이벤트를 불러오는 중...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">등록된 이벤트가 없습니다.</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">코드</th>
              <th className="p-3 text-left font-medium">이벤트</th>
              <th className="p-3 text-center font-medium">유형</th>
              <th className="p-3 text-center font-medium">상태</th>
              <th className="p-3 text-center font-medium w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={String(item.eventId)} className="hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{item.eventCode}</td>
                <td className="p-3">
                  <div>{item.eventName}</div>
                  {item.summary && (
                    <div className="mt-1 text-xs text-muted-foreground">{item.summary}</div>
                  )}
                  <EventRollupSummary
                    rollup={item.rollup}
                    className="mt-2"
                    showByStatus
                  />
                </td>
                <td className="p-3 text-center text-xs">
                  {EVENT_TYPE_LABELS[item.eventTypeCode] || item.eventTypeCode}
                </td>
                <td className="p-3 text-center">
                  <Select
                    value={item.statusCode}
                    onValueChange={(statusCode) =>
                      updateEvent.mutateAsync({
                        projectId,
                        eventId: String(item.eventId),
                        data: { statusCode },
                      })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="mx-auto h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteEvent.mutateAsync({
                          projectId,
                          eventId: String(item.eventId),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PanelFrame
        title="이슈"
        description="버그 · 장애 · 문의 · 개선의 정식 등록 경로"
        count={projectIssues.length}
        icon={AlertCircle}
        canManage={canManage}
        createLabel="이슈 등록"
        onCreateClick={() => setShowProjectIssueDialog(true)}
      >
        {renderProjectIssueTable(projectIssues)}
      </PanelFrame>

      <PanelFrame
        title="요구사항"
        count={requirements.length}
        icon={ListChecks}
        canManage={canManage}
        createLabel="요구사항 등록"
        onCreateClick={() => setShowRequirementDialog(true)}
      >
        {renderRequirementTable(requirements)}
      </PanelFrame>

      <PanelFrame
        title="리스크"
        count={risks.length}
        icon={FileWarning}
        canManage={canManage}
        createLabel="리스크 등록"
        onCreateClick={() => setShowRiskDialog(true)}
      >
        {renderRiskTable(risks)}
      </PanelFrame>

      <PanelFrame
        title="변경요청"
        count={changeRequests.length}
        icon={GitCompareArrows}
        canManage={canManage}
        createLabel="변경요청 등록"
        onCreateClick={() => setShowChangeDialog(true)}
      >
        {renderChangeTable(changeRequests)}
      </PanelFrame>

      <PanelFrame
        title="이벤트"
        description="연결 산출물 · 종료조건 요약 포함"
        count={events.length}
        icon={CalendarDays}
        canManage={canManage}
        createLabel="이벤트 등록"
        onCreateClick={() => setShowEventDialog(true)}
      >
        {renderEventTable(events)}
      </PanelFrame>

      <Dialog open={showProjectIssueDialog} onOpenChange={setShowProjectIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이슈 등록</DialogTitle>
            <DialogDescription>
              버그 · 장애 · 문의 · 개선은 이 정식 이슈 패널에서 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="예: PI-001"
              value={projectIssueForm.issueCode}
              onChange={(event) =>
                setProjectIssueForm({ ...projectIssueForm, issueCode: event.target.value })
              }
            />
            <Input
              placeholder="이슈 제목"
              value={projectIssueForm.issueTitle}
              onChange={(event) =>
                setProjectIssueForm({ ...projectIssueForm, issueTitle: event.target.value })
              }
            />
            <div className="grid grid-cols-3 gap-4">
              <Select
                value={projectIssueForm.issueTypeCode}
                onValueChange={(value) =>
                  setProjectIssueForm({ ...projectIssueForm, issueTypeCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_ISSUE_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={projectIssueForm.statusCode}
                onValueChange={(value) =>
                  setProjectIssueForm({ ...projectIssueForm, statusCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_ISSUE_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={projectIssueForm.priorityCode}
                onValueChange={(value) =>
                  setProjectIssueForm({ ...projectIssueForm, priorityCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="이슈 설명"
              rows={3}
              value={projectIssueForm.description}
              onChange={(event) =>
                setProjectIssueForm({ ...projectIssueForm, description: event.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectIssueDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateProjectIssue}
              disabled={
                !projectIssueForm.issueCode.trim()
                || !projectIssueForm.issueTitle.trim()
                || createProjectIssue.isPending
              }
            >
              {createProjectIssue.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRequirementDialog} onOpenChange={setShowRequirementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>요구사항 등록</DialogTitle>
            <DialogDescription>프로젝트 요구사항을 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="예: REQ-001"
              value={requirementForm.requirementCode}
              onChange={(event) =>
                setRequirementForm({ ...requirementForm, requirementCode: event.target.value })
              }
            />
            <Input
              placeholder="요구사항 제목"
              value={requirementForm.requirementTitle}
              onChange={(event) =>
                setRequirementForm({ ...requirementForm, requirementTitle: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={requirementForm.statusCode}
                onValueChange={(value) => setRequirementForm({ ...requirementForm, statusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUIREMENT_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={requirementForm.priorityCode}
                onValueChange={(value) =>
                  setRequirementForm({ ...requirementForm, priorityCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="요구사항 설명"
              rows={3}
              value={requirementForm.description}
              onChange={(event) =>
                setRequirementForm({ ...requirementForm, description: event.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequirementDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateRequirement}
              disabled={
                !requirementForm.requirementCode.trim()
                || !requirementForm.requirementTitle.trim()
                || createRequirement.isPending
              }
            >
              {createRequirement.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리스크 등록</DialogTitle>
            <DialogDescription>프로젝트 리스크를 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="예: RSK-001"
              value={riskForm.riskCode}
              onChange={(event) => setRiskForm({ ...riskForm, riskCode: event.target.value })}
            />
            <Input
              placeholder="리스크 제목"
              value={riskForm.riskTitle}
              onChange={(event) => setRiskForm({ ...riskForm, riskTitle: event.target.value })}
            />
            <div className="grid grid-cols-3 gap-4">
              <Select
                value={riskForm.statusCode}
                onValueChange={(value) => setRiskForm({ ...riskForm, statusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={riskForm.impactCode}
                onValueChange={(value) => setRiskForm({ ...riskForm, impactCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCALE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={riskForm.likelihoodCode}
                onValueChange={(value) => setRiskForm({ ...riskForm, likelihoodCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCALE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="리스크 설명"
              rows={3}
              value={riskForm.description}
              onChange={(event) => setRiskForm({ ...riskForm, description: event.target.value })}
            />
            <Textarea
              placeholder="대응 계획"
              rows={3}
              value={riskForm.responsePlan}
              onChange={(event) => setRiskForm({ ...riskForm, responsePlan: event.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRiskDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateRisk}
              disabled={!riskForm.riskCode.trim() || !riskForm.riskTitle.trim() || createRisk.isPending}
            >
              {createRisk.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경요청 등록</DialogTitle>
            <DialogDescription>프로젝트 변경요청을 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="예: CR-001"
              value={changeForm.changeCode}
              onChange={(event) => setChangeForm({ ...changeForm, changeCode: event.target.value })}
            />
            <Input
              placeholder="변경요청 제목"
              value={changeForm.changeTitle}
              onChange={(event) =>
                setChangeForm({ ...changeForm, changeTitle: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={changeForm.statusCode}
                onValueChange={(value) => setChangeForm({ ...changeForm, statusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANGE_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={changeForm.priorityCode}
                onValueChange={(value) => setChangeForm({ ...changeForm, priorityCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="변경요청 설명"
              rows={3}
              value={changeForm.description}
              onChange={(event) =>
                setChangeForm({ ...changeForm, description: event.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateChange}
              disabled={
                !changeForm.changeCode.trim()
                || !changeForm.changeTitle.trim()
                || createChangeRequest.isPending
              }
            >
              {createChangeRequest.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이벤트 등록</DialogTitle>
            <DialogDescription>프로젝트 이벤트/보고/미팅을 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="예: EVT-001"
              value={eventForm.eventCode}
              onChange={(event) => setEventForm({ ...eventForm, eventCode: event.target.value })}
            />
            <Input
              placeholder="이벤트 이름"
              value={eventForm.eventName}
              onChange={(event) => setEventForm({ ...eventForm, eventName: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={eventForm.eventTypeCode}
                onValueChange={(value) => setEventForm({ ...eventForm, eventTypeCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={eventForm.statusCode}
                onValueChange={(value) => setEventForm({ ...eventForm, statusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="datetime-local"
              value={eventForm.scheduledAt}
              onChange={(event) =>
                setEventForm({ ...eventForm, scheduledAt: event.target.value })
              }
            />
            <Textarea
              placeholder="이벤트 요약"
              rows={3}
              value={eventForm.summary}
              onChange={(event) => setEventForm({ ...eventForm, summary: event.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!eventForm.eventCode.trim() || !eventForm.eventName.trim() || createEvent.isPending}
            >
              {createEvent.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
