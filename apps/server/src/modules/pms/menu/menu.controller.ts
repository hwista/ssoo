import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { MenuService } from './menu.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { MenuResponseDto } from './dto/menu-tree.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("menus")
@ApiBearerAuth()
@Controller("menus")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 내 메뉴 트리 조회
   * GET /api/menus/my
   */
  @Get("my")
  @ApiOperation({ summary: "내 메뉴 조회", description: "역할/권한 기반 메뉴 트리 + 즐겨찾기" })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async getMyMenu(@CurrentUser() currentUser: TokenPayload) {
    const userId = BigInt(currentUser.userId);

    const [menuData, favorites] = await Promise.all([
      this.menuService.getMenuTreeByUserId(userId),
      this.menuService.getFavoritesByUserId(userId),
    ]);

    return success({
      generalMenus: menuData.generalMenus,
      adminMenus: menuData.adminMenus,
      favorites,
    });
  }

  /**
   * 즐겨찾기 추가
   * POST /api/menus/favorites
   */
  @Post("favorites")
  @ApiOperation({ summary: "즐겨찾기 추가" })
  @ApiOkResponse({ description: "즐겨찾기 생성" })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async addFavorite(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: { menuId: string },
  ) {
    const userId = BigInt(currentUser.userId);
    const menuId = BigInt(body.menuId);

    const favorite = await this.menuService.addFavorite(userId, menuId);
    return success(favorite);
  }

  /**
   * 즐겨찾기 삭제
   * DELETE /api/menus/favorites/:menuId
   */
  @Delete("favorites/:menuId")
  @ApiOperation({ summary: "즐겨찾기 삭제" })
  @ApiOkResponse({ description: "즐겨찾기 삭제" })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async removeFavorite(
    @CurrentUser() currentUser: TokenPayload,
    @Param("menuId") menuId: string,
  ) {
    const userId = BigInt(currentUser.userId);
    await this.menuService.removeFavorite(userId, BigInt(menuId));
    return success({ removed: true });
  }
}
