import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module.js';
import { PostModule } from './post/post.module.js';
import { CommentModule } from './comment/comment.module.js';
import { BoardModule } from './board/board.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SkillModule } from './skill/skill.module.js';
import { FollowModule } from './follow/follow.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { FeedModule } from './feed/feed.module.js';

@Module({
  imports: [AccessModule, PostModule, CommentModule, BoardModule, ProfileModule, SkillModule, FollowModule, NotificationModule, FeedModule],
  exports: [AccessModule, PostModule, CommentModule, BoardModule, ProfileModule, SkillModule, FollowModule, NotificationModule, FeedModule],
})
export class CmsModule {}
