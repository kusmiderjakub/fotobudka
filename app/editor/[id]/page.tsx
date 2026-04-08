"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Script from "next/script";

const PRINTBOX_INIT_SCRIPT =
  "https://js-cdn.getprintbox.com/init/masterpiece_ai/init.min.js";

const STORE_NAME = "default_store";
const CURRENCY = "EUR";
const DEFAULT_FAMILY_ID = "323";

const serifFont =
  "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";

declare global {
  interface Window {
    printbox: {
      setEditorConfig: (config: Record<string, unknown>) => void;
      deinit: () => Promise<void>;
      goToCartFinished: (
        projectId: string,
        data: {
          redirectToCartAfterAddingProjectToCart: boolean;
          project: Record<string, unknown>;
        }
      ) => Promise<boolean>;
      authUserRequest: () => Promise<string>;
      hideECommerce: () => void;
      showECommerce: () => void;
      isUserLoggedIn: () => Promise<boolean>;
      refreshSession: () => Promise<string>;
      externalEventBusListener: (data: { eventName: string }) => void;
    };
  }
}

type OverlayStep = "hidden" | "email" | "processing" | "qr" | "done";

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}

function EditorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editorModuleId = params.id as string;
  const productId = searchParams.get("productId");
  const familyId = searchParams.get("familyId") || DEFAULT_FAMILY_ID;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [overlayStep, setOverlayStep] = useState<OverlayStep>("hidden");
  const [email, setEmail] = useState("");
  const [payError, setPayError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const pendingProjectIdRef = useRef<string | null>(null);

  const autoPayOrder = useCallback(async (projectId: string, email: string) => {
    try {
      const res = await fetch("/api/orders/auto-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email }),
      });
      if (!res.ok) {
        console.error("[Fotobudka] Failed to auto-pay order:", await res.text());
        return false;
      }
      const data = await res.json();
      console.log("[Fotobudka] Order auto-paid successfully:", data);
      return true;
    } catch (err) {
      console.error("[Fotobudka] Auto-pay error:", err);
      return false;
    }
  }, []);

  // Create session on mount
  useEffect(() => {
    async function createSession() {
      try {
        console.log("[Fotobudka] Creating session...");
        const res = await fetch("/api/sessions", { method: "POST" });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();
        console.log("[Fotobudka] Session created:", data.sessionKey);
        setSessionKey(data.sessionKey);
      } catch (err) {
        console.error("[Fotobudka] Session error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create session"
        );
        setLoading(false);
      }
    }
    createSession();
  }, []);

  // Initialize editor once BOTH script loaded AND session ready
  useEffect(() => {
    if (!scriptReady || !sessionKey || initializedRef.current) return;
    initializedRef.current = true;

    console.log("[Fotobudka] Initializing editor...");

    const printbox = window.printbox;
    if (!printbox) {
      setError("Printbox SDK failed to load");
      setLoading(false);
      return;
    }

    // Callback: when user clicks "Add to cart" / "Order"
    printbox.goToCartFinished = async (projectId, data) => {
      console.log("[Fotobudka] goToCartFinished", projectId, data);
      console.log("[Fotobudka] SDK thumbnailUrl:", data.project?.thumbnailUrl);
      pendingProjectIdRef.current = projectId;
      const sdkThumb = data.project?.thumbnailUrl as string | undefined;
      if (sdkThumb) setThumbnailUrl(sdkThumb);
      setOverlayStep("email");
      return true;
    };

    // Session management
    printbox.authUserRequest = async () => {
      console.log("[Fotobudka] authUserRequest called");
      const res = await fetch("/api/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh session");
      const data = await res.json();
      setSessionKey(data.sessionKey);
      return data.sessionKey;
    };

    printbox.isUserLoggedIn = async () => !!sessionKey;

    printbox.refreshSession = async () => {
      console.log("[Fotobudka] refreshSession called");
      const res = await fetch("/api/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh session");
      const data = await res.json();
      setSessionKey(data.sessionKey);
      return data.sessionKey;
    };

    printbox.hideECommerce = () => {};
    printbox.showECommerce = () => {};

    printbox.externalEventBusListener = ({ eventName }) => {
      console.log("[Fotobudka] Event:", eventName);
      if (eventName === "AppWasInitialized") {
        setLoading(false);
      }
    };

    const config: Record<string, unknown> = {
      productFamilyId: familyId,
      moduleId: editorModuleId,
      storeName: STORE_NAME,
      currency: CURRENCY,
      sessionId: sessionKey,
      language: "en",
      translationsLanguage: "en",
      contentLanguage: "en",
      ecommerceUrlPart: window.location.origin + "/editor/" + editorModuleId + "/",
      locale: "en-us",
      useIframe: false,
      previewMode: false,
      useFirstInsteadOfEditorStepIfNotInUrl: true,
    };

    if (productId) {
      config.productId = productId;
    }

    console.log("[Fotobudka] setEditorConfig:", config);
    printbox.setEditorConfig(config);

    const timeout = setTimeout(() => {
      console.log("[Fotobudka] Loading timeout, removing overlay");
      setLoading(false);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [scriptReady, sessionKey, editorModuleId, productId, familyId, autoPayOrder]);

  // User submits email → trigger payment → show completion → redirect
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pendingProjectIdRef.current) return;

    console.log("[Fotobudka] Email submitted:", email);
    setOverlayStep("processing");

    const success = await autoPayOrder(pendingProjectIdRef.current, email);

    if (success) {
      setOverlayStep("qr");
    } else {
      setPayError(true);
      setOverlayStep("done");
    }
  };

  const handleCreateAnother = useCallback(async () => {
    try { await window.printbox?.deinit(); } catch { /* ignore */ }
    // Full page reload to completely reset Printbox SDK state
    window.location.href = "/";
  }, []);

  // Auto-redirect from QR screen after 30 seconds
  useEffect(() => {
    if (overlayStep !== "qr") return;
    const timeout = setTimeout(() => {
      handleCreateAnother();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [overlayStep, handleCreateAnother]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#eeece2",
        overflow: "hidden",
      }}
    >
      <Script
        src={PRINTBOX_INIT_SCRIPT}
        strategy="afterInteractive"
        onLoad={() => {
          console.log("[Fotobudka] Init script loaded");
          setScriptReady(true);
        }}
        onError={() => {
          setError("Failed to load Printbox editor script");
          setLoading(false);
        }}
      />

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(238, 236, 226, 0.95)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #ddd5c8",
              borderTopColor: "#da7756",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3d3929",
            fontSize: 18,
            fontFamily: serifFont,
            zIndex: 9999999,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p>{error}</p>
            <button
              onClick={() => router.push("/")}
              style={{
                marginTop: 16,
                padding: "10px 24px",
                backgroundColor: "#da7756",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Products
            </button>
          </div>
        </div>
      )}

      {/* Order overlay */}
      {overlayStep !== "hidden" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(238, 236, 226, 0.97)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
            padding: "40px 24px",
          }}
        >
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
            {/* EMAIL STEP */}
            {overlayStep === "email" && (
              <>
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
                    Almost there!
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
                    Enter your email to receive a digital copy
                    <br />and start printing your postcard
                  </p>
                </div>

                <form
                  onSubmit={handleEmailSubmit}
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
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    required
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
                    disabled={!email}
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
                      cursor: !email ? "default" : "pointer",
                      opacity: !email ? 0.6 : 1,
                    }}
                  >
                    Print my postcard
                  </button>
                </form>
              </>
            )}

            {/* PROCESSING STEP */}
            {overlayStep === "processing" && (
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    border: "4px solid #ddd5c8",
                    borderTopColor: "#da7756",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ textAlign: "center" }}>
                  <h1
                    style={{
                      fontSize: 32,
                      fontWeight: 400,
                      color: "#3d3929",
                      margin: 0,
                      fontFamily: serifFont,
                    }}
                  >
                    Sending to print...
                  </h1>
                </div>
              </>
            )}

            {/* QR CODE STEP */}
            {overlayStep === "qr" && pendingProjectIdRef.current && (
              <>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: "#4caf50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation:
                      "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  }}
                >
                  <svg
                    width="36"
                    height="36"
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
                <style>{`@keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>

                <div style={{ textAlign: "center" }}>
                  <h1
                    style={{
                      fontSize: 34,
                      fontWeight: 400,
                      color: "#3d3929",
                      margin: 0,
                      lineHeight: 1.15,
                      fontFamily: serifFont,
                    }}
                  >
                    Your postcard is printing!
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
                    Scan to share your design on LinkedIn
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 20,
                    padding: 24,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)",
                  }}
                >
                  <QRCodeSVG
                    value={(() => {
                      const base = `${window.location.origin}/share/${pendingProjectIdRef.current}`;
                      if (thumbnailUrl) return `${base}?img=${encodeURIComponent(thumbnailUrl)}`;
                      return base;
                    })()}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#3d3929"
                    level="L"
                  />
                </div>

                <button
                  onClick={handleCreateAnother}
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    padding: "14px",
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: serifFont,
                    backgroundColor: "#da7756",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  Create another postcard
                </button>
              </>
            )}

            {/* DONE STEP */}
            {overlayStep === "done" && (
              <>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: payError ? "#c44" : "#4caf50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {payError ? (
                      <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                    ) : (
                      <path d="M20 6L9 17l-5-5" />
                    )}
                  </svg>
                </div>
                <style>{`@keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>

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
                    {payError ? "Something went wrong" : "Your postcard is printing!"}
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
                    {payError
                      ? "Please ask for assistance"
                      : `A digital copy will be sent to ${email}`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div
        id="app"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
