/* ===== Contest Page Controller ===== */

window.ContestUI = (function() {
  /* Global campaign data */
  var campaign = null;
  var participant = null;
  var countdownInterval = null;

  function init() {
    /* Check for referral code in URL */
    var refCode = window.ContestReferral.getRefFromUrl();
    if (refCode) {
      window.ContestReferral.storeRefCode(refCode);
      /* Clean URL without page reload */
      if (history.replaceState) {
        history.replaceState({}, document.title, window.location.pathname);
      }
    }

    /* Check auth */
    var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    var userEmail = localStorage.getItem('userEmail');

    if (!isLoggedIn) {
      showLoginRequired();
      return;
    }

    /* Start loading: show skeleton, hide content */
    showSkeleton(true);

    /* Load campaign data */
    window.ContestData.getActiveCampaign()
      .then(function(result) {
        if (result.error) {
          showSkeleton(false);
          var errMsg = result.error.message || '';
          var friendlyMsg = 'حدث خطأ في تحميل بيانات المسابقة';
          if (errMsg.indexOf('does not exist') !== -1 || errMsg.indexOf('42P01') !== -1) {
            friendlyMsg = 'بيانات المسابقة غير موجودة. يرجى تشغيل ملف SQL: sql/20260725_buda_rewards.sql في Supabase';
          } else if (errMsg.indexOf('permission') !== -1 || errMsg.indexOf('42501') !== -1) {
            friendlyMsg = 'ليس لديك صلاحية الوصول لبيانات المسابقة. تأكد من تطبيق ملف SQL في نفس مشروع Supabase';
          }
          showError(friendlyMsg);
          console.error('[Contest] Campaign load error:', result.error);
          return;
        }
        if (!result.data) {
          showSkeleton(false);
          showError('لا توجد مسابقة نشطة حالياً');
          return;
        }

        campaign = result.data;
        window._contestCampaignId = campaign.id;

        /* Load rewards */
        loadRewards(campaign.id);

        /* Start countdown */
        initCountdown(campaign.end_at);
        var titleEl = document.querySelector('.countdown-title');
        if (titleEl) titleEl.textContent = 'الوقت المتبقي';

        /* Check user registration */
        checkRegistration(campaign.id);
      })
      .catch(function(err) {
        showSkeleton(false);
        showError('حدث خطأ في تحميل البيانات');
        console.error('[Contest] Init error:', err);
      });
  }

  function showSkeleton(show) {
    var skeleton = document.getElementById('contestSkeleton');
    var content = document.getElementById('contestContent');
    if (skeleton) skeleton.classList.toggle('hidden', !show);
    if (content) content.classList.toggle('hidden', show);
  }

  function showLoginRequired() {
    var skeleton = document.getElementById('contestSkeleton');
    var login = document.getElementById('contestLoginRequired');
    var content = document.getElementById('contestContent');
    if (skeleton) skeleton.classList.add('hidden');
    if (login) login.classList.remove('hidden');
    if (content) content.classList.add('hidden');
  }

  function showError(msg) {
    var login = document.getElementById('contestLoginRequired');
    if (login) {
      login.querySelector('h2').textContent = msg;
      login.querySelector('.login-icon span').textContent = 'info';
      login.classList.remove('hidden');
      login.querySelector('a').classList.add('hidden');
    }
  }

  function loadRewards(campaignId) {
    var container = document.getElementById('prizesContainer');
    if (!container) return;

    var badges = {
      cash: { cls: 'prize-badge-cash', icon: 'payments', label: 'جائزة مالية' },
      product: { cls: 'prize-badge-product', icon: 'inventory_2', label: 'منتجات' },
      coupon: { cls: 'prize-badge-coupon', icon: 'local_offer', label: 'كوبونات' }
    };

    window.ContestData.getRewards(campaignId)
      .then(function(result) {
        if (result.error || !result.data || result.data.length === 0) {
          container.innerHTML = '<div class="contest-empty"><h3>لا توجد جوائز متاحة حالياً</h3></div>';
          return;
        }

        container.innerHTML = result.data.map(function(r) {
          var b = badges[r.reward_type] || badges.cash;
          return '<article class="prize-card">' +
            '<img src="' + (r.image_url || '') + '" alt="' + escapeHtml(r.title) + '" class="prize-card-img" loading="lazy" />' +
            '<div class="prize-card-body">' +
            '<span class="prize-card-badge ' + b.cls + '"><span class="material-icons-outlined" style="font-size:14px">' + b.icon + '</span> ' + b.label + '</span>' +
            '<h3 class="prize-card-title">' + escapeHtml(r.title) + '</h3>' +
            '<p class="prize-card-desc">' + escapeHtml(r.description || '') + '</p>' +
            '<span class="prize-card-value">' + escapeHtml(r.value || '') + '</span>' +
            '</div></article>';
        }).join('');
      })
      .catch(function(err) {
        console.error('[Contest] Rewards load error:', err);
      });
  }

  function initCountdown(endAt) {
    var endDate = new Date(endAt).getTime();

    function tick() {
      var now = Date.now();
      var diff = endDate - now;

      if (diff <= 0) {
        document.getElementById('countdownDisplay').classList.add('hidden');
        document.getElementById('countdownEnded').classList.remove('hidden');
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('countdownDays').textContent = pad(days);
      document.getElementById('countdownHours').textContent = pad(hours);
      document.getElementById('countdownMinutes').textContent = pad(minutes);
      document.getElementById('countdownSeconds').textContent = pad(seconds);
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function checkRegistration(campaignId) {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser')); } catch(e) {}
    var userId = user && user.id ? String(user.id) : null;
    var email = localStorage.getItem('userEmail');

    function handleParticipantResult(result) {
      showSkeleton(false);

      if (result.error) {
        console.error('[Contest] Participant check error:', result.error);
        showForm();
        return;
      }

      if (result.data) {
        participant = result.data;
        /* Already registered — go to dashboard */
        window.location.href = 'referral-dashboard.html';
        return;
      } else {
        showForm();
      }
    }

    if (userId) {
      window.ContestData.getParticipant(userId, campaignId)
        .then(handleParticipantResult)
        .catch(function() { showSkeleton(false); showForm(); });
    } else if (email) {
      window.ContestData.getParticipantByEmail(email, campaignId)
        .then(handleParticipantResult)
        .catch(function() { showSkeleton(false); showForm(); });
    } else {
      showSkeleton(false);
      showForm();
    }
  }

  function showForm() {
    var form = document.getElementById('registrationForm');
    var dashboard = document.getElementById('contestDashboard');
    var success = document.getElementById('contestSuccess');
    if (form) form.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (success) success.classList.add('hidden');
    window.ContestRegistration.init();
  }

  function showRegistrationSuccess(participant) {
    var form = document.getElementById('registrationForm');
    var dashboard = document.getElementById('contestDashboard');
    var success = document.getElementById('contestSuccess');
    if (form) form.classList.add('hidden');
    if (success) success.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');

    /* After 2 seconds show dashboard */
    setTimeout(function() {
      success.classList.add('hidden');
      showDashboard(participant);
    }, 2000);
  }

  function showDashboard(p) {
    var form = document.getElementById('registrationForm');
    var dashboard = document.getElementById('contestDashboard');
    var success = document.getElementById('contestSuccess');
    if (form) form.classList.add('hidden');
    if (success) success.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    /* Fill user info */
    var nameEl = document.getElementById('dashboardUserName');
    var emailEl = document.getElementById('dashboardUserEmail');
    if (nameEl) nameEl.textContent = 'مرحباً، ' + (p.full_name || '');
    if (emailEl) emailEl.textContent = p.email || '';

    /* Init referral UI */
    window.ContestReferral.initReferralUI(p.referral_code);

    /* Load metrics */
    loadMetrics(p);
    loadMessages(p);
  }

  function loadMetrics(p) {
    /* Referred count */
    window.ContestData.getReferralCount(p.user_id, p.campaign_id)
      .then(function(result) {
        if (!result.error && result.data) {
          var total = result.data.length || 0;
          document.getElementById('metricReferred').textContent = total;
        }
      })
      .catch(function() {});

    /* Qualified count */
    window.ContestData.getQualifiedReferralCount(p.user_id, p.campaign_id)
      .then(function(result) {
        if (!result.error && result.count !== undefined) {
          document.getElementById('metricQualified').textContent = result.count;
        }
      })
      .catch(function() {});

    /* Rewards */
    window.ContestData.getRewardAssignments(p.id)
      .then(function(result) {
        if (!result.error && result.data) {
          var won = result.data.filter(function(r) { return r.status === 'won' || r.status === 'contacted' || r.status === 'fulfilled'; });
          document.getElementById('metricPrizes').textContent = won.length;
          if (won.length > 0) {
            document.getElementById('metricStatus').textContent = 'فائز!';
            document.getElementById('metricStatus').style.color = '#16a34a';
          }
        }
      })
      .catch(function() {});
  }

  function loadMessages(p) {
    var container = document.getElementById('messagesList');
    if (!container) return;

    window.ContestData.getUserMessages(p.user_id, p.campaign_id)
      .then(function(result) {
        if (result.error || !result.data || result.data.length === 0) {
          container.innerHTML = '<div class="contest-empty"><span class="material-icons-outlined">mail_outline</span><h3>لا توجد رسائل</h3><p>عند فوزك بجائزة، ستصل رسالة هنا.</p></div>';
          return;
        }

        container.innerHTML = result.data.map(function(m) {
          var unread = !m.is_read;
          if (unread) {
            setTimeout(function() {
              window.ContestData.markMessageRead(m.id).catch(function() {});
            }, 1000);
          }
          return '<div class="message-card' + (unread ? ' unread' : '') + '">' +
            (unread ? '<span class="message-unread-dot"></span>' : '') +
            '<h4 class="message-card-title">' + escapeHtml(m.title) + '</h4>' +
            '<p class="message-card-body">' + escapeHtml(m.message) + '</p>' +
            '<span class="message-card-meta">' + formatDate(m.created_at) + '</span>' +
            '</div>';
        }).join('');
      })
      .catch(function() {
        container.innerHTML = '<div class="contest-empty"><span class="material-icons-outlined">error_outline</span><h3>تعذر تحميل الرسائل</h3></div>';
      });
  }

  function showToast(msg) {
    var toast = document.getElementById('contestToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._hide);
    toast._hide = setTimeout(function() {
      toast.classList.remove('show');
    }, 2500);
  }

  function escapeHtml(str) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str || '').replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) { return ''; }
  }

  /* Terms Modal */
  function initTermsModal() {
    var backdrop = document.getElementById('termsModal');
    var link = document.getElementById('showTermsLink');
    var closeBtn = document.getElementById('closeTermsModal');
    if (!backdrop || !link) return;

    link.addEventListener('click', function(e) {
      e.preventDefault();
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    function closeModal() {
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  /* FAQ Accordion */
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = this.closest('.faq-item');
        if (!item) return;
        var isOpen = item.classList.contains('open');
        item.classList.toggle('open');
        this.setAttribute('aria-expanded', !isOpen);
      });
    });
  }

  /* Init on DOM ready */
  document.addEventListener('DOMContentLoaded', function() {
    initTermsModal();
    initFAQ();

    /* Set bottom nav active if needed */
    setTimeout(function() {
      /* Account page is the closest match */
      var accountNav = document.querySelector('.bottom-nav a[data-nav="account"]');
      if (accountNav) accountNav.classList.add('is-active');
    }, 200);

    /* Start the contest controller after a brief delay for scripts to load */
    setTimeout(init, 300);
  });

  return {
    init: init,
    showToast: showToast,
    showRegistrationSuccess: showRegistrationSuccess,
    escapeHtml: escapeHtml
  };
})();
