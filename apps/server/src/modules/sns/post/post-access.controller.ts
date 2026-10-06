import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { SnsFeatureGuard } from '../access/sns-feature.guard.js';
import { RequireSnsFeature } from '../access/require-sns-feature.decorator.js';
import { PostAccessService } from './post-access.service.js';
import { DecidePostAccessDto, RequestPostAccessDto } from './dto/post-access.dto.js';

const id = (value: string) => {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BadRequestException('올바른 식별자가 필요합니다.');
  return BigInt(value);
};

@ApiTags('sns-post-access') @ApiBearerAuth()
@Controller('sns/post-access') @UseGuards(RolesGuard, SnsFeatureGuard) @RequireSnsFeature('canReadFeed')
export class PostAccessController {
  constructor(private readonly service: PostAccessService) {}
  @Get(':postId') @ApiOperation({ summary: '게시물 개별 공유 상태와 내 신청/소유자 승인함' })
  async state(@Param('postId') postId: string, @CurrentUser() user: TokenPayload) { return success(serializeBigInt(await this.service.state(id(postId), user))); }
  @Post(':postId/requests') @ApiOperation({ summary: '게시물 개별 읽기/수정 권한 신청' })
  async request(@Param('postId') postId: string, @Body() dto: RequestPostAccessDto, @CurrentUser() user: TokenPayload) { return success(serializeBigInt(await this.service.request(id(postId), user, dto))); }
  @Post('requests/:requestId/decision') @ApiOperation({ summary: '게시물 권한 승인·반려·철회·회수' })
  async decide(@Param('requestId') requestId: string, @Body() dto: DecidePostAccessDto, @CurrentUser() user: TokenPayload) { return success(serializeBigInt(await this.service.decide(id(requestId), user, dto))); }
}
