import { useState } from 'react';
import { testApiConnection } from '../services/llmClient.js';
import { Icon } from './Icon.jsx';

export function SettingsView({ apiSettings, storageStatus, onApiSettingsChange, onClearApiKey, onResetThreads }) {
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const updateField = (field, value) => {
    setTestResult(null);
    onApiSettingsChange((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testApiConnection(apiSettings);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        ok: false,
        message: error?.message ?? '连接测试失败。',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetThreads = () => {
    if (!window.confirm('清除后会恢复为初始示例会话，本机保存的聊天记录会被覆盖。继续吗？')) return;
    onResetThreads();
  };

  return (
    <section className="settings-view" aria-label="设置">
      <header className="settings-header">
        <div>
          <span className="settings-kicker">LOCAL BACKEND</span>
          <h1>设置</h1>
        </div>
        <span className={storageStatus?.error ? 'settings-status is-error' : 'settings-status'}>
          {storageStatus?.error ? '本地保存异常' : storageStatus?.isReady ? '本地已保存' : '正在读取'}
        </span>
      </header>

      <div className="settings-scroll">
        <section className="settings-group" aria-labelledby="api-settings-heading">
          <div className="settings-group-heading">
            <h2 id="api-settings-heading">API</h2>
            <span>OpenAI-compatible</span>
          </div>

          <label className="settings-field">
            <span>Provider</span>
            <input
              value={apiSettings.provider}
              onChange={(event) => updateField('provider', event.target.value)}
              placeholder="OpenRouter / OpenAI / Local"
            />
          </label>

          <label className="settings-field">
            <span>Base URL</span>
            <input
              value={apiSettings.baseUrl}
              onChange={(event) => updateField('baseUrl', event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <small>会自动请求 `/chat/completions`。</small>
          </label>

          <label className="settings-field">
            <span>API Key</span>
            <div className="settings-secret-row">
              <input
                type={isKeyVisible ? 'text' : 'password'}
                value={apiSettings.apiKey}
                onChange={(event) => updateField('apiKey', event.target.value)}
                placeholder="sk-..."
              />
              <button type="button" onClick={() => setIsKeyVisible((current) => !current)}>
                {isKeyVisible ? '隐藏' : '显示'}
              </button>
            </div>
            <small>密钥只保存在当前浏览器的 IndexedDB 中。</small>
          </label>

          <label className="settings-field">
            <span>Model</span>
            <input
              value={apiSettings.model}
              onChange={(event) => updateField('model', event.target.value)}
              placeholder="gpt-4o-mini"
            />
          </label>

          <div className="settings-two-column">
            <label className="settings-field">
              <span>Temperature</span>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={apiSettings.temperature}
                onChange={(event) => updateField('temperature', event.target.value)}
              />
            </label>

            <label className="settings-field">
              <span>Max Tokens</span>
              <input
                type="number"
                min="16"
                max="32000"
                step="16"
                value={apiSettings.maxTokens}
                onChange={(event) => updateField('maxTokens', event.target.value)}
              />
            </label>
          </div>

          <label className="settings-toggle">
            <span>
              <strong>流式回复</strong>
              <small>开启后聊天会逐段显示。</small>
            </span>
            <input
              type="checkbox"
              checked={apiSettings.stream}
              onChange={(event) => updateField('stream', event.target.checked)}
            />
          </label>

          <div className="settings-actions">
            <button type="button" className="settings-primary-action" onClick={handleTestConnection} disabled={isTesting}>
              <Icon name="route" className="settings-action-icon" />
              {isTesting ? '测试中' : '测试连接'}
            </button>
            <button type="button" className="settings-secondary-action" onClick={onClearApiKey}>
              清除密钥
            </button>
          </div>

          {testResult && (
            <p className={testResult.ok ? 'settings-result is-success' : 'settings-result is-error'}>{testResult.message}</p>
          )}
        </section>

        <section className="settings-group" aria-labelledby="data-settings-heading">
          <div className="settings-group-heading">
            <h2 id="data-settings-heading">数据</h2>
            <span>本地优先</span>
          </div>

          <p className="settings-note">
            联系人、角色资料、聊天线程和 API 设置会保存在这台设备上。请求会直接发送到你填写的服务商。
          </p>

          <div className="settings-actions">
            <button type="button" className="settings-secondary-action" onClick={handleResetThreads}>
              恢复示例会话
            </button>
          </div>

          {storageStatus?.error && <p className="settings-result is-error">{storageStatus.error}</p>}
        </section>
      </div>
    </section>
  );
}
