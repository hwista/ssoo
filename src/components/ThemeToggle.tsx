'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  ChevronDown
} from 'lucide-react';
import { useThemeStore } from '@/stores';

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ThemeToggle({ showLabel = false, compact = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, initializeTheme } = useThemeStore();
  const [showDropdown, setShowDropdown] = useState(false);

  // 초기화
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const themeOptions = [
    { value: 'light', label: '라이트', icon: Sun },
    { value: 'dark', label: '다크', icon: Moon },
    { value: 'system', label: '시스템', icon: Monitor },
  ] as const;

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[0];
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  if (compact) {
    // 컴팩트 모드: 아이콘만 표시, 클릭 시 토글
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      >
        <CurrentIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    );
  }

  // 드롭다운 모드
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <CurrentIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {showLabel && (
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {currentOption.label}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {showDropdown && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* 드롭다운 메뉴 */}
          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-20">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                  {isSelected && (
                    <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
