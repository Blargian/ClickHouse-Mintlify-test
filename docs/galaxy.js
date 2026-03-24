(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  var API_HOST = 'https://control-plane-internal.clickhouse.cloud';
  var APPLICATION = 'DOCS_WEBSITE';
  var GALAXY_API_PATH = 'galaxy';
  var BATCH_INTERVAL_MS = 5000;
  var BEACON_LIMIT_BYTES = 60 * 1024;
  var COOKIE_CONSENT_NAME = 'ch_cookie_consent';
  var CONSENT_REJECTED = 'rejected';

  // ---------------------------------------------------------------------------
  // Cookie utilities (ported from src/utils/cookies.ts)
  // ---------------------------------------------------------------------------
  function getBrowserCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts && parts.length === 2) {
      var v = parts.pop().split(';').shift();
      if (v) return decodeURIComponent(v);
    }
    return undefined;
  }

  function setBrowserCookie(name, value, options) {
    options = options || {};
    var isHttps = window.location.protocol === 'https:';
    var secure = options.secure !== undefined ? options.secure : isHttps;
    var cookieString = encodeURIComponent(name) + '=' + encodeURIComponent(value);
    cookieString += '; path=' + (options.path || '/');
    if (options.expires) {
      cookieString += '; expires=' + (options.expires instanceof Date ? options.expires.toUTCString() : options.expires);
    }
    if (options.maxAge) cookieString += '; max-age=' + options.maxAge;
    if (options.domain) cookieString += '; domain=' + options.domain;
    if (secure) cookieString += '; secure';
    if (options.sameSite) cookieString += '; samesite=' + options.sameSite;
    document.cookie = cookieString;
  }

  // ---------------------------------------------------------------------------
  // Cookie consent gate
  // ---------------------------------------------------------------------------
  function isConsentRejected() {
    return getBrowserCookie(COOKIE_CONSENT_NAME) === CONSENT_REJECTED;
  }

  // Listen for consent changes via dataLayer
  var _originalPush;
  function watchConsentChanges() {
    window.dataLayer = window.dataLayer || [];
    _originalPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function () {
      var result = _originalPush.apply(window.dataLayer, arguments);
      for (var i = 0; i < arguments.length; i++) {
        var entry = arguments[i];
        if (entry && entry.event === 'cookie_consent_granted' && window.galaxy) {
          window.galaxy.flushEvents();
        }
      }
      return result;
    };
  }

  // ---------------------------------------------------------------------------
  // UUID generation
  // ---------------------------------------------------------------------------
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ---------------------------------------------------------------------------
  // User / session ID management (from galaxy.js + web/browser.js)
  // ---------------------------------------------------------------------------
  function findOrCreateGalaxyId(key) {
    var id;
    try {
      id = getBrowserCookie(key) ||
        window.localStorage.getItem(key) ||
        window.sessionStorage.getItem(key);
    } catch (e) { /* storage access denied */ }

    if (!id) id = generateUUID();

    try {
      setBrowserCookie(key, id, { maxAge: 2147483647 }); // ~68 years
      window.localStorage.setItem(key, id);
      window.sessionStorage.setItem(key, id);
    } catch (e) { /* storage access denied */ }

    return id;
  }

  function getUserId() {
    return findOrCreateGalaxyId('glx_anonymous_id');
  }

  function getGalaxySessionId() {
    try {
      if (!window.sessionStorage.getItem('glx_id')) {
        window.sessionStorage.setItem('glx_id', generateUUID());
      }
      return window.sessionStorage.getItem('glx_id') || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  // ---------------------------------------------------------------------------
  // HTTP client (from galaxy.js useInitGalaxy)
  // ---------------------------------------------------------------------------
  function httpPost(url, requestBody) {
    var json = JSON.stringify(requestBody);
    var blob = new Blob([json], { type: 'application/json;charset=UTF-8' });
    var tooLarge = blob.size > BEACON_LIMIT_BYTES;

    // Try beacon first for small payloads
    if (!tooLarge && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        var sent = navigator.sendBeacon(url, blob);
        if (sent) return;
      } catch (e) { /* fall through */ }
    }

    // Fallback to fetch
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: json,
        keepalive: !tooLarge
      });
    } catch (e) {
      console.error('[galaxy] fetch failed', e);
    }
  }

  // ---------------------------------------------------------------------------
  // GalaxyClient class (from client/index.js)
  // ---------------------------------------------------------------------------
  function GalaxyClient(options) {
    this.application = options.application;
    this.apiHost = options.apiHost;
    this.eventsQueue = [];
  }

  GalaxyClient.prototype.getContext = function () {
    return {
      page: window.location.href,
      userAgent: navigator.userAgent
    };
  };

  GalaxyClient.prototype.track = function (event, properties) {
    var props = properties || { interaction: 'click' };
    var interaction = props.interaction || 'click';
    var eventProperties = {};
    for (var k in props) {
      if (k !== 'interaction') eventProperties[k] = props[k];
    }

    var parts = event.split('.');
    var namespace = parts[0] || '';
    var component = parts[1] || '';
    var eventName = parts[2] || '';

    var context = this.getContext();
    var galaxyEvent = {
      application: this.application,
      timestamp: new Date().getTime(),
      userId: getUserId(),
      namespace: namespace,
      component: component,
      interaction: interaction,
      event: eventName,
      message: eventName,
      properties: {
        properties: Object.assign({ application: this.application }, context),
        ...eventProperties
      }
    };

    this.eventsQueue.push(galaxyEvent);
  };

  GalaxyClient.prototype.sendGalaxyEvents = function () {
    if (isConsentRejected()) return;

    var numEvents = this.eventsQueue.length;
    if (numEvents > 0) {
      var request = {
        rpcAction: 'sendGalaxyForensicEvent',
        galaxySessionId: getGalaxySessionId(),
        data: this.eventsQueue.slice(0, numEvents)
      };
      try {
        httpPost(this.apiHost + '/api/' + GALAXY_API_PATH + '?sendGalaxyForensicEvent', request);
      } catch (e) {
        console.error('[galaxy] sendGalaxyEvents failed', e);
      }
      this.eventsQueue.splice(0, numEvents);
    }
  };

  GalaxyClient.prototype.flushEvents = function () {
    try {
      this.sendGalaxyEvents();
    } catch (e) {
      console.error('[galaxy] flushEvents failed', e);
    }
  };

  GalaxyClient.prototype.cleanup = function () {
    return this.flushEvents();
  };

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  var client = new GalaxyClient({
    application: APPLICATION,
    apiHost: API_HOST
  });

  // Expose globally
  window.galaxy = client;
  window.galaxyOnClick = function (event) {
    return function () {
      if (window.galaxy) {
        window.galaxy.track(event, { interaction: 'click' });
      }
    };
  };

  // Event batching — flush every 5 seconds
  var batchInterval = setInterval(function () {
    client.flushEvents();
  }, BATCH_INTERVAL_MS);

  // Cleanup on page unload
  function stopGalaxy() {
    clearInterval(batchInterval);
    client.cleanup();
  }
  window.addEventListener('beforeunload', stopGalaxy);
  window.addEventListener('unload', stopGalaxy);

  // Watch for cookie consent changes
  watchConsentChanges();
})();
