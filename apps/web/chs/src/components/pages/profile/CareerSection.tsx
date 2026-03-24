'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ProfileItem } from '@/lib/api/endpoints/profiles';
import { AddCareerDialog } from './AddCareerDialog';

interface CareerSectionProps {
  careers: NonNullable<ProfileItem['careers']>;
  isOwnProfile: boolean;
}

export function CareerSection({ careers, isOwnProfile }: CareerSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">프로젝트 이력</CardTitle>
        {isOwnProfile && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            경력 추가
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {careers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 등록된 경력이 없습니다.
          </p>
        ) : (
          careers.map((career, index) => (
            <div key={career.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div>
                <h4 className="text-sm font-semibold">{career.projectName}</h4>
                <p className="text-xs text-muted-foreground">{career.roleName}</p>
                {career.companyName && (
                  <p className="text-xs text-muted-foreground">{career.companyName}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(career.startDate).toLocaleDateString('ko-KR')} ~{' '}
                  {career.endDate
                    ? new Date(career.endDate).toLocaleDateString('ko-KR')
                    : '현재'}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <AddCareerDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}
