const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = parseInt(process.env.MY_CHAT_ID);
const TITLE = process.argv[2] || "Grupo de 3 AliExpress";

const BASE = `https://api.telegram.org/bot${TOKEN}`;

async function api(method, body) {
  const res = await fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log("Criando grupo:", TITLE);

  // 1. Create basic group with user
  const created = await api("createNewGroupChat", {
    title: TITLE,
    user_ids: [CHAT_ID],
  });
  console.log("createNewGroupChat:", JSON.stringify(created));

  if (!created.ok) {
    console.error("Falha ao criar grupo:", created.description);
    process.exit(1);
  }

  const groupId = created.result.id;
  console.log("Group ID:", groupId);

  // 2. Generate invite link
  const invite = await api("exportChatInviteLink", { chat_id: groupId });
  console.log("exportChatInviteLink:", JSON.stringify(invite));

  if (invite.ok) {
    console.log("\n=== LINK DO GRUPO ===");
    console.log(invite.result);
    console.log("======================\n");
  }

  // 3. Promote user to admin so they can manage
  const promoted = await api("promoteChatMember", {
    chat_id: groupId,
    user_id: CHAT_ID,
    can_change_info: true,
    can_invite_users: true,
    can_pin_messages: true,
    can_manage_chat: true,
    can_delete_messages: true,
    can_restrict_members: true,
    can_promote_members: false,
  });
  console.log("promoteChatMember:", JSON.stringify(promoted));

  // 4. Make user an owner-level admin
  await api("setChatAdministratorCustomTitle", {
    chat_id: groupId,
    user_id: CHAT_ID,
    custom_title: "Dono",
  });

  // 5. Send confirmation message
  await api("sendMessage", {
    chat_id: groupId,
    text: `Grupo criado! Compartilhe o link:\n${invite.result || "https://t.me/+"}`,
    parse_mode: "HTML",
  });

  console.log("\nGrupo criado com sucesso!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
