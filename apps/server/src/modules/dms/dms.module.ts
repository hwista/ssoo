import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import { AccessModule } from './access/access.module.js';
import { DmsAdminModule } from './admin/dms-admin.module.js';
import { AskModule } from './ask/ask.module.js';
import { ChatSessionsModule } from './chat-sessions/chat-sessions.module.js';
import { CollaborationModule } from './collaboration/collaboration.module.js';
import { ContentModule } from './content/content.module.js';
import { CreateModule } from './create/create.module.js';
import { DocAssistModule } from './doc-assist/doc-assist.module.js';
import { EventsModule } from './events/events.module.js';
import { FileModule } from './file/file.module.js';
import { FilesModule } from './files/files.module.js';
import { GitModule } from './git/git.module.js';
import { IngestModule } from './ingest/ingest.module.js';
import { SearchModule } from './search/search.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { DocumentHydrationService } from './runtime/document-hydration.service.js';
import { configService } from './runtime/dms-config.service.js';
import { personalSettingsService } from './runtime/personal-settings.service.js';
import { gitService } from './runtime/git.service.js';

const logger = new Logger('DmsModule');

@Module({
  imports: [
    DatabaseModule,
    AccessModule,
    DmsAdminModule,
    SearchModule,
    AskModule,
    CreateModule,
    ChatSessionsModule,
    CollaborationModule,
    EventsModule,
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
    EventsModule,
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
  constructor(
    private readonly hydration: DocumentHydrationService,
    private readonly db: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    // DB 기반 설정 초기화 (JSON 파일 → DB 마이그레이션 포함)
    try {
      const dbClient = this.db.client;
      await configService.initFromDb(dbClient);
      await personalSettingsService.initFromDb(dbClient);
      logger.log('DMS 설정 DB 초기화 완료');
    } catch (err) {
      logger.warn('DMS 설정 DB 초기화 실패, 파일 폴백 사용', err instanceof Error ? err.message : String(err));
    }

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
