import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/printbox";

export const dynamic = "force-dynamic";

/**
 * Tar parser — extracts the first image/PDF file, skipping metadata like .md5 checksums.
 * Tar format: 512-byte header blocks followed by file data padded to 512 bytes.
 */
function extractImageFromTar(buffer: Buffer): {
  filename: string;
  data: Buffer;
} | null {
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);

    // End of archive: two consecutive zero blocks
    if (header.every((b) => b === 0)) break;

    // Filename: bytes 0-99, null-terminated
    const filenameEnd = header.indexOf(0);
    const filename = header
      .subarray(0, filenameEnd > 0 && filenameEnd < 100 ? filenameEnd : 100)
      .toString("utf-8")
      .trim();

    // File size: bytes 124-135, octal string
    const sizeStr = header.subarray(124, 136).toString("utf-8").trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Type flag: byte 156 ('0' or '\0' = regular file)
    const typeFlag = header[156];
    const isFile = typeFlag === 0 || typeFlag === 48; // 0 or '0'

    offset += 512; // Skip header

    if (isFile && size > 0) {
      const lower = filename.toLowerCase();
      // Skip metadata files (.md5, .txt, etc.) — look for actual content
      const isContent =
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".tiff") ||
        lower.endsWith(".tif");

      if (isContent) {
        const data = buffer.subarray(offset, offset + size);
        return { filename, data };
      }
    }

    // Skip to next 512-byte boundary
    offset += Math.ceil(size / 512) * 512;
  }

  return null;
}

function getContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".tiff") || lower.endsWith(".tif")) return "image/tiff";
  return "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const project = await getProject(projectId);
    console.log("[render-image] Project", projectId, "render_status:", project.render_status, "render_url:", project.render_url ? "present" : "missing");

    if (project.render_status !== "SUCCESS" || !project.render_url) {
      return NextResponse.json(
        {
          status: project.render_status || "PENDING",
          ready: false,
        },
        { status: 202 }
      );
    }

    // Download the tar archive (with Printbox auth)
    console.log("[render-image] Downloading render from:", project.render_url);
    const tarRes = await fetch(project.render_url, { cache: "no-store" });
    if (!tarRes.ok) {
      console.error("[render-image] Failed to download tar:", tarRes.status, await tarRes.text().catch(() => ""));
      return NextResponse.json(
        { error: "Failed to download render", status: tarRes.status },
        { status: 502 }
      );
    }

    const tarBuffer = Buffer.from(await tarRes.arrayBuffer());
    const file = extractImageFromTar(tarBuffer);

    if (!file) {
      console.error("[render-image] No file found in tar archive");
      return NextResponse.json(
        { error: "No file in render archive" },
        { status: 404 }
      );
    }

    console.log("[render-image] Extracted:", file.filename, "size:", file.data.length);

    const contentType = getContentType(file.filename);

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": `inline; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    console.error("[render-image] Error:", error);
    return NextResponse.json(
      { error: "Failed to get render image" },
      { status: 500 }
    );
  }
}
