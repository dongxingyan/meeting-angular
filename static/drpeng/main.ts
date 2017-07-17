declare let platform;   // 来自于Platform.js的对象，挂载在全局

class UserData {
    alias:               string;    // "700015@tp.cloudp.cc"
    analyticsEnabled:  boolean;   // true
    avatarUrl:          string;    // "https://tp.cloudp.cc/api/client/v2/conferences/700015@tp.cloudp.cc/avatar.jpg"
    bandwidthIn:        number;   // 512
    bandwidthOut:       number;   // 512
    chatEnabled:        boolean;  // true
    disabledProtocols: string[]; // Array[1]
    displayName:        string;   // "test"
    feccEnabled:        boolean;  // false
    isChair:             boolean;  // true
    isGateway:           boolean;  // false
    remoteCallType:     string;   //" video"
    serviceType:        string;   // "conference"
    uuid:                 string;  // "fa837e78-649c-48a7-a5c9-d399901261ad"
    version:             string;  // "13 (32124.0.0)"
}

class DrpengExtend {
    static
    $inject = [
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

    constructor(
        WSConn: WebSocketService,
        $rootScope: any,
        $log,
        $sce,
        $q,
        $localStorage,
        $window,
        $timeout,
        $location,
        $translate,
        platformSettings,
        applicationSettings,
        defaultUserSettings,
        serverSettings,
        toast,
        modal,
        callHistory,
        Call,
        srvService,
        toggleService,
        dialHistory,
        flashVideo,
        mediaDevicesService,
        reportingService,
        $http) {

        // drpeng扩展对象，安插在根作用域上
        let drpengExtend = $rootScope.drpengExtend = window['drpeng'] = {
            /* 参会者相关信息 */
            alais: '',                       // 会议室名称
            uuid: '',                        // 参会者的唯一标识
            isChair: null,                  // 当前参会者的身份，是否是主持人
            token: $location.search.token,  // 参会者的token（时时变化的）
            displayName: '',                // 参会者昵称
            orgID: null,                    // 机构id

            mainScope: null,         // drpeng的作用域，等于main-controller的作用域。
            conferenceScope: null,  // 等于conference-controller的作用域

            screenShareSupported: applicationSettings.screenShareSupported, // 是否支持屏幕共享

            search: '',               // 用于会议室主界面左侧的搜索功能
            localLanguage: null,    // 获取当前环境的语言。即目前是加载了那个语言的json文件
            appbarDisplay: false,   // 判断会控条是否展开。
            handupList: [],          // 保存处于举手状态的参会者的相关信息列表，用于举手功能。

            orgManagementURL: applicationSettings.orgManagementURL, // 机构管理的地址，当没有预约的直播可供直播时将会引导用户跳转到机构管理，去创建直播。

            speakerList: [],        // 用于主屏模式时选择固定的参会者信息列表
            originSpeakerList: [], // 之前的参会者信息列表。目的是，当选择主屏模式的时候，如果已经去修改了固定参会者的列表，但是点击取消时，要恢复到之前状态。
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
            speakerUUIDMap: {},  // 用于存放主屏模式固定的参会者列表。之所以选择map结构，是因为它便于添加和删除
            rtmpParticipant: null,
            noAuthoTip: '',     // 用于当直播、录制没有权限时，给出的弹框的描述信息是直播还是录制的
            // 用于录制的相关参数
            permissionRecord: false,         // 是否有权限进行录制
            isRecording: null,                // 当前是否处于正在录制的状态
            recordFileName: null,            // 录制文件名称
            recordStartTime: null,           // 录制的开始时间
            recordTimeStr: '00:00:00',      // 显示在页面上的录制计时字符串
            recordTimer: null,                // 录制计时器
            recordRtmpParticipant: null,    // 录制时推的流（作为一个参会者）的相关信息
            recordRtmpUUID: null,            // 录制推的流的uuid
            isOwnRecord: false,              // 是否是自己的录制
            password: null,                   // 录制推流时需要传的参数（参会密码）
            // 用于直播的相关参数
            isLiving: false,              // 当前是否处于正在直播的状态
            liveRtmpParticipant: null,  // 直播时推的流（作为一个参会者）的相关信息
            liveFileName: null,          // 直播文件名称
            liveStartTime: null,         // 直播开始时间
            liveTimeStr: '00:00:00',    // 显示在页面上的直播计时字符串
            isOwnLive: false,            // 是否是自己的直播
            liveRtmpUUID: null,          // 直播推的流的uuid
            liveTimer: null,             // 直播计时器
            availableLiveList: null,    // 点击开始直播出现的弹框中会有一个已预约的直播列表
            selectLiveID: null,         // 选中要进行直播的id
            permissionLive: false,      // 当前用户是否有权限进行直播

            selectParticipantAlert: function () {
                alert($translate.instant('IDS_SELECT_PARTICIPANT'));
            },
            // 判断当前环境是否是中文
            isChinese: function () {
                return localStorage['ngStorage-language'].indexOf('en-us.json') === -1;
            },
            // 获取参会者列表
            getParticipantsList: function() {
                let participantsList = this.mainScope.connection.participants;
                let handUpList = this.handupList;
                for (let field in participantsList) {
                    let target = participantsList[field];
                    let handUp = handUpList.filter((uuid) => {
                        return target.uuid === uuid;
                    }).length;
                    target.handUp = handUp;
                }
                return participantsList;
            },
            // 判断是否被管理员静音
            getIsMuted: function() {
                let participantList = this.mainScope.connection.participants;
                for (let field in participantList) {
                    let target = participantList[field];
                    if (target.uuid === this.uuid) {
                        return target.isMuted;
                    }
                }
            },
            // 屏幕分享失效时，触发这个函数，返回true时显示系统默认弹框，返回false时不显示。
            screenShareExtend: function () {
                drpengExtend.localLanguage = localStorage['ngStorage-language'];

                var bool = drpengExtend.checkFirfoxBrowser();

                if (bool == true){
                    toggleService.toggle('dialog-screen-share-missing-firfox-drpeng', true);
                }else {
                    toggleService.toggle('dialog-screen-share-missing-drpeng', true);
                }
                return false;
            },
            // 来自platform的数据，包括操作系统、浏览器、浏览器版本号等。
            platform: function () {
                let result = {
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
            checkMobileBrowser: function() {
                let isMobileBrowser = false;
                if(navigator.userAgent.match(/(iPhone|iPod|Android|ios)/i)) {
                    // 移动端设备
                    window.location.href="http://a.app.qq.com/o/simple.jsp?pkgname=com.peng.cloudp";
                    isMobileBrowser = true;
                }
                return isMobileBrowser;
            },
            // 检查浏览器是否是QQ浏览器
            checkBrowser: function(){
                let userAgent = navigator.userAgent.toLowerCase();
                if(userAgent.indexOf("qq") > -1) {
                    return true;
                } else if(userAgent.indexOf("chrome") > -1) {
                    return false;
                }
            },
            // 检查浏览器的内核是webkit（谷歌）内核
            checkCore: function(){
                let isWebkitCore = false;
                let userAgent = navigator.userAgent.toLowerCase();
                if(userAgent.indexOf('applewebkit/') > -1) {
                    isWebkitCore = true;
                }
                return isWebkitCore;
            },
            // 判断是否是A类浏览器（遨游定制版浏览器，不给相应的提示，且不隐藏共享按钮）
            checkFirstBrowser: function () {
                let userAgent = navigator.userAgent.toLowerCase();

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
                let userAgent = navigator.userAgent.toLowerCase();

                // 判断是火狐浏览器
                if (userAgent.indexOf('firefox') > -1) {

                    return true;
                }
                return false;
            },

            // 判断是否是B类浏览器（chrome内核浏览器，chrome，QQ浏览器，360（chrome内核），遨游，猎豹等等 除了safari浏览器）
            checkSecondBrowser: function () {
                let isSecondBrowser = false;
                let userAgent = navigator.userAgent.toLowerCase();

                if (userAgent.indexOf('applewebkit/') > -1) {
                    if (userAgent.indexOf('edge') < 0) { // 不是Edge浏览器
                        if (userAgent.indexOf('version') < 0) { // 不是Safari浏览器
                            if (userAgent.indexOf('chrome/53') == -1 && userAgent.indexOf('chrome/54') < 0) { // 不是Chrome53、54版本
                                isSecondBrowser = true;
                            }
                        }
                    }
                }

                return isSecondBrowser;
            },
            // 判断是否是C类浏览器（IE9及以上版本，edge，360（IE内核），safair等）
            checkThirdBrowser: function () {
                let isCBrowser = false;
                let userAgent = navigator.userAgent.toLowerCase();
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
                // let participants = this.mainScope.connection.participants;
                let count = this.handupList.filter((x)=> {
                    return x === this.uuid;
                }).length;
                return count > 0;
            },
            // 发出举手或放手的请求
            setHandUp: function (option) {
                if(option) {
                    WSConn.sendMsgForHandUp();
                } else {
                    WSConn.sendMsgForHandDown();
                }
            },
            // 判断是否显示聊天记录下载按钮
            canSaveMessages: function () {
                let ua = navigator.userAgent;
                if (ua.indexOf('Macintosh') >= 0 && ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0) {
                    return true;
                } else {
                    return false;
                }
            },
            // 下载聊天记录
            saveMessages: function () {
                let resultStr = this.conferenceScope.chat.messages.reduce(function (pv, nv) {
                    return pv + nv.origin + ':' + nv.payload + '\r\n';
                }, '') || [];
                let blob = new Blob([resultStr]);
                // var download = window.open(URL.createObjectURL(blob));
                let link = $('#hidden-save-link');
                link.attr('download', this.getSaveName());
                link.attr('href', URL.createObjectURL(blob));
                link[0].click();
            },
            // 获取下载聊天记录对应的文件名
            getSaveName: function () {
                let isCn = localStorage['ngStorage-language'].indexOf('cn') >= 0;
                let now = new Date();

                function numFix(num) {
                    return ('00' + num).slice(-2);
                }

                let dateStr = now.getFullYear() + numFix(now.getMonth() + 1) + numFix(now.getDate()) + numFix(now.getHours()) + numFix(now.getMinutes());
                if (isCn) {
                    return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + '聊天记录.txt';
                } else {
                    return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + 'chatlogs.txt';
                }
            },
            // 全部挂断
            disconnectAll: function () {
                modal.confirm(
                    'IDS_CONFERENCE_DISCONNECT_ALL',
                    'IDS_CONFERENCE_DISCONNECT_ALL_MESSAGE',
                    function () {
                        drpengExtend.mainScope.connection.disconnectAll();
                        if (drpengExtend.recordRtmpParticipant) {
                            drpengExtend.stopRecord();
                        }
                        if (drpengExtend.liveRtmpParticipant) {
                            drpengExtend.stopLive();
                        }
                    },
                    null,
                    'IDS_BUTTON_DISCONNECT');
            },
            // 主屏显示弹框 加入发言者（页面效果，不走接口）
            speakerAdd: function (event) {
                let selectedOption = $('.participant-list-select').find('option:selected');
                let speaker = selectedOption.text();
                drpengExtend.speakerList.push(speaker);
                drpengExtend.speakerUUIDMap[speaker] = selectedOption.attr('data-uuid')
            },
            // 主屏显示弹框 移除发言者（页面效果，不走接口）
            removeSpeaker: function(speaker) {
                let thisSpeakerList = drpengExtend.speakerList;
                for(let i = 0; i < thisSpeakerList.length; i++) {
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
                let actorsArr = [];
                let vadBackfill;
                drpengExtend.settings.requestSending = true;

                let layouts = {
                    "audience": [],
                    "actors": drpengExtend.settings.participantUuid,
                    "vad_backfill": true,
                    "layout": drpengExtend.settings.layoutView,  // 分屏模式
                    "indicators": "auto",
                    "plus_n": "auto",
                    "actors_overlay_text": drpengExtend.settings.aliasShow  // 是否显示昵称
                };
                let data = {
                    layouts: layouts
                }
                drpengExtend.mainScope.connection.updateLayoutSettings(data);
                drpengExtend.settings.requestSending = false;
                $('#dialog-split-screen-mode').hide();

                let eventTarget = $(event.currentTarget);
                let eventTargetChildFirst = eventTarget.find('span:first');
                let eventTargetChildLast = eventTarget.find('span:last').html();

                if (updateKey.trim() === 'layoutView') {
                    drpengExtend.hide = true;
                    let splitScreenImgClass = 'nav_' + eventTargetChildFirst.attr('class');
                    let splitScreenHtml = '<span class="'+ splitScreenImgClass +'"></span><span translate>' + eventTargetChildLast + '</span>';
                    $('#split-screen-mode').html(splitScreenHtml);
                }
            },
            // 保存发言模式的设置
            saveSpeakerModeSet: function() {
                let speakerUUIDMap = drpengExtend.speakerUUIDMap;
                drpengExtend.settings.participantUuid = [];

                for (let item in speakerUUIDMap) {
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
            setRtmpParticipant (value) {
                drpengExtend.rtmpParticipant = value;
            },
            getRtmpParticipant: function () {
                return drpengExtend.rtmpParticipant;
            },
            setPassword: function (password) {
              drpengExtend.password = password;
            },
            getPassword: function () {
                let password = '';
                let getPass = drpengExtend.password;
                if (getPass) {
                    password = getPass;
                }
                return password;
            },

            /***************************************录制功能********************************************************/
            // 点击开始录制按钮
            startRecord (event) {
                let that = this;
                let countRTMP = that.getRtmpParticipant();
                let participants = that.mainScope.connection.participants;
                let personNum = that.getPropertyCount(participants);
                if(personNum <= 1 && participants.displayName == '会控'){
                    this.mainScope.toggle('loading', false);
                    alert("会议还未开始，请开始后再操作");
                } else{
                    // 判断是否有直播录制权限
                    let url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + drpengExtend.alais + '/streams';
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
                                } else if (response.data.record == 0) { // 没有录制权限
                                    drpengExtend.mainScope.toggle('dialog-no-authority', true);
                                    drpengExtend.noAuthoTip = 'record'
                                }
                            } else {
                                alert(response.data.message);
                            }
                        })
                        .catch(function (error) {
                            console.warn("服务器内部错误！")
                        })
                }
            },
            // 录制推流
            recordPush (recordparm, liveparm, callbackparm) {
                let that = this;
                let url = applicationSettings.apiServerUrl + '/v1/streaming/rtmp/';
                let data = {
                    "meetingRoomNum": drpengExtend.alais,
                    "pin": that.getPassword(),
                    "token": drpengExtend.mainScope.connection.getToken(),
                    "recordStatus": recordparm,
                    "liveStatus": liveparm
                }
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
                    } else {
                        drpengExtend.mainScope.toggle('loading', false);
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
            },
            // 录制
            record () {
                let that = this
                var url = applicationSettings.apiServerUrl + '/v1/streaming/record/';
                var data = {
                    orgId: that.orgID,
                    fileName: that.recordFileName,
                    recordStatus: 1,
                }
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
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert('网络问题或服务器内部错误，请稍后重试!')
                })
            },
            // 录制计时器控制
            recordTimeCount () {
                let that = this;
                let startTime = that.recordStartTime;
                // 获取当前时间与开始时间的差值 并转换为指定的格式
                that.recordTimeStr = that.getTimeBetween(startTime);

                that.timer = $timeout(function () {
                    that.recordTimeCount()
                }, 1000)
            },
            // 录制停止
            stopRecord () {
                let that = this;
                let url = applicationSettings.apiServerUrl + '/v1/streaming/record/' + that.orgID + '/' + that.recordFileName;
                $http({
                    method: 'PUT',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                .then(function (response) {
                    drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        that.recordTimeStr = '00:00:00';   // 清零录制时间
                        that.isRecording = false;   // 设置录制状态 false：不在进行中
                        that.isOwnRecord = false;
                        // 调pexip接口 删除这个参会者（rtmp流会作为一个参会者）
                        let url =
                            "https://"+applicationSettings.serverAddress +
                                "/api/client/v2/conferences/" + that.orgID + "/" + "participants/"
                                    + drpengExtend.recordRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url,
                            data: '',
                            headers: {
                                'token': drpengExtend.mainScope.connection.getToken(),
                                'pin': that.getPassword()
                            }
                        })
                        .then(function (data) {
                            drpengExtend.recordRtmpParticipant = false;
                            drpengExtend.isRecording = false;
                            alert("录制结束")
                        })

                    } else {    // 录制停止失败
                        alert(response.data.mesage)
                    }
                })
                .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
            },
            /***************************************直播功能********************************************************/
            // 获取已预约的直播列表
            getReservationLiveList () {
                let that = this;
                let url = applicationSettings.apiServerUrl + '/v1/streaming/' + that.alais + '/availableLiveList';
                $http({
                    method: 'GET',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                .then(function (response) {
                    let responseData = response.data;
                    if (responseData.code == 0) {
                        that.availableLiveList = responseData.data;
                    } else {
                        alert(responseData.mesage)
                    }
                })
                .catch(function (error) {
                    alert("服务器内部错误！")
                })
            },
            // 外层 开始直播
            outterStartLive () {
                let that = this;
                // 判断是否有直播权限
                let url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + drpengExtend.alais + '/streams';
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
                            } else if (response.data.record == 0) { // 没有直播权限
                                drpengExtend.mainScope.toggle('dialog-no-authority', true);
                                drpengExtend.noAuthoTip = 'live'
                            }
                        } else {
                            alert(response.data.message);
                        }
                    })
                    .catch(function (error) {
                        console.warn("服务器内部错误！")
                    })
            },
            // 点击开始直播按钮
            startLiveClick () {
                let that = this;
                // 判断直播是否能开始 条件：参会者数量如果为1，且是“会控”，则此时还能进行直播
                let participants = that.mainScope.connection.participants;
                let personNum = that.getPropertyCount(participants);

                if (personNum <= 1 && participants.displayName == '会控') {
                    that.mainScope.toggle('loading', false);
                    alert("会议还未开始，请开始后再操作");
                    return ;
                }
                drpengExtend.livePush(that.startLive.bind(that));
            },
            // 直播推流
            livePush (callbackparm) {
                let that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/bookLive/' + that.selectLiveID + '/pushRtmp?token=' + drpengExtend.mainScope.connection.getToken();
                $http({
                    method: 'GET',
                    url: url,
                    data: '',
                    headers: { "Content-Type": "application/json" }
                })
                .then(function (response) {
                    let resData = response.data;
                    drpengExtend.mainScope.toggle('loading', false);
                    if (resData.code == "0") {
                        that.liveFileName = resData.rtmpName;
                        drpengExtend.startLive();
                    } else {
                        that.mainScope.toggle('loading', false);
                        alert(resData.message)
                    }
                })
                .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
            },
            // 直播
            startLive () {
                let that = this;
                var url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + drpengExtend.orgID + '/' + drpengExtend.liveFileName + '/1';
                $http({
                    method: 'post',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                .then((response) => {
                    that.mainScope.toggle('loading', false);
                    if (response.data.code == "0") {
                        that.isOwnLive = true;
                        that.isLiving = true;
                        that.liveStartTime = Date.now();
                        that.liveTimeCount();
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    that.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
            },
            // 直播计时器控制
            liveTimeCount () {
                let that = this;
                let startTime = that.liveStartTime;

                that.liveTimeStr = that.getTimeBetween(startTime);

                that.liveTimer = $timeout(function () {
                    that.liveTimeCount()
                }, 1000)
            },
            // 停止直播
            stopLive () {
                let that = this;
                let url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + drpengExtend.orgID + '/' + drpengExtend.liveFileName;
                $http({
                    method: 'PUT',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                .then(function (response) {
                    drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        that.isOwnLive = false;
                        let url =
                            "https://"+applicationSettings.serverAddress +
                                "/api/client/v2/conferences/" + that.orgID + "/" + "participants/"
                                    + drpengExtend.liveRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url,
                            data: '',
                            headers: {
                                'token': drpengExtend.mainScope.connection.getToken(),
                                'pin': that.getPassword()
                            }
                        })
                        .then(function(data) {
                            that.liveRtmpParticipant = false;
                            that.isLiving = false;
                            alert("结束成功");
                        })
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
            },
            /***************************************公共方法********************************************************/
            // 获取对象的长度
            getPropertyCount (obj) {
                let n, count = 0;
                for(n in obj){
                    if(obj.hasOwnProperty(n)){
                        count++;
                    }
                }
                return count;
            },
            // 抽取出来的获取时间差的方法
            getTimeBetween (startTime) {
                let getTimeOfStartTime = new Date(startTime).getTime();
                let hours = (Math.floor((Date.now() - getTimeOfStartTime) / 1000 / 60 / 60) % 60) + '' ;
                let minutes = (Math.floor((Date.now() - getTimeOfStartTime) / 1000 / 60) % 60) + '';
                let seconds = (Math.round((Date.now() - getTimeOfStartTime) / 1000) % 60) + '';

                if (hours.length === 1) hours = '0' + hours;
                if (minutes.length === 1) minutes = '0' + minutes;
                if (seconds.length === 1) seconds = '0' + seconds;

                return hours + ':' + minutes + ':' + seconds;
            },
            // 用来获取rtmp流的状态（直播或者录制）
            liveOrRecordStatus(flag) {
                let that = this;

                let rtmpURL = (flag === 0 ? drpengExtend.recordRtmpParticipant : drpengExtend.liveRtmpParticipant);

                let url = applicationSettings.apiServerUrl + '/v1/streaming/rtmpstatus/?rtmpUrl=' + rtmpURL.uri;

                $http({
                    method: 'GET',
                    url: url,
                    asyn: false,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                        let responseData = response.data;
                        if (responseData.code == "0") {
                            let responseDataDetail = responseData.data;
                            that.orgID = responseDataDetail.orgId;

                            let recordNowTime = responseData.time;

                            // 录制的相关信息
                            if (responseDataDetail.recordStatus == 1) {
                                let recordStartTime = responseData.data.startTime.substring(0, 19);
                                drpengExtend.permissionRecord = true;
                                drpengExtend.isRecording = true;

                                drpengExtend.recordStartTime = recordStartTime;
                                drpengExtend.recordTimeCount();
                            }
                            // 直播的相关信息
                            if (responseDataDetail.liveStatus == 1) {
                                let liveStartTime = responseData.data.liveStartTime.substring(0, 19);
                                drpengExtend.permissionLive = true;
                                drpengExtend.isLiving = true;

                                drpengExtend.liveStartTime = liveStartTime;
                                drpengExtend.liveTimeCount();
                            }
                        } else {
                            if (flag === 0) {
                                that.permissionRecord = true;
                                that.isRecording = true;
                                that.recordStartTime = Date.now();
                                that.recordTimeCount();
                            } else if (flag === 1) {
                                that.permissionLive = true;
                                that.isLiving = true;
                                that.liveStartTime = Date.now();
                                that.liveTimeCount();
                            }
                        }
                    })
                    .catch(function (error) {
                        alert("服务器内部错误!")
                    })
            },
            // 当在设置中修改了语言后，立即更新
            updateLanguage () {
                $translate.use($localStorage.language);
            },
            // 直接在地址栏中输入地址并给出匹配的token，允许直接进入到会议中（不需要登陆的一些判断）
            if (token) {
                let mainControllerScope = this.mainScope;
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
                            return
                        }
                        var conferenceNum = res.data.meetingRoomNum;
                        var guestPwd = res.data.guestPwd;

                        mainControllerScope.params.pin = guestPwd;
                        mainControllerScope.params.conference = conferenceNum;

                        console.log('try login:\n',
                            conferenceNum,
                            '访客',
                            guestPwd,
                            undefined,
                            mainControllerScope.params.extension);
                        mainControllerScope.login(
                            conferenceNum,
                            '访客',
                            guestPwd,
                            undefined,
                            mainControllerScope.params.extension
                        );
                    })
            }
        };
        // 连接成功的事件
        $rootScope.$on('call::connected', function (event, data: UserData) {
            console.info('[drpeng]','call::connected事件')
            let alias = data.alias.split('@')[0],
                uuid = data.uuid;

            drpengExtend.isChair = data.isChair;
            drpengExtend.alais = alias;
            drpengExtend.uuid = uuid;
            drpengExtend.displayName = data.displayName;
            WSConn.connect(alias, uuid);
            // 当接收到举手列表更新事件后 执行的代码
            WSConn.addHandUpListReceiveListener((list) => {
                drpengExtend.handupList = list || [];
                setTimeout(function () {
                    $rootScope.$apply();
                })
            })
        });
        // 连接断开的事件
        $rootScope.$on('drpeng::disconnect', function (event) {
            WSConn.disconnect()
        });
        // 监听新增参会者事件
        $rootScope.$on('drpeng::participantCreate', function (event, participant) {
            setTimeout(() => {
                if (participant['protocol'] === 'rtmp') {
                    // rtmp://118.144.155.108/26/700025_20161116_171148
                    var rtmpArray = participant['uri'].split("/");
                    if (rtmpArray[0] == "rtmp:"){
                        // temp格式 700025_20161116_171148
                        let temp = rtmpArray[rtmpArray.length-1];
                        if (/^[0-9]/.test(temp) && (temp.split("_").length == 3)) {
                            drpengExtend.recordRtmpParticipant = participant;
                            drpengExtend.recordRtmpUUID = participant.uuid;     // 用于以后删除的监听
                            let uriArray = participant.uri.split('/');
                            drpengExtend.recordFileName = uriArray[uriArray.length - 1];
                            // 传入一个标志 用来判断是获取直播还是录制的状态 0 表示录制；1 表示直播
                            drpengExtend.liveOrRecordStatus(0);
                        } else if (temp.indexOf('live_') != -1) {
                            drpengExtend.liveRtmpParticipant = participant;
                            drpengExtend.liveRtmpUUID = participant.uuid;
                            let uriArray = participant.uri.split('/');
                            drpengExtend.liveFileName = uriArray[uriArray.length - 1];
                            drpengExtend.liveOrRecordStatus(1);
                        }
                    }
                }
            }, 1200)
        });
        // 监听删除参会者事件
        $rootScope.$on('drpeng::participantDelete', function (event, participantUUID) {
            if (participantUUID.uuid == drpengExtend.recordRtmpUUID ) {
                drpengExtend.recordRtmpParticipant = false;
                drpengExtend.isRecording = false;
                drpengExtend.recordTimeStr = '00:00:00';
                drpengExtend.recordRtmpUUID = null;
            } else if (participantUUID.uuid == drpengExtend.liveRtmpUUID) {
                $('#J-start-live').removeClass('disabled');
                drpengExtend.liveRtmpParticipant = false;
                drpengExtend.isLiving = false;
                drpengExtend.liveTimeStr = '00:00:00';
                drpengExtend.liveRtmpUUID = null;
            }
        });
        // 监听layout改变事件
        $rootScope.$on('drpeng::layout', function (event, msg) {
            let view = msg.view;
            drpengExtend.settings.layoutView = view;
            let splitScreenHtml = null;
            let translate = null;

            if (view === "1:0") {
                translate = $translate.instant('IDS_CONFERENCE_A_MAIN_SCREEN');
                splitScreenHtml = '<span class="nav_main-screen-img"></span><span>'+translate+'</span>';
            } else if (view === "4:0") {
                translate = $translate.instant('IDS_CONFERENCE_FOUR_POINT_SCREEN');
                splitScreenHtml = '<span class="nav_five-split-screen-img"></span><span>'+translate+'</span>';
            } else if (view === "1:7") {
                translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_SEVEN_SCREEN');
                splitScreenHtml = '<span class="nav_one-seven-screen-img"></span><span>'+translate+'</span>';
            } else if (view === "1:21") {
                translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_TWENTY_ONE_SCREEN');
                splitScreenHtml = '<span class="nav_one-twenty-one-screen-img"></span><span>'+translate+'</span>';
            } else if (view === "2:21") {
                translate = $translate.instant('IDS_CONFERENCE_TWO_ADD_TWENTY_ONE_SCREEN');
                splitScreenHtml = '<span class="nav_two-twenty-one-screen-img"></span><span>'+translate+'</span>';
            }
            $('#split-screen-mode').html(splitScreenHtml);
        });
    }
}