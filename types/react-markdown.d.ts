declare module 'react-markdown' {
  interface ReactMarkdownProps {
    children?: string;
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    components?: Record<string, unknown>;
    className?: string;
  }
  
  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'remark-gfm';
declare module 'rehype-highlight'; 