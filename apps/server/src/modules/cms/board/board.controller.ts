import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { BoardService } from './board.service.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreateBoardDto, UpdateBoardDto, FindBoardsDto, BoardDto } from './dto/board.dto.js';
import { CmsFeatureGuard } from '../access/cms-feature.guard.js';
import { RequireCmsFeature } from '../access/require-cms-feature.decorator.js';

@ApiTags('cms-boards')
@ApiBearerAuth()
@Controller('cms/boards')
@UseGuards(RolesGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  @ApiOperation({ summary: '게시판 목록' })
  @ApiOkResponse({ type: [BoardDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canReadFeed')
  async findAll(@Query() params: FindBoardsDto) {
    const { data, total, page, pageSize } = await this.boardService.findAll(params);
    const serialized = data.map((b) => serializeBigInt(b));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시판 상세' })
  @ApiOkResponse({ type: BoardDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canReadFeed')
  async findOne(@Param('id') id: string) {
    const board = await this.boardService.findOne(BigInt(id));
    return success(serializeBigInt(board));
  }

  @Post()
  @ApiOperation({ summary: '게시판 생성 (관리자)' })
  @ApiOkResponse({ type: BoardDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canManageBoards')
  async create(@Body() dto: CreateBoardDto) {
    const board = await this.boardService.create(dto);
    return success(serializeBigInt(board));
  }

  @Put(':id')
  @ApiOperation({ summary: '게시판 수정 (관리자)' })
  @ApiOkResponse({ type: BoardDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canManageBoards')
  async update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    const board = await this.boardService.update(BigInt(id), dto);
    return success(serializeBigInt(board));
  }

  @Delete(':id')
  @ApiOperation({ summary: '게시판 삭제 (관리자, soft delete)' })
  @ApiOkResponse({ description: '게시판 삭제 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canManageBoards')
  async remove(@Param('id') id: string) {
    await this.boardService.softDelete(BigInt(id));
    return deleted(true);
  }
}
