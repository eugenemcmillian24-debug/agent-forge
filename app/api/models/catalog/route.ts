import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { GitHubModelsProvider } from "@/lib/ai/providers/github-models";
import { GroqProvider }         from "@/lib/ai/providers/groq";
import { MistralProvider }      from "@/lib/ai/providers/mistral";
import { OpenRouterProvider }   from "@/lib/ai/providers/openrouter";
import { HuggingFaceProvider }  from "@/lib/ai/providers/huggingface";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [github, groq, mistral, openrouter, hf] = await Promise.allSettled([
    GitHubModelsProvider.listModels(),
    GroqProvider.listModels(),
    MistralProvider.listModels(),
    OpenRouterProvider.listModels(),
    HuggingFaceProvider.listModels(),
  ]);

  return NextResponse.json({
    githubModels: github.status    === "fulfilled" ? github.value    : [],
    groq:         groq.status      === "fulfilled" ? groq.value      : [],
    mistral:      mistral.status   === "fulfilled" ? mistral.value   : [],
    openrouter:   openrouter.status === "fulfilled" ? openrouter.value : [],
    huggingface:  hf.status        === "fulfilled" ? hf.value        : [],
  });
}
