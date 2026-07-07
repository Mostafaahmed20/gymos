import { ENV } from "./env";

function getTelegramEndpoint(method: string) {
  return `https://api.telegram.org/bot${ENV.telegramBotToken}/${method}`;
}

export async function sendTelegramCampaignMessage(payload: {
  title: string;
  message: string;
  chatId?: string;
}) {
  const token = ENV.telegramBotToken;
  const chatId = payload.chatId ?? ENV.telegramDefaultChatId;

  if (!token || !chatId) {
    return { ok: false as const, reason: "missing_config" as const };
  }

  const text = `${payload.title}\n\n${payload.message}`;

  try {
    const response = await fetch(getTelegramEndpoint("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn("[Telegram] Failed to send campaign message", {
        status: response.status,
        body,
      });
      return { ok: false as const, reason: "telegram_api_error" as const };
    }

    return { ok: true as const };
  } catch (error) {
    console.warn("[Telegram] Network error while sending campaign message", error);
    return { ok: false as const, reason: "network_error" as const };
  }
}
