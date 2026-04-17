-- =========================================================
-- Seed: 16_cms_access_policy_foundation.sql
-- CMS feature access vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('cms.feed.read', 'CMS 피드 조회', 'cms', 'action', 'CMS 피드, 게시판, 프로필 등 기본 커뮤니티 읽기 기능을 사용하는 권한', 220, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.post.write', 'CMS 게시물 작성', 'cms', 'action', 'CMS 게시물을 작성, 수정, 삭제하는 권한', 221, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.comment.write', 'CMS 댓글 작성', 'cms', 'action', 'CMS 댓글을 작성, 수정, 삭제하는 권한', 222, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.reaction.use', 'CMS 반응 사용', 'cms', 'action', 'CMS 게시물 반응 기능을 사용하는 권한', 223, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.follow.manage', 'CMS 팔로우 관리', 'cms', 'action', 'CMS 팔로우/언팔로우 및 팔로우 목록 기능을 사용하는 권한', 224, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.skill.manage', 'CMS 스킬 관리', 'cms', 'action', 'CMS 스킬 추가/제거/추천과 스킬 관리 기능을 사용하는 권한', 225, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp),
  ('cms.board.manage', 'CMS 게시판 관리', 'cms', 'action', 'CMS 게시판 생성, 수정, 삭제를 수행하는 권한', 226, true, 'CMS access policy seed', 'cms-access-policy-seed', 'seed.cms-access-policy', current_timestamp)
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
  'Seeded CMS role baseline permission' as memo,
  'cms-access-policy-seed' as last_source,
  'seed.cms-access-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('admin', 'cms.feed.read'),
    ('admin', 'cms.post.write'),
    ('admin', 'cms.comment.write'),
    ('admin', 'cms.reaction.use'),
    ('admin', 'cms.follow.manage'),
    ('admin', 'cms.skill.manage'),
    ('admin', 'cms.board.manage'),
    ('manager', 'cms.feed.read'),
    ('manager', 'cms.post.write'),
    ('manager', 'cms.comment.write'),
    ('manager', 'cms.reaction.use'),
    ('manager', 'cms.follow.manage'),
    ('manager', 'cms.skill.manage'),
    ('manager', 'cms.board.manage'),
    ('user', 'cms.feed.read'),
    ('user', 'cms.post.write'),
    ('user', 'cms.comment.write'),
    ('user', 'cms.reaction.use'),
    ('user', 'cms.follow.manage'),
    ('viewer', 'cms.feed.read')
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
