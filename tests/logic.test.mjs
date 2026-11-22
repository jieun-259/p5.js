import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { RoomScoringEngine, ALL_OPTION_KEYS } = require('../js/scoring.js');
const {
  formatDateKey,
  getRelativeDateKey,
  getMonthGrid,
  sortVisits,
  groupVisitsByDate,
} = require('../js/calendarUtils.js');

test('normalizeWeights balances slider inputs to 100%', () => {
  const engine = new RoomScoringEngine();
  const res = engine.normalizeWeights({ price: 40, distance: 30, area: 20, option: 10 });
  assert.equal(res.percents.price, 40);
  assert.equal(res.percents.distance, 30);
  assert.equal(res.percents.area, 20);
  assert.equal(res.percents.option, 10);

  const zeroRes = engine.normalizeWeights({ price: 0, distance: 0, area: 0, option: 0 });
  assert.equal(zeroRes.percents.price, 25);
  assert.equal(zeroRes.percents.option, 25);
});

test('rankProperties dynamically re-ranks when weights change', () => {
  const engine = new RoomScoringEngine();
  const cheapFar = {
    id: 'a',
    name: '저렴한 원룸',
    deposit: 300,
    rent: 34,
    maintenanceFee: 3,
    distanceMinutes: 18,
    areaPyeong: 5.5,
    options: ['에어컨', '세탁기'],
    rating: 4,
    checklist: { water: 'good', light: 'good', mold: 'good', noise: 'pending', options: 'pending', security: 'pending' },
  };
  const closeExpensive = {
    id: 'b',
    name: '정문 바로 앞 오피스텔',
    deposit: 1000,
    rent: 62,
    maintenanceFee: 8,
    distanceMinutes: 2,
    areaPyeong: 8.5,
    options: ALL_OPTION_KEYS,
    rating: 5,
    checklist: { water: 'good', light: 'good', mold: 'good', noise: 'good', options: 'good', security: 'good' },
  };

  const priceFocused = engine.rankProperties([cheapFar, closeExpensive], {
    price: 85,
    distance: 5,
    area: 5,
    option: 5,
  });
  assert.equal(priceFocused[0].property.id, 'a');
  assert.equal(priceFocused[0].rank, 1);

  const distanceFocused = engine.rankProperties([cheapFar, closeExpensive], {
    price: 5,
    distance: 70,
    area: 15,
    option: 10,
  });
  assert.equal(distanceFocused[0].property.id, 'b');
  assert.equal(distanceFocused[0].rank, 1);
});

test('calculateDistanceFromMapCoords translates pin drag coordinates into walking minutes', () => {
  const engine = new RoomScoringEngine();
  const near = engine.calculateDistanceFromMapCoords(0.52, 0.52);
  const far = engine.calculateDistanceFromMapCoords(0.95, 0.90);
  assert.ok(near < far);
  assert.ok(near >= 1 && far <= 25);
});

test('getMonthGrid generates 42 cells with accurate today highlight', () => {
  const grid = getMonthGrid(2026, 10, '2026-11-22'); // November 2026
  assert.equal(grid.length, 42);
  const todayCell = grid.find((c) => c.dateKey === '2026-11-22');
  assert.ok(todayCell);
  assert.equal(todayCell.isToday, true);
  assert.equal(todayCell.isCurrentMonth, true);
});

test('sortVisits and groupVisitsByDate order visits chronologically', () => {
  const base = new Date(2026, 10, 22);
  const d1 = formatDateKey(base);
  const d2 = getRelativeDateKey(2, base);
  const visits = [
    { id: 'v2', date: d2, time: '10:00' },
    { id: 'v3', date: d1, time: '16:30' },
    { id: 'v1', date: d1, time: '11:00' },
  ];
  const sorted = sortVisits(visits);
  assert.deepEqual(
    sorted.map((v) => v.id),
    ['v1', 'v3', 'v2']
  );
  const grouped = groupVisitsByDate(visits);
  assert.equal(grouped[d1].length, 2);
  assert.equal(grouped[d2].length, 1);
});
