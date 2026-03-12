import { chatSessionService, type PersistedChatSession } from '@/server/services/chatSession/ChatSessionService';

export type ChatSessionHandlerResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

export async function listChatSessions(
  clientId: string,
  limit = 50
): Promise<ChatSessionHandlerResult<PersistedChatSession[]>> {
  return chatSessionService.list(clientId, limit);
}

export async function saveChatSession(
  clientId: string,
  session: Omit<PersistedChatSession, 'persistedToDb'>
): Promise<ChatSessionHandlerResult<{ id: string }>> {
  return chatSessionService.save(clientId, session);
}

export async function deleteChatSession(
  clientId: string,
  sessionId: string
): Promise<ChatSessionHandlerResult<{ id: string }>> {
  return chatSessionService.remove(clientId, sessionId);
}
