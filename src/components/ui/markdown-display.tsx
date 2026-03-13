"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MarkdownDisplayProps {
  content: string;
  className?: string;
  onMuscleClick?: (muscleName: string) => void;
}

// Type for ReactMarkdown component props
interface ComponentProps {
  children?: ReactNode;
  className?: string;
  node?: unknown;
  siblingCount?: number;
  index?: number;
}

export function MarkdownDisplay({
  content,
  className,
  onMuscleClick,
}: MarkdownDisplayProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for headers
          h1: ({ children }: ComponentProps) => (
            <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">
              {children}
            </h1>
          ),
          h2: ({ children }: ComponentProps) => (
            <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              {children}
            </h2>
          ),
          h3: ({ children }: ComponentProps) => (
            <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4">
              {children}
            </h3>
          ),
          // Custom styling for paragraphs
          p: ({ children }: ComponentProps) => (
            <p className="text-gray-600 mb-3 leading-relaxed">{children}</p>
          ),
          // Custom styling for lists
          ul: ({ children }: ComponentProps) => (
            <ul className="list-disc pl-6 mb-4 grid gap-1">{children}</ul>
          ),
          ol: ({ children }: ComponentProps) => (
            <ol className="list-decimal pl-6 mb-4 grid gap-1">{children}</ol>
          ),
          li: ({ children }: ComponentProps) => (
            <li className="text-gray-600 leading-relaxed">{children}</li>
          ),
          // Custom styling for strong/bold text (medical terms)
          strong: ({ children }: ComponentProps) => {
            // If onMuscleClick is provided, render as button for interactivity
            if (
              onMuscleClick &&
              Array.isArray(children) &&
              typeof children[0] === "string"
            ) {
              const muscleName = children[0];
              return (
                <button
                  type="button"
                  className="font-semibold text-gray-900 bg-blue-100 px-1 py-0.5 rounded underline hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  onClick={() => onMuscleClick(muscleName)}
                >
                  {muscleName}
                </button>
              );
            }
            // Fallback to normal strong
            return (
              <strong className="font-semibold text-gray-900 bg-blue-50 px-1 py-0.5 rounded">
                {children}
              </strong>
            );
          },
          // Custom styling for emphasis/italic
          em: ({ children }: ComponentProps) => (
            <em className="italic text-gray-700">{children}</em>
          ),
          // Custom styling for code (if any)
          code: ({ children }: ComponentProps) => (
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
              {children}
            </code>
          ),
          // Custom styling for blockquotes
          blockquote: ({ children }: ComponentProps) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
              {children}
            </blockquote>
          ),
          // Custom styling for horizontal rules
          hr: () => <hr className="my-6 border-t-2 border-gray-200" />,
          // Custom styling for tables (if any)
          table: ({ children }: ComponentProps) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-200 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: ComponentProps) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }: ComponentProps) => (
            <tbody className="divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }: ComponentProps) => (
            <tr className="hover:bg-gray-50">{children}</tr>
          ),
          th: ({ children }: ComponentProps) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }: ComponentProps) => (
            <td className="px-4 py-2 text-sm text-gray-600">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
