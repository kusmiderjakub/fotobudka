"use client";

import { useEffect, useState } from "react";

interface ProductData {
  id: number;
  name: string;
  display_name: Record<string, string>;
  family_id: number;
  friendly_url: Record<string, string>;
  image: string | null;
  editorModuleId: number | null;
}

const serifFont =
  "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";

export default function Home() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch products");
        const data: ProductData[] = await res.json();
        setProducts(data);
        if (data.length === 0) {
          setError("No products available");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load products"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleStart = (product: ProductData) => {
    const friendlyUrl =
      product.friendly_url?.en || Object.values(product.friendly_url)[0] || "";
    const editorModuleId = product.editorModuleId;
    if (!editorModuleId || !friendlyUrl) return;
    window.location.href = `/editor/${editorModuleId}?productId=${encodeURIComponent(friendlyUrl)}&familyId=${product.family_id}`;
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#eeece2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
            fontFamily: serifFont,
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
          paddingTop: 40,
          paddingBottom: 60,
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
              fontFamily: serifFont,
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
              fontFamily: serifFont,
              lineHeight: 1.5,
            }}
          >
            Design a personalised card and print it instantly
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div
            style={{
              width: "100%",
              borderRadius: 20,
              backgroundColor: "#fff",
              padding: "60px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)",
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
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              textAlign: "center",
              color: "#c44",
              fontSize: 16,
              fontFamily: serifFont,
            }}
          >
            {error}
          </div>
        )}

        {/* Product cards */}
        {!loading &&
          products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleStart(product)}
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
              {product.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.image}
                  alt={product.display_name?.en || product.name}
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
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
                      fontFamily: serifFont,
                    }}
                  >
                    {product.display_name?.en || product.name}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#a89a85",
                      marginTop: 4,
                      fontFamily: serifFont,
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
          ))}
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
            fontFamily: serifFont,
          }}
        >
          Powered by Printbox
        </span>
      </div>
    </div>
  );
}
