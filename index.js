import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })
 browser: ['Render Bot', 'Chrome', '1.0.0']

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      console.log('📲 Scan QR below:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Bot is online!')
    }

    if (connection === 'close') {
  console.log('❌ Connection closed.')

  const shouldReconnect =
    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

  if (shouldReconnect) {
    console.log('🔄 Reconnecting in 5 seconds...')

    setTimeout(() => {
      startBot()
    }, 5000)
  } else {
    console.log('🚪 Logged out. Scan QR again.')
  }
    
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    const chat = msg.key.remoteJid
    if (!text) return

    const command = text.toLowerCase()

    if (command === 'hi') {
      await sock.sendMessage(chat, { text: 'Hello 👋 I am your bot' })
    }

    if (command === 'menu') {
      await sock.sendMessage(chat, {
        text: '📌 MENU:\n- hi\n- menu\n- ping'
      })
    }

    if (command === 'ping') {
      await sock.sendMessage(chat, { text: '🏓 Pong!' })
    }
  })
}

startBot()
