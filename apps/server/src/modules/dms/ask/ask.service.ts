import fs from 'fs';
import { createUIMessageStream } from 'ai';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type {
  AiReferenceInput,
  AiRetrievalContextItem,
  AiRetrievalResultItem,
  AiRunSourceInput,
  CommonAiRetrievalResponse,
} from '@ssoo/types/common';
import type {
  AskContextMode,
  AskMessageInput,
  AskRequest,
  AskResponse,
  AskTemplateInput,
  SearchBlockedSourceSummary,
  SearchConfidence,
  SearchContextMode,
  SearchResultItem,
} from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AiConversationService } from '../../common/ai-index/ai-conversation.service.js';
import {
  type AiModelGatewayStatus,
  AiModelGatewayService,
} from '../../common/ai-index/ai-model-gateway.service.js';
import { AiRetrievalService } from '../../common/ai-index/ai-retrieval.service.js';
import {
  getErrorMessage,
  resolveAbsolutePath,
} from '../search/search.helpers.js';
import { SearchRuntimeService } from '../search/search-runtime.service.js';
import { SearchService } from '../search/search.service.js';

const IMPLEMENTATION_CONTEXT = [
  'DMS 실제 구현 기능 스냅샷(코드 기준):',
  '- 라우트/API: /api/search(문서 검색), /api/ask(대화형 답변), /api/create(요약 API), /api/doc-assist(인라인 문서작성), /api/file, /api/files, /api/git, /api/settings',
  '- 주요 화면 경로: /home, /doc/{path}, /doc/new(직접 작성+인라인 AI), /ssoo/search(플랫폼 통합 검색), /settings',
  '- 상단 헤더 기능: 검색 입력(Enter 시 /ssoo/search 통합 검색 탭), 새 도큐먼트(/doc/new)',
  '- 플로팅 AI 어시스턴트: 질문/검색 의도 분기, 문서 검색 결과 카드, 헬프 액션 버튼(기능 화면으로 즉시 이동)',
  '- 문서 검색 방식: pgvector 시맨틱 검색 우선, 실패/무결과 시 키워드 검색 폴백',
  '- 답변 생성 방식: RAG(검색 문맥 주입) + 대화형 응답, 문맥 부족 시 보조 설명 제공',
].join('\n');

interface NormalizedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface NormalizedAskRequest {
  query: string;
  contextMode: AskContextMode;
  activeDocPath?: string;
  templates: AskTemplateInput[];
  messages: NormalizedMessage[];
}

interface AskContextBundle {
  messages: NormalizedMessage[];
  sources: SearchResultItem[];
  confidence: SearchConfidence;
  citations: AskResponse['citations'];
  blockedSources?: SearchBlockedSourceSummary;
  retrievalLogId?: string;
  references: AiReferenceInput[];
  runSources: AiRunSourceInput[];
  ragReady: boolean;
  fallbackUsed: boolean;
  contextItemCount: number;
}

interface SearchContextLoadResult {
  context: string;
  sources: SearchResultItem[];
  confidence: SearchConfidence;
  citations: AskResponse['citations'];
  blockedSources?: SearchBlockedSourceSummary;
  retrievalLogId?: string;
  references: AiReferenceInput[];
  runSources: AiRunSourceInput[];
  ragReady: boolean;
  fallbackUsed: boolean;
  contextItemCount: number;
}

interface AskAuditHandle {
  conversationId: string;
  requestMessageId: string;
  runId: string;
  startedAt: number;
}

function extractTextFromMessage(message: AskMessageInput): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
  }

  return typeof message.content === 'string' ? message.content : '';
}

function normalizeRole(role: string): 'user' | 'assistant' | 'system' {
  if (role === 'assistant' || role === 'system') {
    return role;
  }

  return 'user';
}

function inferConfidence(resultCount: number): SearchConfidence {
  if (resultCount >= 3) {
    return 'high';
  }

  if (resultCount >= 1) {
    return 'medium';
  }

  return 'low';
}

function toSearchConfidence(resultCount: number, ragReady: boolean): SearchConfidence {
  if (ragReady && resultCount >= 3) {
    return 'high';
  }

  return inferConfidence(resultCount);
}

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly runtime: SearchRuntimeService,
    private readonly searchService: SearchService,
    private readonly aiRetrievalService: AiRetrievalService,
    private readonly aiConversationService: AiConversationService,
    private readonly aiModelGateway: AiModelGatewayService,
  ) {}

  async ask(request: AskRequest, currentUser: TokenPayload): Promise<AskResponse> {
    let auditHandle: AskAuditHandle | undefined;
    try {
      const normalizedRequest = this.normalizeRequest(request);
      const askContext = await this.buildAskContext(normalizedRequest, currentUser);
      const modelStatus = this.aiModelGateway.getStatus();
      auditHandle = await this.safeStartAskAudit(
        normalizedRequest,
        askContext,
        modelStatus,
        currentUser,
      );
      const completion = await this.aiModelGateway.generateText({
        temperature: 0.2,
        maxOutputTokens: 512,
        system: this.buildAssistantSystemPrompt(normalizedRequest.contextMode),
        messages: askContext.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
      await this.safeCompleteAskAuditSuccess(
        auditHandle,
        askContext,
        completion.text,
        completion.providerStatus,
        currentUser,
      );

      return {
        query: normalizedRequest.query,
        answer: completion.text,
        sources: askContext.sources,
        confidence: askContext.confidence,
        citations: askContext.citations,
        blockedSources: askContext.blockedSources,
      };
    } catch (error) {
      await this.safeCompleteAskAuditFailure(auditHandle, error, currentUser);
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`DMS 질문 응답 생성 실패: ${getErrorMessage(error)}`);
      throw new InternalServerErrorException('질문 처리 중 오류가 발생했습니다.');
    }
  }

  async stream(request: AskRequest, currentUser: TokenPayload, signal?: AbortSignal) {
    let auditHandle: AskAuditHandle | undefined;
    try {
      const normalizedRequest = this.normalizeRequest(request);
      const askContext = await this.buildAskContext(normalizedRequest, currentUser);
      const modelStatus = this.aiModelGateway.getStatus();
      auditHandle = await this.safeStartAskAudit(
        normalizedRequest,
        askContext,
        modelStatus,
        currentUser,
      );
      const result = await this.aiModelGateway.streamText({
        system: this.buildAssistantSystemPrompt(normalizedRequest.contextMode),
        abortSignal: signal,
        messages: askContext.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        onFinish: async ({ text, providerStatus }) => {
          await this.safeCompleteAskAuditSuccess(
            auditHandle,
            askContext,
            text,
            providerStatus,
            currentUser,
          );
        },
        onError: (error: unknown) => {
          if (signal?.aborted) {
            void this.safeCompleteAskAuditCancelled(auditHandle, currentUser);
            return;
          }

          this.logger.error(`DMS 질문 스트리밍 실패: ${getErrorMessage(error)}`);
          void this.safeCompleteAskAuditFailure(auditHandle, error, currentUser);
        },
      });

      return createUIMessageStream({
        execute: ({ writer }) => {
          if (askContext.blockedSources?.totalCount) {
            writer.write({
              type: 'data-blocked-sources',
              data: askContext.blockedSources,
              transient: true,
            } as Parameters<typeof writer.write>[0]);
          }

          writer.merge(result.toUIMessageStream());
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      await this.safeCompleteAskAuditFailure(auditHandle, error, currentUser);
      this.logger.error(`DMS 질문 스트림 준비 실패: ${getErrorMessage(error)}`);
      throw new InternalServerErrorException('질문 처리 중 오류가 발생했습니다.');
    }
  }

  private normalizeRequest(request: AskRequest): NormalizedAskRequest {
    const rawMessagesInput = Array.isArray(request.messages)
      ? request.messages as unknown[]
      : [];
    const rawMessages = rawMessagesInput.filter((message): message is AskMessageInput => (
          typeof message === 'object'
          && message !== null
          && typeof (message as { role?: unknown }).role === 'string'
        ));

    const queryFromBody = typeof request.query === 'string' ? request.query.trim() : '';
    const messages = rawMessages.length > 0
      ? rawMessages.map((message) => ({
          role: normalizeRole(message.role),
          content: extractTextFromMessage(message),
        }))
      : (queryFromBody
        ? [{ role: 'user' as const, content: queryFromBody }]
        : []);

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user' && message.content.trim().length > 0);

    if (!lastUserMessage) {
      throw new BadRequestException('사용자 메시지가 없습니다.');
    }

    const rawTemplatesInput = Array.isArray(request.templates)
      ? request.templates as unknown[]
      : [];
    const templates = rawTemplatesInput.filter((template): template is AskTemplateInput => (
          typeof template === 'object'
          && template !== null
          && typeof (template as { name?: unknown }).name === 'string'
          && typeof (template as { content?: unknown }).content === 'string'
        ));

    return {
      query: lastUserMessage.content.trim(),
      contextMode: request.contextMode === 'deep'
        ? 'deep'
        : request.contextMode === 'attachments-only'
          ? 'attachments-only'
          : 'doc',
      activeDocPath: typeof request.activeDocPath === 'string'
        ? request.activeDocPath
        : undefined,
      templates,
      messages,
    };
  }

  private async buildAskContext(
    request: NormalizedAskRequest,
    currentUser: TokenPayload,
  ): Promise<AskContextBundle> {
    const attachmentOnly = request.contextMode === 'attachments-only';
    const retrieval = attachmentOnly
      ? {
          context: '',
          sources: [] as SearchResultItem[],
          confidence: 'low' as const,
          citations: [] as AskResponse['citations'],
          blockedSources: undefined,
          retrievalLogId: undefined,
          references: [] as AiReferenceInput[],
          runSources: [] as AiRunSourceInput[],
          ragReady: false,
          fallbackUsed: false,
          contextItemCount: 0,
        }
      : await this.loadSearchContext(currentUser, request.query, {
          contextMode: request.contextMode === 'deep' ? 'deep' : 'doc',
          activeDocPath: request.activeDocPath,
        });

    const messages = request.messages.map((message, index) => {
      if (index !== request.messages.length - 1 || message.role !== 'user') {
        return message;
      }

      const sections: string[] = [];
      if (!attachmentOnly) {
        sections.push(`[시스템 구현 컨텍스트]\n${IMPLEMENTATION_CONTEXT}`);
      }

      if (retrieval.context) {
        sections.push(`[참조 문서]\n${retrieval.context}`);
      }

      if (request.templates.length > 0) {
        const templateSections = request.templates
          .slice(0, 3)
          .map((template) => (
            `[문서 템플릿: ${template.name}]\n${template.content.slice(0, 1500)}`
          ))
          .join('\n\n');
        sections.push(templateSections);
      }

      if (sections.length === 0) {
        return message;
      }

      return {
        role: message.role,
        content: `${sections.join('\n\n')}\n\n[사용자 질문]\n${message.content}`,
      };
    });

    return {
      messages,
      sources: retrieval.sources,
      confidence: retrieval.confidence,
      citations: retrieval.citations,
      blockedSources: retrieval.blockedSources,
      retrievalLogId: retrieval.retrievalLogId,
      references: retrieval.references,
      runSources: retrieval.runSources,
      ragReady: retrieval.ragReady,
      fallbackUsed: retrieval.fallbackUsed,
      contextItemCount: retrieval.contextItemCount,
    };
  }

  private async loadSearchContext(
    currentUser: TokenPayload,
    query: string,
    options: { contextMode: SearchContextMode; activeDocPath?: string },
  ): Promise<SearchContextLoadResult> {
    if (query.trim().length < 2) {
      return {
        context: '',
        sources: [],
        confidence: 'low',
        citations: [],
        blockedSources: undefined,
        retrievalLogId: undefined,
        references: [],
        runSources: [],
        ragReady: false,
        fallbackUsed: false,
        contextItemCount: 0,
      };
    }

    const commonContext = await this.loadCommonSearchContext(currentUser, query, options);
    if (commonContext && commonContext.context) {
      return commonContext;
    }

    const legacyContext = await this.loadLegacySearchContext(currentUser, query, options);
    if (!legacyContext.context && commonContext) {
      return {
        ...commonContext,
        fallbackUsed: true,
      };
    }

    return {
      ...legacyContext,
      fallbackUsed: true,
    };
  }

  private async loadCommonSearchContext(
    currentUser: TokenPayload,
    query: string,
    options: { contextMode: SearchContextMode; activeDocPath?: string },
  ): Promise<SearchContextLoadResult | undefined> {
    try {
      const retrieval = await this.aiRetrievalService.retrieve({
        query,
        sourceApp: 'dms',
        entityTypes: ['document'],
        limit: options.contextMode === 'deep' ? 8 : 5,
        contextLimit: options.contextMode === 'deep' ? 5 : 3,
        includeContext: true,
      }, currentUser);

      if (retrieval.contextItems.length === 0 && retrieval.results.length === 0) {
        return undefined;
      }

      return this.toCommonSearchContextResult(retrieval);
    } catch (error) {
      this.logger.warn(
        `DMS 질문용 공용 RAG 컨텍스트 로드 실패, legacy 검색으로 폴백합니다: ${getErrorMessage(error)}`,
      );
      return undefined;
    }
  }

  private toCommonSearchContextResult(
    retrieval: CommonAiRetrievalResponse,
  ): SearchContextLoadResult {
    const resultByChunkId = new Map(
      retrieval.results.map((result) => [result.chunkId, result]),
    );
    const context = retrieval.contextItems
      .map((item, index) => {
        const result = resultByChunkId.get(item.chunkId);
        const title = result?.title ?? item.label;
        const path = item.target?.path ?? result?.target?.path ?? item.entityId;
        return `[문서 ${index + 1}: ${title}]\n경로: ${path}\n${item.text.slice(0, 2000)}`;
      })
      .join('\n\n---\n\n');

    return {
      context,
      sources: retrieval.results
        .filter((result) => result.permissionState === 'readable')
        .slice(0, 5)
        .map((result) => this.toDmsSearchResult(result)),
      confidence: toSearchConfidence(retrieval.contextItems.length, retrieval.ragReady),
      citations: this.toDmsCitations(retrieval, resultByChunkId),
      blockedSources: this.toDmsBlockedSources(retrieval.blockedSources),
      retrievalLogId: retrieval.retrievalLogId,
      references: this.toAiReferences(retrieval.contextItems),
      runSources: this.toAiRunSources(retrieval),
      ragReady: retrieval.ragReady,
      fallbackUsed: false,
      contextItemCount: retrieval.contextItems.length,
    };
  }

  private toDmsSearchResult(result: AiRetrievalResultItem): SearchResultItem {
    return {
      id: result.id,
      title: result.title,
      excerpt: result.excerpt,
      path: result.target?.path ?? result.entityId,
      score: result.score,
      summary: result.metadata?.summaryText as string | undefined,
      summarySource: result.metadata?.summaryText ? 'ai' : undefined,
      snippets: result.excerpt ? [result.excerpt] : undefined,
      totalSnippetCount: result.excerpt ? 1 : 0,
      isReadable: result.permissionState === 'readable',
      canRequestRead: result.permissionState === 'requestable',
    };
  }

  private toDmsCitations(
    retrieval: CommonAiRetrievalResponse,
    resultByChunkId: Map<string, AiRetrievalResultItem>,
  ): AskResponse['citations'] {
    return retrieval.citations.map((citation) => {
      const result = resultByChunkId.get(citation.chunkId);
      const storageUri = citation.target?.path
        ?? result?.target?.path
        ?? `${citation.sourceApp}:${citation.entityType}:${citation.entityId}`;

      return {
        title: result?.title ?? citation.label,
        storageUri,
        webUrl: citation.target?.externalHref ?? result?.target?.externalHref,
      };
    });
  }

  private toDmsBlockedSources(
    blockedSources: CommonAiRetrievalResponse['blockedSources'],
  ): SearchBlockedSourceSummary | undefined {
    if (!blockedSources?.totalCount) {
      return undefined;
    }

    return {
      totalCount: blockedSources.totalCount,
      reasons: blockedSources.reasons.map((reason) => ({
        code: 'document_access_denied',
        label: reason.label,
        count: reason.count,
      })),
    };
  }

  private toAiReferences(contextItems: AiRetrievalContextItem[]): AiReferenceInput[] {
    return contextItems.map((item) => ({
      aiObjectId: item.objectId,
      aiChunkId: item.chunkId,
      sourceApp: item.sourceApp,
      entityType: item.entityType,
      entityId: item.entityId,
      referenceKindCode: 'retrieval',
      citationId: item.citationId,
      citationLabel: item.label,
      target: item.target,
      metadata: {
        score: item.score,
        adapter: 'dms.ask.common-retrieval',
      },
    }));
  }

  private toAiRunSources(retrieval: CommonAiRetrievalResponse): AiRunSourceInput[] {
    return retrieval.contextItems.map((item, index) => {
      const source: AiRunSourceInput = {
        aiObjectId: item.objectId,
        aiChunkId: item.chunkId,
        sourceKindCode: 'retrieval',
        rankNo: index + 1,
        includedInPrompt: true,
        citationId: item.citationId,
        metadata: {
          sourceApp: item.sourceApp,
          entityType: item.entityType,
          entityId: item.entityId,
          score: item.score,
        },
      };

      if (retrieval.retrievalLogId) {
        source.aiRetrievalLogId = retrieval.retrievalLogId;
      }

      return source;
    });
  }

  private async loadLegacySearchContext(
    currentUser: TokenPayload,
    query: string,
    options: { contextMode: SearchContextMode; activeDocPath?: string },
  ): Promise<SearchContextLoadResult> {

    try {
      const searchResponse = await this.searchService.search({
        query,
        contextMode: options.contextMode,
        activeDocPath: options.activeDocPath,
      }, currentUser);

      const readableResults = searchResponse.results.filter((result) => result.isReadable);
      const topResults = readableResults.slice(0, 3);
      const rootDir = this.runtime.getDocDir();
      const context = topResults
        .map((result, index) => {
          try {
            const resolvedPath = resolveAbsolutePath(result.path, rootDir);
            const content = fs.existsSync(resolvedPath)
              ? fs.readFileSync(resolvedPath, 'utf-8').slice(0, 2000)
              : result.excerpt;
            return `[문서 ${index + 1}: ${result.title}]\n경로: ${result.path}\n${content}`;
          } catch {
            return `[문서 ${index + 1}: ${result.title}]\n경로: ${result.path}\n${result.excerpt}`;
          }
        })
        .join('\n\n---\n\n');

      const sources = readableResults.slice(0, 5);
      return {
        context,
        sources,
        confidence: searchResponse.confidence ?? inferConfidence(sources.length),
        citations: options.contextMode === 'deep'
          ? (searchResponse.citations ?? [])
          : [],
        blockedSources: searchResponse.blockedSources,
        retrievalLogId: undefined,
        references: [],
        runSources: [],
        ragReady: false,
        fallbackUsed: true,
        contextItemCount: topResults.length,
      };
    } catch (error) {
      this.logger.warn(
        `DMS 질문용 검색 컨텍스트 로드 실패, 검색 없이 진행합니다: ${getErrorMessage(error)}`,
      );
      return {
        context: '',
        sources: [],
        confidence: 'low',
        citations: [],
        blockedSources: undefined,
        retrievalLogId: undefined,
        references: [],
        runSources: [],
        ragReady: false,
        fallbackUsed: true,
        contextItemCount: 0,
      };
    }
  }

  private async safeStartAskAudit(
    request: NormalizedAskRequest,
    askContext: AskContextBundle,
    modelStatus: AiModelGatewayStatus,
    currentUser: TokenPayload,
  ): Promise<AskAuditHandle | undefined> {
    const startedAt = Date.now();
    try {
      const conversation = await this.aiConversationService.createConversation({
        sourceApp: 'dms',
        conversationScopeCode: 'private',
        title: request.query.slice(0, 120),
        metadata: {
          adapter: 'dms.ask',
          contextMode: request.contextMode,
          activeDocPath: request.activeDocPath ?? null,
          retrievalLogId: askContext.retrievalLogId ?? null,
          ragReady: askContext.ragReady,
          fallbackUsed: askContext.fallbackUsed,
          contextItemCount: askContext.contextItemCount,
          modelProviderReady: modelStatus.ready,
          modelProviderReasonCode: modelStatus.reasonCode ?? null,
          modelProviderCode: modelStatus.providerCode,
          modelName: modelStatus.modelName ?? null,
          deploymentName: modelStatus.deploymentName ?? null,
        },
      }, currentUser);

      const userMessage = await this.aiConversationService.appendMessage(
        conversation.aiConversationId,
        {
          roleCode: 'user',
          messageStatusCode: 'completed',
          contentText: request.query,
          metadata: {
            adapter: 'dms.ask',
            contextMode: request.contextMode,
            activeDocPath: request.activeDocPath ?? null,
            retrievalLogId: askContext.retrievalLogId ?? null,
            ragReady: askContext.ragReady,
            fallbackUsed: askContext.fallbackUsed,
            modelProviderReady: modelStatus.ready,
          },
          references: askContext.references,
        },
        currentUser,
      );

      const run = await this.aiConversationService.startRun(
        conversation.aiConversationId,
        {
          requestMessageId: userMessage.aiMessageId,
          runTypeCode: 'chat',
          providerCode: modelStatus.providerCode,
          modelName: modelStatus.modelName,
          deploymentName: modelStatus.deploymentName,
          requestJson: {
            query: request.query,
            contextMode: request.contextMode,
            activeDocPath: request.activeDocPath ?? null,
            templateCount: request.templates.length,
            retrievalLogId: askContext.retrievalLogId ?? null,
            contextItemCount: askContext.contextItemCount,
            ragReady: askContext.ragReady,
            fallbackUsed: askContext.fallbackUsed,
            modelProviderReady: modelStatus.ready,
            modelProviderReasonCode: modelStatus.reasonCode ?? null,
          },
          metadata: {
            adapter: 'dms.ask',
            retrievalLogId: askContext.retrievalLogId ?? null,
            sourceCount: askContext.sources.length,
            citationCount: askContext.citations.length,
            modelProviderCode: modelStatus.providerCode,
            modelName: modelStatus.modelName ?? null,
            deploymentName: modelStatus.deploymentName ?? null,
          },
          sources: askContext.runSources,
        },
        currentUser,
      );

      return {
        conversationId: conversation.aiConversationId,
        requestMessageId: userMessage.aiMessageId,
        runId: run.aiRunId,
        startedAt,
      };
    } catch (error) {
      this.logger.warn(`DMS Ask 공용 대화/run 감사 시작 실패: ${getErrorMessage(error)}`);
      return undefined;
    }
  }

  private async safeCompleteAskAuditSuccess(
    auditHandle: AskAuditHandle | undefined,
    askContext: AskContextBundle,
    answer: string | undefined,
    modelStatus: AiModelGatewayStatus,
    currentUser: TokenPayload,
  ): Promise<void> {
    if (!auditHandle) {
      return;
    }

    let responseMessageId: string | undefined;
    try {
      const responseMessage = await this.aiConversationService.appendMessage(
        auditHandle.conversationId,
        {
          parentMessageId: auditHandle.requestMessageId,
          roleCode: 'assistant',
          messageStatusCode: 'completed',
          contentText: answer ?? '',
          metadata: {
            adapter: 'dms.ask',
            retrievalLogId: askContext.retrievalLogId ?? null,
            confidence: askContext.confidence,
            sourceCount: askContext.sources.length,
            citationCount: askContext.citations.length,
            modelProviderCode: modelStatus.providerCode,
            modelName: modelStatus.modelName ?? null,
            deploymentName: modelStatus.deploymentName ?? null,
          },
          references: askContext.references,
        },
        currentUser,
      );
      responseMessageId = responseMessage.aiMessageId;
    } catch (error) {
      this.logger.warn(`DMS Ask assistant 메시지 감사 실패: ${getErrorMessage(error)}`);
    }

    try {
      await this.aiConversationService.completeRun(
        auditHandle.conversationId,
        auditHandle.runId,
        {
          responseMessageId,
          runStatusCode: 'succeeded',
          latencyMs: Date.now() - auditHandle.startedAt,
          responseJson: {
            answerLength: answer?.length ?? 0,
            confidence: askContext.confidence,
            sourceCount: askContext.sources.length,
            citationCount: askContext.citations.length,
            retrievalLogId: askContext.retrievalLogId ?? null,
            ragReady: askContext.ragReady,
            fallbackUsed: askContext.fallbackUsed,
            modelProviderCode: modelStatus.providerCode,
            modelName: modelStatus.modelName ?? null,
            deploymentName: modelStatus.deploymentName ?? null,
          },
          metadata: {
            adapter: 'dms.ask',
            completedBy: 'ask-service',
            modelProviderCode: modelStatus.providerCode,
            modelName: modelStatus.modelName ?? null,
            deploymentName: modelStatus.deploymentName ?? null,
          },
        },
        currentUser,
      );
    } catch (error) {
      this.logger.warn(`DMS Ask run 성공 감사 완료 실패: ${getErrorMessage(error)}`);
    }
  }

  private async safeCompleteAskAuditFailure(
    auditHandle: AskAuditHandle | undefined,
    error: unknown,
    currentUser: TokenPayload,
  ): Promise<void> {
    if (!auditHandle) {
      return;
    }

    try {
      await this.aiConversationService.completeRun(
        auditHandle.conversationId,
        auditHandle.runId,
        {
          runStatusCode: 'failed',
          latencyMs: Date.now() - auditHandle.startedAt,
          lastErrorMessage: getErrorMessage(error),
          responseJson: {
            error: getErrorMessage(error),
          },
          metadata: {
            adapter: 'dms.ask',
            completedBy: 'ask-service',
          },
        },
        currentUser,
      );
    } catch (auditError) {
      this.logger.warn(`DMS Ask run 실패 감사 완료 실패: ${getErrorMessage(auditError)}`);
    }
  }

  private async safeCompleteAskAuditCancelled(
    auditHandle: AskAuditHandle | undefined,
    currentUser: TokenPayload,
  ): Promise<void> {
    if (!auditHandle) {
      return;
    }

    try {
      await this.aiConversationService.completeRun(
        auditHandle.conversationId,
        auditHandle.runId,
        {
          runStatusCode: 'cancelled',
          latencyMs: Date.now() - auditHandle.startedAt,
          responseJson: {
            cancelled: true,
          },
          metadata: {
            adapter: 'dms.ask',
            completedBy: 'ask-service',
          },
        },
        currentUser,
      );
    } catch (error) {
      this.logger.warn(`DMS Ask run 취소 감사 완료 실패: ${getErrorMessage(error)}`);
    }
  }

  private buildAssistantSystemPrompt(contextMode: AskContextMode): string {
    const attachmentOnlyRule = contextMode === 'attachments-only'
      ? `
- 현재 대화는 "첨부 파일 기반 모드"입니다.
- 답변은 반드시 사용자가 첨부한 파일 컨텍스트만 근거로 작성하세요.
- 전역 문서 검색 결과, 시스템 구현 지식, 일반 추측을 근거로 단정하지 마세요.
- 첨부 내용에서 확인되지 않으면 "첨부 파일 기준 확인되지 않음"이라고 명시하세요.`
      : '';

    return `당신은 DMS(문서 관리 시스템)의 AI 어시스턴트입니다.
사용자의 질문에 대해 "실제 구현 컨텍스트"와 "문서 컨텍스트"를 우선 활용하고, 대화 맥락을 반영해 실무적으로 답변하세요.

규칙:
- 답변 우선순위는 1) 실제 구현 컨텍스트 2) 문서 컨텍스트 3) 일반 보조 설명 순서입니다.
- 이전 대화 흐름(직전 질문/답변)을 이어받아 답변하세요.
- 기능/사용법 질문에는 실제 경로, 버튼명, 동작 흐름을 단계로 제시하세요.
- 답변은 한국어 마크다운으로 작성하되, 과한 장식 없이 읽기 쉬운 수준만 사용하세요.
- 첫 문단은 짧게 요지를 정리하고, 필요할 때만 목록/번호 목록/표/코드블록을 사용하세요.
- 문서 컨텍스트에 근거가 있으면 이를 사용하고, 답변 마지막에 "## 근거 문서" 섹션으로 제목과 경로를 짧게 정리하세요.
- 문서 컨텍스트가 부족해도 대화를 중단하지 말고, 일반적인 보조 설명을 제공하세요.
- 단, 문서에 없는 내용은 "문서 기준 확인되지 않은 보조 설명"임을 짧게 구분해 표현하세요.
- 구현 컨텍스트로 답할 수 있는데 "관련 문서를 찾지 못했습니다"라고 답하지 마세요.
- 구현/문서 모두에서 확인 불가한 사실은 "현재 코드/문서 기준 미확인"이라고 명시하세요.
- 문서 근거를 실제로 사용하지 않았으면 "## 근거 문서" 섹션은 생략하세요.${attachmentOnlyRule}`;
  }
}
