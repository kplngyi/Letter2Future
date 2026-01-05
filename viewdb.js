import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function getTableFields() {
  // 打开数据库
  const db = await open({
    filename: './letters.db', // 数据库路径
    driver: sqlite3.Database
  });

  // 查询字段信息
  const fields = await db.all("PRAGMA table_info(letters);");

  console.log('letters 表字段信息:');
  fields.forEach(field => {
    console.log(`- ${field.name} | 类型: ${field.type} | NOT NULL: ${field.notnull} | 默认值: ${field.dflt_value}`);
  });

  await db.close();
}

getTableFields().catch(console.error);