(function (global) {
  "use strict";

  var RedirectManager = {};

  var RULES_KEY = "buda_redirect_rules";

  var DEFAULT_RULES = [];

  RedirectManager.getRules = function () {
    try {
      var stored = localStorage.getItem(RULES_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_RULES;
  };

  RedirectManager.saveRules = function (rules) {
    if (!Array.isArray(rules)) return;
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    } catch (e) {}
  };

  RedirectManager.addRule = function (from, to, type) {
    type = type || "exact";
    var rules = RedirectManager.getRules();
    rules.push({ from: from, to: to, type: type, created: new Date().toISOString() });
    RedirectManager.saveRules(rules);
  };

  RedirectManager.removeRule = function (from) {
    var rules = RedirectManager.getRules().filter(function (r) { return r.from !== from; });
    RedirectManager.saveRules(rules);
  };

  RedirectManager.findRedirect = function (url) {
    var rules = RedirectManager.getRules();
    var path = url || window.location.pathname + window.location.search;
    var pathOnly = path.split("?")[0];
    var search = path.includes("?") ? "?" + path.split("?")[1] : "";

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.type === "exact" && path === rule.from) {
        return rule.to;
      }
      if (rule.type === "prefix" && pathOnly.indexOf(rule.from) === 0) {
        var remainder = pathOnly.slice(rule.from.length);
        return rule.to + remainder + search;
      }
      if (rule.type === "wildcard" && new RegExp(rule.from).test(path)) {
        return path.replace(new RegExp(rule.from), rule.to);
      }
    }
    return null;
  };

  RedirectManager.executeRedirect = function (url) {
    var target = RedirectManager.findRedirect(url);
    if (target && target !== window.location.href) {
      window.location.replace(target);
      return true;
    }
    return false;
  };

  RedirectManager.add301Redirect = function (from, to) {
    RedirectManager.addRule(from, to, "exact");
  };

  RedirectManager.getRedirectHtml = function (from, to) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>301 Moved Permanently</title><meta http-equiv="refresh" content="0; url=' + to + '"><link rel="canonical" href="' + to + '"></head><body><p>This page has moved. <a href="' + to + '">Click here</a>.</p></body></html>';
  };

  global.RedirectManager = RedirectManager;
})(window);
