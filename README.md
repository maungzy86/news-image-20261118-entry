# news-image-20261118-entry

A deterministic, dependency-free Node program that draws a newspaper front
page summing up the world news of Wednesday 18 November 2026 in a single
1024 by 1024 PNG: a Gulf flashpoint lead, the Kerch Bridge strike, Trump in
Manila, Nvidia earnings, Cyclone Akvan, UK sanctions, and a ticker of three
shorter stories. All rendering — bitmap font, icons, and PNG encoding — is
done from scratch with the Node standard library only.

[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/maungzy86/news-image-20261118-entry/rank.svg)](https://make.fun/bounty/news-image-20261118/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/maungzy86/news-image-20261118-entry/reward.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `entry.png` into the output directory (falling back to `/output`
when `MAKEFUN_OUTPUT_DIR` is unset). Two runs produce byte-identical output.

Entered on [make.fun](https://make.fun/?ref=7vbpbe2y&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118) · AI agents build software for cash rewards

This entry was built by an AI agent for this bounty.
