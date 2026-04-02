'use client';

import { Download, FileText, Loader2, Printer, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

interface DocumentExportMenuProps {
  onConvertToTemplate: () => void;
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
  loading?: boolean;
}

export function DocumentExportMenu({
  onConvertToTemplate,
  onDownloadMarkdown,
  onDownloadPdf,
  loading = false,
}: DocumentExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-control-h w-control-h hover:bg-gray-100"
          aria-label="내보내기"
          title="내보내기"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 border-gray-200 bg-gray-100 p-2 shadow-lg">
        <DropdownMenuItem
          onClick={onConvertToTemplate}
          className="text-[0.8125rem] text-gray-800 focus:bg-white focus:text-ssoo-primary"
        >
          <FileText className="h-4 w-4" />
          템플릿 전환
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDownloadMarkdown}
          className="text-[0.8125rem] text-gray-800 focus:bg-white focus:text-ssoo-primary"
        >
          <Download className="h-4 w-4" />
          마크다운 다운로드
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-300" />
        <DropdownMenuItem
          onClick={onDownloadPdf}
          className="text-[0.8125rem] text-gray-800 focus:bg-white focus:text-ssoo-primary"
        >
          <Printer className="h-4 w-4" />
          PDF 다운로드
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
