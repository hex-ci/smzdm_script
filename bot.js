const crypto = require('crypto');
const got = require('got');

// ------------------------------------

const APP_VERSION = '11.1.95';
const APP_VERSION_REV = '1195';

const DEFAULT_USER_AGENT_APP = `smzdm_android_V${APP_VERSION} rv:${APP_VERSION_REV} (Redmi Note 3;Android10.0;zh)smzdmapp`;
const DEFAULT_USER_AGENT_WEB = `Mozilla/5.0 (Linux; Android 10.0; Redmi Build/Redmi Note 3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36 smzdm_android_V${APP_VERSION} rv:${APP_VERSION_REV} (Redmi;Android10.0;zh) jsbv_1.0.0 webv_2.0 smzdmapp`;

const SIGN_KEY = 'apr1$AwP!wRRT$gJ/q.X24poeBInlUJC';

const ZHUANZAI_AB = '';

// 无法从设备侧还原的本地开关取值，与全新安装的 APP 行为一致
const CREATE_CENTER_VIEW = '';
const IS_INSTALL_ZHANGDAMA = '0';

// APP 用 HTTP Date 头作为签名时间，且偏差超过 5 分钟会重新获取
const SERVER_TIME_URL = 'https://app-api.smzdm.com/get_server_time';
const SERVER_TIME_MAX_AGE = 5 * 60 * 1000;

// ------------------------------------

let serverTime = 0;
let serverTimeFetchedAt = 0;

const reVersion = /(smzdm_android_V|smzdm\s|iphone_smzdmapp\/)([\d.]+)/i;
const reRev = /rv:([\d.]+)/i;

// request_key = 8 位随机数 + 秒级时间戳
const requestKey = () => `${Math.floor(Math.random() * 90000000) + 10000000}${Math.floor(Date.now() / 1000)}`;

const getServerTime = async () => {
  if (serverTime && Date.now() - serverTimeFetchedAt <= SERVER_TIME_MAX_AGE) {
    return serverTime;
  }

  try {
    // APP 直接读 HTTP Date 头，不关心状态码，取不到才回退本地时间
    const response = await got(SERVER_TIME_URL, {
      method: 'GET',
      throwHttpErrors: false,
      retry: {
        limit: 0
      }
    });

    const date = new Date(response.headers.date).getTime();

    if (date) {
      serverTime = date;
      serverTimeFetchedAt = Date.now();
    }
  }
  catch (error) {
    console.log(`获取服务器时间失败，使用本地时间: ${error.message}`);
  }

  return serverTime || Date.now();
};

const parseJSON = (str) => {
  try {
    return JSON.parse(str);
  }
  catch (e) {
    return {};
  }
};

const removeTags = (str) => str.replace(/<[^<]+?>/g, '');

// 添加公共参数并签名数据
const signFormData = async (data) => {
  const newData = {
    weixin: 1,
    basic_v: 0,
    f: 'android',
    v: APP_VERSION,
    time: `${Math.round((await getServerTime()) / 1000)}000`,
    zhuanzai_ab: ZHUANZAI_AB,
    ...data
  };

  const keys = Object.keys(newData).filter(key => newData[key] !== '').sort();
  const signData = keys.map(key => `${key}=${newData[key]}`).join('&');
  const sign = crypto.createHash('md5').update(`${signData.replace(/ /g, '')}&key=${SIGN_KEY}`).digest('hex').toUpperCase();

  return {
    ...newData,
    sign
  };
};

// 公共请求函数
const requestApi = async (url, inputOptions = {}) => {
  const options = { ...inputOptions };

  if (!options.method) {
    options.method = 'get';
  }

  if (!options.data) {
    options.data = {};
  }

  Object.keys(options.data).forEach(key => options.data[key] === undefined && delete options.data[key]);

  if (options.sign !== false) {
    options.data = await signFormData(options.data);
  }

  const gotOptions = {
    method: options.method.toUpperCase(),
    headers: options.headers,
    retry: {
      limit: 2,
      methods: [
        'GET',
        'POST'
      ],
      statusCodes: [
      ],
      errorCodes: [
        'ECONNRESET',
        'EAI_AGAIN'
      ]
    }
  };

  if (options.method === 'get') {
    gotOptions.searchParams = options.data;
  }
  else {
    gotOptions.form = options.data;
  }

  return got(url, gotOptions).then((response) => {
    const data = options.parseJSON === false ? response.body : parseJSON(response.body);

    if (options.debug) {
      console.log('------------------------');
      console.log(url);
      console.log('------------------------');
      console.log(JSON.stringify(gotOptions, null, 2));
      console.log('------------------------');
      console.log(options.parseJSON === false ? response.body : JSON.stringify(data, null, 2));
      console.log('------------------------');
    }

    return {
      isSuccess: options.parseJSON === false ? true : (data.error_code == '0'),
      response: options.parseJSON === false ? response.body : JSON.stringify(data, null, 2),
      data
    };
  }).catch((error) => {
    if (options.debug) {
      console.log('------------------------');
      console.log(url);
      console.log('------------------------');
      console.log(JSON.stringify(gotOptions, null, 2));
      console.log('------------------------');
      console.log(error);
      console.log('------------------------');
    }

    return {
      isSuccess: false,
      response: error,
      data: error
    };
  })
};

// APP 每次请求都用自己维护的字段重建 Cookie，缺失的字段需要补上
const setCookie = (cookie, name, value) => {
  const re = new RegExp(`(^|;)\\s*${name}=[^;]+`, 'i');

  if (re.test(cookie)) {
    return cookie.replace(re, `$1${name}=${encodeURIComponent(value)}`);
  }

  return `${cookie.replace(/;?\s*$/, ';')} ${name}=${encodeURIComponent(value)};`;
};

// APP 不发送这些历史字段，保留会导致请求与 APP 不一致
const removeCookie = (cookie, name) => {
  const re = new RegExp(`(^|;)\\s*${name}=[^;]+;?`, 'ig');

  return cookie.replace(re, '$1');
};

const getEnvCookies = () => {
  let cookies = [];

  // 判断环境变量里面是否有 cookie
  if (process.env.SMZDM_COOKIE) {
    if (process.env.SMZDM_COOKIE.indexOf('&') > -1) {
      cookies = process.env.SMZDM_COOKIE.split('&');
    }
    else if (process.env.SMZDM_COOKIE.indexOf('\n') > -1) {
      cookies = process.env.SMZDM_COOKIE.split('\n');
    }
    else {
      cookies = [process.env.SMZDM_COOKIE];
    }
  }

  return cookies[0] ? cookies : false;
};

const randomDecimal = (min, max, decimal) => {
  const rand = Math.random() * (max - min + 1) + min;

  return Math.floor(rand * decimal) / decimal;
};

const wait = (minSecond, maxSecond) => {
  // 生成随机小数秒数
  const randomSecond = randomDecimal(minSecond, maxSecond, 1000);

  console.log(`等候 ${minSecond}-${maxSecond}(${randomSecond}) 秒`);

  return new Promise(resolve => setTimeout(resolve, randomSecond * 1000));
};

const waitHuman = async (minSecond, maxSecond) => {
  await wait(minSecond, maxSecond);

  if (Math.random() < 0.05) {
    await wait(15, 45);
  }
};

// ------------------------------------

class SmzdmBot {
  constructor(cookie) {
    this.cookie = cookie.trim();

    const match = this.cookie.match(/sess=(.*?);/);
    this.token = match ? match[1] : '';

    // 处理 cookie
    this.androidCookie = this.cookie.replace('iphone', 'android').replace('iPhone', 'Android');
    this.androidCookie = setCookie(this.androidCookie, 'v', APP_VERSION);
    this.androidCookie = setCookie(this.androidCookie, 'device_smzdm_version_code', APP_VERSION_REV);
    this.androidCookie = setCookie(this.androidCookie, 'device_system_version', '10.0');
    this.androidCookie = setCookie(this.androidCookie, 'apk_partner_name', 'smzdm_download');
    this.androidCookie = setCookie(this.androidCookie, 'partner_name', 'smzdm_download');
    this.androidCookie = setCookie(this.androidCookie, 'device_smzdm', 'android');
    this.androidCookie = setCookie(this.androidCookie, 'f', 'android');
    this.androidCookie = setCookie(this.androidCookie, 'basic_v', '0');

    [
      'smzdm_version',
      'device_smzdm_version',
      'device_type',
      'device_name'
    ].forEach(name => {
      this.androidCookie = removeCookie(this.androidCookie, name);
    });
  }

  getHeaders() {
    let userAgent = DEFAULT_USER_AGENT_APP;

    if (process.env.SMZDM_USER_AGENT_APP) {
      userAgent = process.env.SMZDM_USER_AGENT_APP
        .replace(reVersion, `$1${APP_VERSION}`)
        .replace(reRev, `rv:${APP_VERSION_REV}`);
    }

    return {
      Accept: '*/*',
      'Accept-Language': 'zh-Hans-CN;q=1',
      'Accept-Encoding': 'gzip',
      'request_key': requestKey(),
      'User-Agent': userAgent,
      Cookie: this.androidCookie
    };
  }

  getHeadersForWeb() {
    let userAgent = DEFAULT_USER_AGENT_WEB;

    if (process.env.SMZDM_USER_AGENT_WEB) {
      userAgent = process.env.SMZDM_USER_AGENT_WEB
        .replace(reVersion, `$1${APP_VERSION}`)
        .replace(reRev, `rv:${APP_VERSION_REV}`);
    }

    return {
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Accept-Encoding': 'gzip',
      'User-Agent': userAgent,
      Cookie: this.androidCookie
    };
  }

  getOneByRandom(listing) {
    return listing[Math.floor(Math.random() * listing.length)];
  }

  // 打乱顺序
  getShuffled(listing) {
    const result = listing.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }
}

module.exports = {
  SmzdmBot,
  requestApi,
  removeTags,
  parseJSON,
  getEnvCookies,
  getServerTime,
  CREATE_CENTER_VIEW,
  IS_INSTALL_ZHANGDAMA,
  wait,
  waitHuman
};
