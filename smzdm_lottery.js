/*
什么值得买抽奖脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 10 8 * * *
*/

const Env = require('./env');
const notify = require('./sendNotify');

const $ = new Env('什么值得买抽奖');

let cookiesArr = [];

// 判断环境变量里面是否有 cookie
if (process.env.SMZDM_COOKIE) {
  if (process.env.SMZDM_COOKIE.indexOf('&') > -1) {
    cookiesArr = process.env.SMZDM_COOKIE.split('&');
  } else if (process.env.SMZDM_COOKIE.indexOf('\n') > -1) {
    cookiesArr = process.env.SMZDM_COOKIE.split('\n');
  } else {
    cookiesArr = [process.env.SMZDM_COOKIE];
  }
}

// 每日抽奖
async function lottery(cookie) {
  let activeId = '';

  try {
    const resp = await $.http.get({
      url: "https://m.smzdm.com/zhuanti/life/choujiang/",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        Connection: "keep-alive",
        Host: "m.smzdm.com",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/smzdm 10.4.25 rv:93.4 (iPhone13,4; iOS 14.5; zh_CN)/iphone_smzdmapp/10.4.25/wkwebview/jsbv_1.0.0",
        Cookie: cookie
      }
    });

    let _activeId = /name\s?=\s?\"lottery_activity_id\"\s+value\s?=\s?\"([a-zA-Z0-9]*)\"/.exec(resp.body);
    if (_activeId) {
      activeId = _activeId[1];
    } else {
      $.log(`获取每日抽奖activeId失败`);
    }

    if (!!activeId) {
      const resp = await $.http.get({
        url: `https://zhiyou.smzdm.com/user/lottery/jsonp_draw?callback=jQuery34109305207178886287_${new Date().getTime()}&active_id=${activeId}&_=${new Date().getTime()}`,
        headers: {
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "zh-cn",
          Connection: "keep-alive",
          Host: "zhiyou.smzdm.com",
          Referer: "https://m.smzdm.com/zhuanti/life/choujiang/",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/smzdm 10.4.25 rv:93.4 (iPhone13,4; iOS 14.5; zh_CN)/iphone_smzdmapp/10.4.25/wkwebview/jsbv_1.0.0",
          Cookie: cookie
        }
      });

      let data = /\((.*)\)/.exec(resp.body);
      let obj = JSON.parse(data[1]);
      if (
        obj["error_code"] === 0 ||
        obj["error_code"] === 1 ||
        obj["error_code"] === 4
      ) {
        return obj["error_msg"];
      } else {
        $.log(`每日抽奖失败，接口响应异常：${data}`);
        return "每日抽奖失败，接口响应异常";
      }
    }
  } catch (error) {
    $.log(`每日抽奖失败，${error}`);
    return "每日抽奖失败，接口响应异常";
  }
}

!(async () => {
  if (!cookiesArr[0]) {
    $.log('\n请先设置 SMZDM_COOKIE 环境变量');
    return;
  }

  let notifyContent = '';

  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      if (i > 0) {
        $.log('\n延时 5 秒执行\n');
        await $.wait(5000)
      }

      const cookie = cookiesArr[i];
      const sep = `\n******开始账号${i + 1}******\n`;

      const msg = await lottery(cookie);

      notifyContent += sep + msg + "\n";

      $.log(sep + msg + "\n");
    }
  }

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
