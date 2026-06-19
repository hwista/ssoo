import { Injectable } from '@nestjs/common';
import type { CommonSearchSourceApp } from '@ssoo/types/common';
import type { CommonSearchProvider } from './search-provider.js';

@Injectable()
export class CommonSearchRegistryService {
  private readonly providers = new Map<CommonSearchSourceApp, CommonSearchProvider>();

  register(provider: CommonSearchProvider): void {
    this.providers.set(provider.sourceApp, provider);
  }

  list(sourceApp?: CommonSearchSourceApp): CommonSearchProvider[] {
    if (sourceApp) {
      const provider = this.providers.get(sourceApp);
      return provider ? [provider] : [];
    }

    return Array.from(this.providers.values());
  }

  hasSource(sourceApp: CommonSearchSourceApp): boolean {
    return this.providers.has(sourceApp);
  }
}
