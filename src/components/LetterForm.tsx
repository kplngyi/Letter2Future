'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// 在 Node.js 环境中启用 crypto polyfill（仅用于测试）
if (typeof window === 'undefined' && typeof globalThis.crypto === 'undefined') {
  try {
    const { webcrypto } = require('crypto');
    globalThis.crypto = webcrypto as any;
  } catch (e) {
    // 忽略错误，在浏览器环境中不需要
  }
}

export default function LetterForm() {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [passphrase, setPassphrase] = useState('');
  const [timeDisplayMode, setTimeDisplayMode] = useState<'ymd' | 'days'>('ymd');
  const [useEncryption, setUseEncryption] = useState(true);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const STORAGE_KEY = 'letter2future:draft';
  const TEMPLATE_TEXT = '未来的我：\n\n希望收到这封信的你，一切安好。\n\n此刻的我想对你说——';

  const charCount = content.length;
  const maxChars = 3000;

  const toBase64 = (data: Uint8Array) => {
    let str = '';
    data.forEach((b) => {
      str += String.fromCharCode(b);
    });
    return btoa(str);
  };

  const encryptContent = async (plain: string, secret: string) => {
    if (!secret) throw new Error('请填写加密密钥');
    
    // 检查 crypto API 是否可用（浏览器或 Node.js polyfill）
    const cryptoApi = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
    if (!cryptoApi?.subtle) {
      throw new Error('当前环境不支持加密（需要 HTTPS 或现代浏览器）');
    }

    const encoder = new TextEncoder();
    const salt = cryptoApi.getRandomValues(new Uint8Array(16));
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));

    const keyMaterial = await cryptoApi.subtle.importKey(
      'raw',
      encoder.encode(secret),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await cryptoApi.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const cipherBuffer = await cryptoApi.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plain)
    );

    return {
      ciphertext: toBase64(new Uint8Array(cipherBuffer)),
      iv: toBase64(iv),
      salt: toBase64(salt),
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2',
      iterations: 100_000,
    } as const;
  };

  // 获取当前时间（用于设置最小可选时间）
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // 至少1分钟后
    return now.toISOString().slice(0, 16);
  };

  const formatDateTimeLocal = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const getTimeUntil = (value: string, mode: 'ymd' | 'days', nowMs = Date.now()) => {
    if (!value) return null;
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs = target.getTime() - nowMs;
    if (diffMs <= 0) return '不到1秒后';

    const dayMs = 1000 * 60 * 60 * 24;
    const diffDays = diffMs / dayMs;
    if (diffDays >= 1) {
      const totalDays = Math.floor(diffMs / dayMs);
      const years = Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      const days = totalDays - years * 365 - months * 30;
      if (mode === 'days') {
        return `${Math.ceil(diffDays)}天后`;
      }
      return `${years} 年 ${months} 个月 ${days} 天后`;
    }

    const totalSeconds = Math.round(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}小时${minutes}分${seconds}秒后`;
  };

  const handleQuickSelect = ({ months = 0, years = 0 }: { months?: number; years?: number }) => {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 1);

    const target = new Date();
    if (months) {
      target.setMonth(target.getMonth() + months);
    }
    if (years) {
      target.setFullYear(target.getFullYear() + years);
    }

    // 保证不早于最小可选时间
    const finalDate = target < minDate ? minDate : target;
    setScheduledTime(formatDateTimeLocal(finalDate));
  };

  const handleRandomSelect = () => {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 1);

    const target = new Date();
    const randomDays = Math.floor(Math.random() * 3650) + 1; // 1-3650 天，约 10 年内
    target.setDate(target.getDate() + randomDays);

    const finalDate = target < minDate ? minDate : target;
    setScheduledTime(formatDateTimeLocal(finalDate));
  };

  const handleSaveDraft = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ content, email, scheduledTime })
    );
    setMessage({ type: 'success', text: '草稿已保存' });
  };

  const handleResetTemplate = () => {
    setContent(TEMPLATE_TEXT);
    setScheduledTime('');
    setMessage(null);
  };

  // 恢复草稿
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { content?: string; email?: string; scheduledTime?: string };
      if (parsed.content) setContent(parsed.content);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.scheduledTime) {
        const min = new Date();
        min.setMinutes(min.getMinutes() + 1);
        const parsedDate = new Date(parsed.scheduledTime);
        if (!Number.isNaN(parsedDate.getTime()) && parsedDate >= min) {
          setScheduledTime(formatDateTimeLocal(parsedDate));
        }
      }
    } catch (err) {
      console.warn('Failed to restore draft', err);
    }
  }, []);

  // 动态刷新剩余时间显示
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 保存草稿
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({ content, email, scheduledTime });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [content, email, scheduledTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useEncryption && !passphrase) {
      setMessage({ type: 'error', text: '请填写加密密钥' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      let encrypted = null;
      if (useEncryption) {
        encrypted = await encryptContent(content, passphrase);
      }

      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted: useEncryption ? encrypted : null,
          content: useEncryption ? null : content,
          email,
          scheduledTime: new Date(scheduledTime).toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const scheduleDate = new Date(scheduledTime).toLocaleString('zh-CN');
        setMessage({
          type: 'success',
          text: `信件已成功封存！\n\n将于 ${scheduleDate} 发送至 ${email}\n\n💡 建议您截图保存此提示和邮箱信息，便于日后查询。`,
        });
        
        // 清空表单
        setContent('');
        setEmail('');
        setScheduledTime('');
        setPassphrase('');
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || '提交失败，请重试',
        });
      }
    } catch (error) {
      console.error('提交信件失败:', error);
      let errorMessage = '网络错误，请检查网络连接后重试';
      
      if (error instanceof Error) {
        // 区分不同类型的错误
        if (error.message.includes('加密') || error.message.includes('密钥')) {
          errorMessage = `加密失败: ${error.message}`;
        } else if (error.message.includes('fetch')) {
          errorMessage = '无法连接到服务器，请确保服务已启动';
        } else {
          errorMessage = `操作失败: ${error.message}`;
        }
      }
      
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-5 sm:p-8 md:p-12 overflow-hidden">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 信件内容 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3">
            <label htmlFor="content" className="block text-lg font-semibold text-gray-700">
              信件内容 <span className="ml-2 text-sm font-normal text-gray-500"></span>
            </label>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-1.5 text-sm rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition w-full sm:w-auto"
              >
                保存草稿
              </button>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto"
              >
                重置模板
              </button>
            </div>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={maxChars}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-800 font-mono"
            placeholder="亲爱的未来的自己... (支持 Markdown)"
          />
          <div className="mt-2 text-right">
            <span className={`text-sm ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
              {charCount} / {maxChars} 字
            </span>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">实时预览</div>
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 sm:p-4 min-h-[120px] text-gray-800 text-sm leading-6 overflow-auto">
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-gray-400">开始输入以预览 Markdown</p>
              )}
            </div>
          </div>
        </div>

        {/* 接收邮箱 */}
        <div>
          <label htmlFor="email" className="block text-lg font-semibold text-gray-700 mb-2">
            接收邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
            placeholder="your@email.com"
          />
        </div>

        {/* 加密密钥 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg font-semibold text-gray-700">信件加密</label>
            <div className="flex items-center gap-2">
              <input
                id="useEncryption"
                type="checkbox"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="useEncryption" className="text-sm text-gray-600 cursor-pointer">
                {useEncryption ? '使用加密' : '不加密'}
              </label>
            </div>
          </div>

          {useEncryption && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  required={useEncryption}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                  placeholder="请输入并妥善保存，平台不存密钥（也许工号是一个好的选择 ？？？）"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  title={showPassphrase ? '隐藏密钥' : '显示密钥'}
                >
                  {showPassphrase ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500">密钥不会上传或保存，请务必记住，否则无法解密信件。</p>
            </div>
          )}

          {!useEncryption && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ 信件将以明文形式存储。建议使用加密以保护您的隐私。
              </p>
            </div>
          )}
        </div>

        {/* 发送时间 */}
        <div className="space-y-2 min-w-0">
          <label htmlFor="scheduledTime" className="block text-lg font-semibold text-gray-700 mb-2">
            发送时间
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleQuickSelect({ months: 1 })}
              className="px-3 py-2 text-sm rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition w-full sm:w-auto"
            >
              一个月
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect({ months: 6 })}
              className="px-3 py-2 text-sm rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition w-full sm:w-auto"
            >
              半年
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect({ years: 1 })}
              className="px-3 py-2 text-sm rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition w-full sm:w-auto"
            >
              一年
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect({ years: 10 })}
              className="px-3 py-2 text-sm rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition w-full sm:w-auto"
            >
              十年 ！！！
            </button>
            <button
              type="button"
              onClick={handleRandomSelect}
              className="px-3 py-2 text-sm rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition w-full sm:w-auto"
            >
              随机 (1~10年)
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduledTime('');
                document.getElementById('scheduledTime')?.focus();
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto"
            >
              自定义时间
            </button>
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <input
            
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              min={getMinDateTime()}
              className="block w-full max-w-full min-w-0 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 text-sm sm:text-base"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            您将在{' '}
            <span
              className="font-medium text-gray-800 cursor-pointer select-none"
              onClick={() => setTimeDisplayMode((prev) => (prev === 'ymd' ? 'days' : 'ymd'))}
              title="点击切换显示规则"
            >
              {scheduledTime ? getTimeUntil(scheduledTime, timeDisplayMode, now) || '未来某天' : '未来某天'}
            </span>{' '}
            收到这封信
            <span className="ml-2 text-xs text-gray-400 select-none">(点击可切换)</span>
          </p>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isSubmitting ? '提交中...' : '封存信件'}
        </button>

        {/* 提示信息 */}
        {message && (
          <div
            className={`p-4 rounded-lg whitespace-pre-line ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}
      </form>

      {/* 使用说明 */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">使用说明</h3>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="mr-2">📝</span>
            <span>想对未来说的话，最多支持3000字</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">📧</span>
            <span>填写接收邮箱，无需验证</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">⏰</span>
            <span>选择未来的某个时间，系统将自动发送</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">🔒</span>
            <span>信件提交后无法修改或撤回</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
