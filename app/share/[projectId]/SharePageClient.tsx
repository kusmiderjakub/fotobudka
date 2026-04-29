"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const latoFont =
  "'Lato', Arial, Helvetica, sans-serif";

type Platform = "linkedin" | "facebook" | "instagram" | "tiktok";

interface SharePageClientProps {
  projectId: string;
  thumbnailUrl: string | null;
  platform?: string;
}

export default function SharePageClient({
  projectId,
  thumbnailUrl,
  platform,
}: SharePageClientProps) {
  const [renderImageUrl, setRenderImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const autoTriggered = useRef(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${projectId}`
      : "";

  // Poll for the high-res render image
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    console.log("[share] Starting render poll for project:", projectId);

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        try {
          console.log("[share] Poll attempt", attempts + 1);
          const res = await fetch(`/api/projects/${projectId}/render-image`);
          const contentType = res.headers.get("content-type") || "";
          console.log("[share] Response:", res.status, "content-type:", contentType);

          if (res.ok && contentType.startsWith("image/")) {
            const blob = await res.blob();
            console.log("[share] Got high-res image, size:", blob.size);
            if (!cancelled) {
              setRenderImageUrl(URL.createObjectURL(blob));
              setLoading(false);
            }
            return;
          }
          if (res.ok && contentType.includes("pdf")) {
            console.log("[share] Got PDF render, stopping poll");
            setLoading(false);
            return;
          }
          if (res.status === 202) {
            const body = await res.json().catch(() => null);
            console.log("[share] Not ready yet:", body?.status || "unknown");
            attempts++;
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          const errorBody = await res.text().catch(() => "");
          console.warn("[share] Unexpected response, stopping poll:", res.status, errorBody);
          setLoading(false);
          return;
        } catch (err) {
          console.error("[share] Poll error:", err);
          setLoading(false);
          return;
        }
      }
      console.log("[share] Max poll attempts reached");
      if (!cancelled) setLoading(false);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const displayImageUrl = renderImageUrl || thumbnailUrl;

  const getImageBlob = useCallback(async (): Promise<Blob | null> => {
    try {
      if (renderImageUrl) {
        const res = await fetch(renderImageUrl);
        return await res.blob();
      }
      const res = await fetch(`/api/projects/${projectId}/render-image`);
      if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
        return await res.blob();
      }
    } catch { /* ignore */ }
    return null;
  }, [renderImageUrl, projectId]);

  const shareWithImage = useCallback(async (targetPlatform?: Platform) => {
    const shareText = "Just got my postcard from FESPA 2026 in Barcelona. Stamped with Masterpiece AI by @Printbox \u{1f1ea}\u{1f1f8}\u{2709}\u{fe0f}!\n\n#StampedWithMasterpieceAI #PostcardFromFESPA #FESPA2026";

    // Try Web Share API with image (works on mobile for all platforms)
    if (navigator.share) {
      try {
        const blob = await getImageBlob();
        if (blob) {
          const file = new File([blob], "my-fespa-postcard.png", { type: blob.type || "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              text: shareText,
              files: [file],
            });
            return;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }

      // Fallback: share text + URL (no image)
      try {
        await navigator.share({
          title: "My FESPA 2026 Postcard",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to platform-specific URL
      }
    }

    // Desktop fallback: platform-specific share dialogs
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (targetPlatform) {
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, "_blank");
        break;
      case "instagram":
      case "tiktok":
        // Instagram & TikTok have no web share — download image so user can upload manually
        await handleDownload();
        break;
      case "linkedin":
      default:
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank");
        break;
    }
  }, [shareUrl, getImageBlob]);

  const handleDownload = useCallback(async () => {
    const url = renderImageUrl || thumbnailUrl;
    if (!url) return;
    try {
      let blob: Blob;
      if (renderImageUrl) {
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

  // Auto-trigger sharing when image is ready and ?platform= is set
  useEffect(() => {
    if (loading || autoTriggered.current) return;
    const validPlatforms: Platform[] = ["linkedin", "facebook", "instagram", "tiktok"];
    if (platform && validPlatforms.includes(platform as Platform)) {
      autoTriggered.current = true;
      // Small delay so user sees the page first
      const timer = setTimeout(() => {
        shareWithImage(platform as Platform);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, platform, shareWithImage]);

  const platformButton = (p: Platform, label: string, bgColor: string, icon: React.ReactNode) => (
    <button
      onClick={() => shareWithImage(p)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        backgroundColor: bgColor,
        border: "none",
        borderRadius: 12,
        cursor: "pointer",
        transition: "transform 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      title={`Share on ${label}`}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: latoFont,
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
            fontWeight: 700,
            color: "#2f2663",
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
              backgroundColor: "#e8e5f5",
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
                        border: "4px solid #e8e5f5",
                        borderTopColor: "#fe9528",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <p style={{ fontSize: 13, color: "#666666", margin: 0 }}>
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
                    border: "4px solid #e8e5f5",
                    borderTopColor: "#fe9528",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ fontSize: 13, color: "#666666", margin: 0 }}>
                  Preparing your postcard...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div
                style={{
                  padding: 60,
                  color: "#666666",
                  fontSize: 16,
                }}
              >
                Design preview unavailable
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/masterpiece-logo.png"
            alt="Masterpiece AI by Printbox"
            style={{ height: 32 }}
          />
        </div>

        {/* Share section */}
        <p
          style={{
            fontSize: 14,
            color: "#333333",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Share your postcard on social media
        </p>

        {/* Platform buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          {platformButton("linkedin", "LinkedIn", "#0A66C2",
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          )}
          {platformButton("facebook", "Facebook", "#1877F2",
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          )}
          {platformButton("instagram", "Instagram", "#E4405F",
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          )}
          {platformButton("tiktok", "TikTok", "#000000",
            <svg width="22" height="22" viewBox="0 0 448 512" fill="#fff"><path d="M448 209.9a210.1 210.1 0 01-122.8-39.3v178.8A162.6 162.6 0 11185 188.3v89.9a74.6 74.6 0 1052.2 71.2V0h88a121 121 0 00122.8 121.1z"/></svg>
          )}
        </div>

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
              fontWeight: 700,
              fontFamily: latoFont,
              backgroundColor: "transparent",
              color: "#2f2663",
              border: "2px solid #2f2663",
              borderRadius: 8,
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
