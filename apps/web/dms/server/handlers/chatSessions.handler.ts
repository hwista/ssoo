import { chatSessionService, type PersistedChatSession } from '@/server/services/chatSession/ChatSessionService';
import type { AppResult } from '@/server/shared/result';

export async function listChatSessions(
  clientId: string,
  limit = 50
): Promise<AppResult<PersistedChatSession[]>> {
  return chatSessionService.list(clientId, limit);
}

export async function saveChatSession(
  clientId: string,
  session: Omit<PersistedChatSession, 'persistedToDb'>
): Promise<AppResult<{ id: string }>> {
  return chatSessionService.save(clientId, session);
}

export async function deleteChatSession(
  clientId: string,
  sessionId: string
): Promise<AppResult<{ id: string }>> {
  return chatSessionService.remove(clientId, sessionId);
}
