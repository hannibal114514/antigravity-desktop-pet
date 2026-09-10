<template>
  <div class="context-menu-wrapper">
    <transition name="menu-fade">
      <div 
        v-if="visible" 
        class="context-menu-card"
        @click.stop
      >
        <div class="menu-header">
          <span class="menu-title">🌟 桌宠个性化调节</span>
          <button class="menu-close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- 状态切换 -->
        <div class="menu-section">
          <div class="section-label">角色形态（下方实时预览）</div>
          <div class="btn-group">
            <button 
              :class="{ active: state === 'idle' }" 
              @click="setState('idle')"
            >
              👀 睁眼
            </button>
            <button 
              :class="{ active: state === 'squint' }" 
              @click="setState('squint')"
            >
              😊 眯眼
            </button>
            <button 
              :class="{ active: state === 'sleep' }" 
              @click="setState('sleep')"
            >
              💤 睡觉
            </button>
          </div>
        </div>

        <!-- 体型大小 -->
        <div class="menu-section">
          <div class="section-label">体型缩放 ({{ Math.round(scale * 100) }}%)</div>
          <div class="btn-group">
            <button :class="{ active: scale === 0.4 }" @click="setScale(0.4)">极小</button>
            <button :class="{ active: scale === 0.6 }" @click="setScale(0.6)">小号</button>
            <button :class="{ active: scale === 0.8 }" @click="setScale(0.8)">标准</button>
            <button :class="{ active: scale === 1.0 }" @click="setScale(1.0)">原版</button>
          </div>
        </div>

        <!-- 透明度调节 -->
        <div class="menu-section">
          <div class="section-label">透明度调节 ({{ Math.round(opacity * 100) }}%)</div>
          <div class="btn-group">
            <button :class="{ active: opacity === 1.0 }" @click="setOpacity(1.0)">100%</button>
            <button :class="{ active: opacity === 0.85 }" @click="setOpacity(0.85)">85%</button>
            <button :class="{ active: opacity === 0.7 }" @click="setOpacity(0.7)">70%</button>
            <button :class="{ active: opacity === 0.5 }" @click="setOpacity(0.5)">50%</button>
          </div>
        </div>

        <!-- 伴读声线切换 -->
        <div class="menu-section">
          <div class="section-label">伴读声线（Audio8 原声克隆）</div>
          <div class="btn-group">
            <button 
              :class="{ active: currentVoice === 'custom_voice' }" 
              @click="setVoice('custom_voice')"
            >
              🌟 专属原声
            </button>
            <button 
              :class="{ active: currentVoice === 'changli' }" 
              @click="setVoice('changli')"
            >
              🔥 长离
            </button>
            <button 
              :class="{ active: currentVoice === 'feibi' }" 
              @click="setVoice('feibi')"
            >
              ✨ 菲比
            </button>
          </div>
        </div>

        <!-- 快捷功能 -->
        <div class="menu-section">
          <div class="menu-item-toggle" @click="$emit('open-bubble')">
            <span>💬 呼出对话框</span>
            <span class="action-hint">点击开启</span>
          </div>
          <div class="menu-item-toggle" @click="toggleVoice">
            <span>🎙️ {{ voiceLabel }}朗读</span>
            <span class="toggle-status" :class="{ on: voiceEnabled }">{{ voiceEnabled ? '开' : '关' }}</span>
          </div>
          <div class="menu-item-toggle" @click="openVoiceFolder">
            <span>📂 查看导出的语音文件</span>
            <span class="action-hint">下载目录</span>
          </div>
          <div class="menu-item-toggle" @click="toggleSound">
            <span>🔊 互动提示音效</span>
            <span class="toggle-status" :class="{ on: soundEnabled }">{{ soundEnabled ? '开' : '关' }}</span>
          </div>
        </div>

        <!-- 底部操作：完成 与 彻底退出按钮 -->
        <div class="menu-footer">
          <button class="footer-btn finish" @click="$emit('close')">完成</button>
          <button class="footer-btn quit" @click="$emit('quit-app')">🔴 彻底退出桌宠</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sound } from '../utils/audio'

const props = withDefaults(defineProps<{
  visible: boolean
  state: string
  scale: number
  opacity: number
  soundEnabled: boolean
  voiceEnabled: boolean
  currentVoice?: string
}>(), {
  currentVoice: 'custom_voice'
})

const voiceLabel = computed(() => {
  if (props.currentVoice === 'custom_voice') return '专属原声'
  if (props.currentVoice === 'feibi') return '菲比原声'
  return '长离原声'
})

const emit = defineEmits<{
  (e: 'update:state', val: string): void
  (e: 'update:scale', val: number): void
  (e: 'update:opacity', val: number): void
  (e: 'update:soundEnabled', val: boolean): void
  (e: 'update:voiceEnabled', val: boolean): void
  (e: 'update:currentVoice', val: string): void
  (e: 'open-bubble'): void
  (e: 'close'): void
  (e: 'quit-app'): void
}>()

const setState = (s: string) => emit('update:state', s)
const setScale = (sc: number) => emit('update:scale', sc)
const setOpacity = (op: number) => emit('update:opacity', op)
const setVoice = (v: string) => emit('update:currentVoice', v)

const toggleVoice = () => {
  emit('update:voiceEnabled', !props.voiceEnabled)
}

const toggleSound = () => {
  sound.enabled = !sound.enabled
  emit('update:soundEnabled', sound.enabled)
  if (sound.enabled) sound.playPet()
}

const openVoiceFolder = () => {
  fetch('http://127.0.0.1:1421/api/open-downloads', { method: 'POST' }).catch(() => {})
}
</script>

<style scoped>
.context-menu-wrapper {
  position: absolute;
  top: 10px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 1000;
}

.context-menu-card {
  width: 260px;
  max-width: 92%;
  max-height: 405px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 10px 12px 10px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.9) inset;
  user-select: none;
  pointer-events: auto;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 6px;
}

.menu-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #2d3436;
}

.menu-close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: #747d8c;
  font-size: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-close-btn:hover {
  background: #ff4757;
  color: #fff;
}

.menu-section {
  margin-bottom: 5px;
}

.section-label {
  font-size: 10px;
  color: #747d8c;
  margin-bottom: 3px;
}

.btn-group {
  display: flex;
  gap: 3px;
}

.btn-group button {
  flex: 1;
  background: #f1f2f6;
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 3px 2px;
  border-radius: 5px;
  font-size: 10px;
  color: #57606f;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-group button.active {
  background: #ff6b81;
  color: #fff;
  border-color: #ff6b81;
  font-weight: 600;
}

.menu-item-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 4px;
  font-size: 11px;
  color: #2f3542;
  cursor: pointer;
  border-radius: 5px;
}

.menu-item-toggle:hover {
  background: rgba(0, 0, 0, 0.04);
}

.action-hint {
  font-size: 9.5px;
  color: #ff6b81;
  font-weight: 600;
}

.toggle-status {
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 5px;
  background: #ced6e0;
  color: #fff;
}

.toggle-status.on {
  background: #2ed573;
}

.menu-footer {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-btn {
  flex: 1;
  border: none;
  padding: 6px 4px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-btn.finish {
  background: #f1f2f6;
  color: #2d3436;
  font-weight: 600;
}

.footer-btn.finish:hover {
  background: #e4e7eb;
}

.footer-btn.quit {
  background: #ff4757;
  color: #ffffff;
  font-weight: 600;
}

.footer-btn.quit:hover {
  background: #d63031;
}

.menu-fade-enter-from, .menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.menu-fade-enter-active, .menu-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
</style>
