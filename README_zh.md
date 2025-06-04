<!-- AUTO PICTURE-IN-PICTURE -->
<div align="center">
  <h1>自动画中画</h1>
  <p>为 YouTube 和哔哩哔哩提供流畅的画中画体验</p>
  
  <p>
    <a href="https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture"><img src="https://img.shields.io/badge/安装-GreasyFork-green.svg" alt="在GreasyFork安装"></a>
    <img src="https://img.shields.io/badge/Chrome-支持-success.svg" alt="Chrome">
    <img src="https://img.shields.io/badge/Brave-支持-success.svg" alt="Brave">
    <img src="https://img.shields.io/badge/Edge-支持-success.svg" alt="Edge">
    <img src="https://img.shields.io/badge/Chrome-%3E%3D137-blue.svg" alt="Chrome版本">
    <a href="https://afdian.com/a/h1789"><img src="https://img.shields.io/badge/支持-爱发电-blue.svg" alt="在爱发电支持"></a>
  </p>

  <p>
    <b>语言:</b> 
    <a href="README.md">English</a> | 
    <a href="README_zh.md">中文</a>
  </p>

![演示](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

</div>

## 目录

- [目录](#目录)
- [概述](#概述)
- [主要功能](#主要功能)
- [浏览器兼容性](#浏览器兼容性)
- [浏览器设置](#浏览器设置)
  - [Chrome/Brave/Edge 设置](#chromebraveedge-设置)
  - [Firefox 设置](#firefox-设置)
  - [启用开发者模式](#启用开发者模式)
- [界面示例](#界面示例)
  - [画中画界面 (Chrome 更新后的控件)](#画中画界面-chrome-更新后的控件)
- [技术实现](#技术实现)
- [项目统计](#项目统计)
- [资源链接](#资源链接)
- [支持项目](#支持项目)

## 概述

这是一个高级用户脚本，可自动为 YouTube 和哔哩哔哩视频触发画中画 (PiP) 模式。该脚本在多种浏览器中提供流畅的视频观看体验，通过额外功能和更广泛的兼容性增强了原生画中画功能。

> **注意**：现在许多浏览器在测试/实验模式中提供了原生自动画中画功能。

## 主要功能

<details open>
<summary><b>自动画中画功能</b></summary>
<br>

| 功能           | 描述                                    |
| -------------- | --------------------------------------- |
| **智能激活**   | 在视频播放时自动进入画中画模式          |
| **标签页管理** | 智能处理标签页切换，检测用户交互        |
| **暂停处理**   | 在视频暂停时防止激活画中画              |
| **点击优化**   | 增强的点击事件处理，提供更好的用户体验  |
| **跨浏览器**   | 在 Chrome、Edge 和 Brave 中提供一致体验 |
| **错误恢复**   | 健壮的错误处理机制，支持自动重试        |

</details>

## 浏览器兼容性

<details open>
<summary><b>原生自动画中画支持状态</b></summary>
<br>

| 浏览器  | 原生自动画中画 | 状态       | 可用版本                  |
| ------- | -------------- | ---------- | ------------------------- |
| Chrome  | ✅             | 测试版     | Chrome 137.0.7151.15+     |
| Firefox | ✅             | 实验性功能 | Firefox 130+              |
| Edge    | ❓             | 测试版     | Edge 137+ (基于 Chromium) |
| Brave   | ❓             | 测试版     | Brave 1.63+               |
| Safari  | ❓             | 不可用     | -                         |

</details>

## 浏览器设置

### Chrome/Brave/Edge 设置

<details open>
<summary><b>使用原生自动画中画</b></summary>
<br>

1. 启用自动画中画功能（设置）

   ```
   设置 → 隐私和安全 → 网站设置 → 其他权限
   ```

   启用"**自动进入画中画模式**"

2. 配置 Chrome Flags
   访问 `chrome://flags` 并启用：
   - `#auto-picture-in-picture-for-video-playback`
   - `#video-picture-in-picture-controls-update-2024`
   - `#media-session-enter-picture-in-picture`
   - `#document-picture-in-picture-animate-resize`

> **⚠️ Chrome 137.0.7151.15+ 用户重要提示:**
> 如果您使用的是 Chrome Beta 137.0.7151.15 或更高版本，还需启用：
>
> - `#browser-initiated-automatic-picture-in-picture`
>
> 启用此 flag 并配置原生自动画中画后，此用户脚本变为可选，因为浏览器现在可以原生处理自动画中画功能。

</details>

### Firefox 设置

<details open>
<summary><b>使用原生自动画中画 (实验性)</b></summary>
<br>

1. 启用实验性自动画中画功能
   ```
   在地址栏输入: about:settings#experimental
   ```
2. 勾选"**picture-in-picture auto-open on tab switch**"（标签页切换时自动打开画中画）选项

3. 对于手动画中画控制：
   ```
   设置 → 常规 → 浏览
   ```
   确保勾选"**启用画中画视频控件 (E)**"

</details>

<details open>
<summary><b>Zen 浏览器 (基于 Firefox)</b></summary>
<br>

Zen 浏览器基于 Firefox，包含类似的自动画中画功能。设置过程类似：

1. 在 Zen 浏览器中访问 `about:settings#experimental`
2. 启用实验性画中画功能
3. 为获得最佳效果，确保使用 Zen 浏览器 120 或更高版本

注意：Zen 浏览器通常包括额外的视频播放性能优化，可以增强画中画体验。

</details>

### 启用开发者模式

所有浏览器安装用户脚本都需要启用开发者模式

## 界面示例

<details open>
<summary><b>配置截图</b></summary>
<br>

### 画中画界面 (Chrome 更新后的控件)

![界面](https://github.com/user-attachments/assets/43697cdd-c785-4d83-bbf8-6d0bbc45f0a3)

![画中画实现](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

</details>

## 技术实现

<details>
<summary><b>高级浏览器 API</b></summary>
<br>

- 利用 `navigator.mediaSession` API 控制画中画
- 自定义操作处理程序管理画中画状态
- 跨浏览器兼容层
- 智能功能检测
- 渐进增强方法
- 对不支持的浏览器提供优雅的降级方案

</details>

## 项目统计

<details open>
<summary><b>Star 历史</b></summary>
<br>

<a href="https://www.star-history.com/#hong-tm/Auto-Picture-in-Picture&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date" />
 </picture>
</a>

</details>

## 资源链接

<details open>
<summary><b>文档与参考</b></summary>
<br>

| 资源                        | 链接                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome 自动画中画文档       | [官方文档](https://developer.chrome.com/blog/automatic-picture-in-picture?hl=zh-cn)                                                                                  |
| Firefox 自动画中画 (实验性) | [Firefox 博客](https://blog.nightly.mozilla.org/2024/08/26/streamline-your-screen-time-with-auto-open-picture-in-picture-and-more-these-weeks-in-firefox-issue-166/) |
| 画中画 API 规范             | [W3C 规范](https://w3c.github.io/picture-in-picture)                                                                                                                 |
| Firefox 画中画用户指南      | [Firefox 支持](https://support.mozilla.org/zh-CN/kb/Firefox%20%E7%9A%84%E7%94%BB%E4%B8%AD%E7%94%BB%E5%8A%9F%E8%83%BD)                                                |

</details>

## 支持项目

如果您觉得这个用户脚本有用，可以考虑支持其开发：

[![在爱发电支持](https://img.shields.io/badge/支持-爱发电-blue.svg)](https://afdian.com/a/h1789)
