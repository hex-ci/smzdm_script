# 什么值得买每日签到脚本 2023 for 青龙面板

## 使用方法

### 青龙拉库

```bash
ql repo https://github.com/hex-ci/smzdm_script.git "smzdm_checkin.py" "" "" "" "py"
```

建议更改定时为随机时间

### 抓包

尽量使用 Android 手机抓包 `https://user-api.smzdm.com/checkin` 链接，把 cookie 取出来放到青龙面板的 SMZDM_COOKIE 环境变量中，多用户请添加多个同名环境变量即可。

建议使用自己 Android 手机的 user agent，可以添加 SMZDM_USER_AGENT 环境变量，否则使用脚本默认 user agent。
