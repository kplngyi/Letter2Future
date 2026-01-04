'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function LetterForm() {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const STORAGE_KEY = 'letter2future:draft';
  const TEMPLATE_TEXT = '亲爱的未来的我：\n\n希望收到这封信的你，一切安好。\n\n此刻的我想对你说——';

  const charCount = content.length;
  const maxChars = 3000;

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

  const getTimeUntil = (value: string, nowMs = Date.now()) => {
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
      // const pad2 = (n: number) => n.toString().padStart(2, '0');
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
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          email,
          scheduledTime: new Date(scheduledTime).toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `信件已成功封存！系统将在 ${new Date(scheduledTime).toLocaleString('zh-CN')} 将信件发送至您的邮箱，请留意查收。`,
        });
        
        // 清空表单
        setContent('');
        setEmail('');
        setScheduledTime('');
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
      setMessage({
        type: 'error',
        text: '网络错误，请检查网络连接后重试',
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
              信件内容 <span className="ml-2 text-sm font-normal text-gray-500">(支持 Markdown)</span>
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
            <span className="font-medium text-gray-800">
              {scheduledTime ? getTimeUntil(scheduledTime, now) || '未来某天' : '未来某天'}
            </span>{' '}
            收到这封信
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
            className={`p-4 rounded-lg ${
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
