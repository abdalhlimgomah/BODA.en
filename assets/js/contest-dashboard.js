/* ===== Referral Dashboard — Controller ===== */

(function() {
   var campaign = null;
   var participant = null;
   var referrals = [];
   var rewards = [];

   function escapeHtml(str) {
     var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
     return String(str || '').replace(/[&<>"']/g, function(m) { return map[m]; });
   }

   function getClient() {
    return window.getSupabaseClient ? window.getSupabaseClient() : null;
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch(e) { return null; }
  }

  function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && !!getCurrentUser();
  }

  function showSkeleton(show) {
    var skel = document.getElementById('rdSkeleton');
    var content = document.getElementById('rdContent');
    if (skel) skel.classList.toggle('rd-hidden', !show);
    if (content) content.classList.toggle('rd-hidden', show);
  }

  function goToLogin() {
    window.location.href = '../pages/signin/login.html';
  }

  function init() {
    if (!isLoggedIn()) { goToLogin(); return; }

    showSkeleton(true);

    var client = getClient();
    if (!client) {
      showSkeleton(false);
      document.getElementById('rdError').classList.remove('rd-hidden');
      document.getElementById('rdContent').classList.remove('rd-hidden');
      return;
    }

    var user = getCurrentUser();
    var userId = user && user.id ? String(user.id) : null;
    var email = user && user.email ? user.email : localStorage.getItem('userEmail');

    /* Load campaign and participant */
    loadCampaign(client, userId, email);
  }

  function loadCampaign(client, userId, email) {
    client.from('contest_campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(function(result) {
        if (result.error || !result.data) {
          showError();
          return;
        }

        campaign = result.data;

        /* Check if contest ended */
        if (new Date(campaign.end_at).getTime() < Date.now()) {
          showSkeleton(false);
          document.getElementById('rdContent').classList.remove('rd-hidden');
          document.getElementById('rdEnded').classList.remove('rd-hidden');
          return;
        }

        /* Load participant data */
        loadParticipant(client, userId, email);
      })
      .catch(function() { showError(); });
  }

  function loadParticipant(client, userId, email) {
    function handleParticipant(result) {
      if (result.error || !result.data) {
        /* Not registered — redirect to contest page */
        window.location.href = '../pages/contest.html';
        return;
      }

      participant = result.data;

       /* Backfill: ensure every participant using my code has a referrals row */
       syncReferralRows(client);

       /* Load referrals, rewards, and messages */
       loadReferrals(client);
       loadRewardsData(client);
       loadMessages(client);
       renderProfile();
       renderReferral();
    }

    function syncReferralRows(client) {
      if (!campaign || !participant || !participant.referral_code) return;
      var myCode = participant.referral_code;
      var myUserId = String(participant.user_id || '');

      client.from('contest_participants').select('id, user_id').eq('campaign_id', campaign.id).eq('referred_by', myCode)
        .then(function(refResult) {
          if (refResult.error || !refResult.data || refResult.data.length === 0) return;
          var referred = refResult.data.filter(function(p) {
            return String(p.user_id) !== myUserId;
          });
          if (referred.length === 0) return;

          client.from('referrals').select('referred_user_id').eq('campaign_id', campaign.id).eq('referral_code', myCode)
            .then(function(rowsResult) {
              if (rowsResult.error) return;
              var existing = {};
              (rowsResult.data || []).forEach(function(r) { existing[r.referred_user_id] = true; });
              var inserts = referred.filter(function(p) { return !existing[p.user_id]; })
                .map(function(p) {
                  return {
                    campaign_id: campaign.id,
                    referrer_user_id: participant.user_id,
                    referred_user_id: p.user_id,
                    referral_code: myCode,
                    status: 'qualified'
                  };
                });
              if (inserts.length === 0) return;
              client.from('referrals')
                .insert(inserts)
                .onConflict('referral_code,referred_user_id')
                .ignore()
                .select()
                .then(function() { loadReferrals(client); })
                .catch(function(err) {
                  console.error('[Contest Dashboard] Referral backfill error:', err);
                  loadReferrals(client);
                });
            })
            .catch(function() {});
        })
        .catch(function() {});
    }

    if (userId) {
      client.from('contest_participants').select('*').eq('user_id', userId).eq('campaign_id', campaign.id).maybeSingle()
        .then(handleParticipant)
        .catch(function() { showError(); });
    } else if (email) {
      client.from('contest_participants').select('*').eq('email', email).eq('campaign_id', campaign.id).maybeSingle()
        .then(handleParticipant)
        .catch(function() { showError(); });
    } else {
      showError();
    }
  }

  function loadReferrals(client) {
    client.from('referrals').select('*').eq('campaign_id', campaign.id).eq('referrer_user_id', participant.user_id).order('created_at', { ascending: false })
      .then(function(result) {
        if (!result.error && result.data) {
          referrals = result.data;
        }
        renderStats();
        renderProgress();
      })
      .catch(function() {});
  }

  function loadRewardsData(client) {
    var userId = participant.user_id;

    /* Get all participants to check who was referred by this user */
    client.from('contest_participants').select('id, user_id').eq('campaign_id', campaign.id).eq('referred_by', participant.referral_code)
      .then(function(refResult) {
        if (refResult.error || !refResult.data) return;
        var referredIds = refResult.data.map(function(p) { return p.id; });
        if (referredIds.length === 0) {
          showRewardsEmpty();
          return;
        }

        /* Get reward assignments for referred participants */
        client.from('reward_assignments').select('*, contest_rewards(*)').in('participant_id', referredIds)
          .then(function(raResult) {
            if (!raResult.error && raResult.data) {
              rewards = raResult.data;
            }
            renderRewards();
          })
          .catch(function() {});
      })
       .catch(function() {});
   }

   /* ─────────────────────────────
      Load Messages
      ───────────────────────────── */
   function loadMessages(client) {
     if (!campaign) return;
     var container = document.getElementById('rdMessagesList');
     if (!container) return;

     client.from('contest_messages').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: false })
       .then(function(result) {
         if (result.error || !result.data || result.data.length === 0) {
           container.innerHTML = '<div class="rd-empty"><i data-lucide="mail" class="buda-icon" style="width:40px;height:40px;color:var(--color-text-muted)"></i><p>لا توجد رسائل حتى الآن</p></div>';
           return;
         }

         container.innerHTML = result.data.map(function(m) {
           var unread = !m.is_read;
           var date = new Date(m.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
           return '<div class="rd-message-card' + (unread ? ' unread' : '') + '">' +
             (unread ? '<div class="rd-message-badge"></div>' : '') +
             '<div class="rd-message-icon"><i data-lucide="' + (m.reward_type ? 'gift' : 'mail') + '" class="buda-icon"></i></div>' +
             '<div class="rd-message-body">' +
             '<p class="rd-message-title">' + escapeHtml(m.title) + '</p>' +
             '<p class="rd-message-preview">' + escapeHtml((m.message || '').substring(0, 80)) + '</p>' +
             '<span class="rd-message-date">' + date + '</span>' +
             '</div></div>';
         }).join('');

         /* Re-init Lucide icons for new elements */
         if (window.lucide) { try { lucide.createIcons(); } catch(e) {} }
       })
       .catch(function() {
         container.innerHTML = '<div class="rd-empty"><p>تعذر تحميل الرسائل</p></div>';
       });
   }

   /* ─────────────────────────────
      Render: Profile
     ───────────────────────────── */
  function renderProfile() {
    var nameEl = document.getElementById('rdUserName');
    var emailEl = document.getElementById('rdUserEmail');
    var avatarEl = document.getElementById('rdAvatar');

    var fullName = participant.full_name || '';
    var displayName = fullName;
    if (participant.family_name) displayName = fullName + ' ' + participant.family_name;

    if (nameEl) nameEl.textContent = displayName || 'مستخدم';
    if (emailEl) emailEl.textContent = participant.email || '';
    if (avatarEl) {
      var initial = (participant.full_name || 'B').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
  }

  /* ─────────────────────────────
     Render: Referral
     ───────────────────────────── */
  function renderReferral() {
    var codeEl = document.getElementById('rdRefCode');
    var urlEl = document.getElementById('rdRefUrl');
    var qrContainer = document.getElementById('rdQrContainer');

    var refCode = participant.referral_code || '——';
    var baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/contest.html');
    var refUrl = baseUrl + '?ref=' + encodeURIComponent(refCode);

    if (codeEl) codeEl.textContent = refCode;
    if (urlEl) urlEl.textContent = refUrl;

    /* Generate QR code */
    if (qrContainer && typeof QRCode !== 'undefined') {
      qrContainer.innerHTML = '';
      try {
        new QRCode(qrContainer, {
          text: refUrl,
          width: 120,
          height: 120,
          colorDark: '#6D28D9',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch(e) {
        qrContainer.innerHTML = '<span style="font-size:10px;color:#666">QR</span>';
      }
    }

    /* Copy code */
    var copyCodeBtn = document.getElementById('rdCopyCodeBtn');
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', function() {
        copyToClipboard(refCode, 'تم نسخ الكود');
      });
    }

    /* Copy URL */
    var copyUrlBtn = document.getElementById('rdCopyUrlBtn');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', function() {
        copyToClipboard(refUrl, 'تم نسخ الرابط');
      });
    }

    /* Copy link btn */
    var copyLinkBtn = document.getElementById('rdCopyLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', function() {
        copyToClipboard(refUrl, 'تم نسخ رابط الدعوة بنجاح');
      });
    }

    /* Share */
    var shareBtn = document.getElementById('rdShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        if (navigator.share) {
          navigator.share({
            title: 'انضم إلي في مسابقة BudoQ Rewards',
            text: 'ادعوك للمشاركة في مسابقة BudoQ Rewards واربح جوائز قيمة!',
            url: refUrl
          }).catch(function() {});
        } else {
          copyToClipboard(refUrl, 'تم نسخ رابط الدعوة بنجاح');
        }
      });
    }
  }

  function copyToClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showCopyFeedback(msg);
      }).catch(function() {
        fallbackCopy(text, msg);
      });
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopyFeedback(msg); } catch(e) {}
    document.body.removeChild(ta);
  }

  function showCopyFeedback(msg) {
    var el = document.getElementById('rdCopyFeedback');
    if (!el) return;
    el.textContent = msg || 'تم النسخ';
    el.classList.remove('rd-hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.add('rd-hidden'); }, 2500);
  }

  /* ─────────────────────────────
     Render: Statistics
     ───────────────────────────── */
  function renderStats() {
    var totalInvited = referrals.length;
    var registered = referrals.filter(function(r) { return r.status === 'qualified'; }).length;
    var rate = totalInvited > 0 ? Math.round((registered / totalInvited) * 100) : 0;

    document.getElementById('rdStatInvited').textContent = totalInvited;
    document.getElementById('rdStatRegistered').textContent = registered;
    document.getElementById('rdStatRate').textContent = rate + '%';

    showSkeleton(false);
    document.getElementById('rdContent').classList.remove('rd-hidden');
  }

  /* ─────────────────────────────
     Render: Rewards (optional - hide if no section)
     ───────────────────────────── */
  function renderRewards() {
    var cashWinners = document.getElementById('rdCashWinners');
    var productWinners = document.getElementById('rdProductWinners');
    var couponWinners = document.getElementById('rdCouponWinners');
    var cashValue = document.getElementById('rdCashValue');
    var productValue = document.getElementById('rdProductValue');
    var couponValue = document.getElementById('rdCouponValue');
    var cards = document.querySelector('.rd-rewards-grid');
    var empty = document.getElementById('rdRewardsEmpty');

    if (!cashWinners && !cards) return;

    var cashCount = 0;
    var productCount = 0;
    var couponCount = 0;

    rewards.forEach(function(ra) {
      if (ra.status === 'won' || ra.status === 'contacted' || ra.status === 'fulfilled') {
        var type = ra.contest_rewards ? ra.contest_rewards.reward_type : null;
        if (type === 'cash') cashCount++;
        else if (type === 'product') productCount++;
        else if (type === 'coupon') couponCount++;
      }
    });

    if (cashWinners) cashWinners.textContent = cashCount || '0';
    if (productWinners) productWinners.textContent = productCount || '0';
    if (couponWinners) couponWinners.textContent = couponCount || '0';

    var client = getClient();
    if (client && cashValue) {
      client.from('contest_rewards').select('value').eq('campaign_id', campaign.id).eq('reward_type', 'cash').maybeSingle()
        .then(function(r) { if (r.data && cashValue) cashValue.textContent = r.data.value; })
        .catch(function() {});
    }
    if (client && productValue) {
      client.from('contest_rewards').select('value').eq('campaign_id', campaign.id).eq('reward_type', 'product').maybeSingle()
        .then(function(r) { if (r.data && productValue) productValue.textContent = r.data.value; })
        .catch(function() {});
    }
    if (client && couponValue) {
      client.from('contest_rewards').select('value').eq('campaign_id', campaign.id).eq('reward_type', 'coupon').maybeSingle()
        .then(function(r) { if (r.data && couponValue) couponValue.textContent = r.data.value; })
        .catch(function() {});
    }
  }

  /* ─────────────────────────────
     Render: Progress / Goal
     ───────────────────────────── */
  function renderProgress() {
    var GOAL = 50;
    var current = referrals.length;
    var pct = Math.min((current / GOAL) * 100, 100);

    var fill = document.getElementById('rdProgressFill');
    var currentEl = document.getElementById('rdProgressCurrent');
    var celebration = document.getElementById('rdProgressCelebration');
    var title = document.getElementById('rdProgressTitle');
    var desc = document.getElementById('rdProgressDesc');
    var milestone = document.getElementById('rdProgressMilestone');
    var milestoneText = document.getElementById('rdMilestoneText');

    if (fill) fill.style.width = pct + '%';
    if (currentEl) currentEl.textContent = current;

    if (celebration) {
      if (current >= GOAL) {
        celebration.classList.remove('rd-hidden');
        if (title) title.textContent = 'مبروك! وصلت إلى الهدف 🎉';
        if (desc) desc.textContent = 'أنت بطل المسابقة! شارك مع المزيد من الأصدقاء';
      } else if (current >= 1) {
        celebration.classList.add('rd-hidden');
        if (title) title.textContent = 'أنت على الطريق الصحيح!';
        if (desc) desc.textContent = 'ادعُ المزيد من أصدقائك للوصول إلى الهدف';
      } else {
        celebration.classList.add('rd-hidden');
        if (title) title.textContent = 'ابدأ دعوة أصدقائك!';
        if (desc) desc.textContent = 'ادعُ أصدقائك وسجّلوا عبر رابطك لتحقيق المكافأة';
      }
    }

    var milestones = [
      { at: 5, text: '5 أصدقاء — أنت بدأت جيدا! 🎯' },
      { at: 10, text: '10 أصدقاء — ربع الطريق! 🚀' },
      { at: 25, text: '25 صديقاً — نصف الطريق! 💪' },
      { at: 40, text: '40 صديقاً - قريب من الهدف! 🔥' }
    ];
    var activeMilestone = null;
    for (var i = milestones.length - 1; i >= 0; i--) {
      if (current >= milestones[i].at) { activeMilestone = milestones[i]; break; }
    }
    if (activeMilestone && milestone && milestoneText) {
      milestoneText.textContent = activeMilestone.text;
      milestone.classList.remove('rd-hidden');
    } else if (milestone) {
      milestone.classList.add('rd-hidden');
    }
  }

  /* ─────────────────────────────
     Error State
     ───────────────────────────── */
  function showError() {
    console.error('[Contest Dashboard] Failed to load data');
  }

  /* ─────────────────────────────
     Back Button
     ───────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    var backBtn = document.getElementById('rdBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        window.location.href = 'edit-account.html';
      });
    }

    /* Init Lucide icons */
    if (window.lucide) {
      try { lucide.createIcons(); } catch(e) {}
    }

    init();
  });
})();