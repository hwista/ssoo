import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { TokenPayload } from './interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiSuccess, ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 로그인
   * POST /api/auth/login
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "로그인", description: "JWT Access/Refresh 토큰 발급" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError, description: "잘못된 자격 증명" })
  @ApiTooManyRequestsResponse({ type: ApiError, description: "로그인 레이트리밋 초과" })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(loginDto);
    return success(tokens, "로그인에 성공했습니다");
  }

  /**
   * 토큰 갱신
   * POST /api/auth/refresh
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Refresh 토큰으로 재발급" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError, description: "토큰 무효/만료" })
  @ApiTooManyRequestsResponse({ type: ApiError, description: "갱신 레이트리밋 초과" })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    return success(tokens, "토큰 갱신 성공");
  }

  /**
   * 로그아웃
   * POST /api/auth/logout
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "로그아웃", description: "서버에 저장된 Refresh Token 무효화" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async logout(@CurrentUser() user: TokenPayload) {
    await this.authService.logout(BigInt(user.userId));
    return success(null, "로그아웃 성공");
  }

  /**
   * 현재 사용자 정보
   * POST /api/auth/me
   */
  @Post("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "내 정보 조회" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async me(@CurrentUser() user: TokenPayload) {
    return success(
      {
        userId: user.userId,
        loginId: user.loginId,
        roleCode: user.roleCode,
        userTypeCode: user.userTypeCode,
        isAdmin: user.isAdmin,
      },
      "사용자 정보 조회 성공",
    );
  }
}
