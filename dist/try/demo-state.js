import {upgradeCircles} from './parity-model.js?v=0.6.7';
const requiredCollections = ['tasks', 'commitments', 'plan', 'activities', 'sessions'];
const collections = new Set([...requiredCollections, 'circles', 'checkins']);

export function readDemoState(raw) {
  let saved;
  try { saved = JSON.parse(raw); }
  catch { return null; }
  return saved?.version === 1 && typeof saved.ready === 'boolean' &&
    typeof saved.profile?.name === 'string' &&
    requiredCollections.every(key => Array.isArray(saved[key])) ? upgradeCircles(saved) : null;
}

export const sameState = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function mergeFields(before, local, latest) {
  const result = {...latest};
  for (const key of new Set([...Object.keys(before), ...Object.keys(local)])) {
    if (sameState(before[key], local[key])) continue;
    if (Object.hasOwn(local, key)) result[key] = local[key];
    else delete result[key];
  }
  return result;
}

function mergeRecords(before, local, latest) {
  // Historical focus summaries have no ID and are append-only.
  const byId = records => new Map(records.map((record, index) => [record.id ?? `legacy:${index}`, record]));
  const original = byId(before), edited = byId(local), merged = byId(latest);
  for (const [id, record] of original) {
    if (!edited.has(id)) merged.delete(id);
    else if (merged.has(id) && !sameState(record, edited.get(id))) {
      merged.set(id, mergeFields(record, edited.get(id), merged.get(id)));
    }
  }
  for (const [id, record] of edited) {
    if (!original.has(id) && !merged.has(id)) merged.set(id, record);
  }
  return [...merged.values()];
}

export function mergeDemoState(before, local, latest) {
  if (local.generation !== before.generation) return local;
  if (latest.generation !== before.generation) return latest;

  const merged = mergeFields(before, local, latest);
  merged.profile = mergeFields(before.profile, local.profile, latest.profile);
  for (const key of collections) {
    merged[key] = mergeRecords(before[key] || [], local[key] || [], latest[key] || []);
  }
  if (before.focus?.start !== latest.focus?.start) {
    merged.focus = latest.focus;
  } else if (before.focus && local.focus && latest.focus) {
    merged.focus = mergeFields(before.focus, local.focus, latest.focus);
  }
  return merged;
}
