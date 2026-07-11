"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied"
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button className="btn secondary copy-btn" type="button" onClick={handleCopy}>
      {copied ? copiedLabel : label}
    </button>
  );
}
