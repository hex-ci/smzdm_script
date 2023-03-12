# 自用脚本 for 青龙面板

## 脚本内容

* 每日签到
* 每日抽奖
  * 生活频道转盘抽奖
  * 值会员转盘抽奖
* 每日任务
  * 浏览文章
  * 收藏文章
  * 分享
  * 免费抽奖
  * 关注用户
  * 关注栏目
  * 限时累计活动

## 使用方法

### 青龙拉库

```bash
ql repo https://github.com/hex-ci/smzdm_script.git "" "env.js|bot.js|sendNotify.js" "env.js|bot.js|sendNotify.js"
```

建议自行更改青龙面板的脚本执行时间

### 抓包

建议使用 Android 手机抓包（iOS 也可以）`https://user-api.smzdm.com/checkin` 链接，把*所有* Cookie 取出来放到青龙面板的 SMZDM_COOKIE 环境变量中，多用户请添加多个同名环境变量或者用 `&` 符号分隔。

如果手机实在抓不到，也可以用浏览器的 Cookie，但是强烈建议使用手机端的 Cookie。

## 交流

https://t.me/smzdm_script

## 注意事项

本仓库发布的脚本及其中涉及的任何解密分析脚本，仅用于测试和学习研究，禁止用于商业用途，不能保证其合法性，准确性，完整性和有效性，请根据情况自行判断。本项目内所有资源文件，禁止任何公众号、自媒体进行任何形式的转载、发布。您必须在下载后的 24 小时内从计算机或手机中完全删除以上内容。
