<template>
  <div 
    class="desktop-pet-app"
    @click="onAppClick"
  >
    <!-- 设置菜单 -->
    <ContextMenu
      :visible="menuVisible"
      :state="petState"
      :scale="scale"
      :opacity="opacity"
      :soundEnabled="soundEnabled"
      :voiceEnabled="voiceEnabled"
      :currentVoice="currentVoice"
      @update:state="(s) => petState = s as any"
      @update:scale="(sc) => scale = sc"
      @update:opacity="(op) => opacity = op"
      @update:soundEnabled="(se) => soundEnabled = se"
      @update:voiceEnabled="(ve) => voiceEnabled = ve"
      @update:currentVoice="(v) => currentVoice = v"
      @open-bubble="openBubbleManually"
      @quit-app="handleQuitApp"
      @close="menuVisible = false"
    />

    <!-- 对话气泡系统（接入 Antigravity & Gemini AI 对话） -->
    <SpeechBubble
      :visible="bubbleVisible && !menuVisible"
      :message="bubbleMessage"
      :tag="bubbleTag"
      :statusType="agentStatus"
      :scale="scale"
      :currentState="petState"
      :currentModel="selectedModel"
      @update:model="(m) => selectedModel = m"
      @close="closeBubble"
      @send="handleUserChat"
      @pet-click="onPetInteraction"
      @change-state="cycleState"
      @layout-change="triggerReportHitRegionsDelayed"
    />

    <!-- 桌宠主体（贴底居中放置） -->
    <div class="pet-anchor" ref="petAnchorRef">
      <PetCharacter
        ref="petCharacterRef"
        :state="petState"
        :scale="scale"
        :opacity="opacity"
        @update:state="(s) => petState = s"
        @pet="onPetInteraction"
        @contextmenu="openContextMenu"
        @drag-move="handleDragMove"
        @sprite-loaded="triggerReportHitRegionsDelayed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import PetCharacter, { type PetState } from './components/PetCharacter.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import ContextMenu from './components/ContextMenu.vue'
import { sound } from './utils/audio'

// 组件引用
const petCharacterRef = ref<any>(null)

// 核心状态（默认常态为睁眼 idle）
const petState = ref<PetState>('idle')
const savedState = localStorage.getItem('pet_state')
if (savedState === 'idle' || savedState === 'sleep') {
  petState.value = savedState as PetState
} else {
  petState.value = 'idle'
  localStorage.setItem('pet_state', 'idle')
}

watch(petState, (val) => {
  localStorage.setItem('pet_state', val)
})

const scale = ref(0.8)
const opacity = ref(1.0)
const soundEnabled = ref(true)
const voiceEnabled = ref(localStorage.getItem('pet_voice_enabled') !== 'false')
const currentVoice = ref(localStorage.getItem('pet_voice_persona') || 'custom_voice')

watch(voiceEnabled, (val) => {
  localStorage.setItem('pet_voice_enabled', String(val))
})

watch(currentVoice, (val) => {
  localStorage.setItem('pet_voice_persona', val)
})

let currentVoiceAudio: HTMLAudioElement | null = null

const playVoiceAudio = (audioDataUri: string) => {
  if (!voiceEnabled.value || !audioDataUri) return
  try {
    if (currentVoiceAudio) {
      currentVoiceAudio.pause()
      currentVoiceAudio = null
    }
    const audio = new Audio(audioDataUri)
    currentVoiceAudio = audio

    // 播放期间保持气泡显示，播放完毕后再安排自动淡出
    if (autoHideBubbleTimer) clearTimeout(autoHideBubbleTimer)

    audio.onended = () => {
      if (currentVoiceAudio === audio) currentVoiceAudio = null
      scheduleBubbleAutoHide(6000)
    }
    audio.onerror = (e) => {
      console.warn('[Voice] Audio error:', e)
      if (currentVoiceAudio === audio) currentVoiceAudio = null
      scheduleBubbleAutoHide(4000)
    }
    audio.play().catch(e => {
      console.warn('[Voice] Playback error:', e)
    })
  } catch (err) {
    console.warn('[Voice] Playback exception:', err)
  }
}

// 模型规范化（避免残留过时的旧模型名称）
const VALID_MODELS = ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-3.8-flash-lite']
let initialModel = localStorage.getItem('pet_model') || 'gemini-3.8-flash'
if (!VALID_MODELS.includes(initialModel)) {
  initialModel = 'gemini-3.8-flash'
}
const selectedModel = ref(initialModel)

watch(selectedModel, (val) => {
  localStorage.setItem('pet_model', val)
})

// 气泡对话框
const bubbleVisible = ref(false)
const bubbleMessage = ref('宝宝好呀... 悄悄告诉你，人家宽松毛衣下面只穿了一点点，正乖乖趴着等你欺负呢~ 💕')
const bubbleTag = ref('Antigravity')
const agentStatus = ref<'active' | 'busy' | 'rest'>('active')

// 菜单
const menuVisible = ref(false)
let autoHideBubbleTimer: any = null
let sseSource: EventSource | null = null

// 上报可点击区域给 Swift 进行精准命中穿透
const reportHitRegions = () => {
  if (!(window as any).webkit?.messageHandlers?.updateHitRegions) return
  
  const rects: Array<{ x: number; y: number; width: number; height: number }> = []
  
  // 1. 桌宠主体贴图区域 (严格局限于角色贴图本身，保留呼吸微小余量)
  const spriteEl = document.querySelector('.pet-sprite')
  if (spriteEl) {
    const r = spriteEl.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      rects.push({
        x: Math.round(r.left),
        y: Math.max(0, Math.round(r.top - 2)),
        width: Math.round(r.width),
        height: Math.round(r.height + 4)
      })
    }
  }
  
  // 2. 气泡框区域 (仅在展开且未打开菜单时作为有效点击区域)
  if (bubbleVisible.value && !menuVisible.value) {
    const bubbleEl = document.querySelector('.speech-bubble-card')
    if (bubbleEl) {
      const r = bubbleEl.getBoundingClientRect()
      // 外扩 10px 命中缓冲区，确保点击顶部关闭键、输入框与阴影边缘时 100% 捕获
      rects.push({
        x: Math.max(0, Math.round(r.left - 10)),
        y: Math.max(0, Math.round(r.top - 10)),
        width: Math.round(r.width + 20),
        height: Math.round(r.height + 20)
      })
    }

    const dropdownEl = document.querySelector('.model-dropdown-menu')
    if (dropdownEl) {
      const dr = dropdownEl.getBoundingClientRect()
      rects.push({
        x: Math.round(dr.left),
        y: Math.round(dr.top),
        width: Math.round(dr.width),
        height: Math.round(dr.height)
      })
    }
  }
  
  // 3. 设置面板区域 (仅在菜单展开时作为有效点击区域)
  if (menuVisible.value) {
    const menuEl = document.querySelector('.context-menu-card')
    if (menuEl) {
      const r = menuEl.getBoundingClientRect()
      rects.push({
        x: Math.max(0, Math.round(r.left - 6)),
        y: Math.max(0, Math.round(r.top - 6)),
        width: Math.round(r.width + 12),
        height: Math.round(r.height + 12)
      })
    }
  }
  
  (window as any).webkit.messageHandlers.updateHitRegions.postMessage(rects)
}

// 计算贴图紧凑盒尺寸
const getCompactDimensions = (currentScale: number) => {
  const w = Math.round(190 * currentScale + 40)
  const h = Math.round(106 * currentScale + 48)
  return { width: Math.max(140, w), height: Math.max(95, h) }
}

// 同步窗口物理尺寸至原生 Swift 层 (解决顶部大片透明遮盖与无法移动到屏幕顶部的问题)
const syncWindowDimensions = () => {
  if (!(window as any).webkit?.messageHandlers?.resizeWindow) return
  let targetW = 320
  let targetH = 290

  if (menuVisible.value) {
    targetW = 320
    targetH = 435 // 保证设置菜单完整展开，完成与退出按钮绝不截断
  } else if (bubbleVisible.value) {
    targetW = 320
    targetH = 290 // 贴近角色的近距离对话气泡
  } else {
    const compact = getCompactDimensions(scale.value)
    targetW = compact.width
    targetH = compact.height
  }

  (window as any).webkit.messageHandlers.resizeWindow.postMessage({
    width: targetW,
    height: targetH,
    expanded: bubbleVisible.value || menuVisible.value
  })
}

const triggerReportHitRegionsDelayed = () => {
  syncWindowDimensions()
  nextTick(() => {
    reportHitRegions()
  })
  setTimeout(() => {
    syncWindowDimensions()
    reportHitRegions()
  }, 50)
  setTimeout(reportHitRegions, 150)
  setTimeout(reportHitRegions, 300)
}

watch([bubbleVisible, menuVisible, scale, opacity], () => {
  syncWindowDimensions()
  triggerReportHitRegionsDelayed()
})

// 跨进程拖拽移动
const handleDragMove = (delta: { dx: number; dy: number }) => {
  resetIdleTimer()
  if ((window as any).webkit?.messageHandlers?.moveWindow) {
    (window as any).webkit.messageHandlers.moveWindow.postMessage(delta)
  }
}

// 调度气泡自动隐藏（默认15秒，播放中不隐藏）
const scheduleBubbleAutoHide = (delayMs = 15000) => {
  if (autoHideBubbleTimer) clearTimeout(autoHideBubbleTimer)
  autoHideBubbleTimer = setTimeout(() => {
    if (currentVoiceAudio && !currentVoiceAudio.paused) return
    bubbleVisible.value = false
    triggerReportHitRegionsDelayed()
  }, delayMs)
}

// 彻底关闭对话气泡并释放音频/TTS资源
const closeBubble = () => {
  bubbleVisible.value = false
  if (autoHideBubbleTimer) {
    clearTimeout(autoHideBubbleTimer)
    autoHideBubbleTimer = null
  }
  if (currentVoiceAudio) {
    currentVoiceAudio.pause()
    currentVoiceAudio = null
  }
  if (ttsAbortController) {
    ttsAbortController.abort()
    ttsAbortController = null
  }
  syncWindowDimensions()
  triggerReportHitRegionsDelayed()
}

// 手动呼出对话框
const openBubbleManually = () => {
  menuVisible.value = false
  bubbleVisible.value = true
  triggerReportHitRegionsDelayed()
  scheduleBubbleAutoHide()
}

const handleQuitApp = () => {
  if ((window as any).webkit?.messageHandlers?.quitApp) {
    (window as any).webkit.messageHandlers.quitApp.postMessage({})
  }
  fetch('http://127.0.0.1:1421/api/quit', { method: 'POST' }).catch(() => {})
}

let ttsAbortController: AbortController | null = null

// 处理用户输入聊天（接入 Antigravity & AI 后端）
const handleUserChat = async (userText: string) => {
  resetIdleTimer()
  if (petState.value === 'sleep') {
    petState.value = 'idle'
  }
  
  bubbleVisible.value = true
  bubbleMessage.value = '正在呼叫 Antigravity... ✨'
  agentStatus.value = 'busy'
  triggerReportHitRegionsDelayed()
  
  try {
    const res = await fetch('http://127.0.0.1:1421/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        model: selectedModel.value
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      bubbleMessage.value = data.reply || '宝宝，我一直在你身边哦 💕'
      petCharacterRef.value?.triggerReaction(2500)
      sound.playSquint()
      agentStatus.value = 'active'
      triggerReportHitRegionsDelayed()
      scheduleBubbleAutoHide()

      // 异步请求角色原声合成，零磁盘开销内存流式播放
      if (voiceEnabled.value && data.reply) {
        if (ttsAbortController) ttsAbortController.abort()
        ttsAbortController = new AbortController()
        fetch('http://127.0.0.1:1421/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: data.reply,
            voice: currentVoice.value 
          }),
          signal: ttsAbortController.signal
        }).then(async (ttsRes) => {
          if (ttsRes.ok) {
            const ttsData = await ttsRes.json()
            if (ttsData.audio && voiceEnabled.value) {
              playVoiceAudio(ttsData.audio)
            }
          }
        }).catch(() => {})
      }
    } else {
      bubbleMessage.value = '坏宝宝，快伸手摸摸我，人家等你等得身子都发烫啦~ 💕'
      petCharacterRef.value?.triggerReaction(2500)
      agentStatus.value = 'active'
    }
  } catch (err) {
    bubbleMessage.value = '宝宝身上好香好热呀，菲比就想趴在你身上当小挂件，一秒钟也不许离开我~ 💕'
    petCharacterRef.value?.triggerReaction(2500)
    agentStatus.value = 'active'
  }
  
  triggerReportHitRegionsDelayed()
  scheduleBubbleAutoHide()
}

let idleTimer: any = null

const resetIdleTimer = () => {
  if (petState.value === 'sleep') return
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    petState.value = 'sleep'
  }, 45000)
}

const cycleState = () => {
  if (petState.value === 'idle') petState.value = 'squint'
  else if (petState.value === 'squint') petState.value = 'sleep'
  else petState.value = 'idle'
}

// 点击/摸摸交互
const onPetInteraction = () => {
  resetIdleTimer()
  petCharacterRef.value?.triggerReaction(2500)
  const petSayings = [
    '唔嗯... 坏宝宝摸得好深，骨头都要被你揉酥了呢~ 💕',
    '啊... 宝宝手心好烫，呼吸都要被你弄乱了啦~',
    '被宝宝摸得浑身酥软，整只都要陷在枕头里化掉啦~ (娇喘)',
    '坏宝宝乱摸哪里呢！虽然好舒服... 但你今天必须对我负责到底哦~ ✨',
    '最喜欢被宝宝揉软软的脸蛋和锁骨了，快亲亲我嘛~ 💕'
  ]
  bubbleMessage.value = petSayings[Math.floor(Math.random() * petSayings.length)]
  bubbleVisible.value = true
  menuVisible.value = false
  agentStatus.value = 'active'
  triggerReportHitRegionsDelayed()
  scheduleBubbleAutoHide()
}

const openContextMenu = () => {
  bubbleVisible.value = false
  menuVisible.value = true
  triggerReportHitRegionsDelayed()
}

const onAppClick = () => {
  if (menuVisible.value) menuVisible.value = false
  resetIdleTimer()
}

// 连接 Antigravity 本地 SSE 联动中枢
const initAntigravitySSE = () => {
  try {
    sseSource = new EventSource('http://127.0.0.1:1421/events')
    sseSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'connected') return

        resetIdleTimer()
        if (data.state) petState.value = data.state
        if (data.text) bubbleMessage.value = data.text
        if (data.tag) bubbleTag.value = data.tag
        
        if (data.audio && voiceEnabled.value) {
          playVoiceAudio(data.audio)
        }
        
        if (data.type === 'success') {
          agentStatus.value = 'active'
          sound.playWakeUp()
        } else if (data.type === 'thinking') {
          agentStatus.value = 'busy'
          sound.playBubble()
        } else {
          agentStatus.value = 'active'
          sound.playBubble()
        }

        bubbleVisible.value = true
        menuVisible.value = false
        scheduleBubbleAutoHide()
      } catch (e) {}
    }
  } catch (err) {}
}

onMounted(() => {
  resetIdleTimer()
  initAntigravitySSE()
  syncWindowDimensions()
  triggerReportHitRegionsDelayed()
  setTimeout(syncWindowDimensions, 100)
  setTimeout(reportHitRegions, 500)
  setTimeout(reportHitRegions, 1000)
  window.addEventListener('resize', reportHitRegions)
})

onUnmounted(() => {
  if (idleTimer) clearTimeout(idleTimer)
  if (autoHideBubbleTimer) clearTimeout(autoHideBubbleTimer)
  if (sseSource) sseSource.close()
  window.removeEventListener('resize', reportHitRegions)
})
</script>

<style>
.desktop-pet-app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: transparent !important;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none; /* 整体画布默认穿透，仅子元素响应鼠标 */
}

.pet-anchor {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  user-select: none;
  touch-action: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  pointer-events: auto; /* 仅桌宠自身接收鼠标事件 */
}
</style>
