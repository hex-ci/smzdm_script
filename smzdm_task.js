/*
什么值得买任务脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 14 * * *
*/

const Env = require('./env');
const { SmzdmBot, requestApi, removeTags, getEnvCookies } = require('./bot');
const notify = require('./sendNotify');

// ------------------------------------

const $ = new Env('什么值得买任务');

class SmzdmTaskBot extends SmzdmBot {
  constructor(cookie) {
    super(cookie);
  }

  // 主函数
  async run() {
    const { tasks } = await this.getTaskList();

    let notifyMsg = '';

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // 待领取任务
      if (task.task_status == '3') {
        $.log(`领取[${task.task_name}]奖励:`);

        const { isSuccess } = await this.receiveReward(task.task_id);

        notifyMsg += `${isSuccess ? '🟢' : '❌'}领取[${task.task_name}]奖励${isSuccess ? '成功' : '失败！请查看日志'}\n`;

        $.log('等候 5 秒');
        await $.wait(5000);
      }
      // 未完成任务
      else if (task.task_status == '2') {
        // 浏览文章任务
        if (task.task_event_type == 'interactive.view.article') {
          const { isSuccess } = await this.doViewTask(task);

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${isSuccess ? '成功' : '失败！请查看日志'}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
        // 分享任务
        else if (task.task_event_type == 'interactive.share') {
          let result;

          if (task.article_id == '0') {
            result = await this.doShareTaskMulti(task);
          }
          else {
            result = await this.doShareTaskSingle(task);
          }

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${result.isSuccess ? '成功' : '失败！请查看日志'}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
        // 抽奖任务
        else if (task.task_event_type == 'guide.crowd') {
          const { isSuccess, msg } = await this.doCrowdTask(task);

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${isSuccess ? '成功' : `失败！${msg || '请查看日志'}`}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
        // 关注用户任务
        else if (task.task_event_type == 'interactive.follow.user') {
          const { isSuccess } = await this.doFollowUserTask(task);

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${isSuccess ? '成功' : '失败！请查看日志'}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
        // 关注栏目任务
        else if (task.task_event_type == 'interactive.follow.tag') {
          const { isSuccess } = await this.doFollowTagTask(task);

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${isSuccess ? '成功' : '失败！请查看日志'}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
        // 收藏任务
        else if (task.task_event_type == 'interactive.favorite') {
          const { isSuccess } = await this.doFavoriteTask(task);

          notifyMsg += `${isSuccess ? '🟢' : '❌'}完成[${task.task_name}]任务${isSuccess ? '成功' : '失败！请查看日志'}\n`;

          $.log('等候 5 秒');
          await $.wait(5000);
        }
      }
    }

    $.log('等候 5 秒查询是否有限时累计活动阶段奖励');
    await $.wait(5000);

    // 领取活动奖励
    const { detail } = await this.getTaskList();

    if (detail.cell_data && detail.cell_data.activity_reward_status == '1') {
      $.log('有奖励，等候 3 秒领取奖励');
      await $.wait(5000);

      const { isSuccess } = await this.receiveActivity(detail.cell_data);

      notifyMsg += `${isSuccess ? '🟢' : '❌'}限时累计活动阶段奖励领取${isSuccess ? '成功' : '失败！请查看日志'}\n`;
    }
    else {
      $.log('无奖励');
    }

    return notifyMsg || '无可执行任务';
  }

  // 执行收藏任务
  async doFavoriteTask(task) {
    $.log(`开始任务: ${task.task_name}`);

    let articleId = '';

    if (task.task_redirect_url.link_val == '0') {
      $.log('尚未支持');

      return {
        isSuccess: false
      };
    }
    else {
      articleId = task.task_redirect_url.link_val;
    }

    // 获取文章信息
    const articleDetail = await this.getArticleDetail(articleId);

    if (articleDetail === false) {
      return {
        isSuccess: false
      };
    }

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.favorite({
      method: 'destroy',
      id: articleId,
      channelId: articleDetail.channel_id
    });

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.favorite({
      method: 'create',
      id: articleId,
      channelId: articleDetail.channel_id
    });

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.favorite({
      method: 'destroy',
      id: articleId,
      channelId: articleDetail.channel_id
    });

    $.log('延迟 5 秒领取奖励');
    await $.wait(5000);

    return await this.receiveReward(task.task_id);
  }

  // 执行关注用户任务
  async doFollowUserTask(task) {
    $.log(`开始任务: ${task.task_name}`);

    // 随机选一个用户
    const user = await this.getUserByRandom();

    if (!user) {
      return {
        isSuccess: false
      };
    }

    $.log('等候 3 秒');
    await $.wait(3000);

    for (let i = 0; i < Number(task.task_even_num - task.task_finished_num); i++) {
      if (user.is_follow == '1') {
        await this.follow({
          method: 'destroy',
          type: 'user',
          keyword: user.keyword
        });

        $.log('等候 5 秒');
        await $.wait(3000);
      }

      await this.follow({
        method: 'create',
        type: 'user',
        keyword: user.keyword
      });

      $.log('等候 3 秒');
      await $.wait(3000);

      if (user.is_follow == '0') {
        await this.follow({
          method: 'destroy',
          type: 'user',
          keyword: user.keyword
        });
      }

      $.log('等候 5 秒');
      await $.wait(3000);
    }

    $.log('延迟 5 秒领取奖励');
    await $.wait(5000);

    return await this.receiveReward(task.task_id);
  }

  // 执行关注栏目任务（先取关，再关注，最后取关）
  async doFollowTagTask(task) {
    $.log(`开始任务: ${task.task_name}`);

    let lanmuId = '';

    if (task.task_redirect_url.link_val == '0') {
      const tag = await this.getTagByRandom();

      if (tag === false) {
        return {
          isSuccess: false
        };
      }

      lanmuId = tag.lanmu_id;

      $.log('等候 3 秒');
      await $.wait(3000);
    }
    else {
      lanmuId = task.task_redirect_url.link_val;
    }

    // 获取栏目信息
    const tagDetail = await this.getTagDetail(lanmuId);

    if (!tagDetail.lanmu_id) {
      $.log('获取栏目信息失败！');

      return {
        isSuccess: false
      };
    }

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.follow({
      method: 'destroy',
      type: 'tag',
      keywordId: tagDetail.lanmu_id,
      keyword: tagDetail.lanmu_info.lanmu_name
    });

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.follow({
      method: 'create',
      type: 'tag',
      keywordId: tagDetail.lanmu_id,
      keyword: tagDetail.lanmu_info.lanmu_name
    });

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.follow({
      method: 'destroy',
      type: 'tag',
      keywordId: tagDetail.lanmu_id,
      keyword: tagDetail.lanmu_info.lanmu_name
    });

    $.log('延迟 5 秒领取奖励');
    await $.wait(5000);

    return await this.receiveReward(task.task_id);
  }

  // 执行抽奖任务
  async doCrowdTask(task) {
    $.log(`开始任务: ${task.task_name}`);

    const { isSuccess, data } = await this.getFreeCrowd();

    if (!isSuccess) {
      return {
        isSuccess,
        msg: '未找到免费抽奖'
      };
    }

    $.log('等候 5 秒');
    await $.wait(5000);

    const result = await this.joinCrowd(data);

    if (!result.isSuccess) {
      return {
        isSuccess: result.isSuccess
      };
    }

    $.log('延迟 5 秒领取奖励');
    await $.wait(5000);

    return await this.receiveReward(task.task_id);
  }

  // 执行一篇文章的分享任务
  async doShareTaskSingle(task) {
    $.log(`开始任务: ${task.task_name}`);

    $.log(`开始分享文章...`);

    $.log('等候 5 秒');
    await $.wait(5000);

    await this.shareDailyReward(task.channel_id);
    await this.shareCallback(task.article_id, task.channel_id);

    $.log('等候 3 秒');
    await $.wait(3000);

    await this.shareArticleDone(task.article_id, task.channel_id);

    $.log('延迟 5 秒领取奖励');
    await $.wait(5000);

    return await this.receiveReward(task.task_id);
  }

  // 执行多篇文章的分享任务
  async doShareTaskMulti(task) {
    $.log(`开始任务: ${task.task_name}`);

    const articles = await this.getArticleList(task.task_even_num - task.task_finished_num);

    for (let i = 0; i < articles.length; i++) {
      $.log(`开始分享第 ${i + 1} 篇文章...`);

      const article = articles[i];

      $.log('等候 5 秒');
      await $.wait(3000);

      await this.shareDailyReward(article.article_channel_id);
      await this.shareCallback(article.article_id, article.article_channel_id);

      $.log('等候 3 秒');
      await $.wait(3000);

      await this.shareArticleDone(article.article_id, article.article_channel_id);

      $.log('等候 5 秒');
      await $.wait(5000);
    }

    $.log('延迟 3 秒领取奖励');
    await $.wait(3000);

    return await this.receiveReward(task.task_id);
  }

  // 执行浏览任务
  async doViewTask(task) {
    $.log(`开始任务: ${task.task_name}`);

    $.log('延迟 11 秒模拟阅读文章');
    await $.wait(11000);

    const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/task/event_view_article', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
        article_id: task.article_id,
        channel_id: task.channel_id
      }
    });

    if (isSuccess) {
      $.log('延迟 3 秒领取奖励');
      await $.wait(3000);

      return await this.receiveReward(task.task_id);
    }
    else {
      $.log(`任务异常！${response}`);

      return {
        isSuccess
      };
    }
  }

  // 领取活动奖励
  async receiveActivity(activity) {
    $.log(`领取活动奖励: ${activity.activity_name}`);

    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/activity_receive', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
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
      $.log(`领取活动奖励失败！${response}`);

      return {
        isSuccess
      };
    }
  }

  // 关注/取关
  async follow({keywordId, keyword, type, method}) {
    const { isSuccess, response } = await requestApi(`https://dingyue-api.smzdm.com/dingyue/${method}`, {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        touchstone_event: '{}',
        refer: '',
        keyword_id: keywordId,
        keyword,
        type
      }
    });

    if (isSuccess) {
      $.log(`${method} 关注成功: ${keyword}`);
    }
    else {
      $.log(`${method} 关注失败！${response}`);
    }

    return {
      isSuccess,
      response
    };
  }

  // 随机获取用户
  async getUserByRandom() {
    const { isSuccess, data, response } = await requestApi('https://dingyue-api.smzdm.com/tuijian/search_result', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        nav_id: 0,
        page: 1,
        type: 'user',
        time_code: ''
      }
    });

    if (isSuccess) {
      return data.data.rows[Math.floor(Math.random() * data.data.rows.length)];
    }
    else {
      $.log(`获取用户列表失败！${response}`);

      return false;
    }
  }

  // 参加抽奖
  async joinCrowd(id) {
    const { isSuccess, data, response } = await requestApi('https://zhiyou.m.smzdm.com/user/crowd/ajax_participate', {
      method: 'post',
      sign: false,
      headers: {
        ...this.getHeadersForWeb(),
        Origin: 'https://zhiyou.m.smzdm.com',
        Referer: `https://zhiyou.m.smzdm.com/user/crowd/p/${id}/`
      },
      data: {
        crowd_id: id,
        sourcePage: `https://zhiyou.m.smzdm.com/user/crowd/p/${id}/`,
        client_type: 'android',
        sourceRoot: '个人中心',
        sourceMode: '幸运屋抽奖',
        price_id: 1
      }
    });

    if (isSuccess) {
      $.log(removeTags(data.data.msg));
    }
    else {
      $.log(`参加免费抽奖失败: ${response}`);
    }

    return {
      isSuccess,
      response
    };
  }

  // 获取免费抽奖信息
  async getFreeCrowd() {
    const { isSuccess, data, response } = await requestApi('https://zhiyou.smzdm.com/user/crowd/', {
      sign: false,
      parseJSON: false,
      headers: this.getHeadersForWeb()
    });

    if (isSuccess) {
      const match = data.match(/<button\s+([^>]+?)>\s+?<div\s+[^>]+?>\s*免费抽奖\s*<\/div>\s+<span\s+class="reduceNumber">-0<\/span>[\s\S]+?<\/button>/i);

      if (match) {
        const matchCrowd = match[1].match(/data-crowd_id="(\d+)"/i);

        if (matchCrowd) {
          $.log(`免费抽奖ID: ${matchCrowd[1]}`);

          return {
            isSuccess: true,
            data: matchCrowd[1]
          };
        }
        else {
          $.log(`未找到免费抽奖ID`);

          return {
            isSuccess: false
          };
        }
      }
      else {
        $.log(`未找到免费抽奖`);

        return {
          isSuccess: false
        };
      }
    }
    else {
      $.log(`获取免费抽奖失败: ${response}`);

      return {
        isSuccess: false
      };
    }
  }

  // 分享完成，可以领取奖励了
  async shareArticleDone(articleId, channelId) {
    const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/share/complete_share_rule', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
        article_id: articleId,
        channel_id: channelId,
        tag_name: 'shouye'
      }
    });

    if (isSuccess) {
      $.log('完成分享成功。');

      return {
        isSuccess,
        msg: '完成分享成功。'
      };
    }
    else {
      $.log(`完成分享失败！${response}`);

      return {
        isSuccess: false,
        msg: '完成分享失败！'
      };
    }
  }

  // 分享完成后回调接口
  async shareCallback(articleId, channelId) {
    const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/share/callback', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
        article_id: articleId,
        channel_id: channelId,
        touchstone_event: '{}'
      }
    });

    if (isSuccess) {
      $.log('分享回调完成。');

      return {
        isSuccess,
        msg: ''
      };
    }
    else {
      $.log(`分享回调失败！${response}`);

      return {
        isSuccess,
        msg: '分享回调失败！'
      };
    }
  }

  // 分享的每日奖励（貌似没啥用）
  async shareDailyReward(channelId) {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/share/daily_reward', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
        channel_id: channelId
      }
    });

    if (isSuccess) {
      $.log(data.data.reward_desc);

      return {
        isSuccess,
        msg: data.data.reward_desc
      };
    }
    else {
      if (data) {
        $.log(data.error_msg);

        return {
          isSuccess,
          msg: data.error_msg
        };
      }
      else {
        $.log(`分享每日奖励请求失败！${response}`);

        return {
          isSuccess,
          msg: '分享每日奖励请求失败！'
        };
      }
    }
  }

  // 获取 Web 文章列表
  async getArticleList(num) {
    const { isSuccess, data, response } = await requestApi('https://article-api.smzdm.com/ranking_list/articles', {
      headers: this.getHeaders(),
      data: {
        offset: 0,
        channel_id: 76,
        tab: 2,
        order: 0,
        limit: 20,
        exclude_article_ids: '',
        stream: 'a',
        ab_code: 'b'
      }
    });

    if (isSuccess) {
      // 取前 num 个做任务
      return data.data.rows.slice(0, num);
    }
    else {
      $.log(`获取文章列表失败: ${response}`);
      return [];
    }
  }

  async getRobotToken() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/robot/token', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      return data.data.token;
    }
    else {
      $.log(`Robot Token 获取失败！${response}`);

      return false;
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

  // 获取任务列表
  async getTaskList() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/list_v2', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      let tasks = [];

      if (data.data.rows[0]) {
        data.data.rows[0].cell_data.activity_task.accumulate_list.task_list_v2.forEach(item => {
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

  // 获取栏目信息
  async getTagDetail(id) {
    const { isSuccess, data, response } = await requestApi('https://common-api.smzdm.com/lanmu/config_data', {
      headers: this.getHeaders(),
      data: {
        middle_page: '',
        tab_selects: '',
        redirect_params: id
      }
    });

    if (isSuccess) {
      return data.data;
    }
    else {
      $.log(`获取栏目信息失败！${response}`);

      return {};
    }
  }

  // 获取栏目列表
  async getTagByRandom() {
    const { isSuccess, data, response } = await requestApi('https://dingyue-api.smzdm.com/tuijian/search_result', {
      headers: this.getHeaders(),
      data: {
        time_code: '',
        nav_id: '',
        type: 'tag',
        limit: 20
      }
    });

    if (isSuccess) {
      return data.data.rows[Math.floor(Math.random() * data.data.rows.length)];
    }
    else {
      $.log(`获取栏目列表失败！${response}`);

      return false;
    }
  }

  // 获取文章详情
  async getArticleDetail(id) {
    const { isSuccess, data, response } = await requestApi(`https://article-api.smzdm.com/article_detail/${id}`, {
      headers: this.getHeaders(),
      data: {
        comment_flow: '',
        hashcode: '',
        lastest_update_time: '',
        uhome: 0,
        imgmode: 0,
        article_channel_id: 0,
        h5hash: ''
      }
    });

    if (isSuccess) {
      return data.data;
    }
    else {
      $.log(`获取文章详情失败！${response}`);

      return false;
    }
  }

  // 收藏
  async favorite({id, channelId, method}) {
    const { isSuccess, response } = await requestApi(`https://user-api.smzdm.com/favorites/${method}`, {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        touchstone_event: '{}',
        token: this.token,
        id,
        channel_id: channelId
      }
    });

    if (isSuccess) {
      $.log(`${method} 收藏成功: ${id}`);
    }
    else {
      $.log(`${method} 收藏失败！${response}`);
    }

    return {
      isSuccess,
      response
    };
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
      $.log('\n延迟 10 秒执行\n');
      await $.wait(10000);
    }

    const sep = `\n****** 账号${i + 1} ******\n`;

    $.log(sep);

    const bot = new SmzdmTaskBot(cookie);
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
