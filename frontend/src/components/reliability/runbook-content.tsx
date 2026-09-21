import { cn } from "@/lib/utils";

interface RunbookContentProps {
  markdown: string;
  className?: string;
  skipTitle?: boolean;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function RunbookContent({
  markdown,
  className,
  skipTitle = true,
}: RunbookContentProps) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const elements: React.ReactNode[] = [];
  let index = 0;
  let skippedTitle = false;

  while (index < lines.length) {
    const line = lines[index];

    if (skipTitle && !skippedTitle && line.startsWith("# ")) {
      skippedTitle = true;
      index += 1;
      continue;
    }

    if (line.trim() === "---") {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      elements.push(
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground"
        >
          <code data-language={language || undefined}>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-sm font-semibold text-foreground">
          {line.slice(4)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${index}`} className="border-b border-border pb-2 text-base font-semibold text-foreground">
          {line.slice(3)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      elements.push(
        <div
          key={`quote-${index}`}
          className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
        >
          {quoteLines.map((quoteLine) => (
            <p key={quoteLine}>{renderInline(quoteLine)}</p>
          ))}
        </div>,
      );
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|\s*-+/.test(row))
        .map((row) =>
          row
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim()),
        );
      if (rows.length > 0) {
        const [header, ...body] = rows;
        elements.push(
          <div key={`table-${index}`} className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {header.map((cell) => (
                    <th key={cell} className="px-3 py-2 font-medium text-muted-foreground">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border last:border-b-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 text-muted-foreground">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^- \[[ x]\] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^- \[[ x]\] /.test(lines[index])) {
        items.push(lines[index].replace(/^- \[[ x]\] /, ""));
        index += 1;
      }
      elements.push(
        <ul key={`check-${index}`} className="space-y-1.5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground/70">[ ]</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      elements.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s/, ""));
        index += 1;
      }
      elements.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    elements.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed text-muted-foreground">
        {renderInline(line)}
      </p>,
    );
    index += 1;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {elements}
    </div>
  );
}
