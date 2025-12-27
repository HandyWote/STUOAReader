# EAS 构建指南

本项目使用 EAS 云构建进行打包发布。以下步骤与注意事项面向 Android `production` 构建。

## 构建步骤

1. 登录 EAS
   - `eas login`
2. 确认项目已绑定 EAS
   - 运行 `eas build:configure` 或检查 `app.json` 中 `extra.eas.projectId` 是否存在。
3. 配置生产环境变量
   - 必须配置：`EXPO_PUBLIC_API_BASE_URL`
   - 可在 EAS 控制台创建，也可通过 CLI：
     - `eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://oap-backend.handywote.top/api`
4. 触发构建
   - 在 `OAP-app` 目录执行：
     - `eas build --platform android --profile production`
     - `eas build --platform all --profile production`
5. 等待构建完成并下载产物
   - CLI 会输出构建链接，进入链接下载 AAB/APK。

## 注意要点

- EAS 云构建不会读取本地 `.env`。
  - 必须在 EAS 环境变量中设置 `EXPO_PUBLIC_API_BASE_URL`。
- `eas.json` 中 `production` 已启用 `autoIncrement`，会自动递增 `versionCode`。
  - `app.json` 的 `version` 仍需手动维护（语义版本）。
- `android.package` 需固定且唯一，修改包名会导致无法更新同一应用。
- 若使用原生插件或权限，需在 `app.json` 中配置对应插件与权限，否则构建可能失败。
- 首次 Android 构建会引导生成签名证书，务必妥善保存。
- 构建失败可优先检查：
  - 环境变量是否缺失
  - `app.json` 配置是否合法
  - 依赖安装是否完整

## 本项目关键配置

- `OAP-app/eas.json`
  - `build.production.env.EXPO_PUBLIC_API_BASE_URL` 已配置为线上后端地址。
- `OAP-app/app.json`
  - `android.package`: `oareader.handywote.top`
  - `extra.eas.projectId` 已绑定。


## web端静态网站导出

- `npx expo export -p web`
