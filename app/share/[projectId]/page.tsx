import { Metadata } from "next";
import { getProject } from "@/lib/printbox";
import SharePageClient from "./SharePageClient";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ img?: string }>;
}

async function fetchThumbnail(projectId: string): Promise<string | null> {
  try {
    const project = await getProject(projectId);
    return project.thumbnail_url || null;
  } catch (err) {
    console.error("[SharePage] Failed to fetch project:", err);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const { img } = await searchParams;

  const thumbnailUrl = img || await fetchThumbnail(projectId);

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

  const thumbnailUrl = img || await fetchThumbnail(projectId);

  return <SharePageClient projectId={projectId} thumbnailUrl={thumbnailUrl} />;
}
