import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { ProjectService } from './project.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectHandoffContractService } from './project-handoff-contract.service.js';
import { ProjectFeatureGuard } from './project-feature.guard.js';
import { RequireProjectFeature } from './require-project-feature.decorator.js';
import { attachProjectLifecycle, attachTransitionLifecycle } from './project-lifecycle.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
  UpsertRequestDetailDto,
  UpsertProposalDetailDto,
  UpsertExecutionDetailDto,
  UpsertTransitionDetailDto,
  AdvanceStageDto,
  CreateProjectHandoffDto,
  UpdateProjectHandoffDto,
  CreateProjectContractDto,
  UpdateProjectContractDto,
  CreateContractPaymentDto,
  UpdateContractPaymentDto,
} from "@ssoo/types";
import { ProjectDto, ProjectListDto } from './dto/project.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly projectHandoffContractService: ProjectHandoffContractService,
  ) {}

  @Get()
  @ApiOperation({ summary: "프로젝트 목록" })
  @ApiOkResponse({ type: ProjectListDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async findAll(
    @Query() params: PaginationParams & { statusCode?: string },
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const { data, total } = await this.projectService.findAll(
      { page, limit, statusCode: params.statusCode },
      currentUser,
    );
    const serialized = data.map((project) => serializeBigInt(attachProjectLifecycle(project)));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get(":id/access")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 접근 스냅샷" })
  @ApiOkResponse({ description: "프로젝트 접근 스냅샷" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async getAccess(
    @Param("id") id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const access = await this.projectAccessService.getProjectAccess(BigInt(id), currentUser);
    return success(access);
  }

  @Get(":id")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 상세" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async findOne(@Param("id") id: string) {
    const project = await this.projectService.findOne(BigInt(id));
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(serializeBigInt(attachProjectLifecycle(project)));
  }

  @Post()
  @ApiOperation({ summary: "프로젝트 생성" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const project = await this.projectService.create(dto, BigInt(currentUser.userId));
    return success(serializeBigInt(attachProjectLifecycle(project)));
  }

  @Put(":id")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 수정" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const project = await this.projectService.update(BigInt(id), dto, BigInt(currentUser.userId));
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(serializeBigInt(attachProjectLifecycle(project)));
  }

  @Delete(":id")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 삭제" })
  @ApiOkResponse({ description: "프로젝트 삭제" })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async remove(@Param("id") id: string) {
    const result = await this.projectService.remove(BigInt(id));
    return deleted(result);
  }

  // ─── 단계별 상세 Upsert ───

  @Put(":id/request-detail")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "요청 상세 생성/수정" })
  @ApiOkResponse({ description: "요청 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertRequestDetail(@Param("id") id: string, @Body() dto: UpsertRequestDetailDto) {
    const detail = await this.projectService.upsertRequestDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/proposal-detail")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "제안 상세 생성/수정" })
  @ApiOkResponse({ description: "제안 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertProposalDetail(@Param("id") id: string, @Body() dto: UpsertProposalDetailDto) {
    const detail = await this.projectService.upsertProposalDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/execution-detail")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "수행 상세 생성/수정" })
  @ApiOkResponse({ description: "수행 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertExecutionDetail(@Param("id") id: string, @Body() dto: UpsertExecutionDetailDto) {
    const detail = await this.projectService.upsertExecutionDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/transition-detail")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "전환 상세 생성/수정" })
  @ApiOkResponse({ description: "전환 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertTransitionDetail(@Param("id") id: string, @Body() dto: UpsertTransitionDetailDto) {
    const detail = await this.projectService.upsertTransitionDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  // ─── 상태 전이 ───

  @Get(":id/transition-readiness")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "단계 전이 준비 상태 조회" })
  @ApiOkResponse({ description: "전이 준비 상태" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async getTransitionReadiness(@Param("id") id: string) {
    const readiness = await this.projectService.checkTransitionReadiness(BigInt(id));
    return success(readiness);
  }

  @Post(":id/advance-stage")
  @RequireProjectFeature('canAdvanceStage', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 단계 진행 (상태 전이)" })
  @ApiOkResponse({ description: "전이 결과" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async advanceStage(@Param("id") id: string, @Body() dto: AdvanceStageDto) {
    const result = await this.projectService.advanceStage(BigInt(id), dto);
    return success(attachTransitionLifecycle(result));
  }

  @Get(":id/handoffs")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 핸드오프 목록" })
  @ApiOkResponse({ description: "프로젝트 핸드오프 목록" })
  async listHandoffs(@Param("id") id: string) {
    const handoffs = await this.projectHandoffContractService.listHandoffs(BigInt(id));
    return success(handoffs.map((handoff) => serializeBigInt(handoff)));
  }

  @Post(":id/handoffs")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 핸드오프 생성" })
  @ApiOkResponse({ description: "프로젝트 핸드오프" })
  async createHandoff(
    @Param("id") id: string,
    @Body() dto: CreateProjectHandoffDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const handoff = await this.projectHandoffContractService.createHandoff(
      BigInt(id),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(handoff));
  }

  @Put(":id/handoffs/:handoffId")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 핸드오프 수정" })
  @ApiOkResponse({ description: "프로젝트 핸드오프" })
  async updateHandoff(
    @Param("id") id: string,
    @Param("handoffId") handoffId: string,
    @Body() dto: UpdateProjectHandoffDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const handoff = await this.projectHandoffContractService.updateHandoff(
      BigInt(id),
      BigInt(handoffId),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(handoff));
  }

  @Get(":id/contracts")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 계약 목록" })
  @ApiOkResponse({ description: "프로젝트 계약 목록" })
  async listContracts(@Param("id") id: string) {
    const contracts = await this.projectHandoffContractService.listContracts(BigInt(id));
    return success(contracts.map((contract) => serializeBigInt(contract)));
  }

  @Post(":id/contracts")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 계약 생성" })
  @ApiOkResponse({ description: "프로젝트 계약" })
  async createContract(@Param("id") id: string, @Body() dto: CreateProjectContractDto) {
    const contract = await this.projectHandoffContractService.createContract(BigInt(id), dto);
    return success(serializeBigInt(contract));
  }

  @Put(":id/contracts/:contractId")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "프로젝트 계약 수정" })
  @ApiOkResponse({ description: "프로젝트 계약" })
  async updateContract(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body() dto: UpdateProjectContractDto,
  ) {
    const contract = await this.projectHandoffContractService.updateContract(
      BigInt(id),
      BigInt(contractId),
      dto,
    );
    return success(serializeBigInt(contract));
  }

  @Get(":id/contracts/:contractId/payments")
  @RequireProjectFeature('canViewProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "계약 대금 스케줄 목록" })
  @ApiOkResponse({ description: "계약 대금 스케줄 목록" })
  async listContractPayments(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
  ) {
    const payments = await this.projectHandoffContractService.listContractPayments(
      BigInt(id),
      BigInt(contractId),
    );
    return success(payments.map((payment) => serializeBigInt(payment)));
  }

  @Post(":id/contracts/:contractId/payments")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "계약 대금 스케줄 생성" })
  @ApiOkResponse({ description: "계약 대금 스케줄" })
  async createContractPayment(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Body() dto: CreateContractPaymentDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const payment = await this.projectHandoffContractService.createContractPayment(
      BigInt(id),
      BigInt(contractId),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(payment));
  }

  @Put(":id/contracts/:contractId/payments/:paymentId")
  @RequireProjectFeature('canEditProject', { projectIdParam: 'id' })
  @ApiOperation({ summary: "계약 대금 스케줄 수정" })
  @ApiOkResponse({ description: "계약 대금 스케줄" })
  async updateContractPayment(
    @Param("id") id: string,
    @Param("contractId") contractId: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: UpdateContractPaymentDto,
  ) {
    const payment = await this.projectHandoffContractService.updateContractPayment(
      BigInt(id),
      BigInt(contractId),
      BigInt(paymentId),
      dto,
    );
    return success(serializeBigInt(payment));
  }
}
