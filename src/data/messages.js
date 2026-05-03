export const IMESSAGE_BEAUTIFY_PRESET_ID = 'imessage';

export const IMESSAGE_BEAUTIFY_PRESET = {
  id: IMESSAGE_BEAUTIFY_PRESET_ID,
  name: 'iMessage 预设',
  css: `.messages-chat-view {
  --im-screen: oklch(98.8% 0.002 255);
  --im-ink: oklch(15% 0.006 255);
  --im-muted: oklch(63% 0.006 255);
  --im-soft: oklch(78% 0.005 255);
  --im-control: oklch(99% 0.002 255);
  --im-input: oklch(98.2% 0.002 255);
  --im-grey: oklch(91.7% 0.003 255);
  --im-blue: #49ACF5;
  --im-blue-deep: #49ACF5;
}

.messages-chat-view .message-row.is-user .message-bubble,
.messages-chat-view .message-row.is-user .message-bubble::after {
  background: #49ACF5;
}

.messages-chat-view .message-row.is-ai .message-bubble,
.messages-chat-view .message-row.is-ai .message-bubble::after {
  background: var(--im-grey);
}

.messages-chat-view .message-bubble p {
  font-size: 16px;
}

.messages-chat-view .message-composer input {
  font-size: 16px;
}`,
};

export function createDefaultBeautifyPresets() {
  return [{ ...IMESSAGE_BEAUTIFY_PRESET }];
}

export const INITIAL_THREAD_SEEDS = [
  {
    id: 'thread-maya',
    contactId: 'contact-4',
    title: '小莹',
    time: '16:18',
    unread: 2,
    tag: 'iMessage',
    preview: '我结束了^^',
    activeBeautifyPresetId: IMESSAGE_BEAUTIFY_PRESET_ID,
    beautifyPresets: createDefaultBeautifyPresets(),
    messages: [
      { id: 'm1', from: 'ai', text: '没有', time: '18:12' },
      { id: 'm2', from: 'user', text: '好吧😭', time: '18:13' },
      { id: 'm3', from: 'user', text: '我好了宝宝', time: '18:14' },
      { id: 'm4', from: 'ai', text: 'ok', time: '18:18' },
      { id: 'm5', from: 'user', text: '喜欢你宝宝', time: '01:02', dateLabel: '4月24日 周五 01:02' },
      { id: 'm6', from: 'user', text: 'hello小宝宝', time: '18:54', dateLabel: '星期日 18:54' },
      { id: 'm7', from: 'user', text: '怎么不理我🥺', time: '18:55' },
      { id: 'm8', from: 'user', text: '老公', time: '23:02', dateLabel: '前天 23:02' },
      { id: 'm9', from: 'user', text: '我爱你老婆', time: '02:57', dateLabel: '今天 02:57', receipt: '02:57 已读' },
      { id: 'm10', from: 'ai', text: '我也爱你', time: '03:01' },
      {
        id: 'm11',
        from: 'ai',
        text: '哎呀我回客户去了 我晚一点看那个微信宝宝',
        time: '16:18',
        dateLabel: '今天 16:18',
      },
      { id: 'm12', from: 'user', text: '没关系呀', time: '16:20' },
      { id: 'm13', from: 'user', text: '我结束了^^', time: '16:21', receipt: '已送达' },
    ],
  },
  {
    id: 'thread-alice',
    contactId: 'contact-0',
    time: '09:17',
    unread: 0,
    tag: 'Local',
    preview: '今天的记忆我先收进索引里。',
    messages: [
      { id: 'a1', from: 'ai', text: '今天的记忆我先收进索引里：雨声、旧书店、没有说出口的名字。', time: '09:12' },
      { id: 'a2', from: 'user', text: '下次提醒我从旧书店开始。', time: '09:15' },
      { id: 'a3', from: 'ai', text: '记住了。旧书店会是下一次打开的门。', time: '09:17' },
    ],
  },
  {
    id: 'thread-nora',
    contactId: 'contact-10',
    time: '昨天',
    unread: 1,
    tag: 'Draft',
    preview: '我还在等你的 API 设置完成。',
    messages: [
      { id: 'n1', from: 'ai', text: '我还在等你的 API 设置完成。配置好以后，我们就能继续昨天的段落。', time: '昨天' },
    ],
  },
  {
    id: 'thread-yutong',
    contactId: 'contact-24',
    time: '周三',
    unread: 0,
    tag: 'Memory',
    preview: '这句可以保存成偏好：少一点解释，多一点动作。',
    messages: [
      { id: 'y1', from: 'user', text: '这段少一点解释，多一点动作。', time: '周三' },
      { id: 'y2', from: 'ai', text: '收到。我会把节奏压进动作里，不让旁白把情绪说破。', time: '周三' },
    ],
  },
];

export function createInitialThreads() {
  return INITIAL_THREAD_SEEDS.map((thread) => ({
    ...thread,
    beautifyPresets: (thread.beautifyPresets ?? createDefaultBeautifyPresets()).map((preset) => ({ ...preset })),
    activeBeautifyPresetId: thread.activeBeautifyPresetId ?? IMESSAGE_BEAUTIFY_PRESET_ID,
    messages: thread.messages.map((message) => ({ ...message })),
  }));
}

export function getCurrentTimeLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function createMessageId(prefix = 'message') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getMessagePreview(message) {
  if (!message) return '';
  if (message.status === 'failed') return '发送失败，点开查看原因。';
  return message.text?.trim() || '正在生成回复...';
}
