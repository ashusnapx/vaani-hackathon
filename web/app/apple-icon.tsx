import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The favicon's mark, drawn large for home screens.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a1f24"/><path d="M43 19c-3-4-9-6-14-5-5 1-8 5-7 9 1 9 22 6 22 16 0 5-5 9-11 9-5 0-9-2-12-6" fill="none" stroke="#d8a86b" stroke-width="6.5" stroke-linecap="round"/><circle cx="47" cy="47" r="3.5" fill="#d8a86b"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${Buffer.from(mark).toString("base64")}`} width={180} height={180} alt="" />,
    size,
  );
}
