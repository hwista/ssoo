import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { EventsModule } from '../events/events.module.js';
import { AccessController } from './access.controller.js';
import { AccessRequestController } from './access-request.controller.js';
import { AccessRequestService } from './access-request.service.js';
import { AccessService } from './access.service.js';
import { ControlPlaneSyncService } from './control-plane-sync.service.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';
import { DmsFeatureGuard } from './dms-feature.guard.js';
import { DocumentAclService } from './document-acl.service.js';
import { DocumentProjectionService } from './document-projection.service.js';
import { DocumentRecordService } from './document-record.service.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule, EventsModule],
  controllers: [AccessController, AccessRequestController],
  providers: [
    AccessService,
    AccessRequestService,
    ControlPlaneSyncService,
    DocumentControlPlaneService,
    DmsFeatureGuard,
    DocumentAclService,
    DocumentProjectionService,
    DocumentRecordService,
  ],
  exports: [
    AccessService,
    AccessRequestService,
    ControlPlaneSyncService,
    DocumentControlPlaneService,
    DmsFeatureGuard,
    DocumentAclService,
    DocumentProjectionService,
    DocumentRecordService,
  ],
})
export class AccessModule {}
