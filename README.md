# 消消乐 100 关挑战

一个基于 **React + TypeScript + Vite** 的网页消消乐项目，包含：

- 100 个关卡
- 前 15 关手工节奏关
- 后 85 关按规则递增生成
- 本地战役进度保存
- 按各关**最佳成绩**累计总积分
- Firebase Firestore 在线排行榜

## 功能特性

### 核心玩法
- 点击两个相邻宝石进行交换
- 连成 3 个或更多相同宝石即可消除
- 支持连续掉落与连锁消除
- 若棋盘无可用移动，会自动重排

### 关卡系统
- 共 100 关
- 每关包含独立目标分数、时间限制、棋盘大小、宝石种类配置
- 前 15 关为手工配置，适合控制节奏与难度曲线
- 后续关卡根据规则自动生成，难度逐步提升

### 计分规则
- 每次消除按消除数量获得基础分
- 连锁越多，额外奖励越高
- 达到关卡目标分数即可通关
- 剩余时间会换算为时间奖励
- 总积分不是简单重复累加，而是按**每关最佳成绩**汇总，避免反复刷低价值分数

### 排行榜
- 使用 Firebase Firestore 保存在线排行榜
- 记录字段包括：
  - 玩家昵称
  - 总积分
  - 最高通关关卡
  - 总耗时
- 同名玩家重复提交时，仅保留更优成绩

## 技术栈

- React 19
- TypeScript
- Vite
- Firebase Firestore
- ESLint

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认会启动本地开发服务器，通常访问地址类似：

```bash
http://localhost:5173
```

### 3. 生产构建

```bash
npm run build
```

### 4. 代码检查

```bash
npm run lint
```

## Firebase 排行榜配置

如果不配置 Firebase，游戏本体仍可正常运行，只是在线排行榜不可用。

### 1. 复制环境变量模板

```bash
cp .env.example .env
```

Windows PowerShell 也可以手动复制 `.env.example` 为 `.env`。

### 2. 填写 `.env`

项目使用以下环境变量：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_FIREBASE_COLLECTION=leaderboard
```

其中：
- `VITE_FIREBASE_COLLECTION` 默认为 `leaderboard`
- 你可以改成自己的集合名，例如 `match3_ranking`

### 3. Firestore 数据结构

排行榜默认写入集合：

```text
leaderboard
```

单条记录结构示例：

```json
{
  "id": "player-id",
  "name": "玩家A",
  "totalScore": 12345,
  "highestLevel": 37,
  "totalTimeMs": 285000,
  "updatedAt": 1710000000000
}
```

### 4. Firestore 安全建议

当前项目是前端直连 Firestore 的轻量实现，适合演示或个人项目。

如果要正式公开上线，建议至少增加以下保护措施：
- Firebase Authentication
- App Check
- 写入频率限制
- 服务端校验分数逻辑

否则任何人都可能直接向排行榜写入伪造数据。

## 游戏规则说明

### 通关条件
- 在倒计时结束前达到目标分数

### 失败条件
- 时间耗尽仍未达到目标分数

### 成绩记录规则
- 每关只保留最佳结果
- 更高分优先
- 若分数相同，则更短耗时优先
- 总排行榜成绩由全部关卡最佳成绩汇总得到

## 项目结构

```text
src/
  game/
    engine.ts        # 棋盘生成、交换、消除、掉落、重排
    levels.ts        # 100 关关卡定义
    types.ts         # 核心类型定义
  lib/
    format.ts        # 分数与时间格式化
    storage.ts       # 本地存档与最佳成绩汇总
  services/
    firebase.ts      # Firebase 初始化与配置读取
    leaderboard.ts   # 排行榜读写逻辑
  App.tsx            # 游戏主界面
  App.css            # 游戏样式
  index.css          # 全局样式
```

## 已实现的体验点

- 战役进度自动保存在浏览器本地
- 显示当前关卡最佳成绩
- 可切换已解锁关卡
- 最终可提交累计成绩到在线排行榜
- 未配置 Firebase 时，界面会提示排行榜未启用

## 发布与部署

### 发布到 GitHub

当前项目设计为独立仓库发布，可使用：

```bash
git init
git add .
git commit -m "Create 100-level match-3 game"
```

如果已经配置好 `gh`：

```bash
gh repo create xiaoxiaole-100-levels --public --source . --remote origin --push
```

### 部署到静态托管

构建产物在：

```text
dist/
```

可部署到：
- GitHub Pages
- Vercel
- Netlify
- Firebase Hosting

> 注意：静态托管只负责前端页面，排行榜仍依赖你配置的 Firebase 项目。

## 后续可扩展方向

- 增加音效与背景音乐
- 增加特殊宝石与道具系统
- 增加连击动画和粒子效果
- 增加登录系统，避免昵称冲突
- 增加每日挑战模式
- 将排行榜写入迁移到 Cloud Functions 做服务端校验

## 当前状态

当前项目已完成：
- 功能实现
- 构建通过
- ESLint 检查通过

如果你准备继续完善这个项目，推荐下一步优先做：
1. Firebase 生产安全策略
2. 游戏动画与交互反馈
3. GitHub Pages / Vercel 自动部署
