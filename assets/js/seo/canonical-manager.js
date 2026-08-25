(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var CanonicalManager = {};

  CanonicalManager.SKIP_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref", "source"];

  CanonicalManager.getCleanUrl = function () {
    var url = window.location.href.split("?")[0];
    var params = new URLSearchParams(window.location.search);
    var cleanParams = [];
    params.forEach(function (value, key) {
      if (CanonicalManager.SKIP_PARAMS.indexOf(key) === -1) {
        cleanParams.push(key + "=" + value);
      }
    });
    if (cleanParams.length) {
      url += "?" + cleanParams.join("&");
    }
    return url;
  };

  CanonicalManager.applyCanonical = function (customUrl) {
    var url = customUrl || CanonicalManager.getCleanUrl();
    U.setCanonical(url);
  };

  CanonicalManager.applyNoIndexFor = function (conditions) {
    if (!conditions) return;
    var url = window.location.href;
    var search = window.location.search;

    if (conditions.skipLoggedIn && localStorage.getItem("isLoggedIn") === "true") {
      U.setNoIndex();
      return;
    }

    if (conditions.skipParams) {
      conditions.skipParams.forEach(function (param) {
        if (search.indexOf(param + "=") !== -1) {
          U.setNoIndex();
        }
      });
    }

    if (conditions.skipPaths) {
      conditions.skipPaths.forEach(function (path) {
        if (window.location.pathname.indexOf(path) !== -1) {
          U.setNoIndex();
        }
      });
    }

    if (conditions.paginationParam && search.indexOf("page=") !== -1) {
      var params = new URLSearchParams(search);
      var page = parseInt(params.get("page"), 10);
      if (page && page > 1) {
        U.setCanonical(CanonicalManager.getCleanUrl().replace(/[&?]page=\d+/g, ""));
      }
    }
  };

  CanonicalManager.enforcePreferredDomain = function (preferred) {
    preferred = preferred || "https://budoq.com";
    var host = window.location.hostname;
    var preferredHost = preferred.replace(/https?:\/\//, "");
    if (host === preferredHost || host === "localhost" || host === "127.0.0.1") return;
    // Redirect to preferred domain
    if (preferred && host !== preferredHost) {
      var newUrl = preferred + window.location.pathname + window.location.search;
      if (window.location.href !== newUrl) {
        window.location.replace(newUrl);
      }
    }
  };

  global.CanonicalManager = CanonicalManager;
})(window);
