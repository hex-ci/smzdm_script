/*
smzdm 抽奖脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 8 * * *
*/

const Env = require('./env');
const { SmzdmBot, requestApi, parseJSON, getEnvCookies, wait } = require('./bot');
const notify = require('./sendNotify');

// ------------------------------------

const $ = new Env('smzdm 抽奖');

class SmzdmLotteryBot extends SmzdmBot {
  constructor(cookie) {
    super(cookie);
  }

  async run() {
    let notifyMsg = '';

    const lifeId = await this.getActivityIdFromLife();

    if (lifeId) {
      await wait(3, 10);

      notifyMsg += `转盘抽奖ID: ${lifeId}\n`;
      notifyMsg += await this.draw(lifeId);
      notifyMsg += '\n\n';
    }

    $.log();
    await wait(5, 15);
    $.log();

    const vipId = await this.getActivityIdFromVip();

    if (vipId) {
      await wait(3, 10);

      notifyMsg += `转盘抽奖ID: ${vipId}\n`;
      notifyMsg += await this.draw(vipId);
    }

    return notifyMsg;
  }

  async draw(id) {
    const { isSuccess, data, response } = await requestApi('https://zhiyou.smzdm.com/user/lottery/jsonp_draw', {
      sign: false,
      parseJSON: false,
      headers: {
        ...this.getHeadersForWeb(),
        'x-requested-with': 'com.smzdm.client.android',
        Referer: 'https://m.smzdm.com/'
      },
      data: {
        active_id: id,
        callback: `jQuery34107538452897131465_${new Date().getTime()}`
      }
    });

    if (isSuccess) {
      const match = data.match(/\((.*)\)/);

      if (match) {
        const result = parseJSON(match[1]);

        if (result.error_code == 0 || result.error_code == 1 || result.error_code == 4) {
          $.log(result.error_msg);

          return result.error_msg;
        }
        else {
          $.log(`转盘抽奖失败，接口响应异常：${response}`);

          return '转盘抽奖失败，接口响应异常';
        }
      }
      else {
        $.log(`转盘抽奖失败，接口响应异常: ${response}`);

        return '转盘抽奖失败，接口响应异常';
      }
    }
    else {
      $.log(`转盘抽奖失败，接口响应异常: ${response}`);

      return '转盘抽奖失败，接口响应异常';
    }
  }

  // 获取生活频道转盘抽奖ID
  async getActivityIdFromLife() {
    const { isSuccess, data, response } = await requestApi('https://m.smzdm.com/zhuanti/life/choujiang/', {
      sign: false,
      parseJSON: false,
      headers: {
        ...this.getHeadersForWeb(),
        'x-requested-with': 'com.smzdm.client.android'
      }
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

  // 获取会员中心转盘抽奖ID
  async getActivityIdFromVip() {
    const { isSuccess, data, response } = await requestApi('https://m.smzdm.com/topic/zhyzhuanpan/cjzp/', {
      sign: false,
      parseJSON: false,
      headers: {
        ...this.getHeadersForWeb(),
        'x-requested-with': 'com.smzdm.client.android'
      }
    });

    if (isSuccess) {
      const match = data.match(/\\"hashId\\":\\"([^\\]+)\\"/i);

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
      $.log();
      await wait(10, 30);
      $.log();
    }

    const sep = `\n****** 账号${i + 1} ******\n`;

    $.log(sep);

    const bot = new SmzdmLotteryBot(cookie);
    const msg = await bot.run();

    notifyContent += sep + msg + '\n';
  }

  $.log();

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
