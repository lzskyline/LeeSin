> **⚠️ 重要声明**
> 
> 本项目所有功能均基于官方LCU API实现，不涉及任何游戏文件修改或内存读写。
> 
> **仅供学习研究使用，请勿用于任何非法用途。**
> 
> 如果官方认为本项目存在不当影响，请通知我移除仓库。
> 
> 使用本工具所产生的一切后果由用户自行承担。

<p align='center'>
  <img src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/64.png" width="80" height="80">
</p>

<h1 align="center">LeeSin - LOL游戏助手</h1>

<p align='center'>
  基于 Electron + React 的跨平台英雄联盟助手，重构自 <a href="https://github.com/Zzaphkiel/Seraphine">Seraphine</a>
</p>

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28.2.1-47848F)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6)](https://www.typescriptlang.org/)

</div>

## 主要特性 ✨

### 🎯 自动化功能
- **自动接受对局** - 智能检测队列弹窗，支持自定义延迟
- **自动BP（禁用/选择）** - 根据预设英雄列表自动执行
- **自动符文配置** - 从OP.GG获取推荐符文，一键应用
- **自动召唤师技能** - 智能配置推荐召唤师技能

### 🎮 游戏模式支持
- **排位模式**（单双/灵活）
- **匹配模式**
- **极地大乱斗** - 支持英雄Buff信息显示
- **符文大乱斗** (ARAM Mayhem) - ⭐ **新增支持**
- **斗魂竞技场**
- **无限火力**

### 📊 战绩查询
- 召唤师战绩查询
- 队友/对手战绩自动查询
- 段位统计信息
- 历史对局详情

### 🔧 其他辅助功能
- 创建5v5自定义训练模式
- 观战同大区玩家
- 秒退功能
- 客户端热重启
- 修复客户端结算页面异常

## 快速开始 🚀

### 使用预构建版本
1. 前往 [Releases](https://github.com/lzskyline/LeeSin/releases) 页面
2. 下载最新版本的 `.exe` 文件（Windows）或 `.dmg` 文件（macOS）
3. 解压并运行 `LeeSin.exe` 即可

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/lzskyline/LeeSin.git
cd LeeSin

# 安装依赖
npm install

# 开发模式运行
npm run electron:dev

# 构建生产版本
npm run build
```

## 技术栈 💻

- **Electron** - 跨平台桌面应用框架
- **React 18** - 现代UI框架
- **TypeScript** - 类型安全的JavaScript
- **TailwindCSS** - 原子化CSS框架
- **Vite** - 快速构建工具
- **Zustand** - 轻量级状态管理

## 与 Seraphine 的主要差异 🔄

### ✅ 保留的核心功能
- 基于LCU API的所有游戏辅助功能
- OP.GG数据集成（出装、符文、英雄排行）
- 自动BP、自动接受、战绩查询
- 客户端辅助功能（秒退、观战、修复等）

### 🔥 新增特性
1. **符文大乱斗支持**
   - 完整支持新的ARAM Mayhem模式（队列ID: 2400）
   - 自动识别游戏模式并加载对应配置

2. **跨平台支持**
   - 从Python/PyQt转向Electron技术栈
   - 支持Windows、macOS、Linux
   - 更现代的UI/UX设计

3. **性能优化**
   - 更快的启动速度
   - 更低的内存占用
   - 更流畅的动画效果

4. **开发体验提升**
   - 热重载开发环境
   - 类型安全的TypeScript
   - 模块化的代码架构

## 配置说明 ⚙️

应用会自动检测LOL客户端并连接。你可以在设置中配置：
- 自动接受延迟（默认500ms）
- 首选英雄列表（按位置）
- 禁用英雄列表
- 自动符文/技能开关
- 游戏区域选择

## 常见问题 ❓

### Q: 会被封号吗？
A: 本程序**完全**基于英雄联盟官方LCU API实现，不修改任何游戏文件或内存，理论上不会被封号。但**不保证100%安全**，使用需自行承担风险。

### Q: 为什么连接不上客户端？
A: 请确保：
1. LOL客户端已启动并登录
2. 客户端版本支持
3. 防火墙未阻止应用

### Q: 符文大乱斗模式怎么使用？
A: 进入符文大乱斗队列后，助手会自动识别模式并加载对应配置，与普通大乱斗体验一致。

## Riot声明

LeeSin is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## 许可证

本项目基于 [MIT License](LICENSE) 开源。原 Seraphine 项目使用 [GPLv3 License](https://github.com/Zzaphkiel/Seraphine/blob/main/LICENSE)。

## 致谢

- 感谢 [Seraphine](https://github.com/Zzaphkiel/Seraphine) 项目提供的核心逻辑和灵感
- 感谢 CommunityDragon 提供游戏资源
- 感谢 OP.GG 提供数据支持

## Star支持 ⭐

如果这个项目对你有帮助，请给个Star支持一下！

<p align='center'>
  <a href="https://github.com/lzskyline/LeeSin/stargazers">
    <img src="https://api.star-history.com/svg?repos=lzskyline/LeeSin&type=Date">
  </a>
</p>
