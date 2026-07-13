"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoogleDriveBackupButton() {
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runBackup() {
    setRunning(true);
    setMessage("");

    try {
      const response = await fetch(
        "/clientpilotai/api/google-drive/backup-now",
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || "Unable to create backup."
        );
        return;
      }

      setMessage(
        `Backup completed: ${data.fileName}. ${data.recordsExported} records exported.`
      );

      router.refresh();
    } catch {
      setMessage(
        "Unable to connect to the backup service."
      );
    } finally {
      setRunning(false);
    }
  }

  const isSuccess =
    message.toLowerCase().includes("completed");

  return (
    <div>
      <button
        className="btn gold"
        type="button"
        onClick={() => void runBackup()}
        disabled={running}
      >
        {running
          ? "Creating Backup..."
          : "Back Up Now"}
      </button>

      {message ? (
        <p
          className={
            isSuccess
              ? "auth-message"
              : "auth-error"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}