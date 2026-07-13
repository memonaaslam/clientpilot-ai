"use client";

import { useRef, useState } from "react";
import Link from "next/link";

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
  usage?: number;
  limit?: number;
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

  const [file, setFile] = useState<File | null>(
    null
  );

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

      setStatus("Recording voice note...");
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
        "Please record audio, upload an audio file, or paste meeting notes."
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
        formData.append(
          "notes",
          notes.trim()
        );
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
        "Meeting processed successfully."
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

  return (
    <div className="smart-upload-layout">
      <section className="smart-upload-card">
        <div className="smart-upload-head">
          <span className="badge">
            AI Meeting Intelligence
          </span>

          <h2>Record, upload, or paste a meeting</h2>

          <p>
            Use a voice note, upload an audio file,
            or paste meeting notes. ClientPilot AI
            will create the transcript, summary,
            tasks, proposal draft, and sales insights.
          </p>
        </div>

        <form
          className="smart-upload-form"
          onSubmit={submitMeeting}
        >
          <label>
            Meeting title
            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Client meeting"
              required
            />
          </label>

          <label>
            Client
            <select
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
          </label>

          <div className="card">
            <span className="badge">
              Option 1
            </span>

            <h3>Record voice note</h3>

            <p className="muted">
              Record the meeting directly from your
              microphone.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              {!recording ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={startRecording}
                >
                  Record Voice Note
                </button>
              ) : (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={stopRecording}
                >
                  Stop Recording
                </button>
              )}

              {file ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={clearAudio}
                >
                  Remove Audio
                </button>
              ) : null}
            </div>
          </div>

          <div className="card">
            <span className="badge">
              Option 2
            </span>

            <h3>Upload audio file</h3>

            <input
              className="input"
              type="file"
              accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/*"
              onChange={(event) =>
                setFile(
                  event.target.files?.[0] ??
                    null
                )
              }
            />

            <p className="muted">
              Supported: MP3, M4A, WAV, MP4 and
              WebM. Maximum size: 25 MB.
            </p>

            {file ? (
              <p className="auth-message">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <div className="card">
            <span className="badge">
              Option 3
            </span>

            <h3>Paste meeting text</h3>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Paste meeting transcript or notes here..."
              rows={12}
            />

            <p className="muted">
              You can use text notes without adding
              an audio file.
            </p>
          </div>

          {status ? (
            <p className="auth-message">
              {status}
            </p>
          ) : null}

          {error ? (
            <p className="auth-error">
              {error}
            </p>
          ) : null}

          <button
            className="btn gold"
            type="submit"
            disabled={
              loading ||
              clients.length === 0
            }
          >
            {loading
              ? "Processing Meeting..."
              : "Create AI Meeting Analysis"}
          </button>
        </form>
      </section>

      <aside className="smart-upload-preview">
        <h3>What ClientPilot creates</h3>

        <div className="smart-preview-step">
          <strong>01</strong>
          <span>Transcript and AI summary</span>
        </div>

        <div className="smart-preview-step">
          <strong>02</strong>
          <span>
            Budget, timeline, and decision maker
          </span>
        </div>

        <div className="smart-preview-step">
          <strong>03</strong>
          <span>
            Requirements, pain points, and objections
          </span>
        </div>

        <div className="smart-preview-step">
          <strong>04</strong>
          <span>
            Tasks, proposal draft, and sales score
          </span>
        </div>
      </aside>

      {result ? (
        <section className="smart-result-card">
          <div className="section-head">
            <div>
              <span className="badge">
                AI Analysis Complete
              </span>

              <h3>
                Meeting saved successfully
              </h3>

              {typeof result.usage === "number" &&
              typeof result.limit === "number" ? (
                <p className="muted">
                  Usage: {result.usage}/
                  {result.limit} meetings this
                  month.
                </p>
              ) : null}
            </div>

            <Link
              className="btn secondary"
              href="/dashboard/meetings"
            >
              View Meetings
            </Link>
          </div>

          <h4>Transcript</h4>
          <pre>
            {result.transcript ||
              "No transcript returned."}
          </pre>

          <h4>AI Summary</h4>
          <pre>
            {result.summary ||
              "No summary returned."}
          </pre>

          <div className="grid two">
            <div className="card">
              <h4>Budget</h4>
              <p>
                {result.budget ||
                  "Not confirmed"}
              </p>
            </div>

            <div className="card">
              <h4>Timeline</h4>
              <p>
                {result.timeline ||
                  "Not confirmed"}
              </p>
            </div>

            <div className="card">
              <h4>Decision Maker</h4>
              <p>
                {result.decisionMaker ||
                  "Not confirmed"}
              </p>
            </div>

            <div className="card">
              <h4>Closing Probability</h4>
              <p>
                {typeof result.closingProbability ===
                "number"
                  ? `${result.closingProbability}%`
                  : "Not available"}
              </p>
            </div>

            <div className="card">
              <h4>Sentiment</h4>
              <p>
                {result.sentiment ||
                  "Neutral"}
              </p>
            </div>
          </div>

          <h4>Requirements</h4>
          <ul>
            {(result.requirements || []).map(
              (item) => (
                <li key={item}>{item}</li>
              )
            )}
          </ul>

          <h4>Pain Points</h4>
          <ul>
            {(result.painPoints || []).map(
              (item) => (
                <li key={item}>{item}</li>
              )
            )}
          </ul>

          <h4>Objections</h4>
          <ul>
            {(result.objections || []).map(
              (item) => (
                <li key={item}>{item}</li>
              )
            )}
          </ul>

          <h4>Tasks Created</h4>
          <ul>
            {(result.actionItems || []).map(
              (item) => (
                <li key={item}>{item}</li>
              )
            )}
          </ul>

          <h4>Proposal Draft</h4>
          <pre>
            {result.proposalDraft ||
              "No proposal draft returned."}
          </pre>
        </section>
      ) : null}
    </div>
  );
}