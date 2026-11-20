const WINDOWS_PATH_RE = /[A-Za-z]:\\(?:[^\s,;()[\]{}"'<>`]+)/g;
const HOME_PATH_RE = /~[\\/][^\s,;()[\]{}"'<>`]+/g;
const URL_RE = /https?:\/\/[^\s,;()[\]{}"'<>`]+/gi;
const PORT_RE = /(?:^|[\s(,])(:[0-9]{4,5})\b/g;

function cleanMatch(raw: string): string {
  return raw.replace(/[.,;:!?]+$/g, '').trim();
}

export function extractLocations(text: string): readonly string[] {
  if (!text) return Object.freeze([]);
  const found = new Set<string>();

  const collect = (pattern: RegExp, captureGroup = 0): void => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match !== null) {
      const candidate = cleanMatch(match[captureGroup] ?? '');
      if (candidate.length >= 3 && candidate.length <= 180) {
        found.add(candidate);
      }
      if (found.size >= 16) break;
      match = pattern.exec(text);
    }
  };

  collect(URL_RE);
  collect(WINDOWS_PATH_RE);
  collect(HOME_PATH_RE);
  collect(PORT_RE, 1);

  return Object.freeze([...found]);
}
