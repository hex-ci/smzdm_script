# 什么值得买每日签到脚本

<p>
    <img src="https://img.shields.io/github/license/Chasing66/smzdm_bot">
    <img src="https://img.shields.io/badge/python-v3.9-orange"/>
    <img src="https://img.shields.io/github/last-commit/Chasing66/smzdm_bot">
    <img src="https://img.shields.io/github/languages/code-size/Chasing66/smzdm_bot">
</p>

## 1. 实现功能

- `什么值得买`每日签到
- Github Action(两种配置方式，直接运行或者调用 Docker 运行)
- 本地 Docker 定时运行
- 通过`pushplus`推送运行结果到微信(不推荐)
- 通过`server酱`推送运行结果到微信
- 通过`telegram bot`推送
- 自定义反代`Telegram Bot API`, [搭建教程](https://anerg.com/2022/07/25/reverse-proxy-telegram-bot-api-using-cloudflare-worker.html)

## 2. 使用方法

### 2.1 Git action 运行

1. Fork[此仓库项目](https://github.com/Chasing66/smzdm_bot)>点击右上角 Fork 按钮即可, 欢迎点`star`~
2. 修改 `.github/workflows/run.yml`里的下面部分, 取消注释，修改为你自己的时间

```bash
name: "SMZDM Check-in Bot"

on:
  workflow_dispatch:

  schedule:
    - cron: "0 18 * * *"
```

3. Secret 新增`SMZDM_COOKIE`, 填入[什么值得买官网](https://www.smzdm.com/)获取的 Cookie 信息, [详见](#31-Cookie获取方法)
4. (可选) Secret 新增`PUSH_PLUS_TOKEN`用于推送通知, [详见](https://www.pushplus.plus/)
5. (可选) Secret 新增`SC_KEY`用于推送通知, [详见](https://sct.ftqq.com/)
6. (可选) Secret 新增`TG_BOT_TOKEN` 和`TG_USER_ID`用于推送通知
7. (可选) Secret 新增`TG_BOT_API`用于自定义反代的`Telegram Bot API`

### 2.2 本地运行

配置`config.toml`运行, 生成`config/config_example.toml`并按照需求配置

```
cp config/config_example.toml config/config.toml
```

### 2.3 本地 docker 运行

见`docker-compose.yml`

本地生成一个`.env` 文件, 用于配置 docker-compose.yml 运行所需要的环境变量， 如下:

```
SMZDM_COOKIE=__ckguid=
PUSH_PLUS_TOKEN=
SC_KEY=
TG_BOT_TOKEN=
TG_USER_ID=
# 定时设定(可选)， 若没有设定则随机定时执行
SCH_HOUR=
SCH_MINUTE=
```

### 2.4 使用 Cookie Editor

也可以使用浏览器扩展 [Cookie Editor](https://microsoftedge.microsoft.com/addons/detail/cookie-editor/oaaopmblghnnjfgbgmflnkjkilhihdpb)导出 cookies, 另存为`cookies.json`在项目的根目录

## 3. 其它

### 3.1 Cookie 获取方法

- 使用 Chrome 浏览器访问[什么值得买官网](https://www.smzdm.com/), 登录账号
- 打开开发者工具 (Windows 快捷键`F12`, MacOS 快捷键`option + command + i`)
- 选择 Network, 刷新页面, 选择第一个`www.smzdm.com`, 找到`Requests Headers`里的`Cookie`

### 3.2 连续签到后突然失败

Cookies 的有效期暂时未知，测试反馈的结果是签到 90 天左右后开始签到失败，此时需要从电脑浏览器端从新签到一次，并更新 cookies
