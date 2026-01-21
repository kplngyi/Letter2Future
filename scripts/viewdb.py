import sqlite3

# 数据库路径
db_path = "./letters.db"

# 连接数据库
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 查询数据库中的表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

tables = [t[0] for t in tables]
tables