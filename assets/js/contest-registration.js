/* ===== Contest Registration Form ===== */

window.ContestRegistration = (function() {
  var formEl = null;
  var submitBtn = null;
  var isSubmitting = false;

  var FIELDS = {
    fullName: { el: null, error: null, validator: validateName },
    familyName: { el: null, error: null, validator: validateName },
    phone: { el: null, error: null, validator: validatePhone },
    email: { el: null, error: null },
    city: { el: null, error: null, validator: validateRequired },
    birthDate: { el: null, error: null, validator: validateBirthDate }
  };

  function validateName(val) {
    if (!val || val.trim().length < 2) return 'هذا الحقل مطلوب (حرفين على الأقل)';
    if (val.trim().length > 100) return 'الاسم طويل جداً';
    return '';
  }

  function validateRequired(val) {
    if (!val || !val.trim()) return 'هذا الحقل مطلوب';
    return '';
  }

  function validatePhone(val) {
    if (!val || !val.trim()) return 'رقم الهاتف مطلوب';
    var cleaned = val.replace(/[\s\-\(\)\+]/g, '');
    /* Egyptian: 01xxxxxxxxx (11 digits) or +20 1xxxxxxxxx */
    if (/^01[0-9]{9}$/.test(cleaned)) return '';
    if (/^201[0-9]{9}$/.test(cleaned)) return '';
    if (/^00201[0-9]{9}$/.test(cleaned)) return '';
    return 'رقم هاتف مصري صحيح مطلوب (مثال: 01012345678)';
  }

  function validateBirthDate(val) {
    if (!val) return 'تاريخ الميلاد مطلوب';
    var d = new Date(val);
    if (isNaN(d.getTime())) return 'تاريخ غير صحيح';
    if (d > new Date()) return 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
    var age = new Date().getFullYear() - d.getFullYear();
    if (age < 13) return 'يجب أن يكون عمرك 13 سنة على الأقل';
    return '';
  }

  function init() {
    formEl = document.getElementById('contestForm');
    submitBtn = document.getElementById('contestSubmitBtn');
    if (!formEl) return;

    /* Cache field elements */
    for (var key in FIELDS) {
      var f = FIELDS[key];
      f.el = document.getElementById(key);
      f.error = document.getElementById(key + 'Error');
    }

    /* Auto-fill email from auth */
    var emailField = FIELDS.email.el;
    if (emailField) {
      var email = localStorage.getItem('userEmail') || '';
      emailField.value = email;
    }

    /* Real-time validation on blur */
    for (var k in FIELDS) {
      (function(fieldKey) {
        var field = FIELDS[fieldKey];
        if (field.el && field.validator) {
          field.el.addEventListener('blur', function() {
            validateField(fieldKey);
          });
          field.el.addEventListener('input', function() {
            if (field.el.classList.contains('error')) {
              validateField(fieldKey);
            }
          });
        }
      })(k);
    }

    formEl.addEventListener('submit', handleSubmit);
  }

  function validateField(fieldKey) {
    var field = FIELDS[fieldKey];
    if (!field.el || !field.validator) return true;
    var val = field.el.value;
    var err = field.validator(val);
    if (err) {
      field.el.classList.add('error');
      if (field.error) field.error.textContent = err;
      return false;
    } else {
      field.el.classList.remove('error');
      if (field.error) field.error.textContent = '';
      return true;
    }
  }

  function validateAll() {
    var valid = true;
    for (var key in FIELDS) {
      if (FIELDS[key].validator) {
        if (!validateField(key)) valid = false;
      }
    }
    /* Terms checkbox */
    var termsEl = document.getElementById('termsAccepted');
    var termsErr = document.getElementById('termsError');
    if (!termsEl || !termsEl.checked) {
      if (termsErr) termsErr.textContent = 'يجب الموافقة على الشروط والأحكام';
      valid = false;
    } else {
      if (termsErr) termsErr.textContent = '';
    }
    return valid;
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    if (loading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      isSubmitting = true;
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      isSubmitting = false;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateAll()) {
      /* Scroll to first error */
      var firstErr = formEl.querySelector('.contest-input.error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);

    var campaignId = window._contestCampaignId;
    if (!campaignId) {
      setLoading(false);
      window.ContestUI.showToast('خطأ: لم يتم تحميل بيانات المسابقة');
      return;
    }

    /* Auth check */
    var user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser')); } catch(e) {}
    var userId = user && user.id ? String(user.id) : null;
    var email = localStorage.getItem('userEmail') || FIELDS.email.el.value;

    if (!userId || !email) {
      setLoading(false);
      window.ContestUI.showToast('يرجى تسجيل الدخول أولاً');
      return;
    }

    /* Gather data */
    var fullName = FIELDS.fullName.el.value.trim();
    var familyName = FIELDS.familyName.el.value.trim();
    var phone = FIELDS.phone.el.value.trim();
    var city = FIELDS.city.el.value.trim();
    var birthDate = FIELDS.birthDate.el.value;

    /* Generate referral code */
    window.ContestReferral.ensureUniqueCode(function(referralCode) {

      /* Check if referred by someone */
      var referredBy = window.ContestReferral.getStoredRefCode() || null;

      /* Prevent self-referral: check if ref code belongs to this user */
      if (referredBy) {
        window.ContestData.checkReferralCode(referredBy)
          .then(function(result) {
            if (result.data) {
              /* We'll check user_id after registration */
            }
            doRegister(referralCode, referredBy);
          })
          .catch(function() {
            doRegister(referralCode, null);
          });
      } else {
        doRegister(referralCode, null);
      }
    });

    function doRegister(referralCode, referredBy) {
      var participantData = {
        user_id: userId,
        campaign_id: campaignId,
        full_name: fullName,
        family_name: familyName,
        phone: phone,
        email: email,
        city: city,
        birth_date: birthDate,
        referral_code: referralCode,
        referred_by: referredBy,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        joined_at: new Date().toISOString()
      };

      window.ContestData.registerParticipant(participantData)
        .then(function(result) {
          setLoading(false);
          if (result.error) {
            /* Check for duplicate */
            if (result.error.message && result.error.message.indexOf('duplicate') !== -1) {
              window.ContestUI.showToast('أنت مسجل بالفعل في هذه المسابقة');
            } else {
              window.ContestUI.showToast('حدث خطأ أثناء التسجيل: ' + result.error.message);
            }
            return;
          }

          var participant = result.data;

          /* Create referral if user came from a link */
          if (referredBy && referredBy !== referralCode) {
            /* Find who referred them */
            window.ContestData.checkReferralCode(referredBy)
              .then(function(refResult) {
                if (refResult.data && refResult.data.user_id !== userId) {
                  /* Not self-referral — create referral record */
                  window.ContestData.createReferral({
                    campaign_id: campaignId,
                    referrer_user_id: refResult.data.user_id,
                    referred_user_id: userId,
                    referral_code: referredBy,
                    status: 'qualified'
                  }).catch(function(err) {
                    console.error('[Contest] Referral creation error:', err);
                  });
                }
                window.ContestReferral.clearStoredRef();
              })
              .catch(function() {});
          }

          /* Redirect to referral dashboard */
          window.location.href = 'referral-dashboard.html';
        })
        .catch(function(err) {
          setLoading(false);
          window.ContestUI.showToast('حدث خطأ في الاتصال. حاول مرة أخرى.');
          console.error('[Contest] Registration error:', err);
        });
    }
  }

  function populateFields(data) {
    if (FIELDS.fullName.el) FIELDS.fullName.el.value = data.full_name || '';
    if (FIELDS.familyName.el) FIELDS.familyName.el.value = data.family_name || '';
    if (FIELDS.phone.el) FIELDS.phone.el.value = data.phone || '';
    if (FIELDS.email.el) FIELDS.email.el.value = data.email || '';
    if (FIELDS.city.el) FIELDS.city.el.value = data.city || '';
    if (FIELDS.birthDate.el) FIELDS.birthDate.el.value = data.birth_date || '';
  }

  return {
    init: init,
    validateAll: validateAll,
    populateFields: populateFields
  };
})();
