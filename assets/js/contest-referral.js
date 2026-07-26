/* ===== Contest Referral System ===== */

window.ContestReferral = (function() {
  var BASE_URL = window.location.origin + '/pages/contest.html';

  /* Generate unique referral code: BUDA-XXXXX (5 alphanumeric chars) */
  function generateCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'BUDA-';
    for (var i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /* Ensure code is unique by checking DB */
  function ensureUniqueCode(callback) {
    var code = generateCode();
    window.ContestData.checkReferralCode(code)
      .then(function(result) {
        if (result.error) { callback(code); return; }
        if (result.data) {
          /* Collision — retry */
          ensureUniqueCode(callback);
        } else {
          callback(code);
        }
      })
      .catch(function() {
        /* On error, still use the generated code */
        callback(code);
      });
  }

  /* Get referral link */
  function getReferralLink(code) {
    return BASE_URL + '?ref=' + encodeURIComponent(code);
  }

  /* Get ref code from URL query */
  function getRefFromUrl() {
    var match = window.location.search.match(/[?&]ref=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /* Store ref temporarily in sessionStorage */
  function storeRefCode(code) {
    try {
      sessionStorage.setItem('contest_ref_code', code);
    } catch (e) {}
  }

  /* Read stored ref code */
  function getStoredRefCode() {
    try {
      return sessionStorage.getItem('contest_ref_code');
    } catch (e) { return null; }
  }

  /* Clear stored ref */
  function clearStoredRef() {
    try {
      sessionStorage.removeItem('contest_ref_code');
    } catch (e) {}
  }

  /* Copy text to clipboard with fallback */
  function copyToClipboard(text, onSuccess, onError) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function() {
        fallbackCopy(text, onSuccess, onError);
      });
    } else {
      fallbackCopy(text, onSuccess, onError);
    }
  }

  function fallbackCopy(text, onSuccess, onError) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (onSuccess) onSuccess();
    } catch (e) {
      if (onError) onError(e);
    }
  }

  /* Share via Web Share API */
  function shareLink(text, url) {
    if (navigator.share) {
      navigator.share({ title: 'Buda Rewards', text: text, url: url })
        .catch(function() {});
    } else {
      copyToClipboard(url);
    }
  }

  /* Initialize the referral section in the dashboard */
  function initReferralUI(referralCode) {
    var codeDisplay = document.getElementById('referralCodeDisplay');
    var linkDisplay = document.getElementById('referralLinkDisplay');
    var copyBtn = document.getElementById('copyReferralBtn');
    var shareBtn = document.getElementById('shareReferralBtn');

    if (!codeDisplay) return;

    var link = getReferralLink(referralCode);
    codeDisplay.textContent = referralCode;
    if (linkDisplay) linkDisplay.textContent = link;

    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        copyToClipboard(link, function() {
          window.ContestUI.showToast('تم نسخ رابط الدعوة');
        });
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        shareLink(
          'اشترك في مسابقة Buda Rewards واربح جوائز قيمة! استخدم رابط دعوتي:',
          link
        );
        if (!navigator.share) {
          window.ContestUI.showToast('تم نسخ رابط الدعوة');
        }
      });
    }
  }

  return {
    generateCode: generateCode,
    ensureUniqueCode: ensureUniqueCode,
    getReferralLink: getReferralLink,
    getRefFromUrl: getRefFromUrl,
    storeRefCode: storeRefCode,
    getStoredRefCode: getStoredRefCode,
    clearStoredRef: clearStoredRef,
    copyToClipboard: copyToClipboard,
    shareLink: shareLink,
    initReferralUI: initReferralUI
  };
})();
