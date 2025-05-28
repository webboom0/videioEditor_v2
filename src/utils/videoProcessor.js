import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg = null;

export async function processVideo(videoFile) {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `/node_modules/@ffmpeg/core/dist/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `/node_modules/@ffmpeg/core/dist/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
  }

  try {
    await ffmpeg.writeFile(
      "input.mp4",
      new Uint8Array(await videoFile.arrayBuffer())
    );
    await ffmpeg.exec(["-i", "input.mp4", "-c:v", "copy", "-an", "output.mp4"]);
    const data = await ffmpeg.readFile("output.mp4");
    return new Blob([data], { type: "video/mp4" });
  } catch (error) {
    console.error("FFmpeg 처리 중 오류:", error);
    throw error;
  }
}
