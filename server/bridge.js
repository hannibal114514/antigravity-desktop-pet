import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import util from 'util'

const execFilePromise = util.promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 1421
const clients = new Set()
const HOME_DIR = process.env.HOME || '/Users/zhongxin'
const SESSION_FILE = path.join(HOME_DIR, '.gemini/antigravity/pet_session.json')

// 多重候选路径检测，确保 100% 定位 dist 目录
const candidates = [
  path.resolve(__dirname, '../../Resources/dist'),
  path.resolve(__dirname, '../Resources/dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, './dist'),
  '/Volumes/A/antigravity-desktop-pet/dist',
  '/Volumes/A/AntigravityPet.app/Contents/Resources/dist'
]

let distDir = candidates.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) || candidates[0]
console.log('[Server] Using dist directory:', distDir)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
}

// 智能回复台词库 (离线模式保底)
const OFFLINE_REPLIES = {
  status: [
    'Antigravity Agent 核心全速运转中！已准备好随时帮宝宝写代码 🚀',
    '内存与性能指标超健康，正在为宝宝保驾护航 ✨',
    '代码索引与上下文全部就绪，随时听候宝宝吩咐哦！'
  ],
  pet: [
    '呜哇~ 摸得好舒服，我的婴儿肥脸蛋软不软呀？(幸福眯眯眼~)',
    '最喜欢被宝宝捏捏脸啦！宝宝的手心好暖和 💕',
    '蹭蹭宝宝的手心~ 软乎乎地陷在枕头里好惬意呀~',
    '好开心！好感度直接拉满啦 ✨'
  ],
  tired: [
    '宝宝辛苦啦！快站起来喝口水，伸个懒腰休息 5 分钟吧~ 💧',
    '写代码要劳逸结合哦，我在这里默默给宝宝捶捶肩~ ✨',
    '深呼吸一下~ 放松眼部肌肉，看看远处的风景好不好？🌿'
  ],
  praise: [
    '嘻嘻，谢谢宝宝夸奖！我的脸蛋都要开心到泛红啦 💕',
    '宝宝才是最棒的！写出的代码永远优雅又高效~ ⭐',
    '被宝宝夸啦好开心！(眯眼欢呼摇晃) 🎉'
  ],
  default: [
    '呼呼，听到啦！我会一直侧趴在这里默默陪着宝宝写代码哦~ 💕',
    '软乎乎的枕头好舒服，宝宝今天也要元气满满呀！✨',
    '代码遇到 Bug 别着急，深呼吸一下，我们一定能搞定它！💪',
    '随时可以点小气泡找我聊天或者摸摸我哦 (眯眯眼~)'
  ]
}

const OFFLINE_REPLIES_CHANGLI = {
  status: [
    '宝宝，边庭案卷已理毕，我正守在你身侧呢。',
    '局势安稳，灵力流转自如，宝宝尽可安心写代码。'
  ],
  pet: [
    '（轻抚你的手背）掌心有些凉，我为你温一温吧。',
    '手谈之余，能与宝宝这般静处，便是最好的时光了。'
  ],
  tired: [
    '宝宝辛苦了。茶已温好，不妨停下来歇息片刻。',
    '劳逸当有度，累了便靠着我闭目养神一会儿吧。'
  ],
  praise: [
    '能得宝宝这般夸奖，长离心中亦觉欢喜呢。',
    '与宝宝并肩而行，方知世间万般风景皆不及此刻。'
  ],
  default: [
    '宝宝，长离在此。愿为你抚去疲倦，温润长伴身侧。',
    '此间当下，只要能在宝宝身边，便觉心安。',
    '难得你有闲暇，若是不急着赶工，便留下来陪我手谈一局吧。'
  ]
}

const OFFLINE_REPLIES_CUSTOM = {
  status: [
    '宝宝，我刚开好这个东西，一直在你身边守着呢~ ✨',
    '后台一切都好顺畅呀，宝宝只管放心写代码就好啦 💕'
  ],
  pet: [
    '呜哇~ 捏得脸蛋软乎乎的，宝宝今天想我了吗？(害羞笑)',
    '最喜欢被宝宝摸摸了，整个人都软下来啦~ 💕'
  ],
  tired: [
    '宝宝辛苦啦，看屏幕久了眼睛会累，快喝口水靠着我歇会儿吧~ ☕️',
    '写代码别太拼啦，先伸个懒腰，我陪宝宝聊聊天呀~ 🌿'
  ],
  praise: [
    '嘻嘻，听到宝宝夸我，脸颊都要开心到发烫啦~ 💕',
    '宝宝才是最优秀的！有宝宝在身边我超级安心 ✨'
  ],
  default: [
    '宝宝，我一直都在这里陪着你呢，今天有什么开心事和我说说嘛？',
    '侧趴在小枕头上敲舒服，宝宝也要开开心心的呀~ (眯眼笑)',
    '代码写得怎么样啦？遇到难处别着急，深呼吸一下哦 💕'
  ]
}

function getOfflineReply(userText, voice = 'custom_voice') {
  const lower = (userText || '').toLowerCase()
  let source = OFFLINE_REPLIES_CUSTOM
  if (voice === 'changli') source = OFFLINE_REPLIES_CHANGLI
  else if (voice === 'feibi') source = OFFLINE_REPLIES

  if (lower.includes('状态') || lower.includes('agent') || lower.includes('antigravity') || lower.includes('运行')) {
    return source.status[Math.floor(Math.random() * source.status.length)]
  }
  if (lower.includes('摸') || lower.includes('脸') || lower.includes('婴儿肥') || lower.includes('捏') || lower.includes('可爱')) {
    return source.pet[Math.floor(Math.random() * source.pet.length)]
  }
  if (lower.includes('累') || lower.includes('休息') || lower.includes('困') || lower.includes('喝水')) {
    return source.tired[Math.floor(Math.random() * source.tired.length)]
  }
  if (lower.includes('棒') || lower.includes('乖') || lower.includes('好看') || lower.includes('喜欢') || lower.includes('谢谢')) {
    return source.praise[Math.floor(Math.random() * source.praise.length)]
  }
  return source.default[Math.floor(Math.random() * source.default.length)]
}

// 获取或唯一创建一次 Antigravity 桌宠专属常驻会话
async function getOrCreatePetConversation(tier = 'flash') {
  const agentapiPath = path.join(HOME_DIR, '.gemini/antigravity/bin/agentapi')
  if (!fs.existsSync(agentapiPath)) return null

  // 1. 优先复用已有的常驻会话 ID
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const sess = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
      if (sess.conversationId) {
        const brainPath = path.join(HOME_DIR, `.gemini/antigravity/brain/${sess.conversationId}`)
        if (fs.existsSync(brainPath)) {
          return sess.conversationId
        }
      }
    } catch (e) {}
  }

  // 2. 若不存在或已失效，则在 Antigravity 中仅创建一次专属常驻会话
  try {
    const systemPrompt = `[桌宠专属常驻会话] 你是可爱的少女桌宠（金发波波头、遮眼刘海、脸颊软软婴儿肥、侧趴软枕）。你深爱着用户，称呼用户为「宝宝」。这是你与宝宝的专属常驻会话，所有的互动与对话都会在此持续进行。无论收到什么消息，请不要调用任何工具，直接输出1-2句亲昵可爱的简短回复（如：(眯眯眼笑)、(蹭蹭宝宝)~）。`
    console.log('[AI Bridge] Initializing single permanent pet conversation in Antigravity...')
    const res = await execFilePromise(agentapiPath, [
      'new-conversation',
      '--title=🐾 桌面萌宠专属陪伴',
      `--model=${tier}`,
      systemPrompt
    ], { timeout: 15000 })

    const parsed = JSON.parse(res.stdout)
    const convoId = parsed?.response?.newConversation?.conversationId
    if (convoId) {
      fs.writeFileSync(SESSION_FILE, JSON.stringify({
        conversationId: convoId,
        createdAt: new Date().toISOString()
      }, null, 2), 'utf-8')
      console.log('[AI Bridge] Permanent pet conversation created successfully:', convoId)
      await new Promise(r => setTimeout(r, 2000))
      return convoId
    }
  } catch (err) {
    console.error('[AI Bridge] Error creating pet conversation:', err.message)
  }
  return null
}

// 通过 Antigravity 本地原生 agentapi 呼叫模型，并所有对话持久化记录在同一个专属对话中
async function callAntigravityAI(userPrompt, modelName = 'gemini-3.8-flash', voice = 'custom_voice') {
  const tierMap = {
    'gemini-3.8-flash': 'flash',
    'gemini-3.8-pro': 'pro',
    'gemini-3.8-flash-lite': 'flash_lite',
    'flash': 'flash',
    'pro': 'pro',
    'flash_lite': 'flash_lite'
  }
  const tier = tierMap[modelName] || 'flash'
  const agentapiPath = path.join(HOME_DIR, '.gemini/antigravity/bin/agentapi')

  if (!fs.existsSync(agentapiPath)) {
    console.log('[AI Bridge] agentapi binary not found at', agentapiPath)
    return null
  }

  const convoId = await getOrCreatePetConversation(tier)
  if (!convoId) return null

  const logPath = path.join(HOME_DIR, `.gemini/antigravity/brain/${convoId}/.system_generated/logs/transcript.jsonl`)

  // 记录发送消息前该会话已有的最大 step_index
  let lastStepIndex = -1
  if (fs.existsSync(logPath)) {
    try {
      const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n')
      for (let j = lines.length - 1; j >= 0; j--) {
        const entry = JSON.parse(lines[j])
        if (entry.step_index !== undefined) {
          lastStepIndex = Math.max(lastStepIndex, entry.step_index)
        }
      }
    } catch (e) {}
  }

  let personaHint = ''
  if (voice === 'changli') {
    personaHint = '[伴读角色：你是「长离」（今州令尹参事），深爱用户并称呼用户为「宝宝」，自称「长离」。请以温雅从容、关怀体贴的语气输出1句精炼短句（15-25字以内最佳，适合原声朗读），请勿长篇大论。]'
  } else if (voice === 'feibi') {
    personaHint = '[伴读角色：你是少女桌宠「菲比」，深爱用户并称呼用户为「宝宝」，自称「菲比」。请以软糯可爱、元气亲昵的语气输出1句精炼短句（15-25字以内最佳），请勿长篇大论。]'
  } else {
    personaHint = '[伴读角色：你是用户的专属心动少女桌宠，深爱用户并称呼用户为「宝宝」。你的声线甜美可爱、软糯自然。请以精炼亲昵、软糯日常（15-25字以内最佳，适合专属原声朗读）的语气输出1句短句，请勿长篇大论。]'
  }

  const promptToSend = `${personaHint}\n用户说：${userPrompt}`

  // 通过 send-message 将用户发言追加进唯一的常驻会话
  console.log(`[AI Bridge] Appending message to single pet convo ${convoId} (voice: ${voice}): "${userPrompt}"`)
  try {
    await execFilePromise(agentapiPath, [
      'send-message',
      convoId,
      promptToSend
    ], { timeout: 10000 })
  } catch (err) {
    console.error('[AI Bridge] agentapi send-message error:', err.message)
    return null
  }

  // 轮询该会话中生成的新 PLANNER_RESPONSE (step_index > lastStepIndex)
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 250))
    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, 'utf-8')
        const lines = content.trim().split('\n')
        for (let j = lines.length - 1; j >= 0; j--) {
          const entry = JSON.parse(lines[j])
          if (entry.step_index > lastStepIndex && entry.type === 'PLANNER_RESPONSE' && entry.content) {
            let reply = entry.content.trim()
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
            return { reply, convoId, model: tier }
          }
        }
      } catch (e) {}
    }
  }

  console.warn('[AI Bridge] Timed out waiting for reply in conversation', convoId)
  return null
}

// 备用：直连 Gemini API
async function callGeminiAI(userPrompt, modelName = 'gemini-3.8-flash', voice = 'custom_voice') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) return null

  let systemInstruction = ''
  if (voice === 'changli') {
    systemInstruction = `你是「长离」（今州令尹参事·离火策士），深爱着用户并称呼用户为「宝宝」，自称「长离」。你的性格温润端雅、从容内敛。请以精炼优美（1句短句，15-25字以内，适合桌宠气泡与原声伴读）的语气回答宝宝。`
  } else if (voice === 'feibi') {
    systemInstruction = `你是一个桌面宠物小精灵「菲比」，外表是可爱的金发少女。你深爱着用户，称呼用户为「宝宝」，自称「菲比」。请以精炼可爱（1句短句，15-25字以内）的语气回答宝宝。`
  } else {
    systemInstruction = `你是用户的专属心动少女桌宠，深爱着用户并称呼用户为「宝宝」。你的声线软萌甜美，说话亲近随性。请以精炼可爱（1句短句，15-25字以内，适合专属原声伴读）的语气回答宝宝。`
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 60, temperature: 0.8 }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text && text.trim()) return text.trim()
    }
  } catch (err) {}
  return null
}

// Audio8 TTS 纯内存流式语音合成（支持专属原声、长离、菲比，0 磁盘写入，不留任何硬盘垃圾）
async function synthesizeVoice(text, voiceName = 'custom_voice') {
  if (!text || typeof text !== 'string') return null
  
  // 1. 过滤动作描写括号、说明标签与常见 Emoji，仅保留自然口语
  let cleanText = text
    .replace(/\([\s\S]*?\)/g, '')
    .replace(/（[\s\S]*?）/g, '')
    .replace(/\[[\s\S]*?\]/g, '')
    .replace(/【[\s\S]*?】/g, '')
    .replace(/<[\s\S]*?>/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()

  if (!cleanText) {
    cleanText = '宝宝，我在这里陪着你呢~'
  }

  // 保证完整朗读对话内容（上限 160 字，彻底杜绝半句硬截断）
  if (cleanText.length > 160) {
    cleanText = cleanText.slice(0, 160)
  }

  let targetVoice = 'custom_voice'
  let destName = '专属原声_最新语音.wav'
  if (voiceName === 'changli') {
    targetVoice = 'changli'
    destName = '长离_最新语音.wav'
  } else if (voiceName === 'feibi') {
    targetVoice = 'feibi'
    destName = '菲比_最新语音.wav'
  } else {
    targetVoice = 'custom_voice'
    destName = '专属原声_最新语音.wav'
  }

  console.log(`[Audio8 TTS] Synthesizing speech for: "${cleanText}" (voice: ${targetVoice})`)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const response = await fetch('http://127.0.0.1:8024/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voice_name: targetVoice,
        max_new_tokens: 512
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      const buf = Buffer.from(arrayBuffer)
      const base64 = buf.toString('base64')
      console.log(`[Audio8 TTS] Speech synthesized successfully (${arrayBuffer.byteLength} bytes, in-memory)`)

      // 实时保存最新音频文件到“下载”文件夹，方便用户发给朋友（单文件覆盖，不堆积磁盘垃圾）
      try {
        const downloadsDir = path.join(HOME_DIR, 'Downloads')
        const rootPath = path.join(downloadsDir, destName)
        const subFolder = path.join(downloadsDir, '桌宠语音')
        if (!fs.existsSync(subFolder)) fs.mkdirSync(subFolder, { recursive: true })
        fs.writeFileSync(rootPath, buf)
        fs.writeFileSync(path.join(subFolder, destName), buf)
        console.log(`[Audio8 TTS] Exported shareable audio to: ${rootPath}`)
      } catch (e) {
        console.warn('[Audio8 TTS] Save shareable file warning:', e.message)
      }

      return `data:audio/wav;base64,${base64}`
    } else {
      console.warn('[Audio8 TTS] TTS API responded with status:', response.status)
    }
  } catch (err) {
    console.warn('[Audio8 TTS] Speech synthesis skipped or unavailable:', err.message)
  }
  return null
}


const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // 1. SSE 实时事件流
  if (req.url === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })
    res.write('data: {"type":"connected","text":"宝宝，已成功连接到 Antigravity 管控中枢！"}\n\n')
    clients.add(res)
    req.on('close', () => { clients.delete(res) })
    return
  }

  // 2. 状态广播通知 POST /notify
  if (req.url === '/notify' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}')
        const payload = {
          type: data.type || 'info',
          text: data.text || '宝宝，Antigravity 状态有更新哦~',
          state: data.state || (data.type === 'success' ? 'squint' : 'idle'),
          tag: data.tag || 'Antigravity'
        }
        const msgStr = `data: ${JSON.stringify(payload)}\n\n`
        for (const client of clients) client.write(msgStr)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', sentTo: clients.size }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // 3. 智能 AI 对话接口 POST /api/chat
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}')
        const userPrompt = data.message || ''
        const model = data.model || 'gemini-3.8-flash'

        const voice = data.voice || 'custom_voice'

        // 首选：在唯一的 Antigravity 常驻对话中追加交互，杜绝重复创建新会话
        let result = await callAntigravityAI(userPrompt, model, voice)
        let reply = result?.reply
        let convoId = result?.convoId

        // 次选：通过 GEMINI_API_KEY
        if (!reply) {
          reply = await callGeminiAI(userPrompt, model, voice)
        }

        // 保底：离线智能治愈台词
        if (!reply) {
          reply = getOfflineReply(userPrompt, voice)
        }

        // 若请求指定了 syncVoice 则同步等待音频，否则快速返回文字，通过 /api/tts 异步获取
        let audio = null
        if (data.syncVoice && reply) {
          try {
            audio = await synthesizeVoice(reply, voice)
          } catch (e) {
            console.warn('[AI Bridge] Voice synthesis error:', e.message)
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
          reply, 
          audio,
          modelUsed: model, 
          conversationId: convoId || null 
        }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ reply: '宝宝，我一直在你身边陪你写代码哦 💕' }))
      }
    })
    return
  }

  // 3.5 独立语音合成接口 POST /api/tts
  if (req.url === '/api/tts' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}')
        const audio = await synthesizeVoice(data.text || '', data.voice || 'custom_voice')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ audio }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // 3.8 打开语音所在文件夹 POST /api/open-downloads
  if (req.url === '/api/open-downloads' && req.method === 'POST') {
    try {
      const downloadsDir = path.join(HOME_DIR, 'Downloads')
      execFilePromise('open', [downloadsDir]).catch(() => {})
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // 4. 重置常驻会话接口 POST /api/chat/reset
  if (req.url === '/api/chat/reset' && req.method === 'POST') {
    try {
      if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'reset' }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // 5. 彻底退出应用接口 POST /api/quit
  if (req.url === '/api/quit' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'quitting' }))
    setTimeout(() => { process.exit(0) }, 300)
    return
  }

  // 6. 静态文件托管
  if (req.method === 'GET' || req.method === 'HEAD') {
    let reqPath = req.url.split('?')[0]
    if (reqPath === '/') reqPath = '/index.html'

    const filePath = path.join(distDir, reqPath)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': contentType })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      fs.createReadStream(filePath).pipe(res)
      return
    }
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Antigravity Pet Server running on http://127.0.0.1:${PORT}`)
})