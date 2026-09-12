// Take an LLM response that might contain markdown and give back
// something a plain RN <Text> can render cleanly. We can't stop
// smaller models from occasionally reaching for **bold** or "* bullet"
// no matter how firmly the system prompt asks, so this is the second
// line of defence.
//
// Order matters: strip fenced code blocks first (they can contain
// other markdown characters), then bold/italic pairs, then heading
// markers, then bullet points.
export function stripMarkdown(text) {
  if (!text) return "";
  let out = String(text);

  // Fenced code blocks: keep the code, drop the fences and any label
  out = out.replace(/```[a-z]*\n?([\s\S]*?)```/gi, (_, inner) => inner.trim());

  // Inline code: `foo` → foo
  out = out.replace(/`([^`]+)`/g, "$1");

  // Bold: **foo** or __foo__ → foo
  out = out.replace(/\*\*([^\*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");

  // Italic: *foo* or _foo_ → foo. Guard against list-marker asterisks
  // by requiring non-space on both sides of the pair.
  out = out.replace(/(?<!\*)\*([^\s\*][^\*]*[^\s\*]|\S)\*(?!\*)/g, "$1");
  out = out.replace(/(?<!_)_([^\s_][^_]*[^\s_]|\S)_(?!_)/g, "$1");

  // Heading markers at start of line: ### Title → Title
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Bullet lists: "* foo" or "- foo" at line start → "• foo"
  out = out.replace(/^(\s*)[\*\-]\s+/gm, "$1• ");

  // Blockquotes: "> foo" → "foo"
  out = out.replace(/^\s*>\s?/gm, "");

  // Collapse three-or-more newlines to two, trim edges.
  out = out.replace(/\n{3,}/g, "\n\n").trim();

  return out;
}
