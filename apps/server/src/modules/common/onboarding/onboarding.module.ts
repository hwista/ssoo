import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { PlatformAdmissionService } from './platform-admission.service.js';

@Global()
@Module({ imports: [DatabaseModule], controllers: [OnboardingController],
  providers: [OnboardingService, PlatformAdmissionService], exports: [PlatformAdmissionService] })
export class OnboardingModule {}
