-- =========================================================
-- Seed: 16_sns_access_policy_foundation.sql
-- SNS feature access vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('sns.feed.read', 'SNS 피드 조회', 'sns', 'action', 'SNS 피드, 게시판, 프로필 등 기본 커뮤니티 읽기 기능을 사용하는 권한', 220, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.post.write', 'SNS 게시물 작성', 'sns', 'action', 'SNS 게시물을 작성, 수정, 삭제하는 권한', 221, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.comment.write', 'SNS 댓글 작성', 'sns', 'action', 'SNS 댓글을 작성, 수정, 삭제하는 권한', 222, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.reaction.use', 'SNS 반응 사용', 'sns', 'action', 'SNS 게시물 반응 기능을 사용하는 권한', 223, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.follow.manage', 'SNS 팔로우 관리', 'sns', 'action', 'SNS 팔로우/언팔로우 및 팔로우 목록 기능을 사용하는 권한', 224, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.skill.manage', 'SNS 스킬 관리', 'sns', 'action', 'SNS 스킬 추가/제거/추천과 스킬 관리 기능을 사용하는 권한', 225, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp),
  ('sns.board.manage', 'SNS 게시판 관리', 'sns', 'action', 'SNS 게시판 생성, 수정, 삭제를 수행하는 권한', 226, true, 'SNS access policy seed', 'sns-access-policy-seed', 'seed.sns-access-policy', current_timestamp)
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    domain_code = excluded.domain_code,
    permission_axis = excluded.permission_axis,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_role_permission_r (
  role_id, permission_id, is_active, memo, last_source, last_activity, updated_at
)
select
  r.role_id,
  p.permission_id,
  true as is_active,
  'Seeded SNS role baseline permission' as memo,
  'sns-access-policy-seed' as last_source,
  'seed.sns-access-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('admin', 'sns.feed.read'),
    ('admin', 'sns.post.write'),
    ('admin', 'sns.comment.write'),
    ('admin', 'sns.reaction.use'),
    ('admin', 'sns.follow.manage'),
    ('admin', 'sns.skill.manage'),
    ('admin', 'sns.board.manage'),
    ('manager', 'sns.feed.read'),
    ('manager', 'sns.post.write'),
    ('manager', 'sns.comment.write'),
    ('manager', 'sns.reaction.use'),
    ('manager', 'sns.follow.manage'),
    ('manager', 'sns.skill.manage'),
    ('manager', 'sns.board.manage'),
    ('user', 'sns.feed.read'),
    ('user', 'sns.post.write'),
    ('user', 'sns.comment.write'),
    ('user', 'sns.reaction.use'),
    ('user', 'sns.follow.manage'),
    ('viewer', 'sns.feed.read')
) as mapping(role_code, permission_code)
join common.cm_role_m r on r.role_code = mapping.role_code
join common.cm_permission_m p on p.permission_code = mapping.permission_code
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

commit;
