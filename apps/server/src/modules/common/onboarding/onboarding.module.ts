import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { PlatformAdmissionService } from './platform-admission.service.js';
import { InitialSetupController } from './initial-setup.controller.js';
import { InitialSetupService } from './initial-setup.service.js';
import { ParticipationWriteService } from './participation-write.service.js';
import { ParticipationOperationsService } from './participation-operations.service.js';
import { ParticipationOperationsController } from './participation-operations.controller.js';

@Global()
@Module({ imports: [DatabaseModule], controllers: [OnboardingController, InitialSetupController, ParticipationOperationsController],
  providers: [OnboardingService, PlatformAdmissionService, InitialSetupService, ParticipationWriteService, ParticipationOperationsService], exports: [PlatformAdmissionService] })
export class OnboardingModule {}
