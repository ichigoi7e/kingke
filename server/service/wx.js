import { HTTP } from 'meteor/http';
var config = require('../config.js');
var collection = require('../models/collection.js');
var Users = collection.Users;
var Ids = collection.Ids;
var Wx = collection.Wx;
var QrCode = collection.QrCode;

/**
 * Get WeiXin Access Token from mongo cache or API.
 * @returns {String} Access Token
 */
var getAccessToken = function() {
  var accessTokenCache = Wx.findOne({ name: 'access_token' });

  if (accessTokenCache && accessTokenCache.time > Date.now()) {
    return accessTokenCache.value;
  }

  var tokenUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + config.appID + '&secret=' + config.appsecret;

  var tokenResult = HTTP.get(tokenUrl);
  var accessToken = tokenResult.data.access_token;
  if (accessTokenCache) {
    Wx.update(accessTokenCache._id, {
      $set: {
        value: accessToken,
        time: Date.now() + 6000 * 1000
      }
    });
  } else {
    accessTokenCache = {};
    accessTokenCache.value = accessToken;
    accessTokenCache.name = 'access_token';
    accessTokenCache.time = Date.now() + 6000 * 1000;
    Wx.insert(accessTokenCache);
  }
  return accessToken;
};

/**
 * Send Template Message.
 * @param  {String} openid WeiXin User OpenId
 * @param  {String} templateId template's' id in config.js
 * @param  {String} url click url
 * @param  {Object} data template info data
 * @returns {Response} the result of HTTP.post
 */
exports.sendTemplate = function(openid, templateId, url, data) {
  var accessToken = getAccessToken();
  var templateUrl = 'https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=' + accessToken;
  var templateData = {
    touser: openid,
    template_id: templateId,
    url: url,
    data: data
  };
  var templateJson = JSON.stringify(templateData);
  return HTTP.post(templateUrl, { content: templateJson });
};

/**
 * use oauth get user info
 * @param  {String} code weixin oauth2 code
 * @returns {Object} userinfoData
 */
exports.oauth = function(code) {
  var oauth2Url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.appID + '&secret=' + config.appsecret + '&code=' + code + '&grant_type=authorization_code';
  var oauth2Result = HTTP.get(oauth2Url);
  var oauth2Data = JSON.parse(oauth2Result.content);
  var openid = oauth2Data.openid;
  var accessToken = oauth2Data.access_token;

  var userinfoUrl = 'https://api.weixin.qq.com/sns/userinfo?lang=zh_CN&access_token=' + accessToken + '&openid=' + openid;
  var userinfoResult = HTTP.get(userinfoUrl);
  var userinfoData = JSON.parse(userinfoResult.content);
  return userinfoData;
};

/**
 * create QrCode by weixin API.
 * @param {int} id QrCode id
 * @returns {String} QrCode picture url
 */
exports.qrcode = function(id) {
  var qrcodeCache = QrCode.findOne({ qid: id });
  if (qrcodeCache && qrcodeCache.time > Date.now()) {
    return qrcodeCache.url;
  }
  var accessToken = getAccessToken();
  var qrcodeUrl = 'https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=' + accessToken;
  var qrcodeData = {
    'expire_seconds': 604800,
    'action_name': 'QR_SCENE',
    'action_info': {
      'scene': {
        'scene_id': id
      }
    }
  };
  qrcodeData = JSON.stringify(qrcodeData);
  var qrcodeResult = HTTP.post(qrcodeUrl, { content: qrcodeData });
  var qrcodeJson = JSON.parse(qrcodeResult.content);
  var qrcodeImg = 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + encodeURIComponent(qrcodeJson.ticket);
  if (qrcodeCache) {
    QrCode.update(qrcodeCache._id, {
      $set: {
        url: qrcodeImg,
        time: Date.now() + 600000 * 1000
      }
    });
  } else {
    qrcodeCache = {};
    qrcodeCache.qid = id;
    qrcodeCache.url = qrcodeImg;
    qrcodeCache.time = Date.now() + 600000 * 1000;
    QrCode.insert(qrcodeCache);
  }
  return qrcodeImg;
};

/**
 * Use open id get User info. First get from database, then use weixin API.
 * @param {String} openid weixin open id
 * @returns {Object} User info
 */
exports.getUserInfo = function(openid) {
  var user = Users.findOne({ openid: openid });
  if (user && user.nickname) {
    return user;
  }
  var accessToken = getAccessToken();
  var userinfoUrl = 'https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + accessToken + '&openid=' + openid + '&lang=zh_CN';
  var userinfoResult = HTTP.get(userinfoUrl);
  var userinfoData = JSON.parse(userinfoResult.content);
  if (user) {
    Users.update(user._id, {
      $set: {
        nickname: userinfoData.nickname,
        sex: userinfoData.sex,
        language: userinfoData.language,
        city: userinfoData.city,
        province: userinfoData.province,
        country: userinfoData.country,
        headimgurl: userinfoData.headimgurl
      }
    });
  } else {
    user = {};
    var id = Ids.findOne({ 'name': 'user' });
    user.uid = id.id + 1;
    Ids.update({ 'name': 'user' }, { $inc: { id: 1 } });
    user.openid = openid;
    user.nickname = userinfoData.nickname;
    user.sex = userinfoData.sex;
    user.language = userinfoData.language;
    user.city = userinfoData.city;
    user.province = userinfoData.province;
    user.country = userinfoData.country;
    user.headimgurl = userinfoData.headimgurl;
    Users.insert(user);
  }
  user = Users.findOne({ openid: openid });
  return user;
};

/**
 * set weixin menu.
 * @returns {String} the result of HTTP.post
 */
exports.setMenu = function() {
  try {
    var accessToken = getAccessToken();
    var menuUrl = 'https://api.weixin.qq.com/cgi-bin/menu/create?access_token=' + accessToken;
    var oauth2UrlBegin = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + config.appID + '&response_type=code&scope=snsapi_userinfo&state=lc&redirect_uri=';
    var oauth2UrlEnd = '#wechat_redirect';
    var menuData = {
      'button': [
        {
          'type': 'view',
          'name': '动态',
          'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/news') + oauth2UrlEnd
        },
        {
          'type': 'view',
          'name': '课程',
          'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/course') + oauth2UrlEnd
        },
        {
          'name': '更多',
          'sub_button': [
            {
              'type': 'view',
              'name': '课程管理',
              'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/course_manage') + oauth2UrlEnd
            },
            {
              'type': 'view',
              'name': '联系人',
              'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/contacts') + oauth2UrlEnd
            },
            {
              'type': 'view',
              'name': '发通知',
              'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/notify') + oauth2UrlEnd
            },
            {
              'type': 'view',
              'name': '我的名片',
              'url': oauth2UrlBegin + encodeURIComponent('http://' + config.url + '/info') + oauth2UrlEnd
            }]
        }]
    };
    var menuJson = JSON.stringify(menuData);
    var menuResult = HTTP.post(menuUrl, { content: menuJson });
    return '[[set menu result]]\n' + menuResult.content;
  } catch (err) {
    return '[[set menu result ERROR]]\n' + err;
  }
};

/**
 * check weixin token.
 * @param  {String} nonce number from weixin
 * @param  {String} timestamp timestamp from weixin
 * @param  {String} signature signature from weixin
 * @param  {String} echostr String from weixin
 * @returns {String} success:echostr fail:false
 */
exports.checkToken = function(nonce, timestamp, signature, echostr) {
  var l = [];
  l[0] = nonce;
  l[1] = timestamp;
  l[2] = config.token;
  l.sort();
  var original = l.join('');
  var sha = CryptoJS.SHA1(original).toString();
  if (signature === sha) {
    return echostr;
  }
  return 'false';
};

/**
 * add simple user info.
 * @param  {String} openid openid from weixin
 * @returns {NULL} NULL
 */
exports.addUser = function(openid) {
  if (!Ids.findOne({name: 'user'})) {
    Ids.insert({name: 'user', id: 0});
  }

  if (!Users.findOne({openid: openid})) {
    var user = {};
    var id = Ids.findOne({'name': 'user'});
    user.uid = id.id + 1;
    Ids.update({'name': 'user'}, {$inc: {id: 1}});
    user.openid = openid;
    Users.insert(user);
  }
};

/**
 * add follower to teacherId.
 * @param  {String} teacherId teacher openid from weixin
 * @param  {String} studentId student openid from weixin
 * @returns {NULL} NULL
 */
exports.addFollower = function(teacherId, studentId) {
  Users.update({openid: teacherId}, {$push: {follower: studentId}});
};

/**
 * get user info by uid. it used in qrcode.
 * @param  {int} uid User.uid
 * @returns {Object} User Object
 */
exports.getUserInfoByUid = function(uid) {
  var user = Users.findOne({uid: uid});
  return exports.getUserInfo(user.openid);
};

/**
 * check the follow relation.
 * @param  {String} teacherId teacher openid from weixin
 * @param  {String} studentId student openid from weixin
 * @returns {boolean} isFollowed
 */
exports.isFollowed = function(teacherId, studentId) {
  return !!Users.findOne({openid: teacherId, follower: studentId});
};

/**
 * get my followee.
 * @param  {String} openid user openid
 * @returns {Array} followee list
 */
exports.getFollowees = function(openid) {
  return Users.find({follower: openid}).fetch();
};
