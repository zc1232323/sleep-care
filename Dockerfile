# SleepCare 后端 Docker 镜像（第13大节：CloudBase / ECS 部署）
FROM node:18-alpine

WORKDIR /app

# 先只复制 package.json，利用 Docker 缓存层
COPY backend/package*.json ./

# 安装生产依赖
RUN npm install --production

# 再复制后端代码
COPY backend/ ./

# 暴露 3000 端口
EXPOSE 3000

# 启动后端
CMD ["node", "app.js"]
