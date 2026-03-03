export interface AssistantHelpAction {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: 'Bot' | 'FileText' | 'Settings' | 'BookOpen';
}

export interface AssistantHelpResponse {
  summary: string;
  actions: AssistantHelpAction[];
}

const HELP_ACTIONS = {
  search: {
    id: 'help-search',
    title: 'AI 검색 열기',
    description: '키워드로 문서를 검색하고 관련 파일을 찾습니다.',
    path: '/ai/search',
    icon: 'Bot',
  },
  newDoc: {
    id: 'help-new-doc',
    title: 'AI 문서 작성 열기',
    description: '새 문서에서 인라인 AI 지시로 문서를 작성/수정합니다.',
    path: '/wiki/new',
    icon: 'FileText',
  },
  settings: {
    id: 'help-settings',
    title: '설정 열기',
    description: '시스템 설정과 환경 구성을 확인합니다.',
    path: '/settings',
    icon: 'Settings',
  },
  docs: {
    id: 'help-docs',
    title: '문서 보기',
    description: '좌측 파일 트리에서 문서를 열어 내용을 확인합니다.',
    path: '/home',
    icon: 'BookOpen',
  },
} satisfies Record<string, AssistantHelpAction>;

function selectActions(input: string): AssistantHelpAction[] {
  const text = input.toLowerCase();
  const actions: AssistantHelpAction[] = [];

  if (/(검색|search|찾아)/i.test(text)) {
    actions.push(HELP_ACTIONS.search);
  }
  if (/(ai 작성|작성|요약|create|생성)/i.test(text)) actions.push(HELP_ACTIONS.newDoc);
  if (/(새 문서|직접 작성|편집|에디터|wiki\/new)/i.test(text)) {
    actions.push(HELP_ACTIONS.newDoc);
  }
  if (/(설정|환경변수|토큰|api key|api키|entra)/i.test(text)) {
    actions.push(HELP_ACTIONS.settings);
  }
  if (/(문서|파일|트리|목록|어디서 봐)/i.test(text)) {
    actions.push(HELP_ACTIONS.docs);
  }

  if (actions.length === 0) {
    return [HELP_ACTIONS.search, HELP_ACTIONS.newDoc, HELP_ACTIONS.settings];
  }

  const deduped = new Map(actions.map((action) => [action.id, action]));
  if (deduped.size < 2) {
    deduped.set(HELP_ACTIONS.search.id, HELP_ACTIONS.search);
    deduped.set(HELP_ACTIONS.newDoc.id, HELP_ACTIONS.newDoc);
  }
  return Array.from(deduped.values()).slice(0, 4);
}

function buildSummary(input: string, actions: AssistantHelpAction[]): string {
  const text = input.toLowerCase();

  if (/(ai 작성|요약|create|생성)/i.test(text)) {
    return 'AI 작성은 새 문서 편집 화면 하단의 인라인 지시창에서 실행합니다. 템플릿/첨부 파일/문서를 함께 붙일 수 있습니다.';
  }
  if (/(검색|search|찾아)/i.test(text)) {
    return '문서 검색은 검색어를 입력해 결과를 확인하고, 결과 항목을 눌러 문서를 여는 흐름입니다. 바로 검색 화면으로 이동할 수 있습니다.';
  }
  if (/(새 문서|편집|에디터|작성)/i.test(text)) {
    return '직접 작성은 새 문서 화면에서 시작해 저장 시 문서 경로로 전환됩니다. 아래 버튼으로 바로 이동할 수 있습니다.';
  }
  if (/(설정|환경변수|토큰|api key|api키|entra)/i.test(text)) {
    return '설정 관련 작업은 설정 화면에서 먼저 확인하고, 필요 시 환경변수 값을 점검하는 순서가 안전합니다.';
  }

  const actionTitles = actions.map((action) => action.title).join(', ');
  return `요청하신 사용 가이드를 바로 실행할 수 있도록 관련 기능으로 연결했습니다: ${actionTitles}.`;
}

export function resolveAssistantHelp(input: string): AssistantHelpResponse {
  const actions = selectActions(input);
  return {
    summary: buildSummary(input, actions),
    actions,
  };
}
