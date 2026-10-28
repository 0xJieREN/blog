# aria

为巴赫《哥德堡变奏曲》第一首 Aria 画的一部短片。一张纸、一夜，所有线条都由 JavaScript 一帧一帧画出来，没有用任何图片素材。

故事用的是 Forkel 1802 年记下的那个传说：Keyserlingk 伯爵在德累斯顿失眠，年轻的 Goldberg 在隔壁房间弹琴给他听。

## 怎么看

- 直接用浏览器打开 `index.html`，点 ▶ 播放。空格暂停，左右方向键快进或后退 10 秒，鼠标移到画面下沿可以点进度条。
- 成片视频：`node render.cjs --out out/goldberg-aria.mp4`（1080×1080，24fps，大约 5 分 6 秒）。需要 Playwright 自带的 Chromium 和 ffmpeg。`--from` / `--to` 可以只渲一段，`--workers` 控制并行数。

## 和音乐怎么对上

`tools/analyze.py` 先分析录音：

- 用色度自相似找到 A 段和 B 段各自的反复（A A B B，共 64 个演奏小节）。
- 每小节都踩在低音线的一个音上（G F♯ E D B C D G……），所以用低频起音加低音音高去对齐每条小节线。
- 把所有音符起音（时间、力度、音高）导出来。

画面里的时间单位就是小节，不是秒：

- 画面底部那串点就是 32 个音的低音线，走到哪一小节就亮哪一个，反复的时候再给它画一个圈。
- 每个起音会从大键琴飘出一个蜡笔音符，Goldberg 的手也跟着起音动。
- 钟摆每拍摆一下，蜡烛在整首曲子里慢慢烧短，曲子结束时熄灭。
- 后半段的音符从烟囱飞上天变成星星；每小节一颗大星，16 颗连起来是一个高音谱号。

## 画法（照着 Kevin T. Ngo 的短片推测的）

看了 kevintngo.com 上的短片（still here、nib、watermelon、what do you love? 等）之后，归纳出这几条，`js/engine.js` 就是按这些写的：

- 米白色的纸，海军蓝圆珠笔线。线有手抖，粗细不均匀，圆圈收笔时会多画一点。
- 填色是蜡笔乱涂的纹理，带纸面颗粒，而且故意和墨线错开一点。
- 浅蓝色的构造辅助线（圆、十字、导线）先出来，墨线再描上去，之后辅助线慢慢淡掉。
- 线条是边播边"画出来"的；画好的线每两帧轻微抖一次（line boil）。
- 画面底部居中有一句手写字幕，一个字一个字写出来。
- 一张纸讲完一段长时间的故事，最后落一个短句。

这些都是从成片里看出来的，不是他公开的方法。

## 文件

- `index.html`：播放页，也负责无头渲染（`?render=1`）
- `js/engine.js`：笔、蜡笔、排线、手写字
- `js/film.js`：分镜、镜头、角色、字幕
- `js/fonts.js`、`js/timing.js`：由 `tools/build_data.py` 生成
- `audio/aria.mp3`：录音
- `render.cjs`：渲染成 mp4

## 素材与许可

- 录音：Kimiko Ishizaka，*The Open Goldberg Variations*（2012），CC0，来自 [archive.org/details/OpenGoldbergVariations](https://archive.org/details/OpenGoldbergVariations)
- 字体：EMS Tech、EMS Allure 单线字体（SIL Open Font License，Sheldon B. Michaels / Windell H. Oskay），以及 Hershey 字库里的高音谱号，都来自 npm 包 `hersheytext`（MIT）
