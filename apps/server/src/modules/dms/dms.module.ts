import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
export class DmsModule {}
