/*
smzdm 全民众测能量值任务脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 15 * * *
*/

const Env = require('./env');
const { requestApi, getEnvCookies, wait, waitHuman } = require('./bot');
const notify = require('./sendNotify');
const { SmzdmTaskBot } = require('./library_task');

// ------------------------------------

const $ = new Env('smzdm 全民众测能量值任务');

class SmzdmTestingTaskBot extends SmzdmTaskBot {
  constructor(cookie) {
    super(cookie, $);
  }

  // 主函数
  async run() {
    let notifyMsg = await this.doTestingTasks();

    await waitHuman(5, 10);

    notifyMsg += await this.getEnergyList();

    await waitHuman(5, 10);

    notifyMsg += await this.getWinCouponList();

    return notifyMsg;
  }

  // 执行众测能量值任务
  async doTestingTasks() {
    const activityId = await this.getTestingActivityId();

    if (!activityId) {
      return this.wafBlocked ? '🟡众测任务未执行：接口被 WAF/风控拦截\n' : '';
    }

    await waitHuman(5, 10);

    const activityInfo = await this.getTestingActivityInfo(activityId);

    if (!activityInfo) {
      return '';
    }

    await waitHuman(5, 10);

    return await this.doTasks(activityInfo.activity_task.default_list);
  }

  // 众测接口被 WAF 拦时返回 403、429 或 HTML 验证码页，不是 JSON
  isWafBlocked(response) {
    return /WAF|验证码|<!DOCTYPE html>|<script|Response code 40[13]|Response code 429|ECONNRESET|ETIMEDOUT/i.test(String(response));
  }

  // 请求众测接口，被 WAF 拦时置标记并返回 false
  async requestTestingApi(url, data) {
    const { response } = await requestApi(url, {
      method: 'get',
      data,
      headers: {
        ...this.getHeadersForWeb(),
        Origin: 'https://test.m.smzdm.com',
        Referer: 'https://test.m.smzdm.com/'
      },
      parseJSON: false
    });

    if (this.isWafBlocked(response)) {
      this.wafBlocked = true;

      $.log('🔴众测任务接口被 WAF 拦截，本次跳过众测任务');

      return false;
    }

    try {
      const json = JSON.parse(response);

      if (json.error_code == '0') {
        return json.data;
      }

      $.log(`众测接口返回错误：${json.error_msg}`);
    }
    catch (e) {
      $.log(`众测接口返回异常：${String(response).slice(0, 150)}`);
    }

    return false;
  }

  // 获取众测能量值任务的活动 ID
  async getTestingActivityId() {
    $.log('获取众测活动 ID');

    const data = await this.requestTestingApi('https://zhiyou.m.smzdm.com/task/task/ajax_get_activity_id', {
      'from': 'zhongce'
    });

    return data ? data.activity_id : false;
  }

  // 获取活动下的所有任务
  async getTestingActivityInfo(id) {
    $.log('获取众测活动信息');

    return await this.requestTestingApi('https://zhiyou.m.smzdm.com/task/task/ajax_get_activity_info', {
      'activity_id': id
    });
  }

  // 领取奖励
  async receiveReward(taskId) {
    const { isSuccess, response } = await requestApi('https://zhiyou.m.smzdm.com/task/task/ajax_activity_task_receive', {
      method: 'post',
      data: {
        'task_id': taskId
      },
      headers: this.getHeadersForWeb(),
      parseJSON: false
    });

    if (!this.isWafBlocked(response) && isSuccess) {
      $.log('领取成功！');

      return {
        isSuccess,
        msg: ''
      };
    }

    $.log(`领取任务奖励失败！${String(response).slice(0, 150)}`);

    return {
      isSuccess: false,
      msg: '领取任务奖励失败！'
    };
  }

  // 能量值数量、过期时间与明细
  async getEnergyList() {
    $.log('查询能量值');

    const { isSuccess, data, response } = await requestApi('https://test-api.smzdm.com/win_coupon/energy_list', {
      method: 'get',
      headers: this.getHeaders(),
      data: {
        'page': 1
      }
    });

    if (!isSuccess) {
      $.log(`查询能量值失败！${response}`);

      return '';
    }

    const myEnergy = data.data.my_energy || {};
    const list = data.data.list || [];

    let msg = `🏅能量值: ${myEnergy.my_energy_total}\n🏅能量值过期时间: ${myEnergy.energy_expired_time}\n`;

    if (list.length > 0) {
      msg += `🏅能量值明细:\n${list.map(item => `  ${item.article_title}`).join('\n')}\n`;
    }

    $.log(msg);

    return `${msg}\n`;
  }

  // 必中券列表
  async getWinCouponList() {
    $.log('查询必中券列表');

    const { isSuccess, data, response } = await requestApi('https://test-api.smzdm.com/win_coupon/win_coupon_list', {
      method: 'get',
      headers: this.getHeaders(),
      data: {
        'page': 1,
        'type': '0'
      }
    });

    if (!isSuccess) {
      $.log(`查询必中券列表失败！${response}`);

      return '';
    }

    const list = data.data.list || [];

    if (list.length < 1) {
      return '🏅暂无必中券\n';
    }

    const msg = `🏅必中券 ${list.length} 项:\n${list.map(item => `  ${item.article_title}`).join('\n')}\n`;

    $.log(msg);

    return msg;
  }
}

!(async () => {
  if (process.env.SMZDM_TASK_TESTING != 'yes') {
    $.log('\n🟡请设置 SMZDM_TASK_TESTING 环境变量值为 yes 后才能运行全民众测能量值任务！');

    return;
  }

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
