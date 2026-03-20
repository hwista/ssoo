import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { CodeService } from './code.service.js';
import { success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateCodeDto, UpdateCodeDto } from './dto/code.dto.js';

@ApiTags('codes')
@ApiBearerAuth()
@Controller('codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Get('groups')
  @ApiOperation({ summary: '코드 그룹 목록' })
  async findGroups() {
    const data = await this.codeService.findGroups();
    return success(data);
  }

  @Get()
  @ApiOperation({ summary: '그룹별 코드 목록' })
  async findByGroup(@Query('codeGroup') codeGroup: string) {
    const data = await this.codeService.findByGroup(codeGroup);
    return success(data.map((c) => serializeBigInt(c)));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '코드 생성' })
  async create(@Body() dto: CreateCodeDto) {
    const result = await this.codeService.create(dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '코드 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateCodeDto) {
    const result = await this.codeService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '코드 비활성화' })
  async deactivate(@Param('id') id: string) {
    const result = await this.codeService.deactivate(BigInt(id));
    return success(serializeBigInt(result));
  }
}
