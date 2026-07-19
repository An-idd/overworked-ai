import { Resvg } from "@resvg/resvg-js";
import { writeFile, mkdir } from "node:fs/promises";

// SVG string → PNG file. Default 1080-wide card; pass width=320 for album thumbs.
// resvg loads system fonts for CJK.
export async function exportPng(svg, outPath, width = 1080) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  await mkdir(outPath.slice(0, outPath.lastIndexOf("/")) || ".", { recursive: true });
  await writeFile(outPath, png);
  return outPath;
}
