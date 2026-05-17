import express from "express"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (_, res) => {
  res.send("🚀 Pro Bot Running")
})

app.listen(PORT, () => {
  console.log("🌐 Server running on", PORT)
})

// ================= START LOG =================
console.log("🔥 PRO BOT STARTING...")

// ================= ADMIN SYSTEM =================
let ADMIN_LIST = ["2348123456789"]

function isAdmin(jid) {
  return ADMIN_LIST.includes(jid.split("@")[0])
}

// ================= COMMAND SYSTEM =================
const commands = new Map()

function addCommand(cmd, fn, adminOnly = false) {
  commands.set(cmd, { fn, adminOnly })
}

const reply = async (sock, chat, text) => {
  try {
    await sock.sendMessage(chat, { text })
  } catch (e) {
    console.log("Reply error:", e.message)
  }
}

// ================= BOT CORE =================
let running = false

async function startBot() {
  if (running) return
  running = true

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./auth")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["PRO BOT", "Chrome", "1.0.0"]
    })

    // ================= CONNECTION =================
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update

      if (!connection) return
      console.log("📡 Status:", connection)

      if (connection === "open") {
        console.log("✅ PRO BOT ONLINE")
      }

      if (connection === "close") {
        running = false
        const reason = lastDisconnect?.error?.output?.statusCode

        console.log("❌ Disconnected:", reason)

        if (reason !== DisconnectReason.loggedOut) {
          setTimeout(startBot, 5000)
        }
      }
    })

    sock.ev.on("creds.update", saveCreds)

    // ================= MESSAGE HANDLER =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages?.[0]
        if (!msg?.message) return

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text

        if (!text) return

        const chat = msg.key.remoteJid
        const sender = chat
        const cmd = text.toLowerCase().trim().split(" ")[0]

        if (!commands.has(cmd)) return

        const { fn, adminOnly } = commands.get(cmd)

        if (adminOnly && !isAdmin(sender)) {
          return reply(sock, chat, "🚫 Admin only command")
        }

        await fn(sock, chat, msg, text)

      } catch (err) {
        console.log("Message error:", err.message)
      }
    })

    console.log("🤖 BOT READY")

  } catch (err) {
    console.log("❌ Fatal error:", err.message)
    running = false
    setTimeout(startBot, 5000)
  }
}

// ================= PUBLIC COMMANDS =================
addCommand("hi", async (sock, chat) =>
  reply(sock, chat, "👋 Hello!")
)

addCommand("ping", async (sock, chat) =>
  reply(sock, chat, "🏓 Pong!")
)

addCommand("menu", async (sock, chat) =>
  reply(sock, chat, "📌 hi | ping | ai | time | uptime")
)

// ================= SYSTEM =================
addCommand("time", async (sock, chat) =>
  reply(sock, chat, `🕒 ${new Date().toLocaleTimeString()}`)
)

addCommand("uptime", async (sock, chat) =>
  reply(sock, chat, `⏱ ${Math.floor(process.uptime())}s`)
)

// ================= 🤖 AI COMMAND (ADDED HERE) =================
addCommand("ai", async (sock, chat, msg, text) => {
  const prompt = text.split(" ").slice(1).join(" ")

  if (!prompt) {
    return reply(sock, chat, "🤖 Example: ai what is javascript")
  }

  const answers = [
    `🧠 AI Response: ${prompt}`,
    `💡 Thinking about: ${prompt}`,
    `🤖 You asked: ${prompt} — interesting question!`,
    `⚡ AI Mode: ${prompt}`
  ]

  const pick = answers[Math.floor(Math.random() * answers.length)]

  reply(sock, chat, pick)
})

// ================= FUN =================
addCommand("joke", async (sock, chat) => {
  const jokes = [
    "😂 Coding is life",
    "🤣 My code works sometimes",
    "😆 Debugging is fun"
  ]

  reply(sock, chat, jokes[Math.floor(Math.random() * jokes.length)])
})

// ================= START =================
startBot()
