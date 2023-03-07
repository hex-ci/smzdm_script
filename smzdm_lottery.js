/*
什么值得买抽奖脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 8 * * *
*/

const Env = require('./env');
const { SmzdmBot, requestApi, parseJSON, getEnvCookies } = require('./bot');
const notify = require('./sendNotify');

// ------------------------------------

const $ = new Env('什么值得买抽奖');

class SmzdmLotteryBot extends SmzdmBot {
  constructor(cookie) {
    super(cookie);
  }

  async run() {
    const activityId = await this.getActivityId();

    if (!activityId) {
      return {
        isSuccess: false
      };
    }

    const { isSuccess, data, response } = await requestApi('https://zhiyou.smzdm.com/user/lottery/jsonp_draw', {
      sign: false,
      parseJSON: false,
      headers: {
        ...this.getHeadersForWeb(),
        'x-requested-with': 'com.smzdm.client.android',
        Referer: 'https://m.smzdm.com/'
      },
      data: {
        active_id: activityId,
        callback: `jQuery34107538452897131465_${new Date().getTime()}`
      }
    });

    if (isSuccess) {
      const match = data.match(/\((.*)\)/);

      if (match) {
        const result = parseJSON(match[1]);

        if (result.error_code == 0 || result.error_code == 1 || result.error_code == 4) {
          return result.error_msg;
        }
        else {
          $.log(`每日抽奖失败，接口响应异常：${response}`);

          return '每日抽奖失败，接口响应异常';
        }
      }
      else {
        $.log(`每日抽奖失败，接口响应异常: ${response}`);

        return '每日抽奖失败，接口响应异常';
      }
    }
    else {
      $.log(`每日抽奖失败，接口响应异常: ${response}`);

      return '每日抽奖失败，接口响应异常';
    }
  }

  async getActivityId() {
    const { isSuccess, data, response } = await requestApi('https://m.smzdm.com/zhuanti/life/choujiang/', {
      sign: false,
      parseJSON: false,
      headers: this.getHeadersForWeb()
    });

    if (isSuccess) {
      const match = data.match(/name\s?=\s?"lottery_activity_id"\s+value\s?=\s?"([a-zA-Z0-9]*)"/i);

      if (match) {
        $.log(`转盘抽奖ID: ${match[1]}`);

        return match[1];
      }
      else {
        $.log(`未找到转盘抽奖ID`);

        return false;
      }
    }
    else {
      $.log(`获取转盘抽奖失败: ${response}`);

      return false;
    }
  }
}

!(async () => {
  const cookies = getEnvCookies();

  if (cookies === false) {
    $.log('\n请先设置 SMZDM_COOKIE 环境变量');

    return;
  }

  let notifyContent = '';

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];

    if (!cookie) {
      continue;
    }

    if (i > 0) {
      $.log('\n延迟 5 秒执行\n');
      await $.wait(5000);
    }

    const sep = `\n******账号${i + 1}******\n`;

    $.log(sep);

    const bot = new SmzdmLotteryBot(cookie);
    const msg = await bot.run();

    $.log(msg + '\n');

    notifyContent += sep + msg + '\n';
  }

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
