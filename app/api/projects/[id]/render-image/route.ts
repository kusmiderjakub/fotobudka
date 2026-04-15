import { NextRequest, NextResponse } from "next/server";
import { getProject, downloadProjectRender } from "@/lib/printbox";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    // Check if render is ready first (fast, no download)
    const project = await getProject(projectId);
    if (project.render_status !== "SUCCESS" || !project.render_url) {
      return NextResponse.json(
        { status: project.render_status || "PENDING", ready: false },
        { status: 202 }
      );
    }

    // Download and extract (shared logic with email sender)
    const render = await downloadProjectRender(projectId);
    if (!render) {
      return NextResponse.json(
        { status: "PENDING", ready: false },
        { status: 202 }
      );
    }

    return new NextResponse(new Uint8Array(render.buffer), {
      headers: {
        "Content-Type": render.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": `inline; filename="${render.filename}"`,
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
