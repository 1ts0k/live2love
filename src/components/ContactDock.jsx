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
  onSelectContactGroup,
  onStartGroupEdit,
  onCloseGroupEdit,
}) {
  const getGroupCount = (groupId) => contactGroupCounts?.get(groupId) ?? 0;

  const getGroupChipClassName = (groupId, isSystemGroup = false) =>
    [
      'contact-group-chip',
      selectedContactGroupId === groupId ? 'is-active' : '',
      isEditingGroups ? 'is-editing' : '',
      isSystemGroup ? 'is-system' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const selectGroup = (groupId) => {
    onSelectContactGroup(groupId);
  };

  return (
    <div className={isEditingGroups ? 'contact-group-bar is-editing' : 'contact-group-bar'} aria-label="好友分组">
      <button
        type="button"
        className={isEditingGroups ? 'contact-group-chip contact-group-manage is-active' : 'contact-group-chip contact-group-manage'}
        aria-pressed={isEditingGroups}
        aria-expanded={isEditingGroups}
        onClick={() => {
          if (isEditingGroups) {
            onCloseGroupEdit?.();
            return;
          }

          onStartGroupEdit?.(selectedContactGroupId);
        }}
      >
        管理
      </button>

      <button
        type="button"
        className={getGroupChipClassName(ALL_CONTACTS_GROUP_ID, true)}
        aria-pressed={selectedContactGroupId === ALL_CONTACTS_GROUP_ID}
        data-contact-group-id={ALL_CONTACTS_GROUP_ID}
        onClick={() => selectGroup(ALL_CONTACTS_GROUP_ID)}
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
  activeGroupId,
  contactGroups,
  contactGroupCounts,
  canDelete,
  draggingGroupId,
  onSelectGroup,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onGroupSortPointerDown,
  onClose,
}) {
  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    if (!renamingGroupId) return;

    const group = contactGroups.find((item) => item.id === renamingGroupId);
    if (!group) {
      setRenamingGroupId(null);
      setDraftName('');
    }
  }, [contactGroups, renamingGroupId]);

  useEffect(() => {
    if (!pendingDeleteGroupId) return;

    if (!contactGroups.some((item) => item.id === pendingDeleteGroupId)) {
      setPendingDeleteGroupId(null);
    }
  }, [contactGroups, pendingDeleteGroupId]);

  const startRename = (group) => {
    setPendingDeleteGroupId(null);
    setRenamingGroupId(group.id);
    setDraftName(group.label);
  };

  const submitRename = (event, groupId) => {
    event.preventDefault();
    onRenameGroup(groupId, draftName);
    setPendingDeleteGroupId(null);
    setRenamingGroupId(null);
    setDraftName('');
  };

  const selectGroup = (groupId) => {
    setPendingDeleteGroupId(null);
    onSelectGroup(groupId);
  };

  const startGroupSort = (event, groupId) => {
    setPendingDeleteGroupId(null);
    onGroupSortPointerDown(event, groupId);
  };

  const deleteGroup = (groupId) => {
    if (!canDelete) return;

    if (pendingDeleteGroupId !== groupId) {
      setPendingDeleteGroupId(groupId);
      return;
    }

    setPendingDeleteGroupId(null);
    onDeleteGroup(groupId);
  };

  return (
    <div className="contact-group-management-backdrop" onClick={onClose}>
      <section className="contact-group-management" aria-label="好友分组管理" onClick={(event) => event.stopPropagation()}>
        <header className="contact-group-management-header">
          <div>
            <h2>管理分组</h2>
            <p>拖动右侧把手调整顺序</p>
          </div>
          <button type="button" className="contact-group-management-close" onClick={onClose} aria-label="关闭分组管理">
            ×
          </button>
        </header>

        <ContactGroupCreator onAddGroup={onAddGroup} />

        <div className="contact-group-management-list" aria-label="分组列表">
          {contactGroups.map((group) => {
            const isRenaming = renamingGroupId === group.id;
            const isActive = activeGroupId === group.id;
            const isDragging = draggingGroupId === group.id;
            const isConfirmingDelete = pendingDeleteGroupId === group.id;
            const count = contactGroupCounts?.get(group.id) ?? 0;

            return (
              <div
                key={group.id}
                className={[
                  'contact-group-management-row',
                  isActive ? 'is-active' : '',
                  isDragging ? 'is-dragging' : '',
                  isConfirmingDelete ? 'is-confirming-delete' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-managed-contact-group-id={group.id}
              >
                <div className="contact-group-row-main">
                  {isRenaming ? (
                    <form className="contact-group-row-edit" onSubmit={(event) => submitRename(event, group.id)}>
                      <input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        maxLength="10"
                        autoFocus
                        aria-label={`编辑${group.label}分组名称`}
                      />
                      <button type="submit">保存</button>
                    </form>
                  ) : (
                    <button type="button" className="contact-group-row-select" onClick={() => selectGroup(group.id)}>
                      <span>{group.label}</span>
                      <small>{count}</small>
                    </button>
                  )}
                  {isConfirmingDelete && !isRenaming && (
                    <span className="contact-group-delete-hint">
                      再点一次“确认删除”。只删除分组，不删除联系人。
                    </span>
                  )}
                </div>

                <div className="contact-group-row-actions">
                  <button
                    type="button"
                    className="contact-group-icon-button"
                    onClick={() => startRename(group)}
                    aria-label={`编辑${group.label}分组名称`}
                  >
                    <Icon name="pencil" className="contact-group-action-icon" />
                  </button>
                  <button
                    type="button"
                    className={
                      isConfirmingDelete
                        ? 'contact-group-icon-button is-danger is-confirming'
                        : 'contact-group-icon-button is-danger'
                    }
                    disabled={!canDelete}
                    onClick={() => deleteGroup(group.id)}
                    aria-label={isConfirmingDelete ? `确认删除${group.label}分组` : `删除${group.label}分组`}
                  >
                    {isConfirmingDelete ? (
                      <span className="contact-group-confirm-label">确认删除</span>
                    ) : (
                      <Icon name="trash" className="contact-group-action-icon" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="contact-group-sort-handle"
                    onPointerDown={(event) => startGroupSort(event, group.id)}
                    aria-label={`拖动${group.label}排序`}
                    title="拖动排序"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                </div>
              </div>
            );
          })}
          {contactGroups.length === 0 && (
            <div className="contact-group-management-empty">
              只剩“全部”。新建分组后可以继续整理联系人。
            </div>
          )}
        </div>

        <button type="button" className="contact-group-done" onClick={onClose}>
          完成
        </button>
      </section>
    </div>
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
