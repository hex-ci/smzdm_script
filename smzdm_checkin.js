/*
什么值得买签到脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 10 8 * * *
*/

const Env = require('./env');
const { SmzdmBot, requestApi, removeTags, getEnvCookies } = require('./bot');
const notify = require('./sendNotify');

// ------------------------------------

const $ = new Env('什么值得买签到');

class SmzdmCheckinBot extends SmzdmBot {
  constructor(cookie, sk) {
    super(cookie);

    this.sk = sk ? sk.trim() : '';
  }

  async run() {
    const { msg: msg1 } = await this.checkin();

    const { msg: msg2 } = await this.allReward();

    const { msg: msg3 } = await this.extraReward();

    return `${msg1}${msg2}${msg3}`;
  }

  async checkin() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        touchstone_event: '',
        sk: this.sk || '1',
        token: this.token,
        captcha: ''
      }
    });

    if (isSuccess) {
      let msg = `⭐签到成功${data.data.daily_num}天
🏅金币: ${data.data.cgold}
🏅碎银: ${data.data.pre_re_silver}
🏅补签卡: ${data.data.cards}`;

      $.log('等候 3 秒获取信息\n');
      await $.wait(3000);

      const vip = await this.getVipInfo();

      if (vip) {
        msg += `\n🏅经验: ${vip.vip.exp_current}
🏅值会员等级: ${vip.vip.exp_level}
🏅值会员经验: ${vip.vip.exp_current_level}
🏅值会员有效期至: ${vip.vip.exp_level_expire}`;
      }

      $.log(`${msg}\n`);

      return {
        isSuccess,
        msg: `${msg}\n\n`
      };
    }
    else {
      $.log(`签到失败！${response}`);

      return {
        isSuccess,
        msg: '签到失败！'
      };
    }
  }

  async allReward() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin/all_reward', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      const msg1 = `${data.data.normal_reward.reward_add.title}: ${data.data.normal_reward.reward_add.content}`;
      const msg2 = `${data.data.normal_reward.gift.title}: ${data.data.normal_reward.gift.content_str}`;

      $.log(`${msg1}\n${msg2}\n`);

      return {
        isSuccess,
        msg: `${msg1}\n${msg2}\n\n`
      };
    }
    else {
      if (data.error_code != '4') {
        $.log(`查询奖励失败！${response}`);
      }

      return {
        isSuccess,
        msg: ''
      };
    }
  }

  async extraReward() {
    const isContinue = await this.isContinueCheckin();

    if (!isContinue) {
      const msg = '今天没有额外奖励';

      $.log(`${msg}\n`);

      return {
        isSuccess: false,
        msg: `${msg}\n`
      };
    }

    $.log('等候 5 秒');
    await $.wait(5000);

    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin/extra_reward', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      const msg = `${data.data.title}: ${removeTags(data.data.gift.content)}`;

      $.log(msg);

      return {
        isSuccess: true,
        msg: `${msg}\n`
      };
    }
    else {
      $.log(`领取额外奖励失败！${response}`);

      return {
        isSuccess: false,
        msg: ''
      };
    }
  }

  async isContinueCheckin() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin/show_view_v2', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      const result = data.data.rows.find(item => item.cell_type == '18001');

      return result.cell_data.checkin_continue.continue_checkin_reward_show;
    }
    else {
      $.log(`查询是否有额外奖励失败！${response}`);

      return false;
    }
  }

  async getVipInfo() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/vip', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token
      }
    });

    if (isSuccess) {
      return data.data;
    }
    else {
      $.log(`查询信息失败！${response}`);

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

  let sks = [];

  if (process.env.SMZDM_SK) {
    if (process.env.SMZDM_SK.indexOf('&') > -1) {
      sks = process.env.SMZDM_SK.split('&');
    }
    else if (process.env.SMZDM_SK.indexOf('\n') > -1) {
      sks = process.env.SMZDM_SK.split('\n');
    }
    else {
      sks = [process.env.SMZDM_SK];
    }
  }

  let notifyContent = '';

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];

    if (!cookie) {
      continue;
    }

    const sk = sks[i];

    if (i > 0) {
      $.log('\n延迟 10 秒执行\n');
      await $.wait(10000);
    }

    const sep = `\n****** 账号${i + 1} ******\n`;

    $.log(sep);

    const bot = new SmzdmCheckinBot(cookie, sk);
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
