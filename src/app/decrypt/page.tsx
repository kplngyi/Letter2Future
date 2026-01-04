'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export default function DecryptPage() {
  const searchParams = useSearchParams();
  const [ciphertext, setCiphertext] = useState('');
  const [iv, setIv] = useState('');
  const [salt, setSalt] = useState('');
  const [iterations, setIterations] = useState('100000');
  const [passphrase, setPassphrase] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [visibleLines, setVisibleLines] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingChars, setGreetingChars] = useState(0);
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // 从 URL 参数读取密文信息
    const c = searchParams.get('c');
    const i = searchParams.get('i');
    const s = searchParams.get('s');
    const iter = searchParams.get('iter');

    if (c) setCiphertext(c);
    if (i) setIv(i);
    if (s) setSalt(s);
    if (iter) setIterations(iter);
  }, [searchParams]);

  useEffect(() => {
    if (!decryptedText) {
      setVisibleLines(0);
      setShowGreeting(false);
      setGreetingChars(0);
      return;
    }

    // 先显示欢迎语
    setShowGreeting(true);
    const greeting = "Hi 还记得这封信吗";
    
    // 打字机效果显示欢迎语
    let charIndex = 0;
    const greetingTimer = setInterval(() => {
      charIndex++;
      setGreetingChars(charIndex);
      if (charIndex >= greeting.length) {
        clearInterval(greetingTimer);
      }
    }, 80); // 每个字80ms

    // 欢迎语显示2秒后开始显示信件内容
    const delayTimer = setTimeout(() => {
      const lines = decryptedText.split('\n');
      let currentLine = 0;

      const contentTimer = setInterval(() => {
        currentLine++;
        setVisibleLines(currentLine);
        
        if (currentLine >= lines.length) {
          clearInterval(contentTimer);
        }
      }, 100); // 每行间隔100ms
    }, 2000); // 2秒后开始

    return () => {
      clearInterval(greetingTimer);
      clearTimeout(delayTimer);
    };
  }, [decryptedText]);

  const fromBase64 = (b64: string): Uint8Array => {
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleDecrypt = async () => {
    setError('');
    setDecryptedText('');
    setIsDecrypting(true);

    try {
      if (!ciphertext || !iv || !salt || !passphrase) {
        throw new Error('请填写所有必填字段');
      }

      if (typeof window === 'undefined' || !window.crypto?.subtle) {
        throw new Error('当前环境不支持解密');
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const saltBuf = fromBase64(salt);
      const ivBuf = fromBase64(iv);
      const cipherBuf = fromBase64(ciphertext);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuf,
          iterations: parseInt(iterations) || 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuf },
        key,
        cipherBuf
      );

      const plainText = decoder.decode(plainBuffer);
      setDecryptedText(plainText);
    } catch (err) {
      const message = err instanceof Error ? err.message : '解密失败';
      const maybeKeyIssue =
        err instanceof DOMException ||
        message.includes('OperationError') ||
        message.toLowerCase().includes('decrypt');
      if (maybeKeyIssue) {
        setError('解密失败，可能是密钥不匹配或 IV / Salt / 迭代次数不一致');
      } else {
        setError(message || '解密失败，请检查密钥是否正确');
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          {!decryptedText ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">📬 信件解密</h1>
              <p className="text-gray-600">输入您的密钥来解密信件内容</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3 animate-bounce-subtle">✉️</div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">来自过去的一封信</h1>
              <p className="text-gray-600">Letter from the Past</p>
            </>
          )}
        </div>

        {!decryptedText ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
            {/* 密文信息 */}
            <div>
              <label htmlFor="ciphertext" className="block text-sm font-semibold text-gray-700 mb-2">
                密文 (Ciphertext)
              </label>
              <textarea
                id="ciphertext"
                value={ciphertext}
                onChange={(e) => setCiphertext(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                placeholder="粘贴密文..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="iv" className="block text-sm font-semibold text-gray-700 mb-2">
                  IV (初始向量)
                </label>
                <input
                  id="iv"
                  type="text"
                  value={iv}
                  onChange={(e) => setIv(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                  placeholder="IV..."
                />
              </div>

              <div>
                <label htmlFor="salt" className="block text-sm font-semibold text-gray-700 mb-2">
                  Salt (盐值)
                </label>
                <input
                  id="salt"
                  type="text"
                  value={salt}
                  onChange={(e) => setSalt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                  placeholder="Salt..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="iterations" className="block text-sm font-semibold text-gray-700 mb-2">
                迭代次数 (Iterations)
              </label>
              <input
                id="iterations"
                type="text"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="100000"
              />
            </div>

            <div>
              <label htmlFor="passphrase" className="block text-sm font-semibold text-gray-700 mb-2">
                密钥 (Passphrase) *
              </label>
              <input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDecrypt();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="输入您保存的密钥..."
              />
            </div>

            <button
              onClick={handleDecrypt}
              disabled={isDecrypting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDecrypting ? '解密中...' : '🔓 解密信件'}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <p className="text-red-800 text-sm">{error}</p>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  <li>确认密钥输入正确，无额外空格</li>
                  <li>确保 IV / Salt / 迭代次数与邮件中的一致（默认 100000）</li>
                  <li>若复制粘贴，请检查是否缺失字符</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 md:p-16 relative overflow-hidden animate-fade-in">
            {/* 信纸装饰背景 */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-pink-300 rounded-full blur-3xl animate-float-delayed"></div>
            </div>

            <div className="relative">
              {/* 欢迎语动画 - 作为信件头部 */}
              {showGreeting && visibleLines === 0 && (
                <div className="text-center mb-12 pb-6 border-b-2 border-purple-100 animate-fade-in">
                  <p className="text-2xl sm:text-3xl font-light text-gray-700 tracking-wide" style={{
                    fontFamily: "'Noto Serif SC', 'Source Han Serif', serif"
                  }}>
                    {"Hi 还记得这封信吗".slice(0, greetingChars)}
                    <span className="inline-block w-0.5 h-7 bg-purple-500 ml-1 animate-pulse"></span>
                  </p>
                </div>
              )}

              {/* 信件正文 */}
              <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed mb-8" style={{
                fontFamily: "'Noto Serif SC', 'Source Han Serif', serif"
              }}>
                {decryptedText.split('\n').map((line, index) => (
                  <div
                    key={index}
                    className={`transition-all ${
                      index < visibleLines
                        ? 'opacity-100 translate-y-0 blur-0 scale-100 brightness-100'
                        : 'opacity-0 translate-y-1 blur-[2px] scale-[0.98] brightness-90'
                    }`}
                    style={{
                      transitionDuration: '1200ms',
                      transitionDelay: `${index * 60}ms`,
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>

              {/* 信件底部 */}
              <div className="pt-6 border-t border-gray-200 flex justify-between items-center animate-fade-in" style={{
                animationDelay: '0.4s'
              }}>
                <button
                  onClick={() => {
                    setDecryptedText('');
                    setVisibleLines(0);
                    setPassphrase('');
                    setError('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-300 hover:translate-x-1"
                >
                  ← 返回解密页面
                </button>
                <div className="text-xs text-gray-400">
                  🔒 端到端加密 · 本地解密
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">🔐</span>
              <span>使用您写信时设置的密钥进行解密</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📧</span>
              <span>如果通过邮件链接打开，密文信息已自动填充</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔒</span>
              <span>所有解密操作在本地浏览器完成，密钥不会上传</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚠️</span>
              <span>密钥错误会导致解密失败，请确保使用正确的密钥</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
