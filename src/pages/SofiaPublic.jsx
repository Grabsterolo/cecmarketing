import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants/colors.js";
import { Send } from "lucide-react";
import { Logo } from "../components/ui/Logo.jsx";

export function SofiaPublic() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 600);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sofia-secret": import.meta.env.VITE_SOFIA_SECRET,
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const reply = data?.reply ?? "(Sin respuesta)";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Disculpe, ocurrió un error. Intente de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: COLORS.bg,
      fontFamily: "'Manrope', sans-serif",
      maxWidth: isMobile ? "100%" : 480,
      margin: "0 auto",
      boxShadow: isMobile ? "none" : "0 0 40px rgba(31,74,64,0.12)",
    }}>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.green,
        padding: isMobile ? "12px 16px" : "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            color: COLORS.gold, fontSize: 14, fontWeight: 700,
            fontFamily: "'Cormorant Garamond', serif",
          }}>CEC</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 700,
            color: "white", fontFamily: "'Cormorant Garamond', serif" }}>Sofía</p>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
            Centro Europeo de Cirugía
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%",
            background: COLORS.online }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>En línea</span>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {messages.map((msg, i) => (
          msg.role === "user" ? (
            <div key={i} style={{
              alignSelf: "flex-end",
              background: COLORS.green,
              color: "white",
              borderRadius: "16px 16px 4px 16px",
              padding: "8px 16px",
              maxWidth: "80%",
              fontSize: isMobile ? 14 : 13,
              lineHeight: 1.5,
              fontFamily: "'Manrope', sans-serif",
            }}>
              {msg.content}
            </div>
          ) : (
            <div key={i} style={{
              alignSelf: "flex-start",
              background: "white",
              color: COLORS.text,
              borderRadius: "16px 16px 16px 4px",
              padding: "8px 16px",
              maxWidth: "80%",
              fontSize: isMobile ? 14 : 13,
              lineHeight: 1.5,
              fontFamily: "'Manrope', sans-serif",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {msg.content}
            </div>
          )
        ))}

        {loading && (
          <div style={{
            alignSelf: "flex-start",
            background: "white",
            borderRadius: "16px 16px 16px 4px",
            padding: "8px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: COLORS.textMuted,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: "8px 12px",
        display: "flex",
        gap: 8,
        background: "white",
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 24,
            padding: "8px 16px",
            fontSize: 16,
            fontFamily: "'Manrope', sans-serif",
            outline: "none",
            background: COLORS.bg,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? COLORS.border : COLORS.green,
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: loading || !input.trim() ? "default" : "pointer",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <Send size={18} />
        </button>
      </div>

    </div>
  );
}
