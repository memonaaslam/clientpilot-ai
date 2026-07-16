"use client";

import {
  useState,
  type FormEvent
} from "react";

import { useRouter } from "next/navigation";

import {
  createSupabaseBrowserClient
} from "@/lib/supabase-browser";

export function MakzoraOwnerLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase =
        createSupabaseBrowserClient();

      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      router.replace("/makzora-owner");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mk-owner-login-form"
      onSubmit={handleSubmit}
    >
      <label>
        <span>Owner email</span>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="memonaaslam00@gmail.com"
          autoComplete="email"
          required
        />
      </label>

      <label>
        <span>Password</span>

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>

      {errorMessage ? (
        <div className="mk-owner-login-error">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Signing in..."
          : "Open Makzora Owner Dashboard"}
      </button>
    </form>
  );
}
