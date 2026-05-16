import venom from "venom-bot";

venom
  .create({
    session: "my-session",
    multidevice: true
  })
  .then((client) => start(client))
  .catch((err) => console.log(err));

function start(client) {
  console.log("Bot is online ✅");

  client.onMessage(async (message) => {
    if (!message.body) return;

    const text = message.body.toLowerCase();

    if (text === "hi") {
      await client.sendText(message.from, "Hello 👋 I am your bot");
    }

    if (text === "menu") {
      await client.sendText(
        message.from,
        "📌 MENU:\n- hi\n- menu\n- ping"
      );
    }

    if (text === "ping") {
      await client.sendText(message.from, "🏓 Pong!");
    }
  });
  }
