import React, { useEffect, useState } from "react";
import { Settings2, Save, Check } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { taStyle, btnSubmitStyle } from "../../styles/forms.js";
import { supabase } from "../../lib/supabase.js";

const TEXTAREA_STYLE = {
  ...taStyle,
  minHeight: 360,
  fontFamily: "'SF Mono', 'Monaco', monospace",
  fontSize: 12.5,
  lineHeight: 1.6,
};

function EditableBlock({ title, description, fieldKey, value, onChange, onSave, saving, saved }) {
  return (
    <Card>
      <CardHeader title={title} />
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "-8px 0 14px", lineHeight: 1.6 }}>
        {description}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        style={TEXTAREA_STYLE}
        onFocus={e => e.target.style.borderColor = COLORS.gold}
        onBlur={e => e.target.style.borderColor = COLORS.border}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button
          onClick={() => onSave(fieldKey)}
          disabled={saving}
          style={{ ...btnSubmitStyle, flex: "none", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1 }}
        >
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
    </Card>
  );
}

export function ConfigureSofiaSection() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(null);
  const [savedField, setSavedField] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      // Tabla esperada: sofia_config con una fila única (id = 1) y columnas
      // system_prompt / knowledge_base. Ver nota de implementación al final
      // del archivo para el SQL de creación.
      const { data, error: fetchError } = await supabase
        .from("sofia_config")
        .select("system_prompt, knowledge_base")
        .eq("id", 1)
        .maybeSingle();
      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setSystemPrompt(data.system_prompt || "");
        setKnowledge(data.knowledge_base || "");
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  function handleChange(fieldKey, value) {
    if (fieldKey === "system_prompt") setSystemPrompt(value);
    else setKnowledge(value);
  }

  async function handleSave(fieldKey) {
    setSavingField(fieldKey);
    setSavedField(null);
    const payload = fieldKey === "system_prompt"
      ? { system_prompt: systemPrompt }
      : { knowledge_base: knowledge };
    const { error: saveError } = await supabase
      .from("sofia_config")
      .upsert({ id: 1, ...payload, updated_at: new Date().toISOString() });
    setSavingField(null);
    if (saveError) {
      setError(saveError.message);
    } else {
      setSavedField(fieldKey);
      setTimeout(() => setSavedField(null), 2000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: COLORS.panelAlt, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Settings2 size={18} color={COLORS.gold} />
        </div>
        <p style={{ fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.7, margin: 0 }}>
          Estos cambios se guardan directamente en la base de datos que usa Sofía en WhatsApp. No es necesario tocar código ni volver a desplegar nada — el siguiente mensaje que responda ya va a usar la versión más reciente.
        </p>
      </Card>

      {loading && <p style={{ fontSize: 13.5, color: COLORS.textMuted }}>Cargando configuración...</p>}

      {error && (
        <Card>
          <p style={{ fontSize: 13, color: "#e07070", lineHeight: 1.6, margin: 0 }}>
            No se pudo conectar a la tabla de configuración todavía ({error}). Esto es esperado si la tabla <code>sofia_config</code> aún no existe en Supabase.
          </p>
        </Card>
      )}

      {!loading && (
        <>
          <EditableBlock
            title="Reglas de comportamiento"
            description="Tono, escalamiento, y reglas críticas — lo que define cómo se comporta Sofía."
            fieldKey="system_prompt"
            value={systemPrompt}
            onChange={handleChange}
            onSave={handleSave}
            saving={savingField === "system_prompt"}
            saved={savedField === "system_prompt"}
          />
          <EditableBlock
            title="Base de conocimiento"
            description="Hechos sobre CEC: doctores, procedimientos, paquetes, políticas. Edita aquí cuando haya información nueva o algo cambie."
            fieldKey="knowledge_base"
            value={knowledge}
            onChange={handleChange}
            onSave={handleSave}
            saving={savingField === "knowledge_base"}
            saved={savedField === "knowledge_base"}
          />
        </>
      )}
    </div>
  );
}

// Nota de implementación — SQL para crear la tabla en Supabase:
//
// create table sofia_config (
//   id int primary key default 1,
//   system_prompt text,
//   knowledge_base text,
//   updated_at timestamptz default now(),
//   constraint single_row check (id = 1)
// );
//
// El backend del webhook de WhatsApp debe leer esta misma fila en cada
// mensaje (o cachear con invalidación corta) para armar el prompt completo
// que se envía a Claude.
