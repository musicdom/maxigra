import { auth, body, createGame, errorResponse, initialBoard, redis, reply } from '../_lib.js';

const QUEUE = 'checkers:queue';

const SCRIPT = `
local queue = KEYS[1]
local myRoomKey = KEYS[2]
local myPresenceKey = KEYS[3]
local myProfileKey = KEYS[4]
local uid = ARGV[1]
local profile = ARGV[2]
local initial = ARGV[3]
local seed = tonumber(ARGV[4]) or 1

local existing = redis.call('GET', myRoomKey)
if existing then
  return {'MATCHED', existing}
end

redis.call('SET', myPresenceKey, '1', 'EX', 120)
redis.call('SET', myProfileKey, profile, 'EX', 120)
redis.call('SREM', queue, uid)

local candidates = redis.call('SRANDMEMBER', queue, 20)
local opponent = nil
if type(candidates) == 'table' then
  for _, candidate in ipairs(candidates) do
    if candidate ~= uid and redis.call('EXISTS', 'checkers:presence:' .. candidate) == 1 then
      opponent = candidate
      break
    end
  end
elseif candidates and candidates ~= uid and redis.call('EXISTS', 'checkers:presence:' .. candidates) == 1 then
  opponent = candidates
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
local roomJson = cjson.encode(room)
redis.call('SET', 'checkers:room:' .. roomId, roomJson, 'EX', 7200)
redis.call('SET', 'checkers:room:user:' .. uid, roomId, 'EX', 7200)
redis.call('SET', 'checkers:room:user:' .. opponent, roomId, 'EX', 7200)
redis.call('SET', 'checkers:presence:' .. uid, '1', 'EX', 7200)
redis.call('SET', 'checkers:presence:' .. opponent, '1', 'EX', 7200)
return {'MATCHED', roomId}
`;

export async function POST(request) {
  try {
    const user = auth(request);
    const result = await redis('EVAL', [
      SCRIPT, 4, QUEUE, `checkers:room:user:${user.id}`, `checkers:presence:${user.id}`, `checkers:user:${user.id}`,
      user.id, JSON.stringify(user), JSON.stringify(initialBoard()), String(Math.floor(Math.random() * 2147483646) + 1), String(Date.now())
    ]);
    if (result?.[0] === 'MATCHED') {
      const roomRaw = await redis('GET', `checkers:room:${result[1]}`);
      const room = JSON.parse(roomRaw);
      return reply({ ok: true, status: 'matched', game: room.p1.id === user.id ? createGame(room.id, room.p1, room.p2, room.p1Side, room.p2Side) : room, roomId: result[1] });
    }
    return reply({ ok: true, status: 'waiting' });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
