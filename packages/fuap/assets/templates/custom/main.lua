-- @author 寒歌
-- @description Main是应用的主模块，其中注册了应用运行中UI事件的回调、Activity生命周期的回调等
-- 你也可以在此编写启动事件代码，或控制应用运行逻辑、自定义应用UI等等。
-- @other 本模版已为你编写好基础事件，建议在阅读注释并理解相关参数意义后再进行扩展编写
-- 特别注意：本初始化模板为自定义视图演示模板，未提供其它功能使用示例，如需了解其它内置UI组件使用示例，请创建其它对应模板
--
require"import"
import "com.google.android.material.card.MaterialCardView"
import "com.google.android.material.textfield.TextInputLayout"
import "android.widget.*"
import "android.view.WindowManager"
import "com.google.android.material.snackbar.Snackbar"
import "com.google.android.material.button.MaterialButton"
import "com.google.android.material.textfield.TextInputEditText"
import "android.graphics.Color"
import "net.fusionapp.core.ui.adapter.BasePagerAdapter"

--导入layout布局
import "layout"


--UI管理器
UiManager=this.UiManager
local viewPager=UiManager.viewPager
--加载layout
local list=ArrayList()
list.add(loadlayout(layout))

viewPager.setAdapter(BasePagerAdapter(list))


--设置卡片标题
title.text="CustomView"
--设置卡片内容
local messageBuilder=StringBuilder()
messageBuilder.append("1.Use the \"setAdapter\" function to set the view")
messageBuilder.append("\n\n")
messageBuilder.append("2.Support all widgets from androidx and design package")
message.text=tostring(messageBuilder)

--设置按钮事件，弹出Snackbar
button.onClick=function(v)
  local parent=UiManager.coordinatorLayout
  local duration=Snackbar.LENGTH_SHORT
  Snackbar.make(parent,getShowText(), duration)
  .setActionTextColor(Color.parseColor(UiManager.getColors().getColorAccent()))
  .setAction("OK",{onClick=function()
      print("OK")
    end})
  .show()
end

--获取编辑框输入的文本
function getShowText()
  local text= edit_text.text
  if text=="" then
    return "No Input"
   else
    return text
  end
end