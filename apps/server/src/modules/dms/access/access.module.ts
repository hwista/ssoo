import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessController } from './access.controller.js';
import { AccessRequestController } from './access-request.controller.js';
import { AccessRequestService } from './access-request.service.js';
import { AccessService } from './access.service.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';
import { DmsFeatureGuard } from './dms-feature.guard.js';
import { DocumentAclService } from './document-acl.service.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  controllers: [AccessController, AccessRequestController],
  providers: [
    AccessService,
    AccessRequestService,
    DocumentControlPlaneService,
    DmsFeatureGuard,
    DocumentAclService,
  ],
  exports: [
    AccessService,
    AccessRequestService,
    DocumentControlPlaneService,
    DmsFeatureGuard,
    DocumentAclService,
  ],
})
export class AccessModule {}
