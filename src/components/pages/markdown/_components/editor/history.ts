export interface HistoryEntry {
  content: string;
  cursorPosition: number;
}

export interface HistoryState {
  entries: HistoryEntry[];
  index: number;
}

export type HistoryAction =
  | { type: 'push'; entry: HistoryEntry; maxHistorySize: number }
  | { type: 'reset'; entry: HistoryEntry }
  | { type: 'clear'; entry: HistoryEntry }
  | { type: 'move'; index: number };

export function createHistoryEntry(content: string, cursorPosition: number): HistoryEntry {
  return { content, cursorPosition };
}

export function createInitialHistoryState(content: string): HistoryState {
  return {
    entries: [createHistoryEntry(content, 0)],
    index: 0,
  };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'push': {
      const nextEntries = state.entries.slice(0, state.index + 1);
      nextEntries.push(action.entry);

      if (nextEntries.length > action.maxHistorySize) {
        nextEntries.shift();
      }

      return {
        entries: nextEntries,
        index: nextEntries.length - 1,
      };
    }
    case 'reset':
    case 'clear':
      return {
        entries: [action.entry],
        index: 0,
      };
    case 'move':
      return {
        ...state,
        index: action.index,
      };
    default:
      return state;
  }
}
