import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommonOperationEvent, CommonOperationHistoryDetail, CommonOperationHistoryPage } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { participationId } from '../onboarding/participation-write.service.js';
import type { OperationHistoryQueryDto } from './dto/operation-history.dto.js';

interface HistorySource { id: string; label: string; table: string; key: string; path: string; fields: string[] }

// Identifiers and exposed fields are owned here, never supplied by a request.
// Do not select password/token hashes, encrypted credentials, mail bodies or raw identity claims.
const sources: HistorySource[] = [
  { id: 'user', label: '사용자', table: 'cm_user_h', key: 'user_id', path: '/users', fields: ['user_name', 'display_name', 'role_code', 'is_active', 'memo'] },
  { id: 'auth-account', label: '로그인 계정', table: 'cm_user_auth_h', key: 'user_id', path: '/users', fields: ['login_id', 'account_status_code', 'login_fail_count', 'locked_until'] },
  { id: 'session', label: '세션', table: 'cm_user_session_h', key: 'session_id', path: '/users', fields: ['user_id', 'issued_app', 'expires_at', 'revoked_at', 'revoke_reason'] },
  { id: 'organization', label: '회사·조직', table: 'cm_organization_h', key: 'org_id', path: '/organizations', fields: ['org_code', 'org_name', 'org_type', 'org_class', 'parent_org_id', 'is_active', 'memo'] },
  { id: 'membership', label: '소속', table: 'cm_user_org_h', key: 'user_org_relation_id', path: '/organizations', fields: ['user_id', 'org_id', 'is_primary', 'is_leader', 'position_code', 'effective_from', 'effective_to', 'is_active', 'memo'] },
  { id: 'enrollment', label: '플랫폼 참여', table: 'cm_platform_enrollment_h', key: 'id', path: '/users', fields: ['user_id', 'status_code', 'source_code', 'is_active', 'memo'] },
  { id: 'service-grant', label: '서비스 이용권', table: 'cm_service_grant_h', key: 'id', path: '/applications', fields: ['user_id', 'org_id', 'service_code', 'role_code', 'scope_key', 'source_code', 'expires_at', 'is_active', 'memo'] },
  { id: 'role', label: '역할', table: 'cm_role_h', key: 'role_id', path: '/roles?tab=grants', fields: ['role_code', 'role_name', 'role_scope_code', 'is_active', 'memo'] },
  { id: 'permission', label: '권한 정의', table: 'cm_permission_h', key: 'permission_id', path: '/roles?tab=catalog', fields: ['permission_code', 'permission_name', 'is_active', 'memo'] },
  { id: 'role-permission', label: '역할 권한', table: 'cm_role_permission_h', key: 'role_permission_id', path: '/roles?tab=grants', fields: ['role_id', 'permission_id', 'is_active', 'memo'] },
  { id: 'organization-permission', label: '조직 권한', table: 'cm_org_permission_h', key: 'org_permission_id', path: '/roles?tab=organization-permissions', fields: ['org_id', 'permission_id', 'effective_from', 'effective_to', 'is_active', 'memo'] },
  { id: 'user-exception', label: '사용자 권한 예외', table: 'cm_user_permission_exception_h', key: 'user_permission_exception_id', path: '/roles?tab=user-permissions', fields: ['user_id', 'permission_id', 'exception_axis', 'effect_type', 'target_org_id', 'target_object_type', 'target_object_id', 'expires_at', 'is_active', 'reason', 'memo'] },
  { id: 'approval-authority', label: '승인 위임', table: 'cm_approval_authority_h', key: 'id', path: '/roles?tab=approval-authorities', fields: ['user_id', 'org_id', 'authority_kind', 'service_code', 'max_role_code', 'expires_at', 'is_active', 'memo'] },
  { id: 'request', label: '참여 신청', table: 'cm_onboarding_request_h', key: 'id', path: '/approvals', fields: ['user_id', 'kind', 'status_code', 'org_id', 'parent_org_id', 'resolved_org_id', 'service_code', 'message', 'decision_message', 'decided_by', 'decided_at'] },
  { id: 'code', label: '공통코드', table: 'cm_code_h', key: 'code_id', path: '/codes', fields: ['code_group', 'code_value', 'display_name_ko', 'display_name_en', 'parent_code', 'sort_order', 'is_active', 'description', 'memo'] },
  { id: 'auth-policy', label: '인증 정책', table: 'cm_auth_provider_setting_h', key: 'setting_key', path: '/auth', fields: ['password_login_enabled', 'password_reset_enabled', 'password_change_enabled', 'reset_code_ttl_minutes', 'reset_code_length', 'internal_sso_enabled', 'microsoft_login_enabled', 'microsoft_signup_request_enabled', 'self_signup_enabled', 'email_delivery_mode', 'allowed_tenant_ids', 'allowed_email_domains'] },
  { id: 'registration', label: '가입 신청', table: 'cm_user_registration_request_h', key: 'registration_request_id', path: '/auth', fields: ['provider_code', 'display_name', 'status_code', 'decided_at', 'decided_by_user_id', 'decision_memo', 'created_user_id'] },
  { id: 'password-reset', label: '비밀번호 복구', table: 'cm_user_password_reset_challenge_h', key: 'challenge_id', path: '/users', fields: ['user_id', 'expires_at', 'consumed_at', 'fail_count', 'locked_until'] },
  { id: 'email', label: '메일 전달', table: 'cm_auth_email_outbox_h', key: 'message_id', path: '/auth', fields: ['template_code', 'reference_type', 'reference_id', 'status_code', 'sent_at', 'failed_at', 'fail_reason'] },
];

interface EventRow {
  category: string; subject_id: string; history_sequence: string; event_type: string; event_at: Date;
  operator_user_id: string | null; source: string | null; activity: string | null; transaction_id: string | null;
  result: string; details: Record<string, string | null>;
}

const dateFields = new Set(['locked_until', 'expires_at', 'revoked_at', 'effective_from', 'effective_to', 'decided_at', 'consumed_at', 'sent_at', 'failed_at']);

function resultExpression(source: HistorySource) {
  const has = (field: string) => source.fields.includes(field);
  const status = ['status_code', 'account_status_code'].find(has);
  return `CASE WHEN h.event_type = 'D' THEN 'deleted' ELSE ${status ? `h.${status}::text` :
    has('revoked_at') ? "CASE WHEN h.revoked_at IS NOT NULL THEN 'revoked' ELSE h.event_type::text END" :
    has('consumed_at') ? "CASE WHEN h.consumed_at IS NOT NULL THEN 'consumed' ELSE h.event_type::text END" :
    has('is_active') ? "CASE WHEN h.is_active THEN 'active' ELSE 'inactive' END" : 'h.event_type::text'} END`;
}

@Injectable()
export class OperationHistoryService {
  constructor(private readonly db: DatabaseService) {}

  private source(id: string) {
    const source = sources.find(item => item.id === id);
    if (!source) throw new BadRequestException('지원하지 않는 공통 이력 분류입니다.');
    return source;
  }

  private select(source: HistorySource) {
    const fields = source.fields.map(field => `'${field}', h.${field}::text`).join(', ');
    return `SELECT '${source.id}'::text AS category, h.${source.key}::text AS subject_id, h.history_seq::text AS history_sequence,
      h.event_type::text AS event_type, h.event_at, COALESCE(h.updated_by, h.created_by)::text AS operator_user_id,
      h.last_source AS source, h.last_activity AS activity, h.transaction_id::text AS transaction_id,
      ${resultExpression(source)} AS result, jsonb_build_object(${fields}) AS details FROM common.${source.table} h`;
  }

  private event(row: EventRow): CommonOperationEvent {
    const source = this.source(row.category);
    // Prisma timestamp columns contain UTC even when PostgreSQL JSON omits an offset.
    const details = Object.fromEntries(Object.entries(row.details).map(([key, value]) => [key,
      value && dateFields.has(key) ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`).toISOString() : value,
    ]));
    return { id: `${row.category}:${row.subject_id}:${row.history_sequence}`, category: row.category, categoryLabel: source.label,
      subjectId: row.subject_id, historySequence: row.history_sequence, eventType: row.event_type, eventAt: row.event_at.toISOString(),
      operatorUserId: row.operator_user_id, source: row.source, activity: row.activity, transactionId: row.transaction_id,
      result: row.result, details, programPath: source.path };
  }

  async list(query: OperationHistoryQueryDto): Promise<CommonOperationHistoryPage> {
    const chosen = query.category ? [this.source(query.category)] : sources;
    for (const id of [query.userId, query.organizationId, query.operatorUserId, query.roleId]) if (id) participationId(id);
    if (query.from && query.to && new Date(query.from) >= new Date(query.to)) throw new BadRequestException('조회 시작은 종료 시각보다 빨라야 합니다.');
    const parameters: Array<string | number | Date> = [];
    const bind = (value: string | number | Date) => { parameters.push(value); return `$${parameters.length}`; };
    const snapshotAt = query.asOf ? new Date(query.asOf) : new Date();
    const conditions: string[] = [`h.event_at <= ${bind(snapshotAt)}`];
    if (query.from) conditions.push(`h.event_at >= ${bind(new Date(query.from))}`);
    if (query.to) conditions.push(`h.event_at < ${bind(new Date(query.to))}`);
    if (query.operatorUserId) conditions.push(`COALESCE(h.updated_by, h.created_by) = ${bind(query.operatorUserId)}::bigint`);
    const user = query.userId ? bind(query.userId) : null;
    const organization = query.organizationId ? bind(query.organizationId) : null;
    const role = query.roleId ? bind(query.roleId) : null;
    const result = query.result ? bind(query.result) : null;
    const subject = query.subjectId ? bind(query.subjectId) : null;
    const union = chosen.map(source => {
      const matchColumns = (columns: string[], value: string) => {
        const present = columns.filter(column => source.fields.includes(column) || source.key === column);
        return present.length ? `(${present.map(column => `h.${column} = ${value}::bigint`).join(' OR ')})` : `(FALSE AND ${value}::bigint IS NOT NULL)`;
      };
      const filters = [...conditions,
        // The complete audit trail stays available. Apply the same scope before
        // both COUNT and pagination; never hide rows only in the browser.
        ...(query.scope === 'business' && !query.category && source.id === 'session' ? ['FALSE'] : []),
        // Automatic login updates can retain an earlier administrator's actor ID.
        // Their generic activity must not masquerade as that administrator's change.
        ...(query.scope === 'business' && !query.category && source.id === 'auth-account' ? ["COALESCE(h.updated_by, h.created_by) IS NOT NULL AND COALESCE(h.last_activity, '') NOT IN ('UserAuth.update', 'UserAuth.updateMany')"] : []),
        ...(user ? [matchColumns(['user_id', 'created_user_id'], user)] : []),
        ...(organization ? [matchColumns(['org_id', 'parent_org_id', 'resolved_org_id', 'target_org_id'], organization)] : []),
        ...(role ? [matchColumns(['role_id'], role)] : []),
        ...(result ? [`${resultExpression(source)} = ${result}`] : []),
        ...(subject ? [`h.${source.key}::text = ${subject}`] : []),
      ];
      return `${this.select(source)} WHERE ${filters.join(' AND ')}`;
    }).join(' UNION ALL ');
    const countParameters = [...parameters];
    const limit = bind(query.pageSize);
    const offset = bind((query.page - 1) * query.pageSize);
    const [rows, count] = await Promise.all([
      this.db.client.$queryRawUnsafe<EventRow[]>(`SELECT * FROM (${union}) events ORDER BY event_at DESC, category, subject_id, history_sequence::bigint DESC LIMIT ${limit} OFFSET ${offset}`, ...parameters),
      this.db.client.$queryRawUnsafe<Array<{ total: bigint }>>(`SELECT COUNT(*) AS total FROM (${union}) events`, ...countParameters),
    ]);
    return { snapshotAt: snapshotAt.toISOString(), items: rows.map(row => this.event(row)), total: Number(count[0].total), page: query.page, pageSize: query.pageSize,
      categories: sources.map(source => ({ id: source.id, label: source.label })) };
  }

  async detail(category: string, subjectId: string, sequence: string): Promise<CommonOperationHistoryDetail> {
    const source = this.source(category);
    const seq = participationId(sequence);
    if (!subjectId || subjectId.length > 200) throw new BadRequestException('대상 식별자를 확인해 주세요.');
    const rows = await this.db.client.$queryRawUnsafe<EventRow[]>(`${this.select(source)}
      WHERE h.${source.key}::text = $1 AND h.history_seq <= $2::bigint ORDER BY h.history_seq DESC LIMIT 2`, subjectId, seq);
    if (!rows[0] || rows[0].history_sequence !== sequence) throw new NotFoundException('이력 기록을 찾을 수 없습니다.');
    const current = this.event(rows[0]);
    const previous = rows[1] ? this.event(rows[1]) : null;
    return { current, previous, changedFields: Object.keys(current.details).filter(key => current.details[key] !== previous?.details[key]) };
  }
}
