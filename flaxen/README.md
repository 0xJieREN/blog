# la fille aux cheveux de lin

为德彪西《亚麻色头发的少女》（前奏曲第一册第 8 首）画的一部 32 秒短片。画法和 `goldberg/` 那部一样：线条、蜡笔、手写字幕，全部用 JavaScript 一帧一帧画出来。用 `.claude/skills/line-drawn-music-film` 做的。

> one line, early in the morning, / then a strand of flaxen hair, / then a girl in the flowering fields, / singing the sun up, / until the whole sky was gold.

这首曲子一开头就是一根没有伴奏的旋律线。片子从纸上的一根线开始，线的起伏就是旋律的音高。这根线原来是她的一缕头发；和声进来，田野和颜色才出现；上行琶音一个音把太阳抬高一级；最后拉远，她的头发在天上带着尾声的音符，飘成开头那根线的形状。

## 选段

开头（录音 0.6–15.8 秒：没有伴奏的旋律，和声进来，停在属和弦上），直接接结尾前那段上行琶音和尾声（117.33–134 秒：一路升到降G大和弦，然后安静下来）。从属和弦接到回主调的上行，交叉淡化 30 毫秒。

## 六个镜头

| 时间 | 镜头 |
| --- | --- |
| 0–7.55 | 一支笔在纸上画出旋律的起伏，每个音留下一个音符头；最后几拍线变成一缕头发 |
| 7.55 | 第一个和弦进来：她的侧脸，闭着眼唱，头发就是五线谱，音符从她那里流出去 |
| 11.19 | 拉远：开花的苜蓿地，每个伴奏音开一朵花；13.7 秒的和弦让太阳从地平线露出边 |
| 15.27 | 上行琶音：每个音把太阳抬高一级、多一道光，音符留在原地，像一级级台阶 |
| 19.13 | 她抬头睁开眼；最后镜头钻进她的眼睛 |
| 22.52 | 眼睛接到同一位置的太阳上，拉远看整片田野；尾声每个低音让太阳荡开一圈 |

## 音符

这首没有能直接下载的开放乐谱，所以音符是从录音里转写的（basic-pitch，`tools/transcribe.py`）。每个音出现的时间就是演奏里的时间。音高是转写估出来的，旋律线（每次起音的最高音）和乐谱开头对过，0.15 秒内的鬼音没有拿来画线。谱上按降号记谱（降G大调）。

## 怎么看、怎么渲

- 浏览器打开 `index.html`，点 ▶。
- 渲成视频（在仓库根目录下）：`node .claude/skills/line-drawn-music-film/scripts/render.cjs --project flaxen --audio audio/fille-excerpt.mp3 --out out/la-fille.mp4`

## 素材与许可

- 录音：Luis Kolodin（钢琴），2021，CC BY-SA 4.0，来自 IMSLP #810343。这部片子沿用 CC BY-SA 4.0。
- 作品：Claude Debussy，《前奏曲》第一册第 8 首（1910），公有领域。
- 字体：EMS Tech（SIL OFL）、Hershey 高音谱号（hersheytext，MIT）。
