# 🐾 Antigravity Desktop Pet (桌面萌宠专属陪伴)

<div align="center">

![Antigravity Desktop Pet](public/icon.png)

**专为开发者打造的 macOS 原生超轻量透明桌宠伴侣**  
接入 **Google Antigravity & Gemini 3.8** 智能交互大模型与 **Audio8 神经语音声线克隆**引擎

[![macOS](https://img.shields.io/badge/Platform-macOS%2011%2B-blue?logo=apple&logoColor=white)](#)
[![Vue 3](https://img.shields.io/badge/Frontend-Vue%203%20%7C%20TypeScript-4FC08D?logo=vue.js&logoColor=white)](#)
[![Swift](https://img.shields.io/badge/Window-Native%20Swift%20%7C%20WebKit-F05138?logo=swift&logoColor=white)](#)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203.8%20%7C%20Antigravity-4285F4?logo=google&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

</div>

---

## 🌟 核心特性 (Features)

### 1. 🪟 原生极简悬浮与精准像素级穿透 (Pixel-Perfect Hit Testing)
- **原生 Swift 悬浮窗体**：采用 `NSPanel` + `WKWebView` 无边框全透明架构，随心跨虚拟桌面置顶悬浮。
- **100% 桌面零阻碍穿透**：创新性上报算法，**仅人物角色贴图本身响应鼠标点击与拖拽**。身体四周的透明空白区域完全穿透，绝不影响您在桌宠旁点击文件、图标或背景应用。

### 2. 🧠 Antigravity & Gemini 3.8 智能常驻伴侣 (AI-Powered Companion)
- **专属记忆常驻会话**：与 Antigravity 深度联动，绑定单一持久化对话通道（`🐾 桌面萌宠专属陪伴`），保留上下文记忆与陪伴默契。
- **多模型灵活切换**：在气泡中一键无缝切换 `Gemini 3.8 Flash`、`Gemini 3.8 Pro` 以及 `Gemini 3.8 Flash-Lite`。
- **智能离线兜底台词库**：在脱机或无网络环境时，依然拥有生动的摸头撒娇、工作鼓励与休息提醒。

### 3. 🎙️ 角色声线克隆与零磁盘内存音频流 (Voice Cloning & Zero-Disk Stream)
- **极速神经语音克隆**：直连本地 `Audio8_TTS` 模型引擎，支持「长离」、「菲比」等高拟真角色专属声线。
- **内存 Base64 纯流式播放**：对话语音无需频繁写入临时文件，内存极速流转播放，杜绝磁盘垃圾堆积。
- **一键快捷分享好友**：自动在 `~/Downloads` 生成单文件覆盖的最新音频（如 `长离_最新语音.wav`），并在右键菜单提供「打开语音文件夹」快捷入口。

### 4. 🎨 细腻生命感动画交互 (Rich Animations)
- **三种情态随心切换**：
  - 👀 **睁眼待机 (Idle)**：慵懒侧趴软枕，微动呼吸起伏，自然随机双眨眼算法。
  - 😊 **惬意眯眼 (Squint)**：鼠标摸摸头、被夸奖或收到回复时脸红微笑，头顶绽放爱心粒子特效。
  - 💤 **熟睡形态 (Sleep)**：无交互后自动进入香甜睡眠，伴随平缓深沉的呼吸与浮动 Zzz 动效。
- **多维度个性化悬浮盘**：右键任意位置即可调节体型大小（40% ~ 100%）、透明度、音效开关、声线选择等。

### 5. 💻 终端状态联动推送接口 (CLI Integration)
- 内置 `notify_pet.py` 脚本，可在任何 Shell 脚本、CI/CD 构建完成、代码测试通过时，向桌宠气泡推送即时播报。

```bash
python3 notify_pet.py "代码编译通过啦，宝宝超级棒！🎉" --type success --tag "Compiler"
```

---

## 🛠️ 项目架构 (Architecture)

```
┌────────────────────────────────────────────────────────┐
│                   macOS Desktop                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Native Swift Host (AntigravityPetApp)           │  │
│  │  - NSPanel (Borderless, Floating, Transparent)   │  │
│  │  - HitTestWebView (Dynamic Rect Penetration)     │  │
│  └───────────────────────┬──────────────────────────┘  │
│                          │                             │
│  ┌───────────────────────▼──────────────────────────┐  │
│  │  Vue 3 + TypeScript Frontend                     │  │
│  │  - PetCharacter.vue (Sprite & Breathing Engine)   │  │
│  │  - SpeechBubble.vue (Gemini Chat UI)             │  │
│  │  - ContextMenu.vue (Settings Panel)              │  │
│  └───────────────────────┬──────────────────────────┘  │
│                          │ HTTP / SSE                  │
│  ┌───────────────────────▼──────────────────────────┐  │
│  │  Local Node.js Bridge Server (:1421)             │  │
│  │  - Antigravity agentapi CLI Pipeline             │  │
│  │  - Audio8_TTS Service Dispatcher                 │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 快速上手与运行 (Getting Started)

### 前置要求
- macOS 11.0 (Big Sur) 及以上
- Node.js (推荐 v18+)
- Swift 命令行工具 (Xcode Command Line Tools: `xcode-select --install`)
- *(可选)* 本地部署的 `Audio8_TTS`（若需要实时语音克隆发声）

### 1. 克隆仓库与安装依赖
```bash
git clone https://github.com/hannibal114514/antigravity-desktop-pet.git
cd antigravity-desktop-pet
npm install
```

### 2. 本地开发与前端热更新
```bash
npm run dev
```

### 3. 一键编译与打包为独立 macOS 应用 (.app)
项目提供了全自动组装脚本，编译 Swift 原生二进制并生成开箱即用的 `.app`：
```bash
python3 scripts/package_app.py
```
打包成功后，可在项目根目录下找到 `AntigravityPet.app`，直接双击或使用命令行启动：
```bash
open AntigravityPet.app
```

---

## 🎮 常用交互指南 (Controls)

| 操作 | 响应效果 |
| :--- | :--- |
| **鼠标左键点击角色身体** | 触发亲昵摸摸音效，脸红微笑，并弹出随机日常互动台词 |
| **鼠标左键按住拖拽** | 随意拖拽桌宠至屏幕任意位置 |
| **鼠标右键点击角色身体** | 呼出个性化悬浮调节菜单（体型、透明度、形态、声线） |
| **点击角色周围透明空白处** | 100% 穿透点击背后的桌面图标、文件或窗口 |
| **按下 ESC 键** | 快速关闭当前展开的对话气泡或菜单 |
| **快捷键 Cmd + Q** | 完全退出桌宠与后台关联服务 |

---

## 🤝 贡献与感谢 (Credits)

- **AI 赋能**：[Google Antigravity](https://deepmind.google/) & Gemini 3.8
- **语音引擎**：Audio8-TTS / ArkTTS 深度学习端侧推理引擎
- **作者**：[hannibal114514](https://github.com/hannibal114514)

---

## 📄 开源许可证 (License)

本项目基于 [MIT License](LICENSE) 开源发布。
