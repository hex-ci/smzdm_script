/*
smzdm 全民众测能量值任务脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 15 * * *
*/

const Env = require('./env');
const { requestApi, getEnvCookies, wait } = require('./bot');
const notify = require('./sendNotify');
const { SmzdmTaskBot } = require('./smzdm_task');

// ------------------------------------

const $ = new Env('smzdm 全民众测能量值任务');

class SmzdmTestingTaskBot extends SmzdmTaskBot {
  constructor(cookie) {
    super(cookie);
  }

  // 主函数
  async run() {
    const activityId = await this.getTestingActivityId();

    if (!activityId) {
      return '';
    }

    await wait(5, 10);

    const activityInfo = await this.getTestingActivityInfo(activityId);

    if (!activityInfo) {
      return '';
    }

    await wait(5, 10);

    let notifyMsg = await this.doTasks(activityInfo.activity_task.default_list);

    await wait(3, 5);

    // 查询当前拥有的能量数量, 以及过期时间
    let myTestingInfo = await this.getMyTestingInfo();

    if (myTestingInfo) {
      notifyMsg += `当前拥有必中券: ${myTestingInfo.my_energy.my_energy_total}\n必中券过期时间: ${myTestingInfo.my_energy.energy_expired_time}\n`;
    }

    return notifyMsg || '无可执行任务';
  }

  // 获取当前能量值任务的活动 ID
  async getTestingActivityId() {
    $.log('获取活动 ID');

    const { isSuccess, data, response } = await requestApi('https://zhiyou.m.smzdm.com/task/task/ajax_get_activity_id', {
      method: 'get',
      data: {
        'from': 'zhongce',
      },
      headers: {
        ...this.getHeadersForWeb(),
        Origin: 'https://test.m.smzdm.com',
        Referer: 'https://test.m.smzdm.com/',
      }
    });

    if (isSuccess) {
      return data.data.activity_id;
    }
    else {
      $.log(`获取活动 ID 失败！${response}`);

      return false;
    }
  }

  // 获取活动下的所有任务
  async getTestingActivityInfo(id) {
    $.log('获取活动信息');

    const { isSuccess, data, response } = await requestApi('https://zhiyou.m.smzdm.com/task/task/ajax_get_activity_info', {
      method: 'get',
      data: {
        'activity_id': id,
      },
      headers: this.getHeadersForWeb(),
    });

    if (isSuccess) {
      return data.data;
    }
    else {
      $.log(`获取活动信息失败！${response}`);

      return false;
    }
  }

  // 众测中心-必中券信息查询
  async getMyTestingInfo() {
    $.log('获取必中券信息');

    const { isSuccess, data, response } = await requestApi('https://test.m.smzdm.com/win_coupon/user_data', {
      method: 'get',
      headers: this.getHeadersForWeb(),
    });

    if (!isSuccess) {
      $.log(`获取个人必中券信息失败！${response}`);

      return null;
    }

    return data.data;
  }

  // 领取奖励
  async receiveReward(taskId) {
    const { isSuccess, response } = await requestApi('https://zhiyou.m.smzdm.com/task/task/ajax_activity_task_receive', {
      method: 'post',
      data: {
        'task_id': taskId,
      },
      headers: this.getHeadersForWeb(),
    });

    if (isSuccess) {
      return {
        isSuccess,
        msg: '',
      };
    }
    else {
      $.log(`领取任务奖励失败！${response}`);

      return {
        isSuccess,
        msg: '领取任务奖励失败！',
      };
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

    const bot = new SmzdmTestingTaskBot(cookie);
    const msg = await bot.run();

    notifyContent += `${sep}${msg}\n`;
  }

  $.log();

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
