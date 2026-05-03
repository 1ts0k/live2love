import { useEffect, useState } from 'react';
import { getContactGroupIds, normalizeContactGroupIds } from '../data/contactModel.js';
import { Icon } from './Icon.jsx';

function getDefaultDetailProfile(contact) {
  return {
    nickname: contact.name,
    remarkName: contact.name,
    roleSetting: '',
    patText: '拍了拍你',
    minimaxVoiceId: '',
    worldBook: '',
    myPersona: '',
    chatAvatarUrl: contact.imageUrl ?? '',
    showRead: true,
    showAvatar: true,
  };
}

function getInitial(name) {
  return Array.from(name.trim())[0] ?? '?';
}

function splitKeywordInput(value) {
  return value
    .split(/[,\n，、;；|]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function ContactRoleKeywordInput({ contact, entry, onPatchEntry }) {
  const [value, setValue] = useState(() => entry.keywords.join('，'));
  const keywordKey = entry.keywords.join('\u0001');

  useEffect(() => {
    setValue(entry.keywords.join('，'));
  }, [entry.id, keywordKey]);

  const commitKeywords = () => {
    onPatchEntry(entry.id, { keywords: splitKeywordInput(value) });
  };

  return (
    <label className="contact-role-worldbook-keywords">
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
        placeholder={`触发 ${contact.name} 的词`}
        aria-label={`${entry.title || '世界书'}关键词`}
      />
    </label>
  );
}

function ContactGroupPicker({ contact, contactGroups, onGroupsChange }) {
  const selectedGroupIds = getContactGroupIds(contact, contactGroups);
  const toggleGroup = (groupId) => {
    const nextGroupIds = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((item) => item !== groupId)
      : [...selectedGroupIds, groupId];

    onGroupsChange?.(normalizeContactGroupIds(nextGroupIds.length > 0 ? nextGroupIds : [groupId], contactGroups));
  };

  return (
    <section className="contact-profile-field contact-profile-field-wide">
      <span>好友分组</span>
      <div className="contact-group-picker">
        {contactGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={selectedGroupIds.includes(group.id) ? 'contact-group-option is-active' : 'contact-group-option'}
            aria-pressed={selectedGroupIds.includes(group.id)}
            onClick={() => toggleGroup(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ContactRoleCategoryForm({ onAddCategory }) {
  const [draftName, setDraftName] = useState('');

  const submitCategory = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;

    onAddCategory(name);
    setDraftName('');
  };

  return (
    <form className="contact-role-worldbook-category-form" onSubmit={submitCategory}>
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        maxLength="18"
        placeholder="新分类"
        aria-label="新建角色世界书分类"
      />
      <button type="submit" aria-label="添加角色世界书分类" title="添加分类">
        <Icon name="plus" className="contact-role-worldbook-icon" />
      </button>
    </form>
  );
}

function ContactRoleWorldBookSection({
  contact,
  entries,
  categories = [],
  onAddEntry,
  onAddCategory,
  onPatchEntry,
  onDeleteEntry,
}) {
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
    <section className="contact-profile-field contact-profile-field-wide contact-role-worldbook">
      <div className="contact-role-worldbook-heading">
        <span>角色世界书</span>
        <button type="button" onClick={onAddEntry}>
          <Icon name="plus" className="contact-role-worldbook-icon" />
          新建
        </button>
      </div>

      <ContactRoleCategoryForm onAddCategory={onAddCategory} />

      {entries.length > 0 ? (
        <div className="contact-role-worldbook-list">
          {entries.map((entry) => {
            const isExpanded = expandedEntryIds.has(entry.id);
            const entryClassName = [
              'contact-role-worldbook-entry',
              entry.enabled ? 'is-enabled' : '',
              isExpanded ? 'is-expanded' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
            <article key={entry.id} className={entryClassName}>
              <div className="contact-role-worldbook-row">
                <label className="contact-role-worldbook-switch" aria-label={entry.enabled ? '关闭世界书' : '开启世界书'}>
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(event) => onPatchEntry(entry.id, { enabled: event.target.checked })}
                  />
                  <span aria-hidden="true" />
                </label>

                <input
                  value={entry.title}
                  onChange={(event) => onPatchEntry(entry.id, { title: event.target.value })}
                  maxLength="36"
                  aria-label="世界书标题"
                />

                <button
                  type="button"
                  className="contact-role-worldbook-expand"
                  onClick={() => toggleEntry(entry.id)}
                  aria-label={isExpanded ? '收起世界书' : '展开世界书'}
                  aria-expanded={isExpanded}
                  title={isExpanded ? '收起' : '展开'}
                >
                  <Icon name="chevronDown" className="contact-role-worldbook-expand-icon" />
                </button>

                <button
                  type="button"
                  className="contact-role-worldbook-delete"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label="删除世界书"
                  title="删除"
                >
                  <Icon name="trash" className="contact-role-worldbook-delete-icon" />
                </button>
              </div>

              {isExpanded && (
                <>
                  <div className="contact-role-worldbook-meta">
                    <label>
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

                    <div className="contact-role-worldbook-trigger" role="group" aria-label={`${entry.title || '世界书'}触发方式`}>
                      <button
                        type="button"
                        className={
                          entry.triggerMode === 'keyword'
                            ? 'contact-role-worldbook-trigger-button'
                            : 'contact-role-worldbook-trigger-button is-active'
                        }
                        onClick={() => onPatchEntry(entry.id, { triggerMode: 'always' })}
                      >
                        常驻有效
                      </button>
                      <button
                        type="button"
                        className={
                          entry.triggerMode === 'keyword'
                            ? 'contact-role-worldbook-trigger-button is-active'
                            : 'contact-role-worldbook-trigger-button'
                        }
                        onClick={() => onPatchEntry(entry.id, { triggerMode: 'keyword' })}
                      >
                        关键词触发
                      </button>
                    </div>
                  </div>

                  {entry.triggerMode === 'keyword' && (
                    <ContactRoleKeywordInput contact={contact} entry={entry} onPatchEntry={onPatchEntry} />
                  )}

                  <textarea
                    value={entry.content}
                    onChange={(event) => onPatchEntry(entry.id, { content: event.target.value })}
                    rows="3"
                    placeholder={`${contact.name} 的世界设定`}
                    aria-label={`${entry.title || '世界书'}内容`}
                  />
                </>
              )}
            </article>
            );
          })}
        </div>
      ) : (
        <button type="button" className="contact-role-worldbook-empty" onClick={onAddEntry}>
          为 {contact.name} 新建角色世界书
        </button>
      )}
    </section>
  );
}

export function ContactDetail({
  contact,
  avatarRef,
  mapSlot,
  contactGroups = [],
  roleWorldBookEntries = [],
  roleWorldBookCategories = [],
  onBack,
  onDetailChange,
  onGroupsChange,
  onDeleteContact,
  onAddRoleWorldBookEntry = () => {},
  onAddRoleWorldBookCategory = () => {},
  onPatchRoleWorldBookEntry = () => {},
  onDeleteRoleWorldBookEntry = () => {},
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const detailProfile = {
    ...getDefaultDetailProfile(contact),
    ...contact.detailProfile,
  };

  const updateDetailField = (field, value) => {
    onDetailChange?.({
      ...detailProfile,
      [field]: value,
    });
  };

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [contact.id]);

  return (
    <section
      className="contact-detail-view"
      style={{ '--contact-view-name': `contact-${contact.id}` }}
      aria-label={`${contact.name} 的联系人信息`}
    >
      <div className="contact-detail-scroll">
        <header className="contact-detail-nav">
          <button type="button" className="contact-detail-back" onClick={onBack} aria-label="返回联系人地图" title="返回">
            <Icon name="arrowLeft" className="contact-detail-back-icon" />
          </button>
          <button
            type="button"
            className={isConfirmingDelete ? 'contact-detail-delete is-confirming' : 'contact-detail-delete'}
            aria-label={isConfirmingDelete ? `确认删除${contact.name}` : `删除${contact.name}`}
            onClick={() => {
              if (!isConfirmingDelete) {
                setIsConfirmingDelete(true);
                return;
              }

              onDeleteContact?.();
            }}
          >
            {isConfirmingDelete ? '确认删除' : '删除好友'}
          </button>
        </header>

        <div className="contact-detail-map-card" aria-label={`${contact.placeLabel}地图`}>
          {mapSlot}
        </div>

        <div className="contact-detail-hero">
          <span ref={avatarRef} className="contact-detail-avatar-large">
            {contact.imageUrl ? <img src={contact.imageUrl} alt="" /> : <span>{getInitial(contact.name)}</span>}
          </span>

          <div className="contact-detail-heading">
            <h2>{contact.name}</h2>
          </div>
        </div>

        <section className="contact-profile-editor" aria-label="联系人可编辑信息">
          <div className="contact-profile-grid">
            <label className="contact-profile-field">
              <span>昵称</span>
              <input
                value={detailProfile.nickname}
                onChange={(event) => updateDetailField('nickname', event.target.value)}
                maxLength="24"
              />
            </label>

            <label className="contact-profile-field">
              <span>备注名</span>
              <input
                value={detailProfile.remarkName}
                onChange={(event) => updateDetailField('remarkName', event.target.value)}
                maxLength="24"
              />
            </label>

            <label className="contact-profile-field contact-profile-field-wide">
              <span>角色设定</span>
              <textarea
                value={detailProfile.roleSetting}
                onChange={(event) => updateDetailField('roleSetting', event.target.value)}
                rows="3"
              />
            </label>

            <ContactGroupPicker contact={contact} contactGroups={contactGroups} onGroupsChange={onGroupsChange} />

            <label className="contact-profile-field">
              <span>拍一拍</span>
              <input
                value={detailProfile.patText}
                onChange={(event) => updateDetailField('patText', event.target.value)}
                maxLength="36"
              />
            </label>

            <label className="contact-profile-field">
              <span>MiniMax音色ID</span>
              <input
                value={detailProfile.minimaxVoiceId}
                onChange={(event) => updateDetailField('minimaxVoiceId', event.target.value)}
                maxLength="64"
              />
            </label>

            <ContactRoleWorldBookSection
              contact={contact}
              entries={roleWorldBookEntries}
              categories={roleWorldBookCategories}
              onAddEntry={onAddRoleWorldBookEntry}
              onAddCategory={onAddRoleWorldBookCategory}
              onPatchEntry={onPatchRoleWorldBookEntry}
              onDeleteEntry={onDeleteRoleWorldBookEntry}
            />

            <label className="contact-profile-field contact-profile-field-wide">
              <span>我的人设</span>
              <textarea
                value={detailProfile.myPersona}
                onChange={(event) => updateDetailField('myPersona', event.target.value)}
                rows="3"
              />
            </label>

            <label className="contact-profile-field contact-profile-field-wide">
              <span>我在聊天中的头像</span>
              <input
                value={detailProfile.chatAvatarUrl}
                onChange={(event) => updateDetailField('chatAvatarUrl', event.target.value)}
                placeholder="头像图片 URL"
              />
            </label>

            <label className="contact-profile-toggle">
              <span>显示已读</span>
              <input
                type="checkbox"
                checked={detailProfile.showRead}
                onChange={(event) => updateDetailField('showRead', event.target.checked)}
              />
            </label>

            <label className="contact-profile-toggle">
              <span>显示头像</span>
              <input
                type="checkbox"
                checked={detailProfile.showAvatar}
                onChange={(event) => updateDetailField('showAvatar', event.target.checked)}
              />
            </label>
          </div>
        </section>
      </div>
    </section>
  );
}
