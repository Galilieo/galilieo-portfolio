import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const playlistId = args[0] || '18145116776';
const outputFlag = args.indexOf('--output');
const outputPath = path.resolve(
  outputFlag >= 0 && args[outputFlag + 1] ? args[outputFlag + 1] : 'src/data/music.ts',
);
const headers = {
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://music.163.com/',
};

async function fetchJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function probeAudio(id) {
  const audioUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  try {
    const response = await fetch(audioUrl, {
      headers: { ...headers, Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const type = response.headers.get('content-type') || '';
    await response.body?.cancel();
    return response.ok && type.startsWith('audio/');
  } catch {
    return false;
  }
}

function quote(value) {
  return JSON.stringify(value ?? '');
}

function secureUrl(value) {
  return typeof value === 'string' ? value.replace(/^http:\/\//, 'https://') : '';
}

function renderTrack(track) {
  const id = String(track.id);
  const artist = (track.ar || track.artists || [])
    .map((item) => item.name)
    .filter(Boolean)
    .join(' / ');
  const album = track.al || track.album || {};
  return {
    id,
    title: track.name || '未知歌曲',
    artist: artist || '未知歌手',
    album: album.name || '',
    cover: secureUrl(album.picUrl),
    sourceUrl: `https://music.163.com/#/song?id=${id}`,
    audioUrl: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
  };
}

function renderFile(playlistUrl, tracks) {
  const rows = tracks
    .map(
      (track) => `  {
    id: ${quote(track.id)},
    title: ${quote(track.title)},
    artist: ${quote(track.artist)},
    album: ${quote(track.album)},
    cover: ${quote(track.cover)},
    sourceUrl: ${quote(track.sourceUrl)},
    audioUrl: ${quote(track.audioUrl)},
    playable: ${track.playable},
  },`,
    )
    .join('\n');

  return `export interface HomeMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  sourceUrl: string;
  audioUrl: string;
  playable: boolean;
}

export const homeMusicPlaylistUrl = ${quote(playlistUrl)};

/** 由 \`pnpm run sync:music\` 从公开网易云歌单生成；构建和访问页面时不请求元数据接口。 */
export const homeMusicTracks: HomeMusicTrack[] = [
${rows}
];
`;
}

const playlistUrl = `https://music.163.com/#/playlist?id=${playlistId}`;
const detail = await fetchJson(`https://music.163.com/api/v6/playlist/detail?id=${playlistId}`);
const playlist = detail.playlist;
if (!playlist || !Array.isArray(playlist.trackIds)) throw new Error('网易云歌单响应缺少 trackIds');

let sourceTracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
const sourceIds = new Set(sourceTracks.map((track) => String(track.id)));
const missingIds = playlist.trackIds
  .map((item) => String(item.id))
  .filter((id) => !sourceIds.has(id));
if (missingIds.length > 0) {
  const songDetail = await fetchJson(
    `https://music.163.com/api/song/detail/?ids=[${missingIds.join(',')}]`,
  );
  sourceTracks = sourceTracks.concat(songDetail.songs || []);
}

const byId = new Map(sourceTracks.map((track) => [String(track.id), track]));
const orderedTracks = playlist.trackIds.map((item) => byId.get(String(item.id))).filter(Boolean);
const tracks = await Promise.all(
  orderedTracks.map(async (track) => ({
    ...renderTrack(track),
    playable: await probeAudio(track.id),
  })),
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, renderFile(playlistUrl, tracks), 'utf8');
console.log(
  JSON.stringify(
    {
      playlist: playlist.name,
      playlistId,
      tracks: tracks.length,
      playable: tracks.filter((track) => track.playable).length,
      output: outputPath,
    },
    null,
    2,
  ),
);
