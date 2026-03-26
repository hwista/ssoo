'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '../common/page/Breadcrumb';
import { FormSection, FormActions, FormActionsProps } from '../common/form';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, ErrorState } from '../common/StateDisplay';

/**
 * 폼 헤더 설정 (Breadcrumb용)
 */
export interface FormHeaderConfig {
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (선택) */
  description?: string;
  /** 브레드크럼 경로 */
  breadcrumb?: (string | { label: string; href?: string })[];
}

/**
 * 폼 섹션 정의
 */
export interface FormSectionConfig {
  /** 섹션 키 */
  key: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 설명 */
  description?: string;
  /** 섹션 콘텐츠 (폼 필드들) */
  children: React.ReactNode;
}

/**
 * FormPageTemplate Props
 */
export interface FormPageTemplateProps extends Omit<FormActionsProps, 'className'> {
  /** 헤더 설정 (title, description, breadcrumb) */
  header: FormHeaderConfig;
  /** 폼 섹션들 */
  sections: FormSectionConfig[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 */
  error?: Error | string | null;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 폼 제출 핸들러 (form onSubmit) */
  onFormSubmit?: (e: React.FormEvent) => void;
  /** 페이지 wrapper className */
  className?: string;
  /** 폼 영역 wrapper className */
  formClassName?: string;
}

/**
 * FormPageTemplate 컴포넌트
 * 
 * 폼 페이지의 표준 레이아웃을 제공합니다.
 * Breadcrumb + Title + FormSections + FormActions 구조
 * 
 * @example
 * ```tsx
 * <FormPageTemplate
 *   header={{
 *     title: '고객요청 등록',
 *     description: '새로운 요청을 등록합니다',
 *     breadcrumb: ['요청', '고객요청 관리', '등록'],
 *   }}
 *   sections={[
 *     {
 *       key: 'basic',
 *       title: '기본 정보',
 *       children: (
 *         <>
 *           <FormField label="제목" required>
 *             <Input {...register('title')} />
 *           </FormField>
 *         </>
 *       )
 *     }
 *   ]}
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 *   loading={isSubmitting}
 * />
 * ```
 */
export function FormPageTemplate({
  header,
  sections,
  loading = false,
  error,
  onRetry,
  onFormSubmit,
  className,
  formClassName,
  // FormActions props
  onSubmit,
  onCancel,
  onDelete,
  submitLabel,
  cancelLabel,
  deleteLabel,
  submitDisabled,
  showDelete,
  loading: actionLoading,
}: FormPageTemplateProps) {
  // 헤더 렌더링 (Breadcrumb + Title)
  const renderHeader = () => (
    <div className="space-y-1">
      {header.breadcrumb && header.breadcrumb.length > 0 && (
        <Breadcrumb items={header.breadcrumb} />
      )}
      <div>
        <h1 className="heading-1">{header.title}</h1>
        {header.description && (
          <p className="text-sm text-muted-foreground mt-1">{header.description}</p>
        )}
      </div>
    </div>
  );

  // 에러 상태
  if (error) {
    return (
      <div className={cn('p-6 space-y-6', className)}>
        {renderHeader()}
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className={cn('p-6 space-y-6', className)}>
        {renderHeader()}
        <LoadingState message="데이터를 불러오는 중..." fullHeight />
      </div>
    );
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* 페이지 헤더 */}
      {renderHeader()}

      {/* 폼 영역 */}
      <form onSubmit={onFormSubmit}>
        <Card className={formClassName}>
          <CardContent className="pt-6 space-y-8">
            {/* 섹션들 */}
            {sections.map((section) => (
              <FormSection
                key={section.key}
                title={section.title}
                description={section.description}
              >
                {section.children}
              </FormSection>
            ))}

            {/* 액션 버튼 */}
            <FormActions
              onSubmit={onSubmit}
              onCancel={onCancel}
              onDelete={onDelete}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              deleteLabel={deleteLabel}
              loading={actionLoading}
              submitDisabled={submitDisabled}
              showDelete={showDelete}
            />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
