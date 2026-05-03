import { CONTACTS } from './contacts.js';

export const COMPACT_CONTACT_LIMIT = 5;
export const ALL_CONTACTS_GROUP_ID = 'all';
export const DEFAULT_CONTACT_GROUP_ID = 'close';

export const DEFAULT_CONTACT_GROUPS = [
  { id: DEFAULT_CONTACT_GROUP_ID, label: '常聊' },
  { id: 'storyline', label: '故事线' },
  { id: 'creation', label: '创作' },
  { id: 'archive', label: '归档' },
];

export const CITY_PRESETS = [
  {
    id: 'shanghai',
    label: '上海',
    location: '上海',
    placeLabel: '上海',
    timeZone: 'Asia/Shanghai',
    lat: 31.2304,
    lon: 121.4737,
    mapX: 64,
    mapY: 9,
    labelDx: 5,
    labelDy: 10,
    anchor: 'start',
    avatarSvgX: 350,
  },
  {
    id: 'kyoto',
    label: '京都',
    location: '京都',
    placeLabel: '京都',
    timeZone: 'Asia/Tokyo',
    lat: 35.0116,
    lon: 135.7681,
    mapX: 76,
    mapY: 6,
    labelDx: -2,
    labelDy: -6,
    anchor: 'middle',
    avatarSvgX: 64,
  },
  {
    id: 'paris',
    label: '巴黎',
    location: '巴黎',
    placeLabel: '巴黎',
    timeZone: 'Europe/Paris',
    lat: 48.8566,
    lon: 2.3522,
    mapX: 45,
    mapY: 4,
    labelDx: -3,
    labelDy: -3,
    anchor: 'end',
    avatarSvgX: 182,
  },
  {
    id: 'rome',
    label: '罗马',
    location: '罗马',
    placeLabel: '罗马',
    timeZone: 'Europe/Rome',
    lat: 41.9028,
    lon: 12.4964,
    mapX: 47,
    mapY: 6,
    labelDx: -3,
    labelDy: 9,
    anchor: 'end',
    avatarSvgX: 298,
  },
];

function getInitialContactGroupIds(index) {
  if (index < COMPACT_CONTACT_LIMIT) return [DEFAULT_CONTACT_GROUP_ID];
  if (index < 12) return ['storyline'];
  if (index < 19) return ['creation'];

  return ['archive'];
}

function normalizeGroupLabel(label) {
  return String(label ?? '').trim().slice(0, 10);
}

function normalizeRawGroupIds(groupIds) {
  const normalizedGroupIds = (Array.isArray(groupIds) ? groupIds : [groupIds])
    .map((groupId) => String(groupId ?? '').trim())
    .filter((groupId, index, list) => groupId && list.indexOf(groupId) === index);

  return normalizedGroupIds.length > 0 ? normalizedGroupIds : [DEFAULT_CONTACT_GROUP_ID];
}

export function normalizeContactGroups(groups) {
  const sourceGroups = Array.isArray(groups) && groups.length > 0 ? groups : DEFAULT_CONTACT_GROUPS;
  const seenGroupIds = new Set();
  const customGroups = [];

  sourceGroups.forEach((group) => {
    const normalizedGroup = {
      id: String(group?.id ?? '').trim(),
      label: normalizeGroupLabel(group?.label),
    };

    if (!normalizedGroup.id || !normalizedGroup.label || seenGroupIds.has(normalizedGroup.id)) return;

    seenGroupIds.add(normalizedGroup.id);
    customGroups.push(normalizedGroup);
  });

  return customGroups.length > 0 ? customGroups : DEFAULT_CONTACT_GROUPS;
}

export function normalizeContactGroupIds(groupIds, contactGroups = DEFAULT_CONTACT_GROUPS) {
  const normalizedGroups = normalizeContactGroups(contactGroups);
  const knownGroupIds = new Set(normalizedGroups.map((group) => group.id));
  const normalizedGroupIds = normalizeRawGroupIds(groupIds).filter((groupId) => knownGroupIds.has(groupId));
  const fallbackGroupId = knownGroupIds.has(DEFAULT_CONTACT_GROUP_ID)
    ? DEFAULT_CONTACT_GROUP_ID
    : normalizedGroups[0]?.id ?? DEFAULT_CONTACT_GROUP_ID;

  return normalizedGroupIds.length > 0 ? normalizedGroupIds : [fallbackGroupId];
}

export function getContactGroupIds(contact, contactGroups = DEFAULT_CONTACT_GROUPS) {
  return normalizeContactGroupIds(contact?.groupIds ?? contact?.groupId, contactGroups);
}

export function hasContactGroup(contact, groupId, contactGroups = DEFAULT_CONTACT_GROUPS) {
  return getContactGroupIds(contact, contactGroups).includes(groupId);
}

export function normalizeContacts(contactList, contactGroups = DEFAULT_CONTACT_GROUPS) {
  return contactList.map((contact, index) => {
    const groupIds = normalizeContactGroupIds(
      contact.groupIds ?? contact.groupId ?? getInitialContactGroupIds(index),
      contactGroups
    );

    return {
      ...contact,
      groupIds,
    };
  });
}

export function createContactGroup(name) {
  const label = normalizeGroupLabel(name);
  if (!label) return null;

  return {
    id: `group-${Date.now()}`,
    label,
  };
}

export const INITIAL_CONTACTS = CONTACTS.map((contact, index) => ({
  ...contact,
  id: `contact-${index}`,
  isDefaultVisible: index < COMPACT_CONTACT_LIMIT,
  groupIds: getInitialContactGroupIds(index),
}));

export function createContactDraft(seed, groupIds = [DEFAULT_CONTACT_GROUP_ID]) {
  return {
    name: `新朋友 ${seed}`,
    cityId: CITY_PRESETS[0].id,
    imageUrl: '',
    groupIds: normalizeRawGroupIds(groupIds),
  };
}

export function createNewContact(draft, seed, contactGroups = DEFAULT_CONTACT_GROUPS) {
  const city = CITY_PRESETS.find((preset) => preset.id === draft.cityId) ?? CITY_PRESETS[0];
  const name = draft.name.trim() || `新朋友 ${seed}`;
  const imageUrl = draft.imageUrl.trim();

  return {
    ...city,
    id: `new-contact-${Date.now()}-${seed}`,
    name,
    imageUrl,
    groupIds: normalizeContactGroupIds(draft.groupIds ?? draft.groupId, contactGroups),
    isDefaultVisible: false,
    isPlaceholder: !imageUrl,
  };
}
