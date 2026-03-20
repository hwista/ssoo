-- =========================================================
-- CHS Seed Data: Default Boards
-- Schema: chs
-- =========================================================

-- 기본 게시판 생성
INSERT INTO chs.ch_board_m (board_code, board_name, board_type, description, sort_order, is_default, is_active, created_at, updated_at)
VALUES
  ('notice', '공지사항', 'notice', '전사 공지사항 게시판', 1, false, true, NOW(), NOW()),
  ('qna', 'Q&A', 'qna', '질문과 답변 게시판', 2, false, true, NOW(), NOW()),
  ('free', '자유게시판', 'general', '자유롭게 글을 작성하는 게시판', 3, true, true, NOW(), NOW()),
  ('tech', '기술 공유', 'general', '기술 정보와 팁을 공유하는 게시판', 4, false, true, NOW(), NOW()),
  ('recruit', '인력 모집', 'recruit', '프로젝트 인력 모집 게시판', 5, false, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
