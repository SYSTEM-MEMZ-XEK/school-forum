// 找回密码页面逻辑
const forgotState = {
  captchaId: null,   // 图形验证码 ID（一次性，每次发送前需获取/刷新）
  qq: null,          // 步骤1验证通过的 QQ
  email: null        // 步骤1验证通过的邮箱
};

// 倒计时
let forgotCountdownTimer = null;
let forgotCountdownSeconds = 60;

// DOM 懒加载
const forgotDom = {
  get stepSend() { return document.getElementById('step-send'); },
  get stepReset() { return document.getElementById('step-reset'); },
  get stepIndicator1() { return document.getElementById('step-indicator-1'); },
  get stepIndicator2() { return document.getElementById('step-indicator-2'); },
  get qq() { return document.getElementById('qq-forgot'); },
  get email() { return document.getElementById('email-forgot'); },
  get captchaCode() { return document.getElementById('captcha-code-forgot'); },
  get captchaImg() { return document.getElementById('captcha-img-forgot'); },
  get sendBtn() { return document.getElementById('send-forgot-code'); },
  get confirmSendBtn() { return document.getElementById('confirm-send-code'); },
  get verificationCode() { return document.getElementById('verification-code-forgot'); },
  get newPassword() { return document.getElementById('new-password-forgot'); },
  get confirmPassword() { return document.getElementById('confirm-password-forgot'); },
  get resetBtn() { return document.getElementById('confirm-reset-password'); }
};

document.addEventListener('DOMContentLoaded', () => {
  loadCaptcha();
  forgotDom.confirmSendBtn?.addEventListener('click', sendCode);
  forgotDom.resetBtn?.addEventListener('click', resetPassword);
  forgotDom.captchaImg?.addEventListener('click', loadCaptcha);

  // 回车支持
  document.addEventListener('keypress', (e) => {
    if (e.key !== 'Enter') return;
    if (forgotDom.stepSend?.classList.contains('active')) {
      sendCode();
    } else {
      resetPassword();
    }
  });
});

// 加载图形验证码
async function loadCaptcha() {
  try {
    const response = await fetch('/api/captcha');
    if (!response.ok) throw new Error('加载验证码失败');
    const captchaId = response.headers.get('X-Captcha-Id');
    if (!captchaId) throw new Error('验证码ID缺失');
    forgotState.captchaId = captchaId;

    const svgText = await response.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const imgEl = forgotDom.captchaImg;
    if (imgEl) {
      const oldImg = imgEl.querySelector('img');
      if (oldImg && oldImg.src.startsWith('blob:')) {
        URL.revokeObjectURL(oldImg.src);
      }
      imgEl.innerHTML = `<img src="${url}" alt="验证码" style="width:150px;height:52px;cursor:pointer;" title="点击刷新验证码">`;
    }
    const inputEl = document.getElementById('captcha-code-forgot');
    if (inputEl) inputEl.value = '';
  } catch (error) {
    console.error('加载验证码失败:', error);
  }
}

// 步骤1：发送重置验证码
async function sendCode() {
  const qq = forgotDom.qq?.value.trim();
  const email = forgotDom.email?.value.trim();
  const captchaCode = forgotDom.captchaCode?.value.trim();

  if (!qq) return showMsg('QQ号不能为空', 'error');
  if (!email) return showMsg('邮箱不能为空', 'error');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg('请输入有效的邮箱地址', 'error');
  if (!captchaCode) return showMsg('请输入图形验证码', 'error');

  if (forgotDom.confirmSendBtn) {
    forgotDom.confirmSendBtn.disabled = true;
    forgotDom.confirmSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
  }

  try {
    const response = await fetch('/api/forgot-password/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qq,
        email,
        captchaId: forgotState.captchaId,
        captchaCode
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '发送验证码失败');
    }

    forgotState.qq = qq;
    forgotState.email = email;
    showMsg(data.message || '验证码已发送到您的邮箱', 'success');
    // 切换到步骤2
    forgotDom.stepSend?.classList.remove('active');
    forgotDom.stepReset?.classList.add('active');
    forgotDom.stepIndicator1?.classList.remove('active');
    forgotDom.stepIndicator2?.classList.add('active');
    startCountdown();
  } catch (error) {
    console.error('发送验证码失败:', error);
    showMsg(error.message || '发送验证码失败，请稍后重试', 'error');
    loadCaptcha(); // 图形验证码一次性，失败后必须刷新
  } finally {
    if (forgotDom.confirmSendBtn) {
      forgotDom.confirmSendBtn.disabled = false;
      forgotDom.confirmSendBtn.innerHTML = '发送验证码';
    }
  }
}

// 发送按钮倒计时
function startCountdown() {
  if (forgotCountdownTimer) clearInterval(forgotCountdownTimer);
  forgotCountdownSeconds = 60;
  const btn = forgotDom.sendBtn;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${forgotCountdownSeconds}秒后重试`;
  }
  forgotCountdownTimer = setInterval(() => {
    forgotCountdownSeconds--;
    if (forgotCountdownSeconds <= 0) {
      clearInterval(forgotCountdownTimer);
      forgotCountdownTimer = null;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '发送验证码';
      }
    } else if (btn) {
      btn.innerHTML = `${forgotCountdownSeconds}秒后重试`;
    }
  }, 1000);
}

// 步骤2：重置密码
async function resetPassword() {
  const verificationCode = forgotDom.verificationCode?.value.trim();
  const newPassword = forgotDom.newPassword?.value;
  const confirmPassword = forgotDom.confirmPassword?.value;

  if (!forgotState.qq || !forgotState.email) {
    showMsg('身份验证已失效，请重新开始', 'error');
    setTimeout(() => window.location.reload(), 1500);
    return;
  }
  if (!verificationCode) return showMsg('请输入邮箱验证码', 'error');
  if (!newPassword) return showMsg('请输入新密码', 'error');
  if (newPassword.length < 6) return showMsg('密码至少6个字符', 'error');
  if (newPassword !== confirmPassword) return showMsg('两次输入的密码不一致', 'error');

  if (forgotDom.resetBtn) {
    forgotDom.resetBtn.disabled = true;
    forgotDom.resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 重置中...';
  }

  try {
    const response = await fetch('/api/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qq: forgotState.qq,
        email: forgotState.email,
        verificationCode,
        newPassword
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '密码重置失败');
    }

    showMsg(data.message || '密码重置成功，正在跳转登录页...', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (error) {
    console.error('密码重置失败:', error);
    showMsg(error.message || '密码重置失败，请稍后重试', 'error');
  } finally {
    if (forgotDom.resetBtn) {
      forgotDom.resetBtn.disabled = false;
      forgotDom.resetBtn.innerHTML = '重置密码';
    }
  }
}

// 消息通知（复用 utils 的通知能力）
function showMsg(message, type) {
  if (window.utils && typeof window.utils.showNotification === 'function') {
    window.utils.showNotification(message, type);
  } else if (window.showNotification) {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}
