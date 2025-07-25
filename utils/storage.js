// 存储管理工具
if (typeof window.TranslatorStorageManager === 'undefined') {
  class TranslatorStorageManager {
    constructor() {
      this.constants = window.TRANSLATOR_CONSTANTS || {};
    }

    // 获取设置
    async getSettings() {
      try {
        // 如果constants为空，使用默认值
        const storageKey = this.constants.STORAGE_KEYS?.SETTINGS || 'translator_settings';
        const defaultSettings = this.constants.DEFAULT_SETTINGS || {
          primaryApi: 'siliconflow',
          targetLanguage: 'zh-CN',
          enableShortcut: true,
          enableContextMenu: true,
          cacheResults: true
        };
        
        const result = await chrome.storage.sync.get(storageKey);
        return {
          ...defaultSettings,
          ...result[storageKey]
        };
      } catch (error) {
        console.error('获取设置失败:', error);
        return this.constants.DEFAULT_SETTINGS || {
          primaryApi: 'siliconflow',
          targetLanguage: 'zh-CN',
          enableShortcut: true,
          enableContextMenu: true,
          cacheResults: true
        };
      }
    }

    // 保存设置
    async saveSettings(settings) {
      try {
        console.log('保存设置:', settings);
        await chrome.storage.sync.set({
          [this.constants.STORAGE_KEYS.SETTINGS]: settings
        });
        return true;
      } catch (error) {
        console.error('保存设置失败:', error);
        return false;
      }
    }

    // 更新设置
    async updateSettings(partialSettings) {
      try {
        const currentSettings = await this.getSettings();
        const newSettings = { ...currentSettings, ...partialSettings };
        console.log('更新后的设置:', newSettings);
        return await this.saveSettings(newSettings);
      } catch (error) {
        console.error('更新设置失败:', error);
        return false;
      }
    }

    // 获取缓存
    async getCache(key) {
      try {
        const result = await chrome.storage.local.get(this.constants.STORAGE_KEYS.CACHE);
        const cache = result[this.constants.STORAGE_KEYS.CACHE] || {};
        
        if (key) {
          const item = cache[key];
          if (item && this.isCacheValid(item)) {
            return item.data;
          }
          return null;
        }
        
        return cache;
      } catch (error) {
        console.error('获取缓存失败:', error);
        return key ? null : {};
      }
    }

    // 设置缓存
    async setCache(key, data, ttl = null) {
      try {
        const cache = await this.getCache();
        const item = {
          data: data,
          timestamp: Date.now(),
          ttl: ttl || this.constants.CACHE_CONFIG.ttl
        };
        
        cache[key] = item;
        
        // 清理过期缓存
        this.cleanupExpiredCache(cache);
        
        await chrome.storage.local.set({
          [this.constants.STORAGE_KEYS.CACHE]: cache
        });
        
        return true;
      } catch (error) {
        console.error('设置缓存失败:', error);
        return false;
      }
    }

    // 删除缓存
    async deleteCache(key) {
      try {
        const cache = await this.getCache();
        if (key) {
          delete cache[key];
        } else {
          // 删除所有缓存
          cache = {};
        }
        
        await chrome.storage.local.set({
          [this.constants.STORAGE_KEYS.CACHE]: cache
        });
        
        return true;
      } catch (error) {
        console.error('删除缓存失败:', error);
        return false;
      }
    }

    // 清空缓存
    async clearCache() {
      return await this.deleteCache();
    }

    // 检查缓存是否有效
    isCacheValid(item) {
      if (!item || !item.timestamp) return false;
      
      const now = Date.now();
      const elapsed = now - item.timestamp;
      
      return elapsed < item.ttl;
    }

    // 清理过期缓存
    cleanupExpiredCache(cache) {
      const now = Date.now();
      let cleaned = false;
      
      for (const key in cache) {
        const item = cache[key];
        if (!this.isCacheValid(item)) {
          delete cache[key];
          cleaned = true;
        }
      }
      
      // 如果缓存项目太多，删除最旧的
      const keys = Object.keys(cache);
      if (keys.length > this.constants.CACHE_CONFIG.maxSize) {
        const sortedKeys = keys.sort((a, b) => {
          return cache[a].timestamp - cache[b].timestamp;
        });
        
        const toDelete = sortedKeys.slice(0, keys.length - this.constants.CACHE_CONFIG.maxSize);
        toDelete.forEach(key => delete cache[key]);
        cleaned = true;
      }
      
      return cleaned;
    }

    // 获取缓存统计
    async getCacheStats() {
      try {
        const cache = await this.getCache();
        const keys = Object.keys(cache);
        const now = Date.now();
        
        let validCount = 0;
        let expiredCount = 0;
        let totalSize = 0;
        
        keys.forEach(key => {
          const item = cache[key];
          if (this.isCacheValid(item)) {
            validCount++;
          } else {
            expiredCount++;
          }
          totalSize += JSON.stringify(item).length;
        });
        
        return {
          total: keys.length,
          valid: validCount,
          expired: expiredCount,
          sizeBytes: totalSize
        };
      } catch (error) {
        console.error('获取缓存统计失败:', error);
        return {
          total: 0,
          valid: 0,
          expired: 0,
          sizeBytes: 0
        };
      }
    }

    // 获取存储统计
    async getStorageStats() {
      try {
        const [syncUsed, localUsed] = await Promise.all([
          chrome.storage.sync.getBytesInUse(),
          chrome.storage.local.getBytesInUse()
        ]);
        
        return {
          sync: {
            used: syncUsed,
            quota: chrome.storage.sync.QUOTA_BYTES
          },
          local: {
            used: localUsed,
            quota: chrome.storage.local.QUOTA_BYTES
          }
        };
      } catch (error) {
        console.error('获取存储统计失败:', error);
        return {
          sync: { used: 0, quota: 0 },
          local: { used: 0, quota: 0 }
        };
      }
    }

    // 监听存储变化
    onStorageChanged(callback) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes[this.constants.STORAGE_KEYS.SETTINGS]) {
          callback('settings', changes[this.constants.STORAGE_KEYS.SETTINGS]);
        }
        if (changes[this.constants.STORAGE_KEYS.CACHE]) {
          callback('cache', changes[this.constants.STORAGE_KEYS.CACHE]);
        }
      });
    }

    // 导出设置
    async exportSettings() {
      try {
        const settings = await this.getSettings();
        const data = {
          version: '1.0.0',
          timestamp: Date.now(),
          settings
        };
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error('导出设置失败:', error);
        return null;
      }
    }

    // 导入设置
    async importSettings(jsonData) {
      try {
        const data = JSON.parse(jsonData);
        if (data.settings) {
          return await this.saveSettings(data.settings);
        }
        return false;
      } catch (error) {
        console.error('导入设置失败:', error);
        return false;
      }
    }
  }

  // 将类暴露到全局
  window.TranslatorStorageManager = TranslatorStorageManager;
  
  // 为了向后兼容，保留旧名称的引用
  // window.StorageManager = TranslatorStorageManager;
}

// 延迟创建TranslatorStorageManager实例
function createStorageManager() {
  console.log('createStorageManager 开始');
  console.log(window);
  console.log(window.TranslatorStorageManager);
  if (typeof window !== 'undefined' && !window.TranslatorStorageManagerInstance) {
    try {
      window.TranslatorStorageManagerInstance = new window.TranslatorStorageManager();
      console.log('TranslatorStorageManager 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorStorageManager 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 立即尝试创建，如果失败则延迟重试
console.log('TranslatorStorageManager 实例创建开始');
if (!createStorageManager()) {
  // 如果立即创建失败，等待一段时间后重试
  setTimeout(() => {
    if (!createStorageManager()) {
      console.error('TranslatorStorageManager 实例创建最终失败');
    }
  }, 100);
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.TranslatorStorageManager;
} 