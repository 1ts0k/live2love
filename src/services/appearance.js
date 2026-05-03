export const USER_FONT_FAMILY = 'L2L User Font';
export const CUSTOM_FONT_MAX_BYTES = 20 * 1024 * 1024;
export const CUSTOM_FONT_WARN_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'];
export const SUPPORTED_FONT_ACCEPT = '.woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf';

export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "PingFang TC", "PingFang HK", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif';

export const DEFAULT_APPEARANCE_SETTINGS = {
  fontMode: 'system',
  customFontName: '',
};

let activeFontUrl = '';
let activeFontFace = null;
let fallbackStyleElement = null;

export function normalizeAppearanceSettings(settings) {
  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...(settings ?? {}),
  };
}

export function normalizeCustomFont(fontRecord) {
  if (!fontRecord?.blob) return null;

  return {
    name: fontRecord.name || fontRecord.fileName || '自定义字体',
    fileName: fontRecord.fileName || fontRecord.name || 'custom-font',
    type: fontRecord.type || 'font/ttf',
    size: Number(fontRecord.size) || fontRecord.blob.size || 0,
    updatedAt: fontRecord.updatedAt || new Date().toISOString(),
    blob: fontRecord.blob,
  };
}

export function formatFileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function validateFontFile(file) {
  if (!file) return { ok: false, message: '请选择一个字体文件。' };

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SUPPORTED_FONT_EXTENSIONS.includes(extension)) {
    return { ok: false, message: '只支持 WOFF2、WOFF、TTF 或 OTF 字体。' };
  }

  if (file.size > CUSTOM_FONT_MAX_BYTES) {
    return {
      ok: false,
      message: `字体不能超过 ${formatFileSize(CUSTOM_FONT_MAX_BYTES)}。`,
    };
  }

  return {
    ok: true,
    warning:
      file.size > CUSTOM_FONT_WARN_BYTES
        ? `这个字体有 ${formatFileSize(file.size)}，可以使用，但 WOFF2 会更省空间。`
        : '',
  };
}

export function createCustomFontRecord(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'ttf';
  const fallbackType =
    extension === 'woff2' ? 'font/woff2' : extension === 'woff' ? 'font/woff' : `font/${extension}`;
  const name = file.name.replace(/\.[^.]+$/, '').trim() || '自定义字体';

  return {
    name,
    fileName: file.name,
    type: file.type || fallbackType,
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file.slice(0, file.size, file.type || fallbackType),
  };
}

function clearActiveFont() {
  if (activeFontFace && typeof document !== 'undefined' && document.fonts?.delete) {
    document.fonts.delete(activeFontFace);
  }

  activeFontFace = null;

  if (fallbackStyleElement) {
    fallbackStyleElement.remove();
    fallbackStyleElement = null;
  }

  if (activeFontUrl) {
    URL.revokeObjectURL(activeFontUrl);
    activeFontUrl = '';
  }
}

export function applySystemFont() {
  clearActiveFont();
  document.documentElement.style.removeProperty('--l2l-font-ui');
}

export async function applyAppearanceFont(appearanceSettings, customFont) {
  if (typeof document === 'undefined') return { ok: true, message: '' };

  const normalizedSettings = normalizeAppearanceSettings(appearanceSettings);
  const normalizedFont = normalizeCustomFont(customFont);

  if (normalizedSettings.fontMode !== 'custom') {
    applySystemFont();
    return { ok: true, message: '' };
  }

  if (!normalizedFont?.blob) {
    applySystemFont();
    return { ok: false, message: '自定义字体文件缺失，已恢复系统字体。' };
  }

  clearActiveFont();
  activeFontUrl = URL.createObjectURL(normalizedFont.blob);

  try {
    if ('FontFace' in window && document.fonts?.add) {
      activeFontFace = new FontFace(USER_FONT_FAMILY, `url("${activeFontUrl}")`);
      await activeFontFace.load();
      document.fonts.add(activeFontFace);
    } else {
      fallbackStyleElement = document.createElement('style');
      fallbackStyleElement.textContent = `@font-face { font-family: "${USER_FONT_FAMILY}"; src: url("${activeFontUrl}"); font-display: swap; }`;
      document.head.appendChild(fallbackStyleElement);
    }

    document.documentElement.style.setProperty('--l2l-font-ui', `"${USER_FONT_FAMILY}", ${SYSTEM_FONT_STACK}`);
    return { ok: true, message: '' };
  } catch (error) {
    applySystemFont();
    return {
      ok: false,
      message: error?.message ? `字体加载失败：${error.message}` : '字体加载失败，已恢复系统字体。',
    };
  }
}
