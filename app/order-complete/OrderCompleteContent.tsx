"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const serifFont =
  "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";

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
        backgroundColor: "#eeece2",
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
          top: 32,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#a89a85",
            fontFamily: serifFont,
          }}
        >
          Masterpiece AI
        </span>
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
            backgroundColor: "#da7756",
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
              fontWeight: 400,
              color: "#3d3929",
              margin: 0,
              lineHeight: 1.15,
              fontFamily: serifFont,
            }}
          >
            Your postcard is printing
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#8d7e6a",
              marginTop: 12,
              marginBottom: 0,
              fontFamily: serifFont,
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
                color: "#3d3929",
                fontFamily: serifFont,
                fontWeight: 500,
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
                fontFamily: serifFont,
                border: "1.5px solid #ddd5c8",
                borderRadius: 12,
                backgroundColor: "#faf8f4",
                color: "#3d3929",
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
                fontWeight: 600,
                fontFamily: serifFont,
                backgroundColor: "#da7756",
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
                color: "#3d3929",
                fontFamily: serifFont,
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
            color: "#a89a85",
            fontFamily: serifFont,
            padding: "8px 16px",
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
            color: "#c4b8a6",
            fontFamily: serifFont,
          }}
        >
          Powered by Printbox
        </span>
      </div>
    </div>
  );
}
