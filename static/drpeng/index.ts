window['drpeng'] = {};

console.debug('drpeng扩展载入');

angular.module('drpeng', [])
    .run(DrpengExtend)
    .service('WSConnection', WebSocketService);