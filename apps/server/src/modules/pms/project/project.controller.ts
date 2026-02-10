import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { ProjectService } from './project.service.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { serializeBigIntShallow } from '../../../common/utils/bigint.util.js';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
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
  async findAll(@Query() params: PaginationParams) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const { data, total } = await this.projectService.findAll({ page, limit });
    const serialized = data.map((project) => {
      const base = serializeBigIntShallow(project as Record<string, unknown>);
      if (project.requestDetail) {
        base.requestDetail = serializeBigIntShallow(project.requestDetail as Record<string, unknown>);
      }
      if (project.projectStatuses?.length) {
        base.projectStatuses = project.projectStatuses.map((status) =>
          serializeBigIntShallow(status as Record<string, unknown>),
        );
      }
      return base;
    });
    return paginated(serialized, page, limit, total);
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
    return success(project);
  }

  @Post()
  @ApiOperation({ summary: "프로젝트 생성" })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectService.create(dto);
    return success(project);
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
    return success(project);
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
}
