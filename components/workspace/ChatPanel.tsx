"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; provider?: string; model?: string; }

export function ChatPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: "Hi! Describe what you'd like to build or change, and I'll help you refine the app." }]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput(""); setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.body) return;
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let content = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "message") {
              content = String(ev.content ?? "");
              setMessages(prev => {
                const next = [...prev];
                if (next[next.length - 1]?.role === "assistant" && next.length > 1) {
                  next[next.length - 1] = { role: "assistant", content, provider: ev.provider, model: ev.model };
                } else { next.push({ role: "assistant", content, provider: ev.provider, model: ev.model }); }
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5 flex items-center gap-2">
        <Bot className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium">Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-violet-400" /></div>}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : "bg-white/5 text-white/80 rounded-bl-sm"}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.provider && <p className="text-xs opacity-40 mt-1">{m.provider}/{m.model}</p>}
            </div>
            {m.role === "user" && <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5"><User className="w-3.5 h-3.5 text-white/60" /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-violet-400 animate-pulse" /></div>
          <div className="bg-white/5 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-white/40 animate-pulse">Thinking…</div></div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/5 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask for changes…" disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors flex items-center justify-center">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
