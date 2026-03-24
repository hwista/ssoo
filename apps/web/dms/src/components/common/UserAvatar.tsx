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

  const prevAvatarUrl = React.useRef(avatarUrl);
  const prevEmail = React.useRef(email);

  if (prevAvatarUrl.current !== avatarUrl) {
    prevAvatarUrl.current = avatarUrl;
    setImgError(false);
  }
  if (prevEmail.current !== email) {
    prevEmail.current = email;
    setGravatarError(false);
  }

  const initials = getInitials(name);
  const bgColor = getNameColor(name);
  const gravatarUrl = email ? getGravatarUrl(email, size * 2) : undefined;

  const sizeStyle = { width: size, height: size, minWidth: size };

  // 1. 로컬 아바타
  if (avatarUrl && !imgError) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className={cn('rounded-full object-cover', className)}
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
        className={cn('rounded-full object-cover', className)}
        style={sizeStyle}
        onError={() => setGravatarError(true)}
      />
    );
  }

  // 3. 이니셜 폴백
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-medium select-none',
        className,
      )}
      style={{ ...sizeStyle, backgroundColor: bgColor, fontSize: size * 0.45 }}
      title={name}
    >
      {initials}
    </div>
  );
}
