(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var RobotsGenerator = {};

  RobotsGenerator.generateRobotsTxt = function (options) {
    options = options || {};
    var baseUrl = options.baseUrl || U.getSiteUrl();
    var sitemapUrl = options.sitemapUrl || baseUrl + "/sitemap.xml";
    var lines = [];

    lines.push("User-agent: *");
    lines.push("Disallow: /pages/signin/");
    lines.push("Disallow: /pages/signup/");
    lines.push("Disallow: /pages/checkout.html");
    lines.push("Disallow: /pages/order-success.html");
    lines.push("Disallow: /pages/order-summary.html");
    lines.push("Disallow: /pages/empty-cart.html");
    lines.push("Disallow: /pages/logout-confirmation.html");
    lines.push("Disallow: /pages/delete-account.html");
    lines.push("Disallow: /pages/edit-account.html");
    lines.push("Disallow: /assets/");
    lines.push("Disallow: /tmp/");
    lines.push("Disallow: /nul");
    lines.push("");
    lines.push("Allow: /assets/js/");
    lines.push("Allow: /assets/css/");
    lines.push("Allow: /assets/images/");
    lines.push("Allow: /assets/fonts/");
    lines.push("");
    lines.push("Sitemap: " + sitemapUrl);
    lines.push("");
    lines.push("# Buda - SEO Optimized");
    lines.push("# Last updated: " + new Date().toISOString().split("T")[0]);

    return lines.join("\n");
  };

  RobotsGenerator.generateRobotsHtml = function (txt) {
    return '<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8"><title>robots.txt - Buda</title></head><body><pre style="direction:ltr;text-align:left;font-family:monospace;background:#f5f5f5;padding:20px;border-radius:8px;max-width:800px;margin:40px auto;white-space:pre-wrap;word-break:break-word;">' + U.escapeHtml(txt) + "</pre></body></html>";
  };

  RobotsGenerator.downloadRobots = function (txt) {
    var blob = new Blob([txt], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "robots.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  global.RobotsGenerator = RobotsGenerator;
})(window);
