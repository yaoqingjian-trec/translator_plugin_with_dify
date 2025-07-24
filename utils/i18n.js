// 国际化工具
if (typeof window.TranslatorI18nManager === 'undefined') {
  class TranslatorI18nManager {
    constructor() {
      this.currentLocale = this.detectLocale();
      this.messages = {};
      this.loadMessages();
    }

    // 检测当前语言
    detectLocale() {
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.getUILanguage();
      }
      return navigator.language || 'en';
    }

    // 加载消息
    loadMessages() {
      this.messages = {
        'zh-CN': {
          // 通用
          'ok': '确定',
          'cancel': '取消',
          'close': '关闭',
          'save': '保存',
          'reset': '重置',
          'loading': '加载中...',
          'error': '错误',
          'success': '成功',
          'warning': '警告',
          'info': '信息',
          
          // 元素选择器
          'click_element_to_translate': '点击要翻译的元素',
          'press_esc_to_cancel': '按ESC键取消',
          'shortcut_hint': 'Ctrl+Shift+T',
          'element_selected': '元素已选中',
          'no_text_found': '未找到文本内容',
          'text_too_short': '文本太短',
          'text_too_long': '文本太长',
          'invalid_element': '无效元素',
          
          // 翻译相关
          'translating': '翻译中...',
          'translation_completed': '翻译完成',
          'translation_failed': '翻译失败',
          'original_text': '原文',
          'translated_text': '译文',
          'copy_translation': '复制翻译',
          'retry_translation': '重试翻译',
          'copied': '已复制',
          'apply_translation': '应用翻译',
          
          // API相关
          'api_key_missing': 'API密钥缺失',
          'api_request_failed': 'API请求失败',
          'api_test_success': 'API测试成功',
          'api_test_failed': 'API测试失败',
          'network_error': '网络错误',
          'parse_error': '解析错误',
          'rate_limit_exceeded': '请求频率超限',
          
          // 设置页面
          'general_settings': '通用设置',
          'api_settings': 'API设置',
          'interface_settings': '界面设置',
          'advanced_settings': '高级设置',
          'primary_api': '主要API',
          'siliconflow_api_key': '硅基流动API密钥',
          'dify_api_key': 'Dify API密钥',
          'dify_base_url': 'Dify基础URL',
          'source_language': '源语言',
          'target_language': '目标语言',
          'auto_detect': '自动检测',
          'enable_shortcut': '启用快捷键',
          'enable_context_menu': '启用右键菜单',
          'enable_notifications': '启用通知',
          'cache_results': '缓存翻译结果',
          'cache_expiry': '缓存过期时间',
          'theme': '主题',
          'light_theme': '浅色主题',
          'dark_theme': '深色主题',
          'max_retries': '最大重试次数',
          'request_timeout': '请求超时时间',
          'batch_size': '批量大小',
          'rate_limit_delay': '限频延迟',
          
          // 状态和统计
          'ready': '就绪',
          'active': '活跃',
          'inactive': '非活跃',
          'error_occurred': '发生错误',
          'cache_cleared': '缓存已清空',
          'settings_saved': '设置已保存',
          'settings_reset': '设置已重置',
          'translation_stats': '翻译统计',
          'total_translations': '总翻译次数',
          'cache_hits': '缓存命中',
          'cache_misses': '缓存未命中',
          'storage_usage': '存储使用情况',
          
          // 错误消息
          'initialization_failed': '初始化失败',
          'component_load_timeout': '组件加载超时',
          'selector_start_failed': '选择器启动失败',
          'translation_request_failed': '翻译请求失败',
          'settings_load_failed': '设置加载失败',
          'cache_clear_failed': '缓存清理失败',
          'invalid_url': '无效URL',
          'permission_denied': '权限被拒绝',
          'connection_failed': '连接失败',
          
          // 通知消息
          'selector_activated': '选择器已激活',
          'selector_deactivated': '选择器已停用',
          'translation_copied': '翻译已复制',
          'translation_applied': '翻译已应用',
          'settings_exported': '设置已导出',
          'settings_imported': '设置已导入',
          'api_test_completed': 'API测试完成',
          'cache_stats_updated': '缓存统计已更新',
          
          // 按钮和链接
          'start_selector': '启动选择器',
          'stop_selector': '停止选择器',
          'clear_cache': '清空缓存',
          'export_settings': '导出设置',
          'import_settings': '导入设置',
          'test_api': '测试API',
          'view_stats': '查看统计',
          'open_options': '打开设置',
          'about': '关于',
          'help': '帮助',
          'feedback': '反馈',
          
          // 语言名称
          'language_auto': '自动检测',
          'language_zh_cn': '中文(简体)',
          'language_zh_tw': '中文(繁体)',
          'language_en': '英语',
          'language_ja': '日语',
          'language_ko': '韩语',
          'language_fr': '法语',
          'language_de': '德语',
          'language_es': '西班牙语',
          'language_it': '意大利语',
          'language_pt': '葡萄牙语',
          'language_ru': '俄语',
          'language_ar': '阿拉伯语',
          'language_hi': '印地语',
          'language_th': '泰语',
          'language_vi': '越南语'
        },
        
        'en': {
          // General
          'ok': 'OK',
          'cancel': 'Cancel',
          'close': 'Close',
          'save': 'Save',
          'reset': 'Reset',
          'loading': 'Loading...',
          'error': 'Error',
          'success': 'Success',
          'warning': 'Warning',
          'info': 'Info',
          
          // Element selector
          'click_element_to_translate': 'Click element to translate',
          'press_esc_to_cancel': 'Press ESC to cancel',
          'shortcut_hint': 'Ctrl+Shift+T',
          'element_selected': 'Element selected',
          'no_text_found': 'No text found',
          'text_too_short': 'Text too short',
          'text_too_long': 'Text too long',
          'invalid_element': 'Invalid element',
          
          // Translation
          'translating': 'Translating...',
          'translation_completed': 'Translation completed',
          'translation_failed': 'Translation failed',
          'original_text': 'Original',
          'translated_text': 'Translation',
          'copy_translation': 'Copy',
          'retry_translation': 'Retry',
          'copied': 'Copied',
          'apply_translation': 'Apply',
          
          // API
          'api_key_missing': 'API key missing',
          'api_request_failed': 'API request failed',
          'api_test_success': 'API test successful',
          'api_test_failed': 'API test failed',
          'network_error': 'Network error',
          'parse_error': 'Parse error',
          'rate_limit_exceeded': 'Rate limit exceeded',
          
          // Settings
          'general_settings': 'General Settings',
          'api_settings': 'API Settings',
          'interface_settings': 'Interface Settings',
          'advanced_settings': 'Advanced Settings',
          'primary_api': 'Primary API',
          'siliconflow_api_key': 'SiliconFlow API Key',
          'dify_api_key': 'Dify API Key',
          'dify_base_url': 'Dify Base URL',
          'source_language': 'Source Language',
          'target_language': 'Target Language',
          'auto_detect': 'Auto Detect',
          'enable_shortcut': 'Enable Shortcut',
          'enable_context_menu': 'Enable Context Menu',
          'enable_notifications': 'Enable Notifications',
          'cache_results': 'Cache Results',
          'cache_expiry': 'Cache Expiry',
          'theme': 'Theme',
          'light_theme': 'Light Theme',
          'dark_theme': 'Dark Theme',
          'max_retries': 'Max Retries',
          'request_timeout': 'Request Timeout',
          'batch_size': 'Batch Size',
          'rate_limit_delay': 'Rate Limit Delay',
          
          // Status
          'ready': 'Ready',
          'active': 'Active',
          'inactive': 'Inactive',
          'error_occurred': 'Error Occurred',
          'cache_cleared': 'Cache Cleared',
          'settings_saved': 'Settings Saved',
          'settings_reset': 'Settings Reset',
          'translation_stats': 'Translation Stats',
          'total_translations': 'Total Translations',
          'cache_hits': 'Cache Hits',
          'cache_misses': 'Cache Misses',
          'storage_usage': 'Storage Usage',
          
          // Error messages
          'initialization_failed': 'Initialization failed',
          'component_load_timeout': 'Component load timeout',
          'selector_start_failed': 'Selector start failed',
          'translation_request_failed': 'Translation request failed',
          'settings_load_failed': 'Settings load failed',
          'cache_clear_failed': 'Cache clear failed',
          'invalid_url': 'Invalid URL',
          'permission_denied': 'Permission denied',
          'connection_failed': 'Connection failed',
          
          // Notifications
          'selector_activated': 'Selector activated',
          'selector_deactivated': 'Selector deactivated',
          'translation_copied': 'Translation copied',
          'translation_applied': 'Translation applied',
          'settings_exported': 'Settings exported',
          'settings_imported': 'Settings imported',
          'api_test_completed': 'API test completed',
          'cache_stats_updated': 'Cache stats updated',
          
          // Buttons
          'start_selector': 'Start Selector',
          'stop_selector': 'Stop Selector',
          'clear_cache': 'Clear Cache',
          'export_settings': 'Export Settings',
          'import_settings': 'Import Settings',
          'test_api': 'Test API',
          'view_stats': 'View Stats',
          'open_options': 'Open Options',
          'about': 'About',
          'help': 'Help',
          'feedback': 'Feedback',
          
          // Language names
          'language_auto': 'Auto Detect',
          'language_zh_cn': 'Chinese (Simplified)',
          'language_zh_tw': 'Chinese (Traditional)',
          'language_en': 'English',
          'language_ja': 'Japanese',
          'language_ko': 'Korean',
          'language_fr': 'French',
          'language_de': 'German',
          'language_es': 'Spanish',
          'language_it': 'Italian',
          'language_pt': 'Portuguese',
          'language_ru': 'Russian',
          'language_ar': 'Arabic',
          'language_hi': 'Hindi',
          'language_th': 'Thai',
          'language_vi': 'Vietnamese'
        }
      };
    }

    // 获取消息
    getMessage(key, substitutions) {
      const locale = this.currentLocale.startsWith('zh') ? 'zh-CN' : 'en';
      const messages = this.messages[locale] || this.messages['en'];
      
      let message = messages[key] || key;
      
      // 替换占位符
      if (substitutions && Array.isArray(substitutions)) {
        substitutions.forEach((substitution, index) => {
          message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), substitution);
        });
      }
      
      return message;
    }

    // 设置语言
    setLocale(locale) {
      this.currentLocale = locale;
    }

    // 获取当前语言
    getLocale() {
      return this.currentLocale;
    }

    // 获取支持的语言
    getSupportedLocales() {
      return Object.keys(this.messages);
    }
  }

  // 将类暴露到全局
  window.TranslatorI18nManager = TranslatorI18nManager;
  
  // 为了向后兼容，也暴露为I18nManager（如果没有冲突）
  if (typeof window.I18nManager === 'undefined') {
    window.I18nManager = TranslatorI18nManager;
  }
}

// 延迟创建TranslatorI18nManager实例
function createI18nManager() {
  if (typeof window !== 'undefined' && !window.i18nManager) {
    try {
      window.i18nManager = new window.TranslatorI18nManager();
      console.log('TranslatorI18nManager 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorI18nManager 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 创建便捷的t函数
function createTFunction() {
  if (typeof window !== 'undefined' && !window.t) {
    try {
      window.t = (key, substitutions) => window.i18nManager.getMessage(key, substitutions);
      console.log('t 函数已创建');
      return true;
    } catch (error) {
      console.error('t 函数创建失败:', error);
      return false;
    }
  }
  return true;
}

// 立即尝试创建，如果失败则延迟重试
if (!createI18nManager()) {
  setTimeout(() => {
    if (!createI18nManager()) {
      console.error('TranslatorI18nManager 实例创建最终失败');
    }
  }, 50);
}

// 创建t函数
if (!createTFunction()) {
  setTimeout(() => {
    if (!createTFunction()) {
      console.error('t 函数创建最终失败');
    }
  }, 60);
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.TranslatorI18nManager;
} 