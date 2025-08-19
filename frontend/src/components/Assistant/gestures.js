export const gestures = {
  smile: { label: "😊", duration: 1200 },
  laugh: { label: "😂", duration: 1400 },
  blush: { label: "🥰", duration: 1200 },
  sad: { label: "😢", duration: 1400 },
  wink: { label: "😉", duration: 1000 },
  kiss: { label: "😘", duration: 1200 },
  hug: { label: "🤗", duration: 1600 },
};

export function inferGestureFromText(text) {
  const t = (text || "").toLowerCase();
  if (/\b(love|care|proud|here for you)\b/.test(t)) return 'hug';
  if (/\b(joke|funny|haha|lol)\b/.test(t)) return 'laugh';
  if (/\bkiss|mwah|xoxo\b/.test(t)) return 'kiss';
  if (/\bsad|sorry|alone|upset|depressed\b/.test(t)) return 'sad';
  if (/\bflirt|cute|pretty|handsome|wink\b/.test(t)) return 'wink';
  return 'smile';
}
