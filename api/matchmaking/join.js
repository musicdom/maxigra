import { auth, errorResponse, initialBoard, publicGame, redis, reply } from '../_lib.js';

const QUEUE = 'checkers:queue';

const SCRIPT = `
local queue = KEYS[1]
local myRoomKey = KEYS[2]
local myPresenceKey = KEYS[3]
local myProfileKey = KEYS[4]
local onlineKey = KEYS[5]
local uid = ARGV[1]
local profile = ARGV[2]
local initial = ARGV[3]
local seed = tonumber(ARGV[4]) or 1

local existing = redis.call('GET', myRoomKey)
if existing then
  local oldRaw = redis.call('GET', 'checkers:room:' .. existing)
  if oldRaw then
    local old = cjson.decode(oldRaw)
    if old.status == 'playing' then
      redis.call('SADD', onlineKey, uid)
      redis.call('SET', myPresenceKey, '1', 'EX', 120)
      return {'MATCHED', existing}
    end
  end
  redis.call('DEL', myRoomKey)
end

redis.call('SET', myPresenceKey, '1', 'EX', 120)
redis.call('SET', myProfileKey, profile, 'EX', 2592000)
redis.call('SADD', onlineKey, uid)
redis.call('SREM', queue, uid)

-- Find a real waiting opponent. Remove stale queue entries and never
-- match a player who already has an active game room.
local candidates = redis.call('SMEMBERS', queue)
local opponent = nil
for _, candidate in ipairs(candidates) do
  if candidate ~= uid then
    local presenceKey = 'checkers:presence:' .. candidate
    local candidateRoomKey = 'checkers:room:user:' .. candidate
    local candidateRoom = redis.call('GET', candidateRoomKey)
    if redis.call('EXISTS', presenceKey) == 0 then
      redis.call('SREM', queue, candidate)
    elseif candidateRoom then
      local candidateRoomRaw = redis.call('GET', 'checkers:room:' .. candidateRoom)
      if candidateRoomRaw then
        local candidateGame = cjson.decode(candidateRoomRaw)
        if candidateGame.status == 'playing' then
          redis.call('SREM', queue, candidate)
        else
          redis.call('DEL', candidateRoomKey)
          redis.call('SREM', queue, candidate)
        end
      else
        redis.call('DEL', candidateRoomKey)
        redis.call('SREM', queue, candidate)
      end
    else
      opponent = candidate
      break
    end
  end
end

if not opponent then
  redis.call('SADD', queue, uid)
  return {'WAITING'}
end

redis.call('SREM', queue, opponent)
local opponentProfile = redis.call('GET', 'checkers:user:' .. opponent) or '{}'
local p1 = cjson.decode(profile)
local p2 = cjson.decode(opponentProfile)
math.randomseed(seed)
local p1Side = math.random(0,1) == 0 and 1 or 2
local p2Side = p1Side == 1 and 2 or 1
local roomId = 'r' .. uid .. '-' .. opponent .. '-' .. tostring(seed)
local room = {
  id = roomId, status = 'playing', p1 = p1, p2 = p2,
  p1Side = p1Side, p2Side = p2Side, board = cjson.decode(initial),
  turn = 1, chain = cjson.null, halfMoves = 0, reps = {}, winner = cjson.null,
  lastMove = cjson.null, createdAt = tonumber(ARGV[5]), updatedAt = tonumber(ARGV[5])
}
redis.call('SET', 'checkers:room:' .. roomId, cjson.encode(room), 'EX', 7200)
redis.call('SET', 'checkers:room:user:' .. uid, roomId, 'EX', 7200)
redis.call('SET', 'checkers:room:user:' .. opponent, roomId, 'EX', 7200)
redis.call('SET', 'checkers:presence:' .. uid, '1', 'EX', 120)
redis.call('SET', 'checkers:presence:' .. opponent, '1', 'EX', 120)
redis.call('SADD', onlineKey, uid, opponent)
return {'MATCHED', roomId}
`;

export async function POST(request) {
  try {
    const user = auth(request);
    const result = await redis('EVAL', [
      SCRIPT, 5, QUEUE, `checkers:room:user:${user.id}`, `checkers:presence:${user.id}`, `checkers:user:${user.id}`, 'checkers:online',
      user.id, JSON.stringify(user), JSON.stringify(initialBoard()), String(Math.floor(Math.random() * 2147483646) + 1), String(Date.now())
    ]);
    if (result?.[0] === 'MATCHED') {
      const roomRaw = await redis('GET', [`checkers:room:${result[1]}`]);
      const room = JSON.parse(roomRaw);
      return reply({ ok: true, status: 'matched', game: publicGame(room, user.id), roomId: result[1] });
    }
    return reply({ ok: true, status: 'waiting' });
  } catch (error) { return errorResponse(error); }
}
export default { POST };
