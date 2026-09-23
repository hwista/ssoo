import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, ValidateIf } from 'class-validator';
import type { PmsUserSettings } from '@ssoo/types';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { PmsSettingsService } from './settings.service.js';

export class UpdatePmsSettingsDto implements Partial<PmsUserSettings> {
  @ApiPropertyOptional() @ValidateIf((_object, value) => value !== undefined) @IsBoolean()
  showCompletedTasks?: boolean;

  @ApiPropertyOptional({ enum: ['board', 'list', 'timeline'] })
  @ValidateIf((_object, value) => value !== undefined) @IsIn(['board', 'list', 'timeline'])
  defaultProjectView?: PmsUserSettings['defaultProjectView'];

  @ApiPropertyOptional() @ValidateIf((_object, value) => value !== undefined) @IsBoolean()
  notifyTaskAssignment?: boolean;

  @ApiPropertyOptional() @ValidateIf((_object, value) => value !== undefined) @IsBoolean()
  notifyIssueUpdate?: boolean;
}

@ApiTags('PMS settings')
@ApiBearerAuth()
@Controller('pms/settings')
export class PmsSettingsController {
  constructor(private readonly settings: PmsSettingsService) {}

  @Get()
  @ApiOperation({ summary: '내 프로젝트 사용 설정 조회' })
  async read(@CurrentUser('userId') userId: string) {
    return success(await this.settings.read(BigInt(userId)));
  }

  @Patch()
  @ApiOperation({ summary: '내 프로젝트 사용 설정 저장' })
  async update(@CurrentUser('userId') userId: string, @Body() dto: UpdatePmsSettingsDto) {
    return success(await this.settings.update(BigInt(userId), dto));
  }
}
