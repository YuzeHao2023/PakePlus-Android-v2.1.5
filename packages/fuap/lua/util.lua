local util={}

util.getR=function(context)
    if context.getPackageName()=="net.fusionapp" then
        return luajava.bindClass "net.fusionapp.R"
    else
        return luajava.bindClass "net.fusionapp.core.R"
    end
end

return util