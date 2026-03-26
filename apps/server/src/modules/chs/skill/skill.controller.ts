import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SkillService } from './skill.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, paginated } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreateSkillDto, AddUserSkillDto, EndorseSkillDto, SearchExpertsDto, SkillDto } from './dto/skill.dto.js';

@ApiTags('chs-skills')
@ApiBearerAuth()
@Controller('chs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('skills')
  @ApiOperation({ summary: '스킬 목록' })
  @ApiOkResponse({ type: [SkillDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll() {
    const skills = await this.skillService.findAll();
    return success(skills.map((s) => serializeBigInt(s)));
  }

  @Get('skills/search')
  @ApiOperation({ summary: '전문가 검색' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async searchExperts(@Query() params: SearchExpertsDto) {
    const { data, total, page, pageSize } = await this.skillService.searchExperts(params);
    const serialized = data.map((p) => serializeBigInt(p));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Post('skills')
  @Roles('admin')
  @ApiOperation({ summary: '스킬 생성 (관리자)' })
  @ApiOkResponse({ type: SkillDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createSkill(@Body() dto: CreateSkillDto) {
    const skill = await this.skillService.createSkill(dto);
    return success(serializeBigInt(skill));
  }

  @Post('profiles/me/skills')
  @ApiOperation({ summary: '내 프로필에 스킬 추가' })
  @ApiOkResponse({ description: '스킬 추가 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async addUserSkill(@Body() dto: AddUserSkillDto, @CurrentUser() user: TokenPayload) {
    const userSkill = await this.skillService.addUserSkill(BigInt(user.userId), dto);
    return success(serializeBigInt(userSkill));
  }

  @Delete('profiles/me/skills/:skillId')
  @ApiOperation({ summary: '내 프로필에서 스킬 제거' })
  @ApiOkResponse({ description: '스킬 제거 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async removeUserSkill(@Param('skillId') skillId: string, @CurrentUser() user: TokenPayload) {
    await this.skillService.removeUserSkill(BigInt(user.userId), BigInt(skillId));
    return success(null);
  }

  @Post('endorsements')
  @ApiOperation({ summary: '스킬 추천' })
  @ApiOkResponse({ description: '스킬 추천 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async endorseSkill(@Body() dto: EndorseSkillDto, @CurrentUser() user: TokenPayload) {
    const endorsement = await this.skillService.endorseSkill(BigInt(user.userId), dto);
    return success(serializeBigInt(endorsement));
  }
}
