'use client';

import { useState } from 'react';
import { Send, ImageIcon, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useCreatePost } from '@/hooks/queries/usePosts';

export function ComposeBox() {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const createPost = useCreatePost();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createPost.mutateAsync({ content: content.trim() });
    setContent('');
    setIsExpanded(false);
  };

  const initials = user?.displayName?.slice(0, 2) || user?.userName?.slice(0, 2) || user?.loginId?.slice(0, 2) || '?';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {isExpanded ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="무슨 생각을 하고 계신가요?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  autoFocus
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setIsExpanded(false); setContent(''); }}>
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!content.trim() || createPost.isPending}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      게시
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="w-full text-left px-4 py-3 rounded-full border border-input text-muted-foreground hover:bg-muted/50 transition-colors text-sm"
                onClick={() => setIsExpanded(true)}
              >
                무슨 생각을 하고 계신가요?
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
