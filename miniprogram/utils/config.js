/**
 * @file 小程序全局配置
 * @description 开发环境 / 线上环境 baseUrl 切换
 * @author 周灿
 * @date 2026-07-01
 */

// 开发环境：本地后端
const BASE_URL = 'http://localhost:3000';

// 线上环境：CloudBase 或 ECS 部署后的公网地址
// 部署后取消下面一行的注释，并注释掉上面的开发环境地址
// const BASE_URL = 'https://你的线上域名.com';

module.exports = { BASE_URL };
