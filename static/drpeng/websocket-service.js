var WebSocketService = (function () {
    function WebSocketService($rootScope, $log, $sce, $q, $localStorage, $window, $timeout, $location, $translate, platformSettings, applicationSettings, defaultUserSettings, serverSettings, toast, modal, callHistory, Call, srvService, toggleService, dialHistory, flashVideo, mediaDevicesService, reportingService) {
        this.$rootScope = $rootScope;
        this.$log = $log;
        this.$sce = $sce;
        this.$q = $q;
        this.$localStorage = $localStorage;
        this.$window = $window;
        this.$timeout = $timeout;
        this.$location = $location;
        this.$translate = $translate;
        this.platformSettings = platformSettings;
        this.applicationSettings = applicationSettings;
        this.defaultUserSettings = defaultUserSettings;
        this.serverSettings = serverSettings;
        this.toast = toast;
        this.modal = modal;
        this.callHistory = callHistory;
        this.Call = Call;
        this.srvService = srvService;
        this.toggleService = toggleService;
        this.dialHistory = dialHistory;
        this.flashVideo = flashVideo;
        this.mediaDevicesService = mediaDevicesService;
        this.reportingService = reportingService;
        this.ws = null;
        this.disconnected = false;
    }
    // 连接WebSocket服务器
    WebSocketService.prototype.connect = function (alias, uuid) {
        var _this = this;
        console.info('[drpeng]', '尝试建立socket链接', alias, uuid);
        clearInterval(this.heartbeatTimer || -1);
        this.alias = alias;
        this.uuid = uuid;
        var websocket, ws_url = "wss://" + this.applicationSettings.webSocketUrl + "/cloudpServer/websocket/connect?info=" + alias + "_" + uuid;
        // 检查是否已经存在Websocket链接
        if (this.ws) {
            if (this.ws.readyState != this.ws.CLOSED && this.ws.readyState != this.ws.CLOSING) {
                return;
                // console.info('[drpeng]已经存在websocket连接,关闭并开启新连接连');
                // this.ws.close()
            }
            else {
                this.ws.onclose = null;
                this.ws.onerror = null;
                this.ws = null;
            }
        }
        // 创建新的WebSocket链接
        if ('WebSocket' in window) {
            this.ws = new WebSocket(ws_url);
        }
        else if ('MozWebSocket' in window) {
            var MozWebSocket = void 0; // 过Typescript类型检查
            this.ws = new MozWebSocket(ws_url);
        }
        else {
            alert('您的浏览器不支持WebSocket，请使用Firefox或者Chrome。(Your browser don\'t support WebSocket, please use FireFox or Chrome to join the conference.)');
            return;
        }
        this.ws.onopen = function () {
            console.info('[drpeng]已经建立起websocket链接...');
            _this.startHeartbeat();
        };
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onSocketError.bind(this);
    };
    // WebSocket连接出错
    WebSocketService.prototype.onSocketError = function (error) {
        console.info('[drpeng]', 'websocket链接出错', error);
        this.ws.close();
        this.connect(this.alias, this.uuid);
    };
    WebSocketService.prototype.onConnected = function () {
        console.info('[drpeng]', '建立WebSocket链接');
    };
    WebSocketService.prototype.onClose = function () {
        console.info('[drpeng]', 'websocket链接关闭');
        if (!this.disconnected) {
            this.connect(this.alias, this.uuid);
        }
    };
    WebSocketService.prototype.onMessage = function (event) {
        var data;
        try {
            data = JSON.parse(event.data);
            this.onHandUpListReceive(data);
        }
        catch (error) {
            data = event.data;
            console.warn('[drpeng]', 'WebSocket接收到的数据不是一个合法的JSON对象。');
        }
        console.info('[drpeng]', '接收到WebSocket消息：', data);
    };
    WebSocketService.prototype.startHeartbeat = function () {
        var _this = this;
        this.heartbeatTimer = setInterval(function () {
            _this.ws.send('heartbeat');
        }, 30000);
    };
    WebSocketService.prototype.disconnect = function () {
        this.disconnected = true;
        clearInterval(this.heartbeatTimer);
        try {
            this.ws.close();
            this.ws = null;
        }
        catch (error) {
        }
    };
    /**
     *  下面的是添加的功能方法
     */
    // 当接收到服务器发送来的举手列表 list是存储了举手用户的Uuid的列表
    WebSocketService.prototype.onHandUpListReceive = function (list) {
        this.handUpListReceiveListener && this.handUpListReceiveListener(list);
    };
    WebSocketService.prototype.addHandUpListReceiveListener = function (callback) {
        this.handUpListReceiveListener = callback;
    };
    // 发送举手请求
    WebSocketService.prototype.sendMsgForHandUp = function () {
        this.ws.send(this.alias + '_handsup');
    };
    // 发送放手请求
    WebSocketService.prototype.sendMsgForHandDown = function () {
        this.ws.send(this.alias + '_handsdown');
    };
    return WebSocketService;
}());
WebSocketService.$inject = ["$rootScope", "$log", "$sce", "$q", "$localStorage", "$window", "$timeout", "$location", "$translate", "platformSettings", "applicationSettings", "defaultUserSettings", "serverSettings", "toast", "modal", "callHistory", "Call", "srvService", "toggleService", "dialHistory", "flashVideo", "mediaDevicesService", "reportingService"];
//# sourceMappingURL=websocket-service.js.map