# 什么值得买每日签到脚本

<p align="center">
    <img src="https://img.shields.io/github/license/chasing66/smzdm_bot">
    <img src="https://img.shields.io/badge/python-v3.9-orange"/>
    <img src="https://img.shields.io/github/last-commit/chasing66/smzdm_bot">
    <img src="https://img.shields.io/github/languages/code-size/chasing66/smzdm_bot">
</p>

## 1. 实现功能

- `什么值得买`每日签到
- 通过`pushplus`推送运行结果到微信

## 2. 使用方法

1. Fork[此仓库项目](https://github.com/chasing66/smzdm_bot)>点击右上角 Fork 按钮即可, 欢迎点`star`~
2. Secret 新增`COOKIE`, 填入[什么值得买官网](https://www.smzdm.com/)获取的 Cookie 信息, [详见](#31-cookie获取方法)
3. (可选) Secret 新增`PUSH_PLUS_TOKEN`用于推送通知, [详见](https://www.pushplus.plus/)
4. 设置环境变量

```bash
export SMZDM_COOKIE=xxxx
export PUSH_PLUS_TOKEN=xxxx
```

## 3. 其它

### 3.1 Cookie 获取方法

- 使用 Chrome 浏览器访问[什么值得买官网](https://www.smzdm.com/), 登录账号
- 打开开发者工具 (Windows 快捷键`F12`, MacOS 快捷键`option + command + i`)
- 选择 Network, 刷新页面, 选择第一个`www.smzdm.com`, 找到`Requests Headers`里的`Cookie`
