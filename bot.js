const crypto = require('crypto');
const got = require('got');

// ------------------------------------

const APP_VERSION = '10.4.26';
const APP_VERSION_REV = '866';

const DEFAULT_USER_AGENT = `smzdm_android_V${APP_VERSION} rv:${APP_VERSION_REV} (Redmi Note 3;Android10.0;zh)smzdmapp`;
const DEFAULT_WEB_USER_AGENT = `Mozilla/5.0 (Linux; Android 10.0; Redmi Build/Redmi Note 3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36{ smzdm_android_V${APP_VERSION} rv:${APP_VERSION_REV} (Redmi;Android10.0;zh) jsbv_1.0.0 webv_2.0 smzdmapp }`;

const SIGN_KEY = 'apr1$AwP!wRRT$gJ/q.X24poeBInlUJC';

// ------------------------------------

const randomStr = (len = 18) => {
  const char = '0123456789';
  let str = '';

  for (let i = 0; i < len; i++) {
    str += char.charAt(Math.floor(Math.random() * char.length));
  }

  return str;
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
const signFormData = (data) => {
  const newData = {
    weixin: 1,
    basic_v: 0,
    f: 'android',
    v: APP_VERSION,
    time: `${Math.round(new Date().getTime() / 1000)}000`,
    ...data
  };

  const keys = Object.keys(newData).filter(key => newData[key] !== '').sort();
  const signData = keys.map(key => `${key}=${newData[key]}`).join('&');
  const sign = crypto.createHash('md5').update(`${signData}&key=${SIGN_KEY}`).digest('hex').toUpperCase();

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
    options.data = signFormData(options.data);
  }

  const gotOptions = {
    method: options.method.toUpperCase(),
    headers: options.headers,
  };

  if (options.method === 'get') {
    gotOptions.searchParams = options.data;
  }
  else {
    gotOptions.form = options.data;
  }

  return got(url, gotOptions).then((response) => {
    const data = options.parseJSON === false ? response.body : parseJSON(response.body);

    return {
      isSuccess: options.parseJSON === false ? true : (data.error_code == '0'),
      response: options.parseJSON === false ? response.body : JSON.stringify(data),
      data
    };
  }).catch((error) => {
    return {
      isSuccess: false,
      response: error,
      data: error
    };
  })
};

const updateCookie = (cookie, name, value) => {
  const re = new RegExp(`(^|;)${name}=[^;]+;`, 'ig');

  return cookie.replace(re, `$1${name}=${encodeURIComponent(value)};`);
};

// ------------------------------------

class SmzdmBot {
  constructor(cookie) {
    this.cookie = cookie;

    const match = this.cookie.match(/sess=(.*?);/);
    this.token = match ? match[1] : '';

    // 处理 cookie
    this.androidCookie = this.cookie.replace('iphone', 'android').replace('iPhone', 'Android');
    this.androidCookie = updateCookie(this.androidCookie, 'smzdm_version', APP_VERSION);
    this.androidCookie = updateCookie(this.androidCookie, 'device_smzdm_version', APP_VERSION);
    this.androidCookie = updateCookie(this.androidCookie, 'v', APP_VERSION);
    this.androidCookie = updateCookie(this.androidCookie, 'device_smzdm_version_code', APP_VERSION_REV);
    this.androidCookie = updateCookie(this.androidCookie, 'device_system_version', '10.0');
    this.androidCookie = updateCookie(this.androidCookie, 'apk_partner_name', 'smzdm_download');
    this.androidCookie = updateCookie(this.androidCookie, 'partner_name', 'smzdm_download');
    this.androidCookie = updateCookie(this.androidCookie, 'device_type', 'Android');
    this.androidCookie = updateCookie(this.androidCookie, 'device_smzdm', 'android');
    this.androidCookie = updateCookie(this.androidCookie, 'device_name', 'Android');
  }

  getHeaders() {
    return {
      Accept: '*/*',
      'Accept-Language': 'zh-Hans-CN;q=1',
      'Accept-Encoding': 'gzip',
      'request_key': randomStr(18),
      'User-Agent': DEFAULT_USER_AGENT,
      Cookie: this.androidCookie
    };
  }

  getHeadersForWeb() {
    return {
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Accept-Encoding': 'gzip',
      'User-Agent': DEFAULT_WEB_USER_AGENT,
      Cookie: this.androidCookie
    };
  }
}

module.exports = {
  SmzdmBot,
  requestApi,
  removeTags
};
