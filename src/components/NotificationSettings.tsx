'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings24Regular,
  Mail24Regular,
  Alert24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  Send24Regular
} from '@fluentui/react-icons';
import {
  NotificationPreferences,
  NotificationType,
  NotificationChannel,
  NOTIFICATION_LABELS,
  NOTIFICATION_ICONS
} from '@/lib/notifications/types';

interface NotificationSettingsProps {
  userId: string;
  onClose?: () => void;
}

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: '앱 내 알림',
  email: '이메일',
  teams: 'Microsoft Teams'
};

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  in_app: '🔔',
  email: '📧',
  teams: '💬'
};

export default function NotificationSettings({ userId, onClose }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 테스트 상태
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);

  // 설정 로드
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?userId=${userId}&action=preferences`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설정을 불러올 수 없어요');
      }

      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 설정 저장
  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePreferences',
          userId,
          preferences: updates
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설정을 저장할 수 없어요');
      }

      setPreferences(data.preferences);
      setSuccess('설정이 저장되었어요');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요');
    } finally {
      setIsSaving(false);
    }
  };

  // 채널 토글
  const toggleChannel = (channel: NotificationChannel) => {
    if (!preferences) return;

    savePreferences({
      channels: {
        ...preferences.channels,
        [channel]: !preferences.channels[channel]
      }
    });
  };

  // 알림 유형별 채널 토글
  const toggleTypeChannel = (type: NotificationType, channel: NotificationChannel) => {
    if (!preferences) return;

    const currentChannels = preferences.types[type].channels;
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(ch => ch !== channel)
      : [...currentChannels, channel];

    savePreferences({
      types: {
        ...preferences.types,
        [type]: {
          ...preferences.types[type],
          channels: newChannels
        }
      }
    });
  };

  // 알림 유형 활성화/비활성화
  const toggleTypeEnabled = (type: NotificationType) => {
    if (!preferences) return;

    savePreferences({
      types: {
        ...preferences.types,
        [type]: {
          ...preferences.types[type],
          enabled: !preferences.types[type].enabled
        }
      }
    });
  };

  // 이메일 설정 업데이트
  const updateEmailSettings = (email: string, frequency: 'instant' | 'hourly' | 'daily' | 'weekly') => {
    savePreferences({
      email: {
        address: email,
        digestFrequency: frequency
      }
    });
  };

  // Teams 설정 업데이트
  const updateTeamsSettings = (webhookUrl: string) => {
    savePreferences({
      teams: { webhookUrl }
    });
  };

  // 테스트 이메일 전송
  const sendTestEmail = async () => {
    if (!preferences?.email?.address) return;

    setTestingEmail(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'testEmail',
          email: preferences.email.address
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('테스트 이메일을 전송했어요');
      } else {
        setError(data.message || '이메일 전송에 실패했어요');
      }
    } catch (err) {
      setError('이메일 전송 중 오류가 발생했어요');
    } finally {
      setTestingEmail(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  // 테스트 Teams 메시지 전송
  const sendTestTeams = async () => {
    if (!preferences?.teams?.webhookUrl) return;

    setTestingTeams(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'testTeams',
          webhookUrl: preferences.teams.webhookUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Teams 테스트 메시지를 전송했어요');
      } else {
        setError(data.message || 'Teams 메시지 전송에 실패했어요');
      }
    } catch (err) {
      setError('Teams 메시지 전송 중 오류가 발생했어요');
    } finally {
      setTestingTeams(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        설정을 불러오는 중...
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6 text-center text-red-500">
        {error || '설정을 불러올 수 없어요'}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <Settings24Regular />
          알림 설정
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Dismiss24Regular className="w-5 h-5 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* 알림 메시지 */}
      {(error || success) && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
          error
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
        }`}>
          {error || success}
        </div>
      )}

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 채널 설정 */}
        <section>
          <h3 className="font-medium mb-3 dark:text-white">알림 채널</h3>
          <div className="space-y-2">
            {(Object.keys(preferences.channels) as NotificationChannel[]).map(channel => (
              <label
                key={channel}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CHANNEL_ICONS[channel]}</span>
                  <span className="dark:text-white">{CHANNEL_LABELS[channel]}</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channels[channel]}
                  onChange={() => toggleChannel(channel)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        </section>

        {/* 이메일 설정 */}
        {preferences.channels.email && (
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
              <Mail24Regular />
              이메일 설정
            </h3>
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  이메일 주소
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={preferences.email?.address || ''}
                    onChange={(e) => updateEmailSettings(
                      e.target.value,
                      preferences.email?.digestFrequency || 'instant'
                    )}
                    placeholder="example@company.com"
                    className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={!preferences.email?.address || testingEmail}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send24Regular className="w-4 h-4" />
                    {testingEmail ? '전송 중...' : '테스트'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  다이제스트 주기
                </label>
                <select
                  value={preferences.email?.digestFrequency || 'instant'}
                  onChange={(e) => updateEmailSettings(
                    preferences.email?.address || '',
                    e.target.value as 'instant' | 'hourly' | 'daily' | 'weekly'
                  )}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                >
                  <option value="instant">즉시 전송</option>
                  <option value="hourly">시간별 요약</option>
                  <option value="daily">일별 요약</option>
                  <option value="weekly">주별 요약</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Teams 설정 */}
        {preferences.channels.teams && (
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
              💬 Microsoft Teams 설정
            </h3>
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={preferences.teams?.webhookUrl || ''}
                    onChange={(e) => updateTeamsSettings(e.target.value)}
                    placeholder="https://outlook.office.com/webhook/..."
                    className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  />
                  <button
                    onClick={sendTestTeams}
                    disabled={!preferences.teams?.webhookUrl || testingTeams}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send24Regular className="w-4 h-4" />
                    {testingTeams ? '전송 중...' : '테스트'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Teams 채널 설정 → 커넥터 → Incoming Webhook에서 URL을 복사하세요
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 알림 유형별 설정 */}
        <section>
          <h3 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
            <Alert24Regular />
            알림 유형별 설정
          </h3>
          <div className="space-y-2">
            {(Object.keys(preferences.types) as NotificationType[]).map(type => (
              <div
                key={type}
                className={`p-4 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                  !preferences.types[type].enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.types[type].enabled}
                      onChange={() => toggleTypeEnabled(type)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500"
                    />
                    <span className="text-lg">{NOTIFICATION_ICONS[type]}</span>
                    <span className="font-medium dark:text-white">{NOTIFICATION_LABELS[type]}</span>
                  </label>
                </div>

                {preferences.types[type].enabled && (
                  <div className="flex flex-wrap gap-2 ml-6">
                    {(Object.keys(preferences.channels) as NotificationChannel[])
                      .filter(ch => preferences.channels[ch])
                      .map(channel => (
                        <button
                          key={channel}
                          onClick={() => toggleTypeChannel(type, channel)}
                          className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                            preferences.types[type].channels.includes(channel)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {preferences.types[type].channels.includes(channel) && (
                            <Checkmark24Regular className="w-3 h-3" />
                          )}
                          {CHANNEL_LABELS[channel]}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 저장 상태 표시 */}
      {isSaving && (
        <div className="p-3 border-t dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          저장 중...
        </div>
      )}
    </div>
  );
}
