import express from "express"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("Bot is running ✅")
})

app.listen(PORT, () => {
  console.log("🌐 Server running on port", PORT)
})

console.log("🔥 BOT STARTING...")
console.log("PHONE_NUMBER =", process.env.PHONE_NUMBER)

// ================= COMMAND SYSTEM =================
const commands = new Map()

function addCommand(cmd, handler) {
  commands.set(cmd, handler)
}

// ================= BOT CORE =================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["Render Bot", "Chrome", "1.0.0"]
  })

  // ================= CONNECTION =================
  sock.ev.on("connection.update", async (update) => {
  const { connection } = update

  console.log("📡 State:", connection)

  if (!sock.authState?.creds?.registered) {
    const phone = process.env.PHONE_NUMBER

    if (!phone) {
      console.log("❌ PHONE_NUMBER missing in Render")
      return
    }

    try {
      const code = await sock.requestPairingCode(phone)
      console.log("🔑 PAIRING CODE:", code)
    } catch (err) {
      console.log("❌ Pairing error:", err.message)
    }
  }  

  if (connection === "close") {
    console.log("❌ Disconnected")
  }

    const { connection, lastDisconnect } = update

    if (connection === "connecting") {
      console.log("📡 Connecting...")
    }

    if (connection === "open") {
      console.log("✅ BOT CONNECTED")

      // ===== PAIRING CODE =====
      try {
        if (!sock.authState?.creds?.registered) {
          const phone = process.env.PHONE_NUMBER

          if (!phone) {
            console.log("❌ PHONE_NUMBER missing in Render")
            return
          }

          const code = await sock.requestPairingCode(phone)
          console.log("🔑 PAIRING CODE:", code)
        }
      } catch (e) {
        console.log("❌ Pairing error:", e.message)
      }
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode

      console.log("❌ Disconnected:", reason)

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...")
        startBot()
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)

  // ================= MESSAGE HANDLER =================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    const chat = msg.key.remoteJid
    if (!text) return

    const cmd = text.toLowerCase().split(" ")[0]

    if (commands.has(cmd)) {
      try {
        await commands.get(cmd)(sock, chat, msg, text)
      } catch (e) {
        console.log("Command error:", e.message)
      }
    }
  })

  // ================= COMMANDS =================
  addCommand("hi", async (sock, chat) => {
    await sock.sendMessage(chat, { text: "Hello 👋 I am your bot" })
  })

  addCommand("menu", async (sock, chat) => {
    await sock.sendMessage(chat, {
      text: "📌 MENU:\n- hi\n- menu\n- ping"
    })
  })

  addCommand("ping", async (sock, chat) => {
    await sock.sendMessage(chat, { text: "🏓 Pong!" })
  })

  addCommand("help", async (sock, chat) => {
    await sock.sendMessage(chat, { text: "Type menu to see commands" })
  })

  // 👉 ADD MORE COMMANDS LIKE THIS (UP TO 80+)
}

startBot()
