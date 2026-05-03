import { useEffect, useState } from 'react';
import { ALL_CONTACTS_GROUP_ID } from '../data/contactModel.js';
import { Icon } from './Icon.jsx';

function setContactAvatarRef(contactAvatarRefs, contactId, node) {
  if (node) {
    contactAvatarRefs.current[contactId] = node;
  } else {
    delete contactAvatarRefs.current[contactId];
  }
}

function ContactGroupCreator({ onAddGroup }) {
  const [draftName, setDraftName] = useState('');

  const submitGroup = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;

    onAddGroup(name);
    setDraftName('');
  };

  return (
    <form className="contact-group-create" onSubmit={submitGroup}>
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        maxLength="10"
        placeholder="新分组"
        aria-label="新建好友分组"
      />
      <button type="submit" aria-label="添加好友分组" title="添加分组">
        <Icon name="plus" className="contact-group-add-icon" />
      </button>
    </form>
  );
}

export function ContactGroupBar({
  contacts,
  contactGroups,
  selectedContactGroupId,
  contactGroupCounts,
  isEditingGroups,
  editingGroupId,
  onSelectContactGroup,
  onStartGroupEdit,
  onCloseGroupEdit,
  onAddContactGroup,
}) {
  const getGroupCount = (groupId) => contactGroupCounts?.get(groupId) ?? 0;

  const getGroupChipClassName = (groupId, isSystemGroup = false) =>
    [
      'contact-group-chip',
      selectedContactGroupId === groupId ? 'is-active' : '',
      isEditingGroups ? 'is-editing' : '',
      editingGroupId === groupId ? 'is-managed' : '',
      isSystemGroup ? 'is-system' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const selectGroup = (groupId, isSystemGroup = false) => {
    onSelectContactGroup(groupId);
    if (isEditingGroups && !isSystemGroup) {
      onStartGroupEdit?.(groupId);
    }
  };

  return (
    <div className={isEditingGroups ? 'contact-group-bar is-editing' : 'contact-group-bar'} aria-label="好友分组">
      {isEditingGroups && <ContactGroupCreator onAddGroup={onAddContactGroup} />}

      <button
        type="button"
        className={isEditingGroups ? 'contact-group-chip contact-group-manage is-active' : 'contact-group-chip contact-group-manage'}
        aria-pressed={isEditingGroups}
        onClick={() => {
          if (isEditingGroups) {
            onCloseGroupEdit?.();
            return;
          }

          onStartGroupEdit?.(selectedContactGroupId);
        }}
      >
        <Icon name={isEditingGroups ? 'chevronDown' : 'settings'} className="contact-group-manage-icon" />
        {isEditingGroups ? '完成' : '管理'}
      </button>

      <button
        type="button"
        className={getGroupChipClassName(ALL_CONTACTS_GROUP_ID, true)}
        aria-pressed={selectedContactGroupId === ALL_CONTACTS_GROUP_ID}
        data-contact-group-id={ALL_CONTACTS_GROUP_ID}
        onClick={() => selectGroup(ALL_CONTACTS_GROUP_ID, true)}
      >
        全部
        <span className="contact-group-count">{contacts.length}</span>
      </button>

      {contactGroups.map((group) => (
        <button
          key={group.id}
          type="button"
          className={getGroupChipClassName(group.id)}
          aria-pressed={selectedContactGroupId === group.id}
          data-contact-group-id={group.id}
          onClick={() => selectGroup(group.id)}
        >
          {group.label}
          <span className="contact-group-count">{getGroupCount(group.id)}</span>
        </button>
      ))}
    </div>
  );
}

export function ContactGroupManager({
  group,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onRenameGroup,
  onDeleteGroup,
  onMoveGroup,
  onClose,
}) {
  const [draftName, setDraftName] = useState(group.label);

  useEffect(() => {
    setDraftName(group.label);
  }, [group.id, group.label]);

  const submitRename = (event) => {
    event.preventDefault();
    onRenameGroup(group.id, draftName);
  };

  return (
    <section className="contact-group-management" aria-label={`${group.label} 分组管理`}>
      <div className="contact-group-management-heading">
        <span>正在整理</span>
        <strong>{group.label}</strong>
      </div>

      <form className="contact-group-rename" onSubmit={submitRename}>
        <label>
          <span>分组名称</span>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength="10"
            aria-label="编辑分组名称"
          />
        </label>
        <button type="submit">保存</button>
      </form>

      <div className="contact-group-management-actions">
        <button
          type="button"
          className="contact-group-move"
          disabled={!canMoveLeft}
          onClick={() => onMoveGroup(group.id, -1)}
        >
          左移
        </button>
        <button
          type="button"
          className="contact-group-move"
          disabled={!canMoveRight}
          onClick={() => onMoveGroup(group.id, 1)}
        >
          右移
        </button>
        <button
          type="button"
          className="contact-group-delete"
          disabled={!canDelete}
          onClick={() => onDeleteGroup(group.id)}
        >
          删除分组
        </button>
        <button type="button" className="contact-group-done" onClick={onClose}>
          完成
        </button>
      </div>
    </section>
  );
}

export function BulkGroupPicker({
  contactGroups,
  selectedCount,
  onAddToGroup,
  onCreateGroup,
  onClose,
}) {
  const [draftName, setDraftName] = useState('');

  const submitGroup = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name || selectedCount === 0) return;

    onCreateGroup(name);
    setDraftName('');
  };

  return (
    <div className="bulk-group-picker-backdrop" onClick={onClose}>
      <section
        className="bulk-group-picker"
        aria-label="添加联系人到分组"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bulk-group-picker-header">
          <div>
            <h2>添加到分组</h2>
            <p>已选 {selectedCount} 个联系人</p>
          </div>
          <button type="button" className="bulk-group-picker-close" onClick={onClose} aria-label="关闭添加到分组">
            ×
          </button>
        </header>

        <div className="bulk-group-picker-list" aria-label="选择已有分组">
          {contactGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className="bulk-group-picker-option"
              disabled={selectedCount === 0}
              onClick={() => onAddToGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>

        <form className="bulk-group-picker-create" onSubmit={submitGroup}>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength="10"
            placeholder="新分组"
            aria-label="新建分组并加入"
          />
          <button type="submit" disabled={selectedCount === 0 || !draftName.trim()}>
            新建并加入
          </button>
        </form>
      </section>
    </div>
  );
}

export function ContactDock({
  contacts,
  visibleContactIndexes,
  selectedContactId,
  isContactWallExpanded,
  isPinnedContactFlow,
  isEditingContacts,
  draggingContactId,
  selectedBulkContactIds,
  confirmBulkDelete,
  canBulkAddToGroup,
  canBulkRemoveFromCurrentGroup,
  showDetailEntry,
  enableDetailView,
  contactsBarRef,
  contactAvatarRefs,
  onSortPointerDown,
  onStartLongPress,
  onCancelLongPress,
  onEnableEditing,
  onContactClick,
  onOpenContactDetail,
  onAddContact,
  onSelectAllVisibleContacts,
  onClearBulkSelection,
  onOpenBulkGroupPicker,
  onBulkRemoveFromCurrentGroup,
  onBulkDeleteContacts,
  onCloseEditing,
}) {
  const hasVisibleContacts = visibleContactIndexes.length > 0;
  const selectedBulkCount = selectedBulkContactIds?.size ?? 0;

  return (
    <div className={isContactWallExpanded ? 'contacts-bar is-wall-open' : 'contacts-bar'} ref={contactsBarRef}>
      {isEditingContacts && (
        <div className="contact-bulk-toolbar" aria-label="批量管理联系人">
          <span>{selectedBulkCount > 0 ? `已选 ${selectedBulkCount}` : '点选联系人'}</span>
          <button type="button" onClick={onSelectAllVisibleContacts}>
            全选
          </button>
          {canBulkAddToGroup && (
            <button type="button" disabled={selectedBulkCount === 0} onClick={onOpenBulkGroupPicker}>
              添加到分组
            </button>
          )}
          {canBulkRemoveFromCurrentGroup && (
            <button type="button" disabled={selectedBulkCount === 0} onClick={onBulkRemoveFromCurrentGroup}>
              移出本组
            </button>
          )}
          <button
            type="button"
            className={confirmBulkDelete ? 'is-danger-confirm' : ''}
            disabled={selectedBulkCount === 0}
            onClick={onBulkDeleteContacts}
          >
            {confirmBulkDelete ? '确认删除' : '删除'}
          </button>
          <button type="button" onClick={selectedBulkCount > 0 ? onClearBulkSelection : onCloseEditing}>
            {selectedBulkCount > 0 ? '取消选择' : '完成'}
          </button>
        </div>
      )}

      <div className="contacts-wall-scroll">
        {hasVisibleContacts || isEditingContacts ? (
          <div
            className={[
              'contacts-row',
              isContactWallExpanded ? 'is-wall' : '',
              isPinnedContactFlow ? 'is-pinned-flow' : '',
              isEditingContacts ? 'is-editing' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {visibleContactIndexes.map((index) => {
              const contact = contacts[index];
              const isSelected = selectedContactId === contact.id;
              const isDimmed = selectedContactId !== null && !isSelected;
              const isDragging = draggingContactId === contact.id;
              const isBulkSelected = selectedBulkContactIds?.has(contact.id);

              return (
                <div
                  key={contact.id}
                  className={[
                    'avatar-item',
                    isDragging ? 'is-dragging' : '',
                    isBulkSelected ? 'is-bulk-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--contact-view-name': `contact-${contact.id}` }}
                  data-contact-id={contact.id}
                >
                  <button
                    type="button"
                    className="avatar-button"
                    style={{ '--wiggle-delay': `${index * -0.07}s` }}
                    onPointerDown={(event) => {
                      if (isEditingContacts) {
                        onSortPointerDown(event, index);
                        return;
                      }
                      onStartLongPress();
                    }}
                    onPointerUp={onCancelLongPress}
                    onPointerLeave={onCancelLongPress}
                    onPointerCancel={onCancelLongPress}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      onEnableEditing();
                    }}
                    onClick={() => onContactClick(index, isSelected)}
                    aria-pressed={isSelected}
                    aria-label={
                      showDetailEntry && !isEditingContacts
                        ? `${isSelected ? '取消选择' : '查看'}${contact.name}的地图连线，${contact.location}`
                        : enableDetailView && !isEditingContacts
                          ? `查看${contact.name}的联系人信息，${contact.location}`
                          : `${isSelected ? '取消选择' : '选择'}${contact.name}，${contact.location}`
                    }
                  >
                    <span className={isSelected ? 'avatar-lift is-selected' : 'avatar-lift'}>
                      <span
                        ref={(node) => setContactAvatarRef(contactAvatarRefs, contact.id, node)}
                        className={isSelected ? 'avatar-frame is-selected' : 'avatar-frame'}
                      >
                        {contact.imageUrl ? (
                          <img className={isDimmed ? 'avatar-image is-dimmed' : 'avatar-image'} src={contact.imageUrl} alt="" />
                        ) : (
                          <span className={isDimmed ? 'avatar-placeholder is-dimmed' : 'avatar-placeholder'} aria-hidden="true">
                            {contact.name.slice(0, 1)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className={isSelected ? 'avatar-name is-selected' : 'avatar-name'}>{contact.name}</span>
                  </button>

                  {isEditingContacts && (
                    <span className={isBulkSelected ? 'avatar-select-mark is-active' : 'avatar-select-mark'} aria-hidden="true">
                      {isBulkSelected ? '✓' : ''}
                    </span>
                  )}

                  {showDetailEntry && isSelected && !isEditingContacts && (
                    <button
                      type="button"
                      className="avatar-detail-button"
                      onClick={() => onOpenContactDetail(contact)}
                      aria-label={`查看${contact.name}的联系人详情`}
                    >
                      详情
                      <Icon name="chevronRight" className="avatar-detail-icon" />
                    </button>
                  )}
                </div>
              );
            })}

            {isEditingContacts && (
              <div className="avatar-item avatar-add-item">
                <button type="button" className="avatar-button avatar-add-button" onClick={onAddContact} aria-label="新建联系人">
                  <span className="avatar-lift">
                    <span className="avatar-frame avatar-add-frame">
                      <Icon name="plus" className="avatar-add-icon" />
                    </span>
                  </span>
                  <span className="avatar-name">新建</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="contact-group-empty" onClick={onAddContact}>
            <Icon name="plus" className="contact-group-empty-icon" />
            当前分组暂无联系人
          </button>
        )}
      </div>

    </div>
  );
}
