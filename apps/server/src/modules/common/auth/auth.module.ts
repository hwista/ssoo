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
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UserModule } from '../user/user.module.js';
import { AccessFoundationModule } from '../access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
    UserModule,
    AccessFoundationModule,
    DatabaseModule,
  ],
  controllers: [AuthController, AuthAdminController],
  providers: [
    AuthService,
    AuthPolicyService,
    AuthRegistrationService,
    MicrosoftIdentityService,
    PasswordResetService,
    JwtStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
