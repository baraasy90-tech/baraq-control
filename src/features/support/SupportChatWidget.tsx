import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getErrorMessage } from "@/utils/errors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError("");
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("support-chat", {
        body: { message: text, history: messages },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setMessages([...nextMessages, { role: "assistant", content: data.reply as string }]);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الوصول للمساعد، حاول مجدداً"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[90vw] max-w-sm h-[70vh] max-h-[520px] bg-panel border border-line/60 shadow-xl rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line/60 shrink-0">
            <h3 className="text-sm font-bold text-ink">مساعد الدعم</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none text-lg leading-none"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-xs text-ink-soft text-center mt-6">
                اسألني أي شيء عن استخدام التطبيق — إدارة المراحل، الاستلام، الميزانية، وغيرها.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "self-end bg-ink text-white" : "self-start bg-bg text-ink"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && <div className="self-start bg-bg text-ink-soft rounded-xl px-3 py-2 text-sm">جارٍ الكتابة...</div>}
            {error && <p className="text-xs text-critical text-center">{error}</p>}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-line/60 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="اكتب سؤالك..."
              className="flex-1 px-3 py-2 border border-line rounded-lg text-sm bg-white box-border"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="إرسال"
              className="w-9 h-9 shrink-0 rounded-lg bg-ink text-white border-none cursor-pointer flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="مساعد الدعم"
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-ink text-white border-none shadow-lg cursor-pointer flex items-center justify-center hover:opacity-90"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
