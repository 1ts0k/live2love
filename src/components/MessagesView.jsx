import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IMESSAGE_BEAUTIFY_PRESET,
  IMESSAGE_BEAUTIFY_PRESET_ID,
  createDefaultBeautifyPresets,
  createMessageId,
  getCurrentTimeLabel,
  getMessagePreview,
} from '../data/messages.js';
import { buildWorldBookPrompt } from '../data/worldBook.js';
import { completeChat } from '../services/llmClient.js';
import { Icon } from './Icon.jsx';

function getInitial(name) {
  return Array.from(name.trim())[0] ?? '?';
}

function hydrateThreads(threads, contacts) {
  return threads.map((thread) => {
    const contact = contacts.find((item) => item.id === thread.contactId) ?? contacts[0];
    return {
      ...thread,
      contact,
      contactName: thread.title ?? contact?.name ?? '新联系人',
    };
  });
}

function getWorldBookContextText(messages) {
  return messages
    .map((message) => message.text)
    .filter(Boolean)
    .join('\n')
    .slice(-8000);
}

function getContactSystemPrompt(contact, worldBooks, messages = []) {
  const detailProfile = contact?.detailProfile ?? {};
  const worldBookPrompt = buildWorldBookPrompt(worldBooks, contact, getWorldBookContextText(messages));
  const legacyWorldBook = worldBookPrompt ? '' : detailProfile.worldBook;
  const parts = [
    detailProfile.roleSetting,
    worldBookPrompt ? `世界书：\n${worldBookPrompt}` : '',
    legacyWorldBook ? `世界书：\n${legacyWorldBook}` : '',
    detailProfile.myPersona ? `用户人设：\n${detailProfile.myPersona}` : '',
  ].filter((part) => part?.trim());

  return parts.join('\n\n');
}

function updateThreadMessages(thread, messages) {
  const latestMessage = messages[messages.length - 1];
  return {
    ...thread,
    messages,
    preview: getMessagePreview(latestMessage),
    time: latestMessage?.time ?? thread.time,
  };
}

function appendMessages(thread, nextMessages, provider) {
  return updateThreadMessages(
    {
      ...thread,
      tag: provider?.trim() || thread.tag,
    },
    [...thread.messages, ...nextMessages]
  );
}

function replaceMessage(thread, messageId, updater) {
  const messages = thread.messages.map((message) => (message.id === messageId ? updater(message) : message));
  return updateThreadMessages(thread, messages);
}

const SEARCH_FILTERS = [
  { id: 'date', label: '日期' },
  { id: 'image', label: '图片' },
  { id: 'voice', label: '语音' },
  { id: 'audio-call', label: '语音通话' },
  { id: 'video-call', label: '视频通话' },
  { id: 'transaction', label: '交易' },
  { id: 'location', label: '位置' },
  { id: 'gift', label: '礼物' },
];

const REMOVED_BEAUTIFY_PRESET_IDS = new Set(['default']);

function getMessageSenderLabel(message, threadName) {
  return message.from === 'user' ? '我' : threadName;
}

function normalizeBeautifyPresets(thread) {
  const customPresets = Array.isArray(thread?.beautifyPresets) ? thread.beautifyPresets : [];
  const presetMap = new Map();

  createDefaultBeautifyPresets().forEach((preset) => {
    presetMap.set(preset.id, { ...preset });
  });

  customPresets.forEach((preset) => {
    if (!preset?.id || !preset?.css) return;
    if (REMOVED_BEAUTIFY_PRESET_IDS.has(preset.id)) return;
    presetMap.set(preset.id, {
      id: preset.id,
      name: preset.name?.trim() || '未命名预设',
      css: preset.css,
    });
  });

  return [...presetMap.values()];
}

function getActiveBeautifyPreset(thread) {
  const presets = normalizeBeautifyPresets(thread);
  return presets.find((preset) => preset.id === thread?.activeBeautifyPresetId) ?? presets[0] ?? IMESSAGE_BEAUTIFY_PRESET;
}

function createBeautifyPresetId() {
  return `beautify-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function MessagesView({
  contacts,
  threads,
  setThreads,
  apiSettings,
  worldBooks,
  activeThreadId,
  onOpenThread,
  onBack,
  onCloseApp,
  onOpenContactDetail,
}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [threadPanel, setThreadPanel] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('date');
  const [beautifyName, setBeautifyName] = useState(IMESSAGE_BEAUTIFY_PRESET.name);
  const [beautifyCss, setBeautifyCss] = useState(IMESSAGE_BEAUTIFY_PRESET.css);
  const [beautifyNotice, setBeautifyNotice] = useState('');
  const [generatingThreadId, setGeneratingThreadId] = useState(null);
  const abortControllerRef = useRef(null);

  const hydratedThreads = useMemo(() => hydrateThreads(threads, contacts), [contacts, threads]);
  const activeThread = hydratedThreads.find((thread) => thread.id === activeThreadId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleThreads = hydratedThreads
    .filter((thread) => {
      return (
        !normalizedQuery ||
        thread.contactName.toLowerCase().includes(normalizedQuery) ||
        thread.preview.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)));

  useEffect(() => {
    setThreadPanel('chat');
    setSearchQuery('');
    setActiveSearchFilter('date');
    setBeautifyNotice('');
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThread || threadPanel !== 'beautify') return;

    const activePreset = getActiveBeautifyPreset(activeThread);
    setBeautifyName(activePreset.name);
    setBeautifyCss(activePreset.css);
  }, [activeThreadId, activeThread?.activeBeautifyPresetId, threadPanel]);

  const patchMessage = (threadId, messageId, updater) => {
    setThreads((current) =>
      current.map((thread) => (thread.id === threadId ? replaceMessage(thread, messageId, updater) : thread))
    );
  };

  const patchThread = (threadId, updater) => {
    setThreads((current) => current.map((thread) => (thread.id === threadId ? updater(thread) : thread)));
  };

  const handleToggleThreadOption = (field) => {
    if (!activeThread) return;
    patchThread(activeThread.id, (thread) => ({
      ...thread,
      [field]: !thread[field],
    }));
  };

  const handleProactiveMinutesChange = (event) => {
    if (!activeThread) return;
    const value = Math.max(1, Number(event.target.value) || 1);
    patchThread(activeThread.id, (thread) => ({
      ...thread,
      proactiveMinutes: value,
    }));
  };

  const handleClearThread = () => {
    if (!activeThread) return;
    patchThread(activeThread.id, (thread) => ({
      ...thread,
      messages: [],
      preview: '暂无聊天记录',
      unread: 0,
    }));
    setThreadPanel('chat');
  };

  const handleSelectBeautifyPreset = (preset) => {
    if (!activeThread) return;

    const presets = normalizeBeautifyPresets(activeThread);
    setBeautifyName(preset.name);
    setBeautifyCss(preset.css);
    setBeautifyNotice(`${preset.name} 已应用`);
    patchThread(activeThread.id, (thread) => ({
      ...thread,
      beautifyPresets: presets.map((item) => ({ ...item })),
      activeBeautifyPresetId: preset.id,
    }));
  };

  const handleResetBeautifyPreset = () => {
    setBeautifyName(IMESSAGE_BEAUTIFY_PRESET.name);
    setBeautifyCss(IMESSAGE_BEAUTIFY_PRESET.css);
    handleSelectBeautifyPreset(IMESSAGE_BEAUTIFY_PRESET);
  };

  const handleSaveBeautifyPreset = (event) => {
    event.preventDefault();
    if (!activeThread) return;

    const name = beautifyName.trim() || `自定义预设 ${normalizeBeautifyPresets(activeThread).length + 1}`;
    const css = beautifyCss.trim() || IMESSAGE_BEAUTIFY_PRESET.css;
    const presets = normalizeBeautifyPresets(activeThread);
    const activePreset = getActiveBeautifyPreset(activeThread);
    const shouldCreatePreset =
      activePreset.id === IMESSAGE_BEAUTIFY_PRESET_ID &&
      (name !== IMESSAGE_BEAUTIFY_PRESET.name || css !== IMESSAGE_BEAUTIFY_PRESET.css);
    const nextPreset = {
      id: shouldCreatePreset ? createBeautifyPresetId() : activePreset.id,
      name,
      css,
    };
    const nextPresets = presets.map((preset) => (preset.id === nextPreset.id ? nextPreset : preset));

    if (!nextPresets.some((preset) => preset.id === nextPreset.id)) {
      nextPresets.push(nextPreset);
    }

    setBeautifyName(nextPreset.name);
    setBeautifyCss(nextPreset.css);
    setBeautifyNotice('已保存并应用到当前聊天');
    patchThread(activeThread.id, (thread) => ({
      ...thread,
      beautifyPresets: nextPresets.map((preset) => ({ ...preset })),
      activeBeautifyPresetId: nextPreset.id,
    }));
  };

  const runAssistantReply = async ({ thread, requestMessages, aiMessageId }) => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setGeneratingThreadId(thread.id);

    try {
      await completeChat({
        settings: apiSettings,
        messages: requestMessages,
        systemPrompt: getContactSystemPrompt(thread.contact, worldBooks, requestMessages),
        signal: abortController.signal,
        onDelta: (delta) => {
          patchMessage(thread.id, aiMessageId, (message) => ({
            ...message,
            status: 'streaming',
            text: `${message.text}${delta}`,
          }));
        },
      });

      patchMessage(thread.id, aiMessageId, (message) => ({
        ...message,
        status: 'done',
        text: message.text.trim() || '我在，但这次没有组织出合适的回复。',
      }));
    } catch (error) {
      patchMessage(thread.id, aiMessageId, (message) => ({
        ...message,
        status: 'failed',
        text: message.text.trim() || '这条回复没有发出来。',
        error: error?.message ?? '请求失败，请稍后再试。',
      }));
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setGeneratingThreadId(null);
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    if (!activeThread || !draft.trim() || generatingThreadId) return;

    const time = getCurrentTimeLabel();
    const userMessage = {
      id: createMessageId('user'),
      from: 'user',
      text: draft.trim(),
      time,
      receipt: '已送达',
    };
    const aiMessage = {
      id: createMessageId('ai'),
      from: 'ai',
      text: '',
      time,
      status: 'streaming',
    };
    const requestMessages = [...activeThread.messages, userMessage];

    setDraft('');
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id ? appendMessages(thread, [userMessage, aiMessage], apiSettings.provider) : thread
      )
    );

    runAssistantReply({
      thread: activeThread,
      requestMessages,
      aiMessageId: aiMessage.id,
    });
  };

  const handleStopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const handleRetry = (failedMessageId) => {
    if (!activeThread || generatingThreadId) return;

    const failedIndex = activeThread.messages.findIndex((message) => message.id === failedMessageId);
    if (failedIndex < 1) return;

    const aiMessage = {
      id: createMessageId('ai'),
      from: 'ai',
      text: '',
      time: getCurrentTimeLabel(),
      status: 'streaming',
    };
    const requestMessages = activeThread.messages.slice(0, failedIndex);

    setThreads((current) =>
      current.map((thread) => {
        if (thread.id !== activeThread.id) return thread;
        const messages = [...thread.messages.filter((message) => message.id !== failedMessageId), aiMessage];
        return updateThreadMessages(thread, messages);
      })
    );

    runAssistantReply({
      thread: activeThread,
      requestMessages,
      aiMessageId: aiMessage.id,
    });
  };

  const handleOpenThread = (threadId) => {
    setThreads((current) => current.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread)));
    onOpenThread(threadId);
  };

  if (activeThread) {
    const isGenerating = generatingThreadId === activeThread.id;
    const hasComposerAction = Boolean(draft.trim()) || isGenerating;
    const matchingMessages = activeThread.messages.filter((message) => {
      const normalizedMessage = message.text?.toLowerCase() ?? '';
      return !searchQuery.trim() || normalizedMessage.includes(searchQuery.trim().toLowerCase());
    });
    const datedMessages = matchingMessages.filter((message) => message.dateLabel);
    const searchResults = activeSearchFilter === 'date' ? (datedMessages.length > 0 ? datedMessages : matchingMessages) : [];
    const beautifyPresets = normalizeBeautifyPresets(activeThread);
    const activeBeautifyPreset = getActiveBeautifyPreset(activeThread);

    if (threadPanel === 'details') {
      const proactiveMinutes = activeThread.proactiveMinutes ?? 30;

      return (
        <section className="messages-view chat-detail-view" aria-label={`${activeThread.contactName} 的聊天详情`}>
          <header className="chat-subpage-header">
            <button type="button" className="messages-icon-button" onClick={() => setThreadPanel('chat')} aria-label="返回聊天">
              <Icon name="arrowLeft" className="messages-header-icon" />
            </button>
            <h1>聊天详情</h1>
            <span aria-hidden="true" />
          </header>

          <div className="chat-detail-list">
            <button
              type="button"
              className="chat-detail-row chat-detail-profile-row"
              onClick={() => onOpenContactDetail?.(activeThread.contact)}
            >
              <span className="chat-detail-avatar" aria-hidden="true">
                {activeThread.contact?.imageUrl ? <img src={activeThread.contact.imageUrl} alt="" /> : getInitial(activeThread.contactName)}
              </span>
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">{activeThread.contactName}</span>
              </span>
              <Icon name="chevronRight" className="chat-detail-chevron" />
            </button>

            <button type="button" className="chat-detail-row" onClick={() => setThreadPanel('search')}>
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">查找聊天内容</span>
              </span>
              <Icon name="chevronRight" className="chat-detail-chevron" />
            </button>

            <label className="chat-detail-row chat-detail-switch-row">
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">消息免打扰</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(activeThread.isMuted)}
                onChange={() => handleToggleThreadOption('isMuted')}
              />
            </label>

            <label className="chat-detail-row chat-detail-switch-row">
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">置顶聊天</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(activeThread.isPinned)}
                onChange={() => handleToggleThreadOption('isPinned')}
              />
            </label>

            <div className="chat-detail-row-stack">
              <label className="chat-detail-row chat-detail-switch-row">
                <span className="chat-detail-row-main">
                  <span className="chat-detail-row-title">主动发消息</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(activeThread.proactiveEnabled)}
                  onChange={() => handleToggleThreadOption('proactiveEnabled')}
                />
              </label>
              {activeThread.proactiveEnabled && (
                <label className="chat-detail-inline-field">
                  <span>间隔时间</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={proactiveMinutes}
                    onChange={handleProactiveMinutesChange}
                    aria-label="主动发消息间隔分钟"
                  />
                  <span>分钟</span>
                </label>
              )}
            </div>

            <button type="button" className="chat-detail-row" onClick={() => setThreadPanel('beautify')}>
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">设置当前聊天美化</span>
              </span>
              <span className="chat-detail-row-value">{activeBeautifyPreset.name}</span>
              <Icon name="chevronRight" className="chat-detail-chevron" />
            </button>

            <button type="button" className="chat-detail-row chat-detail-danger-row" onClick={handleClearThread}>
              <span className="chat-detail-row-main">
                <span className="chat-detail-row-title">清空聊天记录</span>
              </span>
            </button>
          </div>
        </section>
      );
    }

    if (threadPanel === 'beautify') {
      return (
        <section className="messages-view chat-beautify-view" aria-label={`${activeThread.contactName} 的聊天美化`}>
          <header className="chat-subpage-header">
            <button type="button" className="messages-icon-button" onClick={() => setThreadPanel('details')} aria-label="返回聊天详情">
              <Icon name="arrowLeft" className="messages-header-icon" />
            </button>
            <h1>聊天美化</h1>
            <span aria-hidden="true" />
          </header>

          <form className="chat-beautify-panel" onSubmit={handleSaveBeautifyPreset}>
            <section className="chat-beautify-section" aria-label="当前预设">
              <span className="chat-beautify-kicker">当前预设</span>
              <div className="chat-beautify-presets">
                {beautifyPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={preset.id === activeBeautifyPreset.id ? 'chat-beautify-preset is-active' : 'chat-beautify-preset'}
                    onClick={() => handleSelectBeautifyPreset(preset)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </section>

            <label className="chat-beautify-field">
              <span>预设名称</span>
              <input
                value={beautifyName}
                onChange={(event) => {
                  setBeautifyName(event.target.value);
                  setBeautifyNotice('');
                }}
                placeholder="例如 iMessage 预设"
              />
            </label>

            <label className="chat-beautify-code">
              <span>CSS 样式</span>
              <textarea
                value={beautifyCss}
                onChange={(event) => {
                  setBeautifyCss(event.target.value);
                  setBeautifyNotice('');
                }}
                spellCheck="false"
              />
            </label>

            <div className="chat-beautify-preview" aria-label="美化预览">
              <style>{beautifyCss}</style>
              <div className="messages-chat-view chat-beautify-preview-surface">
                <div className="message-row is-ai has-tail">
                  <div className="message-bubble">
                    <p>这是对方的消息预览。</p>
                  </div>
                </div>
                <div className="message-row is-user has-tail">
                  <div className="message-bubble">
                    <p>这是我的消息预览。</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="chat-beautify-help">
              CSS 会应用到当前私聊页。建议从 .messages-chat-view 选择器开始写，避免影响其它页面。
            </p>

            {beautifyNotice && <p className="chat-beautify-notice">{beautifyNotice}</p>}

            <div className="chat-beautify-actions">
              <button type="button" className="chat-beautify-secondary" onClick={handleResetBeautifyPreset}>
                恢复 iMessage
              </button>
              <button type="submit" className="chat-beautify-primary">
                保存为预设
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (threadPanel === 'search') {
      return (
        <section className="messages-view chat-search-view" aria-label={`${activeThread.contactName} 的聊天内容查找`}>
          <header className="chat-search-header">
            <button type="button" className="messages-icon-button" onClick={() => setThreadPanel('details')} aria-label="返回聊天详情">
              <Icon name="arrowLeft" className="messages-header-icon" />
            </button>
            <label className="chat-search-input">
              <Icon name="search" className="chat-search-icon" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索"
                autoFocus
              />
            </label>
          </header>

          <div className="chat-search-filters" aria-label="聊天记录分类">
            {SEARCH_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={filter.id === activeSearchFilter ? 'chat-search-pill is-active' : 'chat-search-pill'}
                onClick={() => setActiveSearchFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="chat-search-results">
            {searchResults.length > 0 ? (
              searchResults.map((message) => (
                <button key={message.id} type="button" className="chat-search-result">
                  <span className="chat-search-result-meta">
                    <span>{getMessageSenderLabel(message, activeThread.contactName)}</span>
                    <time>{message.dateLabel ?? message.time}</time>
                  </span>
                  <span className="chat-search-result-text">{message.text}</span>
                </button>
              ))
            ) : (
              <p className="chat-search-empty">
                {SEARCH_FILTERS.find((filter) => filter.id === activeSearchFilter)?.label}里暂时没有可查看的聊天记录。
              </p>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="messages-view messages-chat-view" aria-label={`${activeThread.contactName} 的聊天`}>
        <style>{activeBeautifyPreset.css}</style>
        <header className="messages-chat-header">
          <button type="button" className="messages-icon-button" onClick={onBack} aria-label="返回消息">
            <Icon name="arrowLeft" className="messages-header-icon" />
          </button>

          <div className="messages-chat-persona">
            <span className="messages-chat-avatar" aria-hidden="true">
              {activeThread.contact?.imageUrl ? <img src={activeThread.contact.imageUrl} alt="" /> : getInitial(activeThread.contactName)}
            </span>

            <button
              type="button"
              className="messages-chat-title"
              aria-label={`查看 ${activeThread.contactName} 的资料`}
              onClick={() => onOpenContactDetail?.(activeThread.contact)}
            >
              <h1>{activeThread.contactName}</h1>
              <Icon name="chevronRight" className="messages-title-chevron" />
            </button>
          </div>

          <button type="button" className="messages-icon-button" onClick={() => setThreadPanel('details')} aria-label="聊天详情">
            <Icon name="moreHorizontal" className="messages-header-icon" />
          </button>
        </header>

        <div className="messages-thread" aria-live="polite">
          {activeThread.messages.map((message, index) => {
            const nextMessage = activeThread.messages[index + 1];
            const hasBubbleTail = !nextMessage || nextMessage.from !== message.from || Boolean(nextMessage.dateLabel);
            const rowClassName = [
              'message-row',
              message.from === 'user' ? 'is-user' : 'is-ai',
              hasBubbleTail ? 'has-tail' : 'is-stacked',
            ].join(' ');

            return (
            <div key={message.id} className="message-cluster">
              {message.dateLabel && <time className="message-date-separator">{message.dateLabel}</time>}
              <div className={rowClassName}>
                <div className={message.status === 'failed' ? 'message-bubble is-error' : 'message-bubble'}>
                  <p>{message.text || (message.status === 'streaming' ? '正在生成回复...' : '')}</p>
                  {message.error && <span className="message-error">{message.error}</span>}
                  {message.status === 'failed' && (
                    <button type="button" className="message-inline-action" onClick={() => handleRetry(message.id)}>
                      重试
                    </button>
                  )}
                  <time className="message-time">{message.time}</time>
                </div>
              </div>
              {message.receipt && <span className="message-receipt">{message.receipt}</span>}
            </div>
            );
          })}
        </div>

        <form className={hasComposerAction ? 'message-composer has-action' : 'message-composer'} onSubmit={handleSend}>
          <button type="button" className="composer-tool" aria-label="更多输入选项">
            <Icon name="plus" className="composer-icon" />
          </button>
          <div className="composer-field">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="iMessage 信息"
              aria-label="消息内容"
              disabled={isGenerating}
            />
            <button type="button" className="composer-audio" aria-label="语音输入">
              <span />
              <span />
              <span />
              <span />
            </button>
            <button
              type={isGenerating ? 'button' : 'submit'}
              className="composer-send"
              disabled={!isGenerating && !draft.trim()}
              aria-label={isGenerating ? '停止生成' : '发送消息'}
              onClick={isGenerating ? handleStopGenerating : undefined}
            >
              <Icon name={isGenerating ? 'stop' : 'send'} className="composer-icon" />
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="messages-view" aria-label="消息">
      <header className="messages-list-header">
        {onCloseApp && (
          <button type="button" className="messages-icon-button messages-home-button" onClick={onCloseApp} aria-label="返回手机桌面">
            <Icon name="arrowLeft" className="messages-header-icon" />
          </button>
        )}
        <h1>消息</h1>
        <button type="button" className="messages-compose-button" aria-label="新建会话">
          <Icon name="plus" className="messages-compose-icon" />
        </button>
      </header>

      <label className="messages-search">
        <Icon name="search" className="messages-search-icon" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索" />
      </label>

      <div className="conversation-list">
        {visibleThreads.map((thread) => (
          <button key={thread.id} type="button" className="conversation-row" onClick={() => handleOpenThread(thread.id)}>
            <span className="conversation-avatar" aria-hidden="true">
              {thread.contact?.imageUrl ? <img src={thread.contact.imageUrl} alt="" /> : getInitial(thread.contactName)}
            </span>
            <span className="conversation-main">
              <span className="conversation-topline">
                <span className="conversation-name">{thread.contactName}</span>
                <time>{thread.time}</time>
              </span>
              <span className="conversation-preview">{thread.preview}</span>
            </span>
            {thread.unread > 0 && <span className="conversation-unread">{thread.unread}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
