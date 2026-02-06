'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormPageTemplate } from '@/components/templates';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTabStore } from '@/stores';
import { apiClient } from '@/lib/api/client';

// Validation Schema
const createRequestSchema = z.object({
  projectName: z.string()
    .min(2, '프로젝트명은 2자 이상이어야 합니다')
    .max(100, '프로젝트명은 100자 이하여야 합니다'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof createRequestSchema>;

export function RequestCreatePage() {
  const { openTab } = useTabStore();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      projectName: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/projects', {
        projectName: data.projectName,
        description: data.description || undefined,
        statusCode: 'request',
        stageCode: 'waiting',
      });

      const result = response.data;

      if (result.success) {
        // 목록 페이지 탭 열기
        openTab({
          menuCode: 'request.list',
          menuId: 'request.list',
          title: '요청 목록',
          path: '/request',
        });
      } else {
        alert(result.error?.message || '등록에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageTemplate
      header={{
        title: '요청 등록',
        description: '고객사로부터 접수된 새로운 요청을 등록합니다',
        breadcrumb: ['요청', '요청 목록', '등록'],
      }}
      sections={[
        {
          key: 'basic',
          title: '기본 정보',
          description: '프로젝트의 기본 정보를 입력합니다',
          children: (
            <>
              <FormField
                label="프로젝트명"
                required
                error={form.formState.errors.projectName?.message}
                hint="고객사로부터 접수된 요청의 프로젝트명을 입력하세요"
              >
                <Input
                  {...form.register('projectName')}
                  placeholder="예: ○○사 ERP 고도화 요청"
                />
              </FormField>
            </>
          ),
        },
        {
          key: 'detail',
          title: '상세 정보',
          description: '요청 상세 내용을 입력합니다',
          children: (
            <>
              <FormField
                label="요청 내용"
                error={form.formState.errors.description?.message}
                hint="고객 요청 사항을 자세히 입력하세요"
              >
                <Textarea
                  {...form.register('description')}
                  rows={5}
                  placeholder="고객 요청 사항을 입력하세요"
                />
              </FormField>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  📌 등록 시 자동 설정되는 값
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 상태: <strong>요청 (Request)</strong></li>
                  <li>• 단계: <strong>대기 (Waiting)</strong></li>
                </ul>
              </div>
            </>
          ),
        },
      ]}
      onFormSubmit={form.handleSubmit(onSubmit)}
      onCancel={() => openTab({
        menuCode: 'request.list',
        menuId: 'request.list',
        title: '요청 목록',
        path: '/request',
      })}
      submitLabel="등록"
      cancelLabel="취소"
      loading={loading}
      submitDisabled={!form.formState.isValid}
    />
  );
}
