import { useFileStore, useSidebarStore } from '@/stores';

export function resetDmsFileTreeSession(): void {
  useFileStore.getState().clearFiles();
  useSidebarStore.getState().resetUserState();
}
