import React, { useState } from "react";
import { Cake, Send } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";

const inputStyle = {
  width: "100%",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontFamily: "'Manrope', sans-serif",
  fontSize: 13.5,
  background: COLORS.inputBg,
  color: COLORS.text,
  outline: "none",
  boxSizing: "border-box",
};

export function BirthdaySection() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok: boolean, message: string }

  async function handleSend() {
    if (!phoneNumber.trim() || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/send-birthday", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setResult({ ok: false, message: data?.error || "No se pudo enviar el mensaje." });
        return;
      }
      setResult({ ok: true, message: "Mensaje de cumpleaños enviado." });
      setPhoneNumber("");
    } catch (e) {
      setResult({ ok: false, message: "Error al conectar con el servidor." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Card style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: COLORS.panelAlt, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Cake size={18} color={COLORS.gold} />
        </div>
        <p style={{ fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.7, margin: 0 }}>
          Envía manualmente un mensaje de cumpleaños por WhatsApp a través de Sofía.
          El texto es fijo (la plantilla no personaliza con el nombre). Requiere que
          la plantilla ya esté aprobada por Meta en Zenvia — mientras tanto este botón
          mostrará un error explicando qué falta.
        </p>
      </Card>

      <Card style={{ maxWidth: 440 }}>
        <CardHeader title="Enviar mensaje de cumpleaños" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>
              Número de WhatsApp
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+506 8888 8888"
              disabled={sending}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = COLORS.gold}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !phoneNumber.trim()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: COLORS.green, color: "#fff", border: "none", borderRadius: 10,
              padding: "11px 16px", fontSize: 13.5, fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              cursor: sending || !phoneNumber.trim() ? "not-allowed" : "pointer",
              opacity: sending || !phoneNumber.trim() ? 0.5 : 1,
            }}
          >
            <Send size={15} />
            {sending ? "Enviando..." : "Enviar mensaje de cumpleaños"}
          </button>

          {result && (
            <p style={{
              fontSize: 12.5, margin: 0, lineHeight: 1.6,
              color: result.ok ? COLORS.green : "#e07070",
            }}>
              {result.ok ? "✓ " : "✗ "}{result.message}
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
