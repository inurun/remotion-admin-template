import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

const videoFps = Number(
  process.env["VITE_VIDEO_FPS"] ?? process.env["NEXT_PUBLIC_VIDEO_FPS"] ?? 30,
);

Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setAudioCodec("aac");
Config.setSampleRate(48000);
Config.setAudioBitrate("192k");
Config.setVideoBitrate("12M");
Config.setEncodingMaxRate("12M");
Config.setEncodingBufferSize("24M");
Config.setGopSize(videoFps * 10);
Config.setX264Preset("medium");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(100);
Config.setEntryPoint("./src/remotion/core/runtime.ts");
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig((currentConfiguration) => {
  const currentAlias =
    currentConfiguration.resolve?.alias && !Array.isArray(currentConfiguration.resolve.alias)
      ? currentConfiguration.resolve.alias
      : {};

  return enableTailwind({
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...currentAlias,
        "@": path.resolve(process.cwd(), "src"),
      },
    },
  });
});
