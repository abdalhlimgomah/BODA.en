// ===== Supabase Configuration =====
const SUPABASE_URL = 'https://msgqzgzoslearaprgiqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE';

// ===== Password Toggle =====
const password = document.getElementById('password');
const eye = document.getElementById('eye');

if (eye && password) {
  eye.addEventListener('click', () => {
    if (password.type === 'password') {
      eye.children[0].classList.remove('fa-eye');
      eye.children[0].classList.add('fa-eye-slash');
      password.type = 'text';
    } else {
      eye.children[0].classList.remove('fa-eye-slash');
      eye.children[0].classList.add('fa-eye');
      password.type = 'password';
    }
  });
}

// ===== Sign Up Functions =====
async function handleSignUp(event) {
  event.preventDefault();
  
  console.log('🔧 Sign Up Started');
  
  const name = document.querySelector('input[name="name"]')?.value.trim();
  const email = document.querySelector('input[name="email"]')?.value.trim();
  const password = document.querySelector('input[name="password"]')?.value;
  const confirmPassword = document.querySelector('input[name="confirm-password"]')?.value;

  console.log('📝 Form Data:', { name, email, password: password ? '***' : '', confirmPassword: confirmPassword ? '***' : '' });

  if (!name || !email || !password || !confirmPassword) {
    alert('⚠️ الرجاء ملء جميع الحقول');
    return;
  }

  if (password !== confirmPassword) {
    alert('❌ كلمات المرور غير متطابقة');
    return;
  }

  if (password.length < 6) {
    alert('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  try {
    console.log('📤 Sending to Supabase...');
    
    // Save to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: email,
        name: name,
        password: password
      })
    });

    console.log('📥 Response Status:', response.status);

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (e) {
        error = await response.text();
        console.error('❌ Error (Text):', error);
        alert('❌ خطأ: ' + (typeof error === 'string' ? error : 'فشل التسجيل'));
        return;
      }
      console.error('❌ Supabase Error:', error);
      
      // Handle duplicate email error
      if (error.code === '23505') {
        alert('❌ هذا البريد الإلكتروني مسجل بالفعل. جرّب بريد آخر أو سجل دخول');
      } else {
        alert('❌ خطأ: ' + (error.message || error.details || 'فشل التسجيل'));
      }
      return;
    }

    // Success! Status 201 or 200
    console.log('✅ HTTP Status Success: ' + response.status);
    
    // Try to parse response body
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);
    
    let result;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
        console.log('✅ Parsed JSON:', result);
      } catch (e) {
        console.warn('⚠️ Response is text (not JSON):', responseText);
        result = { success: true };
      }
    } else {
      console.log('ℹ️ Empty response body (normal for INSERT)');
      result = { success: true };
    }
    
    console.log('✅ Registration Success!');
    alert('✅ تم التسجيل بنجاح! سيتم تحويلك لصفحة تسجيل الدخول');
    
    // Clear form
    document.querySelector('form').reset();
    
    // Redirect to login - استخدم path مباشر
    setTimeout(() => {
      console.log('🔄 DEBUG: Current URL:', window.location.href);
      console.log('🔄 DEBUG: Redirecting to: pages/signin/login.html');
      // من pages/signup/index.html الى pages/signin/login.html = ../signin/login.html
      window.location.href = '../signin/login.html';
      console.log('🔄 DEBUG: After redirect');
    }, 1500);

  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ حدث خطأ: ' + error.message);
  }
}

// ===== Log In Functions =====
async function handleLogIn(event) {
  if (event) event.preventDefault();
  
  console.log('🔧 Log In Started');
  
  const username = document.getElementById('username')?.value.trim();
  const password = document.getElementById('password')?.value;

  console.log('📝 Login Data:', { username, password: password ? '***' : '' });

  if (!username || !password) {
    alert('⚠️ الرجاء إدخال البيانات');
    return;
  }

  try {
    console.log('📤 Searching user in Supabase...');
    
    // Properly encode the email for URL query
    const encodedEmail = encodeURIComponent(username);
    const queryUrl = `${SUPABASE_URL}/rest/v1/users?email=eq.${encodedEmail}`;
    
    console.log('🔗 Query URL:', queryUrl);
    
    // Check if user exists in Supabase
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response Status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Supabase Error:', error);
      alert('❌ خطأ في الاتصال: ' + error);
      return;
    }

    const users = await response.json();
    console.log('📋 Users Found:', users.length);

    if (!users || users.length === 0) {
      console.warn('⚠️ No user found with email:', username);
      alert('❌ المستخدم غير موجود. الرجاء التحقق من بيانات الدخول أو إنشاء حساب جديد');
      return;
    }

    const user = users[0];
    console.log('👤 User Found:', user.name, user.email);

    // Simple password check
    if (user.password !== password) {
      console.warn('❌ Password mismatch');
      alert('❌ كلمة المرور غير صحيحة');
      return;
    }

    console.log('✅ Password Match');

    // Save user session to localStorage
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    console.log('💾 User saved to localStorage:', userData);

    alert(`✅ مرحباً ${user.name}! تم تسجيل الدخول بنجاح`);
    
    // Redirect to home
    setTimeout(() => {
      window.location.href = '../home.html';
    }, 1500);

  } catch (error) {
    console.error('❌ Catch Error:', error);
    alert('❌ حدث خطأ: ' + error.message);
  }
}

// ===== Form Submission =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Loaded - Setting up event listeners');
  
  const page = window.location.pathname;
  console.log('📍 Current Page:', page);

  if (page.includes('signup') || page.includes('sign-up')) {
    console.log('🔧 Sign Up Page Detected');
    console.log('ℹ️ Form submission handled via HTML onsubmit attribute - skipping duplicate listener');
  } else if (page.includes('signin') || page.includes('login')) {
    console.log('🔧 Login Page Detected');
    const loginBtn = document.querySelector('button[type="button"]');
    if (loginBtn) {
      console.log('✅ Login button found, adding click listener');
      loginBtn.addEventListener('click', (e) => {
        console.log('📤 Login button clicked');
        handleLogIn(e);
      });
    } else {
      console.warn('⚠️ Login button not found');
    }
  }
});

// ===== Google Sign-In Integration =====
window.TFA = function(response) {
  const decodedToken = jwt_decode(response.credential);
  console.log("Google Sign-In:", decodedToken);
  
  const email = decodedToken.email;
  const name = decodedToken.name;
  
  // Save Google user to localStorage
  localStorage.setItem('currentUser', JSON.stringify({
    id: 'google_' + decodedToken.sub,
    email: email,
    name: name,
    provider: 'google',
    loginTime: new Date().toISOString()
  }));

  alert(`✅ مرحباً ${name}! تم تسجيل الدخول عبر Google`);
  
  // Redirect to home
  setTimeout(() => {
    window.location.href = '../home.html';
  }, 1000);
}

// ===== Logout Functions =====
function logout() {
  console.log('🔓 Logout Started');
  
  // Remove user from localStorage
  localStorage.removeItem('currentUser');
  console.log('💾 User removed from localStorage');
  
  // Show confirmation
  alert('✅ تم تسجيل الخروج بنجاح');
  console.log('✅ Logout Complete');
  
  // Redirect to home
  setTimeout(() => {
    console.log('🔄 Redirecting to home...');
    window.location.href = '../home.html';
  }, 1000);
}

function confirmLogout() {
  console.log('🔐 Confirm Logout Requested');
  
  // Ask user to confirm
  const confirmed = confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
  
  if (confirmed) {
    logout();
  } else {
    console.log('❌ Logout cancelled by user');
    // Go back
    window.history.back();
  }
}

// ===== Check if user is logged in =====
function isLoggedIn() {
  const user = localStorage.getItem('currentUser');
  return user !== null && user !== undefined;
}

function getCurrentUser() {
  const userJson = localStorage.getItem('currentUser');
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.error('Error parsing user:', e);
      return null;
    }
  }
  return null;
}
