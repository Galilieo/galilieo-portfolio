---
title: '一个两行修复，为什么从 Vue 一直追到了 Android 原生插件？'
description: '从正常与失败保存路径的第一次分叉出发，复盘一次跨越 Vue、Capacitor、Android MediaStore 和 Git 历史的媒体保存问题。'
publishedAt: '2026-07-17'
category: '前端与移动端'
tags:
  - 'Vue 3'
  - 'Capacitor'
  - 'Android'
  - '问题排查'
draft: false
featured: false
readingTime: 9
order: 15
homepageState: '已发布'
---

这次 Bug 最后只改了两处调用。

难的不是怎么改，而是先确认为什么只应该改这两处。问题同时经过 Vue 页面、JavaScript 工具函数、Capacitor 插件和 Android 原生代码，中间还夹着一段已经被遗忘的 Git 历史。如果只看最终 diff，它很像一次普通的函数替换；如果没有前面的证据，这个替换其实只是猜测。

## 三个看起来矛盾的现象

Android 端最初有四个表现：

- 在角色相册中长按图片或视频，点击 Save 后保存失败；
- 同一个长按菜单中的 Delete 可以正常执行；
- 点击媒体进入预览页后，再点击 Save，却可以正常保存；
- 另一个生成结果页面中的图片和视频也无法保存。

第一反应很容易落到权限、媒体 URL 或 Android 存储上。但“同一个媒体在预览页可以保存”改变了排查方向。

Delete 正常，说明长按识别、菜单和当前媒体对象没有整体失效。媒体能够显示并进入预览，说明 URL 至少不是普遍为空。预览页又能写入相册，说明 Android 的保存权限和相册能力也没有整体失效。

剩下更值得怀疑的是：这些入口并没有走同一条保存链路。

## 正常路径就是现成的对照组

我从用户实际点击的 Save 往下追，得到三条路径：

```text
角色相册长按保存
→ handleAlbumItemSave
→ savePicture(url)
→ 失败
```

```text
角色相册预览保存
→ SaveImg
→ saveImageToGallery(url, isVideo)
→ 成功
```

```text
生成结果保存
→ saveMedia
→ savePicture(url)
→ 失败
```

把结果放在一起，第一次分叉已经很清楚：

| 保存入口 | 保存方法 | 结果 |
| --- | --- | --- |
| 角色相册长按 | `savePicture` | 失败 |
| 角色相册预览 | `saveImageToGallery` | 成功 |
| 生成结果页面 | `savePicture` | 失败 |

所有失败入口都经过 `savePicture`，正常入口则经过 `saveImageToGallery`。

这一步让我没有继续扩大搜索范围。权限、下载和 MediaStore 仍然可能参与问题，但应该先看两个函数到底有什么不同。

## 旧链路首先暴露了视频问题

`saveImageToGallery` 明确接收媒体类型：

```ts
export const saveImageToGallery = async (photo: string, isVideo: boolean) => {
  return isVideo
    ? ChatSavePhoto.downloadVideo({ url: photo })
    : ChatSavePhoto.savePhoto({ url: photo })
}
```

图片和视频从这里开始就是两条原生路径。

`savePicture` 的做法不同。它先通过 `CapacitorHttp` 下载网络资源，再把结果交给另一个保存方法：

```ts
export const savePicture = async (webUrl: string) => {
  const response = await CapacitorHttp.get({
    url: webUrl,
    responseType: 'blob',
  })

  await savePhotoOnline(response.data)
}
```

继续向下看，文件名被固定成了 JPG：

```ts
await SaveImage.saveBase64({
  data: base64Data,
  fileName: `${Date.now()}.jpg`,
})
```

这条链路没有 `isVideo`、视频 MIME Type 或 `.mp4` 扩展名。即使原生插件仍然可用，它也不应该承担视频保存。

这能解释视频失败，却还不能解释图片为什么也失败。下一步必须确认 `SaveImage` 在 Android 中到底是什么。

## `registerPlugin()` 只创建了代理

前端仍然保留着插件声明：

```ts
const SaveImage = registerPlugin('SaveImage')
```

这行代码很容易制造一种错觉：插件已经注册，所以 Android 应该能够调用它。

但 Capacitor 的 `registerPlugin()` 只会在 JavaScript 层创建代理。Android 端还需要存在名称对应的原生实现，例如：

```java
@CapacitorPlugin(name = "SaveImage")
public class SaveImagePlugin extends Plugin {
    // ...
}
```

我先查看当前 Android 插件列表：

```bash
npx cap ls android
```

结果中能找到 `chat-savephoto`，找不到 `SaveImage`。继续搜索 Android 原生工程，也没有对应的插件类和注册代码。

于是图片失败的链路闭合了：

```text
savePicture(url)
→ SaveImage.saveBase64(...)
→ JavaScript 代理存在
→ Android 原生实现不存在
→ 运行时失败
```

这类问题可以绕过前端静态检查。import 正常、函数存在、TypeScript 不报错、生产构建通过，都不能证明目标平台真的实现了这个插件。只有调用进入原生桥时，缺失才会暴露。

## 正常插件已经完成了 Android 适配

插件列表只能证明 `ChatSavePhoto` 已被 Android 识别，我又继续查看了它的原生实现。

图片保存会下载 URL，根据文件内容识别 JPEG、PNG、GIF 或 WebP，设置对应的 MIME Type 和扩展名，再写入 `MediaStore.Images`。视频保存使用 `.mp4` 和 `video/mp4`，写入 `MediaStore.Video`。

它也处理了 Android 版本差异：Android 10 及以上使用 MediaStore，更低版本写入公共目录后通知媒体扫描器刷新。

因此，`saveImageToGallery` 不是一个只适用于 iOS 的前端包装。它背后的插件已经同时具备 Android 图片和视频保存能力。角色相册预览页的真机结果又提供了直接证据：这条链路在当前应用中确实可以工作。

## Git 历史补上了缺失的一半

当前状态已经足够解释 Bug，但还解释不了“为什么项目里会同时存在一条有效链路和一条失效链路”。

查看 Git 历史后，我发现旧 Android 工程曾经有 `SaveImagePlugin`，`savePicture()` 在那个阶段并不是死代码。后来 Android 工程调整包路径和原生目录，旧插件被删除，新入口没有重新注册它；前端包装函数却继续保留。

之后公共代码中出现了平台判断：

```ts
if (Capacitor.getPlatform() === 'ios') {
  return saveImageToGallery(url, isVideo)
}

return savePicture(url)
```

这段代码在 iOS 上只会执行 `saveImageToGallery`，不会进入 Android 的旧路径。只验证 iOS 时，自然看不到 `SaveImage` 已经从 Android 原生工程消失。

等公共代码进入 Android 分支，旧路径再次被实际执行，问题才暴露出来。

所以这不是 Git 冲突解决错误。代码没有丢失，也没有残留冲突标记。真正失效的是一条历史假设：公共代码仍然认为 Android 保留着旧保存插件，而 Android 原生工程早已换了实现。

```text
Merge 成功
≠ 平台假设仍然成立
```

Git 能合并文本，不能替我们验证插件、权限和平台生命周期。

## 为什么没有恢复旧插件

定位完成后有两个选择。

第一个选择是恢复 `SaveImagePlugin`。这样可以继续兼容 `savePicture()`，但需要重新处理 Base64 解码、存储权限、MediaStore、Android 版本差异和错误回调。更麻烦的是，这条链路固定使用 `.jpg`，恢复后仍然不能自然支持视频。

第二个选择是复用 `ChatSavePhoto`。它已经支持 Android 和 iOS，也已经区分图片与视频；当前预览入口和 Android 真机都证明它可用。

两者相比，恢复旧插件是在重新维护一套重复能力。复用现有插件只需要修正调用入口，风险更小，也不会扩大到原生工程。

最终，两处失败代码统一为：

```ts
const result = await saveImageToGallery(url, isVideo)
```

同时删除对应文件中不再使用的 `savePicture` import 和平台判断。没有修改生成接口、媒体 URL、删除、分享、预览或 Android 原生插件。

## 验证的不只是“能够保存”

修改后，我重新检查了几层结果：

- 两个失败入口都不再调用 `savePicture`；
- 图片和视频仍然传入正确的 `isVideo`；
- 生产构建通过，diff 没有无关格式变化；
- Android 真机重新执行原复现路径，保存恢复正常；
- 删除、生成、分享和预览逻辑没有被这次修改触碰。

项目原有的 lint 配置还有独立问题。这次没有顺手修它，因为它既不影响根因判断，也不属于媒体保存的修改范围。存量项目里，验证边界和修改边界同样重要。

## 这次真正留下的方法

这个 Bug 没有复杂算法，最终改动也很小。它值得记录，是因为排查过程可以迁移到其他混合应用问题。

以后再遇到“一处正常、一处失败”，我会先画出两条路径，找到第一次分叉，而不是先列出所有可能原因。涉及 Capacitor 时，我也不会再把 JavaScript 中的 `registerPlugin()` 当成原生能力存在的证明，而会继续核对平台插件列表、原生类、方法实现和真机行为。

跨平台合并也需要同样的检查。合并完成后，文件、相册、相机、权限、分享、支付、推送和系统返回等平台能力，不能只依赖前端构建验证。

最后只改两处并不意味着前面的排查多余。恰恰是因为正常路径、插件状态和 Git 历史都指向同一个结论，才可以确定不需要恢复旧插件，也不需要扩大修改范围。
