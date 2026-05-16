import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

console.log("🔥 SERVER STARTED")
console.log("PHONE_NUMBER =", process.env.PHONE_NUMBER)

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Render Bot', 'Chrome', '1.0.0']
    })

    // 📡 CONNECTION HANDLER (ONLY ONE)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update

      if (connection === 'connecting') {
        console.log("📡 Connecting to WhatsApp...")
      }

      if (connection === 'open') {
        console.log("✅ Bot is ONLINE")

        // 🔐 Pairing code ONLY ON FIRST LOGIN
        if (!sock.authState.creds.registered) {
          const phoneNumber = process.env.PHONE_NUMBER

          if (!phoneNumber) {
            console.log("❌ PHONE_NUMBER not set in Render")
            return
          }

          try {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log("🔑 PAIRING CODE:", code)
          } catch (err) {
            console.log("❌ Pairing error:", err.message)
          }
        }
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode

        console.log("❌ Disconnected. Reason:", reason)

        const shouldReconnect = reason !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log("🔄 Reconnecting...")
          startBot()
        }
      }
    })

    sock.ev.on('creds.update', saveCreds)

    // 💬 MESSAGES
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0]
      if (!msg.message) return

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text

      const chat = msg.key.remoteJid
      if (!text) return

      const cmd = text.toLowerCase()

      if (cmd === 'hi') {
        await sock.sendMessage(chat, { text: 'Hello 👋 I am your bot' })
      }

      if (cmd === 'menu') {
        await sock.sendMessage(chat, {
          text: '📌 MENU:\n- hi\n- menu\n- ping'
        })
      }

      if (cmd === 'ping') {
        await sock.sendMessage(chat, { text: '🏓 Pong!' })
      }
    })

  } catch (err) {
    console.log("❌ Crash:", err.message)
  }
}

startBot()
