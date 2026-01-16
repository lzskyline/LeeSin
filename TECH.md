# 技术文档 (重构指南)

本文档详细介绍了 Seraphine 项目的核心算法、API 交互和业务逻辑。旨在作为将应用程序重构为其他语言（如 C#、Rust、Go、Node.js）的指南，重点关注底层机制而非 UI 实现或 Python 特有功能。

## 1. LCU 连接协议

应用程序通过本地 HTTPS API 和 WebSocket 接口与英雄联盟客户端 (LCU) 进行通信。

### 1.1. 进程发现与认证
要连接到 LCU，应用程序必须定位 `LeagueClientUx.exe` 进程并提取连接凭据。

*   **目标进程**: `LeagueClientUx.exe`
*   **方法**: 读取进程命令行参数或 `lockfile`。
*   **必需参数**:
    *   `--app-port`: API 的本地端口号 (例如 `54321`)。
    *   `--remoting-auth-token`: 认证令牌。
*   **基础 URL**: `https://127.0.0.1:{port}`
*   **授权**: HTTP Basic Auth
    *   用户名: `riot`
    *   密码: `{token}`
    *   Header: `Authorization: Basic base64("riot:{token}")`
*   **SSL/TLS**: 自签名证书 (必须禁用验证)。

### 1.2. WebSocket 事件流
为了获取实时更新 (例如进入英雄选择)，应用程序维护一个 WebSocket 连接。

*   **URL**: `wss://127.0.0.1:{port}/`
*   **协议**: WAMP (Warwick's Async Messaging Protocol) 或原始 JSON 事件。
*   **握手**:
    *   使用 Basic Auth Header 连接。
    *   发送订阅 Payload: `[5, "OnJsonApiEvent"]` 以订阅所有 JSON API 事件。
*   **事件处理**:
    *   通过 `uri` 过滤事件 (例如 `/lol-gameflow/v1/gameflow-phase`)。
    *   Payload 结构: `[8, "OnJsonApiEvent", { "uri": "...", "eventType": "Update", "data": ... }]`

## 2. 核心业务流程

### 2.1. 游戏流状态机
应用程序通过 `/lol-gameflow/v1/gameflow-phase` 端点监控游戏状态。

| 阶段 | 描述 | 动作 |
| :--- | :--- | :--- |
| `None` | 客户端空闲 | - |
| `Lobby` | 在房间中 | - |
| `Matchmaking` | 正在寻找对局 | - |
| `ReadyCheck` | 队列弹出 | **自动接受逻辑** |
| `ChampSelect` | 英雄选择 | **自动 BP 逻辑**, **符文/技能设置** |
| `InProgress` | 游戏开始 | - |
| `EndOfGame` | 游戏结算 | - |

### 2.2. 自动接受对局
*   **触发条件**: `gameflow-phase` 变为 `ReadyCheck`。
*   **动作**:
    1.  调用 `POST /lol-matchmaking/v1/ready-check/accept`。
    2.  (可选) 稍微延迟以模拟人类行为。

### 2.3. 自动 禁用/选择 (BP) 逻辑
这是最复杂的流程，当 `gameflow-phase` 为 `ChampSelect` 时触发。

1.  **监控 Session**: 订阅 `/lol-champ-select/v1/session`。
2.  **识别本地玩家**:
    *   从 Session 数据中解析 `localPlayerCellId`。
3.  **遍历 Actions**:
    *   Session 包含一个 `actions` 数组 (列表的列表)。
    *   遍历 `session['actions']`。每个内部列表代表一个“回合”。
    *   查找 `actorCellId == localPlayerCellId` 且 `completed == false` 的 Action。
4.  **执行 Action**:
    *   **类型 'pick' (选择)**:
        *   端点: `PATCH /lol-champ-select/v1/session/actions/{actionId}`
        *   Payload: `{"championId": {id}, "type": "pick", "completed": true}`
    *   **类型 'ban' (禁用)**:
        *   端点: `PATCH /lol-champ-select/v1/session/actions/{actionId}`
        *   Payload: `{"championId": {id}, "type": "ban", "completed": true}`
5.  **锁定**: Payload 中的 `completed: true` 字段会锁定选择。

### 2.4. 自动符文与召唤师技能
当选择了英雄时触发 (通过 `current-champion` 或 Session 更新监控)。

1.  **获取外部数据**: 从 OP.GG 获取推荐的符文/技能 (见第 4 节)。
2.  **应用召唤师技能**:
    *   端点: `PATCH /lol-champ-select/v1/session/my-selection`
    *   Payload: `{"spell1Id": {id}, "spell2Id": {id}}`
3.  **应用符文**:
    *   获取当前页: `GET /lol-perks/v1/currentpage`。
    *   如果需要则删除: `DELETE /lol-perks/v1/pages/{id}`。
    *   创建新页: `POST /lol-perks/v1/pages`。
    *   Payload:
        ```json
        {
          "name": "Seraphine-Auto",
          "primaryStyleId": {styleId},
          "subStyleId": {subStyleId},
          "selectedPerkIds": [id1, id2, ...],
          "current": true
        }
        ```

### 2.5. 辅助功能流程 (秒退/观战)
*   **秒退 (Dodge)**:
    *   调用 `POST /lol-login/v1/session/invoke`。
    *   Payload: `{"destination": "lcdsServiceProxy", "method": "call", "args": "[\"\", \"teambuilder-draft\", \"quitV2\", \"\"]"}`。
*   **观战 (Spectate)**:
    *   方法 A (API): `POST /lol-spectator/v1/spectate/launch`，Payload 包含 `puuid` 等信息。
    *   方法 B (命令行): 启动 `League of Legends.exe` 并带上 `spectator {ip}:{port} {key} {gameId} {platformId}` 参数。

## 3. API 参考 (LCU)

### 通用与资源 (Assets)
*   `GET /lol-summoner/v1/current-summoner`: 获取当前用户信息 (ID, PUUID, 名称)。
*   `GET /lol-gameflow/v1/gameflow-phase`: 获取当前游戏状态。
*   `POST /lol-gameflow/v1/reconnect`: 重新连接游戏。
*   **静态数据**:
    *   `/lol-game-data/assets/v1/items.json`: 物品数据。
    *   `/lol-game-data/assets/v1/summoner-spells.json`: 召唤师技能数据。
    *   `/lol-game-data/assets/v1/perks.json`: 符文数据。
    *   `/lol-game-data/assets/v1/champion-summary.json`: 英雄列表。

### 个人资料与设置
*   `POST /lol-summoner/v1/current-summoner/summoner-profile`: 设置生涯背景。
*   `PUT /lol-summoner/v1/current-summoner/icon`: 设置头像。
*   `PUT /lol-chat/v1/me`: 设置在线状态、段位显示信息。
*   `PUT /lol-regalia/v2/current-summoner/regalia`: 设置皇冠/旗帜 (Prestige Crest)。
*   `POST /player-notifications/v1/notifications`: 发送客户端内通知 (Toast)。

### 匹配与房间
*   `POST /lol-matchmaking/v1/ready-check/accept`: 接受对局。
*   `GET /lol-matchmaking/v1/ready-check`: 获取准备检查状态。
*   `POST /lol-lobby/v2/lobby`: 创建房间 (如训练模式)。
*   `POST /lol-lobby/v2/play-again`: 再次游戏。

### 英雄选择
*   `GET /lol-champ-select/v1/session`: 获取完整 Session 数据 (队伍, Actions, 计时器)。
*   `GET /lol-champ-select/v1/current-champion`: 获取当前悬停/选择的英雄。
*   `PATCH /lol-champ-select/v1/session/actions/{id}`: 选择/禁用 Action。
*   `PATCH /lol-champ-select/v1/session/my-selection`: 设置技能/皮肤。
*   `POST /lol-champ-select/v1/session/my-selection/reroll`: 重新随机 (ARAM)。
*   `POST /lol-champ-select/v1/session/bench/swap/{championId}`: 与备战席交换 (ARAM)。
*   `POST /lol-champ-select/v1/session/trades/{id}/accept`: 接受英雄交换。
*   `POST /lol-champ-select/v1/session/swaps/{id}/accept`: 接受楼层交换。
*   `GET /lol-champ-select/v1/skin-carousel-skins`: 获取可用皮肤列表。

### 符文 (Perks)
*   `GET /lol-perks/v1/pages`: 获取所有页。
*   `GET /lol-perks/v1/currentpage`: 获取当前激活页。
*   `POST /lol-perks/v1/pages`: 创建页。
*   `DELETE /lol-perks/v1/pages/{id}`: 删除页。

### 数据 (段位/历史战绩/回放)
*   `GET /lol-match-history/v1/products/lol/current-summoner/matches`: 获取历史战绩。
*   `GET /lol-ranked/v1/ranked-stats/{puuid}`: 获取段位统计。
*   `POST /lol-replays/v1/rofls/{gameId}/download`: 下载回放。

### 聊天与社交
*   `GET /lol-chat/v1/friends`: 获取好友列表。
*   `POST /lol-chat/v1/friend-requests`: 发送好友请求。
*   `GET /lol-chat/v1/conversations`: 获取对话列表。

## 4. 外部数据源

### 4.1. OP.GG 数据
用于出装、符文和梯队列表。
*   **基础 URL**: `https://lol-api-champion.op.gg`
*   **端点**:
    *   **梯队列表**: `GET /api/{region}/champions/{mode}?tier={tier}`
    *   **出装**: `GET /api/{region}/champions/{mode}/{championId}/{position}?tier={tier}`
*   **参数**:
    *   `region`: 例如 `kr`, `na`, `euw`。
    *   `mode`: `ranked`, `aram`, `arena`。
    *   `tier`: `emerald_plus`, `diamond_plus`, 等。

### 4.2. SGP (Spectator Game Platform)
用于更快/更详细的历史战绩 (主要针对腾讯服务器)。
*   **认证**: 需要来自 LCU 端点 `/entitlements/v1/token` 的 `accessToken`。
*   **用法**: 当在 CN 地区可用时，项目优先使用 SGP API 而不是 LCU 获取历史战绩。
*   **关键端点**:
    *   `/match-history-query/v1/products/lol/player/{puuid}/SUMMARY`: 获取战绩列表。
    *   `/gsm/v1/ledge/spectator/region/{region}/puuid/{puuid}`: 获取当前游戏信息 (用于观战)。
    *   `/leagues-ledge/v2/rankedStats/puuid/{puuid}`: 获取段位信息。
    *   `/summoner-ledge/v1/regions/{region}/summoners/puuid/{puuid}`: 获取召唤师信息。

## 5. 数据模型

### Action (英雄选择)
```json
{
  "id": 12,
  "actorCellId": 0,
  "championId": 0,
  "type": "pick", // 或 "ban"
  "completed": false,
  "isInProgress": true
}
```

### Summoner (召唤师)
```json
{
  "summonerId": 12345,
  "puuid": "0000-...",
  "displayName": "Name",
  "summonerLevel": 30
}
```
