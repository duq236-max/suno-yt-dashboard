import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '댓글 관리 | Suno YT Manager',
  description: '채널 영상의 댓글을 모아보고 AI로 답변을 자동 생성',
  openGraph: {
    title: '댓글 관리 | Suno YT Manager',
    description: '채널 영상의 댓글을 모아보고 AI로 답변을 자동 생성',
    type: 'website',
  },
};

export default function CommentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
