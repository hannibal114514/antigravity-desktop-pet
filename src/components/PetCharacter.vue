<template>
  <div 
    class="pet-character-container"
    :class="{ 
      'is-sleeping': currentVisualState === 'sleep',
      'is-squint': currentVisualState === 'squint'
    }"
    :style="containerStyle"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onContextMenu"
  >
    <!-- 粒子特效容器 -->
    <div class="particles-layer">
      <div 
        v-for="p in activeParticles" 
        :key="p.id"
        class="floating-particle"
        :style="{
          left: `${p.x}px`,
          top: `${p.y}px`,
          transform: `scale(${p.scale}) rotate(${p.rotation}deg)`,
          opacity: p.opacity
        }"
      >
        {{ p.text }}
      </div>
    </div>

    <!-- 呼吸与角色主体 -->
    <div class="character-wrapper" :style="breathingStyle">
      <!-- 阴影层 -->
      <div class="pillow-shadow"></div>

      <!-- 角色贴图 -->
      <div class="sprite-box">
        <img 
          :src="currentImageSrc" 
          alt="Antigravity Desktop Pet" 
          class="pet-sprite"
          :class="{ 'blush-glow': currentVisualState === 'squint' }"
          draggable="false"
          @load="$emit('sprite-loaded')"
        />
      </div>

      <!-- 睡眠 Zzz 动效 -->
      <div v-if="currentVisualState === 'sleep'" class="sleep-zzz-layer">
        <span class="zzz z1">Z</span>
        <span class="zzz z2">z</span>
        <span class="zzz z3">z</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sound } from '../utils/audio'
import { createParticleBurst, type Particle } from '../utils/particles'

export type PetState = 'idle' | 'squint' | 'sleep'

const props = defineProps<{
  state: PetState
  scale: number
  opacity: number
}>()

const emit = defineEmits<{
  (e: 'update:state', newState: PetState): void
  (e: 'pet'): void
  (e: 'contextmenu', mousePos: { x: number; y: number }): void
  (e: 'drag-move', delta: { dx: number; dy: number }): void
  (e: 'sprite-loaded'): void
}>()

// 贴图路径
import { petIdle, petSquint, petSleep } from '../assets/sprites'

const SPRITES = {
  idle: petIdle,
  squint: petSquint,
  sleep: petSleep
}

// 内部交互状态
const isBlinking = ref(false)
const isPetting = ref(false)
const activeParticles = ref<Particle[]>([])

// 呼吸浮动动画计时器
const breatheTime = ref(0)
let animationFrameId: number | null = null

// 计算当前渲染的图像
const currentVisualState = computed(() => {
  if (props.state === 'sleep') return 'sleep'
  if (isBlinking.value) return 'sleep'
  if (props.state === 'squint' || isPetting.value) return 'squint'
  return 'idle'
})

const currentImageSrc = computed(() => SPRITES[currentVisualState.value])

// 呼吸起伏样式
const breathingStyle = computed(() => {
  if (props.state === 'sleep') {
    const dy = Math.sin(breatheTime.value * 1.2) * 1.8
    const scaleY = 1 + Math.sin(breatheTime.value * 1.2) * 0.012
    return {
      transform: `translateY(${dy}px) scaleY(${scaleY})`
    }
  } else if (currentVisualState.value === 'squint') {
    const dy = Math.sin(breatheTime.value * 4) * 1.2 - 1.5
    return {
      transform: `translateY(${dy}px) scale(1.02)`
    }
  } else {
    const dy = Math.sin(breatheTime.value * 2.2) * 1.5
    const scaleY = 1 + Math.sin(breatheTime.value * 2.2) * 0.01
    return {
      transform: `translateY(${dy}px) scaleY(${scaleY})`
    }
  }
})

const containerStyle = computed(() => ({
  transform: `scale(${props.scale})`,
  opacity: props.opacity
}))

// 动画主循环
const animate = () => {
  breatheTime.value += 0.03
  
  if (activeParticles.value.length > 0) {
    activeParticles.value = activeParticles.value
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy * 0.96 - 0.15,
        opacity: p.opacity - 0.025,
        scale: p.scale * 0.98
      }))
      .filter(p => p.opacity > 0)
  }

  animationFrameId = requestAnimationFrame(animate)
}

// 眨眼定时器
let blinkTimer: any = null
const scheduleNextBlink = () => {
  const nextInterval = 3500 + Math.random() * 4500
  blinkTimer = setTimeout(() => {
    if (props.state !== 'sleep') {
      isBlinking.value = true
      setTimeout(() => {
        isBlinking.value = false
        if (Math.random() < 0.2) {
          setTimeout(() => {
            isBlinking.value = true
            setTimeout(() => {
              isBlinking.value = false
            }, 90)
          }, 140)
        }
      }, 110)
    }
    scheduleNextBlink()
  }, nextInterval)
}

// 拖拽与点击处理（区分短按点击和长按拖拽）
let petTimeout: any = null

const onMouseDown = (evt: MouseEvent) => {
  if (evt.button === 2) return // 右键忽略

  let startScreenX = evt.screenX
  let startScreenY = evt.screenY
  let hasMoved = false

  const onMouseMove = (moveEvt: MouseEvent) => {
    const dx = moveEvt.screenX - startScreenX
    const dy = moveEvt.screenY - startScreenY
    
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasMoved = true
      startScreenX = moveEvt.screenX
      startScreenY = moveEvt.screenY
      emit('drag-move', { dx, dy })
    }
  }

  const onMouseUp = (upEvt: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    // 如果几乎没有移动，则视为点击摸摸
    if (!hasMoved) {
      if (props.state === 'sleep') {
        emit('update:state', 'idle')
        sound.playWakeUp()
        return
      }

      isPetting.value = true
      sound.playSquint()
      emit('pet')

      const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect()
      const localX = upEvt.clientX - rect.left
      const localY = upEvt.clientY - rect.top
      const newParticles = createParticleBurst(localX, localY, 6)
      activeParticles.value.push(...newParticles)

      clearTimeout(petTimeout)
      petTimeout = setTimeout(() => {
        isPetting.value = false
      }, 1800)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onContextMenu = (evt: MouseEvent) => {
  emit('contextmenu', { x: evt.clientX, y: evt.clientY })
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(animate)
  scheduleNextBlink()
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (blinkTimer) clearTimeout(blinkTimer)
  if (petTimeout) clearTimeout(petTimeout)
})
</script>

<style scoped>
.pet-character-container {
  position: relative;
  display: inline-block;
  cursor: grab;
  transform-origin: bottom center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.pet-character-container:active {
  cursor: grabbing;
}

.character-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  will-change: transform;
}

/* 基础宽度缩小至 190px（更小巧迷你） */
.sprite-box {
  position: relative;
  width: 190px;
  height: auto;
  pointer-events: auto;
}

.pet-sprite {
  width: 100%;
  height: auto;
  display: block;
  user-select: none;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.16));
  transition: filter 0.3s ease;
}

.pet-sprite.blush-glow {
  filter: drop-shadow(0 8px 16px rgba(255, 107, 129, 0.35)) brightness(1.03);
}

.pillow-shadow {
  position: absolute;
  bottom: 0;
  left: 5%;
  width: 90%;
  height: 10px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.particles-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

.floating-particle {
  position: absolute;
  font-size: 15px;
  pointer-events: none;
  transition: transform 0.05s linear;
}

.sleep-zzz-layer {
  position: absolute;
  top: 5%;
  right: 12%;
  pointer-events: none;
  display: flex;
  gap: 3px;
}

.zzz {
  font-family: 'Comic Sans MS', cursive, sans-serif;
  font-weight: bold;
  color: #70a1ff;
  opacity: 0;
  animation: floatZzz 2.4s infinite ease-in-out;
}

.z1 { font-size: 12px; animation-delay: 0s; }
.z2 { font-size: 15px; animation-delay: 0.6s; }
.z3 { font-size: 19px; animation-delay: 1.2s; }

@keyframes floatZzz {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  30% { opacity: 0.9; }
  80% { transform: translate(14px, -24px) scale(1.1); opacity: 0.8; }
  100% { transform: translate(20px, -36px) scale(1.3); opacity: 0; }
}
</style>
