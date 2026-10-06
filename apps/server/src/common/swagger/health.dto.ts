import type { AppReadiness } from '../../modules/common/health/platform-readiness.service.js';
import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ example: 'ssoo-server' })
  service!: string;

  @ApiProperty({ example: '0.0.1' })
  version!: string;

  @ApiProperty({ example: '208acbe2c93b7218f2011820391234567890abcd' })
  releaseSha!: string;
}

export class HealthReadinessDto {
  @ApiProperty({ type: [Object], description: 'Admin/CRM/PMS/DMS/SNS deployment readiness' })
  services!: AppReadiness[];

  @ApiProperty({ example: 'ready' })
  status!: 'ready';

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ example: 'ssoo-server' })
  service!: string;

  @ApiProperty({ example: 'ready' })
  database!: 'ready';

  @ApiProperty({ example: 'ready' })
  dms!: 'ready';

  @ApiProperty({ example: '208acbe2c93b7218f2011820391234567890abcd' })
  releaseSha!: string;
}
