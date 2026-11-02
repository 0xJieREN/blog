# 愚人节的博客

一个关注 AI 和 Finance 的独立开发者的个人主页与博客。

这里主要记录投资思考、软件开发、AI 工具和个人项目，也偶尔写一些生活中的观察。

## 找到我

- [GitHub](https://github.com/0xJieREN)
- [LinkedIn](https://www.linkedin.com/in/jierenglobal/)
- [小红书](https://www.xiaohongshu.com/user/profile/62ef1618000000001f00540f)
- [Email](mailto:jierenglobal@gmail.com)

## 本地开发

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

基于 Next.js、MDX 和 Tailwind CSS 构建。

## 字体

`app/fonts/` 里的字体由 `scripts/subset-fonts.py` 生成，构建时不处理字体。脚本按站点实际用到的字符、字重和 OpenType 特性裁剪 Inter、Newsreader 和 Geist Mono。每个字体分成两个文件：

- `*-core.woff2`：ASCII、常用标点和内容里用到的 Latin 字符。Inter 和 Geist Mono 的 core 会预加载。
- `*-extended.woff2`：其余 Latin-1 和 Latin Extended-A 字符。页面用到其中的字符时，浏览器才通过 `unicode-range` 下载它。

两个文件属于同一个 `font-family`，core 声明在后。中文仍由系统字体渲染。

重新生成并提交结果：

```bash
uv run scripts/subset-fonts.py
git add app/fonts
```

只检查、不改文件。内容超出现有字体时，命令以 1 退出，并列出缺少的字符：

```bash
uv run scripts/subset-fonts.py --check
```

遇到下面的情况要重新运行：

1. 内容加了 Latin-1 和 Latin Extended-A 以外、旧字体能画的字符，例如 `€`、`π`、希腊字母或西里尔字母。重新运行前，这些字符会回退到系统字体。
2. 内容加了 core 里还没有的 Latin-1 字母，例如 `é`。它能显示，但会多下载 extended 文件，而且和相邻字母之间没有字距调整。
3. CSS 用了低于 400 的字重。现在的文件最低只到 400。
4. CSS 或组件打开了脚本 `features` 里没有的 OpenType 特性。
5. 脚本里的字体来源更新了。脚本会校验 SHA-256，不一致就停止。更新哈希前要先做像素对比。

脚本只做不改变渲染的裁剪。站点实际只用到 `wght` 400–600 和 `opsz` 14–16。把轴收窄到这个范围，Inter 每个文件能再省约 5.6 KB，Geist Mono 每个文件约 0.75 KB，每个页面约 6.5 KB。但收窄会重新缩放并取整变化量，字形和步进最多偏移约 1.5 个字体单位。实测 36 张截图全部改变，最大差 90 级，文字位置最多移动 0.03 px。所以默认不收窄。
