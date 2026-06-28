import React, { useState, useEffect } from "react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { supabase } from "../../lib/supabase.js";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

const renderAnalysis = (text) => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} style={{ margin: "16px 0 8px", fontSize: 13,
        fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {line.replace(/\*\*/g, '')}
      </p>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <div key={i} style={{ display: "flex", gap: 8,
        marginBottom: 6, alignItems: "flex-start" }}>
        <span style={{ color: COLORS.gold, fontWeight: 700,
          marginTop: 1, flexShrink: 0 }}>✦</span>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.text,
          fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
          {line.replace(/^[-*] /, '')}
        </p>
      </div>;
    }
    if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1];
      return <div key={i} style={{ display: "flex", gap: 10,
        marginBottom: 8, alignItems: "flex-start" }}>
        <span style={{ background: COLORS.green, color: "white",
          borderRadius: "50%", width: 20, height: 20, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0,
          fontFamily: "'Manrope', sans-serif", marginTop: 1 }}>
          {num}
        </span>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.text,
          fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
          {line.replace(/^\d+\. /, '')}
        </p>
      </div>;
    }
    if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
    return <p key={i} style={{ margin: "0 0 8px", fontSize: 13,
      color: COLORS.text, fontFamily: "'Manrope', sans-serif",
      lineHeight: 1.6 }}>{line}</p>;
  });
};

export function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [today, setToday] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sofia_recommendations")
        .select("*")
        .order("date", { ascending: false })
        .limit(7);

      if (error) setError(error.message);
      else {
        setRecommendations(data || []);
        setToday(data?.[0]);
      }
      setLoading(false);
    })();
  }, []);

  const generateAnalysis = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/daily-analysis", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const { data: newData } = await supabase
        .from("sofia_recommendations")
        .select("*")
        .order("date", { ascending: false })
        .limit(7);
      setRecommendations(newData || []);
      setToday(newData?.[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const previous = recommendations.slice(1);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            Análisis de Sofía
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
            Reporte diario generado con datos reales de Meta, Google Ads y Analytics
          </p>
        </div>
        <button
          onClick={generateAnalysis}
          disabled={generating}
          style={{
            background: COLORS.green, color: "white", border: "none",
            borderRadius: 8, padding: "10px 20px", fontSize: 13,
            fontWeight: 600, fontFamily: "'Manrope', sans-serif",
            cursor: generating ? "not-allowed" : "pointer",
            opacity: generating ? 0.7 : 1, flexShrink: 0, marginLeft: 16,
          }}
        >
          {generating ? "Generando..." : "Generar análisis de hoy"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: 8, padding: "10px 14px", fontSize: 13,
          color: "#dc2626", fontFamily: "'Manrope', sans-serif", marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ textAlign: "center", fontSize: 14, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", padding: "40px 0" }}>
          Cargando análisis...
        </p>
      )}

      {/* Análisis de hoy */}
      {!loading && today && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", textTransform: "capitalize" }}>
              {formatDate(today.date)}
            </p>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: "rgba(201,162,78,0.12)", color: COLORS.gold,
              fontFamily: "'Manrope', sans-serif",
            }}>
              Hoy
            </span>
          </div>
          <div>{renderAnalysis(today.analysis)}</div>
        </Card>
      )}

      {/* Sin análisis */}
      {!loading && !today && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 28, color: COLORS.gold, marginBottom: 12 }}>✦</div>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
              Sin análisis todavía
            </p>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
              Haz clic en "Generar análisis de hoy" para que Sofía analice los datos actuales.
            </p>
          </div>
        </Card>
      )}

      {/* Análisis anteriores */}
      {!loading && previous.length > 0 && (
        <>
          <p style={{ margin: "24px 0 12px", fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            Análisis anteriores
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {previous.map((rec) => (
              <Card key={rec.id || rec.date}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", textTransform: "capitalize" }}>
                  {formatDate(rec.date)}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>
                  {rec.analysis?.substring(0, 150)}{rec.analysis?.length > 150 ? "..." : ""}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
