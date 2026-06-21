import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { COLORS } from "../../constants/colors.js";

export function PasswordInput({ value, onChange, placeholder, disabled, style, onFocus, onBlur, onKeyDown }) {
  const [show, setShow] = useState(false);
  const {
    margin, marginTop, marginBottom, marginLeft, marginRight,
    animation, transition: _transition, ...inputStyle
  } = style || {};
  const wrapperExtra = { margin, marginTop, marginBottom, marginLeft, marginRight, animation };
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"stretch", ...wrapperExtra }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        style={{ ...inputStyle, paddingRight:38, width:"100%", boxSizing:"border-box" }}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setShow(s => !s)}
        style={{
          position:"absolute", right:10, top:0, bottom:0,
          margin:"auto", height:"fit-content",
          background:"none", border:"none", cursor:"pointer", padding:0,
          color:COLORS.textMuted, display:"flex", alignItems:"center", lineHeight:1,
        }}
      >
        {show ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  );
}
