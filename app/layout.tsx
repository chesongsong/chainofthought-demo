import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'AIstudio 漫画绘制 · Chain of Thought Demo',
  description: 'Next.js + AI SDK + Gemini 3 Pro 流式思考展示',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
