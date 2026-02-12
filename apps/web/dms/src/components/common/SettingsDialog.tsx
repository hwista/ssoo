'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Save, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings.store';

/**
 * 설정 다이얼로그
 *
 * UserMenu "설정" 클릭 시 열림
 * - Git 저장소 경로 관리
 * - 커밋 Author 설정
 */
export function SettingsDialog() {
  const {
    isDialogOpen,
    closeDialog,
    config,
    wikiDir,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateGitSettings,
    updateGitPath,
  } = useSettingsStore();

  // 로컬 폼 상태
  const [repoPath, setRepoPath] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [copyFiles, setCopyFiles] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 다이얼로그 열릴 때 설정 로드
  useEffect(() => {
    if (isDialogOpen && !isLoaded) {
      loadSettings();
    }
  }, [isDialogOpen, isLoaded, loadSettings]);

  // 설정이 로드되면 폼에 반영
  useEffect(() => {
    if (config) {
      setRepoPath(config.git.repositoryPath || '');
      setAuthorName(config.git.author.name);
      setAuthorEmail(config.git.author.email);
    }
  }, [config]);

  // 경로 변경 여부
  const isPathChanged = config && repoPath !== (config.git.repositoryPath || '');

  // Author 변경 여부
  const isAuthorChanged =
    config &&
    (authorName !== config.git.author.name || authorEmail !== config.git.author.email);

  const hasChanges = isPathChanged || isAuthorChanged;

  /** 저장 */
  const handleSave = async () => {
    setSaveSuccess(false);
    let success = true;

    // 1. 경로가 변경된 경우
    if (isPathChanged && repoPath.trim()) {
      success = await updateGitPath(repoPath.trim(), copyFiles);
    }

    // 2. Author가 변경된 경우
    if (success && isAuthorChanged) {
      success = await updateGitSettings({
        author: { name: authorName, email: authorEmail },
      });
    }

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>DMS 문서 관리 시스템 설정</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">설정 로드 중...</span>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Git 섹션 */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Git 저장소
              </h3>

              <div className="space-y-3">
                {/* 저장소 경로 */}
                <div>
                  <label htmlFor="repo-path" className="text-xs font-medium text-muted-foreground mb-1 block">
                    저장소 경로
                  </label>
                  <input
                    id="repo-path"
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder={wikiDir || '/home/user/dms-wiki'}
                    className="flex h-control-h w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {wikiDir && !repoPath && (
                    <p className="text-xs text-muted-foreground mt-1">
                      현재: {wikiDir}
                    </p>
                  )}
                </div>

                {/* 경로 변경 시 파일 복사 옵션 */}
                {isPathChanged && repoPath.trim() && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyFiles}
                      onChange={(e) => setCopyFiles(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>기존 파일을 새 경로로 복사</span>
                  </label>
                )}

                {/* Author 이름 */}
                <div>
                  <label htmlFor="author-name" className="text-xs font-medium text-muted-foreground mb-1 block">
                    커밋 Author
                  </label>
                  <input
                    id="author-name"
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="DMS System"
                    className="flex h-control-h w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Author 이메일 */}
                <div>
                  <label htmlFor="author-email" className="text-xs font-medium text-muted-foreground mb-1 block">
                    커밋 Email
                  </label>
                  <input
                    id="author-email"
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="dms@localhost"
                    className="flex h-control-h w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </section>

            {/* 에러 표시 */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 성공 표시 */}
            {saveSuccess && (
              <div className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
                설정이 저장되었습니다.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            닫기
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
