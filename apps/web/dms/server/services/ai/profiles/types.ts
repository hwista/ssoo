import type { SharedSectionKey } from '../prompts/shared';

export type AiTaskKey = 'document-to-template';

export interface AiTaskProfile {
  taskKey: AiTaskKey;
  name: string;
  description: string;
  persona: string;
  instructions: string;
  sharedSections: SharedSectionKey[];
  modelOptions?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export interface AiProfileOverride {
  persona?: string;
  instructions?: string;
}
