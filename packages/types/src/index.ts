/**
 * @ssoo/types - 공유 타입 패키지
 *
 * 사용법:
 * - import { ApiResponse, User } from '@ssoo/types/common';
 * - import { Project, Customer } from '@ssoo/types/pms';
 *
 * 하위 호환성을 위해 루트에서도 모든 타입을 re-export합니다.
 */

// Common Types
export type {
  ApiResponse,
  PaginationParams,
  IdParam,
  UserRole,
  User,
  CreateUserDto,
  UpdateUserDto,
} from './common';

// PMS Types
export type {
  ProjectStatusCode,
  ProjectStageCode,
  DoneResultCode,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectRequestDetail,
  ProjectProposalDetail,
  ProjectExecutionDetail,
  ProjectTransitionDetail,
  ProjectStatus,
  ProjectDetail,
  UpsertRequestDetailDto,
  UpsertProposalDetailDto,
  UpsertExecutionDetailDto,
  UpsertTransitionDetailDto,
  AdvanceStageDto,
  TransitionResult,
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  Milestone,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  ProjectMember,
  CreateProjectMemberDto,
  UpdateProjectMemberDto,
  Issue,
  CreateIssueDto,
  UpdateIssueDto,
} from './pms';

// CHS (Community Hub System)
export type { Post, CreatePostDto, UpdatePostDto } from './chs/post';
export type { Comment, CreateCommentDto, UpdateCommentDto } from './chs/comment';
export type { Board, BoardCategory, CreateBoardDto, UpdateBoardDto } from './chs/board';
export type { UserProfile, UserCareer, UpdateProfileDto, CreateCareerDto } from './chs/profile';
export type { Skill, UserSkill, Endorsement, CreateSkillDto, AddUserSkillDto, EndorseSkillDto, SearchExpertsDto } from './chs/skill';
export type { Follow, FollowStats } from './chs/follow';
export type { NotificationType, Notification } from './chs/notification';
export type { FeedItem, FeedQueryDto, ReactionDto } from './chs/feed';
