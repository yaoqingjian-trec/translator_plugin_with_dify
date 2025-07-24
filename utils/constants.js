// 常量定义
if (typeof window.TRANSLATOR_CONSTANTS === 'undefined') {
  const CONSTANTS = {
    // 存储键名
    STORAGE_KEYS: {
      SETTINGS: 'translator_settings',
      CACHE: 'translator_cache',
      STATS: 'translator_stats'
    },

    // 默认设置
    DEFAULT_SETTINGS: {
      // API配置
      primaryApi: 'siliconflow',
      siliconflowApiKey: '',
      difyApiKey: '',
      difyBaseUrl: 'https://api.dify.ai',
      
      // 翻译设置
      targetLanguage: 'zh-CN',
      
      // 界面设置
      theme: 'light',
      enableShortcut: true,
      enableContextMenu: true,
      enableNotifications: true,
      
      // 缓存设置
      cacheResults: true,
      cacheExpiry: 24 * 60 * 60 * 1000, // 24小时
      
      // 高级设置
      maxRetries: 3,
      requestTimeout: 30000,
      batchSize: 5,
      rateLimitDelay: 1000
    },

    // 消息类型
    MESSAGE_TYPES: {
      // 选择器相关
      TOGGLE_SELECTOR: 'toggle_selector',
      ELEMENT_SELECTED: 'element_selected',
      SELECTION_CANCELLED: 'selection_cancelled',
      
      // 翻译相关
      TRANSLATE_TEXT: 'translate_text',
      TRANSLATION_COMPLETE: 'translation_complete',
      TRANSLATION_ERROR: 'translation_error',
      TEST_API: 'test_api',
      REOPEN_POPUP_WITH_RESULT: 'reopen_popup_with_result',
      
      // 设置相关
      GET_SETTINGS: 'get_settings',
      UPDATE_SETTINGS: 'update_settings',
      SETTINGS_UPDATED: 'settings_updated',
      
      // 缓存相关
      CLEAR_CACHE: 'clear_cache',
      GET_CACHE_STATS: 'get_cache_stats',
      
      // 状态相关
      GET_STATUS: 'get_status',
      SET_STATUS: 'set_status',
      
      // 其他
      PING: 'ping',
      ERROR: 'error'
    },

    // 选择器配置
    SELECTOR_CONFIG: {
      // 选择器样式
      highlightStyle: {
        outline: '2px solid #007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        cursor: 'pointer'
      },
      
      // 选择器事件
      events: {
        SELECTOR_TOGGLE: 'selector_toggle',
        ELEMENT_HOVER: 'element_hover',
        ELEMENT_SELECT: 'element_select',
        SELECTOR_CANCEL: 'selector_cancel',
        TRANSLATION_COMPLETE: 'translation_complete',
        TRANSLATION_ERROR: 'translation_error'
      },
      
      // 排除的元素
      excludeElements: ['html', 'body', 'head', 'script', 'style', 'meta', 'link', 'title'],
      
      // 排除的类名
      excludeClasses: ['translator-', 'popup-', 'extension-', 'chrome-']
    },

    // API配置
    API_CONFIG: {
      // 硅基流动API
      siliconflow: {
        baseUrl: 'https://api.siliconflow.cn',
        model: 'deepseek-chat',
        maxTokens: 4000,
        temperature: 0.1
      },
      
      // Dify API
      dify: {
        baseUrl: 'https://api.dify.ai',
        timeout: 30000,
        retries: 3
      },
      
      // 通用配置
      common: {
        timeout: 30000,
        retries: 3,
        rateLimitDelay: 1000
      }
    },

    // 支持的语言
    SUPPORTED_LANGUAGES: [
      { code: 'auto', name: '自动检测', nativeName: 'Auto Detect' },
      { code: 'zh-CN', name: '中文(简体)', nativeName: '中文(简体)' },
      { code: 'zh-TW', name: '中文(繁体)', nativeName: '中文(繁體)' },
      { code: 'en', name: '英语', nativeName: 'English' },
      { code: 'ja', name: '日语', nativeName: '日本語' },
      { code: 'ko', name: '韩语', nativeName: '한국어' },
      { code: 'fr', name: '法语', nativeName: 'Français' },
      { code: 'de', name: '德语', nativeName: 'Deutsch' },
      { code: 'es', name: '西班牙语', nativeName: 'Español' },
      { code: 'it', name: '意大利语', nativeName: 'Italiano' },
      { code: 'pt', name: '葡萄牙语', nativeName: 'Português' },
      { code: 'ru', name: '俄语', nativeName: 'Русский' },
      { code: 'ar', name: '阿拉伯语', nativeName: 'العربية' },
      { code: 'hi', name: '印地语', nativeName: 'हिन्दी' },
      { code: 'th', name: '泰语', nativeName: 'ไทย' },
      { code: 'vi', name: '越南语', nativeName: 'Tiếng Việt' }
    ],

    // 缓存配置
    CACHE_CONFIG: {
      maxSize: 1000, // 最大缓存条目数
      ttl: 24 * 60 * 60 * 1000, // 缓存时间（24小时）
      cleanupInterval: 60 * 60 * 1000 // 清理间隔（1小时）
    }
  };

  // 将常量暴露到全局
  window.TRANSLATOR_CONSTANTS = CONSTANTS;
  console.log('TRANSLATOR_CONSTANTS 已创建');
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.TRANSLATOR_CONSTANTS;
} 