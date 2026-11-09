import { AiJobOperationsService } from './ai-job-operations.service.js';
import { AiJobListQuery, RetryAiJobDto } from './dto/ai-job-operations.dto.js';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type {
  AiConversationCreateRequest,
  AiConversationUpdateRequest,
  AiIndexJobRequest,
  AiIndexSourceApp,
  AiMessageAppendRequest,
  AiRunCompleteRequest,
  AiRunStartRequest,
  CommonAiRetrievalRequest,
} from '@ssoo/types/common';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import { AiIndexSchedulerService } from './ai-index-scheduler.service.js';
import { AiIndexingService } from './ai-indexing.service.js';
import { AiIndexWorkerService } from './ai-index-worker.service.js';
import { AiModelGatewayService } from './ai-model-gateway.service.js';
import { AiRetrievalService } from './ai-retrieval.service.js';

const AI_INDEX_SOURCE_APPS = new Set<AiIndexSourceApp>(['admin', 'crm', 'pms', 'dms', 'sns']);

function normalizeSourceApp(sourceApp?: string): AiIndexSourceApp | undefined {
  if (!sourceApp) return undefined;
  return AI_INDEX_SOURCE_APPS.has(sourceApp as AiIndexSourceApp)
    ? sourceApp as AiIndexSourceApp
    : undefined;
}

@ApiTags('ai-index')
@ApiBearerAuth()
@Controller('ai-index')
export class AiIndexController {
  constructor(
    private readonly jobs: AiJobOperationsService,
    private readonly aiIndexingService: AiIndexingService,
    private readonly aiIndexSchedulerService: AiIndexSchedulerService,
    private readonly aiIndexWorkerService: AiIndexWorkerService,
    private readonly aiEmbeddingProviderService: AiEmbeddingProviderService,
    private readonly aiModelGatewayService: AiModelGatewayService,
    private readonly aiRetrievalService: AiRetrievalService,
    private readonly aiConversationService: AiConversationService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: '공용 AI/RAG 인덱스 source 상태 조회' })
  @ApiQuery({ name: 'sourceApp', required: false, type: String, description: 'admin|crm|pms|dms|sns' })
  @ApiOkResponse({ description: 'AI/RAG source별 indexing readiness 반환' })
  async status(@Query('sourceApp') sourceApp?: string) {
    const data = await this.aiIndexingService.getSourceStatuses(normalizeSourceApp(sourceApp));
    return success(data);
  }

  @Post('jobs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '공용 AI/RAG 인덱스 job 등록' })
  @ApiBody({ description: 'AI index job request' })
  @ApiOkResponse({ description: '등록된 AI index job snapshot 반환' })
  async queueJob(
    @Body() body: AiIndexJobRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiIndexingService.queueJob(body, currentUser);
    return success(data);
  }

  @Get('jobs/metrics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '공용 AI/RAG 인덱스 job queue 관측성 조회' })
  @ApiQuery({ name: 'sourceApp', required: false, type: String, description: 'admin|crm|pms|dms|sns' })
  @ApiOkResponse({ description: 'AI index job queue 상태와 retry backlog 반환' })
  async getJobMetrics(@Query('sourceApp') sourceApp?: string) {
    const data = await this.aiIndexingService.getJobQueueMetrics(normalizeSourceApp(sourceApp));
    return success(data);
  }

  @Get('jobs/scheduler')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '공용 AI/RAG 인덱스 scheduler 상태 조회' })
  @ApiOkResponse({ description: 'AI index scheduler 설정과 마지막 실행 상태 반환' })
  async getSchedulerStatus() {
    const data = this.aiIndexSchedulerService.getStatus();
    return success(data);
  }

  @Get('operations/readiness')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '공용 AI provider와 scheduler 운영 준비 상태 조회' })
  @ApiOkResponse({ description: '비밀값을 제외한 AI provider와 worker 준비 상태 반환' })
  async getOperationsReadiness() {
    const embedding = await this.aiEmbeddingProviderService.getStatus();
    const chat = this.aiModelGatewayService.getStatus();
    const scheduler = this.aiIndexSchedulerService.getStatus();
    return success({
      checkedAt: new Date().toISOString(),
      ready: embedding.ready && chat.ready,
      embedding,
      chat,
      scheduler,
      configurationBoundary: {
        mode: 'admin-settings',
        mutableInAdmin: true,
        message: '임베딩은 Admin에서 설정·전환할 수 있습니다. 채팅 모델은 배포 환경에서 관리합니다.',
      },
    });
  }

  @Post('jobs/run')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '대기 중인 공용 AI/RAG 인덱스 job 실행' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '최대 실행 job 수' })
  @ApiOkResponse({ description: 'AI index job 실행 요약 반환' })
  async runJobs(@Query('limit') limit?: string) {
    const data = await this.aiIndexWorkerService.runPendingJobs(limit ? Number(limit) : undefined);
    return success(data);
  }

  @Get('jobs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'AI 작업 목록·상태 조회' })
  async listJobs(@Query() query: AiJobListQuery) { return success(await this.jobs.list(query)); }

  @Get('jobs/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'AI 작업 상세 조회 (payload 제외)' })
  async jobDetail(@Param('id') id: string) { return success(await this.jobs.detail(id)); }

  @Post('jobs/:id/retry')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '실패한 AI 작업의 후속 실행 등록' })
  async retryJob(@Param('id') id: string, @Body() dto: RetryAiJobDto, @CurrentUser() user: TokenPayload) {
    return success(await this.jobs.retry(id, dto, BigInt(user.userId)));
  }

  @Post('retrieval/query')
  @ApiOperation({ summary: '공용 AI/RAG retrieval query 실행' })
  @ApiBody({ description: 'AI retrieval request' })
  @ApiOkResponse({ description: '공용 AI retrieval 후보 반환' })
  async retrieve(
    @Body() body: CommonAiRetrievalRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiRetrievalService.retrieve(body, currentUser);
    return success(data);
  }

  @Get('conversations')
  @ApiOperation({ summary: '공용 AI conversation 목록 조회' })
  @ApiQuery({ name: 'sourceApp', required: false, type: String, description: 'admin|crm|pms|dms|sns' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'active|archived|deleted' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '최대 조회 수' })
  @ApiOkResponse({ description: '현재 사용자 AI conversation 목록 반환' })
  async listConversations(
    @Query('sourceApp') sourceApp: string | undefined,
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.listConversations(currentUser, { sourceApp, status, limit });
    return success(data);
  }

  @Post('conversations')
  @ApiOperation({ summary: '공용 AI conversation 생성' })
  @ApiBody({ description: 'AI conversation create request' })
  @ApiOkResponse({ description: '생성된 AI conversation snapshot 반환' })
  async createConversation(
    @Body() body: AiConversationCreateRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.createConversation(body, currentUser);
    return success(data);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: '공용 AI conversation 상세 조회' })
  @ApiOkResponse({ description: 'message/reference/run 포함 AI conversation snapshot 반환' })
  async getConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.getConversation(conversationId, currentUser);
    return success(data);
  }

  @Patch('conversations/:conversationId')
  @ApiOperation({ summary: '공용 AI conversation metadata/status 갱신' })
  @ApiBody({ description: 'AI conversation update request' })
  @ApiOkResponse({ description: '갱신된 AI conversation snapshot 반환' })
  async updateConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: AiConversationUpdateRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.updateConversation(conversationId, body, currentUser);
    return success(data);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: '공용 AI conversation message/reference 추가' })
  @ApiBody({ description: 'AI message append request' })
  @ApiOkResponse({ description: '생성된 AI message snapshot 반환' })
  async appendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: AiMessageAppendRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.appendMessage(conversationId, body, currentUser);
    return success(data);
  }

  @Post('conversations/:conversationId/runs')
  @ApiOperation({ summary: '공용 AI model run audit 시작' })
  @ApiBody({ description: 'AI run start request' })
  @ApiOkResponse({ description: '생성된 AI run snapshot 반환' })
  async startRun(
    @Param('conversationId') conversationId: string,
    @Body() body: AiRunStartRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.startRun(conversationId, body, currentUser);
    return success(data);
  }

  @Post('conversations/:conversationId/runs/:runId/complete')
  @ApiOperation({ summary: '공용 AI model run audit 완료' })
  @ApiBody({ description: 'AI run complete request' })
  @ApiOkResponse({ description: '완료된 AI run snapshot 반환' })
  async completeRun(
    @Param('conversationId') conversationId: string,
    @Param('runId') runId: string,
    @Body() body: AiRunCompleteRequest,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.aiConversationService.completeRun(conversationId, runId, body, currentUser);
    return success(data);
  }
}
