"use client";

import { useRouter } from "next/navigation";

const PRODUCT_FRIENDLY_URL = "fespa-printbox-card";
const EDITOR_MODULE_ID = 350;
const PRODUCT_IMAGE =
  "https://cdn1.getprintbox.com/pbx2-masterpiece-ai/media/productimage/b6f1e16a-c9aa-46d5-aa6d-43269eaa1f90/CRSTD0024-Love_in_Focus_thumb_900x900?mt=1773764946.883063";

export default function Home() {
  const router = useRouter();

  const handleStart = () => {
    router.push(`/editor/${EDITOR_MODULE_ID}?productId=${PRODUCT_FRIENDLY_URL}`);
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
      {/* Subtle top branding */}
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
            fontFamily:
              "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
          }}
        >
          Masterpiece AI
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 400,
              color: "#3d3929",
              margin: 0,
              lineHeight: 1.15,
              fontFamily:
                "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
            }}
          >
            Create your
            <br />
            postcard
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#8d7e6a",
              marginTop: 12,
              marginBottom: 0,
              fontFamily:
                "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
              lineHeight: 1.5,
            }}
          >
            Design a personalised card and print it instantly
          </p>
        </div>

        {/* Product card — large, tactile */}
        <button
          onClick={handleStart}
          style={{
            all: "unset",
            cursor: "pointer",
            width: "100%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: "#fff",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)",
            transition: "transform 200ms ease, box-shadow 200ms ease",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 2px 6px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)";
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_IMAGE}
            alt="FESPA x Printbox"
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              padding: "20px 24px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: "#3d3929",
                  fontFamily:
                    "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
                }}
              >
                FESPA x Printbox
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#a89a85",
                  marginTop: 4,
                  fontFamily:
                    "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
                }}
              >
                Tap to start designing
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#da7756",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* Bottom branding */}
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
            fontFamily:
              "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
          }}
        >
          Powered by Printbox
        </span>
      </div>
    </div>
  );
}
