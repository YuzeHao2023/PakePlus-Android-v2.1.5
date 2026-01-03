local context = activity or service

local LuaBitmap = luajava.bindClass "com.androlua.LuaBitmap"
local function loadbitmap(path)
    if not path:find("^https*://") and not path:find("%.%a%a%a%a?$") then
        path = path .. ".png"
    end
    if path:find("^https*://") then
        return LuaBitmap.getHttpBitmap(context.luaSupport, path)
    elseif not path:find("^/") then
        local findPath;
        if (context.loader ~= nil) then
            findPath = context.loader.getImagePath(path)
        end
        if (findPath ~= nil) then
            return LuaBitmap.getLocalBitmap(context.luaSupport, findPath)
        else
            return LuaBitmap.getLocalBitmap(context.luaSupport, path)
        end
    else
        return LuaBitmap.getLocalBitmap(context.luaSupport, path)
    end
end

return loadbitmap
