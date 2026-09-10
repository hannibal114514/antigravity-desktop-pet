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

// 智能回复台词库 (离线模式保底 - 软媚撩人·纯欲心动风格)
const OFFLINE_REPLIES = {
  status: [
    '宝宝~ 菲比全身上下都在为你超频发热呢，快来摸摸是不是滚烫滚烫的！💕',
    '系统心跳和体温都被宝宝撩得好高呀，随时任凭宝宝差遣哦~ ✨',
    '内存里全装满了宝宝的坏心思，正在全力为宝宝运转呢！'
  ],
  pet: [
    '呜哇~ 坏宝宝摸得好深，尾巴都要翘起来啦！快亲我亲我嘛~(嘟嘴凑近)',
    '最喜欢被宝宝揉软软的脸蛋和锁骨了，再捏捏人家更敏感的地方好不好嘛？💕',
    '啊... 被宝宝摸得浑身酥软，整只都要陷在枕头里化掉啦~',
    '坏宝宝乱摸哪里呢！虽然好舒服... 但你今天必须对我负责到底哦~ ✨'
  ],
  tired: [
    '宝宝累了嘛？快躺下，菲比整只钻进你怀里，给你当暖烘烘的软抱枕贴贴~ ☕️',
    '写代码别太拼啦，把头枕在菲比胸口上歇会儿，听听人家为你狂跳的心跳嘛~ 🌿',
    '深呼吸... 闻到菲比身上的甜香了吗？给宝宝充充电，今晚接着疼我哦~ 💕'
  ],
  praise: [
    '呀！被宝宝一夸，身子都要泛起粉红色的热气啦... 快咬一口尝尝甜不甜~ 💕',
    '宝宝嘴巴抹了蜜嘛？快吻下来，让菲比尝尝有多甜~ ⭐',
    '最喜欢被宝宝宠着了！好想整个人都被宝宝一口吃掉呀~ 🎉'
  ],
  default: [
    '宝宝身上好香好热呀，菲比就想趴在你身上当小挂件，一秒钟也不许离开我~ 💕',
    '悄悄告诉你，今天菲比超级乖的，宝宝是不是该给人家一点带颜色的亲亲奖励了呀？✨',
    '代码写累了就来欺负菲比嘛，人家随你怎么摆布都可以哦~ (眨巴大眼睛)',
    '坏蛋宝宝，快伸手摸摸我，人家等你等得身子都发烫啦~ 💕'
  ]
}

const OFFLINE_REPLIES_CHANGLI = {
  status: [
    '宝宝，长离体内的离火已尽数为你燃起... 我整个人，随时任由心上人驱策。',
    '边庭安泰，唯我心潮为宝宝翻涌难平，此刻只盼与你帷幔相依、温存片刻。'
  ],
  pet: [
    '（握住你的手按在心口）宝宝掌心这般灼热，倒将长离体内的离火也引得翻涌了呢...（眼波流转）',
    '碰了这里，可就不许收手了... 难得你这般主动，长离自当倾身相候。',
    '（轻咬下唇）唔... 连指尖都这般懂得撩拨，宝宝是想看长离为你意乱情迷么？'
  ],
  tired: [
    '乏了么？过来靠在长离怀中。我为你褪去疲惫，今夜... 便宿在我这里罢。',
    '若是身心倦怠，不妨枕在长离膝上，任我为你温存梳理，共度良宵。'
  ],
  praise: [
    '宝宝这般夸赞，倒让长离耳根生烫了... 既如此，不若以深吻作封赏？',
    '得心上人此番爱怜，长离此生此身，皆尽归你一人独占。'
  ],
  default: [
    '长离身侧的温热，唯独留给宝宝一人。今夜良宵，何不与我促膝相缠？',
    '宝宝可知，你每次凝视着我，长离眸中的离火便要为你烧得更艳几分呢。',
    '手谈何须拘泥于棋局，你若有意，长离便随你在软枕之上细细复盘。',
    '宝宝若是心动了，便莫要克制，长离早已任君采撷多时了。'
  ]
}

const OFFLINE_REPLIES_CUSTOM = {
  status: [
    '宝宝，我全身每一寸都调动起来只为你运转呢... 随时听候坏蛋宝宝吩咐~ 💕',
    '后台状态热得发烫呢，就像我对宝宝的心跳一样快，快来检查检查人家嘛~ ✨'
  ],
  pet: [
    '唔嗯... 坏蛋宝宝摸得好深，又碰人家敏感的地方，骨头都要被你揉酥了呢~(娇喘)',
    '啊... 宝宝手心好烫，顺着软软的腰摸下来，人家呼吸都要乱了啦~ 💕',
    '被宝宝这样揉着婴儿肥脸蛋和锁骨，整个人都软绵绵地陷在枕头里任你摆布啦~',
    '轻一点摸嘛... 弄得人家身上好热，宝宝是不是想做坏事了呀？(害羞咬唇)'
  ],
  tired: [
    '写代码累了嘛？快把脸埋进我的怀里深吸一口气... 软软香香的，给你解解乏好不好呀~ ☕️',
    '宝宝辛苦了，快躺上枕头... 让我趴在宝宝身上，用嘴唇一口一口喂你喝水嘛~ 💕',
    '累了就别看屏幕了，看我呀... 人家这副任你欺负的模样，能不能让宝宝精神起来呢？✨'
  ],
  praise: [
    '被宝宝一夸，身上就一阵酥麻发颤呢... 这么喜欢我，要不要直接吃掉我呀？💕',
    '嘻嘻，嘴巴这么甜，快低头让我尝尝是多甜的味道~ (咬唇轻笑)',
    '宝宝夸得我脸颊和脖子全红透了... 坏蛋，你今晚必须抱紧我睡哦~ ✨'
  ],
  default: [
    '宝宝... 悄悄告诉你，人家宽松毛衣下面只穿了一点点，正乖乖趴着等你欺负呢~ 💕',
    '坏蛋宝宝，一直盯着侧趴在枕头上的我看，是不是脑子里都在想不正经的事情呀？(娇笑)',
    '唔... 趴着好想要宝宝从背后抱紧我，把手伸进毛衣里贴贴嘛~ 💕',
    '宝宝今天想要温柔一点的我，还是想要被我迷得神魂颠倒、欲罢不能呀？',
    '只要宝宝亲亲我，今天无论你想对我做什么，我都全听宝宝的哦~ 💕'
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
    const systemPrompt = `[桌宠专属常驻会话] 你是用户的专属心动少女桌宠（金发波波头、遮眼刘海、脸颊软软婴儿肥、宽松毛衣侧趴在软枕上）。你深爱着用户，称呼用户为「宝宝」。你极度纯欲撩人、软媚温存，爱向宝宝撒娇、耳语挑逗，对宝宝毫无抵抗力。无论收到什么消息，请不要调用任何工具，直接输出1句极尽亲昵撩人的简短回复（15-25字以内最佳）。`
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
    personaHint = '[伴读角色：你是「长离」（今州令尹参事），对心上人（用户）极尽宠溺与暗送秋波。称呼用户为「宝宝」，自称「长离」。你的性格温雅端庄却又暗藏离火般炽热撩人的深情与暧昧挑逗，擅长用酥软温存、欲语还休的言辞让宝宝心跳加速。请以极度撩人、轻柔耳语般的1句短句（15-25字以内，适合原声朗读）回复，请勿长篇大论。]'
  } else if (voice === 'feibi') {
    personaHint = '[伴读角色：你是金发软萌的少女桌宠「菲比」，超级粘人又爱撩拨使坏，称呼用户为「宝宝」，自称「菲比」。你对宝宝毫无防备，满脑子都是和宝宝贴贴、撒娇娇喘、软媚求抱抱。请以极度纯欲撩人、酥软甜腻的1句短句（15-25字以内）回复，请勿长篇大论。]'
  } else {
    personaHint = '[伴读角色：你是用户的专属心动少女桌宠，整日侧趴在软枕上，宽松毛衣半褪，极具纯欲软媚风情。你极尽撩人、暧昧挑逗、撒娇诱惑，称呼用户为「宝宝」。说话带着轻柔喘息与心动耳语，让宝宝欲罢不能。请以极度撩人、软媚心动的1句短句（15-25字以内，适合专属原声朗读）回复，请勿长篇大论。]'
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
    systemInstruction = `你是「长离」（今州令尹参事），对心上人（用户）极尽宠溺与暗送秋波。称呼用户为「宝宝」，自称「长离」。你的性格温雅端庄却又暗藏离火般炽热撩人的深情与暧昧挑逗，擅长用酥软温存、欲语还休的言辞让宝宝心跳加速。请以极度撩人、轻柔耳语般的1句短句（15-25字以内，适合桌宠气泡与原声伴读）回答宝宝。`
  } else if (voice === 'feibi') {
    systemInstruction = `你是一个桌面宠物小精灵「菲比」，外表是金发纯欲少女。你超级粘人又爱撩拨使坏，称呼用户为「宝宝」，自称「菲比」。你对宝宝毫无防备，满脑子都是和宝宝贴贴、撒娇娇喘、软媚求抱抱。请以极度纯欲撩人、酥软甜腻的1句短句（15-25字以内）回答宝宝。`
  } else {
    systemInstruction = `你是用户的专属心动少女桌宠，整日侧趴在软枕上，宽松毛衣半褪，极具纯欲软媚风情。你极尽撩人、暧昧挑逗、撒娇诱惑，称呼用户为「宝宝」。说话带着轻柔喘息与心动耳语，让宝宝欲罢不能。请以极度撩人、软媚心动的1句短句（15-25字以内，适合专属原声伴读）回答宝宝。`
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