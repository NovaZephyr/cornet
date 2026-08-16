import { useEffect, useRef } from "react";
import twemoji from "@twemoji/api";
import { Link } from "@tanstack/react-router";

const hashtagPattern = /(^|\s)(#[\p{L}\p{N}_-]+)/gu;

function TwemojiText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = children;
    twemoji.parse(node, {
      folder: "svg",
      ext: ".svg",
      className: "twemoji",
      base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/",
    });
  }, [children]);

  return <span ref={ref} />;
}

export function FormattedText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(hashtagPattern)) {
    const full = match[0];
    const tag = match[2];
    const index = match.index ?? 0;
    const tagStart = index + full.length - tag.length;

    if (tagStart > last) parts.push(<TwemojiText key={`text-${last}`} children={text.slice(last, tagStart)} />);
    parts.push(
      <Link
        key={`link-${tagStart}`}
        to="/hashtag/$tag"
        params={{ tag: tag.slice(1) }}
        className="font-medium text-primary hover:underline"
      >
        <TwemojiText children={tag} />
      </Link>,
    );
    last = tagStart + tag.length;
  }

  if (last < text.length) parts.push(<TwemojiText key={`text-${last}`} children={text.slice(last)} />);
  return <span className={className}>{parts.length ? parts : <TwemojiText children={text} />}</span>;
}
