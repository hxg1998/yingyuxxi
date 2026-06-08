import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { buildPromptMessages, stripMarkdownCodeBlock } from '@/lib/ai';
import { validateAndNormalizeCard } from '@/lib/card-validator';
import { classifyInput } from '@/lib/input-classifier';
import { InputType } from '@/types/card';

const MAX_INPUT_LENGTH = 200;
const MIN_INPUT_LENGTH = 1;
const ENGLISH_PATTERN = /[a-zA-Z]/;
const REQUEST_TIMEOUT_MS = 30000;

function errorResponse(
  status: number,
  errorCode: string,
  message: string,
  retryable: boolean
) {
  return NextResponse.json(
    { success: false, errorCode, message, retryable },
    { status }
  );
}

export async function POST(request: NextRequest) {
  let body: { input?: string; inputType?: string };

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'unknown', '请求格式错误', false);
  }

  const rawInput = typeof body.input === 'string' ? body.input.trim() : '';

  // Input validation
  if (!rawInput || rawInput.length < MIN_INPUT_LENGTH) {
    return errorResponse(400, 'input_empty', '请输入英文单词、短语或短句', false);
  }
  if (rawInput.length > MAX_INPUT_LENGTH) {
    return errorResponse(400, 'input_too_long', '输入内容过长，请控制在 200 字以内', false);
  }
  if (!ENGLISH_PATTERN.test(rawInput)) {
    return errorResponse(400, 'not_english', '请输入英文内容（单词、短语或短句）', false);
  }

  // Use client-provided inputType, or classify server-side as fallback
  const inputType: InputType = (['word', 'phrase', 'sentence'].includes(body.inputType as string)
    ? body.inputType as InputType
    : classifyInput(rawInput));

  // Check API key
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return errorResponse(500, 'invalid_key', 'API Key 未配置，请检查服务器环境变量', false);
  }

  const { system, userMessage } = buildPromptMessages(inputType, rawInput);

  // Build provider — DeepSeek is OpenAI-compatible
  const provider = createOpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  });

  const model = process.env.AI_MODEL || 'deepseek-chat';
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '2048', 10);

  try {
    // Wrap in AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let rawText: string;
    try {
      const result = await generateText({
        model: provider.chat(model),
        system,
        messages: [{ role: 'user', content: userMessage }],
        maxOutputTokens: maxTokens,
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
        abortSignal: controller.signal,
      });
      rawText = result.text;
    } finally {
      clearTimeout(timeoutId);
    }

    // Parse JSON — strip markdown code blocks that some models emit
    const jsonStr = stripMarkdownCodeBlock(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[generate-card] JSON parse failed. Raw text:', rawText.slice(0, 500));
      return errorResponse(500, 'parse_error', '生成内容格式异常，请重试', true);
    }

    // Validate and normalize structure
    let cardData;
    try {
      cardData = validateAndNormalizeCard(parsed);
    } catch (validationError) {
      console.error('[generate-card] Validation failed:', validationError);
      return errorResponse(500, 'parse_error', '生成内容格式异常，请重试', true);
    }

    return NextResponse.json({ success: true, data: cardData });

  } catch (err: unknown) {
    // Timeout (AbortController)
    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse(504, 'timeout', 'AI 思考超时，可能是模型比较忙，请稍后重试', true);
    }

    // API key invalid (401)
    const errMessage = err instanceof Error ? err.message : String(err);
    if (errMessage.includes('401') || errMessage.toLowerCase().includes('unauthorized') || errMessage.toLowerCase().includes('api key')) {
      return errorResponse(401, 'invalid_key', 'API Key 无效或已过期，请检查配置', false);
    }

    // AI provider 5xx
    if (errMessage.includes('5') && /50[0-9]/.test(errMessage)) {
      return errorResponse(502, 'api_error', 'AI 服务暂时不可用，请稍后重试', true);
    }

    // Network / fetch errors
    if (errMessage.toLowerCase().includes('network') || errMessage.toLowerCase().includes('fetch') || errMessage.toLowerCase().includes('connect')) {
      return errorResponse(503, 'network', '网络连接中断，请检查网络后重试', true);
    }

    console.error('[generate-card] Unexpected error:', err);
    return errorResponse(500, 'unknown', '出现了未知错误，请刷新页面重试', true);
  }
}
