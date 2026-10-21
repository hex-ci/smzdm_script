/*
smzdm 签到脚本
项目地址: https://github.com/hex-ci/smzdm_script

cron: 10 8 * * *
*/

const crypto = require('crypto');
const Env = require('./env');
const {
  SmzdmBot,
  requestApi,
  removeTags,
  getEnvCookies,
  wait,
  waitHuman,
  CREATE_CENTER_VIEW
} = require('./bot');
const notify = require('./sendNotify');
const CryptoJS = require('crypto-js');

// ------------------------------------

const $ = new Env('smzdm 签到');

class SmzdmCheckinBot extends SmzdmBot {
  constructor(cookie, sk) {
    super(cookie);

    this.sk = sk ? sk.trim() : '';
  }

  async run() {
    // 客户端先渲染签到卡片，用户点签到后才发 /checkin
    await this.getCheckinCard();

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
        sk: this.sk,
        token: this.token,
        captcha: ''
      }
    });

    if (isSuccess) {
      let msg = `⭐签到成功${data.data.daily_num}天
🏅金币: ${data.data.cgold}
🏅碎银: ${data.data.pre_re_silver}
🏅补签卡: ${data.data.cards}`;

      await waitHuman(3, 10);

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
      headers: this.getHeaders(),
      debug: process.env.SMZDM_DEBUG
    });

    if (isSuccess) {
      const normal = data.data.normal_reward;

      // reward_add 为空说明今天没有奖励增加（已领过或没有），退回展示签到卡片文案
      const msg1 = normal.reward_add.title
        ? `${normal.reward_add.title}: ${normal.reward_add.content}`
        : removeTags(normal.gift.content);

      const msg2 = normal.gift.title
        ? `${normal.gift.title}: ${normal.gift.content_str}`
        : normal.gift.sub_content;

      const msg = [msg1, msg2].filter(text => text).join('\n');

      $.log(`${msg}\n`);

      return {
        isSuccess,
        msg: `${msg}\n\n`
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
    // 连签奖励状态以签到后的卡片为准，所以这里重新拉一次
    const isContinue = this.isContinueCheckin(await this.getCheckinCard());

    if (!isContinue) {
      const msg = '今天没有额外奖励';

      $.log(`${msg}\n`);

      return {
        isSuccess: false,
        msg: `${msg}\n`
      };
    }

    await waitHuman(5, 10);

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

  // 签到卡片，APP 进签到页时先渲染它
  async getCheckinCard() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/checkin/show_view_v2', {
      method: 'post',
      headers: this.getHeaders()
    });

    if (isSuccess) {
      return data.data;
    }

    $.log(`查询签到卡片失败！${response}`);

    return false;
  }

  // 连续签到的卡片，直接按有没有 checkin_continue 来找
  isContinueCheckin(card) {
    if (!card || !card.rows) {
      return false;
    }

    const result = card.rows.find(item => item.cell_data && item.cell_data.checkin_continue);

    return !!(result && result.cell_data.checkin_continue.continue_checkin_reward_show);
  }

  async getVipInfo() {
    const { isSuccess, data, response } = await requestApi('https://user-api.smzdm.com/vip', {
      method: 'post',
      headers: this.getHeaders(),
      data: {
        token: this.token,
        create_center_view: CREATE_CENTER_VIEW
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

const SK_KEY = 'geZm53XAspb02exN';
const warned = new Set();

function warnOnce(key, message) {
  if (warned.has(key)) {
    return;
  }

  warned.add(key);

  $.log(message);
}

function getUserId(cookie) {
  const match = cookie.match(/smzdm_id=([^;]*)/);

  return match ? match[1] : '';
}

const DEVICE_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 盐值一旦定下就不能改，改了等于所有账号换设备
const DEVICE_SALT = 'smzdm_script_device_v1';

// APP 的设备串是 62 字符集 32 位随机串，这里按账号确定性派生，保证跨运行固定不变
function makeDeviceId(userId) {
  const digest = crypto.createHash('sha256').update(`${DEVICE_SALT}:${userId}`).digest();
  let result = '';

  for (let i = 0; i < 32; i++) {
    result += DEVICE_ALPHABET.charAt(digest[i] % DEVICE_ALPHABET.length);
  }

  return result;
}

function makeSk(userId, deviceId) {
  const key = CryptoJS.enc.Utf8.parse(SK_KEY);
  const cipherText = CryptoJS.DES.encrypt(userId + deviceId, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });

  return cipherText.toString();
}

// sk 是 DES(userId + 设备 id) 的 Base64，可逆；返回设备段，不属于这个账号就返回空串
function decodeSkDevice(sk, userId) {
  if (!userId) {
    return '';
  }

  try {
    const plain = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(sk) },
      CryptoJS.enc.Utf8.parse(SK_KEY),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    ).toString(CryptoJS.enc.Utf8);

    return plain.indexOf(userId) === 0 ? plain.slice(userId.length) : '';
  }
  catch (e) {
    return '';
  }
}

// cookie 缺 smzdm_id 时，/vip 的 data.base.user_smzdm_id 还能拿到（APP 也用它回写 sp，sk 的 userId 正是来自这里）
async function fetchUserId(cookie) {
  const bot = new SmzdmBot(cookie);
  const { isSuccess, data } = await requestApi('https://user-api.smzdm.com/vip', {
    method: 'post',
    headers: bot.getHeaders(),
    data: {
      token: bot.token,
      create_center_view: CREATE_CENTER_VIEW
    }
  });
  // smzdm_id 在响应信封顶层（每个响应都有），base.user_smzdm_id 作为兜底
  const userId = isSuccess
    ? (data.smzdm_id || (data.data && data.data.base ? data.data.base.user_smzdm_id : ''))
    : '';

  return userId && userId != '0' ? String(userId) : '';
}

const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

function getCookieValue(cookie, name) {
  const match = cookie.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`, 'i'));

  return match ? match[1] : '';
}

// 覆盖或补上 cookie 字段，值为空也要能覆盖
function upsertCookie(cookie, name, value) {
  const re = new RegExp(`(^|;)\\s*${name}=[^;]*;?`, 'i');

  if (re.test(cookie)) {
    return cookie.replace(re, `$1${name}=${value};`);
  }

  return `${cookie.replace(/;?\s*$/, ';')} ${name}=${value};`;
}

// APP 的 device_rid/device_s 就是 md5(设备串)，把 cookie 对齐到 sk 实际用的设备段
function alignDeviceCookie(cookie, deviceId) {
  const hash = md5(deviceId);
  let result = cookie;

  if (getCookieValue(result, 'device_rid') !== hash) {
    result = upsertCookie(result, 'device_rid', hash);
  }

  if (getCookieValue(result, 'device_s') !== hash) {
    result = upsertCookie(result, 'device_s', hash);
  }

  return result;
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
    let cookie = cookies[i];

    if (!cookie) {
      continue;
    }

    let userId = getUserId(cookie);
    let sk = (sks[i] || '').trim();
    let deviceId = '';

    if (!userId) {
      // 少数 Cookie 只有 sess 没 smzdm_id，用 /vip 把它补回来，避免退化成 sk=1
      userId = await fetchUserId(cookie);

      if (userId) {
        warnOnce('vip-id', 'Cookie 里没有 smzdm_id，已从 /vip 接口取到');
      }
    }

    if (sk) {
      // 用配置的真 sk，并把 cookie 对齐到它自己的设备段（同机抓的两个值本来就相等）
      deviceId = decodeSkDevice(sk, userId);

      if (!deviceId) {
        $.log(`🟡第 ${i + 1} 个 SMZDM_SK 解不出设备段（不是有效的 sk 或不属于这个账号），签到很可能失败，请检查多账号顺序`);
      }
    }
    else if (userId) {
      // 没有真值就按账号派生一个固定设备串，sk 和 cookie 用同一个
      deviceId = makeDeviceId(userId);
      sk = makeSk(userId, deviceId);

      warnOnce(
        'auto',
        '未配置 SMZDM_SK，改用按账号派生的固定设备串生成 sk；如需与真机完全一致，请在 APP 的签到请求里抓 sk 填入 SMZDM_SK'
      );
    }
    else {
      // cookie 和 /vip 都拿不到 userId，sk 拼不出来；发 1 是最后一档，至少保持参数存在
      sk = '1';

      warnOnce(
        'empty',
        'Cookie 里没有 smzdm_id，/vip 也没取到，只能发 sk=1；这种 Cookie 很可能被判定异常，建议重新从 APP 抓包'
      );
    }

    if (deviceId) {
      const aligned = alignDeviceCookie(cookie, deviceId);

      if (aligned !== cookie) {
        warnOnce(
          'align',
          'cookie 的 device_rid/device_s 与 sk 的设备段不一致，已按 sk 对齐（cookie 和 sk 可能不是同一台设备）'
        );
      }

      cookie = aligned;
    }

    if (i > 0) {
      await wait(10, 30);
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
