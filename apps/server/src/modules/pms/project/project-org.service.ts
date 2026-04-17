import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ExtendedPrismaClient } from '@ssoo/database';
import type {
  CreateProjectOrgDto,
  ProjectOrgRoleCode,
  UpdateProjectOrgDto,
} from '@ssoo/types';
import { DatabaseService } from '../../../database/database.service.js';

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const PROJECT_ORG_COMPAT_SOURCE = 'pms-project-org-compat';
const PROJECT_ORG_COMPAT_ACTIVITY = 'sync-anchor';

const PROJECT_ORG_ROLE_CODES: ProjectOrgRoleCode[] = [
  'owner',
  'customer',
  'supplier',
  'partner',
];
const EXPLICIT_PROJECT_ORG_ROLE_CODES: Array<Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>> = [
  'supplier',
  'partner',
];

const PROJECT_ORG_INCLUDE = {
  organization: {
    select: {
      orgId: true,
      orgCode: true,
      orgName: true,
      orgType: true,
      orgClass: true,
      scope: true,
      levelType: true,
      isActive: true,
    },
  },
} as const;

@Injectable()
export class ProjectOrgService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    await this.syncCompatibilityProjectOrgs(projectId);
    return this.loadProjectOrgs(projectId);
  }

  async create(projectId: bigint, dto: CreateProjectOrgDto) {
    const roleCode = this.parseRoleCode(dto.roleCode);
    this.ensureExplicitRoleAllowed(roleCode);
    const organizationId = await this.resolveOrganizationId(dto, this.db.client, true);

    const existing = await this.db.client.projectOrg.findUnique({
      where: {
        pk_pr_project_org_r_m: {
          projectId,
          organizationId,
          roleCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Project organization relation already exists');
    }

    return this.db.client.projectOrg.create({
      data: {
        projectId,
        organizationId,
        roleCode,
        memo: dto.memo,
      },
      include: PROJECT_ORG_INCLUDE,
    });
  }

  async update(
    projectId: bigint,
    organizationId: bigint,
    roleCodeValue: string,
    dto: UpdateProjectOrgDto,
  ) {
    const roleCode = this.parseRoleCode(roleCodeValue);
    this.ensureExplicitRoleAllowed(roleCode);
    const existing = await this.db.client.projectOrg.findUnique({
      where: {
        pk_pr_project_org_r_m: {
          projectId,
          organizationId,
          roleCode,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project organization relation not found');
    }

    return this.db.client.projectOrg.update({
      where: {
        pk_pr_project_org_r_m: {
          projectId,
          organizationId,
          roleCode,
        },
      },
      data: {
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: PROJECT_ORG_INCLUDE,
    });
  }

  async remove(projectId: bigint, organizationId: bigint, roleCodeValue: string) {
    const roleCode = this.parseRoleCode(roleCodeValue);
    this.ensureExplicitRoleAllowed(roleCode);
    const existing = await this.db.client.projectOrg.findUnique({
      where: {
        pk_pr_project_org_r_m: {
          projectId,
          organizationId,
          roleCode,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project organization relation not found');
    }

    await this.db.client.projectOrg.delete({
      where: {
        pk_pr_project_org_r_m: {
          projectId,
          organizationId,
          roleCode,
        },
      },
    });

    return true;
  }

  async syncCompatibilityProjectOrgs(
    projectId: bigint,
    tx: TxClient = this.db.client,
    options?: { strict?: boolean },
  ): Promise<void> {
    const strict = options?.strict ?? false;
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerOrganizationId: true,
        customerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ownerOrganizationId = await this.resolveExistingOrganizationId(
      project.ownerOrganizationId,
      tx,
      strict,
    );
    await this.syncCompatibilityRole({
      projectId,
      roleCode: 'owner',
      organizationId: ownerOrganizationId,
      memo: 'Synced from project owner organization anchor',
      tx,
    });

    const customerOrganizationId = project.customerId
      ? await this.ensureExternalOrganizationForCustomer(project.customerId, tx, strict)
      : null;
    await this.syncCompatibilityRole({
      projectId,
      roleCode: 'customer',
      organizationId: customerOrganizationId,
      memo: 'Synced from project customer anchor',
      tx,
    });
  }

  private async loadProjectOrgs(projectId: bigint, tx: TxClient = this.db.client) {
    return tx.projectOrg.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: PROJECT_ORG_INCLUDE,
      orderBy: [{ roleCode: 'asc' }, { organizationId: 'asc' }],
    });
  }

  private parseRoleCode(roleCodeValue: string): ProjectOrgRoleCode {
    if (PROJECT_ORG_ROLE_CODES.includes(roleCodeValue as ProjectOrgRoleCode)) {
      return roleCodeValue as ProjectOrgRoleCode;
    }

    throw new BadRequestException('프로젝트 조직 역할 코드가 올바르지 않습니다.');
  }

  private ensureExplicitRoleAllowed(roleCode: ProjectOrgRoleCode): void {
    if (EXPLICIT_PROJECT_ORG_ROLE_CODES.includes(roleCode as Extract<ProjectOrgRoleCode, 'supplier' | 'partner'>)) {
      return;
    }

    throw new BadRequestException(
      'owner/customer 프로젝트 조직은 project anchor 와 compatibility sync 되므로 직접 수정할 수 없습니다.',
    );
  }

  private parseOrganizationId(organizationId?: string | null): bigint | null {
    if (!organizationId || organizationId.trim() === '') {
      return null;
    }

    try {
      return BigInt(organizationId);
    } catch {
      throw new BadRequestException('조직 ID 형식이 올바르지 않습니다.');
    }
  }

  private parseCustomerId(customerId?: string | null): bigint | null {
    if (!customerId || customerId.trim() === '') {
      return null;
    }

    try {
      return BigInt(customerId);
    } catch {
      throw new BadRequestException('고객사 ID 형식이 올바르지 않습니다.');
    }
  }

  private async resolveOrganizationId(
    dto: CreateProjectOrgDto,
    tx: TxClient,
    strict: boolean,
  ): Promise<bigint> {
    const organizationId = this.parseOrganizationId(dto.organizationId);
    if (organizationId) {
      const existingOrganizationId = await this.resolveExistingOrganizationId(
        organizationId,
        tx,
        strict,
      );
      if (!existingOrganizationId) {
        throw new NotFoundException('Organization not found');
      }
      return existingOrganizationId;
    }

    if (dto.roleCode !== 'customer') {
      throw new BadRequestException('customer 외 역할은 organizationId 가 필요합니다.');
    }

    const customerId = this.parseCustomerId(dto.customerId);
    if (!customerId) {
      throw new BadRequestException(
        'customer 역할은 customerId 또는 organizationId 가 필요합니다.',
      );
    }

    const customerOrganizationId = await this.ensureExternalOrganizationForCustomer(
      customerId,
      tx,
      strict,
    );
    if (!customerOrganizationId) {
      throw new NotFoundException('Customer organization not found');
    }

    return customerOrganizationId;
  }

  private async resolveExistingOrganizationId(
    organizationId: bigint | null,
    tx: TxClient,
    strict: boolean,
  ): Promise<bigint | null> {
    if (!organizationId) {
      return null;
    }

    const organization = await tx.organization.findUnique({
      where: { orgId: organizationId },
      select: { orgId: true },
    });

    if (organization) {
      return organization.orgId;
    }

    if (strict) {
      throw new NotFoundException('Organization not found');
    }

    return null;
  }

  private async ensureExternalOrganizationForCustomer(
    customerId: bigint,
    tx: TxClient,
    strict: boolean,
  ): Promise<bigint | null> {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: {
        customerCode: true,
        customerName: true,
      },
    });

    if (!customer) {
      if (strict) {
        throw new NotFoundException('Customer not found');
      }
      return null;
    }

    const organization = await tx.organization.upsert({
      where: { orgCode: customer.customerCode },
      update: {
        orgName: customer.customerName,
        orgType: 'external',
        orgClass: 'permanent',
        scope: 'external',
        levelType: null,
        isActive: true,
        memo: 'Backfilled from project customer anchor',
      },
      create: {
        orgCode: customer.customerCode,
        orgName: customer.customerName,
        orgType: 'external',
        orgClass: 'permanent',
        scope: 'external',
        levelType: null,
        isActive: true,
        memo: 'Backfilled from project customer anchor',
      },
      select: {
        orgId: true,
      },
    });

    return organization.orgId;
  }

  private async syncCompatibilityRole(params: {
    projectId: bigint;
    roleCode: Extract<ProjectOrgRoleCode, 'owner' | 'customer'>;
    organizationId: bigint | null;
    memo: string;
    tx: TxClient;
  }): Promise<void> {
    const { projectId, roleCode, organizationId, memo, tx } = params;

    if (organizationId) {
      await tx.projectOrg.upsert({
        where: {
          pk_pr_project_org_r_m: {
            projectId,
            organizationId,
            roleCode,
          },
        },
        update: {
          isActive: true,
          memo,
          lastSource: PROJECT_ORG_COMPAT_SOURCE,
          lastActivity: PROJECT_ORG_COMPAT_ACTIVITY,
        },
        create: {
          projectId,
          organizationId,
          roleCode,
          isActive: true,
          memo,
          lastSource: PROJECT_ORG_COMPAT_SOURCE,
          lastActivity: PROJECT_ORG_COMPAT_ACTIVITY,
        },
      });
    }

    await tx.projectOrg.deleteMany({
      where: {
        projectId,
        roleCode,
        lastSource: PROJECT_ORG_COMPAT_SOURCE,
        ...(organizationId
          ? {
              organizationId: {
                not: organizationId,
              },
            }
          : {}),
      },
    });
  }
}
