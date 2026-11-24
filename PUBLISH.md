# 发布到插件市场 / Publishing

这个目录就是一个可以直接发布的 DSH bundle。整个发布链分三步：**推 GitHub →（可选）发 npm → 向 awesome-dsh-plugin 提 PR**。

## 0. 发布前本地自检

```bash
cd plugin/dsh-lulu-pet
node --check index.js     # Host 半
node --check client.js    # Client 半
npx pnpm pack             # 生成 dsh-lulu-pet-0.1.0.tgz，检查包含的文件与体积
```

当前包内容：15 段透明 WebM（约 1.0 MB）+ 27 张表情（约 7.2 MB）+ 文档预览图，tarball 约 9 MB。

## 1. 推到 GitHub（推荐，插件市场可以只认 GitHub）

```bash
cd plugin/dsh-lulu-pet
git init -b main
git add -A
git commit -m "feat: dsh-lulu-pet 0.1.0"
# 先在 GitHub 上建空仓库 xyk0729/dsh-lulu-pet，再：
git remote add origin git@github.com:xyk0729/dsh-lulu-pet.git
git push -u origin main
```

仓库根必须有 `package.json`（含 `dsh.bundle.patch`）与 `cordis.patch.yml`——本目录已经满足。

## 2. （可选）发 npm

插件市场索引只收录 **npm 上有已知版本** 的插件；只放 GitHub 的条目也能安装，但不会出现在「按 npm 发现」的索引里。

```bash
npm login                       # 需要 npm 账号
npm publish --access public     # 包名 dsh-lulu-pet，先确认没被占用
```

> 本机没有 `npm` 可执行文件；可用 `npx pnpm publish --access public` 或临时装一份 npm。

## 3. 向 awesome-dsh-plugin 提 PR（这是「上架市场」唯一要做的事）

插件市场（dshmarket）的目录来自 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。加**一个 YAML 文件**即可：

`data/plugins/<owner>__<repo>.yml`：

```yaml
url: https://github.com/xyk0729/dsh-lulu-pet
name: xyk0729/dsh-lulu-pet
category: fun
description:
  en: A transparent capybara desktop pet that idles, waves, follows drags and pops sticker memes inside the Harness window.
  zh: 一只住在 Harness 窗口里的透明小水豚：会待机小动作、点击回应、被拖来拖去，还会冒表情包。
icon: https://raw.githubusercontent.com/xyk0729/dsh-lulu-pet/main/assets/icon-180.png
```

然后 fork、加文件、提 PR。合并后站点与市场会在一天内自动收录（README 由脚本生成，**不要手改**）。

## 4. 验收

- 市场页搜索 `dsh-lulu-pet`，卡片图标/截图/描述正确；
- 在另一个 profile 里 `dsh plugin --profile web add dsh-lulu-pet` 能装上；
- 装好后刷新页面，右下角出现噜噜，设置里出现「噜噜桌宠」。

## 备注

- `engines.dsh` 写成 `>=0.2.1`，因为用到了 `shell.overlay` / `settings.section` 插槽与 `dsh.bundle` 清单。
- 素材授权：角色与表情来自「水豚噜噜」公开内容，仅个人使用；公开上架前请确认授权，或换成自有素材。
