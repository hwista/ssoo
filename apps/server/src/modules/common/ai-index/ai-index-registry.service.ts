import { Injectable } from '@nestjs/common';
import type { AiIndexSourceApp } from '@ssoo/types/common';
import type { AiIndexAdapter } from './ai-index-adapter.js';

@Injectable()
export class AiIndexRegistryService {
  private readonly adapters = new Map<AiIndexSourceApp, AiIndexAdapter>();

  register(adapter: AiIndexAdapter): void {
    this.adapters.set(adapter.sourceApp, adapter);
  }

  get(sourceApp: AiIndexSourceApp): AiIndexAdapter | undefined {
    return this.adapters.get(sourceApp);
  }

  list(sourceApp?: AiIndexSourceApp): AiIndexAdapter[] {
    if (!sourceApp) {
      return Array.from(this.adapters.values());
    }

    const adapter = this.adapters.get(sourceApp);
    return adapter ? [adapter] : [];
  }
}
