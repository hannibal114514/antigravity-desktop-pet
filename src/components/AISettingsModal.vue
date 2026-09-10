<template>
  <transition name="modal-fade">
    <div v-if="visible" class="ai-modal-overlay" @click.self="$emit('close')">
      <div class="ai-modal-card" @click.stop>
        <!-- 头部 -->
        <div class="modal-header">
          <div class="header-title">
            <span>🧠 AI 智能大脑与模型设置</span>
          </div>
          <button class="modal-close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- 表单内容 -->
        <div class="modal-body">
          <!-- 开启 AI 对话开关 -->
          <div class="form-row toggle-row">
            <div class="label-box">
              <span class="main-label">开启智能大模型大脑</span>
              <span class="sub-label">启用后将通过大模型生成有灵性的实时对话</span>
            </div>
            <input type="checkbox" v-model="localConfig.enableAI" class="toggle-checkbox" />
          </div>

          <!-- 模型选择 -->
          <div class="form-row">
            <label class="form-label">对话使用的 AI 模型：</label>
            <select v-model="localConfig.model" class="form-select">
              <option v-for="m in AVAILABLE_MODELS" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>

          <!-- API Key 输入框 -->
          <div class="form-row">
            <div class="label-between">
              <label class="form-label">Google Gemini API Key：</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" class="link-btn">免费获取 Key ↗</a>
            </div>
            <div class="input-with-toggle">
              <input 
                :type="showKey ? 'text' : 'password'" 
                v-model="localConfig.apiKey" 
                placeholder="在此粘贴 AI Studio 的 API Key..."
                class="form-input"
              />
              <button class="eye-btn" @click="showKey = !showKey">
                {{ showKey ? '🙈 隐藏' : '👁️ 显示' }}
              </button>
            </div>
            <span class="input-hint">Key 仅保存在本地设备中，绝不上传任何第三方服务器。</span>
          </div>

          <!-- 人设与 System Prompt -->
          <div class="form-row">
            <label class="form-label">角色性格设定 (System Prompt)：</label>
            <textarea 
              v-model="localConfig.systemPrompt" 
              rows="3" 
              class="form-textarea"
              placeholder="设定你想要的性格（默认称呼你为「宝宝」）..."
            ></textarea>
          </div>
        </div>

        <!-- 底部保存按钮 -->
        <div class="modal-footer">
          <button class="save-btn" @click="handleSave">💾 保存配置</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AVAILABLE_MODELS, getStoredAIConfig, saveAIConfig, type AIConfig } from '../utils/ai'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', config: AIConfig): void
}>()

const localConfig = ref<AIConfig>(getStoredAIConfig())
const showKey = ref(false)

watch(() => props.visible, (v) => {
  if (v) {
    localConfig.value = getStoredAIConfig()
  }
})

const handleSave = () => {
  saveAIConfig(localConfig.value)
  emit('saved', localConfig.value)
  emit('close')
}
</script>

<style scoped>
.ai-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 10px;
}

.ai-modal-card {
  width: 320px;
  max-width: 95vw;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.modal-header {
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 12px;
  font-weight: 700;
  color: #2d3436;
}

.modal-close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 10px;
  color: #747d8c;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.modal-close-btn:hover {
  background: #ff4757;
  color: #fff;
}

.modal-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.toggle-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background: #f1f2f6;
  padding: 6px 8px;
  border-radius: 10px;
}

.main-label {
  font-size: 11px;
  font-weight: 700;
  color: #2d3436;
  display: block;
}

.sub-label {
  font-size: 9.5px;
  color: #747d8c;
  display: block;
}

.toggle-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #ff6b81;
  cursor: pointer;
}

.form-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #57606f;
}

.label-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.link-btn {
  font-size: 9.5px;
  color: #ff6b81;
  text-decoration: none;
  font-weight: 600;
}

.form-select {
  width: 100%;
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid #ced6e0;
  font-size: 10.5px;
  background: #fff;
  outline: none;
}

.input-with-toggle {
  display: flex;
  gap: 4px;
}

.form-input {
  flex: 1;
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid #ced6e0;
  font-size: 10.5px;
  outline: none;
}

.eye-btn {
  background: #edf2f7;
  border: 1px solid #ced6e0;
  border-radius: 8px;
  font-size: 9.5px;
  padding: 0 6px;
  cursor: pointer;
}

.input-hint {
  font-size: 9px;
  color: #a4b0be;
}

.form-textarea {
  width: 100%;
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid #ced6e0;
  font-size: 10px;
  line-height: 1.35;
  outline: none;
  resize: none;
}

.modal-footer {
  padding: 8px 14px;
  background: #f8f9fa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.save-btn {
  width: 100%;
  background: #ff6b81;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.save-btn:hover {
  background: #ff4757;
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
</style>
