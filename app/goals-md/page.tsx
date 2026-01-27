import fs from 'fs/promises';
import path from 'path';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// docs/development/refactoring/v1/goals.md 경로 지정
export default async function GoalsMdPage() {
  const filePath = path.join(process.cwd(), 'docs', 'development', 'refactoring', 'v1', 'goals.md');
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#dc2626' }}>
        <h2>goals.md 파일을 찾을 수 없습니다.</h2>
        <p>경로: {filePath}</p>
      </div>
    );
  }
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>goals.md</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </main>
  );
}
