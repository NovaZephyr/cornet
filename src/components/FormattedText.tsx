import { useEffect, useRef } from "react";
import twemoji from "@twemoji/api";
import { Link } from "@tanstack/react-router";

const tokenPattern = /(^|\s)((?:https?:\/\/|www\.)[^\s<]*[^\s<.,:;!?)\]}"']|#[\p{L}\p{N}_-]+|@[A-Za-z0-9_][A-Za-z0-9_.-]{0,31})/gu;

function TwemojiText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = children;
    twemoji.parse(node, { folder: "svg", ext: ".svg", className: "twemoji", base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/" });
    node.querySelectorAll<HTMLImageElement>("img.twemoji").forEach((image) => {
      image.style.height = "1em";
      image.style.width = "1em";
      image.style.verticalAlign = "-0.15em";
      image.style.display = "inline-block";
    });
  }, [children]);
  return <span ref={ref} />;
}

export function FormattedText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(tokenPattern)) {
    const full = match[0];
    const token = match[2];
    const index = match.index ?? 0;
    const tokenStart = index + full.length - token.length;
    if (tokenStart > last) parts.push(<TwemojiText key={`text-${last}`} children={text.slice(last, tokenStart)} />);
    if (token.startsWith("http") || token.startsWith("www.")) {
      const href = token.startsWith("www.") ? `https://${token}` : token;
      parts.push(<a key={`link-${tokenStart}`} href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-primary hover:underline">{token}</a>);
    } else if (token.startsWith("#")) {
      parts.push(<Link key={`hashtag-${tokenStart}`} to="/hashtag/$tag" params={{ tag: token.slice(1) }} className="font-medium text-primary hover:underline"><TwemojiText children={token} /></Link>);
    } else {
      parts.push(<Link key={`mention-${tokenStart}`} to="/c/$username" params={{ username: token.slice(1).toLowerCase() }} className="font-medium text-primary hover:underline"><TwemojiText children={token} /></Link>);
    }
    last = tokenStart + token.length;
  }
  if (last < text.length) parts.push(<TwemojiText key={`text-${last}`} children={text.slice(last)} />);
  return <span className={className}>{parts.length ? parts : <TwemojiText children={text} />}</span>;
}
