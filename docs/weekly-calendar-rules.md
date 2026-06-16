# 追剧日历展示规则

最后更新：2026-06-16

---

## 一、总目标

首页「追剧日历」展示**未来一周**要播的剧集。**周一凌晨 0:00:00 整体刷新一次**（本周一到周日的排版、数据、排序等全部重置），其他时间展示内容由当前真实数据驱动。

**调整优先级**：管理员在后台修改 `currentEpisode` / `totalEpisodes` 等字段后，**前台实时生效**（不等周一刷新）。集数计算始终以"当前真实集数"为权威值。

---

## 二、集数计算优先级

按字段填写情况分 5 个分支（从最特殊到最通用）：

### 1. 已完结（isCompleted = true）

**条件**：`isCompleted && totalEpisodes && completedAt` 都存在

**公式**：从总集数倒推每日集数
```
displayEp = totalEpisodes - (完结日之后到目标日之间的剩余播出次数 × epd)
```
- 完结日之前的播出日按"已播"算，之后移除
- `completedAt > 30 天后` 的视为老剧补录，整周不显示（`buildWeeklySchedule` 过滤）

**示例**：
- 总集数 24，周四完结，epd=1
- 周四：24 / 周三：23 / 周二：22 / 周一：21

---

### 2. 首播日当天（写有首播集数）

**条件**：`startDate === 目标日 && premiereEpisodes` 有值

**显示文本**：`首播{premiereEpisodes}集`

**示例**：
- premiereEpisodes = 4 → 首播 4 集

---

### 3. 首播周后续日（写有首播集数）

**条件**：首播日已过，仍在首播周内（周一到周日）

**公式**：
```
displayEp = premiereEpisodes + (首播日之后到目标日之间的播出次数 × epd)
```

**示例**：
- 首播周一 4 集，epd=1，播出日是周二、周四
- 周二：4 + 1 = 5
- 周四：4 + 2 = 6

---

### 4. 正常播出（已填写当前集数）

**条件**：`currentEpisode` 或 `manualEpisode` 有值

**公式**：以当前真实集数为基准，加上未来从最后一次播出后到目标日之间的播出次数 × epd
```
displayEp = currentEpisode + (lastAired 之后到目标日之间的有效播出次数 × epd)
```

**lastAired 规则**：
- 今天若是播出日且已过播出时间 → lastAired = todayIdx
- 今天若是播出日但还没到播出时间 → lastAired = 上一个播出日
- 今天不是播出日 → lastAired = 之前最近的播出日
- 本周内还没播过（lastAired = -1）→ 全部未来都累加

**示例**（今天是周一，已播到第 2 集，epd=1，播出日周五）：
- 周一/二/三/四：第 2 集
- 周五：2 + 1 = 第 3 集
- 周日（也是播出日）：2 + 2 = 第 4 集

**调整示例**（今天是周三，epd=1，播出日周五）：

| 场景 | 操作 | 当时真实集数 | lastAired | 周三显示 | 周五显示 | 周日显示 |
|------|------|------------|-----------|---------|---------|---------|
| 之前 current=2（实际是 3），**已过周三播出时间** | 改成 3 | 3 | 今天（周三） | 第 3 集 | 第 4 集 | 第 5 集 |
| 之前 current=2（实际是 3），**未到周三播出时间** | 改成 3 | 3 | 上一个播出日 | 第 3 集 | 第 4 集 | 第 5 集 |

**关键**：无论何时调整 `currentEpisode`，前台**立即生效**（不需要等周一刷新）。集数 = 当时真实集数 + 未来累加，权威值始终是 `currentEpisode`。

---

### 5. 无集数数据但有开播日

**条件**：没填 currentEpisode / premiereEpisodes，但有 startDate

**公式**：从 startDate 正向计数到目标日之间的有效播出次数 × epd

**示例**：
- 6/12 开始，epd=1，每天播出
- 6/16（第 5 天）：5 集

---

### 6. 兜底（首播周内无 airDays 无任何数据）

**条件**：`airDays` 为空但在首播周内

**公式**：`displayEp = premiereEpisodes || episodesPerDay || 1`

**显示文本**：`首播{N}集`

**示例**：Stand BI Me / Lost to Light 这类 `airDays` 没填的剧 → 首播 1 集

---

## 三、总集数规则

- **未填总集数**：视为无限制（`total = 0`），不显示"完结"标签
- **填了总集数且已播完**：显示红色「完结」标签
- **总集数 < displayEp**（异常数据）：displayEp 上限 = totalEpisodes
- **后期补总集数**：
  - 之前无 `totalEpisodes` → 不显示"完结"
  - 补完后 `displayEp >= totalEpisodes` → 自动显示"完结"标签

---

## 四、显示文本格式

### 首播剧

| 字段 | 第 2 排文本 |
|------|------------|
| 写了播出时间 + 写了首播集数 | `16:00 · 首播4集` |
| 写了播出时间 + 没写首播集数 | `16:00 · 首播1集`（取 epd） |
| 没写播出时间 + 写了首播集数 | `首播4集` |
| 没写播出时间 + 没写首播集数 | `首播1集` |

第 3 排：粉色「首播」标签

### 正常播出

- 有总集数：`第N集/共M集`
- 无总集数：`第N集`

### 已完结

- 显示「全 M 集」（DramaCard）/「完结」标签（WeeklyCalendar）

### 停播/另行通知

- 第 2 排：时间 + `停播` / `另行通知` 标签
- 第 3 排：灰色「停播」/「另行通知」标签

---

## 五、相关文件

| 文件 | 作用 |
|------|------|
| [src/lib/drama-schedule.ts](../src/lib/drama-schedule.ts) | `buildWeeklySchedule`：构造 schedule，已完结 30 天硬截断 |
| [src/components/WeeklyCalendar.tsx](../src/components/WeeklyCalendar.tsx) | 集数计算 + 海报版同步逻辑 |
| [src/app/page.tsx](../src/app/page.tsx) | 首页调用 `buildWeeklySchedule` 传数据 |
| [src/lib/drama-schedule.ts](../src/lib/drama-schedule.ts) | `isRecentlyCompleted` 30 天判断 |
| [src/lib/drama-schedule.ts](../src/lib/drama-schedule.ts) | `calcCompletedAt` 推算最后一集日 |

---

## 六、未来修改注意事项

1. **改完两个地方**：日历主体 + 海报版（搜索 `posterIsPremiereDay2` 找对应位置）
2. **首播集数优先**：有 premiereEpisodes 时不用 epd，没有才用 epd
3. **集数公式方向**：永远从"当前真实集数"向前累加，不要从"周一快照"倒推
4. **老剧补录**：`completedAt = null` 一律视为老剧，不显示完结标签、不进日历
