/**
 * 메타데이터 서비스
 * 
 * Phase 2.1.5 Step 2에서 추가된 서비스 레이어 확장
 * 파일 메타데이터 관리, 태그 시스템, 파일 정보 캐싱을 담당
 */

import { BaseService } from './base/BaseService';
import { FileNode } from '@/types';

/**
 * 파일 메타데이터 인터페이스
 */
export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size?: number;
  lastModified?: Date;
  tags: string[];
  category?: 'document' | 'image' | 'code' | 'data' | 'other';
  description?: string;
  language?: string;
  encoding?: string;
  lineCount?: number;
  wordCount?: number;
  charCount?: number;
  readTime?: number; // 예상 읽기 시간 (분)
}

/**
 * 태그 정보 인터페이스
 */
export interface TagInfo {
  name: string;
  count: number;
  color?: string;
  description?: string;
  category?: string;
}

/**
 * 메타데이터 검색 옵션
 */
export interface MetadataSearchOptions {
  tags?: string[];
  category?: string;
  extension?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'name' | 'modified' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * 메타데이터 통계 정보
 */
export interface MetadataStats {
  totalFiles: number;
  totalSize: number;
  filesByCategory: Record<string, number>;
  filesByExtension: Record<string, number>;
  tagUsage: Record<string, number>;
  averageFileSize: number;
  lastUpdated: Date;
}

/**
 * 메타데이터 서비스 클래스
 */
export class MetadataService extends BaseService {
  private metadataCache = new Map<string, FileMetadata>();
  private tagRegistry = new Map<string, TagInfo>();
  private stats: MetadataStats | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5분

  constructor() {
    super('MetadataService', {
      enableLogging: true,
      enableCaching: true
    });

    this.initialize();
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.scheduleCleanup();
      this.log('info', 'MetadataService initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize MetadataService', error);
      throw error;
    }
  }

  /**
   * 파일 메타데이터 추출 및 저장
   */
  async extractMetadata(fileNode: FileNode, content?: string): Promise<FileMetadata> {
    try {
      const metadata: FileMetadata = {
        path: fileNode.path,
        name: fileNode.name,
        extension: this.getFileExtension(fileNode.name),
        lastModified: new Date(fileNode.lastModified || Date.now()),
        tags: [],
        category: this.determineCategory(fileNode.name)
      };

      // 컨텐츠가 있는 경우 추가 메타데이터 추출
      if (content) {
        Object.assign(metadata, this.analyzeContent(content, metadata.extension));
      }

      // 파일 정보가 있는 경우
      if (fileNode.size !== undefined) {
        metadata.size = fileNode.size;
      }

      // 캐시에 저장
      this.metadataCache.set(fileNode.path, metadata);
      
      // 태그 레지스트리 업데이트
      this.updateTagRegistry(metadata.tags);
      
      // 통계 업데이트
      await this.updateStats();

      this.log('info', 'Metadata extracted successfully');
      return metadata;
    } catch (error) {
      this.log('error', 'Failed to extract metadata', error);
      throw error;
    }
  }

  /**
   * 메타데이터 조회
   */
  async getMetadata(path: string): Promise<FileMetadata | null> {
    const cached = this.metadataCache.get(path);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    return null; // 실제 구현에서는 스토리지에서 로드
  }

  /**
   * 여러 파일의 메타데이터 조회
   */
  async getMultipleMetadata(paths: string[]): Promise<Map<string, FileMetadata>> {
    const result = new Map<string, FileMetadata>();

    for (const path of paths) {
      const metadata = await this.getMetadata(path);
      if (metadata) {
        result.set(path, metadata);
      }
    }

    return result;
  }

  /**
   * 메타데이터 검색
   */
  async searchMetadata(options: MetadataSearchOptions): Promise<FileMetadata[]> {
    try {
      const allMetadata = Array.from(this.metadataCache.values());
      let results = allMetadata.filter(metadata => this.matchesSearchCriteria(metadata, options));

      // 정렬
      if (options.sortBy) {
        results = this.sortMetadata(results, options.sortBy, options.sortOrder || 'asc');
      }

      // 제한
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      this.log('info', 'Metadata search completed');
      return results;
    } catch (error) {
      this.log('error', 'Failed to search metadata', error);
      throw error;
    }
  }

  /**
   * 태그 관리
   */
  async addTag(path: string, tag: string): Promise<void> {
    const metadata = await this.getMetadata(path);
    if (!metadata) {
      throw new Error(`Metadata not found for path: ${path}`);
    }

    if (!metadata.tags.includes(tag)) {
      metadata.tags.push(tag);
      this.metadataCache.set(path, metadata);
      this.updateTagRegistry([tag]);
      
      this.log('info', 'Tag added successfully');
    }
  }

  async removeTag(path: string, tag: string): Promise<void> {
    const metadata = await this.getMetadata(path);
    if (!metadata) {
      throw new Error(`Metadata not found for path: ${path}`);
    }

    const index = metadata.tags.indexOf(tag);
    if (index > -1) {
      metadata.tags.splice(index, 1);
      this.metadataCache.set(path, metadata);
      
      this.log('info', 'Tag removed successfully');
    }
  }

  async getAllTags(): Promise<TagInfo[]> {
    return Array.from(this.tagRegistry.values());
  }

  async getTagSuggestions(partial: string): Promise<string[]> {
    const tags = Array.from(this.tagRegistry.keys());
    return tags
      .filter(tag => tag.toLowerCase().includes(partial.toLowerCase()))
      .sort()
      .slice(0, 10);
  }

  /**
   * 통계 정보 조회
   */
  async getStats(): Promise<MetadataStats> {
    if (!this.stats || this.isStatsExpired()) {
      await this.updateStats();
    }
    return this.stats!;
  }

  /**
   * 메타데이터 업데이트
   */
  async updateMetadata(path: string, updates: Partial<FileMetadata>): Promise<void> {
    const existing = await this.getMetadata(path);
    if (!existing) {
      throw new Error(`Metadata not found for path: ${path}`);
    }

    const updated = { ...existing, ...updates };
    this.metadataCache.set(path, updated);
    
    this.log('info', 'Metadata updated successfully');
  }

  /**
   * 메타데이터 삭제
   */
  async deleteMetadata(path: string): Promise<void> {
    this.metadataCache.delete(path);
    await this.updateStats();
    
    this.log('info', 'Metadata deleted successfully');
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.metadataCache.clear();
    this.tagRegistry.clear();
    this.stats = null;
    
    this.log('info', 'Metadata cache cleared');
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > -1 ? filename.substring(lastDot) : '';
  }

  private determineCategory(filename: string): FileMetadata['category'] {
    const ext = this.getFileExtension(filename).toLowerCase();
    
    if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) return 'document';
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) return 'image';
    if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp'].includes(ext)) return 'code';
    if (['.json', '.xml', '.csv', '.yaml', '.yml'].includes(ext)) return 'data';
    
    return 'other';
  }

  private analyzeContent(content: string, extension: string): Partial<FileMetadata> {
    const analysis: Partial<FileMetadata> = {
      lineCount: content.split('\n').length,
      charCount: content.length,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length
    };

    // 읽기 시간 계산 (분당 200단어 기준)
    analysis.readTime = Math.ceil((analysis.wordCount || 0) / 200);

    // 마크다운 특별 처리
    if (extension === '.md') {
      analysis.language = 'markdown';
      // 마크다운에서 태그 추출 시도
      const tagMatches = content.match(/#[\w가-힣]+/g);
      if (tagMatches) {
        analysis.tags = tagMatches.map(tag => tag.substring(1));
      }
    }

    return analysis;
  }

  private updateTagRegistry(tags: string[]): void {
    for (const tag of tags) {
      const existing = this.tagRegistry.get(tag);
      if (existing) {
        existing.count++;
      } else {
        this.tagRegistry.set(tag, {
          name: tag,
          count: 1
        });
      }
    }
  }

  private isCacheValid(metadata: FileMetadata): boolean {
    if (!metadata.lastModified) return true;
    return Date.now() - metadata.lastModified.getTime() < this.cacheExpiry;
  }

  private matchesSearchCriteria(metadata: FileMetadata, options: MetadataSearchOptions): boolean {
    if (options.tags && !options.tags.some(tag => metadata.tags.includes(tag))) {
      return false;
    }

    if (options.category && metadata.category !== options.category) {
      return false;
    }

    if (options.extension && metadata.extension !== options.extension) {
      return false;
    }

    if (options.dateRange && metadata.lastModified) {
      const date = metadata.lastModified;
      if (date < options.dateRange.start || date > options.dateRange.end) {
        return false;
      }
    }

    if (options.sizeRange && metadata.size !== undefined) {
      if (metadata.size < options.sizeRange.min || metadata.size > options.sizeRange.max) {
        return false;
      }
    }

    return true;
  }

  private sortMetadata(
    metadata: FileMetadata[], 
    sortBy: NonNullable<MetadataSearchOptions['sortBy']>,
    order: 'asc' | 'desc'
  ): FileMetadata[] {
    return metadata.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          const aTime = a.lastModified?.getTime() || 0;
          const bTime = b.lastModified?.getTime() || 0;
          comparison = aTime - bTime;
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  private async updateStats(): Promise<void> {
    const allMetadata = Array.from(this.metadataCache.values());
    
    const stats: MetadataStats = {
      totalFiles: allMetadata.length,
      totalSize: allMetadata.reduce((sum, m) => sum + (m.size || 0), 0),
      filesByCategory: {},
      filesByExtension: {},
      tagUsage: {},
      averageFileSize: 0,
      lastUpdated: new Date()
    };

    // 카테고리별 통계
    for (const metadata of allMetadata) {
      const category = metadata.category || 'other';
      stats.filesByCategory[category] = (stats.filesByCategory[category] || 0) + 1;
      
      const ext = metadata.extension;
      stats.filesByExtension[ext] = (stats.filesByExtension[ext] || 0) + 1;
      
      for (const tag of metadata.tags) {
        stats.tagUsage[tag] = (stats.tagUsage[tag] || 0) + 1;
      }
    }

    stats.averageFileSize = stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0;
    
    this.stats = stats;
  }

  private isStatsExpired(): boolean {
    if (!this.stats) return true;
    return Date.now() - this.stats.lastUpdated.getTime() > this.cacheExpiry;
  }

  private scheduleCleanup(): void {
    // 1시간마다 만료된 캐시 정리
    setInterval(() => {
      let cleaned = 0;
      for (const [path, metadata] of this.metadataCache.entries()) {
        if (!this.isCacheValid(metadata)) {
          this.metadataCache.delete(path);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        this.log('info', 'Cache cleanup completed');
      }
    }, 60 * 60 * 1000);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const metadataService = new MetadataService();