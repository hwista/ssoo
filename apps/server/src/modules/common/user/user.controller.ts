import { Controller, Get, Post, Put, Delete, Query, Body, Param, UseGuards, NotFoundException } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiCreatedResponse } from "@nestjs/swagger";
import { UserService } from './user.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { success, paginated } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Admin 대시보드 통계
   * GET /api/users/stats
   */
  @Get("stats")
  @Roles('admin')
  @ApiOperation({ summary: '관리자 대시보드 통계' })
  @ApiOkResponse({ description: '통계 조회 성공' })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async getStats() {
    const stats = await this.userService.getAdminStats();
    return success(stats, '통계 조회 성공');
  }

  /**
   * 현재 사용자 프로필 조회
   * GET /api/users/profile
   */
  @Get("profile")
  @ApiOperation({ summary: "내 프로필" })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async getProfile(@CurrentUser() currentUser: TokenPayload) {
    const user = await this.userService.findProfileById(BigInt(currentUser.userId));

    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    return success(
      {
        id: user.id.toString(),
        loginId: user.loginId,
        userName: user.userName,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        departmentCode: user.departmentCode,
        positionCode: user.positionCode,
        lastLoginAt: user.lastLoginAt },
      "프로필 조회 성공",
    );
  }

  /**
   * 사용자 목록 조회 (관리자)
   * GET /api/users
   */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '사용자 목록 (관리자)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '검색어 (이름, 로그인ID, 이메일)' })
  @ApiQuery({ name: 'roleCode', required: false, type: String, description: '역할 코드 필터' })
  @ApiOkResponse({ description: '사용자 목록 조회 성공' })
  @ApiForbiddenResponse({ type: ApiError })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('roleCode') roleCode?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.userService.findAll({
      page: pageNum,
      limit: limitNum,
      search,
      roleCode });

    const serialized = result.data.map((u) => serializeBigInt(u));
    return paginated(serialized, pageNum, limitNum, result.total);
  }

  /**
   * 사용자 생성 (관리자)
   * POST /api/users
   */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '사용자 생성 (관리자)' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: '사용자 생성 성공' })
  @ApiForbiddenResponse({ type: ApiError })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return success(serializeBigInt(user), '사용자 생성 성공');
  }

  /**
   * 사용자 수정 (관리자)
   * PUT /api/users/:id
   */
  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 수정 (관리자)' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: '사용자 수정 성공' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.update(BigInt(id), dto);
    return success(serializeBigInt(user), '사용자 수정 성공');
  }

  /**
   * 사용자 비활성화 (관리자)
   * DELETE /api/users/:id
   */
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 비활성화 (관리자)' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiOkResponse({ description: '사용자 비활성화 성공' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  async deactivate(@Param('id') id: string) {
    const user = await this.userService.deactivate(BigInt(id));
    return success(serializeBigInt(user), '사용자 비활성화 성공');
  }
}
