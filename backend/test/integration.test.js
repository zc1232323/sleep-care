/**
 * @file 端到端集成测试脚本（第12大节）
 * @author 周灿
 * @date 2026-07-01
 *
 * 运行方式：
 *   node backend/test/integration.test.js
 *
 * 前置条件：
 *   后端服务已启动在 http://localhost:3000
 *
 * 测试流程：
 *   1. 注册医生
 *   2. 注册患者
 *   3. 患者登录
 *   4. 获取医生列表
 *   5. 患者授权医生
 *   6. 医生登录
 *   7. 医生查看患者列表（status=pending）
 *   8. 医生确认授权
 *   9. 医生查看患者报告
 *   10. 医生保存干预建议
 *   11. 医生获取干预建议并验证内容
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * 通用 HTTP 请求封装
 */
async function request(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`响应不是 JSON: ${text}`);
  }

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}: ${json?.message || text}`);
  }

  if (json.code !== 0) {
    throw new Error(`业务错误 [code=${json.code}]: ${json.message}`);
  }

  return json;
}

const post = (path, body, token) => request('POST', path, body, token);
const get = (path, token) => request('GET', path, null, token);
const put = (path, body, token) => request('PUT', path, body, token);
const del = (path, token) => request('DELETE', path, null, token);

/**
 * 注册或登录：如果手机号已存在则直接登录，保证测试可重复运行
 */
async function registerOrLogin(phone, password, nickname, role) {
  try {
    const result = await post('/api/v1/auth/register', {
      phone,
      password,
      nickname,
      role,
    });
    return { type: 'register', data: result };
  } catch (err) {
    if (err.message && err.message.includes('已注册')) {
      const login = await post('/api/v1/auth/login', { phone, password });
      return { type: 'login', data: login };
    }
    throw err;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  const doctorPhone = '18800000001';
  const patientPhone = '18800000002';
  const password = '123456';

  console.log('\n🚀 开始集成测试...\n');

  // 步骤 a: 注册医生（如已存在则登录）
  console.log('步骤 1/11: 注册医生');
  const doctorRegister = await registerOrLogin(doctorPhone, password, '张医生', 'doctor');
  console.log(`  ✅ 医生${doctorRegister.type === 'register' ? '注册' : '登录'}成功:`, doctorPhone);

  // 步骤 b: 注册患者（如已存在则登录）
  console.log('步骤 2/11: 注册患者');
  const patientRegister = await registerOrLogin(patientPhone, password, '李患者', 'patient');
  console.log(`  ✅ 患者${patientRegister.type === 'register' ? '注册' : '登录'}成功:`, patientPhone);

  // 步骤 c: 患者登录
  console.log('步骤 3/11: 患者登录');
  const patientLogin = await post('/api/v1/auth/login', {
    phone: patientPhone,
    password,
  });
  const patientToken = patientLogin.data.token;
  console.log('  ✅ 患者登录成功, 获取 token');

  // 步骤 d: 获取医生列表
  console.log('步骤 4/11: 获取医生列表');
  const doctors = await get('/api/users/doctors');
  const doctor = doctors.data.find(d => d.phone === doctorPhone);
  if (!doctor) {
    throw new Error('未找到刚注册的医生');
  }
  const doctorId = doctor.id;
  console.log('  ✅ 找到医生, id=', doctorId);

  // 步骤 e: 患者授权医生
  console.log('步骤 5/11: 患者授权医生');
  const grantRes = await post('/api/doctor/grant', {
    doctor_id: doctorId,
  }, patientToken);
  const authId = grantRes.data.id;
  console.log('  ✅ 授权请求已发送, auth_id=', authId);

  // 步骤 f: 医生登录
  console.log('步骤 6/11: 医生登录');
  const doctorLogin = await post('/api/v1/auth/login', {
    phone: doctorPhone,
    password,
  });
  const doctorToken = doctorLogin.data.token;
  console.log('  ✅ 医生登录成功, 获取 token');

  // 步骤 g: 医生查看患者列表（status=pending）
  console.log('步骤 7/11: 医生查看患者列表');
  const patientsPending = await get('/api/doctor/patients', doctorToken);
  const pendingAuth = patientsPending.data.find(p => p.id === authId);
  if (!pendingAuth) {
    throw new Error('未找到待确认的授权记录');
  }
  if (pendingAuth.status !== 'pending') {
    throw new Error(`授权状态不是 pending: ${pendingAuth.status}`);
  }
  const patientId = pendingAuth.patient_id;
  console.log('  ✅ 患者列表中存在 pending 授权, patient_id=', patientId);

  // 步骤 h: 医生确认授权
  console.log('步骤 8/11: 医生确认授权');
  const confirmRes = await put('/api/doctor/confirm', {
    auth_id: authId,
  }, doctorToken);
  console.log('  ✅ 授权已确认, status=', confirmRes.data.status);

  // 步骤 i: 医生查看患者报告
  console.log('步骤 9/11: 医生查看患者报告');
  const patientData = await get(`/api/doctor/patient/data?patient_id=${patientId}`, doctorToken);
  console.log('  ✅ 患者报告获取成功');

  // 步骤 j: 医生保存干预建议
  console.log('步骤 10/11: 医生保存干预建议');
  const noteContent = '建议保持规律作息，睡前避免使用手机。';
  const saveRes = await put('/api/doctor/note', {
    patient_id: patientId,
    note: noteContent,
  }, doctorToken);
  console.log('  ✅ 干预建议保存成功');

  // 步骤 k: 医生获取干预建议并验证内容
  console.log('步骤 11/11: 医生获取干预建议');
  const noteRes = await get(`/api/doctor/note?patient_id=${patientId}`, doctorToken);
  if (noteRes.data.note !== noteContent) {
    throw new Error('干预建议内容不一致');
  }
  console.log('  ✅ 干预建议内容一致');

  console.log('\n✅ 所有集成测试通过！\n');
}

runTests().catch(err => {
  console.error('\n❌ 集成测试失败:', err.message);
  console.error(err.stack);
  process.exit(1);
});
