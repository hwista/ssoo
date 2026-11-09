import { IntegrationSettingsModule } from '../integrations/integration-settings.module.js';
import { MailDeliveryService } from './mail-delivery.service.js';
import { MailSettingsController } from './mail-settings.controller.js';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthAdminController } from './auth-admin.controller.js';
import { AuthPolicyService } from './auth-policy.service.js';
import { AuthRegistrationService } from './auth-registration.service.js';
import { MicrosoftIdentityService } from './microsoft-identity.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { AuthAdminOperationsService } from './auth-admin-operations.service.js';
import { AuthEmailOutboxWorkerService } from './auth-email-outbox-worker.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UserModule } from '../user/user.module.js';
import { AccessFoundationModule } from '../access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { getRequiredJwtExpiry, getRequiredJwtSecret } from './jwt-config.js';

@Module({
  imports: [
    ConfigModule,
    IntegrationSettingsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService, 'JWT_SECRET'),
        signOptions: {
          expiresIn: getRequiredJwtExpiry(configService, 'JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
    UserModule,
    AccessFoundationModule,
    DatabaseModule,
  ],
  controllers: [AuthController, AuthAdminController, MailSettingsController],
  providers: [
    AuthService,
    MailDeliveryService,
    AuthPolicyService,
    AuthRegistrationService,
    MicrosoftIdentityService,
    PasswordResetService,
    AuthAdminOperationsService,
    AuthEmailOutboxWorkerService,
    JwtStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
