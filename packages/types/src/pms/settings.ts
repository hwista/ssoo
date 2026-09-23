export type PmsProjectView = 'board' | 'list' | 'timeline';
export interface PmsUserSettings {
  showCompletedTasks: boolean;
  defaultProjectView: PmsProjectView;
  notifyTaskAssignment: boolean;
  notifyIssueUpdate: boolean;
}
export interface PmsTaskAssignee {
  userId: string;
  label: string;
}
