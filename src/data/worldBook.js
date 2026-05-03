export const DEFAULT_WORLD_BOOK_STATE = {
  globalEntries: [],
  roleEntries: [],
  globalCategories: [],
  roleCategories: [],
};

function createWorldBookId(prefix = 'worldbook') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) {
    return value
      .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n，、;；|]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCategory(category, fallbackScope = 'global') {
  if (!category || typeof category !== 'object') return null;

  const scope = category.scope === 'role' ? 'role' : fallbackScope;
  const name = typeof category.name === 'string' ? category.name.trim() : '';
  if (!name) return null;

  return {
    id: typeof category.id === 'string' && category.id.trim() ? category.id : createWorldBookId(`${scope}-category`),
    scope,
    name,
    createdAt: typeof category.createdAt === 'string' ? category.createdAt : new Date().toISOString(),
  };
}

function dedupeCategories(categories) {
  const seen = new Set();
  return categories.filter((category) => {
    const key = category.id || category.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeEntry(entry, fallbackScope = 'global') {
  if (!entry || typeof entry !== 'object') return null;

  const scope = entry.scope === 'role' ? 'role' : fallbackScope;
  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : createWorldBookId(scope);
  const contactId = scope === 'role' && typeof entry.contactId === 'string' ? entry.contactId : null;
  const triggerMode = entry.triggerMode === 'keyword' || entry.activationMode === 'keyword' ? 'keyword' : 'always';

  return {
    id,
    scope,
    contactId,
    categoryId: typeof entry.categoryId === 'string' && entry.categoryId.trim() ? entry.categoryId : null,
    title: typeof entry.title === 'string' ? entry.title : '未命名世界书',
    content: typeof entry.content === 'string' ? entry.content : '',
    enabled: entry.enabled !== false,
    triggerMode,
    keywords: normalizeKeywords(entry.keywords ?? entry.triggerKeywords ?? entry.keyword),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
  };
}

export function normalizeWorldBooks(worldBooks) {
  if (!worldBooks || typeof worldBooks !== 'object') {
    return { ...DEFAULT_WORLD_BOOK_STATE };
  }

  const globalEntries = Array.isArray(worldBooks.globalEntries)
    ? worldBooks.globalEntries.map((entry) => normalizeEntry(entry, 'global')).filter(Boolean)
    : [];
  const roleEntries = Array.isArray(worldBooks.roleEntries)
    ? worldBooks.roleEntries.map((entry) => normalizeEntry(entry, 'role')).filter((entry) => entry?.contactId)
    : [];
  const categories = Array.isArray(worldBooks.categories)
    ? worldBooks.categories.map((category) => normalizeCategory(category)).filter(Boolean)
    : [];
  const globalCategories = dedupeCategories([
    ...categories.filter((category) => category.scope === 'global'),
    ...(Array.isArray(worldBooks.globalCategories)
      ? worldBooks.globalCategories.map((category) => normalizeCategory(category, 'global')).filter(Boolean)
      : []),
  ]);
  const roleCategories = dedupeCategories([
    ...categories.filter((category) => category.scope === 'role'),
    ...(Array.isArray(worldBooks.roleCategories)
      ? worldBooks.roleCategories.map((category) => normalizeCategory(category, 'role')).filter(Boolean)
      : []),
  ]);

  return {
    globalEntries,
    roleEntries,
    globalCategories,
    roleCategories,
  };
}

export function createWorldBookCategory({ scope = 'global', name = '新分类' } = {}) {
  const normalizedScope = scope === 'role' ? 'role' : 'global';

  return {
    id: createWorldBookId(`${normalizedScope}-category`),
    scope: normalizedScope,
    name: name.trim() || '新分类',
    createdAt: new Date().toISOString(),
  };
}

export function createWorldBookEntry({
  scope = 'global',
  contactId = null,
  categoryId = null,
  title = '新世界书',
  content = '',
  enabled = true,
  triggerMode = 'always',
  keywords = [],
} = {}) {
  const normalizedScope = scope === 'role' ? 'role' : 'global';
  const now = new Date().toISOString();

  return {
    id: createWorldBookId(normalizedScope),
    scope: normalizedScope,
    contactId: normalizedScope === 'role' ? contactId : null,
    categoryId,
    title,
    content,
    enabled,
    triggerMode: triggerMode === 'keyword' ? 'keyword' : 'always',
    keywords: normalizeKeywords(keywords),
    createdAt: now,
    updatedAt: now,
  };
}

function isEntryActivated(entry, contextText = '') {
  if (entry.triggerMode !== 'keyword') return true;
  if (entry.keywords.length === 0) return false;

  const normalizedContext = contextText.toLocaleLowerCase();
  return entry.keywords.some((keyword) => normalizedContext.includes(keyword.toLocaleLowerCase()));
}

export function getWorldBookEntriesForContact(worldBooks, contact, contextText = '') {
  const normalizedWorldBooks = normalizeWorldBooks(worldBooks);
  const globalEntries = normalizedWorldBooks.globalEntries.filter(
    (entry) => entry.enabled && entry.content.trim() && isEntryActivated(entry, contextText)
  );
  const roleEntries = normalizedWorldBooks.roleEntries.filter(
    (entry) => entry.enabled && entry.contactId === contact?.id && entry.content.trim() && isEntryActivated(entry, contextText)
  );

  return {
    globalEntries,
    roleEntries,
    globalCategories: normalizedWorldBooks.globalCategories,
    roleCategories: normalizedWorldBooks.roleCategories,
  };
}

export function buildWorldBookPrompt(worldBooks, contact, contextText = '') {
  const { globalEntries, roleEntries, globalCategories, roleCategories } = getWorldBookEntriesForContact(
    worldBooks,
    contact,
    contextText
  );
  const globalCategoryMap = new Map(globalCategories.map((category) => [category.id, category.name]));
  const roleCategoryMap = new Map(roleCategories.map((category) => [category.id, category.name]));
  const formatEntry = (label, entry, categoryMap) => {
    const title = entry.title.trim() || '未命名世界书';
    const categoryName = entry.categoryId ? categoryMap.get(entry.categoryId) : '';
    const titleWithCategory = categoryName ? `${categoryName} / ${title}` : title;

    return [`[${label}：${titleWithCategory}]`, entry.content.trim()].join('\n');
  };
  const sections = [
    ...globalEntries.map((entry) => formatEntry('全局世界书', entry, globalCategoryMap)),
    ...roleEntries.map((entry) => formatEntry(`${contact?.name ?? '角色'}世界书`, entry, roleCategoryMap)),
  ];

  return sections.join('\n\n');
}
