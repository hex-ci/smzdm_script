# 自用脚本 for 青龙面板

[![Node.js CI](https://github.com/hex-ci/smzdm_script/actions/workflows/node.js.yml/badge.svg)](https://github.com/hex-ci/smzdm_script/actions/workflows/node.js.yml)

## 脚本内容

* 每日签到
* 每日抽奖
  * 生活频道转盘抽奖
  * 值会员转盘抽奖
* 每日任务（指的是签到页面中的任务）
  * 浏览文章
  * 收藏文章
  * 点赞文章
  * 评论文章
  * 分享
  * 抽奖
    * 免费抽奖
    * 5 碎银子抽奖
  * 关注用户
  * 关注栏目
  * 关注品牌
  * 限时累计活动
* 全民众测能量值任务

## 使用方法

### 青龙拉库

```bash
ql repo https://github.com/hex-ci/smzdm_script.git "smzdm_" "" "env.js|bot.js|sendNotify.js|library_" "main"
```

建议自行更改青龙面板的脚本执行时间

### NodeJS 依赖

* crypto-js

### 抓包

建议使用 Android 手机抓包（iOS 也可以）域名为 `user-api.smzdm.com` 的任意链接，把**所有** Cookie 取出来放到青龙面板的 `SMZDM_COOKIE` 环境变量中，多用户请添加多个同名环境变量或者用 `&` 符号分隔。

如果手机实在抓不到，也可以用浏览器的 Cookie，但是强烈建议使用手机端的 Cookie。

#### 抓包教程

以下教程请大家自行尝试，本人没有亲自尝试，如有问题可以进群交流。

* https://www.jianshu.com/p/5e5524868442
* https://www.zqh.plus/2022/03/19/Android-Capture/
* https://jishuin.proginn.com/p/763bfbd5f92e
* https://juejin.cn/post/7091524392005566471
* https://www.caq98i.top/article/?page=38

### 青龙环境变量

环境变量请使用环境变量列表直接添加，不要使用 `export xxx=""` 这种方式添加环境变量。

* `SMZDM_COOKIE`: 抓包抓到的 Cookie 内容，需要所有 Cookie 内容，多用户可以用 `&` 分隔，或者使用多个同名环境变量。
* `SMZDM_SK`: 这个值是可选值，会自动计算，如果你一定想用自己的，可以抓取，是从安卓 App 的 `https://user-api.smzdm.com/checkin` 请求参数中抓包抓到的，多用户可以用 `&` 分隔，或者使用多个同名环境变量，顺序要保持与 `SMZDM_COOKIE` 多用户顺序一致。
* `SMZDM_USER_AGENT_APP`: 这个值是可选值，是指 APP 的 User-Agent，从 APP 的 API 请求头中抓包得到，建议抓取 Android 的 User-Agent，不填使用脚本默认值。
* `SMZDM_USER_AGENT_WEB`: 这个值是可选值，是指 APP 中访问网页的 User-Agent，一般在 APP 内的转盘网页中抓包得到，建议抓取 Android 的 User-Agent，不填使用脚本默认值。
* `SMZDM_COMMENT`: 如果要完成评论文章的任务请设置这个环境变量，环境变量的内容是评论的文案，文案要大于 10 个汉字，建议用比较个性化的文案，脚本发布评论后会删除这条评论，但是为防止删除失败的情况，请尽量用好一点的文案，防止被判定为恶意灌水。
* `SMZDM_CROWD_SILVER_5`: 每日抽奖任务默认只进行免费抽奖，如要进行 5 碎银子的抽奖，请设置这个环境变量的值为 `yes`，请注意，只有在没有免费抽奖的时候，才会执行非免费抽奖，而且，这个抽奖不是转盘抽奖。
* `SMZDM_CROWD_KEYWORD`: 抽奖关键词，执行非免费抽奖时，会优先选择包含此关键词的抽奖，如果未找到包含此关键词的抽奖，则会随机选择一个。
* `SMZDM_TASK_TESTING`: 是否运行全民众测能量值任务，如要运行此任务，请设置这个环境变量的值为 `yes`，否则不运行。

## 交流群

https://t.me/smzdm_script

## 推荐🐔场

自用🐔场，稳定，线路多，速度快，[点这里注册](https://xsus.wiki/#/register?code=GMsubu2k)

## 其它说明

使用本脚本可能会造成你的账号临时或永久封禁，请自行评估是否使用本脚本。

## 注意事项

本仓库发布的脚本及其中涉及的任何解密分析脚本，仅用于测试和学习研究，禁止用于商业用途，不能保证其合法性，准确性，完整性和有效性，请根据情况自行判断。本项目内所有资源文件，禁止任何公众号、自媒体进行任何形式的转载、发布。您必须在下载后的 24 小时内从计算机或手机中完全删除以上内容。
