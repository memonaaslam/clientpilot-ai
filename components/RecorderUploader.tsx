"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
};

type MeetingResult = {
  meetingId?: string;
  transcript?: string;
  summary?: string;
  budget?: string;
  timeline?: string;
  decisionMaker?: string;
  requirements?: string[];
  painPoints?: string[];
  objections?: string[];
  closingProbability?: number;
  sentiment?: string;
  actionItems?: string[];
  proposalDraft?: string;
  followUp?: string;
  usage?: number;
  limit?: number;
  autopilot?: {
    temperature?: string;
    score?: number;
    stage?: string;
    nextBestAction?: string;
    whatsappMessage?: string;
    emailMessage?: string;
    automationPlan?: string[];
    missingInfo?: string[];
    dealSignals?: string[];
    riskSignals?: string[];
  };
};

export function RecorderUploader({
  clients
}: {
  clients: ClientOption[];
}) {
  const [clientId, setClientId] = useState(
    clients[0]?.id ?? ""
  );
  const [title, setTitle] = useState(
    "Client meeting"
  );
  const [file, setFile] =
    useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [result, setResult] =
    useState<MeetingResult | null>(null);

  const mediaRecorder =
    useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function startRecording() {
    setError("");
    setStatus("");
    setResult(null);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      chunks.current = [];

      const recorder = new MediaRecorder(stream);

      mediaRecorder.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: "audio/webm"
        });

        const recordedFile = new File(
          [blob],
          `${Date.now()}-meeting.webm`,
          {
            type: "audio/webm"
          }
        );

        setFile(recordedFile);
        setStatus(
          "Voice note recorded successfully."
        );

        stream
          .getTracks()
          .forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording in progress...");
    } catch {
      setError(
        "Microphone access was denied or unavailable."
      );
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  function clearAudio() {
    setFile(null);
    setStatus("");
  }

  async function submitMeeting(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setStatus("");
    setResult(null);

    if (!file && !notes.trim()) {
      setError(
        "Please record audio, upload a file, or paste meeting notes."
      );
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();

      formData.append("title", title);
      formData.append("clientId", clientId);

      if (file) {
        formData.append("file", file);
      }

      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const response = await fetch(
        "/clientpilotai/api/ai/transcribe",
        {
          method: "POST",
          body: formData
        }
      );

      const data =
        (await response.json()) as MeetingResult & {
          error?: string;
        };

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to process meeting."
        );
        return;
      }

      setResult(data);
      setStatus(
        "AI meeting analysis completed."
      );
      setFile(null);
      setNotes("");
    } catch {
      setError(
        "Unable to connect to the meeting service."
      );
    } finally {
      setLoading(false);
    }
  }

  const score =
    result?.autopilot?.score ??
    result?.closingProbability ??
    0;

  const temperature =
    result?.autopilot?.temperature ||
    (score >= 75
      ? "Hot"
      : score >= 45
        ? "Warm"
        : "Cold");

  return (
    <div className="cp-meeting-workspace">
      <section className="cp-meeting-input-card">
        <div className="cp-meeting-input-head">
          <div>
            <span className="cp-eyebrow">
              AI Meeting Intelligence
            </span>

            <h2>
              Record, upload, or paste a meeting
            </h2>

            <p>
              Choose the easiest method. ClientPilot
              will transcribe, understand, and turn
              the meeting into clear sales actions.
            </p>
          </div>

          <div className="cp-meeting-ai-chip">
            <span>✦</span>
            <div>
              <strong>Makzora AI</strong>
              <small>Ready to analyze</small>
            </div>
          </div>
        </div>

        <form
          className="cp-meeting-form"
          onSubmit={submitMeeting}
        >
          <div className="cp-form-grid">
            <div className="cp-field">
              <label>Meeting title</label>
              <input
                className="cp-input"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Client meeting"
                required
              />
            </div>

            <div className="cp-field">
              <label>Client</label>
              <select
                className="cp-select"
                value={clientId}
                onChange={(event) =>
                  setClientId(event.target.value)
                }
                required
              >
                {clients.length === 0 ? (
                  <option value="">
                    No clients found
                  </option>
                ) : (
                  clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="cp-meeting-methods">
            <article
              className={`cp-meeting-method ${
                recording
                  ? "cp-meeting-method-active"
                  : ""
              }`}
            >
              <div className="cp-meeting-method-icon">
                🎙
              </div>

              <span className="cp-method-number">
                01
              </span>

              <h3>Record voice note</h3>

              <p>
                Capture the meeting directly from
                your microphone.
              </p>

              <div className="cp-method-actions">
                {!recording ? (
                  <button
                    className="cp-premium-button cp-button-dark"
                    type="button"
                    onClick={startRecording}
                  >
                    Record Voice Note
                  </button>
                ) : (
                  <button
                    className="cp-premium-button cp-button-danger"
                    type="button"
                    onClick={stopRecording}
                  >
                    Stop Recording
                  </button>
                )}

                {file ? (
                  <button
                    className="cp-premium-button cp-button-soft"
                    type="button"
                    onClick={clearAudio}
                  >
                    Remove Audio
                  </button>
                ) : null}
              </div>

              {recording ? (
                <div className="cp-recording-status">
                  <span />
                  Recording now
                </div>
              ) : null}
            </article>

            <article className="cp-meeting-method">
              <div className="cp-meeting-method-icon">
                📁
              </div>

              <span className="cp-method-number">
                02
              </span>

              <h3>Upload audio file</h3>

              <p>
                Add MP3, M4A, WAV, MP4, or WebM up
                to 25 MB.
              </p>

              <label className="cp-upload-zone">
                <input
                  type="file"
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/*"
                  onChange={(event) =>
                    setFile(
                      event.target.files?.[0] ??
                        null
                    )
                  }
                />

                <span>Choose audio file</span>

                <small>
                  {file
                    ? file.name
                    : "No file selected"}
                </small>
              </label>
            </article>

            <article className="cp-meeting-method">
              <div className="cp-meeting-method-icon">
                📝
              </div>

              <span className="cp-method-number">
                03
              </span>

              <h3>Paste meeting text</h3>

              <p>
                Paste notes or a transcript when no
                audio is available.
              </p>

              <textarea
                className="cp-textarea"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Paste meeting transcript or notes here..."
                rows={9}
              />
            </article>
          </div>

          {status ? (
            <div className="cp-meeting-message cp-meeting-success">
              <span>✓</span>
              {status}
            </div>
          ) : null}

          {error ? (
            <div className="cp-meeting-message cp-meeting-error">
              <span>!</span>
              {error}
            </div>
          ) : null}

          <div className="cp-meeting-submit-row">
            <div>
              <strong>
                One click creates everything
              </strong>
              <span>
                Transcript, summary, sales score,
                tasks, proposal draft, and follow-up.
              </span>
            </div>

            <button
              className="cp-premium-button cp-button-gold cp-meeting-submit"
              type="submit"
              disabled={
                loading ||
                clients.length === 0
              }
            >
              {loading
                ? "Analyzing Meeting..."
                : "Create AI Meeting Analysis"}
            </button>
          </div>
        </form>
      </section>

      {!result ? (
        <aside className="cp-meeting-preview-panel">
          <span className="cp-eyebrow">
            What AI creates
          </span>

          <h3>
            One meeting becomes a complete sales
            workspace.
          </h3>

          <div className="cp-meeting-preview-list">
            <div>
              <strong>01</strong>
              <span>Transcript + summary</span>
            </div>

            <div>
              <strong>02</strong>
              <span>
                Budget, timeline, decision maker
              </span>
            </div>

            <div>
              <strong>03</strong>
              <span>
                Requirements, objections, risks
              </span>
            </div>

            <div>
              <strong>04</strong>
              <span>
                Tasks, proposal, email, WhatsApp
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      {result ? (
        <section className="cp-meeting-results">
          <div className="cp-results-hero">
            <div>
              <span className="cp-eyebrow">
                AI Analysis Complete
              </span>

              <h2>
                Your meeting is now actionable.
              </h2>

              <p>
                ClientPilot converted the meeting
                into clear sales intelligence and
                next steps.
              </p>
            </div>

            <div className="cp-results-actions">
              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/meetings"
              >
                View Meeting
              </Link>

              <Link
                className="cp-premium-button cp-button-dark"
                href="/dashboard/tasks"
              >
                Open Tasks
              </Link>
            </div>
          </div>

          <div className="cp-result-score-grid">
            <article className="cp-score-card cp-score-card-main">
              <span>AI Sales Score</span>

              <div className="cp-score-value">
                <strong>{score}</strong>
                <small>/100</small>
              </div>

              <div className="cp-score-track">
                <div
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, score)
                    )}%`
                  }}
                />
              </div>
            </article>

            <article className="cp-score-card">
              <span>Deal Temperature</span>
              <strong>{temperature}</strong>
              <small>
                {result?.autopilot?.stage ||
                  "Needs review"}
              </small>
            </article>

            <article className="cp-score-card">
              <span>Closing Probability</span>
              <strong>
                {typeof result.closingProbability ===
                "number"
                  ? `${result.closingProbability}%`
                  : "—"}
              </strong>
              <small>
                AI confidence estimate
              </small>
            </article>

            <article className="cp-score-card">
              <span>Sentiment</span>
              <strong>
                {result.sentiment || "Neutral"}
              </strong>
              <small>
                Client meeting tone
              </small>
            </article>
          </div>

          <div className="cp-result-kpi-grid">
            <article>
              <span>💰 Budget</span>
              <strong>
                {result.budget || "Not confirmed"}
              </strong>
            </article>

            <article>
              <span>📅 Timeline</span>
              <strong>
                {result.timeline || "Not confirmed"}
              </strong>
            </article>

            <article>
              <span>👤 Decision Maker</span>
              <strong>
                {result.decisionMaker ||
                  "Not confirmed"}
              </strong>
            </article>
          </div>

          <div className="cp-result-content-grid">
            <article className="cp-result-card cp-result-card-wide">
              <span className="cp-eyebrow">
                AI Summary
              </span>
              <pre>
                {result.summary ||
                  "No summary returned."}
              </pre>
            </article>

            <article className="cp-result-card">
              <span className="cp-eyebrow">
                Next Best Action
              </span>
              <h3>
                {result.autopilot?.nextBestAction ||
                  result.followUp ||
                  "Review the meeting and follow up."}
              </h3>
            </article>

            <article className="cp-result-card">
              <span className="cp-eyebrow">
                Requirements
              </span>
              <ul>
                {(result.requirements || []).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  )
                )}
              </ul>
            </article>

            <article className="cp-result-card">
              <span className="cp-eyebrow">
                Pain Points
              </span>
              <ul>
                {(result.painPoints || []).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  )
                )}
              </ul>
            </article>

            <article className="cp-result-card">
              <span className="cp-eyebrow">
                Objections & Risks
              </span>
              <ul>
                {[
                  ...(result.objections || []),
                  ...(result.autopilot?.riskSignals ||
                    [])
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="cp-result-card">
              <span className="cp-eyebrow">
                Tasks Created
              </span>
              <ul>
                {(result.actionItems || []).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  )
                )}
              </ul>
            </article>

            <article className="cp-result-card cp-result-card-wide">
              <span className="cp-eyebrow">
                Proposal Draft
              </span>
              <pre>
                {result.proposalDraft ||
                  "No proposal draft returned."}
              </pre>
            </article>

            <article className="cp-result-card cp-result-card-wide">
              <span className="cp-eyebrow">
                Transcript
              </span>
              <details>
                <summary>
                  Open full transcript
                </summary>
                <pre>
                  {result.transcript ||
                    "No transcript returned."}
                </pre>
              </details>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
