interface Message { role: "user" | "assistant"; content: string }

/** Keep recent context within both the Edge function's character and UTF-8 body limits. */
export function supportRequest(message: string, messages: Message[]) {
  const history = messages.slice(-10).map(entry => ({ ...entry, content: entry.content.slice(0, 4000) })).filter(entry => entry.content.trim());
  const body = { message, history };
  const encoder = new TextEncoder();
  while (history.length && (
    history.reduce((count, entry) => count + entry.content.length, message.length) > 16000 ||
    encoder.encode(JSON.stringify(body)).byteLength > 32768
  )) history.shift();
  return body;
}
