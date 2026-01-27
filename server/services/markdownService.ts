/**
 * 마크다운 서비스
 * 
 * Phase 2.1.5 Step 2에서 추가된 서비스 레이어 확장
 * 마크다운 파싱, 렌더링, 링크 처리, 콘텐츠 변환을 중앙화
 */

import { BaseService } from './base/BaseService';

/**
 * 마크다운 파싱 옵션
 */
export interface MarkdownParseOptions {
  enableTables?: boolean;
  enableStrikethrough?: boolean;
  enableTaskLists?: boolean;
  enableFootnotes?: boolean;
  enableMath?: boolean;
  enableEmoji?: boolean;
  enableHighlight?: boolean;
  sanitize?: boolean;
  baseUrl?: string;
}

/**
 * 마크다운 렌더링 결과
 */
export interface MarkdownRenderResult {
  html: string;
  metadata: MarkdownMetadata;
  toc: TableOfContents[];
  links: LinkInfo[];
  images: ImageInfo[];
  warnings: string[];
}

/**
 * 마크다운 메타데이터
 */
export interface MarkdownMetadata {
  title?: string;
  description?: string;
  tags: string[];
  wordCount: number;
  readingTime: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  frontMatter?: Record<string, unknown>;
}

/**
 * 목차 정보
 */
export interface TableOfContents {
  id: string;
  text: string;
  level: number;
  anchor: string;
  children: TableOfContents[];
}

/**
 * 링크 정보
 */
export interface LinkInfo {
  text: string;
  url: string;
  title?: string;
  type: 'internal' | 'external' | 'anchor' | 'email';
  isValid?: boolean;
  statusCode?: number;
}

/**
 * 이미지 정보
 */
export interface ImageInfo {
  alt: string;
  src: string;
  title?: string;
  width?: number;
  height?: number;
  size?: number;
  isValid?: boolean;
}

/**
 * 마크다운 변환 옵션
 */
export interface MarkdownConvertOptions {
  format: 'html' | 'text' | 'json' | 'pdf' | 'docx';
  includeMetadata?: boolean;
  includeToc?: boolean;
  sanitize?: boolean;
  template?: string;
}

/**
 * 텍스트 분석 결과
 */
export interface TextAnalysis {
  wordCount: number;
  charCount: number;
  paragraphCount: number;
  sentenceCount: number;
  readingTime: number;
  readabilityScore: number;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * 마크다운 서비스 클래스
 */
export class MarkdownService extends BaseService {
  private parseCache = new Map<string, MarkdownRenderResult>();
  private linkValidationCache = new Map<string, boolean>();
  private cacheExpiry = 10 * 60 * 1000; // 10분

  constructor() {
    super('MarkdownService', {
      enableLogging: true,
      enableCaching: true,
      cacheTimeout: 600000
    });

    this.initialize();
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.scheduleCleanup();
      this.log('info', 'MarkdownService initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize MarkdownService', error);
      throw error;
    }
  }

  /**
   * 마크다운 파싱 및 렌더링
   */
  async parseMarkdown(
    content: string, 
    options: MarkdownParseOptions = {}
  ): Promise<MarkdownRenderResult> {
    try {
      const cacheKey = this.getCacheKey(content, options);
      const cached = this.parseCache.get(cacheKey);
      
      if (cached && this.isCacheValid()) {
        return cached;
      }

      const result = await this.performParsing(content, options);
      
      // 캐시에 저장
      this.parseCache.set(cacheKey, result);
      
      this.log('info', 'Markdown parsed successfully');
      return result;
    } catch (error) {
      this.log('error', 'Failed to parse markdown', error);
      throw error;
    }
  }

  /**
   * HTML로 변환
   */
  async toHtml(content: string, options: MarkdownParseOptions = {}): Promise<string> {
    const result = await this.parseMarkdown(content, options);
    return result.html;
  }

  /**
   * 플레인 텍스트로 변환
   */
  async toText(content: string): Promise<string> {
    const html = await this.toHtml(content);
    return this.stripHtml(html);
  }

  /**
   * 목차 추출
   */
  async extractToc(content: string): Promise<TableOfContents[]> {
    const result = await this.parseMarkdown(content, { enableTables: false });
    return result.toc;
  }

  /**
   * 메타데이터 추출
   */
  async extractMetadata(content: string): Promise<MarkdownMetadata> {
    const result = await this.parseMarkdown(content, { sanitize: false });
    return result.metadata;
  }

  /**
   * 링크 추출 및 검증
   */
  async extractLinks(content: string, validateLinks = false): Promise<LinkInfo[]> {
    const result = await this.parseMarkdown(content);
    const links = result.links;

    if (validateLinks) {
      await this.validateLinks(links);
    }

    return links;
  }

  /**
   * 이미지 추출 및 정보 수집
   */
  async extractImages(content: string, validateImages = false): Promise<ImageInfo[]> {
    const result = await this.parseMarkdown(content);
    const images = result.images;

    if (validateImages) {
      await this.validateImages(images);
    }

    return images;
  }

  /**
   * 텍스트 분석
   */
  async analyzeText(content: string): Promise<TextAnalysis> {
    try {
      const plainText = await this.toText(content);
      
      const analysis: TextAnalysis = {
        charCount: plainText.length,
        wordCount: this.countWords(plainText),
        paragraphCount: this.countParagraphs(plainText),
        sentenceCount: this.countSentences(plainText),
        readingTime: this.calculateReadingTime(plainText),
        readabilityScore: this.calculateReadabilityScore(plainText),
        keywords: this.extractKeywords(plainText)
      };

      this.log('info', 'Text analysis completed');
      return analysis;
    } catch (error) {
      this.log('error', 'Failed to analyze text', error);
      throw error;
    }
  }

  /**
   * 마크다운 변환
   */
  async convertMarkdown(
    content: string, 
    options: MarkdownConvertOptions
  ): Promise<string | Buffer> {
    try {
      switch (options.format) {
        case 'html':
          return await this.toHtml(content);
        
        case 'text':
          return await this.toText(content);
        
        case 'json':
          const result = await this.parseMarkdown(content);
          return JSON.stringify({
            html: result.html,
            metadata: options.includeMetadata ? result.metadata : undefined,
            toc: options.includeToc ? result.toc : undefined
          }, null, 2);
        
        case 'pdf':
          throw new Error('PDF conversion not yet implemented');
        
        case 'docx':
          throw new Error('DOCX conversion not yet implemented');
        
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      this.log('error', 'Failed to convert markdown', error);
      throw error;
    }
  }

  /**
   * 마크다운 정리 및 포맷팅
   */
  async formatMarkdown(content: string): Promise<string> {
    try {
      let formatted = content;

      // 기본적인 포맷팅 규칙 적용
      formatted = this.normalizeLineEndings(formatted);
      formatted = this.formatHeadings(formatted);
      formatted = this.formatLists(formatted);
      formatted = this.formatCodeBlocks(formatted);
      formatted = this.formatLinks(formatted);
      formatted = this.removeExtraWhitespace(formatted);

      this.log('info', 'Markdown formatted successfully');
      return formatted;
    } catch (error) {
      this.log('error', 'Failed to format markdown', error);
      throw error;
    }
  }

  /**
   * 마크다운 검증
   */
  async validateMarkdown(content: string): Promise<string[]> {
    try {
      const warnings: string[] = [];
      
      // 기본적인 검증 규칙
      warnings.push(...this.validateHeadingStructure(content));
      warnings.push(...this.validateLinksInContent(content));
      warnings.push(...this.validateImagesInContent(content));
      warnings.push(...this.validateCodeBlocks(content));
      warnings.push(...this.validateTables(content));

      this.log('info', 'Markdown validation completed');
      return warnings;
    } catch (error) {
      this.log('error', 'Failed to validate markdown', error);
      throw error;
    }
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.parseCache.clear();
    this.linkValidationCache.clear();
    this.log('info', 'Markdown cache cleared');
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async performParsing(
    content: string, 
    options: MarkdownParseOptions
  ): Promise<MarkdownRenderResult> {
    // Front matter 추출
    const { content: markdownContent, frontMatter } = this.extractFrontMatter(content);
    
    // HTML 변환
    const html = await this.convertToHtml(markdownContent, options);
    
    // 메타데이터 추출
    const metadata = this.extractMarkdownMetadata(markdownContent, frontMatter);
    
    // TOC 생성
    const toc = this.generateToc(markdownContent);
    
    // 링크 및 이미지 추출
    const links = this.parseLinks(markdownContent);
    const images = this.parseImages(markdownContent);
    
    // 경고사항 검출
    const warnings = await this.validateMarkdown(markdownContent);

    return {
      html,
      metadata,
      toc,
      links,
      images,
      warnings
    };
  }

  private getCacheKey(content: string, options: MarkdownParseOptions): string {
    const hash = this.hashString(content + JSON.stringify(options));
    return `md_${hash}`;
  }

  private isCacheValid(): boolean {
    return true; // 단순화된 캐시 검증
  }

  private extractFrontMatter(content: string): { content: string; frontMatter?: Record<string, unknown> } {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (match) {
      try {
        const frontMatter = this.parseYaml(match[1]);
        return { content: match[2], frontMatter };
      } catch {
        // 파싱 실패 시 무시
      }
    }
    
    return { content };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async convertToHtml(content: string, options: MarkdownParseOptions): Promise<string> {
    // 기본적인 마크다운 to HTML 변환
    let html = content;
    
    // 헤딩 변환
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    
    // 볼드/이탤릭 변환
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 링크 변환
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 개행 처리
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  private extractMarkdownMetadata(content: string, frontMatter?: Record<string, unknown>): MarkdownMetadata {
    const metadata: MarkdownMetadata = {
      title: frontMatter?.title as string || this.extractTitle(content),
      description: frontMatter?.description as string,
      tags: (frontMatter?.tags as string[]) || [],
      wordCount: this.countWords(content),
      readingTime: this.calculateReadingTime(content),
      headingCount: this.countHeadings(content),
      imageCount: this.countImages(content),
      linkCount: this.countLinks(content),
      codeBlockCount: this.countCodeBlocks(content),
      frontMatter
    };

    return metadata;
  }

  private generateToc(content: string): TableOfContents[] {
    const headings = content.match(/^(#{1,6})\s+(.*)$/gm) || [];
    const toc: TableOfContents[] = [];
    
    for (const heading of headings) {
      const match = heading.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const anchor = this.generateAnchor(text);
        
        toc.push({
          id: anchor,
          text,
          level,
          anchor,
          children: []
        });
      }
    }
    
    return this.buildTocHierarchy(toc);
  }

  private parseLinks(content: string): LinkInfo[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: LinkInfo[] = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      
      links.push({
        text,
        url,
        type: this.determineLinkType(url)
      });
    }
    
    return links;
  }

  private parseImages(content: string): ImageInfo[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: ImageInfo[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      const alt = match[1];
      const src = match[2];
      
      images.push({
        alt,
        src
      });
    }
    
    return images;
  }

  private async validateLinks(links: LinkInfo[]): Promise<void> {
    for (const link of links) {
      if (link.type === 'external') {
        const cached = this.linkValidationCache.get(link.url);
        if (cached !== undefined) {
          link.isValid = cached;
          continue;
        }

        try {
          link.isValid = true; // 시뮬레이션
          this.linkValidationCache.set(link.url, true);
        } catch {
          link.isValid = false;
          this.linkValidationCache.set(link.url, false);
        }
      }
    }
  }

  private async validateImages(images: ImageInfo[]): Promise<void> {
    for (const image of images) {
      try {
        image.isValid = true; // 시뮬레이션
      } catch {
        image.isValid = false;
      }
    }
  }

  // 텍스트 분석 헬퍼 메서드들
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  private calculateReadingTime(text: string): number {
    const wpm = 200; // 분당 200단어
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wpm);
  }

  private calculateReadabilityScore(text: string): number {
    // 플레시-킨케이드 가독성 점수 (간단 버전)
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = this.countSyllables(text);
    
    if (sentences === 0 || words === 0) return 0;
    
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
  }

  private extractKeywords(text: string): string[] {
    // 간단한 키워드 추출
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // 기타 헬퍼 메서드들
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash).toString(36);
  }

  private parseYaml(yamlString: string): Record<string, unknown> {
    // 간단한 YAML 파싱
    const result: Record<string, unknown> = {};
    const lines = yamlString.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        result[match[1]] = match[2];
      }
    }
    
    return result;
  }

  private extractTitle(content: string): string | undefined {
    const match = content.match(/^#\s+(.*)$/m);
    return match ? match[1] : undefined;
  }

  private countHeadings(content: string): number {
    return (content.match(/^#{1,6}\s+/gm) || []).length;
  }

  private countImages(content: string): number {
    return (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  }

  private countLinks(content: string): number {
    return (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  }

  private countCodeBlocks(content: string): number {
    return (content.match(/```[\s\S]*?```/g) || []).length;
  }

  private countSyllables(text: string): number {
    // 간단한 음절 카운트 (영어 기준)
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[^aeiouy]+/g, ' ')
      .split(/\s+/)
      .filter(s => s.length > 0).length;
  }

  private generateAnchor(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  private determineLinkType(url: string): LinkInfo['type'] {
    if (url.startsWith('#')) return 'anchor';
    if (url.startsWith('mailto:')) return 'email';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
    return 'internal';
  }

  private buildTocHierarchy(toc: TableOfContents[]): TableOfContents[] {
    return toc; // 단순화된 구현
  }

  // 포맷팅 헬퍼 메서드들
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private formatHeadings(content: string): string {
    return content.replace(/(\n#{1,6}\s+.*)/g, '\n$1');
  }

  private formatLists(content: string): string {
    return content;
  }

  private formatCodeBlocks(content: string): string {
    return content;
  }

  private formatLinks(content: string): string {
    return content;
  }

  private removeExtraWhitespace(content: string): string {
    return content.replace(/\n{3,}/g, '\n\n').trim();
  }

  // 검증 헬퍼 메서드들
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateHeadingStructure(content: string): string[] {
    const warnings: string[] = [];
    // 헤딩 구조 검증 로직 추가 예정
    return warnings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateLinksInContent(content: string): string[] {
    const warnings: string[] = [];
    // 링크 검증 로직 추가 예정
    return warnings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateImagesInContent(content: string): string[] {
    const warnings: string[] = [];
    // 이미지 검증 로직 추가 예정
    return warnings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateCodeBlocks(content: string): string[] {
    const warnings: string[] = [];
    // 코드 블록 검증 로직 추가 예정
    return warnings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateTables(content: string): string[] {
    const warnings: string[] = [];
    // 테이블 검증 로직 추가 예정
    return warnings;
  }

  private scheduleCleanup(): void {
    // 30분마다 캐시 정리
    setInterval(() => {
      if (this.parseCache.size > 100) {
        const entries = Array.from(this.parseCache.entries());
        const toKeep = entries.slice(-50);
        this.parseCache.clear();
        toKeep.forEach(([key, value]) => {
          this.parseCache.set(key, value);
        });
        
        this.log('info', 'Parse cache cleaned up');
      }
    }, 30 * 60 * 1000);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const markdownService = new MarkdownService();