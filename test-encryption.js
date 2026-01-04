const crypto = require('crypto').webcrypto;

// 辅助函数：转换为 Base64
const toBase64 = (data) => {
  return Buffer.from(data).toString('base64');
};

// 辅助函数：从 Base64 转换
const fromBase64 = (b64) => {
  return new Uint8Array(Buffer.from(b64, 'base64'));
};

// 加密函数
async function encryptContent(plainText, secret) {
  console.log('\n=== 开始加密 ===');
  console.log('原始文本:', plainText);
  console.log('密钥:', secret);

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  console.log('Salt (hex):', Buffer.from(salt).toString('hex'));
  console.log('IV (hex):', Buffer.from(iv).toString('hex'));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  const result = {
    ciphertext: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: 100000,
  };

  console.log('\n加密结果:');
  console.log('Ciphertext:', result.ciphertext.substring(0, 50) + '...');
  console.log('IV (base64):', result.iv);
  console.log('Salt (base64):', result.salt);
  
  return result;
}

// 解密函数
async function decryptContent(encrypted, secret) {
  console.log('\n=== 开始解密 ===');
  console.log('密钥:', secret);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const saltBuf = fromBase64(encrypted.salt);
  const ivBuf = fromBase64(encrypted.iv);
  const cipherBuf = fromBase64(encrypted.ciphertext);

  console.log('Salt (hex):', Buffer.from(saltBuf).toString('hex'));
  console.log('IV (hex):', Buffer.from(ivBuf).toString('hex'));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: encrypted.iterations || 100000,
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
  console.log('\n解密结果:', plainText);
  
  return plainText;
}

// 运行测试
async function runTest() {
  console.log('🔐 加密/解密功能测试\n');
  console.log('==========================================');

  const testCases = [
    {
      text: '亲爱的未来的我：\n\n希望收到这封信的你，一切安好。\n\n此刻的我想对你说——记住，你是最棒的！',
      passphrase: 'MySecretKey123',
    },
    {
      text: 'Hello, Future Me! 🚀',
      passphrase: 'test-password',
    },
    {
      text: '# Markdown 测试\n\n- 列表项1\n- 列表项2\n\n**粗体文本**',
      passphrase: 'markdown-key',
    },
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n\n📝 测试用例 ${i + 1}/${testCases.length}`);
    console.log('==========================================');

    const { text, passphrase } = testCases[i];

    try {
      // 加密
      const encrypted = await encryptContent(text, passphrase);

      // 解密
      const decrypted = await decryptContent(encrypted, passphrase);

      // 验证
      if (decrypted === text) {
        console.log('\n✅ 测试通过！加密和解密成功，内容一致');
      } else {
        console.log('\n❌ 测试失败！解密后的内容与原文不一致');
        console.log('期望:', text);
        console.log('实际:', decrypted);
      }

      // 测试错误密钥
      console.log('\n--- 测试错误密钥 ---');
      try {
        await decryptContent(encrypted, 'wrong-password');
        console.log('❌ 应该抛出错误，但没有');
      } catch (error) {
        console.log('✅ 正确：使用错误密钥时抛出错误');
        console.log('错误信息:', error.message);
      }

      // 生成解密链接
      const baseUrl = 'http://localhost:3000';
      const decryptUrl = `${baseUrl}/decrypt?c=${encodeURIComponent(encrypted.ciphertext)}&i=${encodeURIComponent(encrypted.iv)}&s=${encodeURIComponent(encrypted.salt)}&iter=${encrypted.iterations}`;
      console.log('\n🔗 解密链接:');
      console.log(decryptUrl.substring(0, 100) + '...');

    } catch (error) {
      console.log('\n❌ 测试出错:', error.message);
      console.error(error);
    }
  }

  console.log('\n\n==========================================');
  console.log('🎉 所有测试完成！');
  console.log('==========================================\n');
}

// 执行测试
runTest().catch(console.error);
