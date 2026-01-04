# Letter2Future 安全性常见问题

## ❓ 常见质疑

### Q1: 我们对解密内容进行操作，是不是代表用户的内容上传到云端了？

**答：❌ 不会上传到云端！**

这正是我们使用**客户端加密（方案1）**的核心优势。

#### 🔒 加密流程（写信时）

1. **浏览器本地加密**：用户在浏览器中输入密钥，使用 Web Crypto API 加密内容
2. **只上传密文**：服务器只收到加密后的密文，无法知道原文是什么
3. **服务器不知道密钥**：密钥从未离开过用户的浏览器

```typescript
// src/components/LetterForm.tsx
const encryptContent = async (content: string, passphrase: string) => {
  // ✅ 所有加密操作在浏览器本地完成
  const key = await crypto.subtle.deriveKey(...);  // 本地生成密钥
  const encrypted = await crypto.subtle.encrypt(...);  // 本地加密
  
  // ❌ 明文内容从未发送到服务器
  // ✅ 只发送密文到服务器
  return { ciphertext, iv, salt };
};
```

#### 🔓 解密流程（收信时）

```typescript
// src/app/decrypt/page.tsx
'use client';  // ✅ 客户端组件，代码在浏览器运行

const handleDecrypt = async () => {
  // ✅ 所有解密操作都使用浏览器的 Web Crypto API
  const key = await crypto.subtle.deriveKey(...);  // 本地生成密钥
  const plainBuffer = await crypto.subtle.decrypt(...);  // 本地解密
  setDecryptedText(plainText);  // 只存在浏览器内存中
  
  // ❌ 没有任何 fetch/API 调用发送解密内容到服务器
  // ✅ 明文只存在于 React state（浏览器内存）
};
```

#### ✅ 安全保证

- **解密完全在浏览器本地**：使用 `window.crypto.subtle` API
- **明文从不上传**：解密后的内容只存在于浏览器的 React state
- **服务器看不到**：服务器数据库中永远只有密文
- **零知识架构**：即使服务器被黑，攻击者也无法读取信件内容

#### 🔍 验证方法

打开浏览器开发者工具（F12）→ Network 标签页，点击"解密信件"按钮：
- ✅ **没有任何网络请求发出**
- ✅ 所有计算都在本地完成

---

### Q2: 那为什么我们可以调整信的格式？

**答：格式调整 ≠ 内容上传**

#### 📝 内容 vs 格式

##### 内容（数据）
```typescript
const [decryptedText, setDecryptedText] = useState('');
// 解密后：decryptedText = "亲爱的未来的我：\n\n当你看到这封信时..."
```
- 这是**纯文本数据**，存在浏览器内存中
- **没有上传到服务器**
- 只是 JavaScript 变量，存储在 React state

##### 格式（展示样式）
```tsx
<div className="text-2xl font-light text-gray-700">
  {decryptedText.split('\n').map((line, index) => (
    <div 
      className="transition-all blur-[2px]"
      style={{
        transitionDuration: '1200ms',
        transitionDelay: `${index * 60}ms`
      }}
    >
      {line}
    </div>
  ))}
</div>
```
- 这是**前端渲染代码**，控制如何显示内容
- 动画、字体、颜色、排版都是浏览器本地渲染
- 就像 Word 文档：内容是"你好"，格式是"红色、加粗、24号字"

#### 🎨 类比说明

想象你在本地电脑上打开一个加密的 txt 文件：

1. **解密**：输入密码，文件内容显示出来（✅ 内容在本地）
2. **调整格式**：
   - 换个字体 → ✅ 内容没变
   - 加动画效果 → ✅ 内容没变
   - 改背景颜色 → ✅ 内容没变
   - 调整行距 → ✅ 内容没变

我们做的所有"格式调整"都是修改**显示逻辑的代码**（JSX/CSS），而不是修改或上传**解密后的内容数据**。

#### 🔍 代码验证

```tsx
// src/app/decrypt/page.tsx
{decryptedText.split('\n').map((line, index) => (
  <div style={{...}}>  {/* ✅ 只是样式 */}
    {line}  {/* ✅ 读取本地state，不发送网络请求 */}
  </div>
))}
```

整个渲染过程：
```
浏览器内存中的 decryptedText 
  ↓
React 渲染引擎处理
  ↓
屏幕显示
```

**全程本地**，没有任何网络传输！

---

## 🛡️ 安全架构总结

### 数据流向

```
【写信】
用户输入明文 
  → 浏览器加密（AES-GCM）
  → 上传密文到服务器
  → 数据库存储密文

【收信】
服务器发送密文到浏览器（邮件链接）
  → 用户输入密钥
  → 浏览器本地解密
  → 显示明文（仅存在浏览器内存）
```

### 关键点

| 操作 | 位置 | 是否上传 |
|------|------|----------|
| 加密 | 浏览器 | ❌ 明文不上传 |
| 存储 | 服务器 | ✅ 只存密文 |
| 解密 | 浏览器 | ❌ 明文不上传 |
| 显示 | 浏览器 | ❌ 只是本地渲染 |
| 动画/格式 | 浏览器 | ❌ CSS/JS 本地执行 |

### 服务器能看到什么？

```json
// 服务器数据库中的记录
{
  "id": 1,
  "content": "{\"ciphertext\":\"Xf7k9...\",\"iv\":\"Ae3d...\",\"salt\":\"Mn2l...\"}",
  "is_encrypted": 1,
  "recipient_email": "user@example.com",
  "scheduled_time": "2027-01-01 00:00:00"
}
```

❌ 服务器**看不到**：
- 信件原文
- 用户密钥
- 解密后的内容

✅ 服务器**只能看到**：
- 密文（无法解密）
- 收件人邮箱
- 发送时间

---

## 🔐 技术细节

### 加密算法
- **对称加密**：AES-GCM-256
- **密钥派生**：PBKDF2-SHA256（100,000次迭代）
- **随机化**：每次加密生成新的 IV 和 Salt

### 为什么安全？
1. **强加密**：AES-256 是军事级加密标准
2. **高迭代次数**：100,000次 PBKDF2 防止暴力破解
3. **随机化**：即使相同内容，每次密文都不同
4. **客户端执行**：密钥从不离开用户设备

### 浏览器支持
所有现代浏览器都原生支持 Web Crypto API：
- Chrome/Edge 37+
- Firefox 34+
- Safari 11+

---

## ✅ 隐私承诺

1. **零知识架构**：我们无法读取你的信件内容
2. **本地解密**：解密只在你的浏览器中进行
3. **不记录密钥**：密钥永远不会发送到服务器
4. **端到端加密**：只有知道密钥的人才能阅读

🔒 **你的信件，只有你能读**
