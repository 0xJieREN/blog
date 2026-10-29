# aria

为巴赫《哥德堡变奏曲》第一首 Aria 画的一部 35 秒短片。一张纸、一夜、八个小节，所有线条都由 JavaScript 一帧一帧画出来，没有用任何图片素材。

> one night in Dresden, a count could not sleep. next door, a boy was playing.
> the tune wandered, but the bass beneath it held still, something steady to lean on, and the Count slept.

故事用的是 Forkel 1802 年记下的那个传说：Keyserlingk 伯爵失眠，年轻的 Goldberg 在隔壁弹琴给他听。
片子想说的是 Aria 本身的结构：上面的旋律一直在游走，下面的低音一小节一个音，一步都不乱（后面三十个变奏都踩在这条低音上）。失眠的人终于有了可以靠着的东西。

## 选段

前 7 小节，接全曲最后一小节（第 32 小节）。两处都是从属音 D 落回主音 G，所以接得上；而且开头的乐句直接走到全曲的结尾，正好呼应整部变奏曲首尾都是这首 Aria。

录音剪辑：1.20–31.80 秒，接 292.30–297.2 秒，交叉淡化 30 毫秒（`audio/aria-excerpt.mp3`）。

## 八个镜头，一小节一个

每个镜头都在小节第一拍的低音上切，切换前有 0.22 秒的柔和叠化。

| 小节 | 低音 | 镜头 |
| --- | --- | --- |
| 1 | G | 伯爵睁着眼躺在床上，第一串音符从隔壁飘进来；结尾镜头推进他的眼睛 |
| 2 | F♯ | 眼睛接到同一个位置的钟面上，秒针和钟摆每拍走一下 |
| 3 | E | 隔壁，Goldberg 在大键琴前，五线谱从琴里长出来，每个音在被弹响的瞬间冒出 |
| 4 | D | 俯视键盘，按下的键亮起，音符按音高一列列往上升 |
| 5 | B | 镜头跟着音乐，从琴房穿过墙摇到卧室 |
| 6 | C | 地板下面，低音像踏脚石一样排着；C 在强拍落下，后面的 D、G 早就用铅笔画好了 |
| 7 | D | 回到伯爵，眼皮一拍一拍地合上 |
| 8 | G | 拉远看整栋房子，最后一个和弦响完蜡烛熄灭，落款 "aria." |

## 音符

旋律的每个音都来自乐谱（Mutopia 的 MIDI），用 `tools/notes.py` 对齐到录音里真正被弹响的时刻：小节线和拍点来自录音分析，每个音再吸附到最近的起音。

- 音符落在五线谱上的高度就是它的真实音高，A5、B5 有加线。
- 音符的形状跟着时值走：十六分音符两道符尾，八分音符一道，二分音符空心，装饰音画小一号。
- 颜色按音名固定，同一个音永远是同一个颜色（G 黄、A 橙、B 粉、C 青、D 蓝、E 绿、F♯ 红）。
- 所有音符以同样的速度沿谱线流动，所以音符之间的间距就是节奏。

## 画法（照着 Kevin T. Ngo 的短片推测的）

- 米白色的纸，海军蓝圆珠笔线条，有手抖，粗细不均匀。
- 蜡笔填色，带纸面颗粒，故意和墨线错开一点。
- 浅蓝色的构造辅助线先出来，墨线再描上去。
- 线条边播边画出来。
- 底部一行手写字幕。

**关于闪烁。** 逐帧对比 Kevin 的片子（still here、watermelon、nib）后发现：他的蜡笔纹理在帧与帧之间几乎不变，只有墨线极轻微地漂；watermelon 和 nib 还是每两帧才换一次画面。第一版每两帧就把整块蜡笔纹理换成另一张随机图，鲜艳的地方就一直闪。现在：

- 每种颜色只有一张固定的蜡笔纹理，跟着物体走。
- 墨线不再离散跳动，而是随时间连续地、不到半个像素地慢慢漂。

静止镜头里，彩色区域每帧变化的像素从约 50% 降到 1% 左右；整片逐帧扫描，没有找到闪烁帧。

## 怎么看、怎么渲

- 浏览器打开 `index.html`，点 ▶。空格暂停，左右方向键快进或后退 10 秒。
- 渲成视频：`node render.cjs --out out/aria-30s.mp4`（1080×1080，24fps）。需要 Playwright 自带的 Chromium 和 ffmpeg。每帧先存成 PNG，最后统一编码一次。

重新生成数据：

1. 下载完整录音（见下方来源）。
2. 跑 `tools/analyze.py <录音> timing.json`，找小节线和起音。
3. 跑 `tools/notes.py bwv-988-aria.mid timing.json`，生成 `js/score.js`。
4. 跑 `tools/build_data.py <hersheytext 包目录>`，生成 `js/fonts.js`。

## 文件

- `index.html`：播放页，也负责无头渲染（`?render=1`）
- `js/engine.js`：笔、蜡笔、排线、手写字
- `js/film.js`：八个镜头、五线谱和音符、字幕
- `js/score.js`：对齐好的音符，由 `tools/notes.py` 生成
- `js/fonts.js`：单线字体，由 `tools/build_data.py` 生成
- `audio/aria-excerpt.mp3`：剪好的音频
- `render.cjs`：渲染成 mp4

## 素材与许可

- 录音：Kimiko Ishizaka，*The Open Goldberg Variations*（2012），CC0，来自 [archive.org/details/OpenGoldbergVariations](https://archive.org/details/OpenGoldbergVariations)
- 乐谱：Mutopia Project 版 BWV 988 Aria（JD Erickson 制谱，依据 Bach-Gesellschaft 版），CC BY-SA 3.0，来自 [mutopiaproject.org](https://www.mutopiaproject.org/ftp/BachJS/BWV988/bwv-988-aria/)。`js/score.js` 由它生成，沿用同一许可。
- 字体：EMS Tech、EMS Allure 单线字体（SIL Open Font License，Sheldon B. Michaels / Windell H. Oskay），以及 Hershey 字库里的高音谱号，都来自 npm 包 `hersheytext`（MIT）
