-- =========================================================
-- CMS Seed Data: Default Skills
-- Schema: cms
-- =========================================================

-- 프로그래밍 언어
INSERT INTO cms.cms_skill_m (skill_name, skill_category, description, synonyms, is_active, created_at, updated_at)
VALUES
  ('Java', 'language', 'Java 프로그래밍 언어', ARRAY['JDK', 'J2EE'], true, NOW(), NOW()),
  ('TypeScript', 'language', 'TypeScript 프로그래밍 언어', ARRAY['TS'], true, NOW(), NOW()),
  ('JavaScript', 'language', 'JavaScript 프로그래밍 언어', ARRAY['JS', 'ECMAScript'], true, NOW(), NOW()),
  ('Python', 'language', 'Python 프로그래밍 언어', ARRAY['Py'], true, NOW(), NOW()),
  ('C#', 'language', 'C# 프로그래밍 언어', ARRAY['CSharp', '.NET'], true, NOW(), NOW()),
  ('SQL', 'language', 'SQL 쿼리 언어', ARRAY['Structured Query Language'], true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 프레임워크
INSERT INTO cms.cms_skill_m (skill_name, skill_category, description, synonyms, is_active, created_at, updated_at)
VALUES
  ('Spring Boot', 'framework', 'Java Spring Boot 프레임워크', ARRAY['Spring', 'Spring Framework'], true, NOW(), NOW()),
  ('NestJS', 'framework', 'Node.js NestJS 프레임워크', ARRAY['Nest'], true, NOW(), NOW()),
  ('React', 'framework', 'React UI 라이브러리', ARRAY['ReactJS', 'React.js'], true, NOW(), NOW()),
  ('Next.js', 'framework', 'React 기반 풀스택 프레임워크', ARRAY['NextJS'], true, NOW(), NOW()),
  ('Angular', 'framework', 'Angular 프레임워크', ARRAY['AngularJS'], true, NOW(), NOW()),
  ('Vue.js', 'framework', 'Vue.js 프레임워크', ARRAY['Vue', 'VueJS'], true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 인프라/도구
INSERT INTO cms.cms_skill_m (skill_name, skill_category, description, synonyms, is_active, created_at, updated_at)
VALUES
  ('Docker', 'infra', '컨테이너 기술', ARRAY['Container'], true, NOW(), NOW()),
  ('Kubernetes', 'infra', '컨테이너 오케스트레이션', ARRAY['K8s'], true, NOW(), NOW()),
  ('AWS', 'infra', 'Amazon Web Services', ARRAY['Amazon AWS'], true, NOW(), NOW()),
  ('Azure', 'infra', 'Microsoft Azure', ARRAY['MS Azure'], true, NOW(), NOW()),
  ('PostgreSQL', 'database', 'PostgreSQL 데이터베이스', ARRAY['Postgres', 'PG'], true, NOW(), NOW()),
  ('Oracle', 'database', 'Oracle 데이터베이스', ARRAY['OracleDB'], true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 역할/역량
INSERT INTO cms.cms_skill_m (skill_name, skill_category, description, synonyms, is_active, created_at, updated_at)
VALUES
  ('프로젝트 관리', 'management', 'PM / 프로젝트 매니지먼트', ARRAY['PM', 'Project Management'], true, NOW(), NOW()),
  ('요구사항 분석', 'management', '고객 요구사항 분석', ARRAY['RA', 'Requirements Analysis'], true, NOW(), NOW()),
  ('시스템 설계', 'architecture', '시스템 아키텍처 설계', ARRAY['SA', 'System Architecture'], true, NOW(), NOW()),
  ('UI/UX 디자인', 'design', 'UI/UX 설계', ARRAY['UX', 'UI Design'], true, NOW(), NOW()),
  ('데이터 모델링', 'architecture', 'DB 모델링 및 설계', ARRAY['DB Design', 'Data Modeling'], true, NOW(), NOW()),
  ('테스트/QA', 'quality', '품질 보증 및 테스트', ARRAY['QA', 'Testing'], true, NOW(), NOW())
ON CONFLICT DO NOTHING;
