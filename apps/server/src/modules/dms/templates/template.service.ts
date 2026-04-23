import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { personalSettingsService } from '../runtime/personal-settings.service.js';
import { normalizePath } from '../runtime/path-utils.js';
import type {
  TemplateGeneration,
  TemplateItem,
  TemplateOriginType,
  TemplateReferenceDoc,
  TemplateScope,
  TemplateSourceType,
  TemplateStatus,
  TemplateVisibility,
} from '@ssoo/types/dms';
import type { TemplateMetadataRecord } from './template.types.js';

function getTemplateRoot(): string {
  return configService.getTemplateDir();
}

function getSystemTemplateDir(): string {
  return path.join(getTemplateRoot(), 'system');
}

function getPersonalTemplateDir(): string {
  return path.join(getTemplateRoot(), 'personal');
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureTemplateRoots(): void {
  ensureDir(getTemplateRoot());
  ensureDir(getSystemTemplateDir());
  ensureDir(getPersonalTemplateDir());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  ));
}

function normalizeTemplateScope(value: unknown): TemplateScope {
  return value === 'global' ? 'global' : 'personal';
}

function normalizeTemplateKind(value: unknown): TemplateItem['kind'] {
  return value === 'folder' ? 'folder' : 'document';
}

function normalizeTemplateVisibility(value: unknown, scope: TemplateScope): TemplateVisibility {
  if (value === 'shared' || value === 'public' || value === 'private') {
    return value;
  }

  return scope === 'global' ? 'shared' : 'private';
}

function normalizeTemplateStatus(value: unknown): TemplateStatus {
  return value === 'archived' ? 'archived' : 'active';
}

function normalizeTemplateSourceType(_value: unknown): TemplateSourceType {
  return 'markdown-file';
}

function normalizeTemplateOriginType(value: unknown): TemplateOriginType | undefined {
  return value === 'generated' || value === 'referenced'
    ? value
    : undefined;
}

function normalizeReferenceDocuments(value: unknown): TemplateReferenceDoc[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const referencePath = normalizeOptionalString(entry.path);
    if (!referencePath) {
      return [];
    }

    const source = entry.source === 'manual'
      || entry.source === 'picker'
      || entry.source === 'assistant'
      || entry.source === 'current-document'
      || entry.source === 'template-selected'
      ? entry.source
      : undefined;
    const kind = entry.kind === 'document' || entry.kind === 'file'
      ? entry.kind
      : undefined;
    const storage = entry.storage === 'path' || entry.storage === 'inline'
      ? entry.storage
      : undefined;

    return [{
      path: referencePath,
      title: normalizeOptionalString(entry.title),
      source,
      kind,
      provider: normalizeOptionalString(entry.provider),
      mimeType: normalizeOptionalString(entry.mimeType),
      size: typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : undefined,
      storage,
      textContent: normalizeOptionalString(entry.textContent),
      tempId: normalizeOptionalString(entry.tempId),
    }];
  });
}

function normalizeGeneration(value: unknown): TemplateGeneration | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const source = value.source === 'ai' || value.source === 'manual'
    ? value.source
    : null;
  if (!source) {
    return undefined;
  }

  return {
    source,
    taskKey: normalizeOptionalString(value.taskKey),
    profileKey: normalizeOptionalString(value.profileKey),
  };
}

function resolveOwnerRef(scope: TemplateScope, userId: string): string {
  const trimmedUserId = userId.trim();
  if (scope === 'global') {
    return 'system';
  }

  return trimmedUserId || 'anonymous';
}

function resolveAuthor(requestAuthor?: string): string {
  const normalizedRequestAuthor = requestAuthor?.trim();
  if (normalizedRequestAuthor) {
    return normalizedRequestAuthor;
  }

  const gitAuthorName = personalSettingsService.getAuthorIdentity().name?.trim();
  if (gitAuthorName) {
    return gitAuthorName;
  }

  return 'Unknown';
}

function getTemplateRelativePath(scope: TemplateScope, id: string): string {
  return normalizePath(path.join(scope === 'global' ? 'system' : 'personal', `${id}.md`));
}

function getTemplateAbsolutePath(relativePath: string): string {
  return path.join(getTemplateRoot(), relativePath);
}

function normalizeMetadataRecord(
  value: Prisma.JsonValue | null | undefined,
): TemplateMetadataRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const scope = normalizeTemplateScope(value.scope);
  const kind = normalizeTemplateKind(value.kind);
  return {
    id: normalizeOptionalString(value.id) ?? '',
    name: normalizeOptionalString(value.name) ?? '',
    description: normalizeOptionalString(value.description),
    summary: normalizeOptionalString(value.summary),
    tags: normalizeStringArray(value.tags),
    createdAt: normalizeOptionalString(value.createdAt),
    updatedAt: normalizeOptionalString(value.updatedAt) ?? new Date(0).toISOString(),
    author: normalizeOptionalString(value.author),
    lastModifiedBy: normalizeOptionalString(value.lastModifiedBy),
    scope,
    kind,
    ownerId: normalizeOptionalString(value.ownerId) ?? resolveOwnerRef(scope, ''),
    visibility: normalizeTemplateVisibility(value.visibility, scope),
    status: normalizeTemplateStatus(value.status),
    sourceType: normalizeTemplateSourceType(value.sourceType),
    originType: normalizeTemplateOriginType(value.originType),
    referenceDocuments: normalizeReferenceDocuments(value.referenceDocuments),
    generation: normalizeGeneration(value.generation),
  };
}

const TEMPLATE_LAST_SOURCE = 'dms.templates';

const DEFAULT_SYSTEM_TEMPLATES: Array<Omit<TemplateItem, 'updatedAt'>> = [
  {
    id: 'system-doc-default',
    name: '기본 문서 템플릿',
    description: '요약/배경/핵심 내용/액션 아이템 구조',
    scope: 'global',
    kind: 'document',
    content: '# 제목\n\n## 배경\n\n## 핵심 내용\n\n## 액션 아이템\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
    originType: 'generated',
    referenceDocuments: [],
    generation: { source: 'manual' },
  },
  {
    id: 'system-folder-default',
    name: '기본 폴더 구조 템플릿',
    description: '주제 기준의 표준 폴더 구조',
    scope: 'global',
    kind: 'folder',
    content: 'project/\n  docs/\n  references/\n  decisions/\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
    originType: 'generated',
    referenceDocuments: [],
    generation: { source: 'manual' },
  },
];

interface LegacyTemplateSeed {
  ownerRef: string;
  relativePath: string;
  updatedAt: string;
  content: string;
  template: Omit<TemplateItem, 'content' | 'updatedAt'>;
}

const LEGACY_TEMPLATE_SEEDS: LegacyTemplateSeed[] = [
  {
    ownerRef: 'anonymous',
    relativePath: getTemplateRelativePath('personal', 'tpl-6b582033'),
    updatedAt: '2026-04-02T00:49:38.194Z',
    content: `## 📋 리팩토링 v{{버전}} 개요

이 폴더는 {{시스템명}}의 주요 리팩토링 작업을 문서화합니다.  
<!-- 가이드: 여기에 프로젝트 또는 시스템명을 입력 -->

---

## 🗂️ 주요 기능 및 개선 요구사항

- **이미지 붙여넣기**: 파일 드래그 앤 드롭으로 이미지 첨부
- **버전 관리**: 버전 히스토리, 내보내기, PPT 변환, 시각화 변환 지원
- **권한 및 공개 범위**: 로그인/권한 기능, 문서명 상단에 공개 범위 지정
- **태그 관리**: 태그 선택 및 \`#태그\` 검색, 태그 검색 기능 추가
- **템플릿 관리**: 설정 화면에서 별도 진입, 템플릿 마켓플레이스, 공개 범위에 따라 내 템플릿 지정 가능
- **설정 페이지**: JSON 뷰어 정의(추후 확정)
- **UI/UX 개선**: 스크롤 올릴 때 하단 이동 버튼, 플로팅 챗봇 핀 버튼(아웃사이드 클릭 시 닫히지 않음)
- **파일 및 첨부 관리**: 시스템 어드민이 실제 파일명, 첨부 파일 등 관리 가능
- **확장성**: 위키, 블로그, 커뮤니티 보드, 개발 문서 자동화 등
- **에러 처리**: 각종 에러 페이지, 되돌리기 등 프로세스 구현
- **랜딩페이지 및 테스트**: 랜딩페이지, 테스트 프레임워크
- **외부 연동**: MS OAuth, NAS 파일 마이그레이션 기능

---

## 📁 폴더 구조

\`\`\`
{{refactoring_root}}/
├── README.md          # 리팩토링 개요 (이 파일)
├── goals.md           # 리팩토링 목표와 전체 계획
└── phases/            # 페이즈별 실행 결과
    ├── phase1/        # Phase 1: 기반 구조 구축
    ├── phase2/        # Phase 2: 핵심 컴포넌트 분할
    ├── phase3/        # Phase 3: 로직 추출 및 최적화
    └── phase4/        # Phase 4: 문서화 및 정리
\`\`\`
<!-- 가이드: 실제 폴더 경로와 구조를 입력 -->

---

## 🎯 리팩토링 목적 및 배경

### 현재 문제점

- **{{문제1}}**: {{주요 컴포넌트}}가 지나치게 대형화되어 있음
- **복잡한 상태 관리**: 여러 개의 상태 훅이 한 곳에 집중
- **책임 분리 부족**: 단일 컴포넌트에 과도한 역할 집중
- **코드 중복**: 동일 로직이 여러 위치에 반복

<!-- 가이드: 실제 컴포넌트명, 상태 관리 이슈 등 구체적으로 입력 -->

### 리팩토링 목표

1. **단일 책임 원칙 준수**: 컴포넌트별 명확한 역할 분담
2. **코드 재사용성 향상**: 공통 로직의 훅/유틸리티화
3. **유지보수성 개선**: 복잡도 감소 및 의존성 관리
4. **타입 안정성 강화**: 중앙화된 타입 정의

---

## 🚀 실행 전략

### 안전성 우선

- 단계별 적용 및 점진적 마이그레이션
- 각 단계별 기능 테스트 및 빌드 검증
- Git 커밋 세분화로 롤백 지점 확보
- 기존 코드와 신규 코드 병행 운영

### 품질 보증

- 각 페이즈 완료 후 전체 기능 테스트
- 성능 벤치마크 유지
- 개발 표준 준수 및 문서 동기화

---

## 📊 진행 상황

| Phase | 상태 | 시작일 | 완료일 | 설명 |
| --- | --- | --- | --- | --- |
| Phase 1 | {{phase1_status}} | {{phase1_start}} | {{phase1_end}} | 기반 구조 구축 |
| ├─ Phase 1.1 | {{phase1_1_status}} | {{phase1_1_start}} | {{phase1_1_end}} | 타입 시스템 중앙화 |
| ├─ Phase 1.2 | {{phase1_2_status}} | {{phase1_2_start}} | {{phase1_2_end}} | API 레이어 추상화 |
| ├─ Phase 1.3 | {{phase1_3_status}} | {{phase1_3_start}} | {{phase1_3_end}} | 공통 유틸리티 추출 |
| Phase 2 | {{phase2_status}} | {{phase2_start}} | {{phase2_end}} | 핵심 컴포넌트 분할 |
| ├─ Phase 2.1 | {{phase2_1_status}} | {{phase2_1_start}} | {{phase2_1_end}} | Context 상태 관리 구축 |
| ├─ Phase 2.2 | {{phase2_2_status}} | {{phase2_2_start}} | {{phase2_2_end}} | Sidebar 컴포넌트 분리 |
| ├─ Phase 2.3 | {{phase2_3_status}} | {{phase2_3_start}} | {{phase2_3_end}} | Editor 컴포넌트 분리 |
| ├─ Phase 2.4 | {{phase2_4_status}} | {{phase2_4_start}} | {{phase2_4_end}} | Modals 컴포넌트 분리 |
| └─ Phase 2.5 | {{phase2_5_status}} | {{phase2_5_start}} | {{phase2_5_end}} | App 리팩토링 |
| Phase 3 | {{phase3_status}} | {{phase3_start}} | {{phase3_end}} | 로직 추출 및 최적화 |
| ├─ Phase 3.1 | {{phase3_1_status}} | {{phase3_1_start}} | {{phase3_1_end}} | 커스텀 훅 추출 |
| ├─ Phase 3.2 | {{phase3_2_status}} | {{phase3_2_start}} | {{phase3_2_end}} | 성능 최적화 |
| ├─ Phase 3.3 | {{phase3_3_status}} | {{phase3_3_start}} | {{phase3_3_end}} | 타입 시스템 강화 |
| └─ Phase 3.5 | {{phase3_5_status}} | {{phase3_5_start}} | {{phase3_5_end}} | 안정화 및 검증 |
| Phase 4 | {{phase4_status}} | {{phase4_start}} | {{phase4_end}} | Context 통합 및 최종 정리 |

<!-- 가이드: 각 단계별 상태, 날짜, 설명을 입력 -->

---

## 🏆 주요 성과 요약

| Phase | 주요 성과 |
| --- | --- |
| Phase 1 | 타입 안전성 강화, 서비스 레이어 구축, 점진적 마이그레이션, 개발 서버 검증 |
| Phase 2 | 컴포넌트 분할, 단일 책임 원칙 적용, 상태 관리 중앙화, 코드 재사용성 개선 |
| Phase 3 | 커스텀 훅 구현, 성능 최적화, 타입 시스템 강화, 통합 및 빌드 검증 |
| Phase 3.5 | 종합 검증, 이슈 식별, 전략적 판단, Phase 4 준비 |

---

## 🔄 다음 단계 (Phase 4)

### 목표: Context 통합 및 최종 정리

#### 1. Context 통합 (고우선순위)
- TreeDataContext 활성화
- 중복 상태 제거 및 컴포넌트 업데이트
- 통합 테스트 및 검증

#### 2. 통합 테스트 (고우선순위)
- 전체 기능 및 성능 테스트
- 크로스 브라우저 검증

#### 3. 문서화 완료 (중우선순위)
- 개발 문서, 아키텍처 다이어그램, 마이그레이션 가이드 작성

#### 4. Phase 4 완료 검증 (고우선순위)
- 최종 빌드 및 성능 벤치마크
- 문서 완성도 점검

> **참고**: Split View UI 및 useAutoScroll은 현재 미리보기 모달이 정상 동작하므로 제외

---

## 📅 마지막 업데이트

- **일자**: {{최종_업데이트_일자}}
- **작성자**: {{작성자}}
- **관련 문서**:
    - [리팩토링 목표와 계획](./goals.md)
    - [개발 표준 가이드](../../DEVELOPMENT_STANDARDS.md)
    - [API 문서](../../api.md)
    - [컴포넌트 가이드](../../components.md)
    - [Phase 3 종합 보고서](./phases/phase3/phase3-overall-summary.md)
    - [Phase 3.5 완료 보고서](./phases/phase3/phase3.5-completion-report.md)

---

\`\`\`livepreview
**⚠️ 주의사항**: 본 리팩토링은 기존 기능을 보존하면서 코드 품질을 개선하는 것이 목표입니다. 모든 변경사항은 개발 표준과 기능 명세를 준수해야 합니다.
\`\`\`
<!-- 가이드: 필요 시 이미지, 표, 다이어그램, 인용 블록 등 마크다운 요소를 추가하여 문서 완성도를 높이세요 -->
`,
    template: {
      id: 'tpl-6b582033',
      name: '1stTest',
      description: '',
      summary: '',
      tags: [
        '리팩토링',
        '프로젝트 관리',
        '개발 문서',
        '진행 보고서',
        '컴포넌트 설계',
      ],
      createdAt: '2026-04-02T00:49:38.194Z',
      author: 'anonymous',
      lastModifiedBy: 'anonymous',
      scope: 'personal',
      kind: 'document',
      ownerId: 'anonymous',
      visibility: 'private',
      status: 'active',
      sourceType: 'markdown-file',
      originType: 'referenced',
      referenceDocuments: [
        {
          path: 'README (1).md',
          title: '리팩토링 개요',
          source: 'current-document',
          kind: 'document',
        },
      ],
      generation: {
        source: 'ai',
        taskKey: 'document-to-template',
      },
    },
  },
];

interface TemplateListFilter {
  scope?: TemplateScope;
  originType?: TemplateOriginType;
}

interface SaveTemplateInput extends Omit<TemplateItem, 'id' | 'updatedAt'> {
  id?: string;
}

interface TemplateRow {
  templateId: bigint;
  templateKey: string;
  relativePath: string;
  templateScopeCode: string;
  templateKindCode: string;
  ownerRef: string;
  visibilityCode: string;
  templateStatusCode: string;
  sourceTypeCode: string;
  originTypeCode: string | null;
  metadataJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TemplateService {
  constructor(private readonly db: DatabaseService) {}

  private async ensureRoots(): Promise<void> {
    ensureTemplateRoots();
    await this.ensureDefaultSystemTemplates();
    await this.ensureLegacyTemplateSeeds();
  }

  private async ensureDefaultSystemTemplates(): Promise<void> {
    for (const template of DEFAULT_SYSTEM_TEMPLATES) {
      const relativePath = getTemplateRelativePath('global', template.id);
      const absolutePath = getTemplateAbsolutePath(relativePath);
      if (!fs.existsSync(absolutePath)) {
        ensureDir(path.dirname(absolutePath));
        fs.writeFileSync(absolutePath, template.content, 'utf-8');
      }

      const existing = await this.findTemplateRow(template.id, 'global', 'system');
      if (existing) {
        continue;
      }

      const createdAt = new Date(0).toISOString();
      const metadata = this.buildMetadataRecord(
        {
          ...template,
          id: template.id,
          summary: '',
          tags: [],
          createdAt,
          author: 'system',
          lastModifiedBy: 'system',
        },
        null,
        'system',
        createdAt,
        createdAt,
        'system',
      );
      await this.db.client.dmsTemplate.create({
        data: {
          templateKey: template.id,
          relativePath,
          templateScopeCode: 'global',
          templateKindCode: template.kind,
          ownerRef: 'system',
          visibilityCode: metadata.visibility,
          templateStatusCode: metadata.status,
          sourceTypeCode: metadata.sourceType,
          originTypeCode: metadata.originType ?? null,
          metadataJson: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
          lastSource: TEMPLATE_LAST_SOURCE,
          lastActivity: 'dms.templates.ensure-default',
        },
      });
    }
  }

  private async ensureLegacyTemplateSeeds(): Promise<void> {
    for (const seed of LEGACY_TEMPLATE_SEEDS) {
      const absolutePath = getTemplateAbsolutePath(seed.relativePath);
      if (!fs.existsSync(absolutePath)) {
        ensureDir(path.dirname(absolutePath));
        fs.writeFileSync(absolutePath, seed.content, 'utf-8');
      }

      const existing = await this.findTemplateRow(
        seed.template.id,
        seed.template.scope,
        seed.ownerRef,
      );
      if (existing) {
        continue;
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const metadata = this.buildMetadataRecord(
        {
          ...seed.template,
          id: seed.template.id,
          content,
        },
        null,
        seed.ownerRef,
        seed.template.createdAt ?? seed.updatedAt,
        seed.updatedAt,
        seed.template.lastModifiedBy ?? seed.template.author ?? seed.ownerRef,
      );

      await this.db.client.dmsTemplate.create({
        data: {
          templateKey: seed.template.id,
          relativePath: seed.relativePath,
          templateScopeCode: metadata.scope,
          templateKindCode: metadata.kind,
          ownerRef: seed.ownerRef,
          visibilityCode: metadata.visibility,
          templateStatusCode: metadata.status,
          sourceTypeCode: metadata.sourceType,
          originTypeCode: metadata.originType ?? null,
          metadataJson: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
          lastSource: TEMPLATE_LAST_SOURCE,
          lastActivity: 'dms.templates.ensure-legacy-seed',
        },
      });
    }
  }

  async get(id: string, scope: TemplateScope, userId = 'anonymous'): Promise<TemplateItem | null> {
    await this.ensureRoots();

    const row = await this.findTemplateRow(id, scope, resolveOwnerRef(scope, userId));
    if (!row) {
      return null;
    }

    return this.toTemplateItem(row);
  }

  async list(
    userId = 'anonymous',
    filter?: TemplateListFilter,
  ): Promise<{ global: TemplateItem[]; personal: TemplateItem[] }> {
    await this.ensureRoots();

    const [globalRows, personalRows] = await Promise.all([
      this.db.client.dmsTemplate.findMany({
        where: {
          templateScopeCode: 'global',
          ownerRef: 'system',
          isActive: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { templateKey: 'asc' }],
        select: this.templateRowSelect(),
      }),
      this.db.client.dmsTemplate.findMany({
        where: {
          templateScopeCode: 'personal',
          ownerRef: resolveOwnerRef('personal', userId),
          isActive: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { templateKey: 'asc' }],
        select: this.templateRowSelect(),
      }),
    ]);

    const global = globalRows
      .map((row) => this.toTemplateItem(row))
      .filter((item): item is TemplateItem => item !== null);
    const personal = personalRows
      .map((row) => this.toTemplateItem(row))
      .filter((item): item is TemplateItem => item !== null);

    return {
      global: this.applyListFilter(global, 'global', filter),
      personal: this.applyListFilter(personal, 'personal', filter),
    };
  }

  async listByReferenceDocument(docPath: string, userId = 'anonymous'): Promise<TemplateItem[]> {
    const templates = await this.list(userId);

    return [...templates.global, ...templates.personal]
      .filter((item) => (
        (item.referenceDocuments ?? []).some((reference) => reference.path === docPath)
      ))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async save(template: SaveTemplateInput, userId = 'anonymous', requestAuthor?: string): Promise<TemplateItem> {
    await this.ensureRoots();

    const now = new Date().toISOString();
    const nextId = template.id?.trim() || `tpl-${crypto.randomBytes(4).toString('hex')}`;
    const scope = template.scope;
    const ownerRef = resolveOwnerRef(scope, userId);
    const relativePath = getTemplateRelativePath(scope, nextId);
    const absolutePath = getTemplateAbsolutePath(relativePath);
    const existing = await this.findTemplateRow(nextId, scope, ownerRef);
    const existingMetadata = normalizeMetadataRecord(existing?.metadataJson);
    const author = resolveAuthor(requestAuthor);
    const createdAt = template.createdAt ?? existingMetadata?.createdAt ?? now;
    const metadata = this.buildMetadataRecord(
      {
        ...template,
        id: nextId,
        scope,
        kind: template.kind,
        name: template.name,
        content: template.content,
      },
      existingMetadata,
      ownerRef,
      createdAt,
      now,
      author,
    );

    ensureDir(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, template.content, 'utf-8');

    const payload = {
      relativePath,
      templateScopeCode: metadata.scope,
      templateKindCode: metadata.kind,
      ownerRef,
      visibilityCode: metadata.visibility,
      templateStatusCode: metadata.status,
      sourceTypeCode: metadata.sourceType,
      originTypeCode: metadata.originType ?? null,
      metadataJson: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
      isActive: true,
      lastSource: TEMPLATE_LAST_SOURCE,
      lastActivity: existing ? 'dms.templates.save.update' : 'dms.templates.save.create',
    } satisfies Omit<Prisma.DmsTemplateUncheckedCreateInput, 'templateKey'> & { templateKey?: string };

    const row = existing
      ? await this.db.client.dmsTemplate.update({
          where: { templateId: existing.templateId },
          data: payload,
          select: this.templateRowSelect(),
        })
      : await this.db.client.dmsTemplate.create({
          data: {
            templateKey: nextId,
            ...payload,
          },
          select: this.templateRowSelect(),
        });

    return this.toTemplateItem(row, template.content) ?? {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      summary: metadata.summary,
      tags: metadata.tags,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      author: metadata.author,
      lastModifiedBy: metadata.lastModifiedBy,
      scope: metadata.scope,
      kind: metadata.kind,
      content: template.content,
      ownerId: metadata.ownerId,
      visibility: metadata.visibility,
      status: metadata.status,
      sourceType: metadata.sourceType,
      sourcePath: relativePath,
      originType: metadata.originType,
      referenceDocuments: metadata.referenceDocuments,
      generation: metadata.generation,
    };
  }

  async remove(id: string, scope: TemplateScope, userId = 'anonymous'): Promise<boolean> {
    await this.ensureRoots();

    const ownerRef = resolveOwnerRef(scope, userId);
    const row = await this.findTemplateRow(id, scope, ownerRef);
    const absolutePath = getTemplateAbsolutePath(getTemplateRelativePath(scope, id));

    let removed = false;
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      removed = true;
    }

    if (row) {
      await this.db.client.dmsTemplate.delete({
        where: { templateId: row.templateId },
      });
      removed = true;
    }

    return removed;
  }

  private templateRowSelect() {
    return {
      templateId: true,
      templateKey: true,
      relativePath: true,
      templateScopeCode: true,
      templateKindCode: true,
      ownerRef: true,
      visibilityCode: true,
      templateStatusCode: true,
      sourceTypeCode: true,
      originTypeCode: true,
      metadataJson: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }

  private async findTemplateRow(
    id: string,
    scope: TemplateScope,
    ownerRef: string,
  ): Promise<TemplateRow | null> {
    return this.db.client.dmsTemplate.findFirst({
      where: {
        templateKey: id,
        templateScopeCode: scope,
        ownerRef,
      },
      select: this.templateRowSelect(),
    });
  }

  private applyListFilter(
    items: TemplateItem[],
    scope: TemplateScope,
    filter?: TemplateListFilter,
  ): TemplateItem[] {
    return items.filter((item) => {
      if (filter?.scope && filter.scope !== scope) {
        return false;
      }
      if (filter?.originType && item.originType !== filter.originType) {
        return false;
      }
      return true;
    });
  }

  private toTemplateItem(row: TemplateRow, contentOverride?: string): TemplateItem | null {
    const metadata = normalizeMetadataRecord(row.metadataJson);
    const absolutePath = getTemplateAbsolutePath(row.relativePath);
    const content = contentOverride ?? (
      fs.existsSync(absolutePath)
        ? fs.readFileSync(absolutePath, 'utf-8')
        : null
    );
    if (content === null) {
      return null;
    }

    const scope = normalizeTemplateScope(row.templateScopeCode);
    const kind = normalizeTemplateKind(row.templateKindCode);
    return {
      id: row.templateKey,
      name: metadata?.name || row.templateKey,
      description: metadata?.description,
      summary: metadata?.summary ?? '',
      tags: metadata?.tags ?? [],
      createdAt: metadata?.createdAt ?? row.createdAt.toISOString(),
      updatedAt: metadata?.updatedAt ?? row.updatedAt.toISOString(),
      author: metadata?.author,
      lastModifiedBy: metadata?.lastModifiedBy,
      scope,
      kind,
      content,
      ownerId: metadata?.ownerId ?? row.ownerRef,
      visibility: metadata?.visibility ?? normalizeTemplateVisibility(row.visibilityCode, scope),
      status: metadata?.status ?? normalizeTemplateStatus(row.templateStatusCode),
      sourceType: metadata?.sourceType ?? normalizeTemplateSourceType(row.sourceTypeCode),
      sourcePath: normalizePath(row.relativePath),
      originType: metadata?.originType ?? normalizeTemplateOriginType(row.originTypeCode),
      referenceDocuments: metadata?.referenceDocuments ?? [],
      generation: metadata?.generation,
    };
  }

  private buildMetadataRecord(
    template: SaveTemplateInput & { id: string },
    existing: TemplateMetadataRecord | null,
    ownerRef: string,
    createdAt: string,
    updatedAt: string,
    author: string,
  ): TemplateMetadataRecord {
    const scope = template.scope;
    const kind = template.kind;
    return {
      id: template.id,
      name: template.name,
      description: template.description ?? existing?.description,
      summary: template.summary ?? existing?.summary ?? '',
      tags: template.tags ?? existing?.tags ?? [],
      createdAt,
      updatedAt,
      author: existing?.author ?? author,
      lastModifiedBy: author,
      scope,
      kind,
      ownerId: template.ownerId ?? existing?.ownerId ?? ownerRef,
      visibility: normalizeTemplateVisibility(
        template.visibility ?? existing?.visibility,
        scope,
      ),
      status: normalizeTemplateStatus(template.status ?? existing?.status),
      sourceType: normalizeTemplateSourceType(template.sourceType ?? existing?.sourceType),
      originType: normalizeTemplateOriginType(template.originType ?? existing?.originType),
      referenceDocuments: normalizeReferenceDocuments(
        template.referenceDocuments ?? existing?.referenceDocuments ?? [],
      ),
      generation: normalizeGeneration(template.generation ?? existing?.generation),
    };
  }
}
