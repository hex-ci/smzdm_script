/*
smzdm 每日任务脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 14 * * *
*/

const Env = require('./env');
const {
  requestApi,
  removeTags,
  getEnvCookies,
  wait,
  waitHuman,
  IS_INSTALL_ZHANGDAMA
} = require('./bot');
const notify = require('./sendNotify');
const { SmzdmTaskBot } = require('./library_task');

// ------------------------------------

const $ = new Env('smzdm 每日任务');

class SmzdmNormalTaskBot extends SmzdmTaskBot {
  constructor(cookie) {
    super(cookie, $);
  }

  // 主函数
  async run() {
    $.log('获取任务列表');

    const { tasks } = await this.getTaskList();

    await waitHuman(5, 10);

    let notifyMsg = '';

    notifyMsg = await this.doTasks(tasks);

    $.log('查询是否有限时累计活动阶段奖励');
    await waitHuman(5, 15);

    // 领取活动奖励
    const { detail } = await this.getTaskList();

    if (detail.cell_data && detail.cell_data.activity_reward_status == '1') {
      $.log('有奖励，领取奖励');
      await waitHuman(5, 15);

      const { isSuccess } = await this.receiveActivity(detail.cell_data);

      notifyMsg += `${isSuccess ? '🟢' : '❌'}限时累计活动阶段奖励领取${isSuccess ? '成功' : '失败！请查看日志'}\n`;
    }
    else {
      $.log('无奖励');
    }

    return notifyMsg || '无可执行任务';
  }

  // 获取任务列表
  async getTaskList() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/list_v2', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        is_install_zhangdama: IS_INSTALL_ZHANGDAMA
      }
    });

    if (isSuccess) {
      let tasks = [];

      if (data.data.rows[0]?.cell_data?.activity_task?.default_list_v2) {
        data.data.rows[0].cell_data.activity_task.default_list_v2.forEach(item => {
          tasks = tasks.concat(item.task_list);
        });

        return {
          tasks: tasks,
          detail: data.data.rows[0]
        };
      }
      else {
        $.log(`任务列表获取失败！${response}`);

        return {
          tasks: [],
          detail: {}
        };
      }
    }
    else {
      $.log(`任务列表获取失败！${response}`);

      return {
        tasks: [],
        detail: {}
      };
    }
  }

  // 领取活动奖励
  async receiveActivity(activity) {
    $.log(`领取奖励: ${activity.activity_name}`);

    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/activity_receive', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        activity_id: activity.activity_id
      }
    });

    if (isSuccess) {
      $.log(removeTags(data.data.reward_msg));

      return {
        isSuccess
      };
    }
    else {
      $.log(`领取奖励失败！${response}`);

      return {
        isSuccess
      };
    }
  }

  // 领取任务奖励
  async receiveReward(taskId) {
    const robotToken = await this.getRobotToken();

    if (robotToken === false) {
      return {
        isSuccess,
        msg: '领取任务奖励失败！'
      };
    }

    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/activity_task_receive', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        robot_token: robotToken,
        geetest_seccode: '',
        geetest_validate: '',
        geetest_challenge: '',
        captcha: '',
        task_id: taskId
      }
    });

    if (isSuccess) {
      const msg = removeTags(data.data.reward_msg);

      $.log(msg);

      return {
        isSuccess,
        msg
      };
    }
    else {
      $.log(`领取任务奖励失败！${response}`);

      return {
        isSuccess,
        msg: '领取任务奖励失败！'
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

    const bot = new SmzdmNormalTaskBot(cookie);
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
