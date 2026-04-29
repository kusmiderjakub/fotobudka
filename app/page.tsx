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

const latoFont =
  "'Lato', Arial, Helvetica, sans-serif";

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
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Top branding logo */}
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

      {/* Main content */}
      <div
        style={{
          maxWidth: 960,
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
              fontWeight: 700,
              color: "#2f2663",
              margin: 0,
              lineHeight: 1.15,
              fontFamily: latoFont,
            }}
          >
            Create your
            <br />
            postcard
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
                border: "4px solid #e8e5f5",
                borderTopColor: "#fe9528",
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
              fontFamily: latoFont,
            }}
          >
            {error}
          </div>
        )}

        {/* Product grid — 3 columns */}
        {!loading && products.length > 0 && (
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleStart(product)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.07)",
                  transition: "transform 200ms ease, box-shadow 200ms ease",
                  display: "flex",
                  flexDirection: "column",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.07)";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    backgroundColor: "#e8e5f5",
                    overflow: "hidden",
                  }}
                >
                  {product.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.image}
                      alt={product.display_name?.en || product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#666666",
                        fontSize: 13,
                        fontFamily: latoFont,
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
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
