<template>
  <div class="speech-bubble-wrapper">
    <transition name="bubble-pop" @after-enter="$emit('layout-change')">
      <div 
        v-if="visible" 
        class="speech-bubble-card"
        :style="bubbleStyle"
        @click.stop
      >
        <!-- 顶部标题、模型选择与关闭按钮 -->
        <div class="bubble-header">
          <div class="header-left">
            <span class="pet-tag">
              <span class="status-dot" :class="tagType"></span>
              {{ tagText }}
            </span>

            <!-- 自定义模型选择胶囊与下拉框 -->
            <div class="model-picker-wrapper">
              <button 
                type="button"
                class="model-pill-btn" 
                :class="{ active: isModelMenuOpen }"
                title="切换 Gemini 3.8 / Antigravity 运行模型"
                @click.stop="toggleModelMenu"
              >
                <span class="pill-text">{{ currentModelDisplay }}</span>
                <span class="pill-arrow" :class="{ rotated: isModelMenuOpen }">▾</span>
              </button>

              <!-- 展开的模型菜单 -->
              <transition name="fade-drop">
                <div v-if="isModelMenuOpen" class="model-dropdown-menu" @click.stop>
                  <div class="dropdown-header">选择对话模型</div>
                  <button 
                    v-for="m in modelOptions" 
                    :key="m.id"
                    type="button"
                    class="model-item-btn"
                    :class="{ selected: currentModel === m.id }"
                    @click.stop="selectModel(m.id)"
                  >
                    <span class="m-icon">{{ m.icon }}</span>
                    <div class="m-text">
                      <div class="m-title">{{ m.label }}</div>
                      <div class="m-desc">{{ m.desc }}</div>
                    </div>
                    <span v-if="currentModel === m.id" class="m-check">✓</span>
                  </button>
                </div>
              </transition>
            </div>
          </div>

          <!-- 关闭按钮 -->
          <button 
            type="button"
            class="close-btn" 
            title="关闭对话框 (ESC)" 
            @click.stop="handleClose"
          >
            ✕
          </button>
        </div>

        <!-- 消息文本（打字机逐字渲染） -->
        <div class="bubble-content">
          <p class="bubble-text">{{ displayedText }}<span v-if="isTyping" class="cursor">|</span></p>
        </div>

        <!-- 快捷互动标签 -->
        <div class="quick-tags">
          <button class="tag-btn" @click.stop="handleQuick('摸摸婴儿肥脸蛋~')">💕 摸摸脸</button>
          <button class="tag-btn" @click.stop="handleQuick('Antigravity 状态怎么样？')">🚀 状态</button>
          <button class="tag-btn" @click.stop="handleQuick('写代码有点累了~')">☕️ 休息</button>
          <button class="tag-btn" @click.stop="$emit('change-state')">{{ stateActionText }}</button>
        </div>

        <!-- 气泡内嵌输入框 -->
        <div class="bubble-input-row">
          <input 
            ref="inputRef"
            v-model="inputText"
            class="chat-input"
            placeholder="和她说说话 (Enter 发送)..."
            maxlength="60"
            @keyup.enter="handleSend"
            @keyup.esc="handleClose"
            @mousedown.stop
          />
          <button 
            type="button"
            class="send-btn" 
            :disabled="!inputText.trim()"
            @click.stop="handleSend"
          >
            发送
          </button>
        </div>

        <!-- 气泡三角形小尾巴 -->
        <div class="bubble-tail"></div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { sound } from '../utils/audio'

const props = defineProps<{
  visible: boolean
  message: string
  tag?: string
  statusType?: 'active' | 'busy' | 'rest'
  scale: number
  currentState: string
  currentModel: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'send', text: string): void
  (e: 'change-state'): void
  (e: 'pet-click'): void
  (e: 'update:model', model: string): void
  (e: 'layout-change'): void
}>()

const displayedText = ref('')
const isTyping = ref(false)
const inputText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isModelMenuOpen = ref(false)
let typeTimer: any = null

const modelOptions = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', icon: '⚡️', desc: '极速灵动·日常对话 (推荐)' },
  { id: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro', icon: '🧠', desc: '深度思考·高智商代码' },
  { id: 'gemini-3.8-flash-lite', label: 'Gemini 3.8 Flash Lite', icon: '💡', desc: '轻量秒回·省流节能' }
]

const currentModelDisplay = computed(() => {
  const found = modelOptions.find(m => m.id === props.currentModel)
  if (found) return `${found.icon} ${found.label.replace('Gemini ', '')}`
  return '⚡️ 3.8 Flash'
})

const tagText = computed(() => props.tag || '侧躺小搭档')
const tagType = computed(() => props.statusType || 'active')

const stateActionText = computed(() => {
  if (props.currentState === 'sleep') return '☀️ 唤醒'
  if (props.currentState === 'squint') return '✨ 待机'
  return '😴 睡觉'
})

const bubbleStyle = computed(() => ({
  transform: `scale(${Math.min(1.0, Math.max(0.75, props.scale))})`
}))

const toggleModelMenu = () => {
  isModelMenuOpen.value = !isModelMenuOpen.value
  nextTick(() => emit('layout-change'))
}

const selectModel = (id: string) => {
  emit('update:model', id)
  localStorage.setItem('pet_model', id)
  isModelMenuOpen.value = false
  nextTick(() => emit('layout-change'))
}

const handleClose = () => {
  isModelMenuOpen.value = false
  emit('close')
}

// 打字机效果
const startTypewriter = (text: string) => {
  if (typeTimer) clearInterval(typeTimer)
  displayedText.value = ''
  isTyping.value = true
  sound.playBubble()

  let index = 0
  typeTimer = setInterval(() => {
    if (index < text.length) {
      displayedText.value += text[index]
      index++
    } else {
      isTyping.value = false
      clearInterval(typeTimer)
    }
  }, 20)
}

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text) return
  isModelMenuOpen.value = false
  emit('send', text)
  inputText.value = ''
}

const handleQuick = (msg: string) => {
  isModelMenuOpen.value = false
  if (msg.includes('摸摸')) {
    emit('pet-click')
  } else {
    emit('send', msg)
  }
}

const onGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isModelMenuOpen.value) {
      isModelMenuOpen.value = false
      nextTick(() => emit('layout-change'))
    } else if (props.visible) {
      handleClose()
    }
  }
}

watch(
  () => props.message,
  (newMsg) => {
    if (props.visible && newMsg) {
      startTypewriter(newMsg)
    }
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      isModelMenuOpen.value = false
      if (props.message) startTypewriter(props.message)
      nextTick(() => {
        inputRef.value?.focus()
        emit('layout-change')
      })
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  if (typeTimer) clearInterval(typeTimer)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<style scoped>
.speech-bubble-wrapper {
  position: absolute;
  bottom: 110px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 100;
}

.speech-bubble-card {
  position: relative;
  width: 280px;
  max-width: 94%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 10px 12px 8px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9) inset;
  pointer-events: auto;
  user-select: none;
  transform-origin: bottom center;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pet-tag {
  font-size: 10px;
  font-weight: 700;
  color: #57606f;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 8px;
}

/* 模型选择器胶囊 */
.model-picker-wrapper {
  position: relative;
}

.model-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #fff0f3;
  border: 1px solid #ffd1dc;
  color: #ff4757;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.model-pill-btn:hover, .model-pill-btn.active {
  background: #ff4757;
  color: #ffffff;
  border-color: #ff4757;
}

.pill-arrow {
  font-size: 8px;
  transition: transform 0.2s ease;
}

.pill-arrow.rotated {
  transform: rotate(180deg);
}

/* 模型下拉弹出框 */
.model-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 190px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  padding: 6px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-header {
  font-size: 9px;
  font-weight: 700;
  color: #a4b0be;
  padding: 2px 6px;
}

.model-item-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 5px 6px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.model-item-btn:hover {
  background: #fff0f3;
}

.model-item-btn.selected {
  background: #ffeef2;
}

.m-icon {
  font-size: 12px;
}

.m-text {
  flex: 1;
}

.m-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #2f3542;
}

.model-item-btn.selected .m-title {
  color: #ff4757;
}

.m-desc {
  font-size: 8.5px;
  color: #747d8c;
}

.m-check {
  font-size: 11px;
  font-weight: bold;
  color: #ff4757;
}

.fade-drop-enter-from, .fade-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.fade-drop-enter-active, .fade-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.status-dot.active { background: #2ed573; box-shadow: 0 0 4px #2ed573; }
.status-dot.busy { background: #ffa502; box-shadow: 0 0 4px #ffa502; }
.status-dot.rest { background: #70a1ff; box-shadow: 0 0 4px #70a1ff; }

.close-btn {
  background: rgba(0, 0, 0, 0.06);
  border: none;
  color: #747d8c;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #ff4757;
  color: #ffffff;
}

.bubble-content {
  min-height: 28px;
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.bubble-text {
  font-size: 12px;
  line-height: 1.45;
  color: #2f3542;
  font-weight: 500;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  color: #ff6b81;
  font-weight: bold;
  animation: blinkCursor 0.8s infinite;
}

@keyframes blinkCursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.quick-tags {
  display: flex;
  gap: 3px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.tag-btn {
  background: #f1f2f6;
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  color: #57606f;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-btn:hover {
  background: #ff6b81;
  color: #fff;
  border-color: #ff6b81;
}

.bubble-input-row {
  display: flex;
  gap: 4px;
  background: #f8f9fa;
  padding: 3px 5px;
  border-radius: 10px;
  border: 1px solid #e4e7eb;
}

.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 2px 4px;
  font-size: 11px;
  color: #2d3436;
  outline: none;
  user-select: text;
  -webkit-user-select: text;
}

.chat-input::placeholder {
  color: #a4b0be;
  font-size: 10px;
}

.send-btn {
  background: #ff6b81;
  color: #fff;
  border: none;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  background: #ff4757;
}

.send-btn:disabled {
  background: #dcdde1;
  cursor: not-allowed;
}

.bubble-tail {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.98);
}

/* 优雅平滑过渡，不缩放宽高尺寸，避免 HitTest 矩形失真 */
.bubble-pop-enter-from, .bubble-pop-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.bubble-pop-enter-active, .bubble-pop-leave-active {
  transition: opacity 0.16s ease-out, transform 0.16s ease-out;
}
</style>