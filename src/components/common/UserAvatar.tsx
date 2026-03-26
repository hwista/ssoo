'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getGravatarUrl, getInitials, getNameColor } from '@/lib/utils/gravatar';

export interface UserAvatarProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}

/**
 * 유저 아바타 컴포넌트
 *
 * 우선순위: avatarUrl(로컬) → Gravatar(email) → 이니셜(이름)
 */
export function UserAvatar({ name, email, avatarUrl, size = 28, className }: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const [gravatarError, setGravatarError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  React.useEffect(() => {
    setGravatarError(false);
  }, [email]);

  const initials = getInitials(name);
  const bgColor = getNameColor(name);
  const gravatarUrl = email ? getGravatarUrl(email, size * 2) : undefined;

  const sizeStyle = { width: size, height: size, minWidth: size };
  const imageClassName = cn('rounded-full object-cover', className);

  // 1. 로컬 아바타
  if (avatarUrl && !imgError) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className={imageClassName}
        style={sizeStyle}
        onError={() => setImgError(true)}
      />
    );
  }

  // 2. Gravatar
  if (gravatarUrl && !gravatarError) {
    return (
      <Image
        src={gravatarUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className={imageClassName}
        style={sizeStyle}
        onError={() => setGravatarError(true)}
      />
    );
  }

  // 3. 이니셜 폴백
  return (
    <div
      className={cn(
        // Avatar initials follow the label tier as semantic intent,
        // then scale with the container size at runtime.
        'flex items-center justify-center rounded-full select-none text-label-sm leading-none text-white',
        className,
      )}
      style={{ ...sizeStyle, backgroundColor: bgColor, fontSize: size * 0.45, lineHeight: 1 }}
      title={name}
    >
      {initials}
    </div>
  );
}
