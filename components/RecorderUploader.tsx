"use client";

import { useRef, useState } from "react";

type ClientOption = { id: string; name: string };

export function RecorderUploader({ clients }: { clients: ClientOption[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("Client meeting");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    recorder.ondataavailable = (event) => chunks.current.push(event.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setFile(new File([blob], `${Date.now()}-meeting.webm`, { type: "audio/webm" }));
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  async function uploadAndAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setStatus("Please select or record an audio file first.");
    setStatus("Uploading and analyzing meeting...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);
    formData.append("title", title);

    const res = await fetch("/clientpilotai/api/ai/transcribe", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error || "Upload failed.");
    setStatus(`Done. Meeting saved: ${json.meetingId}`);
  }

  return (
    <form className="form recorder" onSubmit={uploadAndAnalyze}>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" />
      <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
        {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select>
      <input className="input" type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!recording ? <button className="btn secondary" type="button" onClick={startRecording}>Record Audio</button> : null}
        {recording ? <button className="btn secondary" type="button" onClick={stopRecording}>Stop Recording</button> : null}
        <button className="btn gold" type="submit">Transcribe + Create Follow-Up</button>
      </div>
      {file ? <p className="muted">Selected: {file.name}</p> : null}
      {status ? <div className="status">{status}</div> : null}
    </form>
  );
}
