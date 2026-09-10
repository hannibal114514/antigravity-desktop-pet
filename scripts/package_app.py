#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
APP_DIR = os.path.join(PROJECT_DIR, "AntigravityPet.app")

print(f"[Package] Packaging Antigravity Desktop Pet...")
print(f"[Package] Project Directory: {PROJECT_DIR}")

# 1. 确保前端已构建
dist_src = os.path.join(PROJECT_DIR, "dist")
if not os.path.exists(dist_src) or not os.path.exists(os.path.join(dist_src, "index.html")):
    print("[Package] Building frontend with Vite...")
    subprocess.run(["npm", "run", "build"], cwd=PROJECT_DIR, check=True)

# 2. 编译 Swift 浮窗二进制
swift_src = os.path.join(PROJECT_DIR, "run_desktop.swift")
binary_out = os.path.join(PROJECT_DIR, "AntigravityPetApp")

print("[Package] Compiling Swift binary...")
subprocess.run([
    "swiftc", "-O",
    "-o", binary_out,
    swift_src
], check=True)
print("[Package] Swift binary compiled successfully!")

# 3. 清理旧 app 目录
if os.path.exists(APP_DIR):
    shutil.rmtree(APP_DIR)

contents_dir = os.path.join(APP_DIR, "Contents")
macos_dir = os.path.join(contents_dir, "MacOS")
resources_dir = os.path.join(contents_dir, "Resources")

os.makedirs(macos_dir, exist_ok=True)
os.makedirs(resources_dir, exist_ok=True)

# 4. 复制 AppIcon.icns
icon_src = os.path.join(PROJECT_DIR, "AppIcon.icns")
if os.path.exists(icon_src):
    shutil.copy(icon_src, os.path.join(resources_dir, "AppIcon.icns"))

# 5. 复制 dist 到 Resources 与 MacOS 双重目录
shutil.copytree(dist_src, os.path.join(resources_dir, "dist"))
shutil.copytree(dist_src, os.path.join(macos_dir, "dist"))

# 6. 复制 server/bridge.js
os.makedirs(os.path.join(macos_dir, "server"), exist_ok=True)
shutil.copy(os.path.join(PROJECT_DIR, "server/bridge.js"), os.path.join(macos_dir, "server/bridge.js"))

# 7. 复制 Swift 二进制
shutil.copy(binary_out, os.path.join(macos_dir, "AntigravityPetApp"))

# 8. 启动总控脚本
launcher_script = """#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 杀死残余旧服务与旧实例
pkill -f "bridge.js" 2>/dev/null || true
pkill -f "AntigravityPetApp" 2>/dev/null || true
sleep 0.4

# 启动本地同源服务
node "$DIR/server/bridge.js" >/dev/null 2>&1 &
sleep 0.5

# 检查并在后台启动 Audio8_TTS 伴生语音服务（若尚未启动且存在）
if ! curl -s --max-time 1 http://127.0.0.1:8024/api/health >/dev/null 2>&1; then
  AUDIO8_DIR="${AUDIO8_TTS_DIR:-/Volumes/A/Audio8_TTS}"
  if [ ! -d "$AUDIO8_DIR" ]; then
    AUDIO8_DIR="$HOME/Audio8_TTS"
  fi
  if [ -f "$AUDIO8_DIR/venv/bin/python3" ]; then
    export ARKTTS_MODEL_DIR="$AUDIO8_DIR/model/audio8-TTS-0.1B-ONNX-INT8"
    export ARKTTS_VOICES_DIR="$AUDIO8_DIR/voices"
    export ARKTTS_PRECISION="int8"
    export ARKTTS_CODEC_PRECISION="fp16"
    export ARKTTS_THREADS="4"
    "$AUDIO8_DIR/venv/bin/python3" -m uvicorn arktts_runtime.service:app \\
      --app-dir "$AUDIO8_DIR/onnx_runtime_0_1b_int8" \\
      --host 127.0.0.1 \\
      --port 8024 >/dev/null 2>&1 &
  fi
fi

# 启动原生浮窗程序
exec "$DIR/AntigravityPetApp"
"""

launcher_path = os.path.join(macos_dir, "AntigravityPet")
with open(launcher_path, "w", encoding="utf-8") as f:
    f.write(launcher_script)

os.chmod(launcher_path, 0o755)
os.chmod(os.path.join(macos_dir, "AntigravityPetApp"), 0o755)

# 9. Info.plist
info_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh_CN</string>
    <key>CFBundleExecutable</key>
    <string>AntigravityPet</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.antigravity.desktoppet</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>AntigravityPet</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
"""

with open(os.path.join(contents_dir, "Info.plist"), "w", encoding="utf-8") as f:
    f.write(info_plist.strip() + "\n")

print(f"[Package] Successfully packaged app to: {APP_DIR}")
