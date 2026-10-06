import { BadRequestException, Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CodeService } from './code.service.js';
import { success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreateCodeDto, UpdateCodeDto } from './dto/code.dto.js';

@ApiTags('codes')
@ApiBearerAuth()
@Controller('codes')
@UseGuards(RolesGuard)
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
    const result = await this.codeService.update(this.parseId(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '코드 비활성화' })
  async deactivate(@Param('id') id: string) {
    const result = await this.codeService.deactivate(this.parseId(id));
    return success(serializeBigInt(result));
  }

  @Delete(':id/permanent')
  @Roles('admin')
  @ApiOperation({ summary: '비활성 코드 영구 삭제' })
  async removePermanently(@Param('id') id: string) {
    const result = await this.codeService.removePermanently(this.parseId(id));
    return success(result);
  }

  private parseId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id) || id.length > 19 || BigInt(id) > 9223372036854775807n) {
      throw new BadRequestException('올바른 코드 ID가 아닙니다.');
    }
    return BigInt(id);
  }

}
