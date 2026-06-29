# -*- coding: utf-8 -*-
"""
SleepCare 数据库查看工具
用法: python view_db.py [表名]
不传表名则显示所有表和记录数
"""
import sqlite3
import sys
import os
import io

# 解决 Windows 终端中文乱码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sleep_care.db')

def show_tables(cursor):
    """显示所有表及记录数"""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cursor.fetchall()]
    print(f'\n数据库路径: {DB_PATH}')
    print(f'共 {len(tables)} 张表:')
    print('=' * 60)
    for t in tables:
        cursor.execute(f'SELECT COUNT(*) FROM {t}')
        count = cursor.fetchone()[0]
        print(f'  {t:<30} {count:>5} 条记录')
    print('=' * 60)
    return tables

def show_table_data(cursor, table_name):
    """显示某张表的所有数据"""
    cursor.execute(f'SELECT * FROM {table_name}')
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]

    print(f'\n表 [{table_name}]  共 {len(rows)} 条记录')
    print('=' * 100)

    if not rows:
        print('  (空表)')
        return

    # 显示列名
    print(' | '.join(f'{c:<20}' for c in cols))
    print('-' * 100)

    # 显示数据
    for row in rows:
        values = []
        for v in row:
            if v is None:
                values.append('NULL')
            elif isinstance(v, str) and len(v) > 50:
                values.append(v[:47] + '...')
            else:
                values.append(str(v))
        print(' | '.join(f'{v:<20}' for v in values))
    print('=' * 100)

def main():
    if not os.path.exists(DB_PATH):
        print(f'错误: 数据库文件不存在 -> {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    table = sys.argv[1] if len(sys.argv) > 1 else None

    if table:
        show_table_data(cursor, table)
    else:
        tables = show_tables(cursor)
        print('\n要查看某张表的详细数据，运行:')
        print(f'  python view_db.py <表名>')
        print(f'\n例如:')
        for t in tables:
            print(f'  python view_db.py {t}')

    conn.close()

if __name__ == '__main__':
    main()
