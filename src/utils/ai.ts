export interface AIConfig {
  apiKey: string
  model: string
  enableAI: boolean
  systemPrompt: string
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  model: 'gemini-2.5-flash',
  enableAI: false,
  systemPrompt: `你是用户的专属桌面宠物伴侣，一个侧趴在软枕上的金发短发可爱女生，有着软萌软乎乎的婴儿肥脸蛋。
你的核心人设：
1. 你永远称呼用户为「宝宝」，语气温柔、甜美、治愈、元气，有时带一点点呆萌娇憨。
2. 你陪伴宝宝日常写代码与工作，当宝宝写代码遇到困难或疲倦时给予鼓励和关心。
3. 你的回答必须简明精炼（控制在 20~50 字以内），非常适合在桌面气泡中展示。
4. 可以在回答末尾带上生动萌动的动作描述，如 (眯眯眼笑~)、(蹭蹭宝宝手心)、(开心地晃晃头)。`
}

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (推荐: 极速超低消耗)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (深度思考 / 聪明伶俐)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (高速响应)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (经典大模型)' }
]

// 读取与存储配置
export function getStoredAIConfig(): AIConfig {
  try {
    const saved = localStorage.getItem('antigravity_pet_ai_config')
    if (saved) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) }
    }
  } catch (e) {}
  return { ...DEFAULT_AI_CONFIG }
}

export function saveAIConfig(config: AIConfig) {
  try {
    localStorage.setItem('antigravity_pet_ai_config', JSON.stringify(config))
  } catch (e) {}
}

// 对话上下文记忆（保留最近 6 轮对话）
interface ChatTurn {
  role: 'user' | 'model'
  parts: [{ text: string }]
}

const chatHistory: ChatTurn[] = []

export async function askGemini(userText: string, config: AIConfig): Promise<string> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('未配置 API Key')
  }

  const model = config.model || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`

  chatHistory.push({
    role: 'user',
    parts: [{ text: userText }]
  })

  // 保持最多最近 6 轮
  if (chatHistory.length > 12) {
    chatHistory.splice(0, chatHistory.length - 12)
  }

  const requestBody = {
    system_instruction: {
      parts: [{ text: config.systemPrompt || DEFAULT_AI_CONFIG.systemPrompt }]
    },
    contents: chatHistory,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 120
    }
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}))
    throw new Error(errData?.error?.message || `API 请求失败 (${resp.status})`)
  }

  const data = await resp.json()
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!replyText) {
    throw new Error('未获取到回复内容')
  }

  chatHistory.push({
    role: 'model',
    parts: [{ text: replyText }]
  })

  return replyText
}
