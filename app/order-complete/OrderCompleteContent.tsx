"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const latoFont =
  "'Lato', Arial, Helvetica, sans-serif";

export default function OrderCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSending(true);
    try {
      // TODO: send email with project/order details
      console.log("[Fotobudka] Email submitted:", email, "Project:", projectId);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to send email:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/masterpiece-logo.png"
          alt="Masterpiece AI by Printbox"
          style={{ height: 40 }}
        />
      </div>

      <div
        style={{
          maxWidth: 480,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            backgroundColor: "#fe9528",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#2f2663",
              margin: 0,
              lineHeight: 1.15,
              fontFamily: latoFont,
            }}
          >
            Your postcard is printing
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#666666",
              marginTop: 12,
              marginBottom: 0,
              fontFamily: latoFont,
              lineHeight: 1.5,
            }}
          >
            It will be ready in just a moment
          </p>
        </div>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: "28px 24px",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <label
              style={{
                fontSize: 15,
                color: "#333333",
                fontFamily: latoFont,
                fontWeight: 700,
              }}
            >
              Want a digital copy? Enter your email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: 16,
                fontFamily: latoFont,
                border: "1.5px solid #e8e5f5",
                borderRadius: 12,
                backgroundColor: "#f8f7fc",
                color: "#333333",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={sending || !email}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: latoFont,
                backgroundColor: "#fe9528",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: sending || !email ? "default" : "pointer",
                opacity: sending || !email ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send me a copy"}
            </button>
          </form>
        ) : (
          <div
            style={{
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: "28px 24px",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 17,
                color: "#333333",
                fontFamily: latoFont,
                margin: 0,
              }}
            >
              A copy will be sent to <strong>{email}</strong>
            </p>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          style={{
            all: "unset",
            cursor: "pointer",
            fontSize: 15,
            color: "#2f2663",
            fontFamily: latoFont,
            padding: "8px 16px",
            border: "2px solid #2f2663",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          Create another postcard
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "#666666",
            fontFamily: latoFont,
          }}
        >
          Powered by Masterpiece AI &amp; Printbox
        </span>
      </div>
    </div>
  );
}
