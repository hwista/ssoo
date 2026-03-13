export function buildSessionHistoryItems(
  sessions: Array<{
    id: string;
    title: string;
    updatedAt: string;
    persistedToDb?: boolean;
  }>,
  activeSessionId: string | null
) {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    active: session.id === activeSessionId,
    persistedToDb: session.persistedToDb,
  }));
}
