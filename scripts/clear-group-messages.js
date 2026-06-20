const token = process.env.SHOPEE_TELEGRAM_BOT_TOKEN;
const chatId = process.env.SHOPEE_TELEGRAM_CHAT_ID;
const aliChatId = process.env.ALIEXPRESS_TELEGRAM_CHAT_ID;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteMessage(chat, msgId) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/deleteMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, message_id: msgId }),
      }
    );
    const text = await res.text();
    return { ok: res.ok, msgId, error: res.ok ? null : text };
  } catch (err) {
    return { ok: false, msgId, error: err.message };
  }
}

async function getUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=100`,
      { method: "GET" }
    );
    const data = await res.json();
    return data.ok ? data.result : [];
  } catch {
    return [];
  }
}

async function main() {
  const targets = process.argv[2];
  if (!process.argv.includes("--confirm")) {
    throw new Error("Limpeza cancelada. Informe --confirm explicitamente.");
  }
  let deleteList = [];

  if (targets === "--all") {
    const updates = await getUpdates();
    const channelUpdates = updates.filter((u) => {
      const chat = u.channel_post?.chat || u.message?.chat;
      return chat && (chat.id.toString() === chatId || chat.username === chatId?.replace("@", ""));
    });
    for (const u of channelUpdates) {
      const msgId = u.channel_post?.message_id || u.message?.message_id;
      if (msgId) deleteList.push(msgId);
    }
    if (deleteList.length === 0) throw new Error("Nenhuma mensagem encontrada via getUpdates.");
  } else {
    throw new Error("Use --all --confirm. IDs fixos nao sao aceitos.");
  }

  deleteList = [...new Set(deleteList)].sort((a, b) => b - a);

  console.log(`Apagando ${deleteList.length} mensagens do chat ${chatId}...`);
  for (const msgId of deleteList) {
    const result = await deleteMessage(chatId, msgId);
    if (result.ok) {
      console.log(`  OK messageId ${msgId}`);
    } else {
      console.log(`  FAIL messageId ${msgId}: ${result.error?.slice(0, 80)}`);
    }
    await sleep(500);
  }

  if (aliChatId) {
    console.log(`\nVerificando grupo AliExpress (${aliChatId})...`);
    const updates = await getUpdates();
    const aliUpdates = updates.filter((u) => {
      const chat = u.channel_post?.chat || u.message?.chat;
      return chat && chat.id.toString() === aliChatId;
    });
    const aliIds = [...new Set(aliUpdates.map((u) => u.channel_post?.message_id || u.message?.message_id).filter(Boolean))].sort((a, b) => b - a);
    if (aliIds.length) {
      console.log(`Apagando ${aliIds.length} mensagens do grupo AliExpress...`);
      for (const msgId of aliIds) {
        const result = await deleteMessage(aliChatId, msgId);
        if (result.ok) {
          console.log(`  OK messageId ${msgId}`);
        } else {
          console.log(`  FAIL messageId ${msgId}: ${result.error?.slice(0, 80)}`);
        }
        await sleep(500);
      }
    } else {
      console.log("Nenhuma mensagem encontrada no grupo AliExpress.");
    }
  }

  console.log("\nLimpeza concluida.");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
