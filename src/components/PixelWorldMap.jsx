import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MAP_GRID } from '../data/map.js';

const COLORS = {
  bg: '#FFFFFF',
  textDark: '#163044',
  textGray: '#607888',
  primary: '#C8D3DA',
  primaryDeep: '#496878',
  distance: '#C8D3DA',
  distanceText: '#607888',
};

const CELL_SIZE = 6;
const DEFAULT_PADDING = 34;
const VIEWBOX_ANIMATION_MS = 560;
const VIEWBOX_SAFE_INSET = 8;
const CONTACT_INFO_WIDTH = 66;
const CONTACT_INFO_HEIGHT = 22;
const DISTANCE_LABEL_WIDTH = 58;
const NEAR_POINT_DISTANCE = 18;
const LABEL_SAFE_GAP = 3;
const LABEL_PADDING_X = 3;
const LABEL_PADDING_Y = 2;
const NAME_LABEL_FONT_SIZE = 9;
const USER_LABEL_FONT_SIZE = 8;
const CONTACT_PLACE_FONT_SIZE = 8;
const CONTACT_TIME_FONT_SIZE = 7.5;
const DISTANCE_LABEL_FONT_SIZE = 7;

const USER_LOCATION = {
  name: '我',
  placeLabel: '上海',
  timeZone: 'Asia/Shanghai',
  lat: 31.2304,
  lon: 121.4737,
  mapX: 64,
  mapY: 9,
  labelDx: 5,
  labelDy: -6,
  anchor: 'start',
};

const USER_AVATAR_FALLBACK_POINT = {
  x: 422,
  y: -48,
};

const getMapPoint = ({ mapX, mapY }) => ({
  x: mapX * CELL_SIZE + CELL_SIZE / 2,
  y: mapY * CELL_SIZE + CELL_SIZE / 2,
});

function getLandCells() {
  const cells = [];

  MAP_GRID.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      if (char === 'x') cells.push({ x, y });
    });
  });

  return cells;
}

const LAND_CELLS = getLandCells();
const MAP_ROWS = MAP_GRID.length;
const MAP_COLS = MAP_GRID[0].length;
const FULL_VIEW_BOX = { x: 0, y: 0, width: MAP_COLS * CELL_SIZE, height: MAP_ROWS * CELL_SIZE };
const TIME_FORMATTERS = new Map();

function getCirclePath(cx, cy, radius) {
  return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
}

function getStaticMapPaths() {
  const waterPaths = new Map();
  let landPath = '';

  MAP_GRID.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      const cx = x * CELL_SIZE + CELL_SIZE / 2;
      const cy = y * CELL_SIZE + CELL_SIZE / 2;

      if (char === 'x') {
        landPath += getCirclePath(cx, cy, 1.8);
        return;
      }

      const dist = Math.sqrt((x - MAP_COLS / 2) ** 2 + (y - MAP_ROWS / 2) ** 2);
      const opacity = Math.max(0, 0.4 - (dist / 35) * 0.4);
      if (opacity < 0.05) return;

      const key = opacity.toFixed(2);
      waterPaths.set(key, `${waterPaths.get(key) ?? ''}${getCirclePath(cx, cy, 0.6)}`);
    });
  });

  return {
    landPath,
    waterPaths: [...waterPaths.entries()].map(([opacity, path]) => ({ opacity, path })),
  };
}

const STATIC_MAP_PATHS = getStaticMapPaths();

function getNearestLandCell(location) {
  let nearestCell = LAND_CELLS[0];
  let nearestDistance = Infinity;

  LAND_CELLS.forEach((cell) => {
    const distance = (cell.x - location.mapX) ** 2 + (cell.y - location.mapY) ** 2;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCell = cell;
    }
  });

  return nearestCell;
}

function getContinentBounds(location) {
  const start = getNearestLandCell(location);
  const visited = new Set();
  const queue = [start];
  const isLand = (x, y) => MAP_GRID[y]?.[x] === 'x';
  const bounds = {
    minX: start.x,
    minY: start.y,
    maxX: start.x,
    maxY: start.y,
  };

  while (queue.length > 0) {
    const cell = queue.shift();
    const key = `${cell.x}:${cell.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    bounds.minX = Math.min(bounds.minX, cell.x);
    bounds.minY = Math.min(bounds.minY, cell.y);
    bounds.maxX = Math.max(bounds.maxX, cell.x);
    bounds.maxY = Math.max(bounds.maxY, cell.y);

    [
      [cell.x + 1, cell.y],
      [cell.x - 1, cell.y],
      [cell.x, cell.y + 1],
      [cell.x, cell.y - 1],
    ].forEach(([x, y]) => {
      const nextKey = `${x}:${y}`;
      if (isLand(x, y) && !visited.has(nextKey)) queue.push({ x, y });
    });
  }

  return {
    x: bounds.minX * CELL_SIZE,
    y: bounds.minY * CELL_SIZE,
    width: (bounds.maxX - bounds.minX + 1) * CELL_SIZE,
    height: (bounds.maxY - bounds.minY + 1) * CELL_SIZE,
  };
}

function combineBounds(boundsList) {
  const minX = Math.min(...boundsList.map((bounds) => bounds.x));
  const minY = Math.min(...boundsList.map((bounds) => bounds.y));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function padBounds(bounds, padding) {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function clampBounds(bounds, fullBounds) {
  const width = Math.min(bounds.width, fullBounds.width);
  const height = Math.min(bounds.height, fullBounds.height);
  const x = Math.min(Math.max(bounds.x, fullBounds.x), fullBounds.x + fullBounds.width - width);
  const y = Math.min(Math.max(bounds.y, fullBounds.y), fullBounds.y + fullBounds.height - height);

  return { x, y, width, height };
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCharacterWidth(character, fontSize) {
  const codePoint = character.codePointAt(0) ?? 0;

  if (character === ' ') return fontSize * 0.35;
  if (codePoint > 0x2e80) return fontSize;
  if (/[A-Z0-9]/.test(character)) return fontSize * 0.64;

  return fontSize * 0.56;
}

function getEstimatedTextWidth(text, fontSize) {
  return Math.max(fontSize, Array.from(String(text)).reduce((width, character) => width + getCharacterWidth(character, fontSize), 0));
}

function getTextBounds({ x, y, text, fontSize, textAnchor = 'start', paddingX = LABEL_PADDING_X, paddingY = LABEL_PADDING_Y }) {
  const textWidth = getEstimatedTextWidth(text, fontSize);
  const textHeight = fontSize * 1.18;
  let left = x;

  if (textAnchor === 'middle') {
    left = x - textWidth / 2;
  } else if (textAnchor === 'end') {
    left = x - textWidth;
  }

  return {
    x: left - paddingX,
    y: y - fontSize * 0.92 - paddingY,
    width: textWidth + paddingX * 2,
    height: textHeight + paddingY * 2,
  };
}

function getInfoBounds({ x, y, textAnchor, placeLabel, timeLabel, showTime }) {
  const placeWidth = getEstimatedTextWidth(placeLabel, CONTACT_PLACE_FONT_SIZE);
  const timeWidth = showTime ? getEstimatedTextWidth(timeLabel, CONTACT_TIME_FONT_SIZE) : 0;
  const width = Math.max(CONTACT_INFO_WIDTH, placeWidth, timeWidth) + LABEL_PADDING_X * 2;
  const height = showTime ? CONTACT_INFO_HEIGHT : CONTACT_PLACE_FONT_SIZE + LABEL_PADDING_Y * 2 + 2;
  const left = textAnchor === 'end' ? x - width + LABEL_PADDING_X : x - LABEL_PADDING_X;

  return {
    x: left,
    y: y - CONTACT_PLACE_FONT_SIZE * 0.92 - LABEL_PADDING_Y,
    width,
    height,
  };
}

function expandBounds(bounds, amount) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  };
}

function getOverlapArea(a, b, gap = 0) {
  const first = expandBounds(a, gap);
  const second = expandBounds(b, gap);
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));

  return width * height;
}

function getOutsidePenalty(bounds, viewBox) {
  const safeLeft = viewBox.x + VIEWBOX_SAFE_INSET;
  const safeTop = viewBox.y + VIEWBOX_SAFE_INSET;
  const safeRight = viewBox.x + viewBox.width - VIEWBOX_SAFE_INSET;
  const safeBottom = viewBox.y + viewBox.height - VIEWBOX_SAFE_INSET;

  return (
    Math.max(0, safeLeft - bounds.x) +
    Math.max(0, safeTop - bounds.y) +
    Math.max(0, bounds.x + bounds.width - safeRight) +
    Math.max(0, bounds.y + bounds.height - safeBottom)
  );
}

function getBoundsScore(bounds, viewBox, avoidBounds = []) {
  return (
    getOutsidePenalty(bounds, viewBox) * 8 +
    avoidBounds.reduce((score, avoidBoundsItem) => score + getOverlapArea(bounds, avoidBoundsItem, LABEL_SAFE_GAP) * 14, 0)
  );
}

function getShiftIntoView(bounds, viewBox) {
  const safeLeft = viewBox.x + VIEWBOX_SAFE_INSET;
  const safeTop = viewBox.y + VIEWBOX_SAFE_INSET;
  const safeRight = viewBox.x + viewBox.width - VIEWBOX_SAFE_INSET;
  const safeBottom = viewBox.y + viewBox.height - VIEWBOX_SAFE_INSET;
  let dx = 0;
  let dy = 0;

  if (bounds.x < safeLeft) dx = safeLeft - bounds.x;
  if (bounds.x + bounds.width > safeRight) dx = safeRight - (bounds.x + bounds.width);
  if (bounds.y < safeTop) dy = safeTop - bounds.y;
  if (bounds.y + bounds.height > safeBottom) dy = safeBottom - (bounds.y + bounds.height);

  return { dx, dy };
}

function createPointLabelLayout(point, option, text, fontSize) {
  const absoluteX = point.x + option.x;
  const absoluteY = point.y + option.y;
  const textAnchor = option.textAnchor ?? 'start';
  const bounds = getTextBounds({ x: absoluteX, y: absoluteY, text, fontSize, textAnchor });

  return {
    x: option.x,
    y: option.y,
    textAnchor,
    rank: option.rank ?? 0,
    bounds,
  };
}

function getPointLabelCandidates(point, text, fontSize, preferred) {
  const options = [
    { ...preferred, rank: 0 },
    { x: 8, y: -8, textAnchor: 'start', rank: 1 },
    { x: -8, y: -8, textAnchor: 'end', rank: 2 },
    { x: 8, y: 12, textAnchor: 'start', rank: 3 },
    { x: -8, y: 12, textAnchor: 'end', rank: 4 },
    { x: 0, y: -14, textAnchor: 'middle', rank: 5 },
    { x: 0, y: 16, textAnchor: 'middle', rank: 6 },
    { x: 13, y: 2, textAnchor: 'start', rank: 7 },
    { x: -13, y: 2, textAnchor: 'end', rank: 8 },
  ];
  const seen = new Set();

  return options
    .filter((option) => {
      const key = `${option.x}:${option.y}:${option.textAnchor}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((option) => createPointLabelLayout(point, option, text, fontSize));
}

function choosePointLabelLayout(point, text, fontSize, preferred, viewBox, avoidBounds = []) {
  return getPointLabelCandidates(point, text, fontSize, preferred).reduce((best, candidate) => {
    const score = candidate.rank * 7 + getBoundsScore(candidate.bounds, viewBox, avoidBounds);

    return !best || score < best.score ? { ...candidate, score } : best;
  }, null);
}

function choosePointLabelPair({ userPoint, userText, userPreferred, selectedPoint, selectedText, selectedPreferred, viewBox }) {
  const userCandidates = getPointLabelCandidates(userPoint, userText, USER_LABEL_FONT_SIZE, userPreferred);
  const selectedCandidates = getPointLabelCandidates(selectedPoint, selectedText, NAME_LABEL_FONT_SIZE, selectedPreferred);
  let best = null;

  userCandidates.forEach((userCandidate) => {
    selectedCandidates.forEach((selectedCandidate) => {
      const score =
        userCandidate.rank * 7 +
        selectedCandidate.rank * 7 +
        getBoundsScore(userCandidate.bounds, viewBox) +
        getBoundsScore(selectedCandidate.bounds, viewBox) +
        getOverlapArea(userCandidate.bounds, selectedCandidate.bounds, LABEL_SAFE_GAP) * 18;

      if (!best || score < best.score) {
        best = {
          score,
          user: userCandidate,
          selected: selectedCandidate,
        };
      }
    });
  });

  return best ?? { user: null, selected: null };
}

function areBoundsEqual(a, b) {
  return (
    Math.abs(a.x - b.x) < 0.01 &&
    Math.abs(a.y - b.y) < 0.01 &&
    Math.abs(a.width - b.width) < 0.01 &&
    Math.abs(a.height - b.height) < 0.01
  );
}

function boundsToViewBox(bounds) {
  return `${bounds.x.toFixed(3)} ${bounds.y.toFixed(3)} ${bounds.width.toFixed(3)} ${bounds.height.toFixed(3)}`;
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function interpolateBounds(from, to, progress) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
  };
}

function getActiveViewBox(locations, fullBounds) {
  if (locations.length === 0) return fullBounds;

  const bounds = combineBounds([
    ...locations.map(getContinentBounds),
    ...locations.map((location) => {
      const point = getMapPoint(location);

      return { x: point.x, y: point.y, width: 0, height: 0 };
    }),
  ]);

  return clampBounds(padBounds(bounds, DEFAULT_PADDING), fullBounds);
}

function getUserConnectionPath(from, to) {
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + 48}, ${to.x + 44} ${to.y - 36}, ${to.x} ${to.y}`;
}

function getContactConnectionPath(from, to) {
  const lift = Math.min(92, Math.max(34, (from.y - to.y) * 0.42));

  return `M ${from.x} ${from.y} C ${from.x} ${from.y - lift}, ${to.x} ${to.y + 42}, ${to.x} ${to.y}`;
}

function getSoftAvatarConnectionPath(from, to) {
  const distanceX = Math.abs(to.x - from.x);
  const firstPull = Math.max(38, distanceX * 0.36);
  const secondPull = Math.max(22, distanceX * 0.24);
  const firstY = from.y - 6 + clampValue((to.y - from.y) * 0.12, -10, 8);
  const secondY = to.y - 4 - clampValue((from.y - to.y) * 0.18, -8, 14);

  return `M ${from.x} ${from.y} C ${from.x + firstPull} ${firstY}, ${to.x - secondPull} ${secondY}, ${to.x} ${to.y}`;
}

function getDistanceInKm(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function formatDistance(km) {
  return `${Math.round(km).toLocaleString('zh-CN')} 公里`;
}

function formatLocalTime(timeZone, date) {
  if (!TIME_FORMATTERS.has(timeZone)) {
    TIME_FORMATTERS.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
    );
  }

  const parts = TIME_FORMATTERS.get(timeZone).formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
}

function arePointsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

function getSafeContactInfoPosition(point, viewBox, forceBelow = false, preferAbove = false, options = {}) {
  const { avoidBounds = [], placeLabel = '', timeLabel = '', showTime = true } = options;
  const safeRight = viewBox.x + viewBox.width - VIEWBOX_SAFE_INSET;
  const safeTop = viewBox.y + VIEWBOX_SAFE_INSET;
  const preferLeft = point.x + 12 + CONTACT_INFO_WIDTH > safeRight;
  const preferBelow = !preferAbove && (forceBelow || point.y - CONTACT_INFO_HEIGHT - 12 < safeTop);
  const sideOrder = preferLeft ? ['left', 'right'] : ['right', 'left'];
  const verticalOrder = preferBelow ? ['below', 'above'] : ['above', 'below'];
  const candidates = verticalOrder.flatMap((vertical, verticalIndex) =>
    sideOrder.map((side, sideIndex) => ({
      side,
      vertical,
      rank: verticalIndex * 2 + sideIndex,
    }))
  );

  return candidates.reduce((best, candidate) => {
    const textAnchor = candidate.side === 'left' ? 'end' : 'start';
    const x = candidate.side === 'left' ? point.x - 10 : point.x + 10;
    const y = candidate.vertical === 'below' ? point.y + 18 : point.y - 21;
    const rawBounds = getInfoBounds({ x, y, textAnchor, placeLabel, timeLabel, showTime });
    const shift = getShiftIntoView(rawBounds, viewBox);
    const safeX = x + shift.dx;
    const safeY = y + shift.dy;
    const bounds = getInfoBounds({ x: safeX, y: safeY, textAnchor, placeLabel, timeLabel, showTime });
    const score = candidate.rank * 8 + getBoundsScore(bounds, viewBox, avoidBounds);

    if (best && best.score <= score) return best;

    return {
      x: safeX,
      y: safeY,
      textAnchor,
      timeY: safeY + 10,
      bounds,
      rect: bounds,
      score,
    };
  }, null);
}

function getSafeDistanceLabelPosition(point, viewBox, labelText = '', avoidBounds = []) {
  const options = [
    { x: 0, y: 0, rank: 0 },
    { x: 0, y: -13, rank: 1 },
    { x: 0, y: 13, rank: 2 },
    { x: 28, y: 0, rank: 3 },
    { x: -28, y: 0, rank: 4 },
    { x: 24, y: -10, rank: 5 },
    { x: -24, y: -10, rank: 6 },
    { x: 24, y: 10, rank: 7 },
    { x: -24, y: 10, rank: 8 },
  ];

  return options.reduce((best, option) => {
    const x = clampValue(
      point.x + option.x,
      viewBox.x + VIEWBOX_SAFE_INSET + DISTANCE_LABEL_WIDTH / 2,
      viewBox.x + viewBox.width - VIEWBOX_SAFE_INSET - DISTANCE_LABEL_WIDTH / 2
    );
    const y = clampValue(
      point.y + option.y,
      viewBox.y + VIEWBOX_SAFE_INSET + DISTANCE_LABEL_FONT_SIZE,
      viewBox.y + viewBox.height - VIEWBOX_SAFE_INSET
    );
    const rawBounds = getTextBounds({
      x,
      y: y + 2.5,
      text: labelText,
      fontSize: DISTANCE_LABEL_FONT_SIZE,
      textAnchor: 'middle',
      paddingX: LABEL_PADDING_X + 1,
    });
    const shift = getShiftIntoView(rawBounds, viewBox);
    const safeX = x + shift.dx;
    const safeY = y + shift.dy;
    const bounds = getTextBounds({
      x: safeX,
      y: safeY + 2.5,
      text: labelText,
      fontSize: DISTANCE_LABEL_FONT_SIZE,
      textAnchor: 'middle',
      paddingX: LABEL_PADDING_X + 1,
    });
    const score = option.rank * 7 + getBoundsScore(bounds, viewBox, avoidBounds);

    if (best && best.score <= score) return best;

    return {
      x: safeX,
      y: safeY,
      bounds,
      rect: bounds,
      score,
    };
  }, null);
}

function getPointDistance(from, to) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

function getSvgPoint(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return USER_AVATAR_FALLBACK_POINT;

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  return point.matrixTransform(matrix.inverse());
}

function getGridLocationFromSvgPoint(point, cols, rows) {
  return {
    mapX: clampValue(Math.floor(point.x / CELL_SIZE), 0, cols - 1),
    mapY: clampValue(Math.floor(point.y / CELL_SIZE), 0, rows - 1),
  };
}

function getRegionContactFromPoint(point, contacts, cols, rows) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;

  const clickedLocation = getGridLocationFromSvgPoint(point, cols, rows);
  const clickedBounds = getContinentBounds(clickedLocation);
  const sameRegionContacts = contacts.filter((contact) => areBoundsEqual(getContinentBounds(contact), clickedBounds));
  const contactPool = sameRegionContacts.length > 0 ? sameRegionContacts : contacts;

  return contactPool.reduce((nearestContact, contact) => {
    const distance = getPointDistance(point, getMapPoint(contact));
    if (!nearestContact || distance < nearestContact.distance) {
      return { contact, distance };
    }

    return nearestContact;
  }, null)?.contact ?? null;
}

export function PixelWorldMap({
  contacts = [],
  selectedContactId,
  showUserConnection = false,
  userAvatarRef,
  contactAvatarRefs,
  selectedAvatarRef,
  connectionTransition = null,
  showSelectedLocalTime = true,
  softAvatarConnection = false,
  onRegionContactSelect,
}) {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);
  const viewBoxAnimationRef = useRef(null);
  const [userAvatarPoint, setUserAvatarPoint] = useState(USER_AVATAR_FALLBACK_POINT);
  const [selectedAvatarPoint, setSelectedAvatarPoint] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [isPageVisible, setIsPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const [isMapVisible, setIsMapVisible] = useState(true);
  const selectedContact = useMemo(
    () => (selectedContactId === null ? null : contacts.find((contact) => contact.id === selectedContactId) ?? null),
    [contacts, selectedContactId]
  );
  const selectedTransitionMode =
    selectedContact?.id && connectionTransition?.contactId === selectedContact.id ? connectionTransition.mode : null;
  const selectedPinClassName = selectedTransitionMode ? `map-pin map-pin-${selectedTransitionMode}` : 'map-pin';
  const showDistanceOverlay = Boolean(selectedContact && showUserConnection);
  const activeLocations = useMemo(
    () => [selectedContact, showUserConnection ? USER_LOCATION : null].filter(Boolean),
    [selectedContact, showUserConnection]
  );
  const activeViewBox = useMemo(() => getActiveViewBox(activeLocations, FULL_VIEW_BOX), [activeLocations]);
  const targetViewBoxValue = boundsToViewBox(activeViewBox);
  const [animatedViewBox, setAnimatedViewBox] = useState(activeViewBox);
  const animatedViewBoxRef = useRef(activeViewBox);
  const viewBoxValue = boundsToViewBox(animatedViewBox);
  const shouldAnimateMap = isPageVisible && isMapVisible;
  const userPoint = getMapPoint(USER_LOCATION);
  const isMapInteractive = typeof onRegionContactSelect === 'function' && contacts.length > 0;
  const userConnectionPath = getUserConnectionPath(userAvatarPoint, userPoint);
  const selectedConnectionStart = selectedContact
    ? selectedAvatarPoint ?? { x: selectedContact.avatarSvgX, y: activeViewBox.y + activeViewBox.height + 120 }
    : null;
  const selectedConnectionPath = selectedContact
    ? softAvatarConnection
      ? getSoftAvatarConnectionPath(selectedConnectionStart, getMapPoint(selectedContact))
      : getContactConnectionPath(selectedConnectionStart, getMapPoint(selectedContact))
    : null;
  const selectedContactPoint = selectedContact ? getMapPoint(selectedContact) : null;
  const isSameMapPoint = Boolean(
    showDistanceOverlay &&
      selectedContactPoint &&
      Math.abs(userPoint.x - selectedContactPoint.x) < 0.01 &&
      Math.abs(userPoint.y - selectedContactPoint.y) < 0.01
  );
  const isNearMapPoint = Boolean(
    showDistanceOverlay &&
      selectedContactPoint &&
      !isSameMapPoint &&
      getPointDistance(userPoint, selectedContactPoint) <= NEAR_POINT_DISTANCE
  );
  const isCompactDistance = isSameMapPoint || isNearMapPoint;
  let distanceMidPoint = null;
  if (showDistanceOverlay && selectedContactPoint) {
    if (isCompactDistance) {
      distanceMidPoint = {
        x: Math.max(userPoint.x, selectedContactPoint.x) + 22,
        y: Math.min(userPoint.y, selectedContactPoint.y) - 4,
      };
    } else {
      distanceMidPoint = {
        x: (userPoint.x + selectedContactPoint.x) / 2,
        y: (userPoint.y + selectedContactPoint.y) / 2 - 7,
      };
    }
  }
  const selectedDistanceLabel = useMemo(
    () => (showDistanceOverlay ? formatDistance(getDistanceInKm(USER_LOCATION, selectedContact)) : ''),
    [selectedContact, showDistanceOverlay]
  );
  const selectedLocationLabel = selectedContact ? selectedContact.placeLabel ?? selectedContact.location : '';
  const selectedTimeLabel = useMemo(
    () => (selectedContact ? formatLocalTime(selectedContact.timeZone, now) : ''),
    [now, selectedContact]
  );
  const userLabelPreferred = isCompactDistance
    ? { x: -6, y: -9, textAnchor: 'end' }
    : { x: USER_LOCATION.labelDx, y: USER_LOCATION.labelDy, textAnchor: USER_LOCATION.anchor };
  const selectedLabelPreferred = selectedContact
    ? { x: selectedContact.labelDx, y: selectedContact.labelDy, textAnchor: selectedContact.anchor }
    : null;
  let selectedNameLabelLayout = null;
  let userNameLabelLayout = null;

  if (showUserConnection && selectedContact && selectedContactPoint && !isCompactDistance) {
    const labelPair = choosePointLabelPair({
      userPoint,
      userText: USER_LOCATION.name,
      userPreferred: userLabelPreferred,
      selectedPoint: selectedContactPoint,
      selectedText: selectedContact.name,
      selectedPreferred: selectedLabelPreferred,
      viewBox: animatedViewBox,
    });

    userNameLabelLayout = labelPair.user;
    selectedNameLabelLayout = labelPair.selected;
  } else {
    if (showUserConnection) {
      userNameLabelLayout = choosePointLabelLayout(
        userPoint,
        USER_LOCATION.name,
        USER_LABEL_FONT_SIZE,
        userLabelPreferred,
        animatedViewBox
      );
    }

    if (selectedContact && selectedContactPoint && !isCompactDistance) {
      selectedNameLabelLayout = choosePointLabelLayout(
        selectedContactPoint,
        selectedContact.name,
        NAME_LABEL_FONT_SIZE,
        selectedLabelPreferred,
        animatedViewBox,
        userNameLabelLayout ? [userNameLabelLayout.bounds] : []
      );
    }
  }

  const pointLabelBounds = [selectedNameLabelLayout?.bounds, userNameLabelLayout?.bounds].filter(Boolean);
  const selectedInfoPosition = selectedContactPoint
    ? getSafeContactInfoPosition(selectedContactPoint, animatedViewBox, isCompactDistance, softAvatarConnection, {
        avoidBounds: pointLabelBounds,
        placeLabel: selectedLocationLabel,
        timeLabel: selectedTimeLabel,
        showTime: showSelectedLocalTime,
      })
    : null;
  const safeDistanceLabelPoint = distanceMidPoint
    ? getSafeDistanceLabelPosition(
        distanceMidPoint,
        animatedViewBox,
        selectedDistanceLabel,
        [...pointLabelBounds, selectedInfoPosition?.bounds].filter(Boolean)
      )
    : null;
  const compactDistanceLineY = selectedContactPoint ? Math.max(userPoint.y, selectedContactPoint.y) + 9 : 0;
  const selectedPulseRadius = isCompactDistance ? 8 : 14;
  const selectedPulseValues = isCompactDistance ? '3;8;3' : '3;14;3';
  const userPulseRadius = isCompactDistance ? 7 : 12;
  const userPulseValues = isCompactDistance ? '4;7;4' : '5;12;5';
  useEffect(() => {
    if (!selectedContact || !showSelectedLocalTime || !isPageVisible || !isMapVisible) return undefined;
    const intervalId = window.setInterval(() => setNow(new Date()), 30000);

    return () => window.clearInterval(intervalId);
  }, [isMapVisible, isPageVisible, selectedContact, showSelectedLocalTime]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMapVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0.01 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewBoxAnimationRef.current) {
      cancelAnimationFrame(viewBoxAnimationRef.current);
    }

    const fromViewBox = animatedViewBoxRef.current;
    if (areBoundsEqual(fromViewBox, activeViewBox)) {
      setAnimatedViewBox(activeViewBox);
      animatedViewBoxRef.current = activeViewBox;
      svgRef.current?.setAttribute('viewBox', boundsToViewBox(activeViewBox));
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !shouldAnimateMap) {
      setAnimatedViewBox(activeViewBox);
      animatedViewBoxRef.current = activeViewBox;
      svgRef.current?.setAttribute('viewBox', boundsToViewBox(activeViewBox));
      return undefined;
    }

    const startedAt = performance.now();

    const animateViewBox = (now) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / VIEWBOX_ANIMATION_MS, 1);
      const easedProgress = easeInOutCubic(progress);
      const nextViewBox = interpolateBounds(fromViewBox, activeViewBox, easedProgress);

      animatedViewBoxRef.current = nextViewBox;
      svgRef.current?.setAttribute('viewBox', boundsToViewBox(nextViewBox));

      if (progress < 1) {
        viewBoxAnimationRef.current = requestAnimationFrame(animateViewBox);
      } else {
        animatedViewBoxRef.current = activeViewBox;
        setAnimatedViewBox(activeViewBox);
      }
    };

    viewBoxAnimationRef.current = requestAnimationFrame(animateViewBox);

    return () => {
      if (viewBoxAnimationRef.current) cancelAnimationFrame(viewBoxAnimationRef.current);
    };
  }, [activeViewBox, shouldAnimateMap, targetViewBoxValue]);

  useLayoutEffect(() => {
    if (!shouldAnimateMap) return undefined;
    if (!showUserConnection && selectedContactId === null) return undefined;
    let syncAnimationFrame = null;
    let scheduledAnimationFrame = null;
    let isScheduled = false;

    const updateAvatarPoints = () => {
      isScheduled = false;
      const svg = svgRef.current;
      if (!svg) return;

      const userAvatar = userAvatarRef?.current;
      if (showUserConnection && userAvatar) {
        const rect = userAvatar.getBoundingClientRect();
        const nextPoint = getSvgPoint(svg, rect.left + rect.width / 2, rect.bottom - 2);
        setUserAvatarPoint((current) => (arePointsEqual(current, nextPoint) ? current : nextPoint));
      }

      const selectedAvatar =
        selectedAvatarRef?.current ?? (selectedContactId === null ? null : contactAvatarRefs?.current?.[selectedContactId]);
      if (selectedAvatar) {
        const rect = selectedAvatar.getBoundingClientRect();
        const anchorX = softAvatarConnection ? rect.right - 4 : rect.left + rect.width / 2;
        const anchorY = softAvatarConnection ? rect.top + rect.height * 0.42 : rect.top + 2;
        const nextPoint = getSvgPoint(svg, anchorX, anchorY);
        setSelectedAvatarPoint((current) => (arePointsEqual(current, nextPoint) ? current : nextPoint));
      } else if (selectedContactId !== null) {
        setSelectedAvatarPoint((current) => (current === null ? current : null));
      }
    };

    const scheduleAvatarPointUpdate = () => {
      if (isScheduled) return;
      isScheduled = true;
      scheduledAnimationFrame = requestAnimationFrame(updateAvatarPoints);
    };

    updateAvatarPoints();
    const startedAt = performance.now();
    const syncAvatarPoints = (now) => {
      updateAvatarPoints();

      if (now - startedAt < VIEWBOX_ANIMATION_MS + 160) {
        syncAnimationFrame = requestAnimationFrame(syncAvatarPoints);
      }
    };

    syncAnimationFrame = requestAnimationFrame(syncAvatarPoints);
    window.addEventListener('resize', scheduleAvatarPointUpdate, { passive: true });
    window.addEventListener('scroll', scheduleAvatarPointUpdate, { passive: true, capture: true });

    return () => {
      if (syncAnimationFrame) cancelAnimationFrame(syncAnimationFrame);
      if (scheduledAnimationFrame) cancelAnimationFrame(scheduledAnimationFrame);
      window.removeEventListener('resize', scheduleAvatarPointUpdate);
      window.removeEventListener('scroll', scheduleAvatarPointUpdate, true);
    };
  }, [
    shouldAnimateMap,
    showUserConnection,
    selectedContactId,
    userAvatarRef,
    contactAvatarRefs,
    selectedAvatarRef,
    softAvatarConnection,
  ]);

  const handleMapClick = (event) => {
    if (!isMapInteractive) return;

    const svg = svgRef.current;
    if (!svg) return;

    const point = getSvgPoint(svg, event.clientX, event.clientY);
    const contact = getRegionContactFromPoint(point, contacts, MAP_COLS, MAP_ROWS);
    if (contact) onRegionContactSelect(contact);
  };

  const handleMapKeyDown = (event) => {
    if (!isMapInteractive || (event.key !== 'Enter' && event.key !== ' ')) return;

    event.preventDefault();
    onRegionContactSelect(contacts[0]);
  };

  return (
    <div ref={wrapperRef} className={isMapInteractive ? 'map-wrapper is-interactive' : 'map-wrapper'}>
      <svg
        ref={svgRef}
        viewBox={viewBoxValue}
        className="world-map"
        role={isMapInteractive ? 'button' : 'img'}
        tabIndex={isMapInteractive ? 0 : undefined}
        aria-label={isMapInteractive ? '点击地图区域，连接该地区的联系人' : '联系人所在城市的像素世界地图'}
        onClick={handleMapClick}
        onKeyDown={handleMapKeyDown}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0" />
            <stop offset="30%" stopColor={COLORS.primary} stopOpacity="0.4" />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity="1" />
          </linearGradient>
          {softAvatarConnection && selectedConnectionStart && selectedContactPoint && (
            <>
              <linearGradient
                id="avatarLineBaseGrad"
                gradientUnits="userSpaceOnUse"
                x1={selectedConnectionStart.x}
                y1={selectedConnectionStart.y}
                x2={selectedContactPoint.x}
                y2={selectedContactPoint.y}
              >
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0" />
                <stop offset="18%" stopColor={COLORS.primary} stopOpacity="0" />
                <stop offset="42%" stopColor={COLORS.primary} stopOpacity="0.2" />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.28" />
              </linearGradient>
              <linearGradient
                id="avatarLineFlowGrad"
                gradientUnits="userSpaceOnUse"
                x1={selectedConnectionStart.x}
                y1={selectedConnectionStart.y}
                x2={selectedContactPoint.x}
                y2={selectedContactPoint.y}
              >
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0" />
                <stop offset="20%" stopColor={COLORS.primary} stopOpacity="0" />
                <stop offset="44%" stopColor={COLORS.primary} stopOpacity="0.38" />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity="1" />
              </linearGradient>
            </>
          )}
        </defs>

        <path d={STATIC_MAP_PATHS.landPath} fill="#E2F2FC" />
        {STATIC_MAP_PATHS.waterPaths.map(({ opacity, path }) => (
          <path key={opacity} d={path} fill="#E7F4FC" opacity={opacity} />
        ))}

        {selectedContact && (
          <g className={selectedTransitionMode ? `map-contact-connection map-connection-${selectedTransitionMode}` : 'map-contact-connection'}>
            <path
              className="map-base-line"
              d={selectedConnectionPath}
              fill="none"
              stroke={softAvatarConnection ? 'url(#avatarLineBaseGrad)' : COLORS.primary}
              strokeLinecap="round"
              strokeOpacity={softAvatarConnection ? '1' : '0.24'}
              strokeWidth="1.5"
            />
            <path
              className="map-flow-line"
              d={selectedConnectionPath}
              fill="none"
              stroke={softAvatarConnection ? 'url(#avatarLineFlowGrad)' : 'url(#lineGrad)'}
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeWidth="1.5"
            >
              {shouldAnimateMap && <animate attributeName="stroke-dashoffset" values="8;0" dur="1s" repeatCount="indefinite" />}
            </path>
          </g>
        )}

        {showUserConnection && (
          <g>
            <path
              d={userConnectionPath}
              fill="none"
              stroke={COLORS.primary}
              strokeLinecap="round"
              strokeOpacity="0.24"
              strokeWidth="1.45"
            />
            <path
              d={userConnectionPath}
              fill="none"
              stroke={COLORS.primary}
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeOpacity="0.82"
              strokeWidth="1.45"
            >
              {shouldAnimateMap && <animate attributeName="stroke-dashoffset" values="8;0" dur="1.15s" repeatCount="indefinite" />}
            </path>
          </g>
        )}

        {selectedContactPoint && safeDistanceLabelPoint && (
          <g className="distance-overlay">
            {isSameMapPoint ? (
              <circle
                cx={selectedContactPoint.x}
                cy={selectedContactPoint.y}
                r="8"
                fill="none"
                stroke={COLORS.distance}
                strokeDasharray="3 3"
                strokeOpacity="0.58"
                strokeWidth="1"
              />
            ) : isNearMapPoint ? (
              <path
                d={`M ${userPoint.x} ${userPoint.y + 5} L ${userPoint.x} ${compactDistanceLineY} L ${selectedContactPoint.x} ${compactDistanceLineY} L ${selectedContactPoint.x} ${selectedContactPoint.y + 5}`}
                fill="none"
                stroke={COLORS.distance}
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.72"
                strokeWidth="1.15"
              />
            ) : (
              <line
                x1={userPoint.x}
                y1={userPoint.y}
                x2={selectedContactPoint.x}
                y2={selectedContactPoint.y}
                stroke={COLORS.distance}
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeOpacity="0.72"
                strokeWidth="1.15"
              />
            )}
          </g>
        )}

        {selectedContact && selectedContactPoint && (
          <g
            key={`pin-${selectedContact.id ?? selectedContact.name}`}
            transform={`translate(${selectedContactPoint.x}, ${selectedContactPoint.y})`}
            className={selectedPinClassName}
          >
            <circle cx="0" cy="0" r={selectedPulseRadius} fill="none" stroke={COLORS.primary} strokeWidth="1.2" opacity="0.8">
              {shouldAnimateMap && <animate attributeName="r" values={selectedPulseValues} dur="2s" repeatCount="indefinite" />}
              {shouldAnimateMap && <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />}
            </circle>

            <circle
              cx="0"
              cy="0"
              r={isCompactDistance ? '3.2' : '3.5'}
              fill={COLORS.primary}
              stroke={COLORS.bg}
              strokeWidth="1.5"
              className="pin-center"
            />

            {selectedNameLabelLayout && (
              <>
                <text
                  x={selectedNameLabelLayout.x}
                  y={selectedNameLabelLayout.y}
                  fontSize={NAME_LABEL_FONT_SIZE}
                  fontFamily="var(--l2l-font-ui)"
                  fill={COLORS.bg}
                  stroke={COLORS.bg}
                  strokeLinejoin="round"
                  strokeWidth="2"
                  fontWeight="400"
                  textAnchor={selectedNameLabelLayout.textAnchor}
                  className="map-label-outline"
                >
                  {selectedContact.name}
                </text>
                <text
                  x={selectedNameLabelLayout.x}
                  y={selectedNameLabelLayout.y}
                  fontSize={NAME_LABEL_FONT_SIZE}
                  fontFamily="var(--l2l-font-ui)"
                  fill={COLORS.primaryDeep}
                  fontWeight="400"
                  letterSpacing="0.2"
                  textAnchor={selectedNameLabelLayout.textAnchor}
                  className="map-label"
                >
                  {selectedContact.name}
                </text>
              </>
            )}
          </g>
        )}

        {selectedInfoPosition && (
          <g className={selectedTransitionMode ? `map-contact-info map-info-${selectedTransitionMode}` : 'map-contact-info'}>
            <text
              x={selectedInfoPosition.x}
              y={selectedInfoPosition.y}
              fill={COLORS.bg}
              stroke={COLORS.bg}
              strokeLinejoin="round"
              strokeWidth="2.6"
              fontFamily="var(--l2l-font-ui)"
              fontSize="8"
              fontWeight="400"
              textAnchor={selectedInfoPosition.textAnchor}
              className="map-contact-place-outline"
            >
              {selectedLocationLabel}
            </text>
            <text
              x={selectedInfoPosition.x}
              y={selectedInfoPosition.y}
              fill={COLORS.primary}
              fontFamily="var(--l2l-font-ui)"
              fontSize="8"
              fontWeight="400"
              textAnchor={selectedInfoPosition.textAnchor}
              className="map-contact-place"
            >
              {selectedLocationLabel}
            </text>
            {showSelectedLocalTime && (
              <>
                <text
                  x={selectedInfoPosition.x}
                  y={selectedInfoPosition.timeY}
                  fill={COLORS.bg}
                  stroke={COLORS.bg}
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                  fontFamily="var(--l2l-font-ui)"
                  fontSize="7.5"
                  fontWeight="400"
                  letterSpacing="0.2"
                  textAnchor={selectedInfoPosition.textAnchor}
                  className="map-contact-time-outline"
                >
                  {selectedTimeLabel}
                </text>
                <text
                  x={selectedInfoPosition.x}
                  y={selectedInfoPosition.timeY}
                  fill={COLORS.textGray}
                  fontFamily="var(--l2l-font-ui)"
                  fontSize="7.5"
                  fontWeight="400"
                  letterSpacing="0.2"
                  textAnchor={selectedInfoPosition.textAnchor}
                  className="map-contact-time"
                >
                  {selectedTimeLabel}
                </text>
              </>
            )}
          </g>
        )}

        {showUserConnection && userNameLabelLayout && (
          <g transform={`translate(${userPoint.x}, ${userPoint.y})`} className="map-user">
            <circle cx="0" cy="0" r={userPulseRadius} fill="none" stroke={COLORS.primary} strokeWidth="1.2" opacity="0.72">
              {shouldAnimateMap && <animate attributeName="r" values={userPulseValues} dur="2.4s" repeatCount="indefinite" />}
              {shouldAnimateMap && <animate attributeName="opacity" values="0.72;0.12;0.72" dur="2.4s" repeatCount="indefinite" />}
            </circle>
            <circle cx="0" cy="0" r="4.2" fill={COLORS.primary} stroke={COLORS.bg} strokeWidth="1.5" />
            <text
              x={userNameLabelLayout.x}
              y={userNameLabelLayout.y}
              fontSize={USER_LABEL_FONT_SIZE}
              fontFamily="var(--l2l-font-ui)"
              fill={COLORS.bg}
              stroke={COLORS.bg}
              strokeLinejoin="round"
              strokeWidth="2"
              fontWeight="400"
              textAnchor={userNameLabelLayout.textAnchor}
              className="map-label-outline"
            >
              {USER_LOCATION.name}
            </text>
            <text
              x={userNameLabelLayout.x}
              y={userNameLabelLayout.y}
              fontSize={USER_LABEL_FONT_SIZE}
              fontFamily="var(--l2l-font-ui)"
              fill={COLORS.primaryDeep}
              fontWeight="400"
              letterSpacing="0.2"
              textAnchor={userNameLabelLayout.textAnchor}
              className="map-label"
            >
              {USER_LOCATION.name}
            </text>
          </g>
        )}

        {selectedContactPoint && safeDistanceLabelPoint && (
          <g className="distance-label-layer">
            <text
              x={safeDistanceLabelPoint.x}
              y={safeDistanceLabelPoint.y + 2.5}
              fill={COLORS.bg}
              stroke={COLORS.bg}
              strokeLinejoin="round"
              strokeWidth="2.4"
              fontFamily="var(--l2l-font-ui)"
              fontSize={DISTANCE_LABEL_FONT_SIZE}
              fontWeight="400"
              letterSpacing="0.2"
              textAnchor="middle"
              className="map-label-outline"
            >
              {selectedDistanceLabel}
            </text>
            <text
              x={safeDistanceLabelPoint.x}
              y={safeDistanceLabelPoint.y + 2.5}
              fill={COLORS.distanceText}
              fontFamily="var(--l2l-font-ui)"
              fontSize={DISTANCE_LABEL_FONT_SIZE}
              fontWeight="400"
              letterSpacing="0.2"
              textAnchor="middle"
            >
              {selectedDistanceLabel}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
