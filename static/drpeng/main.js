var UserData = (function () {
    function UserData() {
    }
    return UserData;
}());
var DrpengExtend = (function () {
    function DrpengExtend(WSConn, $rootScope, $log, $sce, $q, $localStorage, $window, $timeout, $location, $translate, platformSettings, applicationSettings, defaultUserSettings, serverSettings, toast, modal, callHistory, Call, srvService, toggleService, dialHistory, flashVideo, mediaDevicesService, reportingService, $http) {
        // drpeng扩展对象，安插在根作用域上
        var drpengExtend = $rootScope.drpengExtend = window['drpeng'] = {
            /* 参会者相关信息 */
            alais: '',
            uuid: '',
            isChair: null,
            token: $location.search.token,
            displayName: '',
            orgID: null,
            mainScope: null,
            conferenceScope: null,
            screenShareSupported: applicationSettings.screenShareSupported,
            search: '',
            localLanguage: null,
            appbarDisplay: false,
            handupList: [],
            orgManagementURL: applicationSettings.orgManagementURL,
            speakerList: [],
            originSpeakerList: [],
            hide: true,
            // 会控功能 layout settings
            settings: {
                showMode: 'polling',
                // showMode: 'fixed',
                aliasShow: 'off',
                layoutView: '1:0',
                participantUuid: [],
                requestSending: false,
            },
            isShowParticipantsSelect: true,
            speakerUUIDMap: {},
            rtmpParticipant: null,
            noAuthoTip: '',
            // 用于录制的相关参数
            permissionRecord: false,
            isRecording: null,
            recordFileName: null,
            recordStartTime: null,
            recordTimeStr: '00:00:00',
            recordTimer: null,
            recordRtmpParticipant: null,
            recordRtmpUUID: null,
            isOwnRecord: false,
            password: null,
            // 用于直播的相关参数
            isLiving: false,
            liveRtmpParticipant: null,
            liveFileName: null,
            liveStartTime: null,
            liveTimeStr: '00:00:00',
            isOwnLive: false,
            liveRtmpUUID: null,
            liveTimer: null,
            availableLiveList: null,
            selectLiveID: null,
            permissionLive: false,
            selectParticipantAlert: function () {
                alert($translate.instant('IDS_SELECT_PARTICIPANT'));
            },
            // 判断当前环境是否是中文
            isChinese: function () {
                return localStorage['ngStorage-language'].indexOf('en-us.json') === -1;
            },
            // 获取参会者列表
            getParticipantsList: function () {
                var participantsList = this.mainScope.connection.participants;
                var handUpList = this.handupList;
                var _loop_1 = function (field) {
                    var target = participantsList[field];
                    var handUp = handUpList.filter(function (uuid) {
                        return target.uuid === uuid;
                    }).length;
                    target.handUp = handUp;
                };
                for (var field in participantsList) {
                    _loop_1(field);
                }
                return participantsList;
            },
            // 判断是否被管理员静音
            getIsMuted: function () {
                var participantList = this.mainScope.connection.participants;
                for (var field in participantList) {
                    var target = participantList[field];
                    if (target.uuid === this.uuid) {
                        return target.isMuted;
                    }
                }
            },
            // 屏幕分享失效时，触发这个函数，返回true时显示系统默认弹框，返回false时不显示。
            screenShareExtend: function () {
                drpengExtend.localLanguage = localStorage['ngStorage-language'];
                var bool = drpengExtend.checkFirfoxBrowser();
                if (bool == true) {
                    toggleService.toggle('dialog-screen-share-missing-firfox-drpeng', true);
                }
                else {
                    toggleService.toggle('dialog-screen-share-missing-drpeng', true);
                }
                return false;
            },
            // 来自platform的数据，包括操作系统、浏览器、浏览器版本号等。
            platform: function () {
                var result = {
                    os: platform.os.family,
                    // 浏览器名字
                    navigator: platform.name,
                    // 浏览器版本号
                    version: platform.version,
                    isWindows: platform.os.family.toLowerCase().indexOf('windows') >= 0,
                    isChrome: platform.name.toLowerCase().indexOf('chrome') >= 0
                };
                return result;
            },
            // 检查浏览器是否是手机浏览器
            checkMobileBrowser: function () {
                var isMobileBrowser = false;
                if (navigator.userAgent.match(/(iPhone|iPod|Android|ios)/i)) {
                    // 移动端设备
                    window.location.href = "http://a.app.qq.com/o/simple.jsp?pkgname=com.peng.cloudp";
                    isMobileBrowser = true;
                }
                return isMobileBrowser;
            },
            // 检查浏览器是否是QQ浏览器
            checkBrowser: function () {
                var userAgent = navigator.userAgent.toLowerCase();
                if (userAgent.indexOf("qq") > -1) {
                    return true;
                }
                else if (userAgent.indexOf("chrome") > -1) {
                    return false;
                }
            },
            // 检查浏览器的内核是webkit（谷歌）内核
            checkCore: function () {
                var isWebkitCore = false;
                var userAgent = navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('applewebkit/') > -1) {
                    isWebkitCore = true;
                }
                return isWebkitCore;
            },
            // 判断是否是A类浏览器（遨游定制版浏览器，不给相应的提示，且不隐藏共享按钮）
            checkFirstBrowser: function () {
                var userAgent = navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('applewebkit/') > -1) {
                    if (userAgent.indexOf('maxthon/1.3.49.4100') > -1) {
                        return true;
                    }
                }
                // 判断是火狐浏览器
                if (userAgent.indexOf('firefox') > -1) {
                    return true;
                }
                return false;
            },
            // 判断是否是火狐浏览器
            checkFirfoxBrowser: function () {
                var userAgent = navigator.userAgent.toLowerCase();
                // 判断是火狐浏览器
                if (userAgent.indexOf('firefox') > -1) {
                    return true;
                }
                return false;
            },
            // 判断是否是B类浏览器（chrome内核浏览器，chrome，QQ浏览器，360（chrome内核），遨游，猎豹等等 除了safari浏览器）
            checkSecondBrowser: function () {
                var isSecondBrowser = false;
                var userAgent = navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('applewebkit/') > -1) {
                    if (userAgent.indexOf('edge') < 0) {
                        if (userAgent.indexOf('version') < 0) {
                            if (userAgent.indexOf('chrome/53') == -1 && userAgent.indexOf('chrome/54') < 0) {
                                isSecondBrowser = true;
                            }
                        }
                    }
                }
                return isSecondBrowser;
            },
            // 判断是否是C类浏览器（IE9及以上版本，edge，360（IE内核），safair等）
            checkThirdBrowser: function () {
                var isCBrowser = false;
                var userAgent = navigator.userAgent.toLowerCase();
                // 判断是否是Edge浏览器
                if (userAgent.indexOf('applewebkit/') > -1 && userAgent.indexOf('edge') > -1) {
                    return true;
                }
                // 判断是否是Safari浏览器
                if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('version') > -1) {
                    return true;
                }
                // 不是Chrome53、54版本
                if (userAgent.indexOf('chrome/53') > -1 || userAgent.indexOf('chrome/54') > -1) {
                    return false;
                }
                // 判断是否是IE9以上版本。(包括IE10/IE11)
                if (userAgent.indexOf('trident/6.0') > -1 || userAgent.indexOf('trident/7.0') > -1) {
                    return true;
                }
                return isCBrowser;
            },
            // 判断我是否举手
            isMeHandUp: function () {
                var _this = this;
                // let participants = this.mainScope.connection.participants;
                var count = this.handupList.filter(function (x) {
                    return x === _this.uuid;
                }).length;
                return count > 0;
            },
            // 发出举手或放手的请求
            setHandUp: function (option) {
                if (option) {
                    WSConn.sendMsgForHandUp();
                }
                else {
                    WSConn.sendMsgForHandDown();
                }
            },
            // 判断是否显示聊天记录下载按钮
            canSaveMessages: function () {
                var ua = navigator.userAgent;
                if (ua.indexOf('Macintosh') >= 0 && ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0) {
                    return true;
                }
                else {
                    return false;
                }
            },
            // 下载聊天记录
            saveMessages: function () {
                var resultStr = this.conferenceScope.chat.messages.reduce(function (pv, nv) {
                    return pv + nv.origin + ':' + nv.payload + '\r\n';
                }, '') || [];
                var blob = new Blob([resultStr]);
                // var download = window.open(URL.createObjectURL(blob));
                var link = $('#hidden-save-link');
                link.attr('download', this.getSaveName());
                link.attr('href', URL.createObjectURL(blob));
                link[0].click();
            },
            // 获取下载聊天记录对应的文件名
            getSaveName: function () {
                var isCn = localStorage['ngStorage-language'].indexOf('cn') >= 0;
                var now = new Date();
                function numFix(num) {
                    return ('00' + num).slice(-2);
                }
                var dateStr = now.getFullYear() + numFix(now.getMonth() + 1) + numFix(now.getDate()) + numFix(now.getHours()) + numFix(now.getMinutes());
                if (isCn) {
                    return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + '聊天记录.txt';
                }
                else {
                    return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + 'chatlogs.txt';
                }
            },
            // 全部挂断
            disconnectAll: function () {
                modal.confirm('IDS_CONFERENCE_DISCONNECT_ALL', 'IDS_CONFERENCE_DISCONNECT_ALL_MESSAGE', function () {
                    drpengExtend.mainScope.connection.disconnectAll();
                    if (drpengExtend.recordRtmpParticipant) {
                        drpengExtend.stopRecord();
                    }
                    if (drpengExtend.liveRtmpParticipant) {
                        drpengExtend.stopLive();
                    }
                }, null, 'IDS_BUTTON_DISCONNECT');
            },
            // 主屏显示弹框 加入发言者（页面效果，不走接口）
            speakerAdd: function (event) {
                var selectedOption = $('.participant-list-select').find('option:selected');
                var speaker = selectedOption.text();
                drpengExtend.speakerList.push(speaker);
                drpengExtend.speakerUUIDMap[speaker] = selectedOption.attr('data-uuid');
            },
            // 主屏显示弹框 移除发言者（页面效果，不走接口）
            removeSpeaker: function (speaker) {
                var thisSpeakerList = drpengExtend.speakerList;
                for (var i = 0; i < thisSpeakerList.length; i++) {
                    if (thisSpeakerList[i] === speaker) {
                        thisSpeakerList.splice(i, 1);
                        drpengExtend.speakerList = thisSpeakerList;
                        delete drpengExtend.speakerUUIDMap[speaker];
                        return;
                    }
                }
            },
            // 修改会议系统的布局（override_layout）
            updateLayoutSettings: function (event, updateKey, updateValue) {
                drpengExtend.settings[updateKey] = updateValue;
                var actorsArr = [];
                var vadBackfill;
                drpengExtend.settings.requestSending = true;
                var layouts = {
                    "audience": [],
                    "actors": drpengExtend.settings.participantUuid,
                    "vad_backfill": true,
                    "layout": drpengExtend.settings.layoutView,
                    "indicators": "auto",
                    "plus_n": "auto",
                    "actors_overlay_text": drpengExtend.settings.aliasShow // 是否显示昵称
                };
                var data = {
                    layouts: layouts
                };
                drpengExtend.mainScope.connection.updateLayoutSettings(data);
                drpengExtend.settings.requestSending = false;
                $('#dialog-split-screen-mode').hide();
                var eventTarget = $(event.currentTarget);
                var eventTargetChildFirst = eventTarget.find('span:first');
                var eventTargetChildLast = eventTarget.find('span:last').html();
                if (updateKey.trim() === 'layoutView') {
                    drpengExtend.hide = true;
                    var splitScreenImgClass = 'nav_' + eventTargetChildFirst.attr('class');
                    var splitScreenHtml = '<span class="' + splitScreenImgClass + '"></span><span translate>' + eventTargetChildLast + '</span>';
                    $('#split-screen-mode').html(splitScreenHtml);
                }
            },
            // 保存发言模式的设置
            saveSpeakerModeSet: function () {
                var speakerUUIDMap = drpengExtend.speakerUUIDMap;
                drpengExtend.settings.participantUuid = [];
                for (var item in speakerUUIDMap) {
                    drpengExtend.settings.participantUuid.push(speakerUUIDMap[item]);
                }
                this.updateLayoutSettings(event, '', '');
                drpengExtend.originSpeakerList = drpengExtend.speakerList.concat();
            },
            /**
             * 直播和录制
             * @param token
             */
            // 判断是否有权限进行录制和直播
            /*
            isPromised() {
                let that = this;
                let url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + drpengExtend.alais + '/streams';
                return $http({
                    method: 'get',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                .then(function (response) {
                    if (response.data.code == 0) {
                        that.orgID = response.data.orgId;
                        if (response.data.record == 1) {
                            that.permissionRecord = true;
                        }
                        if (response.data.live == 1) {
                            that.permissionLive = true;
                        }
                    } else {
                        that.permissionLive = true;
                        that.permissionRecord = true;
                        alert(response.data.message);
                    }
                })
                .catch(function (error) {
                    console.warn("服务器内部错误！")
                })
            },
            */
            setRtmpParticipant: function (value) {
                drpengExtend.rtmpParticipant = value;
            },
            getRtmpParticipant: function () {
                return drpengExtend.rtmpParticipant;
            },
            setPassword: function (password) {
                drpengExtend.password = password;
            },
            getPassword: function () {
                var password = '';
                var getPass = drpengExtend.password;
                if (getPass) {
                    password = getPass;
                }
                return password;
            },
            /***************************************录制功能********************************************************/
            // 点击开始录制按钮
            startRecord: function (event) {
                var that = this;
                var countRTMP = that.getRtmpParticipant();
                var participants = that.mainScope.connection.participants;
                var personNum = that.getPropertyCount(participants);
                if (personNum <= 1 && participants.displayName == '会控') {
                    this.mainScope.toggle('loading', false);
                    alert("会议还未开始，请开始后再操作");
                }
                else {
                    // 判断是否有直播录制权限
                    var url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + drpengExtend.alais + '/streams';
                    $http({
                        method: 'get',
                        url: url,
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(function (response) {
                        if (response.data.code == 0) {
                            that.orgID = response.data.orgId;
                            // 有录制权限
                            if (response.data.record == 1) {
                                drpengExtend.mainScope.toggle('loading', true);
                                // 录制推流
                                drpengExtend.recordPush(1, 0, that.record.bind(that));
                            }
                            else if (response.data.record == 0) {
                                drpengExtend.mainScope.toggle('dialog-no-authority', true);
                                drpengExtend.noAuthoTip = 'record';
                            }
                        }
                        else {
                            alert(response.data.message);
                        }
                    })
                        .catch(function (error) {
                        console.warn("服务器内部错误！");
                    });
                }
            },
            // 录制推流
            recordPush: function (recordparm, liveparm, callbackparm) {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/rtmp/';
                var data = {
                    "meetingRoomNum": drpengExtend.alais,
                    "pin": that.getPassword(),
                    "token": drpengExtend.mainScope.connection.getToken(),
                    "recordStatus": recordparm,
                    "liveStatus": liveparm
                };
                $http({
                    method: 'POST',
                    url: url,
                    data: data,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    if (response.data.code == 0) {
                        that.orgID = response.data.data.appName;
                        that.recordFileName = response.data.data.recordName;
                        that.record(); // 录制推流成功后 进行录制
                        that.isOwnRecord = true;
                    }
                    else {
                        drpengExtend.mainScope.toggle('loading', false);
                        alert(response.data.message);
                    }
                })
                    .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！");
                });
            },
            // 录制
            record: function () {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/record/';
                var data = {
                    orgId: that.orgID,
                    fileName: that.recordFileName,
                    recordStatus: 1,
                };
                $http({
                    method: 'POST',
                    url: url,
                    data: data,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        // 获取到当前时间戳 即为录制开始时间 目的是为了计算时间差
                        that.recordStartTime = Date.now();
                        // 设置直播的状态为进行中 页面上可以根据这个转换成计时的状态
                        that.isRecording = true;
                        // 开始录制的计时
                        that.recordTimeCount();
                    }
                    else {
                        alert(response.data.message);
                    }
                })
                    .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert('网络问题或服务器内部错误，请稍后重试!');
                });
            },
            // 录制计时器控制
            recordTimeCount: function () {
                var that = this;
                var startTime = that.recordStartTime;
                // 获取当前时间与开始时间的差值 并转换为指定的格式
                that.recordTimeStr = that.getTimeBetween(startTime);
                that.timer = $timeout(function () {
                    that.recordTimeCount();
                }, 1000);
            },
            // 录制停止
            stopRecord: function () {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/record/' + that.orgID + '/' + that.recordFileName;
                $http({
                    method: 'PUT',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        that.recordTimeStr = '00:00:00'; // 清零录制时间
                        that.isRecording = false; // 设置录制状态 false：不在进行中
                        that.isOwnRecord = false;
                        // 调pexip接口 删除这个参会者（rtmp流会作为一个参会者）
                        var url_1 = "https://" + applicationSettings.serverAddress +
                            "/api/client/v2/conferences/" + that.orgID + "/" + "participants/"
                            + drpengExtend.recordRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url_1,
                            data: '',
                            headers: {
                                'token': drpengExtend.mainScope.connection.getToken(),
                                'pin': that.getPassword()
                            }
                        })
                            .then(function (data) {
                            drpengExtend.recordRtmpParticipant = false;
                            drpengExtend.isRecording = false;
                            alert("录制结束");
                        });
                    }
                    else {
                        alert(response.data.mesage);
                    }
                })
                    .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！");
                });
            },
            /***************************************直播功能********************************************************/
            // 获取已预约的直播列表
            getReservationLiveList: function () {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/' + that.alais + '/availableLiveList';
                $http({
                    method: 'GET',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    var responseData = response.data;
                    if (responseData.code == 0) {
                        that.availableLiveList = responseData.data;
                    }
                    else {
                        alert(responseData.mesage);
                    }
                })
                    .catch(function (error) {
                    alert("服务器内部错误！");
                });
            },
            // 外层 开始直播
            outterStartLive: function () {
                var that = this;
                // 判断是否有直播权限
                var url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + drpengExtend.alais + '/streams';
                $http({
                    method: 'get',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    if (response.data.code == 0) {
                        that.orgID = response.data.orgId;
                        // 有直播权限
                        if (response.data.record == 1) {
                            drpengExtend.getReservationLiveList();
                            // 显示预约直播弹框
                            drpengExtend.mainScope.toggle('dialog-reservation-live', true);
                        }
                        else if (response.data.record == 0) {
                            drpengExtend.mainScope.toggle('dialog-no-authority', true);
                            drpengExtend.noAuthoTip = 'live';
                        }
                    }
                    else {
                        alert(response.data.message);
                    }
                })
                    .catch(function (error) {
                    console.warn("服务器内部错误！");
                });
            },
            // 点击开始直播按钮
            startLiveClick: function () {
                var that = this;
                // 判断直播是否能开始 条件：参会者数量如果为1，且是“会控”，则此时还能进行直播
                var participants = that.mainScope.connection.participants;
                var personNum = that.getPropertyCount(participants);
                if (personNum <= 1 && participants.displayName == '会控') {
                    that.mainScope.toggle('loading', false);
                    alert("会议还未开始，请开始后再操作");
                    return;
                }
                drpengExtend.livePush(that.startLive.bind(that));
            },
            // 直播推流
            livePush: function (callbackparm) {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/bookLive/' + that.selectLiveID + '/pushRtmp?token=' + drpengExtend.mainScope.connection.getToken();
                $http({
                    method: 'GET',
                    url: url,
                    data: '',
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    var resData = response.data;
                    drpengExtend.mainScope.toggle('loading', false);
                    if (resData.code == "0") {
                        that.liveFileName = resData.rtmpName;
                        drpengExtend.startLive();
                    }
                    else {
                        that.mainScope.toggle('loading', false);
                        alert(resData.message);
                    }
                })
                    .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！");
                });
            },
            // 直播
            startLive: function () {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + drpengExtend.orgID + '/' + drpengExtend.liveFileName + '/1';
                $http({
                    method: 'post',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    that.mainScope.toggle('loading', false);
                    if (response.data.code == "0") {
                        that.isOwnLive = true;
                        that.isLiving = true;
                        that.liveStartTime = Date.now();
                        that.liveTimeCount();
                    }
                    else {
                        alert(response.data.message);
                    }
                })
                    .catch(function (error) {
                    that.mainScope.toggle('loading', false);
                    alert("服务器内部错误！");
                });
            },
            // 直播计时器控制
            liveTimeCount: function () {
                var that = this;
                var startTime = that.liveStartTime;
                that.liveTimeStr = that.getTimeBetween(startTime);
                that.liveTimer = $timeout(function () {
                    that.liveTimeCount();
                }, 1000);
            },
            // 停止直播
            stopLive: function () {
                var that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + drpengExtend.orgID + '/' + drpengExtend.liveFileName;
                $http({
                    method: 'PUT',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        that.isOwnLive = false;
                        var url_2 = "https://" + applicationSettings.serverAddress +
                            "/api/client/v2/conferences/" + that.orgID + "/" + "participants/"
                            + drpengExtend.liveRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url_2,
                            data: '',
                            headers: {
                                'token': drpengExtend.mainScope.connection.getToken(),
                                'pin': that.getPassword()
                            }
                        })
                            .then(function (data) {
                            that.liveRtmpParticipant = false;
                            that.isLiving = false;
                            alert("结束成功");
                        });
                    }
                    else {
                        alert(response.data.message);
                    }
                })
                    .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！");
                });
            },
            /***************************************公共方法********************************************************/
            // 获取对象的长度
            getPropertyCount: function (obj) {
                var n, count = 0;
                for (n in obj) {
                    if (obj.hasOwnProperty(n)) {
                        count++;
                    }
                }
                return count;
            },
            // 抽取出来的获取时间差的方法
            getTimeBetween: function (startTime) {
                var getTimeOfStartTime = new Date(startTime).getTime();
                var hours = (Math.floor((Date.now() - getTimeOfStartTime) / 1000 / 60 / 60) % 60) + '';
                var minutes = (Math.floor((Date.now() - getTimeOfStartTime) / 1000 / 60) % 60) + '';
                var seconds = (Math.round((Date.now() - getTimeOfStartTime) / 1000) % 60) + '';
                if (hours.length === 1)
                    hours = '0' + hours;
                if (minutes.length === 1)
                    minutes = '0' + minutes;
                if (seconds.length === 1)
                    seconds = '0' + seconds;
                return hours + ':' + minutes + ':' + seconds;
            },
            // 用来获取rtmp流的状态（直播或者录制）
            liveOrRecordStatus: function (flag) {
                var that = this;
                var rtmpURL = (flag === 0 ? drpengExtend.recordRtmpParticipant : drpengExtend.liveRtmpParticipant);
                var url = applicationSettings.apiServerUrl + '/v1/streaming/rtmpstatus/?rtmpUrl=' + rtmpURL.uri;
                $http({
                    method: 'GET',
                    url: url,
                    asyn: false,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                    var responseData = response.data;
                    if (responseData.code == "0") {
                        var responseDataDetail = responseData.data;
                        that.orgID = responseDataDetail.orgId;
                        var recordNowTime = responseData.time;
                        // 录制的相关信息
                        if (responseDataDetail.recordStatus == 1) {
                            var recordStartTime = responseData.data.startTime.substring(0, 19);
                            drpengExtend.permissionRecord = true;
                            drpengExtend.isRecording = true;
                            drpengExtend.recordStartTime = recordStartTime;
                            drpengExtend.recordTimeCount();
                        }
                        // 直播的相关信息
                        if (responseDataDetail.liveStatus == 1) {
                            var liveStartTime = responseData.data.liveStartTime.substring(0, 19);
                            drpengExtend.permissionLive = true;
                            drpengExtend.isLiving = true;
                            drpengExtend.liveStartTime = liveStartTime;
                            drpengExtend.liveTimeCount();
                        }
                    }
                    else {
                        if (flag === 0) {
                            that.permissionRecord = true;
                            that.isRecording = true;
                            that.recordStartTime = Date.now();
                            that.recordTimeCount();
                        }
                        else if (flag === 1) {
                            that.permissionLive = true;
                            that.isLiving = true;
                            that.liveStartTime = Date.now();
                            that.liveTimeCount();
                        }
                    }
                })
                    .catch(function (error) {
                    alert("服务器内部错误!");
                });
            },
            // 当在设置中修改了语言后，立即更新
            updateLanguage: function () {
                $translate.use($localStorage.language);
            },
            // 直接在地址栏中输入地址并给出匹配的token，允许直接进入到会议中（不需要登陆的一些判断）
            if: function (token) {
                var mainControllerScope = this.mainScope;
                $http.get(applicationSettings.apiServerUrl + '/v1/abroad/checkToken/?token=' + $location.search().token)
                    .then(function (res) {
                    console.log(res);
                    // res.data = {
                    //     code: "0",
                    //     guestPwd: "123456",
                    //     meetingRoomNum: "700321",
                    //     message: "成功",
                    // }
                    if (res.data.code != '0') {
                        return;
                    }
                    var conferenceNum = res.data.meetingRoomNum;
                    var guestPwd = res.data.guestPwd;
                    mainControllerScope.params.pin = guestPwd;
                    mainControllerScope.params.conference = conferenceNum;
                    console.log('try login:\n', conferenceNum, '访客', guestPwd, undefined, mainControllerScope.params.extension);
                    mainControllerScope.login(conferenceNum, '访客', guestPwd, undefined, mainControllerScope.params.extension);
                });
            }
        };
        // 连接成功的事件
        $rootScope.$on('call::connected', function (event, data) {
            console.info('[drpeng]', 'call::connected事件');
            var alias = data.alias.split('@')[0], uuid = data.uuid;
            drpengExtend.isChair = data.isChair;
            drpengExtend.alais = alias;
            drpengExtend.uuid = uuid;
            drpengExtend.displayName = data.displayName;
            WSConn.connect(alias, uuid);
            // 当接收到举手列表更新事件后 执行的代码
            WSConn.addHandUpListReceiveListener(function (list) {
                drpengExtend.handupList = list || [];
                setTimeout(function () {
                    $rootScope.$apply();
                });
            });
        });
        // 连接断开的事件
        $rootScope.$on('drpeng::disconnect', function (event) {
            WSConn.disconnect();
        });
        // 监听新增参会者事件
        $rootScope.$on('drpeng::participantCreate', function (event, participant) {
            setTimeout(function () {
                if (participant['protocol'] === 'rtmp') {
                    // rtmp://118.144.155.108/26/700025_20161116_171148
                    var rtmpArray = participant['uri'].split("/");
                    if (rtmpArray[0] == "rtmp:") {
                        // temp格式 700025_20161116_171148
                        var temp = rtmpArray[rtmpArray.length - 1];
                        if (/^[0-9]/.test(temp) && (temp.split("_").length == 3)) {
                            drpengExtend.recordRtmpParticipant = participant;
                            drpengExtend.recordRtmpUUID = participant.uuid; // 用于以后删除的监听
                            var uriArray = participant.uri.split('/');
                            drpengExtend.recordFileName = uriArray[uriArray.length - 1];
                            // 传入一个标志 用来判断是获取直播还是录制的状态 0 表示录制；1 表示直播
                            drpengExtend.liveOrRecordStatus(0);
                        }
                        else if (temp.indexOf('live_') != -1) {
                            drpengExtend.liveRtmpParticipant = participant;
                            drpengExtend.liveRtmpUUID = participant.uuid;
                            var uriArray = participant.uri.split('/');
                            drpengExtend.liveFileName = uriArray[uriArray.length - 1];
                            drpengExtend.liveOrRecordStatus(1);
                        }
                    }
                }
            }, 1200);
        });
        // 监听删除参会者事件
        $rootScope.$on('drpeng::participantDelete', function (event, participantUUID) {
            if (participantUUID.uuid == drpengExtend.recordRtmpUUID) {
                drpengExtend.recordRtmpParticipant = false;
                drpengExtend.isRecording = false;
                drpengExtend.recordTimeStr = '00:00:00';
                drpengExtend.recordRtmpUUID = null;
            }
            else if (participantUUID.uuid == drpengExtend.liveRtmpUUID) {
                $('#J-start-live').removeClass('disabled');
                drpengExtend.liveRtmpParticipant = false;
                drpengExtend.isLiving = false;
                drpengExtend.liveTimeStr = '00:00:00';
                drpengExtend.liveRtmpUUID = null;
            }
        });
        // 监听layout改变事件
        $rootScope.$on('drpeng::layout', function (event, msg) {
            var view = msg.view;
            drpengExtend.settings.layoutView = view;
            var splitScreenHtml = null;
            var translate = null;
            if (view === "1:0") {
                translate = $translate.instant('IDS_CONFERENCE_A_MAIN_SCREEN');
                splitScreenHtml = '<span class="nav_main-screen-img"></span><span>' + translate + '</span>';
            }
            else if (view === "4:0") {
                translate = $translate.instant('IDS_CONFERENCE_FOUR_POINT_SCREEN');
                splitScreenHtml = '<span class="nav_five-split-screen-img"></span><span>' + translate + '</span>';
            }
            else if (view === "1:7") {
                translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_SEVEN_SCREEN');
                splitScreenHtml = '<span class="nav_one-seven-screen-img"></span><span>' + translate + '</span>';
            }
            else if (view === "1:21") {
                translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_TWENTY_ONE_SCREEN');
                splitScreenHtml = '<span class="nav_one-twenty-one-screen-img"></span><span>' + translate + '</span>';
            }
            else if (view === "2:21") {
                translate = $translate.instant('IDS_CONFERENCE_TWO_ADD_TWENTY_ONE_SCREEN');
                splitScreenHtml = '<span class="nav_two-twenty-one-screen-img"></span><span>' + translate + '</span>';
            }
            $('#split-screen-mode').html(splitScreenHtml);
        });
    }
    return DrpengExtend;
}());
DrpengExtend.$inject = [
    "WSConnection",
    "$rootScope",
    "$log",
    "$sce",
    "$q",
    "$localStorage",
    "$window",
    "$timeout",
    "$location",
    "$translate",
    "platformSettings",
    "applicationSettings",
    "defaultUserSettings",
    "serverSettings",
    "toast",
    "modal",
    "callHistory",
    "Call",
    "srvService",
    "toggleService",
    "dialHistory",
    "flashVideo",
    "mediaDevicesService",
    "reportingService",
    "$http"
];
//# sourceMappingURL=main.js.map