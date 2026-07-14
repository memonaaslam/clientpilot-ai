"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type GeneratedFollowUp = {
  subject: string;
  message: string;
  whatsappUrl: string;
  mailtoUrl: string;
};

type Channel = "whatsapp" | "email";
type StatusMessage = {
  type: "success" | "error";
  text: string;
};

const purposeOptions = [
  {
    value: "proposal",
    label: "Proposal",
    description: "Follow up after sending a proposal."
  },
  {
    value: "meeting",
    label: "After meeting",
    description: "Confirm decisions and next steps."
  },
  {
    value: "payment",
    label: "Payment",
    description: "Request a pending payment update."
  },
  {
    value: "cold-lead",
    label: "Lead rescue",
    description: "Reconnect with an inactive lead."
  },
  {
    value: "general",
    label: "General",
    description: "Send a professional check-in."
  }
];

const toneOptions = [
  {
    value: "friendly",
    label: "Friendly"
  },
  {
    value: "premium",
    label: "Premium professional"
  }
];

function cleanPhone(phone?: string | null) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export function FollowUpAssistant() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<Channel>("whatsapp");
  const [purpose, setPurpose] = useState("proposal");
  const [tone, setTone] = useState("friendly");
  const [notes, setNotes] = useState("");

  const [generated, setGenerated] =
    useState<GeneratedFollowUp | null>(null);

  const [draftSubject, setDraftSubject] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clients, clientId]
  );

  const selectedPurpose = useMemo(
    () =>
      purposeOptions.find((option) => option.value === purpose) ||
      purposeOptions[0],
    [purpose]
  );

  const sendUrl = useMemo(() => {
    if (!selectedClient || !draftMessage.trim()) {
      return "";
    }

    if (type === "whatsapp") {
      const phone = cleanPhone(selectedClient.phone);

      if (!phone) {
        return generated?.whatsappUrl || "";
      }

      return `https://wa.me/${phone}?text=${encodeURIComponent(
        draftMessage
      )}`;
    }

    if (!selectedClient.email) {
      return generated?.mailtoUrl || "";
    }

    return `mailto:${selectedClient.email}?subject=${encodeURIComponent(
      draftSubject
    )}&body=${encodeURIComponent(draftMessage)}`;
  }, [
    selectedClient,
    draftMessage,
    draftSubject,
    type,
    generated
  ]);

  const channelAvailable =
    type === "whatsapp"
      ? Boolean(selectedClient?.phone)
      : Boolean(selectedClient?.email);

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      setStatus(null);

      try {
        const response = await fetch(
          "/clientpilotai/api/follow-up-assistant",
          {
            cache: "no-store"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load clients.");
        }

        const nextClients: Client[] = Array.isArray(data.clients)
          ? data.clients
          : [];

        setClients(nextClients);

        setClientId((currentClientId) => {
          const currentExists = nextClients.some(
            (client) => client.id === currentClientId
          );

          if (currentExists) {
            return currentClientId;
          }

          return nextClients[0]?.id || "";
        });
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Unable to load clients.";

        setStatus({
          type: "error",
          text
        });
      } finally {
        setLoading(false);
      }
    }

    void loadClients();
  }, []);

  async function generateFollowUp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!clientId) {
      setStatus({
        type: "error",
        text: "Please select a client first."
      });
      return;
    }

    setGenerating(true);
    setStatus(null);

    try {
      const response = await fetch(
        "/clientpilotai/api/follow-up-assistant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_id: clientId,
            type,
            purpose,
            tone,
            notes
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to generate follow-up."
        );
      }

      const nextGenerated: GeneratedFollowUp = {
        subject: data.subject || "",
        message: data.message || "",
        whatsappUrl: data.whatsappUrl || "",
        mailtoUrl: data.mailtoUrl || ""
      };

      setGenerated(nextGenerated);
      setDraftSubject(nextGenerated.subject);
      setDraftMessage(nextGenerated.message);

      setStatus({
        type: "success",
        text: "Follow-up generated. You can edit it before sending."
      });
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to generate follow-up.";

      setStatus({
        type: "error",
        text
      });
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(
    text: string,
    successMessage: string
  ) {
    if (!text.trim()) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temporaryTextarea =
          document.createElement("textarea");

        temporaryTextarea.value = text;
        temporaryTextarea.style.position = "fixed";
        temporaryTextarea.style.opacity = "0";

        document.body.appendChild(temporaryTextarea);
        temporaryTextarea.select();
        document.execCommand("copy");
        document.body.removeChild(temporaryTextarea);
      }

      setStatus({
        type: "success",
        text: successMessage
      });
    } catch {
      setStatus({
        type: "error",
        text: "Unable to copy. Please select the text manually."
      });
    }
  }

  function changeChannel(channel: Channel) {
    setType(channel);
    setGenerated(null);
    setDraftSubject("");
    setDraftMessage("");
    setStatus(null);
  }

  function resetDraft() {
    setGenerated(null);
    setDraftSubject("");
    setDraftMessage("");
    setNotes("");
    setStatus(null);
  }

  return (
    <div className="cp-sales-assistant-page">
      <section className="cp-sales-assistant-hero">
        <div className="cp-sales-assistant-hero-copy">
          <span className="cp-sales-eyebrow">
            ClientPilot AI Sales Assistant
          </span>

          <h1>Turn every client conversation into the next action.</h1>

          <p>
            Create polished WhatsApp and email follow-ups for
            proposals, meetings, payments and inactive leads. Edit
            every message before sending.
          </p>
        </div>

        <div className="cp-sales-hero-stats">
          <article>
            <span>Available clients</span>
            <strong>{loading ? "..." : clients.length}</strong>
            <small>Ready for follow-up</small>
          </article>

          <article>
            <span>Selected channel</span>
            <strong>{type === "whatsapp" ? "WA" : "EM"}</strong>
            <small>
              {type === "whatsapp" ? "WhatsApp" : "Email"}
            </small>
          </article>

          <article>
            <span>Current purpose</span>
            <strong>01</strong>
            <small>{selectedPurpose.label}</small>
          </article>
        </div>
      </section>

      {status ? (
        <div
          className={`cp-sales-status cp-sales-status-${status.type}`}
          role="status"
        >
          <span>
            {status.type === "success" ? "OK" : "!"}
          </span>
          <p>{status.text}</p>
        </div>
      ) : null}

      <div className="cp-sales-assistant-layout">
        <section className="cp-sales-panel cp-sales-builder-panel">
          <div className="cp-sales-panel-heading">
            <div>
              <span>Message builder</span>
              <h2>Create a follow-up</h2>
            </div>

            <button
              type="button"
              className="cp-sales-reset-button"
              onClick={resetDraft}
            >
              Reset
            </button>
          </div>

          <form
            className="cp-sales-builder-form"
            onSubmit={generateFollowUp}
          >
            <div className="cp-sales-form-section">
              <div className="cp-sales-section-heading">
                <span>01</span>
                <div>
                  <strong>Select client</strong>
                  <small>
                    Choose who should receive this message.
                  </small>
                </div>
              </div>

              <label className="cp-sales-field">
                <span>Client</span>

                <select
                  value={clientId}
                  onChange={(event) =>
                    setClientId(event.target.value)
                  }
                  disabled={loading}
                  required
                >
                  {loading ? (
                    <option value="">Loading clients...</option>
                  ) : null}

                  {!loading && clients.length === 0 ? (
                    <option value="">
                      No clients are available
                    </option>
                  ) : null}

                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedClient ? (
                <article className="cp-sales-selected-client">
                  <div className="cp-sales-client-avatar">
                    {selectedClient.name
                      .trim()
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>{selectedClient.name}</strong>

                    <span>
                      {selectedClient.phone || "No phone number"}
                    </span>

                    <span>
                      {selectedClient.email || "No email address"}
                    </span>
                  </div>

                  <small
                    className={
                      channelAvailable
                        ? "available"
                        : "unavailable"
                    }
                  >
                    {channelAvailable
                      ? "Channel ready"
                      : "Contact missing"}
                  </small>
                </article>
              ) : null}
            </div>

            <div className="cp-sales-form-section">
              <div className="cp-sales-section-heading">
                <span>02</span>
                <div>
                  <strong>Choose channel</strong>
                  <small>
                    Select WhatsApp or email delivery.
                  </small>
                </div>
              </div>

              <div className="cp-sales-channel-grid">
                <button
                  type="button"
                  className={
                    type === "whatsapp" ? "active" : ""
                  }
                  onClick={() => changeChannel("whatsapp")}
                >
                  <span>WA</span>

                  <div>
                    <strong>WhatsApp</strong>
                    <small>Fast client follow-up</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={type === "email" ? "active" : ""}
                  onClick={() => changeChannel("email")}
                >
                  <span>EM</span>

                  <div>
                    <strong>Email</strong>
                    <small>Professional email draft</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="cp-sales-form-section">
              <div className="cp-sales-section-heading">
                <span>03</span>
                <div>
                  <strong>Message purpose</strong>
                  <small>
                    Tell ClientPilot what this follow-up is for.
                  </small>
                </div>
              </div>

              <div className="cp-sales-purpose-grid">
                {purposeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={
                      purpose === option.value ? "active" : ""
                    }
                    onClick={() => setPurpose(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="cp-sales-form-section">
              <div className="cp-sales-section-heading">
                <span>04</span>
                <div>
                  <strong>Communication style</strong>
                  <small>
                    Select the tone used in your message.
                  </small>
                </div>
              </div>

              <div className="cp-sales-tone-switch">
                {toneOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={
                      tone === option.value ? "active" : ""
                    }
                    onClick={() => setTone(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="cp-sales-field">
                <span>Additional instructions</span>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value.slice(0, 500))
                  }
                  placeholder="Example: Mention that the proposal expires on Friday, offer a quick call, or include an important next step."
                />

                <small className="cp-sales-character-count">
                  {notes.length}/500
                </small>
              </label>
            </div>

            <button
              type="submit"
              className="cp-sales-generate-button"
              disabled={
                generating ||
                loading ||
                clients.length === 0 ||
                !clientId
              }
            >
              <span>{generating ? "..." : "AI"}</span>

              <div>
                <strong>
                  {generating
                    ? "Preparing your message"
                    : "Generate follow-up"}
                </strong>

                <small>
                  {generating
                    ? "Please keep this page open"
                    : "Create an editable, ready-to-send draft"}
                </small>
              </div>
            </button>
          </form>
        </section>

        <section className="cp-sales-panel cp-sales-preview-panel">
          <div className="cp-sales-preview-heading">
            <div>
              <span>Live message preview</span>
              <h2>Review before sending</h2>
              <p>
                The final message stays under your control. Edit
                wording, add details and send only when it is ready.
              </p>
            </div>

            <div
              className={`cp-sales-channel-badge cp-sales-channel-${type}`}
            >
              <span>{type === "whatsapp" ? "WA" : "EM"}</span>
              {type === "whatsapp" ? "WhatsApp" : "Email"}
            </div>
          </div>

          {!generated ? (
            <div className="cp-sales-empty-preview">
              <div className="cp-sales-empty-icon">
                <span>CP</span>
              </div>

              <h3>Your message will appear here</h3>

              <p>
                Select a client, choose the message purpose and
                generate your first follow-up.
              </p>

              <div className="cp-sales-empty-steps">
                <span>1. Select client</span>
                <span>2. Choose purpose</span>
                <span>3. Generate and edit</span>
              </div>
            </div>
          ) : (
            <div className="cp-sales-message-workspace">
              <div className="cp-sales-recipient-bar">
                <div className="cp-sales-client-avatar">
                  {selectedClient?.name
                    .trim()
                    .slice(0, 2)
                    .toUpperCase() || "CP"}
                </div>

                <div>
                  <span>Prepared for</span>
                  <strong>
                    {selectedClient?.name || "Selected client"}
                  </strong>
                  <small>
                    {type === "whatsapp"
                      ? selectedClient?.phone ||
                        "Phone number unavailable"
                      : selectedClient?.email ||
                        "Email address unavailable"}
                  </small>
                </div>

                <span className="cp-sales-editable-badge">
                  Editable
                </span>
              </div>

              {type === "email" ? (
                <label className="cp-sales-preview-field">
                  <span>Email subject</span>

                  <input
                    value={draftSubject}
                    onChange={(event) =>
                      setDraftSubject(event.target.value)
                    }
                    placeholder="Email subject"
                  />
                </label>
              ) : null}

              <label className="cp-sales-preview-field cp-sales-message-field">
                <div className="cp-sales-preview-field-heading">
                  <span>Message</span>
                  <small>{draftMessage.length} characters</small>
                </div>

                <textarea
                  value={draftMessage}
                  onChange={(event) =>
                    setDraftMessage(event.target.value)
                  }
                  placeholder="Your generated message will appear here."
                />
              </label>

              <div className="cp-sales-preview-actions">
                <button
                  type="button"
                  className="cp-sales-secondary-action"
                  onClick={() =>
                    copyText(
                      draftMessage,
                      "Message copied successfully."
                    )
                  }
                  disabled={!draftMessage.trim()}
                >
                  Copy message
                </button>

                {type === "email" ? (
                  <button
                    type="button"
                    className="cp-sales-secondary-action"
                    onClick={() =>
                      copyText(
                        `Subject: ${draftSubject}\n\n${draftMessage}`,
                        "Complete email copied successfully."
                      )
                    }
                    disabled={!draftMessage.trim()}
                  >
                    Copy email
                  </button>
                ) : null}

                {sendUrl && channelAvailable ? (
                  <a
                    className="cp-sales-primary-action"
                    href={sendUrl}
                    target={
                      type === "whatsapp" ? "_blank" : undefined
                    }
                    rel={
                      type === "whatsapp"
                        ? "noreferrer"
                        : undefined
                    }
                  >
                    {type === "whatsapp"
                      ? "Open WhatsApp"
                      : "Open email draft"}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="cp-sales-primary-action"
                    disabled
                  >
                    {type === "whatsapp"
                      ? "Phone number required"
                      : "Email address required"}
                  </button>
                )}
              </div>

              <div className="cp-sales-safety-note">
                <span>Review</span>

                <p>
                  Confirm names, amounts, dates and promises before
                  sending any client communication.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}