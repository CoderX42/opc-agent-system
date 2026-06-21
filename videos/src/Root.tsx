import { Composition } from "remotion";
import { OpcPromo } from "./compositions/OpcPromo";

export const FPS = 30;
export const DURATION_SECONDS = 30;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 900

// 抖音竖屏 1080x1920
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OpcPromo"
        component={OpcPromo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};