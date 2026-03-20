import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { ProjectService } from './project.service.js';
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
} from "@ssoo/types";
import { ProjectDto, ProjectListDto } from './dto/project.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: "프로젝트 목록" })
  @ApiOkResponse({ type: ProjectListDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async findAll(@Query() params: PaginationParams & { statusCode?: string }) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const { data, total } = await this.projectService.findAll({ page, limit, statusCode: params.statusCode });
    const serialized = data.map((project) => serializeBigInt(project));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get(":id")
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
    return success(serializeBigInt(project));
  }

  @Post()
  @ApiOperation({ summary: "프로젝트 생성" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return success(serializeBigInt(project));
  }

  @Put(":id")
  @ApiOperation({ summary: "프로젝트 수정" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectService.update(BigInt(id), dto);
    if (!project) {
      throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    }
    return success(serializeBigInt(project));
  }

  @Delete(":id")
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
  @ApiOperation({ summary: "요청 상세 생성/수정" })
  @ApiOkResponse({ description: "요청 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertRequestDetail(
    @Param("id") id: string,
    @Body() dto: UpsertRequestDetailDto,
  ) {
    const detail = await this.projectService.upsertRequestDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/proposal-detail")
  @ApiOperation({ summary: "제안 상세 생성/수정" })
  @ApiOkResponse({ description: "제안 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertProposalDetail(
    @Param("id") id: string,
    @Body() dto: UpsertProposalDetailDto,
  ) {
    const detail = await this.projectService.upsertProposalDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/execution-detail")
  @ApiOperation({ summary: "수행 상세 생성/수정" })
  @ApiOkResponse({ description: "수행 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertExecutionDetail(
    @Param("id") id: string,
    @Body() dto: UpsertExecutionDetailDto,
  ) {
    const detail = await this.projectService.upsertExecutionDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  @Put(":id/transition-detail")
  @ApiOperation({ summary: "전환 상세 생성/수정" })
  @ApiOkResponse({ description: "전환 상세" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async upsertTransitionDetail(
    @Param("id") id: string,
    @Body() dto: UpsertTransitionDetailDto,
  ) {
    const detail = await this.projectService.upsertTransitionDetail(BigInt(id), dto);
    return success(serializeBigInt(detail));
  }

  // ─── 상태 전이 ───

  @Get(":id/transition-readiness")
  @ApiOperation({ summary: "단계 전이 준비 상태 조회" })
  @ApiOkResponse({ description: "전이 준비 상태" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async getTransitionReadiness(@Param("id") id: string) {
    const readiness = await this.projectService.checkTransitionReadiness(BigInt(id));
    return success(readiness);
  }

  @Post(":id/advance-stage")
  @ApiOperation({ summary: "프로젝트 단계 진행 (상태 전이)" })
  @ApiOkResponse({ description: "전이 결과" })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  async advanceStage(
    @Param("id") id: string,
    @Body() dto: AdvanceStageDto,
  ) {
    const result = await this.projectService.advanceStage(BigInt(id), dto);
    return success(result);
  }
}
