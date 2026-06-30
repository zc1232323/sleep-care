/**
 * @file 数据库查询工具（纯 Node.js，无需 Python）
 * @author 周灿
 * 
 * 用法：双击运行 或 node query-db.js
 * 功能：查询 sleep_reports 表最近10条记录，验证持久化
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../sleep_care.db');

console.log('==========================================');
console.log('  SleepCare SQLite 数据库查询工具');
console.log('==========================================\n');

if (!fs.existsSync(DB_PATH)) {
  console.log('[错误] 找不到数据库文件:', DB_PATH);
  console.log('请先启动后端服务 (node app.js) 生成数据');
  process.exit(1);
}

console.log('[信息] 数据库文件:', DB_PATH);
console.log('[信息] 文件大小:', (fs.statSync(DB_PATH).size / 1024).toFixed(1), 'KB\n');

async function main() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // ---- 查询 1: sleep_reports 总记录数 ----
  console.log('═══ sleep_reports 表概览 ═══');
  let countRes = db.exec("SELECT COUNT(*) as total FROM sleep_reports");
  if (countRes.length > 0) {
    console.log('总记录数:', countRes[0].values[0][0]);
  }
  console.log('');

  // ---- 查询 2: 最近 10 条睡眠报告（日期 + 评分） ----
  console.log('═══ 最近 10 条睡眠报告 ═══');
  console.log('日期          | 评分 | 总时长(分) | 深睡 | 浅睡 | REM | 觉醒');
  console.log('--------------|------|-----------|------|------|-----|------');
  
  let res = db.exec(`
    SELECT report_date, sleep_score, total_sleep_minutes,
           deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes, awake_count
    FROM sleep_reports ORDER BY report_date DESC LIMIT 10
  `);

  if (res.length > 0) {
    res[0].values.forEach(row => {
      const [date, score, total, deep, light, rem, awake] = row;
      console.log(
        `${String(date).padEnd(13)}| ${String(score || '-').padStart(4)} | ${String(total || '-').padStart(9)} | ${String(Math.round(deep || 0)).padStart(4)} | ${String(Math.round(light || 0)).padStart(4)} | ${String(Math.round(rem || 0)).padStart(3)} | ${String(awake || '-')}`
      );
    });
  } else {
    console.log('(空)');
  }

  // ---- 查询 3: 设备列表 ----
  console.log('\n═══ 已注册设备 ═══');
  let devRes = db.exec(`SELECT id, nickname, serial_no, is_virtual, online_status FROM devices`);
  if (devRes.length > 0 && devRes[0].values.length > 0) {
    devRes[0].values.forEach(row => {
      const [id, name, sn, isVirt, status] = row;
      console.log(`ID:${id} | ${name} | ${sn} | ${isVirt ? '虚拟' : '实体'} | ${status ? '在线' : '离线'}`);
    });
  } else {
    console.log('(无设备)');
  }

  // ---- 查询 4: 用户列表 ----
  console.log('\n═══ 注册用户 ═══');
  let userRes = db.exec(`SELECT id, phone, nickname, role, created_at FROM users`);
  if (userRes.length > 0) {
    userRes[0].values.forEach(row => {
      const [id, phone, nick, role, created] = row;
      console.log(`ID:${id} | ${phone} | ${nick} | ${role} | 注册时间:${created}`);
    });
  } else {
    console.log('(无用户)');
  }

  // ---- 查询 5: 用户作息设置（第8大节）----
  console.log('\n═══ 用户作息设置 (user_settings) ═══');
  console.log('用户ID | 就寝时间 | 起床时间 | 日出模拟(分) | 更新时间');
  let setRes = db.exec(`SELECT user_id, bed_time, wake_time, sunrise_duration_minutes, updated_at FROM user_settings`);
  if (setRes.length > 0 && setRes[0].values.length > 0) {
    setRes[0].values.forEach(row => {
      const [uid, bt, wt, dur, updated] = row;
      console.log(`${String(uid).padEnd(6)} | ${bt || '(空)'.padEnd(9)} | ${wt || '(空)'.padEnd(9)} | ${dur ?? '-'} | ${updated}`);
    });
  } else {
    console.log('(无记录 — 需要在小程序中保存设置，或用 Postman PUT /api/setting/plan)');
  }

  // ---- 查询 6: 医生授权记录（第9大节）----
  console.log('\n═══ 医生授权记录 (doctor_authorizations) ═══');
  console.log('授权ID | 患者ID | 医生ID | 状态   | 有效期至   | 请求时间');
  let authRes = db.exec(`SELECT id, patient_id, doctor_id, status, expire_date, requested_at FROM doctor_authorizations ORDER BY requested_at DESC`);
  if (authRes.length > 0 && authRes[0].values.length > 0) {
    authRes[0].values.forEach(row => {
      const [id, pid, did, status, expire, req] = row;
      console.log(`${String(id).padEnd(6)} | ${String(pid).padEnd(6)} | ${String(did).padEnd(6)} | ${status?.padEnd(6) || ''} | ${expire || ''} | ${req}`);
    });
  } else {
    console.log('(无记录 — 需要在 Postman 测试 POST /api/doctor/grant)');
  }

  console.log('\n==========================================');
  console.log('  查询完成！数据已从磁盘读取，证明持久化成功 ✅');
  console.log('==========================================');

  db.close();
}

main().catch(err => {
  console.error('查询失败:', err.message);
  process.exit(1);
});
