const STORAGE_KEY = 'propfast-proposals';
const SETTINGS_STORAGE_KEY = 'propfast-system-settings';
const DEFAULT_SYSTEM_SETTINGS = {
  senderBrandName: 'PropFast Studio',
  senderPhone: '',
  senderBankAccount: '',
  defaultVatPercent: 10,
  defaultDiscountPercent: 0,
  currency: 'VND',
  serviceTerms: 'Tạm ứng 50% trước khi làm\nBáo giá có hiệu lực trong 14 ngày',
  isLightMode: false,
  toastSoundEnabled: true,
  liveSimulationEnabled: false,
};

let proposals = loadProposals();
let systemSettings = loadSystemSettings();
let activeProposalId = null;
let activeProjectId = null;
let lastWorkspaceView = 'clients';

const form = document.getElementById('proposalForm');
const clientNameInput = document.getElementById('clientName');
const projectNameInput = document.getElementById('projectName');
const discountInput = document.getElementById('discountInput');
const vatEnabledInput = document.getElementById('vatEnabled');
const expiryInput = document.getElementById('expiryInput');
const costInput = document.getElementById('costInput');
const marginHint = document.getElementById('marginHint');
const marginValue = document.getElementById('marginValue');
const marginStatus = document.getElementById('marginStatus');
const metricTotal = document.getElementById('metricTotal');
const metricCost = document.getElementById('metricCost');
const metricNet = document.getElementById('metricNet');
const itemsContainer = document.getElementById('itemsContainer');
const totalAmount = document.getElementById('totalAmount');
const previewEl = document.getElementById('proposalPreview');
const inlinePreviewEl = document.getElementById('proposalPreviewInline');
const savedProposalsList = document.getElementById('savedProposalsList');
const projectList = document.getElementById('projectList');
const newProjectBtn = document.querySelector('.sidebar-section-head .ghost-pill');
const addItemBtn = document.getElementById('addItemBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const saveBtn = document.getElementById('saveBtn');
const toastContainer = document.getElementById('toast-container');
const workspaceLinks = Array.from(document.querySelectorAll('.sidebar-link[data-workspace-link]'));
const vatToggleLabel = document.getElementById('vatToggleLabel');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsVatPercentInput = document.getElementById('settingsVatPercent');
const settingsDiscountPercentInput = document.getElementById('settingsDiscountPercent');
const settingsBrandNameInput = document.getElementById('settingsBrandName');
const settingsPhoneInput = document.getElementById('settingsPhone');
const settingsBankAccountInput = document.getElementById('settingsBankAccount');
const settingsCurrencyInput = document.getElementById('settingsCurrency');
const settingsServiceTermsInput = document.getElementById('settingsServiceTerms');
const settingsLightModeInput = document.getElementById('settingsLightMode');
const settingsToastSoundInput = document.getElementById('settingsToastSound');
const settingsLiveSimulationInput = document.getElementById('settingsLiveSimulation');
const settingsDialog = settingsModal?.querySelector('.settings-dialog') || null;
const settingsUnsavedHint = document.getElementById('settingsUnsavedHint');
const appShell = document.getElementById('app-shell');
let activeFilter = 'all';
let openProjectMenuId = null;
let audioContext = null;
let countdownIntervalId = null;
let toastIntervalId = null;
let themeTransitionTimeoutId = null;
let modalReturnFocusElement = null;
let systemSettingsSnapshot = null;
let settingsDirty = false;
let settingsDirtyRafId = null;
const MODAL_FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const sampleProjects = [
  {
    id: 'hcm45',
    label: 'Hẻm 45',
    clientName: 'Công ty Hẻm 45',
    projectName: 'Thiết kế showroom nội thất',
    discountPercent: 8,
    vatEnabled: true,
    cost: 18000000,
    expiry: '2026-08-02',
    items: [
      { serviceName: 'Thiết kế concept', quantity: 1, unitPrice: 9000000 },
      { serviceName: 'Moodboard & render', quantity: 3, unitPrice: 2200000 },
      { serviceName: 'Hỗ trợ triển khai', quantity: 1, unitPrice: 4000000 },
    ],
  },
  {
    id: 'q1-apartment',
    label: 'Căn Hộ Q1',
    clientName: 'Studio Vinhomes',
    projectName: 'Báo giá căn hộ high-end',
    discountPercent: 5,
    vatEnabled: true,
    cost: 25000000,
    expiry: '2026-08-10',
    items: [
      { serviceName: 'Thiết kế nội thất', quantity: 1, unitPrice: 16000000 },
      { serviceName: 'Render 360', quantity: 4, unitPrice: 1800000 },
      { serviceName: 'Kịch bản triển khai', quantity: 1, unitPrice: 5200000 },
    ],
  },
  {
    id: 'luxury-club',
    label: 'Luxury Club',
    clientName: 'Luxury Club Co.',
    projectName: 'Proposal launch campaign',
    discountPercent: 10,
    vatEnabled: false,
    cost: 14000000,
    expiry: '2026-08-15',
    items: [
      { serviceName: 'Brand direction', quantity: 1, unitPrice: 7000000 },
      { serviceName: 'Creative assets', quantity: 8, unitPrice: 800000 },
      { serviceName: 'Launch rollout', quantity: 1, unitPrice: 6000000 },
    ],
  },
];

function loadProposals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Không thể đọc LocalStorage:', error);
    return [];
  }
}

function saveProposals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

function loadSystemSettings() {
  try {
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) return { ...DEFAULT_SYSTEM_SETTINGS };
    const parsedSettings = JSON.parse(rawSettings);
    return { ...DEFAULT_SYSTEM_SETTINGS, ...parsedSettings };
  } catch (error) {
    console.error('Không thể đọc cấu hình hệ thống:', error);
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

function saveSystemSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return fallback;
  return Math.min(Math.max(numericValue, min), max);
}

function normalizeText(value, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function parseWholeNumber(value) {
  const normalized = String(value ?? '').replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : 0;
}

function formatWholeNumber(value) {
  const numericValue = Math.max(0, Number(value) || 0);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function getServiceTermsLines() {
  const rawTerms = String(systemSettings.serviceTerms ?? '');
  const normalizedTerms = rawTerms.trim() ? rawTerms : DEFAULT_SYSTEM_SETTINGS.serviceTerms;
  return normalizedTerms
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCurrencyConfig() {
  if (systemSettings.currency === 'USD') {
    return {
      locale: 'en-US',
      currency: 'USD',
      maximumFractionDigits: 0,
    };
  }

  return {
    locale: 'vi-VN',
    currency: 'VND',
    maximumFractionDigits: 0,
  };
}

function formatCurrency(value) {
  const currencyConfig = getCurrencyConfig();
  return new Intl.NumberFormat(currencyConfig.locale, {
    style: 'currency',
    currency: currencyConfig.currency,
    maximumFractionDigits: currencyConfig.maximumFractionDigits,
  }).format(value);
}

function playToastTone() {
  if (!systemSettings.toastSoundEnabled) return;
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 860;
  gainNode.gain.value = 0.04;
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.12);
  oscillator.stop(audioContext.currentTime + 0.13);
}

function showToast(message) {
  if (!toastContainer) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = message;
  toastContainer.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add('show'));
  playToastTone();
  clearTimeout(toastEl.timeoutId);
  toastEl.timeoutId = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 220);
  }, 2600);
}

function startRealtimeToastLoop() {
  if (toastIntervalId || !systemSettings.liveSimulationEnabled) return;
  const liveNames = ['Công ty ABC', 'Tập đoàn X', 'Studio Vinhomes', 'Luxury Club Co.', 'Sunrise Holdings'];
  toastIntervalId = setInterval(() => {
    const name = liveNames[Math.floor(Math.random() * liveNames.length)];
    showToast(`👀 ${name} vừa mở xem báo giá của bạn.`);
  }, 14000);
}

function stopRealtimeToastLoop() {
  if (!toastIntervalId) return;
  clearInterval(toastIntervalId);
  toastIntervalId = null;
}

function syncRealtimeSimulation() {
  if (systemSettings.liveSimulationEnabled) {
    startRealtimeToastLoop();
    return;
  }
  stopRealtimeToastLoop();
}

function syncSettingsForm() {
  if (settingsBrandNameInput) settingsBrandNameInput.value = systemSettings.senderBrandName;
  if (settingsPhoneInput) settingsPhoneInput.value = systemSettings.senderPhone;
  if (settingsBankAccountInput) settingsBankAccountInput.value = systemSettings.senderBankAccount;
  if (settingsVatPercentInput) settingsVatPercentInput.value = String(systemSettings.defaultVatPercent);
  if (settingsDiscountPercentInput) settingsDiscountPercentInput.value = String(systemSettings.defaultDiscountPercent);
  if (settingsCurrencyInput) settingsCurrencyInput.value = systemSettings.currency;
  if (settingsServiceTermsInput) settingsServiceTermsInput.value = systemSettings.serviceTerms;
  if (settingsLightModeInput) settingsLightModeInput.checked = Boolean(systemSettings.isLightMode);
  if (settingsToastSoundInput) settingsToastSoundInput.checked = Boolean(systemSettings.toastSoundEnabled);
  if (settingsLiveSimulationInput) settingsLiveSimulationInput.checked = Boolean(systemSettings.liveSimulationEnabled);
}

function applySystemSettingsToUi(options = {}) {
  const { applyDiscountDefault = false } = options;

  if (vatToggleLabel) {
    vatToggleLabel.textContent = `VAT ${systemSettings.defaultVatPercent}%`;
  }

  document.body.classList.toggle('light-theme', Boolean(systemSettings.isLightMode));

  syncSettingsForm();

  if (applyDiscountDefault && discountInput) {
    discountInput.value = String(systemSettings.defaultDiscountPercent);
  }

  updateTotals();
  renderPreview();
  updateTermsInPreview();
  syncRealtimeSimulation();
}

function applyLightModeState(animate = false) {
  if (animate) {
    document.body.classList.add('theme-transitioning');
    clearTimeout(themeTransitionTimeoutId);
    themeTransitionTimeoutId = setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 720);
  }

  document.body.classList.toggle('light-theme', Boolean(systemSettings.isLightMode));
}

function cloneSystemSettings(settings) {
  return {
    senderBrandName: String(settings.senderBrandName ?? ''),
    senderPhone: String(settings.senderPhone ?? ''),
    senderBankAccount: String(settings.senderBankAccount ?? ''),
    defaultVatPercent: Number(settings.defaultVatPercent ?? DEFAULT_SYSTEM_SETTINGS.defaultVatPercent),
    defaultDiscountPercent: Number(settings.defaultDiscountPercent ?? DEFAULT_SYSTEM_SETTINGS.defaultDiscountPercent),
    currency: settings.currency === 'USD' ? 'USD' : 'VND',
    serviceTerms: String(settings.serviceTerms ?? ''),
    isLightMode: Boolean(settings.isLightMode),
    toastSoundEnabled: Boolean(settings.toastSoundEnabled),
    liveSimulationEnabled: Boolean(settings.liveSimulationEnabled),
  };
}

function areSystemSettingsEqual(left, right) {
  if (!left || !right) return false;
  const normalizedLeft = cloneSystemSettings(left);
  const normalizedRight = cloneSystemSettings(right);

  return normalizedLeft.senderBrandName === normalizedRight.senderBrandName
    && normalizedLeft.senderPhone === normalizedRight.senderPhone
    && normalizedLeft.senderBankAccount === normalizedRight.senderBankAccount
    && normalizedLeft.defaultVatPercent === normalizedRight.defaultVatPercent
    && normalizedLeft.defaultDiscountPercent === normalizedRight.defaultDiscountPercent
    && normalizedLeft.currency === normalizedRight.currency
    && normalizedLeft.serviceTerms === normalizedRight.serviceTerms
    && normalizedLeft.isLightMode === normalizedRight.isLightMode
    && normalizedLeft.toastSoundEnabled === normalizedRight.toastSoundEnabled
    && normalizedLeft.liveSimulationEnabled === normalizedRight.liveSimulationEnabled;
}

function collectSettingsFromModal() {
  return {
    senderBrandName: normalizeText(settingsBrandNameInput?.value, DEFAULT_SYSTEM_SETTINGS.senderBrandName),
    senderPhone: normalizeText(settingsPhoneInput?.value),
    senderBankAccount: normalizeText(settingsBankAccountInput?.value),
    defaultVatPercent: clampNumber(settingsVatPercentInput?.value, 0, 100, DEFAULT_SYSTEM_SETTINGS.defaultVatPercent),
    defaultDiscountPercent: clampNumber(settingsDiscountPercentInput?.value, 0, 100, DEFAULT_SYSTEM_SETTINGS.defaultDiscountPercent),
    currency: settingsCurrencyInput?.value === 'USD' ? 'USD' : 'VND',
    serviceTerms: String(settingsServiceTermsInput?.value ?? ''),
    isLightMode: Boolean(settingsLightModeInput?.checked),
    toastSoundEnabled: Boolean(settingsToastSoundInput?.checked),
    liveSimulationEnabled: Boolean(settingsLiveSimulationInput?.checked),
  };
}

function validateSettingsInput(settings) {
  const phonePattern = /^[0-9+\-().\s]{8,20}$/;
  if (settings.senderPhone && !phonePattern.test(settings.senderPhone)) {
    return {
      message: 'Số điện thoại chỉ nên gồm số và ký tự + - ( ) . với độ dài 8-20 ký tự.',
      field: settingsPhoneInput,
    };
  }

  if (settings.senderBankAccount && settings.senderBankAccount.length < 6) {
    return {
      message: 'Số tài khoản ngân hàng quá ngắn. Vui lòng nhập ít nhất 6 ký tự.',
      field: settingsBankAccountInput,
    };
  }

  return null;
}

function updateSettingsDirtyUi() {
  if (saveSettingsBtn) {
    saveSettingsBtn.disabled = !settingsDirty;
  }

  if (settingsUnsavedHint) {
    settingsUnsavedHint.textContent = settingsDirty ? 'Bạn có thay đổi chưa lưu.' : 'Tất cả thay đổi đã được lưu.';
  }
}

function refreshSettingsDirtyState() {
  if (!settingsModal?.classList.contains('show-modal')) return;
  const draftSettings = collectSettingsFromModal();
  settingsDirty = !areSystemSettingsEqual(draftSettings, systemSettingsSnapshot || systemSettings);
  updateSettingsDirtyUi();
}

function scheduleRefreshSettingsDirtyState() {
  if (settingsDirtyRafId) {
    cancelAnimationFrame(settingsDirtyRafId);
  }

  settingsDirtyRafId = requestAnimationFrame(() => {
    settingsDirtyRafId = null;
    refreshSettingsDirtyState();
  });
}

function getSettingsModalFocusableElements() {
  const dialog = settingsModal?.querySelector('.settings-dialog');
  if (!dialog) return [];

  return Array.from(dialog.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hasAttribute('disabled')) return false;
    return true;
  });
}

function openSettingsModal() {
  if (!settingsModal) return;
  modalReturnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  systemSettingsSnapshot = cloneSystemSettings(systemSettings);
  syncSettingsForm();
  settingsModal.classList.add('show-modal');
  settingsModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (appShell) appShell.setAttribute('aria-hidden', 'true');
  settingsDirty = false;
  updateSettingsDirtyUi();

  const focusableElements = getSettingsModalFocusableElements();
  const firstFocusable = focusableElements[0] || settingsModal.querySelector('.settings-dialog');
  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus();
  }
}

function closeSettingsModal(options = {}) {
  if (!settingsModal) return;
  const { force = false, restoreSnapshot = true } = options;
  if (!force && settingsDirty) {
    const shouldDiscard = window.confirm('Bạn có thay đổi chưa lưu. Bạn có muốn hủy và bỏ các thay đổi này không?');
    if (!shouldDiscard) {
      return;
    }
  }

  if (restoreSnapshot && systemSettingsSnapshot) {
    document.body.classList.toggle('light-theme', Boolean(systemSettingsSnapshot.isLightMode));
  }

  settingsModal.classList.remove('show-modal');
  settingsModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (appShell) appShell.removeAttribute('aria-hidden');

  if (modalReturnFocusElement && typeof modalReturnFocusElement.focus === 'function') {
    modalReturnFocusElement.focus();
  }
  modalReturnFocusElement = null;
  settingsDirty = false;
  updateSettingsDirtyUi();
  systemSettingsSnapshot = null;
  activateWorkspaceLink(lastWorkspaceView);
}

function saveSettingsFromModal() {
  const nextSettings = collectSettingsFromModal();
  const validationError = validateSettingsInput(nextSettings);
  if (validationError) {
    showToast(`⚠️ ${validationError.message}`);
    if (validationError.field && typeof validationError.field.focus === 'function') {
      validationError.field.focus();
    }
    return;
  }

  systemSettings = nextSettings;
  saveSystemSettings();
  applySystemSettingsToUi({ applyDiscountDefault: true });
  closeSettingsModal({ force: true, restoreSnapshot: false });
  showToast('⚙️ Đã cập nhật cấu hình hệ thống thành công!');
}

function trapSettingsModalFocus(event) {
  if (!settingsModal?.classList.contains('show-modal')) return;
  if (event.key !== 'Tab') return;

  const focusableElements = getSettingsModalFocusableElements();
  if (!focusableElements.length) {
    event.preventDefault();
    const dialog = settingsModal.querySelector('.settings-dialog');
    if (dialog instanceof HTMLElement) {
      dialog.focus();
    }
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const fallbackTextArea = document.createElement('textarea');
  fallbackTextArea.value = text;
  fallbackTextArea.setAttribute('readonly', '');
  fallbackTextArea.style.position = 'fixed';
  fallbackTextArea.style.left = '-9999px';
  document.body.appendChild(fallbackTextArea);
  fallbackTextArea.select();

  const copied = document.execCommand('copy');
  fallbackTextArea.remove();
  return copied;
}

function animateValue(element, start, end, duration = 280, formatter = formatCurrency) {
  if (!element) return;
  if (document.hidden || start === end) {
    element.textContent = formatter(end);
    return;
  }

  const startTime = performance.now();
  const step = (time) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);
    element.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function createItemRow(item = {}) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <label class="service-field">
      <span>Tên dịch vụ</span>
      <input type="text" class="service-name" value="${item.serviceName || ''}" placeholder="Thiết kế UI" />
      <span class="pricing-hint"></span>
    </label>
    <label>
      <span>Số lượng</span>
      <input type="number" class="quantity" min="1" value="${item.quantity || 1}" />
    </label>
    <label>
      <span>Đơn giá</span>
      <input type="text" class="unit-price" inputmode="numeric" autocomplete="off" value="${formatWholeNumber(item.unitPrice || 0)}" />
    </label>
    <button type="button" class="remove-btn">Xóa</button>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.classList.add('is-removing');
    setTimeout(() => {
      row.remove();
      updateTotals();
      renderPreview();
    }, 280);
  });

  const serviceInput = row.querySelector('.service-name');
  const unitPriceInput = row.querySelector('.unit-price');
  const hint = row.querySelector('.pricing-hint');

  const updatePricingHint = () => {
    const value = serviceInput.value.trim().toLowerCase();
    const suggestionMap = {
      'thiết kế': 'Giá thị trường gợi ý: 8.000.000đ - 20.000.000đ',
      website: 'Giá thị trường gợi ý: 12.000.000đ - 30.000.000đ',
      landing: 'Giá thị trường gợi ý: 6.000.000đ - 15.000.000đ',
      marketing: 'Giá thị trường gợi ý: 5.000.000đ - 12.000.000đ',
      chụp: 'Giá thị trường gợi ý: 3.000.000đ - 8.000.000đ',
      ảnh: 'Giá thị trường gợi ý: 3.000.000đ - 8.000.000đ',
      seo: 'Giá thị trường gợi ý: 4.000.000đ - 10.000.000đ',
    };

    const matched = Object.entries(suggestionMap).find(([keyword]) => value.includes(keyword));
    hint.textContent = matched ? matched[1] : '';
  };

  serviceInput.addEventListener('input', () => {
    updatePricingHint();
    updateTotals();
    renderPreview();
  });

  row.querySelectorAll('input').forEach((input) => {
    if (input.classList.contains('service-name') || input.classList.contains('unit-price')) return;
    input.addEventListener('input', () => {
      updateTotals();
      renderPreview();
    });
  });

  if (unitPriceInput) {
    unitPriceInput.addEventListener('input', () => {
      const numericValue = parseWholeNumber(unitPriceInput.value);
      unitPriceInput.value = numericValue ? formatWholeNumber(numericValue) : '';
      updateTotals();
      renderPreview();
    });

    unitPriceInput.addEventListener('blur', () => {
      if (!unitPriceInput.value.trim()) {
        unitPriceInput.value = '0';
      }
    });
  }

  updatePricingHint();
  return row;
}

function initItems() {
  itemsContainer.innerHTML = '';
  const row = createItemRow();
  itemsContainer.appendChild(row);
  requestAnimationFrame(() => row.classList.add('is-visible'));
}

function addItemRow(item = {}) {
  const row = createItemRow(item);
  itemsContainer.appendChild(row);
  requestAnimationFrame(() => row.classList.add('is-visible'));
  updateTotals();
  renderPreview();
  showToast('Đã thêm hạng mục mới');
}

function computeSummary() {
  const rows = Array.from(itemsContainer.querySelectorAll('.item-row'));
  const subtotal = rows.reduce((sum, row) => {
    const quantity = Number(row.querySelector('.quantity').value || 0);
    const unitPrice = parseWholeNumber(row.querySelector('.unit-price').value);
    return sum + quantity * unitPrice;
  }, 0);

  const discountPercent = clampNumber(discountInput.value || systemSettings.defaultDiscountPercent || 0, 0, 100, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const vatPercent = vatEnabledInput.checked ? clampNumber(systemSettings.defaultVatPercent || 0, 0, 100, 0) : 0;
  const vatAmount = discountedSubtotal * (vatPercent / 100);
  const total = discountedSubtotal + vatAmount;

  return { subtotal, discountPercent, discountAmount, discountedSubtotal, vatAmount, vatPercent, total };
}

function updateTotals() {
  const summary = computeSummary();
  const previous = Number(totalAmount.dataset.value || 0);
  animateValue(totalAmount, previous, summary.total);
  totalAmount.dataset.value = String(summary.total);

  const cost = Number(costInput.value || 0);
  const marginPercent = summary.total > 0 ? ((summary.total - cost) / summary.total) * 100 : 0;
  const safe = marginPercent >= 20;
  const netProfit = summary.total - cost;

  if (marginHint) {
    marginHint.textContent = `Biên lợi nhuận: ${marginPercent.toFixed(1)}%`;
    marginHint.classList.toggle('safe', safe);
    marginHint.classList.toggle('warning', !safe);
  }

  if (marginValue) {
    marginValue.textContent = `${marginPercent.toFixed(1)}%`;
    marginValue.style.color = safe ? 'var(--success)' : 'var(--danger)';
  }

  if (marginStatus) {
    marginStatus.textContent = safe ? 'Mức biên lợi nhuận phù hợp' : 'Cần tăng giá hoặc giảm chi phí';
  }

  const metricTotalLabel = metricTotal?.previousElementSibling;
  const metricCostLabel = metricCost?.previousElementSibling;
  const metricNetLabel = metricNet?.previousElementSibling;

  if (metricTotalLabel) metricTotalLabel.textContent = 'Tổng thu';
  if (metricCostLabel) metricCostLabel.textContent = 'Chi phí';
  if (metricNetLabel) metricNetLabel.textContent = 'Lợi nhuận';

  if (metricTotal) metricTotal.textContent = formatCurrency(summary.total);
  if (metricCost) metricCost.textContent = formatCurrency(cost);
  if (metricNet) metricNet.textContent = formatCurrency(netProfit);

  return summary;
}

function collectFormData() {
  const rows = Array.from(itemsContainer.querySelectorAll('.item-row'));
  const items = rows
    .map((row) => ({
      serviceName: row.querySelector('.service-name').value.trim(),
      quantity: Number(row.querySelector('.quantity').value || 0),
      unitPrice: parseWholeNumber(row.querySelector('.unit-price').value),
    }))
    .filter((item) => item.serviceName || item.quantity || item.unitPrice);

  const summary = updateTotals();

  return {
    clientName: clientNameInput.value.trim(),
    projectName: projectNameInput.value.trim(),
    discountPercent: summary.discountPercent,
    vatEnabled: vatEnabledInput.checked,
    items,
    ...summary,
  };
}

function getStatusLabel(status) {
  if (status === 'Approved') return 'Đã duyệt';
  if (status === 'Sent') return 'Đã gửi';
  return 'Nháp';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderConfigValue(value, fallback = 'Chưa cấu hình') {
  const normalizedValue = String(value ?? '').trim();
  if (normalizedValue && normalizedValue !== fallback) {
    return escapeHtml(normalizedValue);
  }

  return `<span class="config-placeholder">${escapeHtml(fallback)}</span>`;
}

function getCurrentPreviewData() {
  const data = collectFormData();
  const proposal = activeProposalId ? proposals.find((item) => item.id === activeProposalId) : null;
  const serviceTerms = getServiceTermsLines();

  return {
    clientName: data.clientName || proposal?.clientName || 'Tên khách hàng',
    projectName: data.projectName || proposal?.projectName || 'Tên dự án',
    senderBrandName: systemSettings.senderBrandName || DEFAULT_SYSTEM_SETTINGS.senderBrandName,
    senderPhone: systemSettings.senderPhone || 'Chưa cấu hình',
    senderBankAccount: systemSettings.senderBankAccount || 'Chưa cấu hình',
    items: data.items.length ? data.items : proposal?.items || [{ serviceName: 'Dịch vụ mẫu', quantity: 1, unitPrice: 0 }],
    total: data.total,
    subtotal: data.subtotal,
    discountAmount: data.discountAmount,
    discountPercent: data.discountPercent,
    vatPercent: data.vatPercent,
    vatAmount: data.vatAmount,
    vatEnabled: data.vatEnabled,
    status: proposal?.status || 'Draft',
    createdAt: proposal?.createdAt,
    expiry: expiryInput.value,
    currencyCode: systemSettings.currency,
    serviceTerms,
  };
}

function buildPreviewMarkup(current) {
  return `
    <div class="preview-header">
      <div>
        <p class="eyebrow">${escapeHtml(current.senderBrandName || 'PropFast Studio')}</p>
        <h3>${escapeHtml(current.projectName || 'Tên dự án')}</h3>
      </div>
      <div class="status-pill status-${escapeHtml((current.status || 'draft').toLowerCase())}">${getStatusLabel(current.status)}</div>
    </div>

    <div class="preview-meta-grid">
      <div class="preview-meta-card">
        <span>Người gửi</span>
        <strong>${renderConfigValue(current.senderBrandName, 'Chưa cấu hình')}</strong>
      </div>
      <div class="preview-meta-card">
        <span>Liên hệ</span>
        <strong>${renderConfigValue(current.senderPhone, 'Chưa cấu hình')}</strong>
      </div>
      <div class="preview-meta-card">
        <span>Chuyển khoản</span>
        <strong>${renderConfigValue(current.senderBankAccount, 'Chưa cấu hình')}</strong>
      </div>
      <div class="preview-meta-card">
        <span>Tiền tệ</span>
        <strong>${escapeHtml(current.currencyCode || 'VND')}</strong>
      </div>
    </div>

    <p><strong>Khách hàng:</strong> ${escapeHtml(current.clientName || 'Tên khách hàng')}</p>
    <p><strong>Dự án:</strong> ${escapeHtml(current.projectName || 'Tên dự án')}</p>
    <p><strong>Ngày tạo:</strong> ${current.createdAt ? new Date(current.createdAt).toLocaleDateString('vi-VN') : 'Chưa lưu'}</p>
    <p><strong>Giảm giá:</strong> ${current.discountPercent}% • <strong>VAT:</strong> ${current.vatEnabled ? `${current.vatPercent}%` : 'Tắt'}</p>
    ${current.expiry ? `<p><strong>Hạn chót:</strong> ${new Date(current.expiry).toLocaleDateString('vi-VN')}</p>` : ''}

    <div class="preview-table-wrap">
      <table class="preview-table">
        <thead>
          <tr>
            <th class="preview-service-col">Dịch vụ</th>
            <th class="preview-qty-col">Số lượng</th>
            <th class="preview-number-col">Đơn giá</th>
            <th class="preview-number-col">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${current.items && current.items.length
            ? current.items
                .map(
                  (item) => `
                    <tr>
                      <td class="preview-service-col">${escapeHtml(item.serviceName || '—')}</td>
                      <td class="preview-qty-col">${item.quantity || 0}</td>
                      <td class="preview-number-col">${formatCurrency(item.unitPrice || 0)}</td>
                      <td class="preview-number-col">${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
                    </tr>
                  `
                )
                .join('')
            : '<tr><td colspan="4">Chưa có hạng mục</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="preview-total">
      <span>Tổng cộng</span>
      <span class="preview-total-value">${formatCurrency(current.total || 0)}</span>
    </div>

    <div class="preview-section">
      <p class="preview-section-title">Điều khoản dịch vụ</p>
      <ul class="preview-terms">
        ${current.serviceTerms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
      </ul>
    </div>

    ${current.expiry ? `
      <div class="countdown-card">
        <div class="countdown-title">Hết hạn báo giá</div>
        <div class="countdown-note">Ngày hết hạn: ${new Date(current.expiry).toLocaleDateString('vi-VN')}</div>
      </div>
    ` : ''}
  `;
}

function exportProposalAsPdf() {
  const current = getCurrentPreviewData();
  const printWindow = window.open('', '_blank', 'width=980,height=720');

  if (!printWindow) {
    showToast('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
    return;
  }

  const printMarkup = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(current.projectName || 'Bao gia')} | PDF</title>
        <style>
          :root {
            --ink: #111827;
            --muted: #6b7280;
            --line: #dbe3f0;
            --soft: #f6f9fc;
            --brand: #0f6fff;
          }

          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: var(--ink);
            background: #eef3f8;
            padding: 32px;
          }
          .print-sheet {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
          }
          .print-head {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--line);
          }
          .brand-mark {
            font-size: 13px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--brand);
            font-weight: 700;
            margin: 0 0 12px;
          }
          h1 {
            margin: 0;
            font-size: 30px;
            line-height: 1.2;
          }
          .status-badge {
            white-space: nowrap;
            border-radius: 999px;
            background: #e8f1ff;
            color: var(--brand);
            padding: 8px 14px;
            font-weight: 700;
            font-size: 13px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 24px 0 28px;
          }
          .meta-card {
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px 16px;
            background: var(--soft);
          }
          .meta-card span {
            display: block;
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin: 0 0 24px;
          }
          .summary-card {
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px 16px;
          }
          .summary-card strong {
            display: block;
            font-size: 20px;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          th, td {
            padding: 12px 10px;
            text-align: left;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
          }
          th {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
          }
          .money { text-align: right; }
          .totals {
            width: 320px;
            margin-left: auto;
            margin-top: 24px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 10px 0;
            border-bottom: 1px solid var(--line);
          }
          .total-row.grand {
            font-size: 20px;
            font-weight: 800;
            color: var(--brand);
            border-bottom: none;
            padding-top: 16px;
          }
          .print-note {
            margin-top: 28px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.7;
          }
          @page {
            size: A4;
            margin: 14mm;
          }
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .print-sheet {
              max-width: none;
              border-radius: 0;
              padding: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <main class="print-sheet">
          <section class="print-head">
            <div>
              <p class="brand-mark">${escapeHtml(current.senderBrandName || 'PropFast Studio')}</p>
              <h1>${escapeHtml(current.projectName || 'Tên dự án')}</h1>
            </div>
            <div class="status-badge">${getStatusLabel(current.status)}</div>
          </section>

          <section class="meta-grid">
            <div class="meta-card"><span>Khách hàng</span><strong>${escapeHtml(current.clientName || 'Tên khách hàng')}</strong></div>
            <div class="meta-card"><span>Ngày tạo</span><strong>${current.createdAt ? new Date(current.createdAt).toLocaleDateString('vi-VN') : 'Chưa lưu'}</strong></div>
            <div class="meta-card"><span>Liên hệ</span><strong>${escapeHtml(current.senderPhone || 'Chưa cấu hình')}</strong></div>
            <div class="meta-card"><span>STK ngân hàng</span><strong>${escapeHtml(current.senderBankAccount || 'Chưa cấu hình')}</strong></div>
            <div class="meta-card"><span>Giảm giá</span><strong>${current.discountPercent}%</strong></div>
            <div class="meta-card"><span>VAT</span><strong>${current.vatEnabled ? `${current.vatPercent}%` : 'Không áp dụng'}</strong></div>
            <div class="meta-card"><span>Hạn chót</span><strong>${current.expiry ? new Date(current.expiry).toLocaleDateString('vi-VN') : 'Chưa đặt'}</strong></div>
            <div class="meta-card"><span>Tiền tệ</span><strong>${escapeHtml(current.currencyCode || 'VND')}</strong></div>
          </section>

          <section class="summary-grid">
            <div class="summary-card"><span>Tạm tính</span><strong>${formatCurrency(current.subtotal || 0)}</strong></div>
            <div class="summary-card"><span>Giảm giá</span><strong>${formatCurrency(current.discountAmount || 0)}</strong></div>
            <div class="summary-card"><span>VAT</span><strong>${formatCurrency(current.vatAmount || 0)}</strong></div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Dịch vụ</th>
                <th>Số lượng</th>
                <th class="money">Đơn giá</th>
                <th class="money">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${current.items.map((item) => `
                <tr>
                  <td>${escapeHtml(item.serviceName || '—')}</td>
                  <td>${item.quantity || 0}</td>
                  <td class="money">${formatCurrency(item.unitPrice || 0)}</td>
                  <td class="money">${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <section class="totals">
            <div class="total-row"><span>Tạm tính</span><strong>${formatCurrency(current.subtotal || 0)}</strong></div>
            <div class="total-row"><span>Giảm giá</span><strong>${formatCurrency(current.discountAmount || 0)}</strong></div>
            <div class="total-row"><span>VAT</span><strong>${formatCurrency(current.vatAmount || 0)}</strong></div>
            <div class="total-row grand"><span>Tổng cộng</span><strong>${formatCurrency(current.total || 0)}</strong></div>
          </section>

          <p class="print-note"><strong>Điều khoản dịch vụ:</strong><br />${current.serviceTerms.map((term) => escapeHtml(term)).join('<br />')}</p>
          <p class="print-note">Báo giá này được xuất từ PropFast. Khi hộp thoại in xuất hiện, chọn đích là Save as PDF hoặc Microsoft Print to PDF để lưu thành file PDF.</p>
        </main>
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 180);
          });
          window.addEventListener('afterprint', () => {
            window.close();
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printMarkup);
  printWindow.document.close();
}

function renderPreview() {
  const current = getCurrentPreviewData();
  const markup = buildPreviewMarkup(current);

  if (previewEl) previewEl.innerHTML = markup;
  if (inlinePreviewEl) inlinePreviewEl.innerHTML = markup;

  [previewEl, inlinePreviewEl].forEach((container) => {
    const totalValue = container?.querySelector('.preview-total-value');
    if (!totalValue) return;
    const previous = Number(totalValue.dataset.value || 0);
    animateValue(totalValue, previous, current.total || 0, 280, (value) => formatCurrency(value));
    totalValue.dataset.value = String(current.total || 0);
  });

  updateTermsInPreview();
}

function updateTermsInPreview() {
  const termsMarkup = getServiceTermsLines()
    .map((term) => `<li>${escapeHtml(term)}</li>`)
    .join('');

  [previewEl, inlinePreviewEl].forEach((container) => {
    if (!container) return;
    const termsList = container.querySelector('.preview-terms');
    if (termsList) {
      termsList.innerHTML = termsMarkup;
    }
  });
}

function renderProjectList() {
  if (!projectList) return;
  projectList.innerHTML = sampleProjects
    .map((project) => {
      const isMenuOpen = openProjectMenuId === project.id;
      return `
      <div class="project-item ${project.id === activeProjectId ? 'active' : ''}" data-project-id="${project.id}">
        <button type="button" class="project-open-btn" data-project-open="true">
          <strong>${project.label || 'Dự án mới'}</strong>
          <span>${project.projectName || 'Chưa có tên dự án'}</span>
          <small>${project.clientName || 'Chưa có khách hàng'}</small>
        </button>
        <div class="project-actions">
          <button
            type="button"
            class="project-menu-btn"
            data-project-menu-toggle="true"
            aria-haspopup="menu"
            aria-expanded="${isMenuOpen ? 'true' : 'false'}"
            aria-label="Tùy chọn dự án ${escapeHtml(project.label || 'dự án')}"
          >
            ⋮
          </button>
          <div class="project-menu ${isMenuOpen ? 'show' : ''}" role="menu">
            <button type="button" class="project-menu-item danger" data-project-delete="true" role="menuitem">
              Xóa dự án
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

function createNewProject() {
  const nextIndex = sampleProjects.length + 1;
  const draftProject = {
    id: crypto.randomUUID ? crypto.randomUUID() : `project-${Date.now()}`,
    label: `Dự án mới ${nextIndex}`,
    clientName: '',
    projectName: '',
    discountPercent: systemSettings.defaultDiscountPercent,
    vatEnabled: true,
    cost: 0,
    expiry: '',
    items: [{ serviceName: '', quantity: 1, unitPrice: 0 }],
  };

  sampleProjects.unshift(draftProject);
  loadProject(draftProject.id, { silent: true });
  switchWorkspaceView('clients');
  showToast(`Đã tạo ${draftProject.label}`);
}

function resetEditorForNoProjects() {
  activeProjectId = null;
  activeProposalId = null;
  clientNameInput.value = '';
  projectNameInput.value = '';
  discountInput.value = String(systemSettings.defaultDiscountPercent || 0);
  vatEnabledInput.checked = true;
  costInput.value = '0';
  expiryInput.value = '';
  initItems();
  renderProjectList();
  updateTotals();
  renderPreview();
}

function deleteProject(projectId) {
  const index = sampleProjects.findIndex((project) => project.id === projectId);
  if (index < 0) return;

  const project = sampleProjects[index];
  const shouldDelete = window.confirm(`Bạn có chắc muốn xóa dự án "${project.label}" không?`);
  if (!shouldDelete) return;

  sampleProjects.splice(index, 1);
  openProjectMenuId = null;

  if (!sampleProjects.length) {
    resetEditorForNoProjects();
    showToast(`Đã xóa ${project.label}`);
    return;
  }

  if (activeProjectId === projectId) {
    loadProject(sampleProjects[0].id, { silent: true });
  } else {
    renderProjectList();
  }

  showToast(`Đã xóa ${project.label}`);
}

function getFilteredProposals() {
  if (activeFilter === 'all') return proposals;
  return proposals.filter((proposal) => proposal.status === activeFilter);
}

function updateDashboardSummary(filteredProposals) {
  const allCount = proposals.length;
  const draftCount = proposals.filter((proposal) => proposal.status === 'Draft').length;
  const sentCount = proposals.filter((proposal) => proposal.status === 'Sent').length;
  const approvedCount = proposals.filter((proposal) => proposal.status === 'Approved').length;

  const summaryAll = document.getElementById('summaryAll');
  const summaryDraft = document.getElementById('summaryDraft');
  const summarySent = document.getElementById('summarySent');
  const summaryApproved = document.getElementById('summaryApproved');

  if (summaryAll) summaryAll.textContent = String(allCount);
  if (summaryDraft) summaryDraft.textContent = String(draftCount);
  if (summarySent) summarySent.textContent = String(sentCount);
  if (summaryApproved) summaryApproved.textContent = String(approvedCount);

  if (filteredProposals.length === 0) {
    savedProposalsList.innerHTML = '<div class="saved-item empty-state">Không có báo giá nào phù hợp với bộ lọc này.</div>';
  }
}

function renderDashboard() {
  if (!savedProposalsList) return;
  const filteredProposals = getFilteredProposals();
  updateDashboardSummary(filteredProposals);

  if (!proposals.length) {
    savedProposalsList.innerHTML = '<div class="saved-item empty-state">Chưa có báo giá nào. Hãy tạo một bản đầu tiên.</div>';
    return;
  }

  if (!filteredProposals.length) {
    savedProposalsList.innerHTML = '<div class="saved-item empty-state">Không có báo giá nào phù hợp với bộ lọc này.</div>';
    return;
  }

  const sentProposals = filteredProposals.filter((proposal) => proposal.status === 'Sent');
  const pulseProposalId = sentProposals.length ? sentProposals[0].id : null;

  savedProposalsList.innerHTML = filteredProposals
    .map((proposal) => {
      const statusClass = proposal.status === 'Approved' ? 'status-approved' : proposal.status === 'Sent' ? 'status-sent' : 'status-draft';
      const statusText = proposal.status === 'Approved' ? 'Đã duyệt' : proposal.status === 'Sent' ? 'Đã gửi' : 'Nháp';
      const isWatching = proposal.id === pulseProposalId;
      const sentDisabled = proposal.status === 'Sent' || proposal.status === 'Approved' ? 'disabled' : '';
      const approvedDisabled = proposal.status === 'Approved' ? 'disabled' : '';
      return `
        <div class="saved-item dashboard-row" data-status="${proposal.status}" data-id="${proposal.id}">
          <div class="saved-item-title-row">
            <strong>${proposal.projectName || 'Dự án chưa đặt tên'}</strong>
            ${isWatching ? '<span class="status-pulse-wrap"><span class="status-pulse"></span>Đang xem</span>' : ''}
          </div>
          <span>${proposal.clientName || 'Khách hàng chưa nhập'}</span>
          <small class="status-pill ${statusClass}">${statusText}</small>
          <small>${formatCurrency(proposal.total || 0)}</small>
          <div class="saved-item-actions">
            <button type="button" class="status-action" data-action="sent" ${sentDisabled}>Đánh dấu đã gửi</button>
            <button type="button" class="status-action" data-action="approved" ${approvedDisabled}>Đánh dấu đã duyệt</button>
          </div>
        </div>
      `;
    })
    .join('');

  requestAnimationFrame(() => {
    Array.from(savedProposalsList.querySelectorAll('.dashboard-row')).forEach((row, index) => {
      row.style.transitionDelay = `${index * 40}ms`;
      row.classList.add('is-visible');
    });
  });
}

function applyFilter(filter, options = {}) {
  const { immediate = false } = options;
  activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });

  const currentRows = Array.from(savedProposalsList?.querySelectorAll('.dashboard-row') || []);
  currentRows.forEach((row) => row.classList.add('filtered-out'));

  if (immediate) {
    renderDashboard();
    return;
  }

  setTimeout(() => {
    renderDashboard();
  }, 220);
}

function focusWorkspaceSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  target.classList.remove('panel-focus');
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  requestAnimationFrame(() => target.classList.add('panel-focus'));
  setTimeout(() => target.classList.remove('panel-focus'), 1300);
}

function activateWorkspaceLink(view) {
  workspaceLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.workspaceLink === view);
  });
}

function switchWorkspaceView(view) {
  if (view === 'sent') {
    lastWorkspaceView = 'sent';
    activateWorkspaceLink(view);
    applyFilter('Sent', { immediate: true });
    focusWorkspaceSection('dashboardPanel');
    return;
  }

  if (view === 'cadence') {
    activateWorkspaceLink(view);
    openSettingsModal();
    return;
  }

  lastWorkspaceView = 'clients';
  activateWorkspaceLink(view);

  if (activeFilter !== 'all') {
    applyFilter('all', { immediate: true });
  }

  focusWorkspaceSection('workspaceClients');
}

function loadProject(projectId, options = {}) {
  const { silent = false } = options;
  const project = sampleProjects.find((item) => item.id === projectId);
  if (!project) return;

  openProjectMenuId = null;
  activeProjectId = project.id;
  activeProposalId = null;
  clientNameInput.value = project.clientName;
  projectNameInput.value = project.projectName;
  discountInput.value = project.discountPercent ?? systemSettings.defaultDiscountPercent;
  vatEnabledInput.checked = project.vatEnabled !== false;
  costInput.value = project.cost ?? 0;
  expiryInput.value = project.expiry ?? '';
  itemsContainer.innerHTML = '';
  project.items.forEach((item) => {
    const row = createItemRow(item);
    itemsContainer.appendChild(row);
    requestAnimationFrame(() => row.classList.add('is-visible'));
  });
  renderProjectList();
  updateTotals();
  renderPreview();
  if (!silent) {
    showToast(`Đã tải dữ liệu cho ${project.label}`);
  }
}

function createOrUpdateProposal() {
  const data = collectFormData();
  const clientName = clientNameInput.value.trim();
  const projectName = projectNameInput.value.trim();

  if (!clientName || !projectName) {
    showToast('Vui lòng nhập tên khách hàng và tên dự án.');
    return;
  }

  const payload = {
    id: crypto.randomUUID ? crypto.randomUUID() : `proposal-${Date.now()}`,
    clientName,
    projectName,
    items: data.items,
    total: data.total,
    discountPercent: data.discountPercent,
    vatEnabled: data.vatEnabled,
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  proposals.unshift(payload);
  activeProposalId = payload.id;
  saveProposals();
  renderDashboard();
  renderPreview();
  showToast('✅ Đã lưu báo giá mới vào Dashboard');
}

function updateProposalStatus(id, status) {
  proposals = proposals.map((proposal) => (proposal.id === id ? { ...proposal, status, updatedAt: new Date().toISOString() } : proposal));
  saveProposals();
  renderDashboard();
  renderPreview();
  showToast(status === 'Approved' ? 'Báo giá đã được duyệt' : 'Trạng thái đã cập nhật');
}

function applyTemplate(template) {
  console.log('applyTemplate called', template);
  const templates = {
    web: {
      projectName: 'Website Thương mại Điện tử',
      items: [
        { serviceName: 'Thiết kế Giao diện UI/UX', quantity: 1, unitPrice: 5000000 },
        { serviceName: 'Lập trình Front-end', quantity: 1, unitPrice: 10000000 },
      ],
      toast: '✅ Đã áp dụng mẫu Thiết kế Web',
    },
    marketing: {
      projectName: 'Chiến dịch Marketing',
      items: [{ serviceName: 'Chạy quảng cáo Facebook/Google', quantity: 1, unitPrice: 4000000 }],
      toast: '✅ Đã áp dụng mẫu Marketing',
    },
    photo: {
      projectName: 'Chụp ảnh & Làm album',
      items: [{ serviceName: 'Chụp ảnh & Làm album Kỷ yếu', quantity: 1, unitPrice: 3500000 }],
      toast: '✅ Đã áp dụng mẫu Chụp ảnh',
    },
  };

  const selected = templates[template];
  if (!selected) return;

  projectNameInput.value = selected.projectName;
  itemsContainer.innerHTML = '';
  selected.items.forEach((item) => {
    const row = createItemRow(item);
    itemsContainer.appendChild(row);
    requestAnimationFrame(() => row.classList.add('is-visible'));
  });

  updateTotals();
  renderPreview();
  showToast(selected.toast);
}

function startCountdown() {
  const expiry = expiryInput.value;
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  if (!expiry) return;

  const update = () => {
    const target = new Date(`${expiry}T23:59:59`).getTime();
    const now = Date.now();
    const difference = target - now;

    if (difference <= 0) {
      document.getElementById('countdown-days').textContent = '0';
      document.getElementById('countdown-hours').textContent = '0';
      document.getElementById('countdown-minutes').textContent = '0';
      document.getElementById('countdown-seconds').textContent = '0';
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / (1000 * 60)) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    const dayEl = document.getElementById('countdown-days');
    const hourEl = document.getElementById('countdown-hours');
    const minuteEl = document.getElementById('countdown-minutes');
    const secondEl = document.getElementById('countdown-seconds');

    if (dayEl) dayEl.textContent = days;
    if (hourEl) hourEl.textContent = hours;
    if (minuteEl) minuteEl.textContent = minutes;
    if (secondEl) secondEl.textContent = seconds;
  };

  update();
  countdownIntervalId = setInterval(update, 1000);
}

function bindEvents() {
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      createOrUpdateProposal();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', createOrUpdateProposal);
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => addItemRow());
  }

  const templateBar = document.querySelector('.template-buttons');
  if (templateBar) {
    templateBar.addEventListener('click', (event) => {
      const button = event.target.closest('.template-btn');
      if (!button) return;
      applyTemplate(button.dataset.template);
    });
  }

  [clientNameInput, projectNameInput, discountInput, vatEnabledInput, expiryInput, costInput].forEach((input) => {
    input.addEventListener('input', () => {
      renderPreview();
      startCountdown();
    });
    input.addEventListener('change', () => {
      renderPreview();
      startCountdown();
    });
  });

  if (projectList) {
    projectList.addEventListener('click', (event) => {
      const menuToggleButton = event.target.closest('[data-project-menu-toggle="true"]');
      if (menuToggleButton) {
        const card = menuToggleButton.closest('.project-item');
        if (!card?.dataset.projectId) return;
        openProjectMenuId = openProjectMenuId === card.dataset.projectId ? null : card.dataset.projectId;
        renderProjectList();
        return;
      }

      const deleteButton = event.target.closest('[data-project-delete="true"]');
      if (deleteButton) {
        const card = deleteButton.closest('.project-item');
        if (!card?.dataset.projectId) return;
        deleteProject(card.dataset.projectId);
        return;
      }

      const openButton = event.target.closest('[data-project-open="true"]');
      if (!openButton) return;
      const card = openButton.closest('.project-item');
      if (!card?.dataset.projectId) return;
      loadProject(card.dataset.projectId);
    });
  }

  document.addEventListener('click', (event) => {
    if (!openProjectMenuId) return;
    if (event.target.closest('.project-actions')) return;
    openProjectMenuId = null;
    renderProjectList();
  });

  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', createNewProject);
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const link = activeProposalId ? `https://propfast.local/proposal/${activeProposalId}` : 'https://propfast.local/proposal/demo';
      try {
        const copied = await copyTextToClipboard(link);
        if (copied) {
          showToast('🔗 Đã sao chép đường link báo giá vào bộ nhớ tạm!');
          return;
        }
        showToast('⚠️ Không thể sao chép tự động. Vui lòng sao chép thủ công.');
      } catch (error) {
        console.error('Không thể sao chép link báo giá:', error);
        showToast('⚠️ Không thể sao chép tự động. Vui lòng sao chép thủ công.');
      }
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportProposalAsPdf();
      showToast('📄 Đã mở bản in báo giá. Chọn Save as PDF để lưu file.');
    });
  }

  document.querySelectorAll('.filter-chip').forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.filter));
  });

  workspaceLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      switchWorkspaceView(link.dataset.workspaceLink);
    });
  });

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }

  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
  }

  if (settingsCurrencyInput) {
    settingsCurrencyInput.addEventListener('change', scheduleRefreshSettingsDirtyState);
  }

  if (settingsLightModeInput) {
    settingsLightModeInput.addEventListener('change', () => {
      document.body.classList.toggle('light-theme', settingsLightModeInput.checked);
      scheduleRefreshSettingsDirtyState();
    });
  }

  if (settingsDialog) {
    settingsDialog.addEventListener('input', scheduleRefreshSettingsDirtyState);
    settingsDialog.addEventListener('change', scheduleRefreshSettingsDirtyState);
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-settings="true"]')) {
        closeSettingsModal();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (!settingsModal?.classList.contains('show-modal')) return;
    if (event.key === 'Escape') {
      closeSettingsModal();
      return;
    }
    trapSettingsModalFocus(event);
  });

  if (savedProposalsList) {
    savedProposalsList.addEventListener('click', (event) => {
      const statusButton = event.target.closest('.status-action');
      if (statusButton) {
        const row = statusButton.closest('.saved-item');
        if (!row || !row.dataset.id) return;
        const nextStatus = statusButton.dataset.action === 'approved' ? 'Approved' : 'Sent';
        updateProposalStatus(row.dataset.id, nextStatus);
        return;
      }

      const item = event.target.closest('.saved-item');
      if (!item) return;
      const proposal = proposals.find((entry) => entry.id === item.dataset.id);
      if (proposal) {
        activeProposalId = proposal.id;
        renderPreview();
        showToast(`Đã mở ${proposal.projectName}`);
      }
    });
  }
}

function init() {
  window.__appInitialized = true;
  bindEvents();
  applySystemSettingsToUi({ applyDiscountDefault: true });
  applyLightModeState();
  renderProjectList();
  initItems();
  updateTotals();
  renderDashboard();
  renderPreview();
  updateTermsInPreview();
  loadProject(sampleProjects[0].id);
  startCountdown();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ============================================================
   CONSULTATION FORM — Formspree Integration
   ============================================================
   Hướng dẫn thiết lập:
   1. Đăng ký tại https://formspree.io (miễn phí)
   2. Tạo form mới → lấy endpoint dạng: https://formspree.io/f/xxxxxxxx
   3. Thay chuỗi 'YOUR_FORMSPREE_ID' bên dưới bằng ID thực của bạn
   ============================================================ */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORMSPREE_ID';

const consultFab       = document.getElementById('consultFab');
const consultModal     = document.getElementById('consult-modal');
const closeConsultBtn  = document.getElementById('closeConsultBtn');
const consultBackdrop  = document.getElementById('consultBackdrop');
const consultForm      = document.getElementById('consultForm');
const consultSubmitBtn = document.getElementById('consultSubmitBtn');
const consultResultEl  = document.getElementById('consultResult');

function openConsultModal() {
  if (!consultModal) return;
  consultModal.classList.add('show-modal');
  consultModal.setAttribute('aria-hidden', 'false');
  const dialog = consultModal.querySelector('.consult-dialog');
  if (dialog) dialog.focus();
}

function closeConsultModal() {
  if (!consultModal) return;
  consultModal.classList.remove('show-modal');
  consultModal.setAttribute('aria-hidden', 'true');
  if (consultResultEl) {
    consultResultEl.textContent = '';
    consultResultEl.className = 'consult-result';
  }
}

function setConsultFieldError(inputEl, errorEl, message) {
  if (errorEl) errorEl.textContent = message;
  if (inputEl) inputEl.style.borderColor = message ? 'var(--danger)' : '';
}

function validateConsultForm() {
  const nameEl  = document.getElementById('consultName');
  const phoneEl = document.getElementById('consultPhone');
  const needEl  = document.getElementById('consultNeed');
  const VN_PHONE_RE = /^(0[35789]\d{8})$/;

  let valid = true;

  const nameVal = nameEl ? nameEl.value.trim() : '';
  if (!nameVal) {
    setConsultFieldError(nameEl, document.getElementById('consultNameErr'), 'Vui lòng nhập họ tên');
    valid = false;
  } else if (nameVal.length < 2) {
    setConsultFieldError(nameEl, document.getElementById('consultNameErr'), 'Họ tên cần ít nhất 2 ký tự');
    valid = false;
  } else {
    setConsultFieldError(nameEl, document.getElementById('consultNameErr'), '');
  }

  const phoneVal = phoneEl ? phoneEl.value.replace(/\s/g, '') : '';
  if (!phoneVal) {
    setConsultFieldError(phoneEl, document.getElementById('consultPhoneErr'), 'Vui lòng nhập số điện thoại');
    valid = false;
  } else if (!VN_PHONE_RE.test(phoneVal)) {
    setConsultFieldError(phoneEl, document.getElementById('consultPhoneErr'), 'Số điện thoại không hợp lệ (VD: 0901234567)');
    valid = false;
  } else {
    setConsultFieldError(phoneEl, document.getElementById('consultPhoneErr'), '');
  }

  const needVal = needEl ? needEl.value : '';
  if (!needVal) {
    setConsultFieldError(needEl, document.getElementById('consultNeedErr'), 'Vui lòng chọn nhu cầu');
    valid = false;
  } else {
    setConsultFieldError(needEl, document.getElementById('consultNeedErr'), '');
  }

  return valid;
}

async function handleConsultSubmit(event) {
  event.preventDefault();
  if (!validateConsultForm()) return;

  const nameVal = document.getElementById('consultName').value.trim();
  const originalLabel = consultSubmitBtn.textContent;

  consultSubmitBtn.textContent = '⏳ Đang gửi...';
  consultSubmitBtn.disabled = true;
  consultResultEl.textContent = '';
  consultResultEl.className = 'consult-result';

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body: new FormData(consultForm),
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      consultResultEl.textContent = `✅ Cảm ơn ${nameVal}! Chúng tôi sẽ gọi cho bạn trong 30 phút.`;
      consultResultEl.className = 'consult-result success';
      consultForm.reset();
      showToast(`📞 Lead mới: ${nameVal} vừa đăng ký tư vấn!`);
      setTimeout(closeConsultModal, 3400);
    } else {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'server_error');
    }
  } catch {
    consultResultEl.textContent = '❌ Có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline trực tiếp.';
    consultResultEl.className = 'consult-result error';
  } finally {
    consultSubmitBtn.textContent = originalLabel;
    consultSubmitBtn.disabled = false;
  }
}

// --- Bind events ---
if (consultFab) {
  consultFab.addEventListener('click', openConsultModal);
}
if (closeConsultBtn) {
  closeConsultBtn.addEventListener('click', closeConsultModal);
}
if (consultBackdrop) {
  consultBackdrop.addEventListener('click', closeConsultModal);
}
if (consultForm) {
  consultForm.addEventListener('submit', handleConsultSubmit);

  // Xóa lỗi ngay khi user bắt đầu nhập lại
  consultForm.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('input', () => {
      el.style.borderColor = '';
      const errEl = document.getElementById(el.id + 'Err');
      if (errEl) errEl.textContent = '';
    });
  });
}

// Đóng modal bằng phím ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && consultModal && consultModal.classList.contains('show-modal')) {
    closeConsultModal();
  }
});

/* ============================================================
   MODULE 1 — FINANCE CALCULATOR
   Cong thuc PMT: M = P x [r(1+r)^n] / [(1+r)^n - 1]
   P = tien vay, r = lai thang, n = so thang
   ============================================================ */
(function initFinanceCalc() {
  const modal        = document.getElementById('finance-modal');
  const openBtn      = document.getElementById('openFinanceBtn');
  const closeBtn     = document.getElementById('closeFinanceBtn');
  const backdrop     = document.getElementById('financeBackdrop');
  const homePriceEl  = document.getElementById('financeHomePrice');
  const loanRatioEl  = document.getElementById('financeLoanRatio');
  const loanRatioVal = document.getElementById('financeLoanRatioVal');
  const yearsEl      = document.getElementById('financeYears');
  const rateEl       = document.getElementById('financeRate');
  const priceHint    = document.getElementById('financePriceHint');

  const monthlyEl       = document.getElementById('financeMonthly');
  const principalEl     = document.getElementById('financePrincipal');
  const totalInterestEl = document.getElementById('financeTotalInterest');
  const totalPaymentEl  = document.getElementById('financeTotalPayment');
  const pctPrincipalEl  = document.getElementById('financePctPrincipal');
  const pctInterestEl   = document.getElementById('financePctInterest');
  const donutP          = document.getElementById('financeDonutPrincipal');
  const donutI          = document.getElementById('financeDonutInterest');
  const tableBody       = document.getElementById('financeTableBody');
  const expandBtn       = document.getElementById('financeExpandBtn');
  const exportBtn       = document.getElementById('financeExportBtn');

  if (!modal) return;

  // Donut SVG circumference: 2 * pi * r = 2 * pi * 48
  const CIRC = 2 * Math.PI * 48; // ~= 301.59

  let currentSchedule = [];
  let showAll = false;
  let animFrameId = null;

  /* --- Format helpers --- */
  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' ty';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.?0+$/, '') + ' trieu';
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' d';
  }

  function fmtCurrency(n) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' d';
  }

  /* --- PMT formula --- */
  function calcPMT(P, annualRate, years) {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    if (r === 0) return P / n;
    const factor = Math.pow(1 + r, n);
    return P * (r * factor) / (factor - 1);
  }

  /* --- Build amortization schedule --- */
  function buildSchedule(P, annualRate, years) {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    const M = calcPMT(P, annualRate, years);
    const rows = [];
    let balance = P;
    for (let month = 1; month <= n; month++) {
      const interest = balance * r;
      const principal = M - interest;
      balance = Math.max(0, balance - principal);
      rows.push({ month, payment: M, principal, interest, balance });
    }
    return rows;
  }

  /* --- Animate counter --- */
  function animateValue(el, target) {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    const start = performance.now();
    const duration = 600;
    const from = 0;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = fmtCurrency(from + (target - from) * eased);
      if (progress < 1) animFrameId = requestAnimationFrame(step);
    }
    animFrameId = requestAnimationFrame(step);
  }

  /* --- Render donut chart --- */
  function renderDonut(principalTotal, interestTotal) {
    const total = principalTotal + interestTotal;
    if (total === 0) return;
    const pArc = (principalTotal / total) * CIRC;
    const iArc = (interestTotal / total) * CIRC;
    donutP.setAttribute('stroke-dasharray', `${pArc} ${CIRC}`);
    donutP.setAttribute('stroke-dashoffset', '0');
    donutI.setAttribute('stroke-dasharray', `${iArc} ${CIRC}`);
    donutI.setAttribute('stroke-dashoffset', `${-pArc}`);
  }

  /* --- Render table rows --- */
  function renderTable(schedule, limit) {
    const today = new Date();
    tableBody.innerHTML = '';
    const rows = limit ? schedule.slice(0, limit) : schedule;
    rows.forEach(row => {
      const tr = document.createElement('tr');
      if (row.month === (today.getMonth() + 1)) tr.classList.add('current-month');
      tr.innerHTML = `
        <td>Thang ${row.month}</td>
        <td>${fmtCurrency(row.payment)}</td>
        <td style="color:var(--primary)">${fmtCurrency(row.principal)}</td>
        <td style="color:var(--danger)">${fmtCurrency(row.interest)}</td>
        <td>${fmtCurrency(row.balance)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /* --- Export CSV --- */
  function exportCSV(schedule) {
    const header = 'Thang,Tra moi thang (VND),Tien goc (VND),Tien lai (VND),Du no con lai (VND)';
    const rows = schedule.map(r =>
      `${r.month},${Math.round(r.payment)},${Math.round(r.principal)},${Math.round(r.interest)},${Math.round(r.balance)}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lich-tra-no-propfast.csv';
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('Đã xuất file CSV lịch trả nợ!');
  }

  /* --- Main calculate --- */
  let calcTimer = null;
  function calculate() {
    clearTimeout(calcTimer);
    calcTimer = setTimeout(() => {
      const homePrice  = parseFloat(homePriceEl.value) || 0;
      const loanRatio  = parseFloat(loanRatioEl.value) / 100;
      const years      = parseInt(yearsEl.value);
      const annualRate = parseFloat(rateEl.value) || 0;
      const P = homePrice * loanRatio;

      if (P <= 0 || annualRate <= 0 || years <= 0) return;

      const M = calcPMT(P, annualRate, years);
      const n = years * 12;
      const totalPayment = M * n;
      const totalInterest = totalPayment - P;

      if (priceHint) priceHint.textContent = fmt(homePrice);

      animateValue(monthlyEl, M);

      principalEl.textContent = fmtCurrency(P);
      totalInterestEl.textContent = fmtCurrency(totalInterest);
      totalPaymentEl.textContent = fmtCurrency(totalPayment);

      const pPct = Math.round((P / totalPayment) * 100);
      const iPct = 100 - pPct;
      pctPrincipalEl.textContent = pPct + '%';
      pctInterestEl.textContent = iPct + '%';

      renderDonut(P, totalInterest);

      currentSchedule = buildSchedule(P, annualRate, years);
      renderTable(currentSchedule, showAll ? null : 12);
    }, 300);
  }

  /* --- Event bindings --- */
  function openModal() {
    modal.classList.add('show-modal');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.settings-dialog').focus();
    calculate();
  }

  function closeModal() {
    modal.classList.remove('show-modal');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  loanRatioEl.addEventListener('input', () => {
    loanRatioVal.textContent = loanRatioEl.value;
    calculate();
  });

  [homePriceEl, rateEl, yearsEl].forEach(el => {
    if (el) el.addEventListener('input', calculate);
  });

  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      showAll = !showAll;
      expandBtn.textContent = showAll ? 'Thu gon' : 'Xem toan bo';
      renderTable(currentSchedule, showAll ? null : 12);
    });
  }

  if (exportBtn) exportBtn.addEventListener('click', () => exportCSV(currentSchedule));

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('show-modal')) closeModal();
  });
}());

/* ============================================================
   MODULE 3 — PROPERTY PRICE PREDICTOR
   Su dung OLS (Ordinary Least Squares) regression:
   beta = (XtX)^-1 Xty
   ============================================================ */
(function initPricePredictor() {
  const modal       = document.getElementById('predict-modal');
  const openBtn     = document.getElementById('openPredictBtn');
  const closeBtn    = document.getElementById('closePredictBtn');
  const backdrop    = document.getElementById('predictBackdrop');
  const areaEl      = document.getElementById('predictArea');
  const areaVal     = document.getElementById('predictAreaVal');
  const districtEl  = document.getElementById('predictDistrict');
  const floorEl     = document.getElementById('predictFloor');
  const floorVal    = document.getElementById('predictFloorVal');
  const priceEl     = document.getElementById('predictPrice');
  const rangeEl     = document.getElementById('predictRange');
  const r2LabelEl   = document.getElementById('predictR2Label');
  const confBarEl   = document.getElementById('predictConfBar');
  const similarEl   = document.getElementById('predictSimilar');

  if (!modal) return;

  /* -------- Training dataset: thi truong TP.HCM ----------
     Moi dong: [dientich_m2, phong_ngu, district_score(1-10), tang, gia_ty]
  ------------------------------------------------------- */
  const DATASET = [
    [45,  1, 10, 5,  3.2,  'Quan 1'],
    [65,  2, 10, 8,  5.8,  'Quan 1'],
    [90,  2, 10, 12, 8.9,  'Quan 1'],
    [120, 3, 10, 20, 14.5, 'Quan 1'],
    [55,  2,  9, 4,  4.8,  'Quan 2'],
    [80,  2,  9, 6,  7.2,  'Quan 2'],
    [100, 3,  9, 10, 10.0, 'Quan 2'],
    [130, 4,  9, 15, 13.5, 'Quan 2'],
    [180, 5,  9, 22, 19.0, 'Quan 2'],
    [55,  2,  8, 4,  4.1,  'Quan 3'],
    [75,  2,  8, 6,  5.9,  'Quan 3'],
    [90,  3,  8, 9,  7.8,  'Quan 3'],
    [40,  1,  6, 2,  1.8,  'Quan 4'],
    [60,  2,  6, 3,  2.9,  'Quan 4'],
    [95,  3,  8, 5,  6.5,  'Quan 7'],
    [130, 4,  8, 10, 9.8,  'Quan 7'],
    [150, 4,  8, 15, 12.3, 'Quan 7'],
    [50,  1,  5, 3,  1.6,  'Quan 9'],
    [70,  2,  5, 5,  2.4,  'Quan 9'],
    [100, 3,  5, 7,  3.9,  'Quan 9'],
    [55,  2,  6, 2,  2.1,  'Quan 10'],
    [80,  2,  7, 4,  3.8,  'Binh Thanh'],
    [110, 3,  7, 8,  6.2,  'Binh Thanh'],
    [35,  1,  7, 1,  1.5,  'Binh Thanh'],
    [65,  2,  6, 3,  2.7,  'Tan Binh'],
    [90,  3,  6, 5,  4.1,  'Tan Binh'],
    [70,  2,  5, 4,  2.2,  'Thu Duc'],
    [100, 3,  5, 6,  3.5,  'Thu Duc'],
    [200, 5, 10, 28, 22.0, 'Quan 1'],
    [160, 4,  9, 18, 16.5, 'Quan 2'],
  ];

  /* -------- Matrix operations (pure JS) ---------- */

  function matT(A) {
    return A[0].map((_, j) => A.map(r => r[j]));
  }

  function matMul(A, B) {
    const m = A.length, k = B.length, n = B[0].length;
    return Array.from({length: m}, (_, i) =>
      Array.from({length: n}, (_, j) =>
        A[i].reduce((s, _, p) => s + A[i][p] * B[p][j], 0)
      )
    );
  }

  function matInv(A) {
    const n = A.length;
    const M = A.map((row, i) => [
      ...row.map(v => v),
      ...Array.from({length: n}, (_, j) => i === j ? 1 : 0),
    ]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const p = M[col][col];
      if (Math.abs(p) < 1e-12) throw new Error('Singular matrix');
      for (let j = 0; j < 2 * n; j++) M[col][j] /= p;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
      }
    }
    return M.map(row => row.slice(n));
  }

  function fitOLS(X, y) {
    const Xt   = matT(X);
    const XtX  = matMul(Xt, X);
    const XtXi = matInv(XtX);
    const Xty  = matMul(Xt, y.map(v => [v]));
    return matMul(XtXi, Xty).map(b => b[0]);
  }

  function calcR2(y, yPred) {
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    const ssTot = y.reduce((s, v) => s + (v - mean) ** 2, 0);
    const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
    return Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  }

  /* -------- Feature normalization (Min-Max) ---------- */
  const features = DATASET.map(d => [d[0], d[1], d[2], d[3]]);
  const prices   = DATASET.map(d => d[4]);

  const mins = [0, 1, 2, 3].map(i => Math.min(...features.map(f => f[i])));
  const maxs = [0, 1, 2, 3].map(i => Math.max(...features.map(f => f[i])));

  function normalize(vals) {
    return vals.map((v, i) => (maxs[i] - mins[i]) === 0 ? 0 : (v - mins[i]) / (maxs[i] - mins[i]));
  }

  const X = features.map(f => [1, ...normalize(f)]);
  const beta = fitOLS(X, prices);

  const yPred = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const r2 = calcR2(prices, yPred);

  const residuals = prices.map((y, i) => y - yPred[i]);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const mse = sse / (prices.length - beta.length);
  const rmse = Math.sqrt(mse);

  /* -------- Predict price ---------- */
  function predict(area, bed, distScore, floor) {
    const normRow = [1, ...normalize([area, bed, distScore, floor])];
    return normRow.reduce((s, v, i) => s + v * beta[i], 0);
  }

  /* -------- Find k nearest listings (Euclidean distance) ---------- */
  function findSimilar(area, bed, distScore, floor, k) {
    k = k || 3;
    const queryNorm = normalize([area, bed, distScore, floor]);
    return DATASET
      .map((d, idx) => {
        const dNorm = normalize([d[0], d[1], d[2], d[3]]);
        const dist = Math.sqrt(dNorm.reduce((s, v, i) => s + (v - queryNorm[i]) ** 2, 0));
        return { idx, dist, data: d };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
  }

  /* -------- Render results ---------- */
  function renderResults() {
    const area      = parseFloat(areaEl.value)      || 80;
    const bed       = parseInt(document.querySelector('input[name="predictBed"]:checked') ? document.querySelector('input[name="predictBed"]:checked').value : 2);
    const distScore = parseFloat(districtEl.value)  || 7;
    const floor     = parseFloat(floorEl.value)     || 5;

    const priceTy = predict(area, bed, distScore, floor);
    const low  = Math.max(0.5, priceTy - 1.96 * rmse);
    const high = priceTy + 1.96 * rmse;

    if (priceEl) priceEl.textContent = priceTy.toFixed(2).replace('.', ',') + ' ty d';
    if (rangeEl) rangeEl.textContent = 'Khoang tin cay 95%: ' + low.toFixed(1) + ' - ' + high.toFixed(1) + ' ty d';

    const r2Pct = Math.round(r2 * 100);
    if (r2LabelEl) r2LabelEl.textContent = r2Pct + '%';
    if (confBarEl) {
      confBarEl.style.width = r2Pct + '%';
      confBarEl.style.background = r2Pct >= 80 ? 'var(--success)' : r2Pct >= 60 ? 'var(--warning)' : 'var(--danger)';
    }

    if (similarEl) {
      const similar = findSimilar(area, bed, distScore, floor);
      similarEl.innerHTML = similar.map(function(item) {
        const data = item.data;
        return '<div class="predict-similar-card"><span class="p-price">' + data[4].toFixed(1) + ' ty d</span><span class="p-detail">' + data[0] + 'm2 ' + data[1] + ' PN ' + data[5] + '</span></div>';
      }).join('');
    }
  }

  /* -------- Event bindings ---------- */
  function openModal() {
    modal.classList.add('show-modal');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.settings-dialog').focus();
    renderResults();
  }

  function closeModal() {
    modal.classList.remove('show-modal');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  areaEl.addEventListener('input', function() { areaVal.textContent = areaEl.value; renderResults(); });
  floorEl.addEventListener('input', function() { floorVal.textContent = floorEl.value; renderResults(); });
  districtEl.addEventListener('change', renderResults);
  document.querySelectorAll('input[name="predictBed"]').forEach(function(r) { r.addEventListener('change', renderResults); });

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('show-modal')) closeModal();
  });
}());

/* ============================================================
   MODULE 2 — AI CHATBOT (Moi Gioi Ao 24/7)
   Ho tro OpenAI GPT va Google Gemini API
   ============================================================ */
(function initChatbot() {
  /* --- Cau hinh ---
     Thay YOUR_OPENAI_KEY hoac YOUR_GEMINI_KEY bang API key thuc.
     Dat provider = 'openai' hoac 'gemini'.
  ---------------------------------------------------------------- */
  const CHATBOT_CONFIG = {
    provider: 'openai',
    openaiApiKey: 'YOUR_OPENAI_KEY',
    geminiApiKey: 'YOUR_GEMINI_KEY',
    model: 'gpt-4o-mini',
    geminiModel: 'gemini-1.5-flash',
    systemPrompt: 'Ban la PropFast AI — tro ly moi gioi bat dong san chuyen nghiep tai Viet Nam. Nhiem vu: tu van mua/thue nha, giai thich thu tuc phap ly (so do, so hong, hop dong mua ban), goi y du an phu hop tui tien, tinh toan kha nang vay von ngan hang. Phong cach: than thien, ngan gon, dung so lieu cu the khi duoc hoi ve gia. Tra loi bang tieng Viet. Giu cau tra loi duoi 150 tu tru khi can giai thich chi tiet.',
  };

  const STORAGE_KEY_CHAT = 'propfast-chatbot-history';
  const MAX_HISTORY = 20;

  const widget       = document.getElementById('chatbot-widget');
  const toggleBtn    = document.getElementById('chatbotToggle');
  const window_      = document.getElementById('chatbotWindow');
  const messagesEl   = document.getElementById('chatbotMessages');
  const form         = document.getElementById('chatbotForm');
  const input        = document.getElementById('chatbotInput');
  const clearBtn     = document.getElementById('chatbotClearBtn');
  const closeBtn     = document.getElementById('chatbotCloseBtn');
  const badge        = document.getElementById('chatbotBadge');
  const quickReplies = document.getElementById('chatbotQuickReplies');

  if (!widget) return;

  let isOpen = false;
  let isThinking = false;

  let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');

  /* --- Helpers --- */
  function formatTime(date) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    requestAnimationFrame(function() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function saveChatHistory() {
    const trimmed = chatHistory.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(trimmed));
  }

  /* --- Render a single message bubble --- */
  function appendMessage(role, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'chatbot-msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-msg-bubble';
    bubble.textContent = text;
    const time = document.createElement('span');
    time.className = 'chatbot-msg-time';
    time.textContent = formatTime(new Date());
    msgEl.appendChild(bubble);
    msgEl.appendChild(time);
    messagesEl.appendChild(msgEl);
    scrollToBottom();
    return msgEl;
  }

  /* --- Typing indicator --- */
  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'chatbot-msg bot chatbot-typing';
    typingEl.id = 'chatbotTyping';
    typingEl.innerHTML = '<div class="chatbot-msg-bubble"><span class="chatbot-dot"></span><span class="chatbot-dot"></span><span class="chatbot-dot"></span></div>';
    messagesEl.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('chatbotTyping');
    if (el) el.remove();
  }

  /* --- Initial render from history --- */
  function renderHistory() {
    messagesEl.innerHTML = '';
    if (chatHistory.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'chatbot-msg bot';
      welcome.innerHTML = '<div class="chatbot-msg-bubble">Xin chao! Toi la PropFast AI<br>Toi co the giup ban tu van mua/thue nha, tinh lai suat vay, va giai dap thac mac ve thu tuc phap ly bat dong san.<br><br>Ban can tu van gi hom nay?</div><span class="chatbot-msg-time">' + formatTime(new Date()) + '</span>';
      messagesEl.appendChild(welcome);
    } else {
      chatHistory.forEach(function(msg) { appendMessage(msg.role, msg.content); });
    }
    checkApiKeyWarning();
  }

  /* --- Check API key --- */
  function checkApiKeyWarning() {
    const existing = document.getElementById('chatbotApiWarning');
    if (existing) existing.remove();

    const key = CHATBOT_CONFIG.provider === 'openai'
      ? CHATBOT_CONFIG.openaiApiKey
      : CHATBOT_CONFIG.geminiApiKey;

    if (key.startsWith('YOUR_')) {
      const warn = document.createElement('div');
      warn.id = 'chatbotApiWarning';
      warn.className = 'chatbot-api-warning';
      warn.innerHTML = 'Chua cai API key. Mo app.js, tim CHATBOT_CONFIG va thay YOUR_OPENAI_KEY bang key thuc. Lay key mien phi tai platform.openai.com.';
      messagesEl.insertBefore(warn, messagesEl.firstChild);
    }
  }

  /* --- Call OpenAI --- */
  async function callOpenAI(messages) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CHATBOT_CONFIG.openaiApiKey,
      },
      body: JSON.stringify({
        model: CHATBOT_CONFIG.model,
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(function() { return {}; });
      throw new Error((err.error && err.error.message) || ('HTTP ' + res.status));
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  }

  /* --- Call Gemini --- */
  async function callGemini(messages) {
    const contents = messages
      .filter(function(m) { return m.role !== 'system'; })
      .map(function(m) {
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        };
      });

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + CHATBOT_CONFIG.geminiModel + ':generateContent?key=' + CHATBOT_CONFIG.geminiApiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: CHATBOT_CONFIG.systemPrompt }] },
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      }
    );
    if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  /* --- Send message to AI --- */
  async function sendMessage(userText) {
    if (!userText.trim() || isThinking) return;

    const key = CHATBOT_CONFIG.provider === 'openai'
      ? CHATBOT_CONFIG.openaiApiKey
      : CHATBOT_CONFIG.geminiApiKey;

    if (key.startsWith('YOUR_')) {
      appendMessage('bot', 'Vui long cai API key vao CHATBOT_CONFIG trong app.js de su dung chatbot.');
      return;
    }

    isThinking = true;
    input.disabled = true;

    if (quickReplies) quickReplies.style.display = 'none';

    chatHistory.push({ role: 'user', content: userText });
    appendMessage('user', userText);
    saveChatHistory();

    showTyping();

    const messages = [
      { role: 'system', content: CHATBOT_CONFIG.systemPrompt },
    ].concat(chatHistory.slice(-10));

    let reply = '';
    let attempts = 0;
    while (attempts < 2) {
      try {
        reply = CHATBOT_CONFIG.provider === 'gemini'
          ? await callGemini(messages)
          : await callOpenAI(messages);
        break;
      } catch (err) {
        attempts++;
        if (attempts < 2) {
          await new Promise(function(r) { setTimeout(r, 3000); });
        } else {
          reply = 'Dang bao tri, vui long thu lai sau. Hoac goi hotline de duoc ho tro truc tiep.';
        }
      }
    }

    hideTyping();
    chatHistory.push({ role: 'assistant', content: reply });
    appendMessage('bot', reply);
    saveChatHistory();

    isThinking = false;
    input.disabled = false;
    input.focus();
  }

  /* --- Event bindings --- */
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      isOpen = !isOpen;
      window_.classList.toggle('open', isOpen);
      window_.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        badge.hidden = true;
        if (input) input.focus();
        renderHistory();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', function() {
    isOpen = false;
    window_.classList.remove('open');
    window_.setAttribute('aria-hidden', 'true');
  });

  if (clearBtn) clearBtn.addEventListener('click', function() {
    chatHistory = [];
    saveChatHistory();
    renderHistory();
    if (quickReplies) quickReplies.style.display = '';
    if (typeof showToast === 'function') showToast('Da xoa lich su chat');
  });

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const text = input.value.trim();
      input.value = '';
      sendMessage(text);
    });
  }

  document.querySelectorAll('.chatbot-quick-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      sendMessage(btn.dataset.q);
    });
  });

  if (!isOpen) {
    setTimeout(function() {
      if (!isOpen && badge) badge.hidden = false;
    }, 4000);
  }
}());
