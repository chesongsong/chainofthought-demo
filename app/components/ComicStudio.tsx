'use client';

import { useMemo, useState } from 'react';

type StreamPhase = 'idle' | 'thinking' | 'answering';

const initialPrompt = `主题：星际列车上的猫侦探
风格：日系清新 + 柔和水彩
画幅：三格漫画
情绪：轻松、机智、温暖`;

function extractPanels(answer: string) {
  return answer
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.match(/^(?:-?\s*)?(?:第?\d+格|Panel|镜头)/i))
    .slice(0, 3);
}

export default function ComicStudio() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [thinking, setThinking] = useState('');
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<StreamPhase>('idle');
  const [error, setError] = useState('');

  const panels = useMemo(() => extractPanels(answer), [answer]);

  const handleSubmit = async () => {
    setError('');
    setThinking('');
    setAnswer('');
    setPhase('thinking');

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error('AI 返回失败，请检查接口或密钥。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const thoughtMarker = 'THOUGHT:';
      const answerMarker = 'ANSWER:';
      const maxMarkerLength = Math.max(thoughtMarker.length, answerMarker.length);
      let buffer = '';
      let currentPhase: StreamPhase = 'thinking';

      const appendThinking = (text: string) => {
        if (!text) return;
        setThinking((prev) => prev + text.replace(thoughtMarker, ''));
      };

      const appendAnswer = (text: string) => {
        if (!text) return;
        setAnswer((prev) => prev + text);
      };

      const flushBuffer = (isFinal = false) => {
        while (buffer.length > 0) {
          if (currentPhase === 'thinking') {
            const answerIndex = buffer.indexOf(answerMarker);
            if (answerIndex >= 0) {
              const thoughtChunk = buffer.slice(0, answerIndex);
              appendThinking(thoughtChunk);
              buffer = buffer.slice(answerIndex + answerMarker.length);
              currentPhase = 'answering';
              setPhase('answering');
              continue;
            }

            const safeLength = isFinal ? buffer.length : buffer.length - (maxMarkerLength - 1);
            if (safeLength <= 0) {
              break;
            }
            const thoughtChunk = buffer.slice(0, safeLength);
            appendThinking(thoughtChunk);
            buffer = buffer.slice(safeLength);
          } else {
            const safeLength = isFinal ? buffer.length : buffer.length - (maxMarkerLength - 1);
            if (safeLength <= 0) {
              break;
            }
            appendAnswer(buffer.slice(0, safeLength));
            buffer = buffer.slice(safeLength);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        flushBuffer();
      }

      flushBuffer(true);
      setPhase('idle');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '未知错误';
      setError(message);
      setPhase('idle');
    }
  };

  return (
    <main>
      <section>
        <div className="badge">⚡ Gemini 3 Pro · Chain of Thought 流式展示</div>
        <h1 style={{ marginTop: '1rem' }}>AIstudio 漫画绘制</h1>
        <p>
          通过 Next.js + Vercel AI SDK，将 Gemini 3 Pro 的思考过程实时流式呈现，
          让漫画策划像在 AIstudio 里即时展开。
        </p>
      </section>

      <section className="card-grid">
        {panels.length > 0 ? (
          panels.map((panel, index) => (
            <article className="panel-card" key={`${panel}-${index}`}>
              <h3>分镜 {index + 1}</h3>
              <p>{panel}</p>
            </article>
          ))
        ) : (
          [1, 2, 3].map((panel) => (
            <article className="panel-card" key={`placeholder-${panel}`}>
              <h3>分镜 {panel}</h3>
              <p>等待生成镜头脚本...</p>
            </article>
          ))
        )}
      </section>

      <section className="form">
        <label htmlFor="prompt">输入你的漫画设定</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button onClick={handleSubmit} disabled={phase !== 'idle'}>
          {phase === 'idle' ? '生成流式思考' : '生成中...'}
        </button>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </section>

      <section className="card-grid">
        <article className="output-block thinking">
          <h2>思考流</h2>
          <p>{thinking || '等待模型开始思考...'}</p>
        </article>
        <article className="output-block answer">
          <h2>漫画脚本</h2>
          <p>{answer || '等待最终脚本生成...'}</p>
        </article>
      </section>

      <section className="footer-note">
        提示：请在 <code>.env.local</code> 中配置 <code>GOOGLE_GENERATIVE_AI_API_KEY</code>，
        可选 <code>GEMINI_MODEL</code> 用于指定 Gemini 3 Pro 等模型。
      </section>
    </main>
  );
}
