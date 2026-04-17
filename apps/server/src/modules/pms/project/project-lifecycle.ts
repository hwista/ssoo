import type {
  DoneResultCode,
  ProjectLifecycle,
  ProjectLifecycleStatus,
  ProjectPhase,
  ProjectStageCode,
  ProjectStatusCode,
} from '@ssoo/types';

interface ProjectLifecycleInput {
  statusCode: ProjectStatusCode | string;
  stageCode: ProjectStageCode | string;
  doneResultCode?: DoneResultCode | string | null;
}

interface TransitionLifecycleInput {
  previousStatusCode: ProjectStatusCode | string;
  previousStageCode: ProjectStageCode | string;
  currentStatusCode: ProjectStatusCode | string;
  currentStageCode: ProjectStageCode | string;
  doneResultCode?: DoneResultCode | string | null;
  advancedToNextStatus: boolean;
}

const PROJECT_STATUS_CODES = new Set<ProjectStatusCode>([
  'request',
  'proposal',
  'execution',
  'transition',
]);

const PROJECT_STAGE_CODES = new Set<ProjectStageCode>(['waiting', 'in_progress', 'done']);

const CLOSED_DONE_RESULTS = new Set<DoneResultCode>([
  'rejected',
  'lost',
  'completed',
  'linked',
  'cancelled',
  'transferred',
]);

const CANCELLED_DONE_RESULTS = new Set<DoneResultCode>(['rejected', 'lost', 'cancelled']);

function normalizeProjectStatusCode(statusCode: ProjectStatusCode | string): ProjectStatusCode {
  if (PROJECT_STATUS_CODES.has(statusCode as ProjectStatusCode)) {
    return statusCode as ProjectStatusCode;
  }

  return 'request';
}

function normalizeProjectStageCode(stageCode: ProjectStageCode | string): ProjectStageCode {
  if (PROJECT_STAGE_CODES.has(stageCode as ProjectStageCode)) {
    return stageCode as ProjectStageCode;
  }

  return 'waiting';
}

function normalizeDoneResultCode(doneResultCode?: DoneResultCode | string | null): DoneResultCode | null {
  if (!doneResultCode) {
    return null;
  }

  if (CLOSED_DONE_RESULTS.has(doneResultCode as DoneResultCode) || doneResultCode === 'accepted' || doneResultCode === 'won' || doneResultCode === 'transfer_pending' || doneResultCode === 'hold') {
    return doneResultCode as DoneResultCode;
  }

  return null;
}

function deriveProjectPhase({
  statusCode,
  stageCode,
  doneResultCode,
}: ProjectLifecycleInput): ProjectPhase {
  const normalizedStatusCode = normalizeProjectStatusCode(statusCode);
  const normalizedStageCode = normalizeProjectStageCode(stageCode);
  const normalizedDoneResultCode = normalizeDoneResultCode(doneResultCode);

  if (normalizedStageCode === 'done' && normalizedDoneResultCode && CLOSED_DONE_RESULTS.has(normalizedDoneResultCode)) {
    return 'closed';
  }

  if (normalizedStatusCode === 'transition') {
    return 'operation';
  }

  return normalizedStatusCode;
}

function deriveProjectLifecycleStatus({
  stageCode,
  doneResultCode,
}: ProjectLifecycleInput): ProjectLifecycleStatus {
  const normalizedStageCode = normalizeProjectStageCode(stageCode);
  const normalizedDoneResultCode = normalizeDoneResultCode(doneResultCode);

  if (normalizedStageCode === 'waiting') {
    return 'draft';
  }

  if (normalizedStageCode === 'in_progress') {
    return 'active';
  }

  if (normalizedDoneResultCode === 'hold') {
    return 'on_hold';
  }

  if (normalizedDoneResultCode && CANCELLED_DONE_RESULTS.has(normalizedDoneResultCode)) {
    return 'cancelled';
  }

  return 'completed';
}

export function deriveProjectLifecycle(input: ProjectLifecycleInput): ProjectLifecycle {
  return {
    phase: deriveProjectPhase(input),
    status: deriveProjectLifecycleStatus(input),
    terminalReason: normalizeDoneResultCode(input.doneResultCode),
  };
}

export function attachProjectLifecycle<T extends ProjectLifecycleInput & Record<string, unknown>>(
  project: T,
): T & { lifecycle: ProjectLifecycle } {
  return {
    ...project,
    lifecycle: deriveProjectLifecycle(project),
  };
}

export function attachTransitionLifecycle<T extends TransitionLifecycleInput>(
  result: T,
): T & { previousLifecycle: ProjectLifecycle; currentLifecycle: ProjectLifecycle } {
  return {
    ...result,
    previousLifecycle: deriveProjectLifecycle({
      statusCode: result.previousStatusCode,
      stageCode: result.previousStageCode,
      doneResultCode: null,
    }),
    currentLifecycle: deriveProjectLifecycle({
      statusCode: result.currentStatusCode,
      stageCode: result.currentStageCode,
      doneResultCode: result.doneResultCode ?? null,
    }),
  };
}
