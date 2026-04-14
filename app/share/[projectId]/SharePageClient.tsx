"use client";

import { useCallback } from "react";

const serifFont =
  "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";

interface SharePageClientProps {
  projectId: string;
  thumbnailUrl: string | null;
}

export default function SharePageClient({
  projectId,
  thumbnailUrl,
}: SharePageClientProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${projectId}`
      : "";

  const handleLinkedIn = useCallback(() => {
    // Use location.href so the OS can intercept and open the LinkedIn app
    window.location.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  const handleDownload = useCallback(async () => {
    if (!thumbnailUrl) return;
    try {
      const res = await fetch(thumbnailUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-fespa-postcard.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open image in new tab
      window.open(thumbnailUrl, "_blank");
    }
  }, [thumbnailUrl]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#eeece2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: serifFont,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#3d3929",
            margin: 0,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          I designed this postcard at FESPA!
        </h1>

        {thumbnailUrl ? (
          <div
            style={{
              width: "100%",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="My postcard design"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 16,
              backgroundColor: "#ddd5c8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8d7e6a",
              fontSize: 16,
            }}
          >
            Design preview unavailable
          </div>
        )}

        <p
          style={{
            fontSize: 15,
            color: "#8d7e6a",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Created with Masterpiece AI by Printbox
        </p>

        {/* LinkedIn share button — opens LinkedIn directly */}
        <button
          onClick={handleLinkedIn}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            maxWidth: 360,
            padding: "14px 24px",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: serifFont,
            backgroundColor: "#0a66c2",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Share on LinkedIn
        </button>

        {/* Download button */}
        {thumbnailUrl && (
          <button
            onClick={handleDownload}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              maxWidth: 360,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: serifFont,
              backgroundColor: "transparent",
              color: "#3d3929",
              border: "1.5px solid #ddd5c8",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Save image
          </button>
        )}
      </div>
    </div>
  );
}
