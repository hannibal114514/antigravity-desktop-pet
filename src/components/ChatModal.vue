<template>
  <transition name="chat-fade">
    <div v-if="visible" class="chat-modal-overlay" @click.self="$emit('close')">
      <div class="chat-card">
        <!-- 头部 -->
        <div class="chat-header">
          <div class="avatar-badge">
            <img src="/assets/pet_squint.png" alt="Avatar" class="header-avatar" />
            <div>
              <div class="chat-name">Antigravity 侧躺小桌宠</div>
              <div class="chat-desc">✨ 永远陪在你身边的软萌搭档</div>
            </div>
          </div>
          <button class="chat-close" @click="$emit('close')">✕</button>
        </div>

        <!-- 聊天记录区域 -->
        <div class="chat-body" ref="bodyRef">
          <div 
            v-for="(msg, idx) in messages" 
            :key="idx"
            class="msg-row"
            :class="{ 'is-user': msg.sender === 'user', 'is-pet': msg.sender === 'pet' }"
          >
            <div class="msg-bubble">
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- 快捷问答 -->
        <div class="quick-prompts">
          <button class="quick-btn" @click="sendQuick('今天辛苦啦！')">🌸 今天辛苦啦</button>
          <button class="quick-btn" @click="sendQuick('Antigravity 状态怎么样？')">🚀 检查 Agent 状态</button>
          <button class="quick-btn" @click="sendQuick('摸摸婴儿肥脸蛋~')">💕 摸摸脸蛋</button>
        </div>

        <!-- 底部输入框 -->
        <div class="chat-footer">
          <input 
            v-model="inputQuery" 
            placeholder="对她说点什么吧..." 
            class="chat-input"
            @keyup.enter="handleSend"
          />
          <button class="send-btn" @click="handleSend" :disabled="!inputQuery.trim()">
            发送
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { sound } from '../utils/audio'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'reply', text: string): void
}>()

interface Message {
  sender: 'user' | 'pet'
  text: string
}

const inputQuery = ref('')
const bodyRef = ref<HTMLElement | null>(null)

const messages = ref<Message[]>([
  { sender: 'pet', text: '主人你好呀！侧趴在软枕上敲舒服~ 今天有什么想聊的嘛？(眯眼笑)' }
])

const scrollToBottom = () => {
  nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })
}

const PET_RESPONSES: Record<string, string[]> = {
  default: [
    '呼呼，听到啦！我会一直在这里陪着你写代码哦~ 💕',
    '软乎乎的枕头和主人一样让人安心呢 (眯眯眼~)',
    '代码写累了就抬头看看我，给你充充电！⚡️',
    '无论遇到什么 Bug，深呼吸一口气，我们一定能搞定它！💪'
  ],
  status: [
    'Antigravity Agent 核心运行状态极佳！已准备好随时执行编码任务 🚀',
    '内存与性能指标非常健康，工作流平稳运行中 ✨',
    '代码审查与上下文索引准备就绪，随时待命！'
  ],
  pet: [
    '呜哇~ 摸得好舒服，我的婴儿肥脸蛋软不软呀？(幸福眯眼~)',
    '最喜欢主人摸摸啦！好感度 +10086 💕',
    '蹭蹭主人的手心~ (惬意地陷在枕头里)'
  ]
}

const getSmartReply = (userText: string): string => {
  const lower = userText.toLowerCase()
  if (lower.includes('状态') || lower.includes('agent') || lower.includes('antigravity') || lower.includes('运行')) {
    const list = PET_RESPONSES.status
    return list[Math.floor(Math.random() * list.length)]
  }
  if (lower.includes('摸') || lower.includes('脸') || lower.includes('婴儿肥') || lower.includes('可爱')) {
    const list = PET_RESPONSES.pet
    return list[Math.floor(Math.random() * list.length)]
  }
  const list = PET_RESPONSES.default
  return list[Math.floor(Math.random() * list.length)]
}

const handleSend = () => {
  const text = inputQuery.value.trim()
  if (!text) return

  messages.value.push({ sender: 'user', text })
  inputQuery.value = ''
  scrollToBottom()

  setTimeout(() => {
    const reply = getSmartReply(text)
    messages.value.push({ sender: 'pet', text: reply })
    sound.playBubble()
    emit('reply', reply)
    scrollToBottom()
  }, 400)
}

const sendQuick = (txt: string) => {
  inputQuery.value = txt
  handleSend()
}

watch(() => props.visible, (v) => {
  if (v) scrollToBottom()
})
</script>

<style scoped>
.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.chat-card {
  width: 380px;
  max-width: 90vw;
  height: 480px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.chat-header {
  padding: 14px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #ffeaa7;
  object-fit: cover;
}

.chat-name {
  font-size: 14px;
  font-weight: 700;
  color: #2d3436;
}

.chat-desc {
  font-size: 11px;
  color: #a4b0be;
}

.chat-close {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #747d8c;
  cursor: pointer;
}

.chat-body {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg-row {
  display: flex;
}

.msg-row.is-user {
  justify-content: flex-end;
}

.msg-row.is-pet {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.is-user .msg-bubble {
  background: #ff6b81;
  color: #fff;
  border-bottom-right-radius: 2px;
}

.is-pet .msg-bubble {
  background: #f1f2f6;
  color: #2f3542;
  border-bottom-left-radius: 2px;
}

.quick-prompts {
  display: flex;
  gap: 6px;
  padding: 6px 14px;
  overflow-x: auto;
  background: #fcfcfc;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.quick-btn {
  background: #edf2f7;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 11px;
  color: #4a5568;
  cursor: pointer;
  white-space: nowrap;
}

.quick-btn:hover {
  background: #ff6b81;
  color: #fff;
}

.chat-footer {
  padding: 10px 14px;
  display: flex;
  gap: 8px;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.chat-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
}

.chat-input:focus {
  border-color: #ff6b81;
}

.send-btn {
  background: #ff6b81;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.send-btn:disabled {
  background: #ced6e0;
  cursor: not-allowed;
}

.chat-fade-enter-active, .chat-fade-leave-active {
  transition: opacity 0.2s ease;
}

.chat-fade-enter-from, .chat-fade-leave-to {
  opacity: 0;
}
</style>
