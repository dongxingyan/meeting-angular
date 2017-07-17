'use strict';
angular.module('pexapp')

.constant('serverSettings', angular.extend({
    analyticsReportingEnabled: true,
}, window.serverSettings));
