# dsh-subagent-limit-slider

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件：把**子代理并行数量上限**做成输入框工具行里的一个滑块，就在权限、计划控件旁边。不必离开对话去开设置页，随手就能调整委派的宽度。

> 术语说明：本插件界面写作「子代理」，DeepSeek Harness 官方界面称「子智能体」，二者是同一个东西。

## 它做什么

滑块读写宿主 `subagent` 配置命名空间里的 `maxActiveSubagents`。宿主会真正执行这个值：一旦达到上限，后续委派请求会被拒绝，报

```
subagent limit reached (active child limit: N)
```

直到有正在运行的子代理结束。

- **范围**：1–32。宿主 schema 没有上限，32 只是滑块的边界。
- **含义**：同一个主 Agent 下、所有递归层级中同时存活的子代理总数，不含主 Agent 自身。
- **合并写入**：拖动一次只产生一次设置写入，不是每像素一次。
- **立即生效**：新上限作用于之后的启动请求；已在运行的子代理不会被停止。
- **失败可见**：宿主拒绝写入时，数字变红并回弹到被接受的值。

## 安装

### 方式一：从 GitHub 安装（推荐）

把仓库作为 bundle 加进目标 profile：

```
github:3470437923-cloud/dsh-subagent-limit-slider
```

可以把这段 spec 交给会话里的 agent，或使用 Web GUI 的插件页安装。然后重启 DeepSeek Harness 以重新组合 profile。

### 方式二：手动安装

在 profile 目录下（例如 `~/.dsh/profiles/desktop`）：

```sh
pnpm add github:3470437923-cloud/dsh-subagent-limit-slider
```

然后把包名加进该 profile 的 `package.json`：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-subagent-limit-slider"
      ]
    }
  }
}
```

重启 DeepSeek Harness。

## 使用

控件出现在**输入框工具行左侧**，在权限、计划控件之后。拖动它，旁边的数字就是当前上限。

## 与内置设置页的关系

DeepSeek Harness 已经在 **设置 → 插件 → Subagent → 子智能体并行数量上限** 暴露了同一个字段。这个插件没有新增能力——它只是给同一个值提供了一条更快的路径。

两个界面读写同一个命名空间，因此永远不会互相矛盾：在一处修改，另一处会同步反映。

## 兼容性

针对 DeepSeek Harness **`0.2.0-rc.2`** 开发并验证。

插件依赖四个宿主契约，未来版本都可能改名：

| 契约 | 用途 |
|---|---|
| `dsh.bundle.patch` 清单字段 | 能被选为 profile bundle |
| `dsh.client` 声明与 `__ModuleLoader__.load` 打包格式 | 浏览器半侧如何被加载 |
| `conversation.input.left` 插槽 | 滑块的挂载位置 |
| `configForms` 服务、`subagent` 命名空间、`maxActiveSubagents` 字段 | 读写的值 |

挂载是**有保护的**：在从未挂载宿主 `subagent` 插件的组合里，控件不会出现，而不是渲染成一个点不动的死控件。

**平台**：插件只在浏览器侧运行，不含任何平台相关代码，因此在 macOS、Windows、Linux 上预期表现一致。目前**仅在 macOS 上验证过**，Windows 未测试。欢迎反馈。

## 实现方式

包分两半：

- `lib/index.js` —— 空的宿主 `apply`。它存在的唯一目的是让本包占据一条 Loader 行，客户端模块系统据此才会送出浏览器半侧。
- `lib/client.js` —— 浏览器半侧。通过 `configForms` 服务绑定 `subagent` 命名空间，把 React 控件注册进 `conversation.input.left`，并经由带修订栅栏的表单 API 写入。

`cordis.patch.yml` 插入那唯一一条 Loader 行。没有它，本包就不是 bundle，任何 profile 都无法选用。

## 已知限制

- UI 把滑块上限设为 32。宿主 schema 没有上限，所以在别处设置的更大值会显示出来，但拖不过这个边界。
- 设置按 profile 存储，因此对该 profile 下的所有会话生效。
- 改变数值不会停止已在运行的子代理。

## 卸载

从 profile 的 `dsh.profile.bundles` 里移除 `dsh-subagent-limit-slider`，然后重启。若要一并移除依赖，在 profile 目录执行 `pnpm remove dsh-subagent-limit-slider`。

## 开发

没有构建步骤。`lib/client.js` 就是随包发布的源码，按客户端模块系统期望的打包格式手写。

本地开发时，把 checkout 链接进 profile：

```sh
cd ~/.dsh/profiles/desktop
pnpm add link:./path/to/dsh-subagent-limit-slider
```

并把包名加进 `dsh.profile.bundles`。

## 许可证

[MIT](LICENSE)
