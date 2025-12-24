import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

const systemPrompt = `你是一位漫画导演。请输出两段内容：\n\nTHOUGHT: 以简短、连贯的中文展示你的流式思考过程（不超过 6 行）。\nANSWER: 以三格漫画脚本形式输出，包含分镜描述、动作、对白和画面风格提示。`;
const defaultModel = 'gemini-2.5-pro-exp';

export async function POST(request: Request) {
  const { prompt } = (await request.json()) as { prompt?: string };

  const result = streamText({
    model: google(process.env.GEMINI_MODEL ?? defaultModel),
    system: systemPrompt,
    prompt: prompt ?? '',
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
