(function () {
  'use strict';

  var currentUser = null;
  var categories = [];
  var branches = [];

  function getClient() {
    if (window.supabaseClient && typeof window.supabaseClient.getClient === 'function') {
      return window.supabaseClient.getClient();
    }
    if (typeof supabase !== 'undefined') {
      try {
        var client = supabase;
        return client;
      } catch (_) {}
    }
    return null;
  }

  function toast(msg, type) {
    var existing = document.querySelector('.ac-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'ac-toast ' + (type || 'success');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }

  function showLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'جاري التحميل...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn._origText || btn.innerHTML;
    }
  }

  async function signIn() {
    var client = getClient();
    if (!client) { toast('خطأ في الاتصال بقاعدة البيانات', 'error'); return; }
    try {
      var provider = window.AUTH_CONFIG?.providers?.google || 'google';
      var { error } = await client.auth.signInWithOAuth({ provider: provider });
      if (error) throw error;
    } catch (e) {
      toast('فشل تسجيل الدخول: ' + e.message, 'error');
    }
  }

  async function signOut() {
    var client = getClient();
    if (!client) return;
    try {
      await client.auth.signOut();
      currentUser = null;
      document.getElementById('acLogin').style.display = 'flex';
      document.getElementById('acLayout').style.display = 'none';
    } catch (e) {
      toast('فشل تسجيل الخروج', 'error');
    }
  }

  async function checkAuth() {
    var client = getClient();
    if (!client) return;
    try {
      var { data: { session } } = await client.auth.getSession();
      if (session) {
        currentUser = session.user;
        document.getElementById('acLogin').style.display = 'none';
        document.getElementById('acLayout').style.display = 'flex';
        loadData();
      } else {
        document.getElementById('acLogin').style.display = 'flex';
        document.getElementById('acLayout').style.display = 'none';
      }
    } catch (_) {
      document.getElementById('acLogin').style.display = 'flex';
      document.getElementById('acLayout').style.display = 'none';
    }
  }

  async function loadData() {
    await Promise.all([loadCategories(), loadBranches()]);
  }

  async function loadCategories() {
    var client = getClient();
    if (!client) return;
    try {
      var { data, error } = await client.from('categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      categories = data || [];
      renderCategories();
    } catch (e) {
      toast('فشل تحميل الأقسام', 'error');
    }
  }

  async function loadBranches() {
    var client = getClient();
    if (!client) return;
    try {
      var { data, error } = await client.from('category_branches').select('*, categories(name)').order('sort_order', { ascending: true });
      if (error) throw error;
      branches = data || [];
      renderBranches();
    } catch (e) {
      toast('فشل تحميل الفروع', 'error');
    }
  }

  function renderCategories() {
    var tbody = document.getElementById('acCategoriesBody');
    if (!tbody) return;
    if (!categories.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8">لا توجد أقسام بعد</td></tr>';
      return;
    }
    tbody.innerHTML = categories.map(function (c, i) {
      var keywords = (c.keywords || []).map(function (k) { return '<span class="ac-keyword-tag">' + escapeHtml(k) + '</span>'; }).join('');
      var statusClass = c.is_active ? 'active' : 'inactive';
      var statusText = c.is_active ? 'فعال' : 'غير فعال';
      var img = c.image_url ? '<img class="ac-img" src="' + escapeHtml(c.image_url) + '" onerror="this.style.display=\'none\'" />' : '<div class="ac-img" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8"><span class="material-icons-outlined" style="font-size:20px">image</span></div>';
      return (
        '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + escapeHtml(c.name) + '</strong></td>' +
        '<td style="direction:ltr;font-size:12px;color:#64748b">' + escapeHtml(c.slug) + '</td>' +
        '<td>' + img + '</td>' +
        '<td><div class="ac-keywords-cell">' + (keywords || '<span style="color:#94a3b8;font-size:12px">لا توجد</span>') + '</div></td>' +
        '<td>' + (c.sort_order || 0) + '</td>' +
        '<td><span class="ac-status-badge ' + statusClass + '">' + statusText + '</span></td>' +
        '<td class="ac-actions">' +
        '<button class="ac-btn ac-btn-sm ac-btn-secondary" data-edit-category="' + c.id + '" type="button">تعديل</button>' +
        '<button class="ac-btn ac-btn-sm ac-btn-danger" data-delete-category="' + c.id + '" type="button">حذف</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-edit-category]').forEach(function (btn) {
      btn.addEventListener('click', function () { openCategoryModal(btn.getAttribute('data-edit-category')); });
    });
    tbody.querySelectorAll('[data-delete-category]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteCategory(btn.getAttribute('data-delete-category')); });
    });
  }

  function renderBranches() {
    var tbody = document.getElementById('acBranchesBody');
    if (!tbody) return;
    if (!branches.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8">لا توجد فروع بعد</td></tr>';
      return;
    }
    tbody.innerHTML = branches.map(function (b, i) {
      var keywords = (b.branch_keywords || []).map(function (k) { return '<span class="ac-keyword-tag">' + escapeHtml(k) + '</span>'; }).join('');
      var statusClass = b.is_active ? 'active' : 'inactive';
      var statusText = b.is_active ? 'فعال' : 'غير فعال';
      var parentName = b.categories ? b.categories.name : '—';
      var img = b.branch_image ? '<img class="ac-img" src="' + escapeHtml(b.branch_image) + '" onerror="this.style.display=\'none\'" />' : '<div class="ac-img" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8"><span class="material-icons-outlined" style="font-size:20px">image</span></div>';
      return (
        '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + escapeHtml(b.branch_name) + '</strong></td>' +
        '<td>' + escapeHtml(parentName) + '</td>' +
        '<td>' + img + '</td>' +
        '<td><div class="ac-keywords-cell">' + (keywords || '<span style="color:#94a3b8;font-size:12px">لا توجد</span>') + '</div></td>' +
        '<td>' + (b.sort_order || 0) + '</td>' +
        '<td><span class="ac-status-badge ' + statusClass + '">' + statusText + '</span></td>' +
        '<td class="ac-actions">' +
        '<button class="ac-btn ac-btn-sm ac-btn-secondary" data-edit-branch="' + b.id + '" type="button">تعديل</button>' +
        '<button class="ac-btn ac-btn-sm ac-btn-danger" data-delete-branch="' + b.id + '" type="button">حذف</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-edit-branch]').forEach(function (btn) {
      btn.addEventListener('click', function () { openBranchModal(btn.getAttribute('data-edit-branch')); });
    });
    tbody.querySelectorAll('[data-delete-branch]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteBranch(btn.getAttribute('data-delete-branch')); });
    });
  }

  function openCategoryModal(id) {
    var modal = document.getElementById('acCategoryModal');
    var title = document.getElementById('acCategoryModalTitle');
    var editId = document.getElementById('acEditCategoryId');
    var nameEl = document.getElementById('acCategoryName');
    var slugEl = document.getElementById('acCategorySlug');
    var nameEnEl = document.getElementById('acCategoryNameEn');
    var imgEl = document.getElementById('acCategoryImage');
    var descEl = document.getElementById('acCategoryDesc');
    var kwEl = document.getElementById('acCategoryKeywords');
    var iconEl = document.getElementById('acCategoryIcon');
    var sortEl = document.getElementById('acCategorySort');
    var activeEl = document.getElementById('acCategoryActive');

    if (id) {
      var cat = categories.find(function (c) { return c.id === id; });
      if (!cat) return;
      title.textContent = 'تعديل قسم';
      editId.value = cat.id;
      nameEl.value = cat.name || '';
      slugEl.value = cat.slug || '';
      nameEnEl.value = cat.name_en || '';
      imgEl.value = cat.image_url || '';
      descEl.value = cat.description || '';
      kwEl.value = (cat.keywords || []).join('\n');
      iconEl.value = cat.icon || '';
      sortEl.value = cat.sort_order || 0;
      activeEl.checked = cat.is_active !== false;
    } else {
      title.textContent = 'إضافة قسم جديد';
      editId.value = '';
      nameEl.value = '';
      slugEl.value = '';
      nameEnEl.value = '';
      imgEl.value = '';
      descEl.value = '';
      kwEl.value = '';
      iconEl.value = '';
      sortEl.value = '0';
      activeEl.checked = true;
    }
    modal.style.display = 'flex';
  }

  function openBranchModal(id) {
    var modal = document.getElementById('acBranchModal');
    var title = document.getElementById('acBranchModalTitle');
    var editId = document.getElementById('acEditBranchId');
    var nameEl = document.getElementById('acBranchName');
    var catEl = document.getElementById('acBranchCategory');
    var imgEl = document.getElementById('acBranchImage');
    var kwEl = document.getElementById('acBranchKeywords');
    var sortEl = document.getElementById('acBranchSort');
    var activeEl = document.getElementById('acBranchActive');

    catEl.innerHTML = categories.map(function (c) {
      return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
    }).join('');

    if (id) {
      var branch = branches.find(function (b) { return b.id === id; });
      if (!branch) return;
      title.textContent = 'تعديل فرع';
      editId.value = branch.id;
      nameEl.value = branch.branch_name || '';
      catEl.value = branch.category_id || '';
      imgEl.value = branch.branch_image || '';
      kwEl.value = (branch.branch_keywords || []).join('\n');
      sortEl.value = branch.sort_order || 0;
      activeEl.checked = branch.is_active !== false;
    } else {
      title.textContent = 'إضافة فرع جديد';
      editId.value = '';
      nameEl.value = '';
      catEl.value = categories.length ? categories[0].id : '';
      imgEl.value = '';
      kwEl.value = '';
      sortEl.value = '0';
      activeEl.checked = true;
    }
    modal.style.display = 'flex';
  }

  async function saveCategory() {
    var saveBtn = document.getElementById('acCategoryModalSave');
    showLoading(saveBtn, true);

    var client = getClient();
    if (!client) { toast('خطأ في الاتصال', 'error'); showLoading(saveBtn, false); return; }

    var id = document.getElementById('acEditCategoryId').value;
    var data = {
      name: document.getElementById('acCategoryName').value.trim(),
      slug: document.getElementById('acCategorySlug').value.trim(),
      name_en: document.getElementById('acCategoryNameEn').value.trim(),
      image_url: document.getElementById('acCategoryImage').value.trim(),
      description: document.getElementById('acCategoryDesc').value.trim(),
      keywords: document.getElementById('acCategoryKeywords').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
      icon: document.getElementById('acCategoryIcon').value.trim(),
      sort_order: parseInt(document.getElementById('acCategorySort').value, 10) || 0,
      is_active: document.getElementById('acCategoryActive').checked,
    };

    if (!data.name) { toast('الاسم مطلوب', 'error'); showLoading(saveBtn, false); return; }
    if (!data.slug) { toast('Slug مطلوب', 'error'); showLoading(saveBtn, false); return; }

    try {
      if (id) {
        var { error } = await client.from('categories').update(data).eq('id', id);
        if (error) throw error;
        toast('تم تحديث القسم بنجاح');
      } else {
        var { error } = await client.from('categories').insert(data);
        if (error) throw error;
        toast('تم إضافة القسم بنجاح');
      }
      document.getElementById('acCategoryModal').style.display = 'none';
      await loadCategories();
      await loadBranches();
    } catch (e) {
      toast('فشل الحفظ: ' + e.message, 'error');
    }
    showLoading(saveBtn, false);
  }

  async function saveBranch() {
    var saveBtn = document.getElementById('acBranchModalSave');
    showLoading(saveBtn, true);

    var client = getClient();
    if (!client) { toast('خطأ في الاتصال', 'error'); showLoading(saveBtn, false); return; }

    var id = document.getElementById('acEditBranchId').value;
    var data = {
      branch_name: document.getElementById('acBranchName').value.trim(),
      category_id: document.getElementById('acBranchCategory').value,
      branch_image: document.getElementById('acBranchImage').value.trim(),
      branch_keywords: document.getElementById('acBranchKeywords').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
      sort_order: parseInt(document.getElementById('acBranchSort').value, 10) || 0,
      is_active: document.getElementById('acBranchActive').checked,
    };

    if (!data.branch_name) { toast('اسم الفرع مطلوب', 'error'); showLoading(saveBtn, false); return; }
    if (!data.category_id) { toast('القسم الأب مطلوب', 'error'); showLoading(saveBtn, false); return; }

    try {
      if (id) {
        var { error } = await client.from('category_branches').update(data).eq('id', id);
        if (error) throw error;
        toast('تم تحديث الفرع بنجاح');
      } else {
        var { error } = await client.from('category_branches').insert(data);
        if (error) throw error;
        toast('تم إضافة الفرع بنجاح');
      }
      document.getElementById('acBranchModal').style.display = 'none';
      await loadBranches();
    } catch (e) {
      toast('فشل الحفظ: ' + e.message, 'error');
    }
    showLoading(saveBtn, false);
  }

  async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    var client = getClient();
    if (!client) return;
    try {
      await client.from('category_branches').delete().eq('category_id', id);
      var { error } = await client.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast('تم حذف القسم');
      await loadCategories();
      await loadBranches();
    } catch (e) {
      toast('فشل الحذف: ' + e.message, 'error');
    }
  }

  async function deleteBranch(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    var client = getClient();
    if (!client) return;
    try {
      var { error } = await client.from('category_branches').delete().eq('id', id);
      if (error) throw error;
      toast('تم حذف الفرع');
      await loadBranches();
    } catch (e) {
      toast('فشل الحذف: ' + e.message, 'error');
    }
  }

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    checkAuth();

    document.getElementById('acLoginBtn').addEventListener('click', signIn);
    document.getElementById('acLogoutBtn').addEventListener('click', signOut);

    document.getElementById('acAddCategoryBtn').addEventListener('click', function () { openCategoryModal(null); });
    document.getElementById('acAddBranchBtn').addEventListener('click', function () { openBranchModal(null); });

    document.getElementById('acCategoryModalSave').addEventListener('click', saveCategory);
    document.getElementById('acCategoryModalCancel').addEventListener('click', function () { document.getElementById('acCategoryModal').style.display = 'none'; });
    document.getElementById('acCategoryModalClose').addEventListener('click', function () { document.getElementById('acCategoryModal').style.display = 'none'; });

    document.getElementById('acBranchModalSave').addEventListener('click', saveBranch);
    document.getElementById('acBranchModalCancel').addEventListener('click', function () { document.getElementById('acBranchModal').style.display = 'none'; });
    document.getElementById('acBranchModalClose').addEventListener('click', function () { document.getElementById('acBranchModal').style.display = 'none'; });

    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.ac-tab').forEach(function (t) { t.classList.remove('active'); });
        var tab = document.getElementById('tab-' + btn.getAttribute('data-tab'));
        if (tab) tab.classList.add('active');
      });
    });

    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#login') signIn();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();