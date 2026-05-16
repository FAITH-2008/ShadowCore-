import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (text) => new Promise(resolve => rl.question(text, resolve))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Render Bot', 'Chrome', '1.0.0']
  })

  // 🔐 PAIRING CODE LOGIN
  if (!sock.authState.creds.registered) {
    const phone = await question('📱 Enter your WhatsApp number (with country code): ')

    const code = await sock.requestPairingCode(phone.trim())
    console.log(`🔑 Your pairing code: ${code}`)
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ Bot is online!')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('❌ Disconnected')

      if (shouldReconnect) startBot()
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // 💬 SIMPLE COMMANDS
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
}

startBot()
