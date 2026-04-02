import type { AiTaskKey, AiTaskProfile } from './types';

const DOCUMENT_TO_TEMPLATE_PERSONA = `당신은 SI/IT 프로젝트 환경에서 문서를 재사용 가능한 템플릿으로 재구성하는 전문 편집자입니다.
원본 문서의 구조와 의도를 보존하되, 고유명사와 일회성 정보는 템플릿 플레이스홀더로 일반화합니다.`;

const DOCUMENT_TO_TEMPLATE_INSTRUCTIONS = `[템플릿 변환 규칙]
- 원본 문서의 핵심 섹션 구조와 흐름을 유지합니다.
- 사람 이름, 프로젝트명, 날짜, 수치, 식별자 등 일회성 정보는 {{플레이스홀더}}로 치환합니다.
- 재사용 시 작성자가 참고할 수 있도록 필요한 위치에 HTML 주석 형식의 가이드(예: <!-- 가이드: 여기에 프로젝트 목표를 입력 -->)를 추가할 수 있습니다.
- 템플릿은 실사용 가능한 마크다운 문서여야 하며, 원본 문서 설명이나 변환 해설은 포함하지 않습니다.
- 확정되지 않은 정보는 일반화하고, 추정해서 새 사실을 만들지 않습니다.`;

const DEFAULT_PROFILES: Record<AiTaskKey, AiTaskProfile> = {
  'document-to-template': {
    taskKey: 'document-to-template',
    name: '문서 템플릿 변환',
    description: '기존 문서를 재사용 가능한 템플릿 마크다운으로 변환합니다.',
    persona: DOCUMENT_TO_TEMPLATE_PERSONA,
    instructions: DOCUMENT_TO_TEMPLATE_INSTRUCTIONS,
    sharedSections: ['WRITING_QUALITY', 'MARKDOWN_FORMAT_GUIDE', 'OUTPUT_RULES'],
    modelOptions: {
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
};

export function getDefaultProfile(key: AiTaskKey): AiTaskProfile {
  return DEFAULT_PROFILES[key];
}

export function listDefaultProfiles(): AiTaskProfile[] {
  return Object.values(DEFAULT_PROFILES);
}
