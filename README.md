# 什么值得买每日签到脚本

<p>
    <img src="https://img.shields.io/github/license/Chasing66/smzdm_bot">
    <img src="https://img.shields.io/badge/python-v3.9-orange"/>
    <img src="https://img.shields.io/github/last-commit/Chasing66/smzdm_bot">
    <img src="https://img.shields.io/github/languages/code-size/Chasing66/smzdm_bot">
</p>

## 1. 实现功能

- `什么值得买`每日签到
- Github Action 定时执行, **务必自行更改为随机时间**
- 本地 Docker 定时运行
- 通过`pushplus`推送运行结果到微信(不推荐)
- 通过`server酱`推送运行结果到微信
- 通过`telegram bot`推送
- 自定义反代`Telegram Bot API`, [搭建教程](https://anerg.com/2022/07/25/reverse-proxy-telegram-bot-api-using-cloudflare-worker.html)

## 2. 使用方法

### 2.1 Git Action 运行

**务必自行更改为随机时间**

1. Fork[此仓库项目](https://github.com/Chasing66/smzdm_bot)>, 欢迎`star`~
2. 修改 `.github/workflows/docker-run.yml`里的下面部分, 取消`schedule`两行的注释，自行设定时间

```yaml
# UTC时间，对应Beijing时间 9：30
schedule:
  - cron: "30 1 * * *"
```

3. Secret 新增`ANDROID_COOKIE`,`SK` ,`USER_AGENT`，`TOKEN` [方法详见](#31-手机抓包)
4. (可选) Secret 新增`PUSH_PLUS_TOKEN`用于推送通知, [详见](https://www.pushplus.plus/)
5. (可选) Secret 新增`SC_KEY`用于推送通知, [详见](https://sct.ftqq.com/)
6. (可选) Secret 新增`TG_BOT_TOKEN` 和`TG_USER_ID`用于推送通知
7. (可选) Secret 新增`TG_BOT_API`用于自定义反代的`Telegram Bot API`

### 2.2 本地运行

复制`config/config_example.toml`为`config/config.toml`，并按照需求配置

### 2.3 本地 docker 运行

见`docker-compose.yml`

本地生成一个`.env` 文件, 用于配置 docker-compose.yml 运行所需要的环境变量， 如下:

```
# Cookie
USER_AGENT = ""
ANDROID_COOKIE = ""
SK = ""
TOKEN = ""

# Notification
PUSH_PLUS_TOKEN = ""
SC_KEY = ""
TG_BOT_TOKEN = ""
TG_USER_ID = ""

# 定时设定(可选)， 若未设定则随机定时执行
SCH_HOUR=
SCH_MINUTE=
```

## 3. 其它

### 3.1 手机抓包

抓包工具可使用 HttpCanary，教程参考[HttpCanary 抓包](https://juejin.cn/post/7177682063699968061)

1. 按照上述教程配置好 HttpCanary
2. 开始抓包，并打开什么值得买 APP
3. 过滤域名为`user-api.smzdm.com`的 post 请求

## 更新日志

- 2022-12-08, 签到失败，浏览器端签到需要滑动验证码认证
- 2023-01-11, 更改`User-Agent`为`iPhone`后可`bypass`滑块认证
- 2023-01-14, 登录认证失败, 签到失效
- 2023-02-18, 通过安卓端验证登录，感谢[jzksnsjswkw/smzdm-app](https://github.com/jzksnsjswkw/smzdm-app)的思路。旧版代码查看[old](https://github.com/Chasing66/smzdm_bot/tree/old)分支
