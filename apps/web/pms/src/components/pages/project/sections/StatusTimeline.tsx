'use client';

import type { ProjectStatusItem, ProjectStatusCode } from '@/lib/api/endpoints/projects';
import { CheckCircle, Circle } from 'lucide-react';

const statusLabels: Record<ProjectStatusCode, string> = {
  request: '요청',
  proposal: '제안',
  execution: '수행',
  transition: '전환',
};

const STATUS_ORDER: ProjectStatusCode[] = ['request', 'proposal', 'execution', 'transition'];

interface StatusTimelineProps {
  statuses: ProjectStatusItem[];
  currentStatusCode: ProjectStatusCode;
}

export function StatusTimeline({ statuses, currentStatusCode }: StatusTimelineProps) {
  const statusMap = new Map(statuses.map((s) => [s.statusCode, s]));
  const currentIndex = STATUS_ORDER.indexOf(currentStatusCode);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h2 className="text-sm font-semibold mb-4">상태 이력</h2>
      <div className="flex items-start gap-0">
        {STATUS_ORDER.map((code, index) => {
          const status = statusMap.get(code);
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={code} className="flex-1 flex flex-col items-center text-center">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={`h-0.5 flex-1 ${isPast || isCurrent ? 'bg-ssoo-primary' : 'bg-gray-200'}`} />
                )}
                <div className={`flex-shrink-0 rounded-full ${isPast || isCurrent ? 'text-ssoo-primary' : 'text-gray-300'}`}>
                  {isPast ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Circle className={`h-6 w-6 ${isCurrent ? 'fill-ssoo-primary/20' : ''}`} />
                  )}
                </div>
                {index < STATUS_ORDER.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isPast ? 'bg-ssoo-primary' : 'bg-gray-200'}`} />
                )}
              </div>
              <p className={`mt-2 text-xs font-medium ${isCurrent ? 'text-ssoo-primary' : 'text-muted-foreground'}`}>
                {statusLabels[code]}
              </p>
              {status && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {status.statusGoal}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
