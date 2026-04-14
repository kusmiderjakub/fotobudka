"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [renderImageUrl, setRenderImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${projectId}`
      : "";

  // Poll for the high-res render image
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // ~2.5 minutes max polling

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        try {
          const res = await fetch(`/api/projects/${projectId}/render-image`);
          if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
            // Got an image back — create a blob URL
            const blob = await res.blob();
            if (!cancelled) {
              setRenderImageUrl(URL.createObjectURL(blob));
              setLoading(false);
            }
            return;
          }
          if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
            // PDF render — can't display inline, stop polling
            setLoading(false);
            return;
          }
          // 202 = not ready yet, keep polling
          if (res.status === 202) {
            attempts++;
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          // Other error — stop polling, show thumbnail
          setLoading(false);
          return;
        } catch {
          setLoading(false);
          return;
        }
      }
      // Max attempts reached
      if (!cancelled) setLoading(false);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const displayImageUrl = renderImageUrl || thumbnailUrl;

  const handleShare = useCallback(async () => {
    // Use native share sheet if available (opens LinkedIn app picker on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "I designed this postcard at FESPA!",
          text: "Created with Masterpiece AI by Printbox",
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to LinkedIn URL
      }
    }
    // Fallback: open LinkedIn share page directly
    window.location.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  const handleDownload = useCallback(async () => {
    const url = renderImageUrl || thumbnailUrl;
    if (!url) return;
    try {
      let blob: Blob;
      if (renderImageUrl) {
        // Already a blob URL
        const res = await fetch(renderImageUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(url);
        blob = await res.blob();
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "my-fespa-postcard.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, [renderImageUrl, thumbnailUrl]);

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

        {/* Image area with loading state */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)",
              position: "relative",
              minHeight: 200,
              width: "100%",
              backgroundColor: "#f5f3ed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {displayImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt="My postcard design"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    transition: "opacity 0.3s ease",
                    opacity: loading ? 0.4 : 1,
                  }}
                />
                {loading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        border: "4px solid #ddd5c8",
                        borderTopColor: "#da7756",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <p style={{ fontSize: 13, color: "#8d7e6a", margin: 0 }}>
                      Loading high-res preview...
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </>
            ) : loading ? (
              <div
                style={{
                  padding: 60,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: "4px solid #ddd5c8",
                    borderTopColor: "#da7756",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ fontSize: 13, color: "#8d7e6a", margin: 0 }}>
                  Preparing your postcard...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div
                style={{
                  padding: 60,
                  color: "#8d7e6a",
                  fontSize: 16,
                }}
              >
                Design preview unavailable
              </div>
            )}
          </div>
        </div>

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

        {/* Share button — uses native share sheet on mobile, LinkedIn fallback on desktop */}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share on social media
        </button>

        {/* Download button */}
        {displayImageUrl && (
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
