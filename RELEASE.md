# 发布流程说明

## 自动发布流程

本项目使用 GitHub Actions 实现自动构建和发布。当您推送一个符合格式的 tag 时，系统会自动构建并发布所有平台的应用。

### 发布步骤

1. **创建 Tag**

   确保你的 tag 格式为 `v*` (例如 `v1.0.0`, `v2.1.3`):

   ```bash
   # 创建 tag
   git tag v1.0.0
   
   # 推送 tag 到 GitHub
   git push origin v1.0.0
   ```

2. **GitHub Actions 自动执行**

   - 自动触发 GitHub Actions 工作流
   - 在 Windows, macOS, Linux 三个平台并行构建
   - 自动打包并上传到 GitHub Release

3. **查看发布结果**

   - 访问 GitHub Releases 页面查看发布的版本
   - 每个平台都有对应的安装包
   - 自动包含版本说明和安装指南

### 本地测试打包

在发布前，可以在本地测试打包流程：

```bash
# Windows
npm run package:win

# macOS
npm run package:mac
```

打包后的文件会在 `release/` 目录中。

### 版本号规则

版本号遵循 [Semantic Versioning](https://semver.org/) 规范：

- **主版本号**: 重大更新，不兼容的 API 修改
- **次版本号**: 新增功能，向后兼容
- **修订号**: 问题修复，向后兼容

示例：
- `v1.0.0` - 第一个正式版本
- `v1.1.0` - 新增功能
- `v1.1.1` - 修复 bug
- `v2.0.0` - 重大更新

### Release 资产说明

每个 Release 包含以下文件：

- **LeeSin-Windows-x64-vX.X.X.zip**: Windows 安装包 (.exe)
- **LeeSin-macOS-x64-vX.X.X.zip**: macOS 安装包 (.dmg)
- **LeeSin-Linux-x64-vX.X.X.zip**: Linux 安装包 (.AppImage)

### 发布配置

发布配置位于 `.github/workflows/release.yml`，你可以根据需求修改：

- **触发条件**: 修改 `on.push.tags` 匹配规则
- **构建平台**: 修改 `strategy.matrix` 添加或移除平台
- **打包配置**: 修改 `electron-builder.json`

### 常见问题

**Q: 发布失败怎么办？**
A: 检查 GitHub Actions 的运行日志，通常是构建或打包步骤出错。

**Q: 如何删除一个 Release？**
A: 在 GitHub Releases 页面删除对应版本，相关的 tag 也会被删除。

**Q: 如何重新发布？**
A: 删除本地和远程的 tag，然后重新创建并推送：

```bash
# 删除本地 tag
git tag -d v1.0.0

# 删除远程 tag
git push --delete origin v1.0.0

# 重新创建并推送
git tag v1.0.0
git push origin v1.0.0
```

**Q: 如何发布预览版？**
A: 在创建 Release 时，GitHub Actions 会自动设置 `draft: false`。如果想发布预览版，可以：

1. 手动在 GitHub Releases 页面创建 Draft Release
2. 或者修改 workflow 文件中的 `draft: true`

### 安全提醒

⚠️ **注意**: GitHub Actions 会使用仓库的 `GITHUB_TOKEN` 进行发布。确保你的仓库设置了正确的权限：

- Settings → Actions → General → Workflow permissions
- 选择 "Read and write permissions"

### 发布状态徽章

在 README.md 中添加发布状态徽章：

```markdown
![Release](https://github.com/lzskyline/LeeSin/workflows/Build%20and%20Release/badge.svg)
```
