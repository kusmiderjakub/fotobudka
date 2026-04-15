import { Metadata } from "next";
import { getProject } from "@/lib/printbox";
import SharePageClient from "./SharePageClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ img?: string }>;
}

async function fetchThumbnail(projectId: string): Promise<string | null> {
  try {
    const project = await getProject(projectId);
    // Log full response to discover higher-res image fields
    console.log("[SharePage] Project API response:", JSON.stringify(project));
    return project.thumbnail_url || null;
  } catch (err) {
    console.error("[SharePage] Failed to fetch project:", err);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const { img } = await searchParams;

  // Prefer API thumbnail (higher quality) over SDK thumbnail passed via QR
  const thumbnailUrl = await fetchThumbnail(projectId) || img;

  return {
    title: "Check out my postcard designed at FESPA!",
    description: "Created with Masterpiece AI by Printbox",
    openGraph: {
      title: "I designed this postcard at FESPA!",
      description: "Created with Masterpiece AI by Printbox",
      ...(thumbnailUrl && {
        images: [{ url: thumbnailUrl, width: 900, height: 900 }],
      }),
    },
  };
}

export default async function SharePage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { img } = await searchParams;

  // Prefer API thumbnail (higher quality) over SDK thumbnail passed via QR
  const thumbnailUrl = await fetchThumbnail(projectId) || img || null;

  return <SharePageClient projectId={projectId} thumbnailUrl={thumbnailUrl} />;
}
