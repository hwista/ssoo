import { SHARED_SECTIONS } from './shared';
import type { AiTaskProfile } from '../profiles/types';

export function buildSystemPromptFromProfile(
  profile: AiTaskProfile,
  _context?: { hasTemplate?: boolean; hasAttachments?: boolean; hasImages?: boolean }
): string {
  const sections: string[] = [profile.persona, profile.instructions];

  for (const key of profile.sharedSections) {
    sections.push(SHARED_SECTIONS[key]);
  }

  return sections.join('\n\n');
}
