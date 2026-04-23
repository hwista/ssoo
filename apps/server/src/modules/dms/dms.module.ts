import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AccessModule } from './access/access.module.js';
import { AskModule } from './ask/ask.module.js';
import { ChatSessionsModule } from './chat-sessions/chat-sessions.module.js';
import { CollaborationModule } from './collaboration/collaboration.module.js';
import { ContentModule } from './content/content.module.js';
import { CreateModule } from './create/create.module.js';
import { DocAssistModule } from './doc-assist/doc-assist.module.js';
import { FileModule } from './file/file.module.js';
import { FilesModule } from './files/files.module.js';
import { GitModule } from './git/git.module.js';
import { IngestModule } from './ingest/ingest.module.js';
import { SearchModule } from './search/search.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { DocumentHydrationService } from './runtime/document-hydration.service.js';
import { gitService } from './runtime/git.service.js';

const logger = new Logger('DmsModule');

@Module({
  imports: [
    DatabaseModule,
    AccessModule,
    SearchModule,
    AskModule,
    CreateModule,
    ChatSessionsModule,
    CollaborationModule,
    SettingsModule,
    TemplatesModule,
    DocAssistModule,
    FilesModule,
    ContentModule,
    GitModule,
    FileModule,
    StorageModule,
    IngestModule,
  ],
  providers: [DocumentHydrationService],
  exports: [
    AccessModule,
    SearchModule,
    AskModule,
    CreateModule,
    ChatSessionsModule,
    CollaborationModule,
    SettingsModule,
    TemplatesModule,
    DocAssistModule,
    FilesModule,
    ContentModule,
    GitModule,
    FileModule,
    StorageModule,
    IngestModule,
  ],
})
export class DmsModule implements OnModuleInit {
  constructor(private readonly hydration: DocumentHydrationService) {}

  async onModuleInit(): Promise<void> {
    try {
      const gitResult = await gitService.initialize();
      if (gitResult.success) {
        logger.log(`Git 초기화 완료 (mode: ${gitResult.data?.mode})`);
      } else {
        logger.warn(`Git 초기화 실패: ${gitResult.error}`);
      }
    } catch (err) {
      logger.warn('Git 초기화 중 예외', err instanceof Error ? err.message : String(err));
    }

    try {
      await this.hydration.hydrateFromDisk();
    } catch (err) {
      logger.warn('문서 하이드레이션 중 예외', err instanceof Error ? err.message : String(err));
    }
  }
}
