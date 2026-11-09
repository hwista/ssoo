import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags, PickType } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { success } from '../../../common/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { InitialSetupService } from './initial-setup.service.js';

export class InitialSetupDto extends PickType(CreateUserDto, ['loginId', 'password', 'userName', 'email'] as const) {
  @ApiProperty({ description: '설치 담당자가 준비한 최초 설정 코드' })
  @IsString() @MinLength(32) @MaxLength(256)
  setupCode!: string;

  @Matches(/\S/, { message: '로그인 ID를 입력해 주세요.' })
  declare loginId: string;

  @Matches(/\S/, { message: '관리자 이름을 입력해 주세요.' })
  declare userName: string;
}

@ApiTags('initial-setup')
@Controller('initial-setup')
@Public()
export class InitialSetupController {
  constructor(private readonly setup: InitialSetupService) {}

  @Get() @ApiOperation({ summary: '최초 관리자 설정 가능 상태' })
  async status() { return success(await this.setup.status()); }

  @Post() @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '빈 플랫폼의 최초 관리자 생성' })
  async create(@Body() dto: InitialSetupDto) { return success(await this.setup.create(dto)); }
}
