import React from "react";
import { Button } from "@mui/material";

const copyToClipboard = async (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall back
    }
  }
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
};

type Props = {
  handles: string[];
  label?: string;
};

const CopyButton: React.FC<Props> = ({ handles, label = "Copy" }) => {
  const onCopy = () => copyToClipboard(handles.map((h) => `@${h}`).join("\n"));
  return (
    <Button variant="outlined" size="small" onClick={onCopy} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
      {label}
    </Button>
  );
};

export default CopyButton;
