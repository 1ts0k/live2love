import { useEffect, useMemo, useRef, useState } from 'react';
import { HomeWallpaper } from '../components/Backdrops.jsx';
import { ContactDetail } from '../components/ContactDetail.jsx';
import { BulkGroupPicker, ContactDock, ContactGroupBar, ContactGroupManager } from '../components/ContactDock.jsx';
import { ContactEditorSheet } from '../components/ContactEditorSheet.jsx';
import { MessagesView } from '../components/MessagesView.jsx';
import { PixelWorldMap } from '../components/PixelWorldMap.jsx';
import { SettingsView } from '../components/SettingsView.jsx';
import { WorldBookView } from '../components/WorldBookView.jsx';
import { createInitialThreads } from '../data/messages.js';
import {
  DEFAULT_WORLD_BOOK_STATE,
  createWorldBookCategory,
  createWorldBookEntry,
  normalizeWorldBooks,
} from '../data/worldBook.js';
import {
  ALL_CONTACTS_GROUP_ID,
  CITY_PRESETS,
  COMPACT_CONTACT_LIMIT,
  DEFAULT_CONTACT_GROUP_ID,
  DEFAULT_CONTACT_GROUPS,
  INITIAL_CONTACTS,
  createContactGroup,
  createContactDraft,
  createNewContact,
  getContactGroupIds,
  hasContactGroup,
  normalizeContactGroups,
  normalizeContactGroupIds,
} from '../data/contactModel.js';
import { DEFAULT_API_SETTINGS } from '../services/llmClient.js';
import {
  loadLocalState,
  saveApiSettings,
  saveContactGroups,
  saveContacts,
  saveThreads,
  saveWorldBooks,
} from '../services/localBackend.js';
import { AppMenuBar } from '../shell/AppMenuBar.jsx';
import { runViewTransition } from '../utils/viewTransition.js';

const MENU_ITEMS = [
  { id: 'messages', label: '消息', icon: 'message' },
  { id: 'contacts', label: '联系人', icon: 'map' },
  { id: 'memory', label: '记忆', icon: 'bookmark', disabled: true },
  { id: 'settings', label: '设置', icon: 'settings' },
];

const LONG_PRESS_MS = 520;
const MAP_CONNECTION_TRANSITION_MS = 560;
const USE_COMPACT_CONTACT_ROW = true;
const ENABLE_CONTACT_DETAIL_VIEW = true;
const USE_EXPLICIT_CONTACT_DETAIL_ENTRY = true;

function isEditableTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

export function Live2LoveApp({ initialApp = 'messages', activeApp: controlledActiveApp, onChangeApp, onCloseApp }) {
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [contactGroups, setContactGroups] = useState(DEFAULT_CONTACT_GROUPS);
  const [threads, setThreads] = useState(createInitialThreads);
  const [apiSettings, setApiSettings] = useState(DEFAULT_API_SETTINGS);
  const [worldBooks, setWorldBooks] = useState(DEFAULT_WORLD_BOOK_STATE);
  const [storageStatus, setStorageStatus] = useState({ isReady: false, error: '' });
  const [localActiveApp, setLocalActiveApp] = useState(initialApp);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactGroupId, setSelectedContactGroupId] = useState(ALL_CONTACTS_GROUP_ID);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [activeContactId, setActiveContactId] = useState(null);
  const [contactDetailReturnThreadId, setContactDetailReturnThreadId] = useState(null);
  const [showUserConnection, setShowUserConnection] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [isContactWallOpen, setIsContactWallOpen] = useState(false);
  const [mapConnectionTransition, setMapConnectionTransition] = useState(null);
  const [selectedBulkContactIds, setSelectedBulkContactIds] = useState(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkGroupPickerOpen, setIsBulkGroupPickerOpen] = useState(false);
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [draggingContactId, setDraggingContactId] = useState(null);
  const [draggingGroupId, setDraggingGroupId] = useState(null);
  const longPressTimerRef = useRef(null);
  const suppressNextClickRef = useRef(false);
  const newContactSeedRef = useRef(1);
  const transitionTimerRef = useRef(null);
  const sortDragRef = useRef(null);
  const groupSortDragRef = useRef(null);
  const profileButtonRef = useRef(null);
  const detailAvatarRef = useRef(null);
  const contactAvatarRefs = useRef({});
  const contactsBarRef = useRef(null);
  const contactEditorRef = useRef(null);
  const hasLoadedLocalStateRef = useRef(false);
  const saveThreadsTimerRef = useRef(null);
  const saveWorldBooksTimerRef = useRef(null);
  const hasMigratedLegacyWorldBooksRef = useRef(false);
  const activeApp = controlledActiveApp ?? localActiveApp;
  const setActiveApp = controlledActiveApp === undefined ? setLocalActiveApp : () => {};
  const normalizedWorldBooks = useMemo(() => normalizeWorldBooks(worldBooks), [worldBooks]);

  const closeContactDetail = () => {
    if (contactDetailReturnThreadId) {
      const returnThreadId = contactDetailReturnThreadId;
      runViewTransition(() => {
        setActiveContactId(null);
        setContactDetailReturnThreadId(null);
        setActiveThreadId(returnThreadId);
        setActiveApp('messages');
      });
      onChangeApp?.('messages');
      return;
    }

    runViewTransition(() => {
      setActiveContactId(null);
      setContactDetailReturnThreadId(null);
    });
  };

  useEffect(() => {
    if (controlledActiveApp === undefined) {
      setLocalActiveApp(initialApp);
    }
  }, [controlledActiveApp, initialApp]);

  useEffect(() => {
    let isMounted = true;

    loadLocalState()
      .then((state) => {
        if (!isMounted) return;

        setContacts(state.contacts);
        setContactGroups(state.contactGroups);
        setThreads(state.threads);
        setApiSettings(state.apiSettings);
        setWorldBooks(state.worldBooks);
        hasLoadedLocalStateRef.current = true;
        setStorageStatus({ isReady: true, error: '' });
      })
      .catch((error) => {
        if (!isMounted) return;

        hasLoadedLocalStateRef.current = true;
        setStorageStatus({
          isReady: true,
          error: error?.message ?? '本地数据库读取失败，将暂时使用内存状态。',
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current) return;
    saveContacts(contacts).catch((error) => {
      setStorageStatus((current) => ({
        ...current,
        error: error?.message ?? '联系人保存失败。',
      }));
    });
  }, [contacts]);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current) return;
    saveContactGroups(contactGroups).catch((error) => {
      setStorageStatus((current) => ({
        ...current,
        error: error?.message ?? '联系人分组保存失败。',
      }));
    });
  }, [contactGroups]);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current) return;
    window.clearTimeout(saveThreadsTimerRef.current);
    saveThreadsTimerRef.current = window.setTimeout(() => {
      saveThreads(threads).catch((error) => {
        setStorageStatus((current) => ({
          ...current,
          error: error?.message ?? '聊天记录保存失败。',
        }));
      });
    }, 250);

    return () => window.clearTimeout(saveThreadsTimerRef.current);
  }, [threads]);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current) return;
    saveApiSettings(apiSettings).catch((error) => {
      setStorageStatus((current) => ({
        ...current,
        error: error?.message ?? 'API 设置保存失败。',
      }));
    });
  }, [apiSettings]);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current) return;
    window.clearTimeout(saveWorldBooksTimerRef.current);
    saveWorldBooksTimerRef.current = window.setTimeout(() => {
      saveWorldBooks(worldBooks).catch((error) => {
        setStorageStatus((current) => ({
          ...current,
          error: error?.message ?? '世界书保存失败。',
        }));
      });
    }, 250);

    return () => window.clearTimeout(saveWorldBooksTimerRef.current);
  }, [worldBooks]);

  useEffect(() => {
    const titleMap = {
      contacts: '聊天 联系人',
      messages: '聊天 消息',
      worldbook: '聊天 世界书',
      settings: '聊天 设置',
    };

    document.title = titleMap[activeApp] ?? '聊天';
  }, [activeApp]);

  useEffect(() => {
    return () => {
      window.clearTimeout(longPressTimerRef.current);
      window.clearTimeout(transitionTimerRef.current);
      window.clearTimeout(saveThreadsTimerRef.current);
      window.clearTimeout(saveWorldBooksTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeContactId) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeContactDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContactId]);

  useEffect(() => {
    if (activeContactId && !contacts.some((contact) => contact.id === activeContactId)) {
      setActiveContactId(null);
    }
  }, [activeContactId, contacts]);

  useEffect(() => {
    if (selectedContactId && !contacts.some((contact) => contact.id === selectedContactId)) {
      setSelectedContactId(null);
    }
  }, [selectedContactId, contacts]);

  useEffect(() => {
    if (selectedContactGroupId === ALL_CONTACTS_GROUP_ID) return;

    const hasSelectedGroup = contactGroups.some((group) => group.id === selectedContactGroupId);
    if (!hasSelectedGroup) {
      setSelectedContactGroupId(ALL_CONTACTS_GROUP_ID);
    }
  }, [selectedContactGroupId, contactGroups]);

  useEffect(() => {
    if (!selectedContactId || selectedContactGroupId === ALL_CONTACTS_GROUP_ID) return;

    const selectedContact = contacts.find((contact) => contact.id === selectedContactId);
    if (selectedContact && hasContactGroup(selectedContact, selectedContactGroupId, contactGroups)) return;

    setSelectedContactId(null);
  }, [selectedContactId, selectedContactGroupId, contacts, contactGroups]);

  useEffect(() => {
    if (!hasLoadedLocalStateRef.current || hasMigratedLegacyWorldBooksRef.current) return;
    hasMigratedLegacyWorldBooksRef.current = true;

    const contactsWithLegacyWorldBooks = contacts.filter((contact) => contact.detailProfile?.worldBook?.trim());
    if (contactsWithLegacyWorldBooks.length === 0) return;

    setWorldBooks((current) => {
      const normalized = normalizeWorldBooks(current);
      const nextRoleEntries = [...normalized.roleEntries];
      let hasNewEntry = false;

      contactsWithLegacyWorldBooks.forEach((contact) => {
        const legacyWorldBook = contact.detailProfile.worldBook.trim();
        const hasSameEntry = nextRoleEntries.some(
          (entry) => entry.contactId === contact.id && entry.content.trim() === legacyWorldBook
        );

        if (hasSameEntry) return;

        nextRoleEntries.push(
          createWorldBookEntry({
            scope: 'role',
            contactId: contact.id,
            title: `${contact.name} 世界书`,
            content: legacyWorldBook,
          })
        );
        hasNewEntry = true;
      });

      return hasNewEntry ? { ...normalized, roleEntries: nextRoleEntries } : current;
    });

    setContacts((current) =>
      current.map((contact) => {
        if (!contact.detailProfile?.worldBook?.trim()) return contact;

        return {
          ...contact,
          detailProfile: {
            ...contact.detailProfile,
            worldBook: '',
          },
        };
      })
    );
  }, [contacts]);

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const startLongPress = () => {
    cancelLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      setEditingDraft(null);
      closeGroupEditing();
      setIsEditingContacts(true);
    }, LONG_PRESS_MS);
  };

  const closeContactEditing = () => {
    setIsEditingContacts(false);
    setEditingDraft(null);
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
    setSelectedBulkContactIds(new Set());
    setDraggingContactId(null);
    sortDragRef.current = null;
  };

  const startGroupEditing = (groupId) => {
    const normalizedGroups = normalizeContactGroups(contactGroups);
    const targetGroupId =
      groupId && groupId !== ALL_CONTACTS_GROUP_ID && normalizedGroups.some((group) => group.id === groupId)
        ? groupId
        : selectedContactGroupId !== ALL_CONTACTS_GROUP_ID &&
            normalizedGroups.some((group) => group.id === selectedContactGroupId)
          ? selectedContactGroupId
          : normalizedGroups[0]?.id ?? null;

    setEditingDraft(null);
    setEditingGroupId(targetGroupId);
    setIsManagingGroups(true);
    setIsEditingContacts(false);
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
    setDraggingContactId(null);
    setDraggingGroupId(null);
    sortDragRef.current = null;
    groupSortDragRef.current = null;
  };

  const closeGroupEditing = () => {
    setIsManagingGroups(false);
    setEditingGroupId(null);
    setDraggingGroupId(null);
    groupSortDragRef.current = null;
  };

  const moveContactBefore = (movingContactId, targetContactId) => {
    if (!movingContactId || !targetContactId || movingContactId === targetContactId) return;

    setContacts((current) => {
      const fromIndex = current.findIndex((contact) => contact.id === movingContactId);
      const targetIndex = current.findIndex((contact) => contact.id === targetContactId);
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return current;

      const next = [...current];
      const [movingContact] = next.splice(fromIndex, 1);
      const nextTargetIndex = next.findIndex((contact) => contact.id === targetContactId);
      next.splice(nextTargetIndex, 0, movingContact);

      return next;
    });
  };

  const moveContactGroupNear = (movingGroupId, targetGroupId, placement = 'before') => {
    if (!movingGroupId || movingGroupId === ALL_CONTACTS_GROUP_ID || movingGroupId === targetGroupId) return;

    setContactGroups((current) => {
      const nextGroups = normalizeContactGroups(current);
      const fromIndex = nextGroups.findIndex((group) => group.id === movingGroupId);
      if (fromIndex < 0) return current;

      const next = [...nextGroups];
      const [movingGroup] = next.splice(fromIndex, 1);
      const targetIndex = next.findIndex((group) => group.id === targetGroupId);
      if (targetIndex < 0) return current;

      next.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movingGroup);
      return next;
    });
  };

  const handleSortPointerDown = (event, index) => {
    if (!isEditingContacts || event.button > 0) return;

    const contact = contacts[index];
    if (!contact) return;

    sortDragRef.current = {
      contactId: contact.id,
      isSorting: false,
      startX: event.clientX,
      startY: event.clientY,
    };

    const handlePointerMove = (moveEvent) => {
      const dragState = sortDragRef.current;
      if (!dragState) return;

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;
      const hasMovedEnough = Math.hypot(deltaX, deltaY) > 8;

      if (!dragState.isSorting && hasMovedEnough) {
        dragState.isSorting = true;
        setDraggingContactId(dragState.contactId);
        suppressNextClickRef.current = true;
      }

      if (!dragState.isSorting) return;

      moveEvent.preventDefault();
      const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const targetItem = targetElement?.closest('[data-contact-id]');
      const targetContactId = targetItem?.getAttribute('data-contact-id');
      if (targetContactId && targetContactId !== dragState.contactId) {
        moveContactBefore(dragState.contactId, targetContactId);
      }
    };

    const handlePointerUp = () => {
      if (sortDragRef.current?.isSorting) {
        suppressNextClickRef.current = true;
      }
      sortDragRef.current = null;
      setDraggingContactId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleGroupSortPointerDown = (event, groupId) => {
    if (!groupId || groupId === ALL_CONTACTS_GROUP_ID || event.button > 0) return;

    event.preventDefault();
    event.stopPropagation();

    groupSortDragRef.current = {
      groupId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setDraggingGroupId(groupId);
    setEditingGroupId(groupId);

    const handlePointerMove = (moveEvent) => {
      const dragState = groupSortDragRef.current;
      if (!dragState) return;

      moveEvent.preventDefault();

      const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const targetItem = targetElement?.closest('[data-managed-contact-group-id]');
      const targetGroupId = targetItem?.getAttribute('data-managed-contact-group-id');
      if (!targetGroupId || targetGroupId === dragState.groupId) return;

      const targetRect = targetItem.getBoundingClientRect();
      const placement = moveEvent.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before';
      moveContactGroupNear(dragState.groupId, targetGroupId, placement);
    };

    const handlePointerUp = () => {
      groupSortDragRef.current = null;
      setDraggingGroupId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleScreenPointerDownCapture = (event) => {
    if (activeApp !== 'contacts') return;
    if (activeContactId) return;
    if (!isEditingContacts && !editingDraft && !isContactWallOpen && !isManagingGroups) return;

    const target = event.target;
    if (
      contactsBarRef.current?.contains(target) ||
      contactEditorRef.current?.contains(target) ||
      target.closest?.('.contact-group-bar') ||
      target.closest?.('.contact-group-management') ||
      target.closest?.('.bulk-group-picker')
    ) {
      return;
    }

    closeContactEditing();
    setIsContactWallOpen(false);
    closeGroupEditing();
    setIsBulkGroupPickerOpen(false);
  };

  const handleNativeContextMenuCapture = (event) => {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
  };

  const handleNativeDragStartCapture = (event) => {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
  };

  const startMapConnectionTransition = (contactId, mode, onComplete) => {
    window.clearTimeout(transitionTimerRef.current);
    setMapConnectionTransition({ contactId, mode });
    transitionTimerRef.current = window.setTimeout(() => {
      onComplete?.();
      setMapConnectionTransition((current) =>
        current?.contactId === contactId && current?.mode === mode ? null : current
      );
    }, MAP_CONNECTION_TRANSITION_MS);
  };

  const openContactDetail = (contact) => {
    if (!ENABLE_CONTACT_DETAIL_VIEW || !contact) return;

    const open = () => {
      setContactDetailReturnThreadId(null);
      setSelectedContactId(contact.id);
      setEditingDraft(null);
      closeGroupEditing();
      setIsContactWallOpen(false);
      setActiveContactId(contact.id);
    };

    runViewTransition(open);
  };

  const handleContactClick = (index, isSelected) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const contact = contacts[index];

    if (isEditingContacts && contact) {
      setConfirmBulkDelete(false);
      setSelectedBulkContactIds((current) => {
        const next = new Set(current);
        if (next.has(contact.id)) {
          next.delete(contact.id);
        } else {
          next.add(contact.id);
        }

        return next;
      });
      return;
    }

    if (ENABLE_CONTACT_DETAIL_VIEW && contact && !isEditingContacts) {
      if (USE_EXPLICIT_CONTACT_DETAIL_ENTRY) {
        setSelectedContactId(isSelected ? null : contact.id);
        setEditingDraft(null);
        return;
      }

      openContactDetail(contact);
      return;
    }

    if (contact) {
      setSelectedContactId(isSelected ? null : contact.id);
    }
  };

  const deleteContactsByIds = (contactIds) => {
    const deleteIdSet = new Set(contactIds);
    if (deleteIdSet.size === 0) return;
    const shouldClearDetailReturn = activeContactId ? deleteIdSet.has(activeContactId) : false;

    setContacts((current) => current.filter((contact) => !deleteIdSet.has(contact.id)));
    setSelectedContactId((current) => (deleteIdSet.has(current) ? null : current));
    setActiveContactId((current) => (deleteIdSet.has(current) ? null : current));
    setContactDetailReturnThreadId((current) => (shouldClearDetailReturn ? null : current));
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
  };

  const handleDeleteActiveContact = (contactId) => {
    deleteContactsByIds([contactId]);
  };

  const handleAddContact = () => {
    const normalizedGroups = normalizeContactGroups(contactGroups);
    const groupIds =
      selectedContactGroupId === ALL_CONTACTS_GROUP_ID
        ? normalizedGroups[0]
          ? [normalizedGroups[0].id]
          : []
        : [selectedContactGroupId];

    setIsContactWallOpen(false);
    closeGroupEditing();
    setEditingDraft(createContactDraft(newContactSeedRef.current, groupIds));
    setIsEditingContacts(true);
  };

  const handleCancelDraft = () => {
    setEditingDraft(null);
    setIsEditingContacts(true);
  };

  const handleSaveDraft = (event) => {
    event.preventDefault();
    if (!editingDraft) return;

    const nextContact = createNewContact(editingDraft, newContactSeedRef.current, contactGroups);
    newContactSeedRef.current += 1;
    setContacts((current) => [...current, nextContact]);
    setSelectedContactId(nextContact.id);
    setEditingDraft(null);
    setIsEditingContacts(true);
    setIsContactWallOpen(true);
    startMapConnectionTransition(nextContact.id, 'entering');
  };

  const handleSelectContactGroup = (groupId) => {
    setSelectedContactGroupId(groupId);
    setEditingDraft(null);
    setIsContactWallOpen(false);
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
    setSelectedContactId(null);
    setMapConnectionTransition(null);
    if (isManagingGroups && groupId !== ALL_CONTACTS_GROUP_ID) {
      setEditingGroupId(groupId);
    }
  };

  const handleAddContactGroup = (name) => {
    const group = createContactGroup(name);
    if (!group) return;

    const normalizedGroups = normalizeContactGroups(contactGroups);
    const existingGroup = normalizedGroups.find((item) => item.label === group.label);
    if (existingGroup) {
      setSelectedContactGroupId(existingGroup.id);
      setEditingGroupId(existingGroup.id);
      setIsManagingGroups(true);
      return;
    }

    setContactGroups([...normalizedGroups, group]);
    setSelectedContactGroupId(group.id);
    setEditingGroupId(group.id);
    setIsManagingGroups(true);
  };

  const handleRenameContactGroup = (groupId, label) => {
    const nextLabel = label.trim().slice(0, 10);
    if (!nextLabel) return;

    setContactGroups((current) =>
      normalizeContactGroups(current).map((group) => (group.id === groupId ? { ...group, label: nextLabel } : group))
    );
  };

  const handleDeleteContactGroup = (groupId) => {
    const normalizedGroups = normalizeContactGroups(contactGroups);
    const nextGroups = normalizedGroups.filter((group) => group.id !== groupId);
    if (nextGroups.length === normalizedGroups.length) return;

    setContactGroups(nextGroups);
    setContacts((current) =>
      current.map((contact) => {
        const remainingGroupIds = getContactGroupIds(contact, normalizedGroups).filter((item) => item !== groupId);

        return {
          ...contact,
          groupIds: normalizeContactGroupIds(remainingGroupIds, nextGroups),
        };
      })
    );
    setSelectedContactGroupId((current) => (current === groupId ? ALL_CONTACTS_GROUP_ID : current));
    setSelectedContactId(null);
    setEditingGroupId(nextGroups[0]?.id ?? null);
    setIsManagingGroups(true);
    setMapConnectionTransition(null);
  };

  const handleChangeContactGroups = (contactId, groupIds) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId ? { ...contact, groupIds: normalizeContactGroupIds(groupIds, contactGroups) } : contact
      )
    );
  };

  const handleSelectAllVisibleContacts = () => {
    setConfirmBulkDelete(false);
    setSelectedBulkContactIds(new Set(visibleContactIndexes.map((index) => contacts[index]?.id).filter(Boolean)));
  };

  const handleBulkRemoveFromCurrentGroup = () => {
    if (selectedBulkContactIds.size === 0 || selectedContactGroupId === ALL_CONTACTS_GROUP_ID) return;

    const normalizedGroups = normalizeContactGroups(contactGroups);
    const fallbackGroupId =
      normalizedGroups.find((group) => group.id !== selectedContactGroupId)?.id ?? selectedContactGroupId;

    setContacts((current) =>
      current.map((contact) => {
        if (!selectedBulkContactIds.has(contact.id)) return contact;

        const remainingGroupIds = getContactGroupIds(contact, normalizedGroups).filter(
          (groupId) => groupId !== selectedContactGroupId
        );
        const nextGroupIds = remainingGroupIds.length > 0 ? remainingGroupIds : [fallbackGroupId];

        return {
          ...contact,
          groupIds: normalizeContactGroupIds(nextGroupIds, normalizedGroups),
        };
      })
    );
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
  };

  const addSelectedContactsToGroup = (groupId, groupsForNormalization = contactGroups) => {
    if (selectedBulkContactIds.size === 0 || !groupId) return;

    const normalizedGroups = normalizeContactGroups(groupsForNormalization);
    const hasTargetGroup = normalizedGroups.some((group) => group.id === groupId);
    if (!hasTargetGroup) return;

    setContacts((current) =>
      current.map((contact) => {
        if (!selectedBulkContactIds.has(contact.id)) return contact;

        return {
          ...contact,
          groupIds: normalizeContactGroupIds([...getContactGroupIds(contact, normalizedGroups), groupId], normalizedGroups),
        };
      })
    );
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
  };

  const handleBulkCreateGroupAndAdd = (name) => {
    if (selectedBulkContactIds.size === 0) return;

    const group = createContactGroup(name);
    if (!group) return;

    const normalizedGroups = normalizeContactGroups(contactGroups);
    const existingGroup = normalizedGroups.find((item) => item.label === group.label);
    const targetGroup = existingGroup ?? group;
    const nextGroups = existingGroup ? normalizedGroups : [...normalizedGroups, group];

    if (!existingGroup) {
      setContactGroups(nextGroups);
    }
    addSelectedContactsToGroup(targetGroup.id, nextGroups);
  };

  const handleBulkDeleteContacts = () => {
    if (selectedBulkContactIds.size === 0) return;

    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      return;
    }

    deleteContactsByIds(selectedBulkContactIds);
  };

  const isContactWallExpanded = true;

  const getVisibleContactIndexes = () => {
    const indexes = contacts
      .map((contact, index) => ({ contact, index }))
      .filter(({ contact }) => {
        if (selectedContactGroupId === ALL_CONTACTS_GROUP_ID) return true;

        return hasContactGroup(contact, selectedContactGroupId, contactGroups);
      })
      .map(({ index }) => index);

    if (!USE_COMPACT_CONTACT_ROW || isContactWallExpanded || indexes.length <= COMPACT_CONTACT_LIMIT) return indexes;

    const filteredIndexSet = new Set(indexes);
    const defaultIndexes = contacts
      .map((contact, index) => (contact.isDefaultVisible && filteredIndexSet.has(index) ? index : null))
      .filter((index) => index !== null);
    const visibleIndexes = [...(defaultIndexes.length > 0 ? defaultIndexes : indexes.slice(0, COMPACT_CONTACT_LIMIT))];
    const selectedIndex =
      selectedContactId === null ? -1 : contacts.findIndex((contact) => contact.id === selectedContactId);
    const shouldKeepSelectedVisible =
      selectedIndex >= 0 && filteredIndexSet.has(selectedIndex) && !visibleIndexes.includes(selectedIndex);

    if (shouldKeepSelectedVisible) {
      if (visibleIndexes.length === COMPACT_CONTACT_LIMIT) {
        visibleIndexes[visibleIndexes.length - 1] = selectedIndex;
      } else {
        visibleIndexes.push(selectedIndex);
      }
    }

    const visibleIndexSet = new Set(visibleIndexes);
    return indexes.filter((index) => visibleIndexSet.has(index));
  };

  const visibleContactIndexes = getVisibleContactIndexes();
  const visibleContacts = visibleContactIndexes.map((index) => contacts[index]).filter(Boolean);
  const handleSelectMapRegionContact = (contact) => {
    if (!contact) return;

    setSelectedContactId(contact.id);
    setEditingDraft(null);
    setIsEditingContacts(false);
    setSelectedBulkContactIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkGroupPickerOpen(false);
    closeGroupEditing();
    startMapConnectionTransition(contact.id, 'entering');
  };
  const contactGroupCounts = useMemo(() => {
    return contacts.reduce((counts, contact) => {
      getContactGroupIds(contact, contactGroups).forEach((groupId) => {
        counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
      });

      return counts;
    }, new Map());
  }, [contacts, contactGroups]);
  const isPinnedContactFlow = !isContactWallExpanded && visibleContactIndexes.length > COMPACT_CONTACT_LIMIT;
  const activeContact = activeContactId ? contacts.find((contact) => contact.id === activeContactId) : null;
  const isEditingGroups = isManagingGroups;
  const activeContactRoleWorldBookEntries = activeContact
    ? normalizedWorldBooks.roleEntries.filter((entry) => entry.contactId === activeContact.id)
    : [];
  const handleActiveContactDetailChange = (nextDetailProfile) => {
    if (!activeContactId) return;

    setContacts((current) =>
      current.map((contact) =>
        contact.id === activeContactId ? { ...contact, detailProfile: nextDetailProfile } : contact
      )
    );
  };
  const handleAddRoleWorldBookEntry = (contact) => {
    if (!contact) return;

    setWorldBooks((current) => {
      const normalized = normalizeWorldBooks(current);
      const contactEntryCount = normalized.roleEntries.filter((entry) => entry.contactId === contact.id).length;

      return {
        ...normalized,
        roleEntries: [
          createWorldBookEntry({
            scope: 'role',
            contactId: contact.id,
            title: contactEntryCount === 0 ? `${contact.name} 世界书` : `${contact.name} 世界书 ${contactEntryCount + 1}`,
          }),
          ...normalized.roleEntries,
        ],
      };
    });
  };
  const handleAddRoleWorldBookCategory = (name) => {
    const category = createWorldBookCategory({ scope: 'role', name });

    setWorldBooks((current) => {
      const normalized = normalizeWorldBooks(current);
      const existingCategory = normalized.roleCategories.find((item) => item.name === category.name);

      if (existingCategory) return normalized;

      return {
        ...normalized,
        roleCategories: [...normalized.roleCategories, category],
      };
    });
  };
  const handlePatchRoleWorldBookEntry = (entryId, patch) => {
    setWorldBooks((current) => {
      const normalized = normalizeWorldBooks(current);

      return {
        ...normalized,
        roleEntries: normalized.roleEntries.map((entry) =>
          entry.id === entryId ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
        ),
      };
    });
  };
  const handleDeleteRoleWorldBookEntry = (entryId) => {
    setWorldBooks((current) => {
      const normalized = normalizeWorldBooks(current);

      return {
        ...normalized,
        roleEntries: normalized.roleEntries.filter((entry) => entry.id !== entryId),
      };
    });
  };
  const handleChangeApp = (appId) => {
    if (appId !== 'messages' && appId !== 'contacts' && appId !== 'worldbook' && appId !== 'settings') return;
    if (appId === activeApp) return;

    setActiveApp(appId);
    setContactDetailReturnThreadId(null);
    if (appId !== 'contacts') {
      setActiveContactId(null);
      setIsEditingContacts(false);
      closeGroupEditing();
      setEditingDraft(null);
      setIsContactWallOpen(false);
    }
    onChangeApp?.(appId);
  };
  const handleOpenContactDetailFromMessages = (contact) => {
    if (!contact) return;

    const open = () => {
      setContactDetailReturnThreadId(activeThreadId);
      setSelectedContactId(contact.id);
      setEditingDraft(null);
      setIsEditingContacts(false);
      closeGroupEditing();
      setIsContactWallOpen(false);
      setActiveContactId(contact.id);
      setActiveApp('contacts');
    };

    runViewTransition(open);
    onChangeApp?.('contacts');
  };
  const handleClearApiKey = () => {
    setApiSettings((current) => ({
      ...current,
      apiKey: '',
    }));
  };
  const handleResetThreads = () => {
    setThreads(createInitialThreads());
    setActiveThreadId(null);
  };
  const mapView = (
    <PixelWorldMap
      contacts={activeContact ? contacts : visibleContacts}
      selectedContactId={selectedContactId}
      showUserConnection={showUserConnection}
      userAvatarRef={profileButtonRef}
      contactAvatarRefs={contactAvatarRefs}
      selectedAvatarRef={activeContact ? detailAvatarRef : null}
      connectionTransition={mapConnectionTransition}
      showSelectedLocalTime={!activeContact}
      softAvatarConnection={Boolean(activeContact)}
      onRegionContactSelect={activeContact ? undefined : handleSelectMapRegionContact}
    />
  );
  const isChatThreadOpen = activeApp === 'messages' && Boolean(activeThreadId);
  const screenClassName = [
    'app-screen',
    'home-screen',
    activeContact ? 'has-contact-detail' : '',
    isChatThreadOpen ? 'has-chat-thread' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main className="app-main">
      <section
        className={screenClassName}
        aria-label={
          activeApp === 'messages'
            ? '聊天 消息'
            : activeApp === 'settings'
              ? '聊天 设置'
              : activeApp === 'worldbook'
                ? '聊天 世界书'
                : '聊天 联系人'
        }
        onPointerDownCapture={handleScreenPointerDownCapture}
        onContextMenuCapture={handleNativeContextMenuCapture}
        onDragStartCapture={handleNativeDragStartCapture}
      >
        <HomeWallpaper />

        {activeApp === 'messages' && (
          <MessagesView
            contacts={contacts}
            threads={threads}
            setThreads={setThreads}
            apiSettings={apiSettings}
            worldBooks={worldBooks}
            activeThreadId={activeThreadId}
            onOpenThread={setActiveThreadId}
            onBack={() => setActiveThreadId(null)}
            onCloseApp={onCloseApp}
            onOpenContactDetail={handleOpenContactDetailFromMessages}
          />
        )}

        {activeApp === 'settings' && (
          <SettingsView
            apiSettings={apiSettings}
            storageStatus={storageStatus}
            onApiSettingsChange={setApiSettings}
            onClearApiKey={handleClearApiKey}
            onResetThreads={handleResetThreads}
          />
        )}

        {activeApp === 'worldbook' && (
          <WorldBookView
            contacts={contacts}
            worldBooks={worldBooks}
            onWorldBooksChange={setWorldBooks}
            onCloseApp={onCloseApp}
          />
        )}

        {activeApp === 'contacts' && (
          <>
            <header className="home-header contacts-header">
              <div>
                <h1 className="home-title">联系人</h1>
              </div>
              <button
                ref={profileButtonRef}
                type="button"
                className={showUserConnection ? 'profile-button is-active' : 'profile-button'}
                aria-pressed={showUserConnection}
                aria-label={showUserConnection ? '隐藏我的地图连线' : '显示我的地图连线'}
                onClick={() => setShowUserConnection((current) => !current)}
              >
                我
              </button>
            </header>

            <div className="contacts-group-area">
              <ContactGroupBar
                contacts={contacts}
                contactGroups={contactGroups}
                selectedContactGroupId={selectedContactGroupId}
                contactGroupCounts={contactGroupCounts}
                isEditingGroups={isEditingGroups}
                onSelectContactGroup={handleSelectContactGroup}
                onStartGroupEdit={startGroupEditing}
                onCloseGroupEdit={closeGroupEditing}
              />
              {isEditingGroups && (
                <ContactGroupManager
                  activeGroupId={editingGroupId}
                  contactGroups={contactGroups}
                  contactGroupCounts={contactGroupCounts}
                  canDelete={contactGroups.length > 0}
                  draggingGroupId={draggingGroupId}
                  onSelectGroup={handleSelectContactGroup}
                  onAddGroup={handleAddContactGroup}
                  onRenameGroup={handleRenameContactGroup}
                  onDeleteGroup={handleDeleteContactGroup}
                  onGroupSortPointerDown={handleGroupSortPointerDown}
                  onClose={closeGroupEditing}
                />
              )}
            </div>

            {!activeContact && <div className="home-map-area contacts-map-area">{mapView}</div>}

            {editingDraft && (
              <ContactEditorSheet
                editorRef={contactEditorRef}
                draft={editingDraft}
                cityPresets={CITY_PRESETS}
                contactGroups={contactGroups}
                onDraftChange={setEditingDraft}
                onCancel={handleCancelDraft}
                onSubmit={handleSaveDraft}
              />
            )}

            <ContactDock
              contacts={contacts}
              visibleContactIndexes={visibleContactIndexes}
              selectedContactId={selectedContactId}
              isContactWallExpanded={isContactWallExpanded}
              isPinnedContactFlow={isPinnedContactFlow}
              isEditingContacts={isEditingContacts}
              draggingContactId={draggingContactId}
              selectedBulkContactIds={selectedBulkContactIds}
              confirmBulkDelete={confirmBulkDelete}
              canBulkAddToGroup={selectedContactGroupId === ALL_CONTACTS_GROUP_ID && contactGroups.length > 0}
              canBulkRemoveFromCurrentGroup={selectedContactGroupId !== ALL_CONTACTS_GROUP_ID && contactGroups.length > 1}
              showDetailEntry={USE_EXPLICIT_CONTACT_DETAIL_ENTRY && ENABLE_CONTACT_DETAIL_VIEW}
              enableDetailView={ENABLE_CONTACT_DETAIL_VIEW}
              contactsBarRef={contactsBarRef}
              contactAvatarRefs={contactAvatarRefs}
              onSortPointerDown={handleSortPointerDown}
              onStartLongPress={startLongPress}
              onCancelLongPress={cancelLongPress}
              onEnableEditing={() => {
                closeGroupEditing();
                setIsEditingContacts(true);
              }}
              onContactClick={handleContactClick}
              onOpenContactDetail={openContactDetail}
              onAddContact={handleAddContact}
              onSelectAllVisibleContacts={handleSelectAllVisibleContacts}
              onClearBulkSelection={() => {
                setSelectedBulkContactIds(new Set());
                setConfirmBulkDelete(false);
                setIsBulkGroupPickerOpen(false);
              }}
              onOpenBulkGroupPicker={() => setIsBulkGroupPickerOpen(true)}
              onBulkRemoveFromCurrentGroup={handleBulkRemoveFromCurrentGroup}
              onBulkDeleteContacts={handleBulkDeleteContacts}
              onCloseEditing={closeContactEditing}
            />

            {isBulkGroupPickerOpen && selectedBulkContactIds.size > 0 && (
              <BulkGroupPicker
                contactGroups={contactGroups}
                selectedCount={selectedBulkContactIds.size}
                onAddToGroup={addSelectedContactsToGroup}
                onCreateGroup={handleBulkCreateGroupAndAdd}
                onClose={() => setIsBulkGroupPickerOpen(false)}
              />
            )}
          </>
        )}

        {!isChatThreadOpen && activeApp !== 'worldbook' && (
          <AppMenuBar items={MENU_ITEMS} activeApp={activeApp} onChangeApp={handleChangeApp} />
        )}
        {onCloseApp && (
          <button type="button" className="phone-home-handle" onClick={onCloseApp} aria-label="返回手机桌面" title="返回桌面" />
        )}

        {activeApp === 'contacts' && ENABLE_CONTACT_DETAIL_VIEW && activeContact && (
          <ContactDetail
            contact={activeContact}
            avatarRef={detailAvatarRef}
            mapSlot={mapView}
            contactGroups={contactGroups}
            roleWorldBookEntries={activeContactRoleWorldBookEntries}
            roleWorldBookCategories={normalizedWorldBooks.roleCategories}
            onBack={closeContactDetail}
            onDetailChange={handleActiveContactDetailChange}
            onGroupsChange={(groupIds) => handleChangeContactGroups(activeContact.id, groupIds)}
            onDeleteContact={() => handleDeleteActiveContact(activeContact.id)}
            onAddRoleWorldBookEntry={() => handleAddRoleWorldBookEntry(activeContact)}
            onAddRoleWorldBookCategory={handleAddRoleWorldBookCategory}
            onPatchRoleWorldBookEntry={handlePatchRoleWorldBookEntry}
            onDeleteRoleWorldBookEntry={handleDeleteRoleWorldBookEntry}
          />
        )}
      </section>
    </main>
  );
}
