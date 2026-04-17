export class ProjectLifecycleDto {
  phase!: string;
  status!: string;
  terminalReason!: string | null;
}

export class ProjectDto {
  id!: string;
  projectCode!: string;
  projectName!: string;
  statusCode!: string | null;
  stageCode!: string | null;
  doneResultCode!: string | null;
  lifecycle!: ProjectLifecycleDto;
  createdAt!: Date;
  updatedAt!: Date | null;
}

export class ProjectListDto {
  data!: ProjectDto[];
  meta!: { page: number; limit: number; total: number };
}

export class TransitionResultDto {
  previousStatusCode!: string;
  previousStageCode!: string;
  currentStatusCode!: string;
  currentStageCode!: string;
  doneResultCode!: string | null;
  advancedToNextStatus!: boolean;
  previousLifecycle!: ProjectLifecycleDto;
  currentLifecycle!: ProjectLifecycleDto;
}
