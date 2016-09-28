import { HTTP } from 'meteor/http';
var config = require("./config.js");
var collection = require("./collection.js");
var Users = collection.Users;
var Ids = collection.Ids;
var Wx = collection.Wx;
var QrCode = collection.QrCode;

exports.GetAccessToken = function() {
    var access_token_cache = Wx.findOne({name:'access_token'});
    if (access_token_cache && access_token_cache.time > Date.now()) {
        return access_token_cache.value;
    } else {
        var token_url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + config.appID + "&secret=" + config.appsecret;
        var token_result = HTTP.get(token_url);
        var access_token = token_result.data.access_token;
        if (access_token_cache) {
        Wx.update(access_token_cache._id, {$set: {
            value: access_token,
            time: Date.now() + 6000 * 1000
        }});
        } else {
        access_token_cache = {};
        access_token_cache.value = access_token;
        access_token_cache.name = 'access_token';
        access_token_cache.time = Date.now() + 6000 * 1000;
        Wx.insert(access_token_cache);
        }
        return access_token;
    }
}

exports.SendTemplate = function(openid, template_id, url, data) {
    var access_token = GetAccessToken();
    var template_url = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + access_token;
    var template_data = {
        touser: openid,
        template_id: template_id,
        url: url,
        data: data
    }
    var template_json = JSON.stringify(template_data);
    return HTTP.post(template_url, {content: template_json});
}

exports.Oauth = function(code) {
    var oauth2_url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.appID + '&secret=' + config.appsecret + '&code=' + code + '&grant_type=authorization_code';
    var oauth2_result = HTTP.get(oauth2_url);
    var oauth2_data = JSON.parse(oauth2_result.content);
    var openid = oauth2_data.openid;
    var access_token = oauth2_data.access_token;

    var userinfo_url = "https://api.weixin.qq.com/sns/userinfo?access_token=" + access_token + "&openid=" + openid;
    var userinfo_result = HTTP.get(userinfo_url);
    var userinfo_data = JSON.parse(userinfo_result.content);
    return userinfo_data;
}

exports.Qrcode = function(id) {
    var qrcode_cache = QrCode.findOne({qid:id});
    if (qrcode_cache && qrcode_cache.time > Date.now()) {
        return qrcode_cache.url;
    } else {
        var access_token = GetAccessToken();
        var qrcode_url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + access_token;
        var qrcode_data = {
        "expire_seconds": 604800, 
        "action_name": "QR_SCENE", 
        "action_info": {
            "scene": {
            "scene_id": id
            }
        }
        };
        qrcode_data = JSON.stringify(qrcode_data);
        var qrcode_result = HTTP.post(qrcode_url,{content: qrcode_data});
        var qrcode_json = JSON.parse(qrcode_result.content);
        var qrcode_img = "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=" + encodeURIComponent(qrcode_json.ticket);
        if (qrcode_cache) {
        QrCode.update(qrcode_cache._id, {$set: {
            url: qrcode_img,
            time: Date.now() + 600000 * 1000
        }})
        } else {
        qrcode_cache = {};
        qrcode_cache.qid = id;
        qrcode_cache.url = qrcode_img;
        qrcode_cache.time = Date.now() + 600000 * 1000;
        QrCode.insert(qrcode_cache);
        }
        return qrcode_img;
    }
}

exports.GetUserInfo = function(openid) {
    var user = Users.findOne({openid:openid});
    if (user && user.nickname) {
        return user;
    } else {
        var access_token = GetAccessToken();
        var userinfo_url = "https://api.weixin.qq.com/cgi-bin/user/info?access_token=" + access_token + "&openid=" + openid + "&lang=zh_CN";
        var userinfo_result = HTTP.get(userinfo_url);
        var userinfo_data = JSON.parse(userinfo_result.content);
        if (user) {
        Users.update(user._id, {$set: {
            nickname: userinfo_data.nickname,
            sex: userinfo_data.sex,
            language: userinfo_data.language,
            city: userinfo_data.city,
            province: userinfo_data.province,
            country: userinfo_data.country,
            headimgurl: userinfo_data.headimgurl
        }});
        } else {
        user = {};
        id = Ids.findOne({"name":"user"});
        user.uid = id.id + 1;
        Ids.update({"name":"user"}, {$inc:{id: 1}});
        user.openid = result.xml.FromUserName[0];
        user.nickname = userinfo_data.nickname;
        user.sex = userinfo_data.sex;
        user.language = userinfo_data.language;
        user.city = userinfo_data.city;
        user.province = userinfo_data.province;
        user.country = userinfo_data.country;
        user.headimgurl = userinfo_data.headimgurl;
        Users.insert(user);
        }
    }
    return user = Users.findOne({openid:openid});
}