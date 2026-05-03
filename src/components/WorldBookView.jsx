import { useEffect, useMemo, useState } from 'react';
import { createWorldBookCategory, createWorldBookEntry, normalizeWorldBooks } from '../data/worldBook.js';
import { Icon } from './Icon.jsx';

const ALL_CATEGORY_ID = 'all';
const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';

function getInitial(name) {
  return Array.from(name.trim())[0] ?? '?';
}

function getEntryCountLabel(count) {
  return count > 99 ? '99+' : String(count);
}

function splitKeywordInput(value) {
  return value
    .split(/[,\n，、;；|]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function getCategoryEntryCount(entries, categoryId) {
  if (categoryId === ALL_CATEGORY_ID) return entries.length;
  if (categoryId === UNCATEGORIZED_CATEGORY_ID) return entries.filter((entry) => !entry.categoryId).length;
  return entries.filter((entry) => entry.categoryId === categoryId).length;
}

function filterEntriesByCategory(entries, categoryId) {
  if (categoryId === ALL_CATEGORY_ID) return entries;
  if (categoryId === UNCATEGORIZED_CATEGORY_ID) return entries.filter((entry) => !entry.categoryId);
  return entries.filter((entry) => entry.categoryId === categoryId);
}

function getCategoryIdForNewEntry(categoryId) {
  return categoryId !== ALL_CATEGORY_ID && categoryId !== UNCATEGORIZED_CATEGORY_ID ? categoryId : null;
}

function KeywordInput({ entry, onPatchEntry, classNamePrefix }) {
  const [value, setValue] = useState(() => entry.keywords.join('，'));
  const keywordKey = entry.keywords.join('\u0001');

  useEffect(() => {
    setValue(entry.keywords.join('，'));
  }, [entry.id, keywordKey]);

  const commitKeywords = () => {
    onPatchEntry(entry.id, { keywords: splitKeywordInput(value) });
  };

  return (
    <label className={`${classNamePrefix}-keywords-field`}>
      <span>关键词</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commitKeywords}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        placeholder="用逗号分隔，如 王都，契约"
        aria-label={`${entry.title || '世界书'}关键词`}
      />
    </label>
  );
}

function WorldBookCategoryBar({ categories, entries, activeCategoryId, onSelectCategory, onAddCategory }) {
  const [draftName, setDraftName] = useState('');

  const submitCategory = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;

    onAddCategory(name);
    setDraftName('');
  };

  return (
    <div className="worldbook-category-bar" aria-label="世界书分类">
      <div className="worldbook-category-scroll">
        <button
          type="button"
          className={activeCategoryId === ALL_CATEGORY_ID ? 'worldbook-category-chip is-active' : 'worldbook-category-chip'}
          onClick={() => onSelectCategory(ALL_CATEGORY_ID)}
        >
          全部
          <span>{getEntryCountLabel(entries.length)}</span>
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeCategoryId === category.id ? 'worldbook-category-chip is-active' : 'worldbook-category-chip'}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
            <span>{getEntryCountLabel(getCategoryEntryCount(entries, category.id))}</span>
          </button>
        ))}
      </div>

      <form className="worldbook-category-form" onSubmit={submitCategory}>
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          maxLength="18"
          placeholder="新分类"
          aria-label="新建世界书分类"
        />
        <button type="submit" aria-label="添加分类" title="添加分类">
          <Icon name="plus" className="worldbook-category-icon" />
        </button>
      </form>
    </div>
  );
}

function WorldBookEntryList({ entries, categories, emptyLabel, onAdd, onPatchEntry, onDeleteEntry }) {
  const [expandedEntryIds, setExpandedEntryIds] = useState(() => new Set());

  const toggleEntry = (entryId) => {
    setExpandedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  return (
    <div className="worldbook-entry-list">
      {entries.length > 0 ? (
        entries.map((entry) => {
          const isExpanded = expandedEntryIds.has(entry.id);
          const entryClassName = [
            'worldbook-entry',
            entry.enabled ? 'is-enabled' : '',
            isExpanded ? 'is-expanded' : '',
          ]
            .filter(Boolean)
            .join(' ');

            return (
          <article key={entry.id} className={entryClassName}>
            <div className="worldbook-entry-top">
              <label className="worldbook-switch" aria-label={entry.enabled ? '关闭世界书' : '开启世界书'}>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(event) => onPatchEntry(entry.id, { enabled: event.target.checked })}
                />
                <span aria-hidden="true" />
              </label>

              <input
                className="worldbook-title-input"
                value={entry.title}
                onChange={(event) => onPatchEntry(entry.id, { title: event.target.value })}
                maxLength="36"
                aria-label="世界书标题"
              />

              <button
                type="button"
                className="worldbook-expand-button"
                onClick={() => toggleEntry(entry.id)}
                aria-label={isExpanded ? '收起世界书' : '展开世界书'}
                aria-expanded={isExpanded}
                title={isExpanded ? '收起' : '展开'}
              >
                <Icon name="chevronDown" className="worldbook-expand-icon" />
              </button>

              <button
                type="button"
                className="worldbook-icon-button"
                onClick={() => onDeleteEntry(entry.id)}
                aria-label="删除世界书"
                title="删除"
              >
                <Icon name="trash" className="worldbook-button-icon" />
              </button>
            </div>

            {isExpanded && (
              <>
                <div className="worldbook-entry-meta">
                  <label className="worldbook-entry-field">
                    <span>分类</span>
                    <select
                      value={entry.categoryId ?? ''}
                      onChange={(event) => onPatchEntry(entry.id, { categoryId: event.target.value || null })}
                      aria-label={`${entry.title || '世界书'}分类`}
                    >
                      <option value="">未分类</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="worldbook-trigger-control" role="group" aria-label={`${entry.title || '世界书'}触发方式`}>
                    <button
                      type="button"
                      className={
                        entry.triggerMode === 'keyword' ? 'worldbook-trigger-button' : 'worldbook-trigger-button is-active'
                      }
                      onClick={() => onPatchEntry(entry.id, { triggerMode: 'always' })}
                    >
                      常驻有效
                    </button>
                    <button
                      type="button"
                      className={
                        entry.triggerMode === 'keyword' ? 'worldbook-trigger-button is-active' : 'worldbook-trigger-button'
                      }
                      onClick={() => onPatchEntry(entry.id, { triggerMode: 'keyword' })}
                    >
                      关键词触发
                    </button>
                  </div>
                </div>

                {entry.triggerMode === 'keyword' && (
                  <KeywordInput entry={entry} onPatchEntry={onPatchEntry} classNamePrefix="worldbook" />
                )}

                <textarea
                  className="worldbook-content-input"
                  value={entry.content}
                  onChange={(event) => onPatchEntry(entry.id, { content: event.target.value })}
                  placeholder="写入世界背景、关系、禁忌、口癖、事件线索..."
                  rows="5"
                  aria-label={`${entry.title || '世界书'}内容`}
                />
              </>
            )}
          </article>
          );
        })
      ) : (
        <div className="worldbook-empty">
          <p>{emptyLabel}</p>
          <button type="button" className="worldbook-empty-action" onClick={onAdd}>
            <Icon name="plus" className="worldbook-action-icon" />
            新建
          </button>
        </div>
      )}
    </div>
  );
}

export function WorldBookView({ contacts, worldBooks, onWorldBooksChange, onCloseApp }) {
  const [activeTab, setActiveTab] = useState('global');
  const [activeCategoryIds, setActiveCategoryIds] = useState({
    global: ALL_CATEGORY_ID,
    role: ALL_CATEGORY_ID,
  });
  const [selectedContactId, setSelectedContactId] = useState(() => contacts[0]?.id ?? null);
  const normalizedWorldBooks = useMemo(() => normalizeWorldBooks(worldBooks), [worldBooks]);
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? contacts[0] ?? null;
  const selectedRoleEntries = selectedContact
    ? normalizedWorldBooks.roleEntries.filter((entry) => entry.contactId === selectedContact.id)
    : [];
  const globalEntries = filterEntriesByCategory(
    normalizedWorldBooks.globalEntries,
    activeCategoryIds.global
  );
  const roleEntries = filterEntriesByCategory(selectedRoleEntries, activeCategoryIds.role);
  const roleEntryCounts = useMemo(() => {
    const counts = new Map();
    normalizedWorldBooks.roleEntries.forEach((entry) => {
      counts.set(entry.contactId, (counts.get(entry.contactId) ?? 0) + 1);
    });
    return counts;
  }, [normalizedWorldBooks.roleEntries]);
  const enabledGlobalCount = normalizedWorldBooks.globalEntries.filter((entry) => entry.enabled).length;
  const enabledRoleContactCount = new Set(
    normalizedWorldBooks.roleEntries.filter((entry) => entry.enabled).map((entry) => entry.contactId)
  ).size;
  const enabledStatusText =
    activeTab === 'global' ? `${enabledGlobalCount} 本已启用` : `${enabledRoleContactCount} 个角色已启用`;

  useEffect(() => {
    if (contacts.length === 0) {
      setSelectedContactId(null);
      return;
    }

    if (!selectedContactId || !contacts.some((contact) => contact.id === selectedContactId)) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  const selectCategory = (scope, categoryId) => {
    setActiveCategoryIds((current) => ({
      ...current,
      [scope]: categoryId,
    }));
  };

  const patchEntry = (scope, entryId, patch) => {
    onWorldBooksChange((current) => {
      const normalized = normalizeWorldBooks(current);
      const key = scope === 'role' ? 'roleEntries' : 'globalEntries';

      return {
        ...normalized,
        [key]: normalized[key].map((entry) =>
          entry.id === entryId ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
        ),
      };
    });
  };

  const deleteEntry = (scope, entryId) => {
    onWorldBooksChange((current) => {
      const normalized = normalizeWorldBooks(current);
      const key = scope === 'role' ? 'roleEntries' : 'globalEntries';

      return {
        ...normalized,
        [key]: normalized[key].filter((entry) => entry.id !== entryId),
      };
    });
  };

  const addCategory = (scope, name) => {
    const category = createWorldBookCategory({ scope, name });
    const key = scope === 'role' ? 'roleCategories' : 'globalCategories';
    const existingCategory = normalizedWorldBooks[key].find((item) => item.name === category.name);

    if (existingCategory) {
      selectCategory(scope, existingCategory.id);
      return;
    }

    onWorldBooksChange((current) => {
      const normalized = normalizeWorldBooks(current);

      return {
        ...normalized,
        [key]: [...normalized[key], category],
      };
    });

    selectCategory(scope, category.id);
  };

  const addGlobalEntry = () => {
    onWorldBooksChange((current) => {
      const normalized = normalizeWorldBooks(current);
      const nextIndex = normalized.globalEntries.length + 1;

      return {
        ...normalized,
        globalEntries: [
          createWorldBookEntry({
            scope: 'global',
            categoryId: getCategoryIdForNewEntry(activeCategoryIds.global),
            title: nextIndex === 1 ? '全局世界书' : `全局世界书 ${nextIndex}`,
          }),
          ...normalized.globalEntries,
        ],
      };
    });
  };

  const addRoleEntry = () => {
    if (!selectedContact) return;

    onWorldBooksChange((current) => {
      const normalized = normalizeWorldBooks(current);
      const contactEntryCount = normalized.roleEntries.filter((entry) => entry.contactId === selectedContact.id).length;

      return {
        ...normalized,
        roleEntries: [
          createWorldBookEntry({
            scope: 'role',
            contactId: selectedContact.id,
            categoryId: getCategoryIdForNewEntry(activeCategoryIds.role),
            title: contactEntryCount === 0 ? `${selectedContact.name} 世界书` : `${selectedContact.name} 世界书 ${contactEntryCount + 1}`,
          }),
          ...normalized.roleEntries,
        ],
      };
    });
  };

  return (
    <section className="worldbook-view" aria-label="世界书">
      <header className="worldbook-header">
        <div className="worldbook-header-title">
          {onCloseApp && (
            <button
              type="button"
              className="worldbook-back-button"
              onClick={onCloseApp}
              aria-label="返回手机桌面"
              title="返回桌面"
            >
              <Icon name="arrowLeft" className="worldbook-back-icon" />
            </button>
          )}
          <h1>世界书</h1>
        </div>
        <span className="worldbook-status">{enabledStatusText}</span>
      </header>

      <div className="worldbook-tabs" role="tablist" aria-label="世界书范围">
        <button
          type="button"
          role="tab"
          className={activeTab === 'global' ? 'worldbook-tab is-active' : 'worldbook-tab'}
          aria-selected={activeTab === 'global'}
          onClick={() => setActiveTab('global')}
        >
          全局世界书
          <span>{getEntryCountLabel(enabledGlobalCount)}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={activeTab === 'role' ? 'worldbook-tab is-active' : 'worldbook-tab'}
          aria-selected={activeTab === 'role'}
          onClick={() => setActiveTab('role')}
        >
          角色世界书
          <span>{getEntryCountLabel(enabledRoleContactCount)}</span>
        </button>
      </div>

      {activeTab === 'global' && (
        <section className="worldbook-panel" aria-label="全局世界书">
          <div className="worldbook-panel-heading">
            <div>
              <h2>全局</h2>
            </div>
            <button type="button" className="worldbook-add-button" onClick={addGlobalEntry}>
              <Icon name="plus" className="worldbook-action-icon" />
              新建
            </button>
          </div>

          <WorldBookCategoryBar
            categories={normalizedWorldBooks.globalCategories}
            entries={normalizedWorldBooks.globalEntries}
            activeCategoryId={activeCategoryIds.global}
            onSelectCategory={(categoryId) => selectCategory('global', categoryId)}
            onAddCategory={(name) => addCategory('global', name)}
          />

          <WorldBookEntryList
            entries={globalEntries}
            categories={normalizedWorldBooks.globalCategories}
            emptyLabel="暂无全局世界书"
            onAdd={addGlobalEntry}
            onPatchEntry={(entryId, patch) => patchEntry('global', entryId, patch)}
            onDeleteEntry={(entryId) => deleteEntry('global', entryId)}
          />
        </section>
      )}

      {activeTab === 'role' && (
        <section className="worldbook-panel worldbook-role-panel" aria-label="角色世界书">
          <div className="worldbook-contact-strip" aria-label="角色标签">
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const entryCount = roleEntryCounts.get(contact.id) ?? 0;

              return (
                <button
                  key={contact.id}
                  type="button"
                  className={isSelected ? 'worldbook-contact-chip is-active' : 'worldbook-contact-chip'}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <span className="worldbook-contact-avatar" aria-hidden="true">
                    {contact.imageUrl ? <img src={contact.imageUrl} alt="" /> : getInitial(contact.name)}
                  </span>
                  <span className="worldbook-contact-name">{contact.name}</span>
                  {entryCount > 0 && <span className="worldbook-contact-count">{getEntryCountLabel(entryCount)}</span>}
                </button>
              );
            })}
          </div>

          {selectedContact ? (
            <>
              <div className="worldbook-panel-heading worldbook-role-heading">
                <div>
                  <h2>{selectedContact.name}</h2>
                  <span>ID {selectedContact.id}</span>
                </div>
                <button type="button" className="worldbook-add-button" onClick={addRoleEntry}>
                  <Icon name="plus" className="worldbook-action-icon" />
                  新建
                </button>
              </div>

              <WorldBookCategoryBar
                categories={normalizedWorldBooks.roleCategories}
                entries={selectedRoleEntries}
                activeCategoryId={activeCategoryIds.role}
                onSelectCategory={(categoryId) => selectCategory('role', categoryId)}
                onAddCategory={(name) => addCategory('role', name)}
              />

              <WorldBookEntryList
                entries={roleEntries}
                categories={normalizedWorldBooks.roleCategories}
                emptyLabel={`${selectedContact.name} 暂无世界书`}
                onAdd={addRoleEntry}
                onPatchEntry={(entryId, patch) => patchEntry('role', entryId, patch)}
                onDeleteEntry={(entryId) => deleteEntry('role', entryId)}
              />
            </>
          ) : (
            <div className="worldbook-empty">
              <p>暂无角色标签</p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
