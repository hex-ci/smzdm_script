/*
什么值得买任务脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 20 14 * * *
*/

const crypto = require('crypto');

const Env = require('./env');
const notify = require('./sendNotify');

const $ = new Env('什么值得买任务');

let cookiesArr = [];

// 判断环境变量里面是否有 cookie
if (process.env.SMZDM_COOKIE) {
  if (process.env.SMZDM_COOKIE.indexOf('&') > -1) {
    cookiesArr = process.env.SMZDM_COOKIE.split('&');
  }
  else if (process.env.SMZDM_COOKIE.indexOf('\n') > -1) {
    cookiesArr = process.env.SMZDM_COOKIE.split('\n');
  }
  else {
    cookiesArr = [process.env.SMZDM_COOKIE];
  }
}

const SIGN_KEY = 'apr1$AwP!wRRT$gJ/q.X24poeBInlUJC';
const DEFAULT_USER_AGENT = 'smzdm_android_V10.2.0 rv:860 (Redmi Note 3;Android10;zh)smzdmapp';

function randomStr(len = 18) {
  const char = '0123456789';
  let str = '';
  for (let i = 0; i < len; i++) {
    str += char.charAt(Math.floor(Math.random() * char.length));
  }
  return str;
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  }
  catch (e) {
    return {};
  }
}

function getToken(cookie) {
  const match = cookie.match(/sess=(.*?);/);

  return match ? match[1] : '';
}

function getHeaders(cookie) {
  return {
    'User-Agent': process.env.SMZDM_USER_AGENT || DEFAULT_USER_AGENT,
    'Accept-Language': 'zh-Hans-CN;q=1',
    'Accept-Encoding': 'gzip',
    'Connection': 'Keep-Alive',
    'request_key': randomStr(18),
    Cookie: cookie.replace('iphone', 'android').replace('iPhone', 'Android').replace('apk_partner_name=appstore', 'apk_partner_name=android')
  };
}

// 添加公共参数并签名数据
function signFormData(data) {
  const newData = {
    weixin: '1',
    f: 'android',
    v: '10.2.0',
    sk: '1',
    time: `${Math.round(new Date().getTime() / 1000)}000`,
    ...data
  };

  const keys = Object.keys(newData).sort();
  const signData = keys.map(key => `${key}=${newData[key]}`).join('&');
  const sign = crypto.createHash('md5').update(`${signData}&key=${SIGN_KEY}`).digest('hex').toUpperCase();

  return {
    ...newData,
    sign
  };
}

// 公共请求函数
async function requestApi(url, inputOptions = {}) {
  const options = { ...inputOptions };

  if (!options.method) {
    options.method = 'get';
  }

  if (!options.data) {
    options.data = {};
  }

  if (options.sign !== false) {
    options.data = signFormData(options.data);
  }

  return $.http[options.method]({
    url,
    headers: options.headers,
    form: options.method === 'post' ? options.data : {}
  }).then((response) => {
    const data = parseJSON(response.body);

    return {
      isSuccess: data.error_code == '0',
      response: response.body,
      data
    };
  }).catch((error) => {
    return {
      isSuccess: false,
      response: error
    };
  })
}

// 获取任务列表
async function getTaskList(cookie) {
  const { isSuccess, data } = await requestApi('https://user-api.smzdm.com/task/list_new', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      get_total: '1',
      limit: '100',
      offset: '0',
      point_type: '0',
      token: getToken(cookie)
    }
  });

  if (isSuccess) {
    return data.data.rows[0].cell_data.activity_task.accumulate_list.task_list;
  }
  else {
    return [];
  }
}

// 领取奖励
async function receiveReward(taskId, cookie) {
  const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/task/activity_task_receive', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      task_id: taskId,
      token: getToken(cookie)
    }
  });

  if (isSuccess) {
    const msg = data.data.reward_msg.replace(/<[^<]+?>/g, '');

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

// 获取 Web 文章列表
async function getArticleList(cookie) {
  const { isSuccess, data, response } = await requestApi('https://post.smzdm.com/json_more/?tab_id=tuijian&filterUrl=tuijian', {
    sign: false,
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'zh-cn',
      Connection: 'keep-alive',
      Referer: 'https://post.smzdm.com/',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/smzdm 10.4.25 rv:93.4 (iPhone13,4; iOS 14.5; zh_CN)/iphone_smzdmapp/10.4.25/wkwebview/jsbv_1.0.0',
      Cookie: cookie
    }
  });

  if (isSuccess) {
    // 目前只取前两个做任务
    return data.data.slice(0, 2);
  }
  else {
    $.log(`获取文章列表失败: ${response}`);
    return [];
  }
}

// 分享的每日奖励
async function shareDailyReward(channelId, cookie) {
  const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/share/daily_reward', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      channel_id: channelId,
      token: getToken(cookie)
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

// 分享完成后回调接口
async function shareCallback(articleId, channelId, cookie) {
  const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/share/callback', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      article_id: articleId,
      channel_id: channelId,
      touchstone_event: '{}',
      token: getToken(cookie)
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

// 分享完成，可以领取奖励了
async function shareArticleDone(articleId, channelId, cookie) {
  const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/share/article_reward', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      article_id: articleId,
      channel_id: channelId,
      token: getToken(cookie)
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

// 执行浏览任务
async function doViewTask(task, cookie) {
  $.log(`开始任务: ${task.task_name}`);

  $.log('延迟 11 秒模拟阅读文章');
  await $.wait(11000);

  const { isSuccess, response } = await requestApi('https://user-api.smzdm.com/task/event_view_article', {
    method: 'post',
    headers: getHeaders(cookie),
    data: {
      article_id: task.article_id,
      channel_id: task.channel_id,
      token: getToken(cookie)
    }
  });

  if (isSuccess) {
    $.log('延迟 3 秒领取奖励');
    await $.wait(3000);

    const rewardResult = await receiveReward(task.task_id, cookie);

    return rewardResult;
  }
  else {
    $.log(`任务异常！${response}`);

    return {
      isSuccess
    };
  }
}

// 执行多篇文章的分享任务
async function doShareTaskMulti(task, cookie) {
  $.log(`开始任务: ${task.task_name}`);

  const articles = await getArticleList(cookie);

  for (let i = 0; i < articles.length; i++) {
    $.log(`开始分享第 ${i + 1} 篇文章...`);

    const article = articles[i];

    $.log('等候 5 秒');
    $.wait(3000);

    await shareDailyReward(article.channel_id, cookie);
    await shareCallback(article.article_hash_id, article.channel_id, cookie);

    const { isSuccess } = await shareArticleDone(article.article_hash_id, article.channel_id, cookie);

    if (!isSuccess) {
      return {
        isSuccess
      };
    }

    $.log('等候 5 秒');
    $.wait(5000);
  }

  $.log('延迟 3 秒领取奖励');
  await $.wait(3000);

  const rewardResult = await receiveReward(task.task_id, cookie);

  return rewardResult;
}

// 执行一篇文章的分享任务
async function doShareTaskSingle(task, cookie) {
  $.log(`开始任务: ${task.task_name}`);

  $.log(`开始分享文章...`);

  $.log('等候 5 秒');
  $.wait(5000);

  await shareDailyReward(task.channel_id, cookie);
  await shareCallback(task.task_redirect_url.link_val, task.channel_id, cookie);

  const { isSuccess } = await shareArticleDone(task.task_redirect_url.link_val, task.channel_id, cookie);

  if (!isSuccess) {
    return {
      isSuccess
    };
  }

  $.log('延迟 5 秒领取奖励');
  await $.wait(5000);

  const rewardResult = await receiveReward(task.task_id, cookie);

  return rewardResult;
}

async function run(cookie) {
  const tasks = await getTaskList(cookie);

  let count = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    if (task.task_status == '2' && task.task_event_type == 'interactive.view.article') {
      const result = await doViewTask(task, cookie);

      if (result.isSuccess) {
        count++;
      }

      $.log('等候 5 秒');
      $.wait(5000);
    }
    else if (task.task_status == '2' && task.task_event_type == 'interactive.share') {
      let result;

      if (task.article_id == '0') {
        result = await doShareTaskMulti(task, cookie);
      }
      else {
        result = await doShareTaskSingle(task, cookie);
      }

      if (result.isSuccess) {
        count++;
      }

      $.log('等候 5 秒');
      $.wait(5000);
    }
  }

  return `成功完成任务数: ${count}`;
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
        $.log('\n延迟 5 秒执行\n');
        await $.wait(5000);
      }

      const cookie = cookiesArr[i];
      const sep = `\n******开始账号${i + 1}******\n`;

      $.log(sep);

      const msg = await run(cookie);

      $.log(msg + '\n');

      notifyContent += sep + msg + '\n';
    }
  }

  await notify.sendNotify($.name, notifyContent);
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
});
