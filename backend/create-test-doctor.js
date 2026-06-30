/**
 * @file 创建测试医生账号
 * 用法: node create-test-doctor.js
 */
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../sleep_care.db');

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('[错误] 数据库文件不存在:', DB_PATH);
    console.log('请先启动后端 (node app.js)');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 检查是否已有医生账号
  const existing = db.exec("SELECT id, phone, nickname FROM users WHERE role = 'doctor'");
  if (existing.length > 0 && existing[0].values.length > 0) {
    console.log('已有医生账号:');
    existing[0].values.forEach(r => console.log(`  ID:${r[0]} | ${r[1]} | ${r[2]}`));
    console.log('\n如需重新创建，请手动删除上述账号后重试。');
    db.close();
    return;
  }

  // 创建测试医生
  const hash = bcrypt.hashSync('123456', 10);
  db.run(
    `INSERT INTO users (phone, password_hash, nickname, role) VALUES (?, ?, ?, 'doctor')`,
    ['13811111111', hash, '李医生']
  );
  db.run(
    `INSERT INTO users (phone, password_hash, nickname, role) VALUES (?, ?, ?, 'doctor')`,
    ['13822222222', hash, '王医生']
  );

  // 持久化
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('✅ 测试医生账号创建成功！');
  console.log('');
  console.log('  李医生: 13811111111 / 123456 (role=doctor)');
  console.log('  王医生: 13822222222 / 123456 (role=doctor)');
  console.log('');
  console.log('现在可以通过 Postman 测试 POST /api/doctor/grant');
  console.log('Body: { "phone": "13811111111" }');

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
