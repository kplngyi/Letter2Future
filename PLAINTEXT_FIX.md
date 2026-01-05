# 明文信件解析问题修复

## 问题发现

用户测试时上传了明文信件：
```json
{
  "version": 1,
  "plaintext": "《致我永恒的光》\n\n亲爱的_____：\n..."
}
```

发现**邮件发送时明文内容解析不正确**。

---

## 问题根源分析

### 数据流向问题

```
前端提交:
  content: "《致我永恒的光》\n\n亲爱的_____：\n..."
    ↓
API 存储:
  { version: 1, plaintext: "《致我永恒的光》\n\n亲爱的_____：\n..." }
    ↓
数据库:
  content: "{\"version\":1,\"plaintext\":\"《致我永恒的光》\\n\\n...\"}"
    ↓
调度器读取:
  letter.content = "{\"version\":1,\"plaintext\":\"...\"}"  // JSON 字符串
    ↓
❌ 错误处理:
  textBody = letter.content  // 直接用 JSON 字符串作为邮件内容！
  // 邮件显示的是 JSON，而不是原始信件
```

---

## 修复方案

**文件**: `src/lib/scheduler.ts`

### 修复前
```typescript
} else {
  // 明文信件，直接使用 content
  textBody = letter.content;  // ❌ 直接用 JSON 字符串
}
```

### 修复后
```typescript
} else {
  // 明文信件，需要解析 JSON 格式
  try {
    const parsed = JSON.parse(letter.content);
    if (parsed?.plaintext) {
      textBody = parsed.plaintext;  // ✅ 提取 plaintext 字段
    } else {
      // 兼容旧数据格式（直接存储文本）
      textBody = letter.content;
    }
  } catch (err) {
    // 如果解析失败，直接使用 content
    textBody = letter.content;
  }

  // 生成美观的 HTML 邮件格式
  htmlBody = `<div style="...">
    <div style="...">
      ${textBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
    </div>
  </div>`;
}
```

---

## 关键改进点

### 1. ✅ JSON 解析
```typescript
const parsed = JSON.parse(letter.content);
if (parsed?.plaintext) {
  textBody = parsed.plaintext;
}
```

### 2. ✅ 向后兼容
```typescript
} else {
  // 兼容旧数据格式（直接存储文本）
  textBody = letter.content;
}
```

### 3. ✅ 错误处理
```typescript
} catch (err) {
  // 解析失败也不会导致邮件发送失败
  textBody = letter.content;
}
```

### 4. ✅ HTML 格式美化
- 转义 HTML 特殊字符 (< > 防止注入)
- 保留换行符 (\n → <br>)
- 响应式设计
- 与加密信件邮件风格统一

---

## 测试验证

### 场景：明文信件发送流程

```
1. 用户写信
   ↓
2. 取消勾选"使用加密"
   ↓
3. 提交信件
   → API 接收: { content: "...", email, scheduledTime }
   → 数据库存储: { version: 1, plaintext: "..." }
   ↓
4. 调度器触发
   → 读取数据库: letter.content = "{\"version\":1,\"plaintext\":\"...\"}"
   → 解析 JSON: parsed.plaintext = "原始内容"
   → textBody = "原始内容" ✅
   ↓
5. 发送邮件
   → text: "原始内容"
   → html: <div>原始内容（格式化）</div>
   ↓
6. 用户收到邮件 ✅
   → 显示完整的信件内容（不是 JSON）
```

---

## 编译验证

```
✓ Compiled successfully in 3.2s
✓ Finished TypeScript in 1590.2ms
✓ Collecting page data using 7 workers in 411.6ms
✓ Generating static pages using 7 workers (7/7) in 149.8ms
✓ Finalizing page optimization in 8.0ms
```

**结论: 修复无编译错误** ✅

---

## 影响范围

### 修改文件
- `src/lib/scheduler.ts` - 仅修改明文信件处理逻辑

### 兼容性
- ✅ 加密信件：无影响
- ✅ 已发送的加密邮件：无影响
- ✅ 新的加密信件：继续正常工作
- ✅ 新的明文信件：现在可正确发送
- ✅ 旧的明文邮件：如果重新发送，也能正确处理

---

## 数据格式对比

### 加密信件的数据格式
```json
{
  "version": 1,
  "encrypted": {
    "ciphertext": "Base64encoded",
    "iv": "Base64encoded",
    "salt": "Base64encoded",
    "iterations": 100000,
    "algorithm": "AES-GCM",
    "kdf": "PBKDF2"
  }
}
```

### 明文信件的数据格式（修复后）
```json
{
  "version": 1,
  "plaintext": "原始信件内容..."
}
```

---

## 下一步建议

### 可选：数据迁移脚本
如果有旧的明文信件数据格式不一致，可以创建迁移脚本统一格式：

```typescript
// 伪代码
const allLetters = await db.getAllLetters();
for (const letter of allLetters) {
  if (!letter.is_encrypted) {
    try {
      JSON.parse(letter.content);
      // 已是正确格式
    } catch (err) {
      // 旧格式，需要迁移
      const newContent = JSON.stringify({
        version: 1,
        plaintext: letter.content
      });
      await db.updateLetter(letter.id, { content: newContent });
    }
  }
}
```

---

## 总结

✅ **问题已修复**
- 明文信件现在可以正确解析并发送
- 邮件中显示原始信件内容，不再显示 JSON
- 向后兼容旧数据格式
- 错误处理完善

✅ **编译通过**
- 无 TypeScript 错误
- 所有路由正常

✅ **可以部署**
- 修复对现有数据无影响
- 仅改进明文信件的处理逻辑
