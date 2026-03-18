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

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My FESPA Postcard by Printbox",
          text: "Check out the postcard I designed at FESPA Barcelona!",
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error — fall through to LinkedIn
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    // Desktop / fallback: open LinkedIn share-offsite
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
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

        {/* Share button — uses Web Share API on mobile, LinkedIn fallback on desktop */}
        <button
          onClick={handleShare}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share your design
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
