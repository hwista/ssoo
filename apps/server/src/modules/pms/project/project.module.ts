import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller.js';
import { ProjectService } from './project.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectFeatureGuard } from './project-feature.guard.js';
import { ProjectHandoffContractService } from './project-handoff-contract.service.js';
import { ProjectOrgController } from './project-org.controller.js';
import { ProjectOrgService } from './project-org.service.js';
import { ProjectRelationController } from './project-relation.controller.js';
import { ProjectRelationService } from './project-relation.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  controllers: [ProjectController, ProjectOrgController, ProjectRelationController],
  providers: [
    ProjectService,
    ProjectAccessService,
    ProjectHandoffContractService,
    ProjectOrgService,
    ProjectRelationService,
    ProjectFeatureGuard,
  ],
  exports: [
    ProjectService,
    ProjectAccessService,
    ProjectHandoffContractService,
    ProjectOrgService,
    ProjectRelationService,
    ProjectFeatureGuard,
  ],
})
export class ProjectModule {}
