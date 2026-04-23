import { Injectable } from '@nestjs/common';
import { configService, type SearchConfig } from '../runtime/dms-config.service.js';

@Injectable()
export class SearchRuntimeService {
  getAppRoot(): string {
    return configService.getAppRoot();
  }

  getSearchConfig(): SearchConfig {
    return configService.getConfig().search;
  }

  getDocDir(): string {
    return configService.getDocDir();
  }
}
