"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  ts: number;
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Msg[]>([{
    role: "assistant",
    content: "Hi! Describe what you'd like to build or change, and I'll help you refine the app.",
    ts: Date.now(),
  }]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: userMsg, ts: Date.now() }]);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.body) return;

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let content   = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "message") {
              content = String(ev.content ?? "");
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && next.length > 1) {
                  next[next.length - 1] = { role: "assistant", content, provider: ev.provider, model: ev.model, ts: last.ts };
                } else {
                  next.push({ role: "assistant", content, provider: ev.provider, model: ev.model, ts: Date.now() });
                }
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2 shrink-0 bg-[#0c0c14]">
        <Bot className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-sm font-medium">Chat</span>
        <span className="ml-auto text-[10px] text-white/20">{messages.length - 1} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-violet-400" />
              </div>
            )}
            <div className="max-w-[88%] space-y-1">
              <div className={`px-3 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bubble-user" : "bubble-assistant"
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              <div className={`flex items-center gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] text-white/15">{timeLabel(m.ts)}</span>
                {m.provider && (
                  <span className="text-[10px] text-white/15 font-mono">{m.provider}/{m.model}</span>
                )}
              </div>
            </div>
            {m.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-white/40" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-violet-400 animate-pulse" />
            </div>
            <div className="bubble-assistant px-3 py-2 flex items-center gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.05] flex gap-2 bg-[#0c0c14]">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask for changes…"
          disabled={loading}
          className="input-base text-sm py-2 flex-1"
        />
        <button onClick={send} disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-35 transition-all flex items-center justify-center shadow-sm shadow-violet-500/20 shrink-0">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
