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
  constructor(cookie) {
    super(cookie);
  }

  async run() {
    const { msg } = await this.checkin();

    await this.allReward();

    await this.extraReward();

    return msg;
  }

  async checkin() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        touchstone_event: '',
        sk: '1',
        token: this.token,
        captcha: ''
      }
    });

    if (isSuccess) {
      const msg = `⭐签到成功${data.data.daily_num}天
🏅金币: ${data.data.cgold}
🏅碎银: ${data.data.pre_re_silver}
🏅积分: ${data.data.cpoints}
🏅经验: ${data.data.cexperience}
🏅等级: ${data.data.rank}
🏅补签卡: ${data.data.cards}`;

      $.log(`${msg}\n`);

      return {
        isSuccess,
        msg
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
      $.log(`${data.data.normal_reward.reward_add.title}: ${data.data.normal_reward.reward_add.content}`);
      $.log(`${data.data.normal_reward.gift.title}: ${data.data.normal_reward.gift.content_str}\n`);
    }
    else {
      if (data.error_code != '4') {
        $.log(`查询奖励失败！${response}`);
      }
    }

    return {
      isSuccess
    };
  }

  async extraReward() {
    const isContinue = await this.isContinueCheckin();

    if (!isContinue) {
      $.log('今天没有额外奖励\n');

      return false;
    }

    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin/extra_reward', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      $.log(`${data.data.title}: ${removeTags(data.data.gift.content)}`);

      return true;
    }
    else {
      $.log(`领取额外奖励失败！${response}`);

      return false;
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

    const sep = `\n****** 账号${i + 1} ******\n`;

    $.log(sep);

    const bot = new SmzdmCheckinBot(cookie);
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
