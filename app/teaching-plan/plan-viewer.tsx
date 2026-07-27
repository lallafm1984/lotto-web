"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import rawPlanData from "./plan-data.json";
import styles from "./teaching-plan.module.css";

type PlanCell = {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  width: number;
  height: number;
  text: string;
  header: boolean;
};

type PlanTable = {
  month: string;
  rows: number;
  cols: number;
  cells: PlanCell[];
};

type PlanMonth = {
  month: string;
  tables: PlanTable[];
};

type PlanSubject = {
  id: string;
  name: string;
  months: PlanMonth[];
};

type PlanData = {
  title: string;
  sourceName: string;
  sourceUrl: string;
  notice: string;
  subjects: PlanSubject[];
};

type FieldKey = "unit" | "achievement" | "teaching" | "evaluation";

type FieldRange = {
  start: number;
  end: number;
};

type WeekPayload = Record<FieldKey, string>;

type NormalizedWeek = {
  id: string;
  month: string;
  week: string;
  events: string[];
  payload: WeekPayload;
};

type NormalizedMonth = {
  month: string;
  weeks: NormalizedWeek[];
};

type StoredOrders = Record<string, string[]>;
type StoredEventLayouts = Record<string, Record<string, string[]>>;

type DraggedItem = {
  kind: "payload" | "event";
  slotId: string;
  eventIndex?: number;
};

const planData = rawPlanData as unknown as PlanData;
const fieldKeys: FieldKey[] = ["unit", "achievement", "teaching", "evaluation"];
const payloadStorageKey = "teaching-plan-week-order-v1";
const eventStorageKey = "teaching-plan-event-layout-v2";

function normalizedLabel(text: string) {
  return text.replace(/[\s·‧()]/g, "");
}

function visibleTable(table: PlanTable): PlanTable {
  const hiddenColumns = new Set<number>();
  for (const cell of table.cells) {
    const normalized = normalizedLabel(cell.text);
    const hiddenHeader = cell.header && (
      cell.text.includes("탐구과정") ||
      normalized.includes("수업평가연계의주안점")
    );
    if (!hiddenHeader) continue;
    for (let col = cell.col; col < cell.col + cell.colspan; col += 1) {
      hiddenColumns.add(col);
    }
  }

  const visibleColumns = Array.from({ length: table.cols }, (_, index) => index)
    .filter((index) => !hiddenColumns.has(index));
  const columnMap = new Map(visibleColumns.map((original, index) => [original, index]));
  const cells = table.cells.flatMap((cell) => {
    const remainingColumns = Array.from(
      { length: cell.colspan },
      (_, index) => cell.col + index,
    ).filter((column) => !hiddenColumns.has(column));
    if (remainingColumns.length === 0) return [];
    const newCol = columnMap.get(remainingColumns[0]);
    if (newCol === undefined) return [];
    return [{ ...cell, col: newCol, colspan: remainingColumns.length }];
  });

  return { ...table, cols: visibleColumns.length, cells };
}

function getFieldRanges(table: PlanTable): Record<FieldKey, FieldRange> {
  const findHeader = (predicate: (label: string) => boolean) => {
    const cell = table.cells.find((item) => item.header && predicate(normalizedLabel(item.text)));
    if (!cell) throw new Error("교수학습 표의 필수 머리글을 찾을 수 없습니다.");
    return { start: cell.col, end: cell.col + cell.colspan };
  };

  return {
    unit: findHeader((label) => label.includes("단원명")),
    achievement: findHeader((label) => label.includes("교육과정성취기준")),
    teaching: findHeader((label) => label === "수업방법"),
    evaluation: findHeader((label) => label === "평가방법"),
  };
}

function overlaps(cell: PlanCell, range: FieldRange) {
  return cell.col < range.end && cell.col + cell.colspan > range.start;
}

function normalizeSubject(subject: PlanSubject): NormalizedMonth[] {
  return subject.months.map((month) => {
    const weeks: NormalizedWeek[] = [];

    month.tables.forEach((rawTable, tableIndex) => {
      const table = visibleTable(rawTable);
      const ranges = getFieldRanges(table);
      const bodyCells = table.cells.filter((cell) => !cell.header);
      const weekCells = bodyCells
        .filter((cell) => /^\s*\d+\s*\(/.test(cell.text))
        .sort((a, b) => a.row - b.row || a.col - b.col);

      weekCells.forEach((weekCell, weekIndex) => {
        const rowStart = weekCell.row;
        const rowEnd = weekCell.row + weekCell.rowspan;
        const cellsInWeek = bodyCells.filter((cell) => (
          cell.row < rowEnd && cell.row + cell.rowspan > rowStart
        ));
        const fieldOverlaps = (cell: PlanCell) => fieldKeys.filter((key) => overlaps(cell, ranges[key]));
        const eventCells = cellsInWeek
          .filter((cell) => fieldOverlaps(cell).length > 1 && cell.text.trim())
          .sort((a, b) => a.row - b.row || a.col - b.col);
        const events = Array.from(new Set(eventCells.map((cell) => cell.text.trim())));
        const payload = Object.fromEntries(fieldKeys.map((key) => {
          const values = cellsInWeek
            .filter((cell) => {
              const matchedFields = fieldOverlaps(cell);
              return matchedFields.length === 1 && matchedFields[0] === key && cell.text.trim();
            })
            .sort((a, b) => a.row - b.row || a.col - b.col)
            .map((cell) => cell.text.trim());
          return [key, Array.from(new Set(values)).join("\n")];
        })) as WeekPayload;

        weeks.push({
          id: `${subject.id}:${month.month}:${tableIndex}:${weekIndex}`,
          month: month.month,
          week: weekCell.text.trim(),
          events,
          payload,
        });
      });
    });

    return { month: month.month, weeks };
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlText(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function buildHancomCopy(
  subject: PlanSubject,
  months: NormalizedMonth[],
  payloadBySlot: Map<string, WeekPayload>,
  eventsBySlot: Map<string, string[]>,
) {
  const border = "border:1px solid #333;padding:6px 7px;vertical-align:middle;white-space:pre-wrap;";
  const header = `${border}background:#e7e7e7;font-family:'Malgun Gothic';font-size:9pt;font-weight:700;text-align:center;`;
  const body = `${border}font-family:'Batang';font-size:9pt;line-height:1.45;`;
  const compact = `${body}font-family:'Malgun Gothic';text-align:center;`;
  const event = `${compact}background:#f3f3f3;font-weight:700;`;
  const htmlMonths = months.map((month) => {
    const visualRows = month.weeks.reduce((sum, week) => {
      const payload = payloadBySlot.get(week.id) ?? week.payload;
      const eventCount = (eventsBySlot.get(week.id) ?? week.events).length;
      return sum + Math.max(1, eventCount + (payloadIsEmpty(payload) ? 0 : 1));
    }, 0);
    let monthCellWritten = false;
    const rows = month.weeks.map((week) => {
      const payload = payloadBySlot.get(week.id) ?? week.payload;
      const events = eventsBySlot.get(week.id) ?? week.events;
      const hasContent = !payloadIsEmpty(payload);
      const weekRowCount = Math.max(1, events.length + (hasContent ? 1 : 0));
      const monthCell = monthCellWritten
        ? ""
        : `<td rowspan="${visualRows}" style="${compact}">${escapeHtml(month.month)}</td>`;
      monthCellWritten = true;
      const weekCell = `<td rowspan="${weekRowCount}" style="${compact}">${htmlText(week.week)}</td>`;
      const contentCells = `<td style="${body}">${htmlText(payload.unit)}</td>` +
        `<td style="${body}">${htmlText(payload.achievement)}</td>` +
        `<td style="${body}">${htmlText(payload.teaching)}</td>` +
        `<td style="${body}">${htmlText(payload.evaluation)}</td>`;
      const eventRows = events.map((eventText, index) => (
        `<tr>${index === 0 ? monthCell + weekCell : ""}` +
        `<td colspan="4" style="${event}">${htmlText(eventText)}</td></tr>`
      )).join("");
      if (events.length && hasContent) return `${eventRows}<tr>${contentCells}</tr>`;
      if (events.length) return eventRows;
      return `<tr>${monthCell}${weekCell}${contentCells}</tr>`;
    }).join("");

    return `<p style="font-family:'Batang';font-size:12pt;font-weight:700;margin:16px 0 6px;">■ ${escapeHtml(month.month)}월</p>` +
      `<table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1.5px solid #171717;">` +
      `<thead><tr><th rowspan="2" style="${header}width:7%;">월</th><th rowspan="2" style="${header}width:10%;">주</th>` +
      `<th rowspan="2" style="${header}width:15%;">단원명<br>(영역명)</th><th rowspan="2" style="${header}width:32%;">교육과정 성취기준</th>` +
      `<th colspan="2" style="${header}">탐구-실행-성찰과정</th></tr>` +
      `<tr><th style="${header}width:18%;">수업방법</th><th style="${header}width:18%;">평가방법</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
  }).join("");

  const html = `<div><p style="text-align:center;font-family:'Batang';font-size:16pt;font-weight:700;">` +
    `(${escapeHtml(subject.name)}) 교수학습 및 평가 운영 계획</p>${htmlMonths}</div>`;
  const plain = months.flatMap((month) => [
    `■ ${month.month}월`,
    "월\t주\t단원명(영역명)\t교육과정 성취기준\t수업방법\t평가방법",
    ...month.weeks.flatMap((week) => {
      const payload = payloadBySlot.get(week.id) ?? week.payload;
      const events = eventsBySlot.get(week.id) ?? week.events;
      const contentRow = [month.month, week.week, payload.unit, payload.achievement, payload.teaching, payload.evaluation]
        .map((value) => value.replace(/\n/g, " / "))
        .join("\t");
      if (!events.length) return [contentRow];
      const eventRows = events.map((eventText) => [month.month, week.week, eventText, "", "", ""].join("\t"));
      return payloadIsEmpty(payload) ? eventRows : [...eventRows, contentRow];
    }),
  ]).join("\n");

  return { html, plain };
}

function payloadIsEmpty(payload: WeekPayload) {
  return fieldKeys.every((key) => !payload[key].trim());
}

export function PlanViewer() {
  const [subjectId, setSubjectId] = useState(planData.subjects[0].id);
  const [orders, setOrders] = useState<StoredOrders>({});
  const [eventLayouts, setEventLayouts] = useState<StoredEventLayouts>({});
  const [storageReady, setStorageReady] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropSlotId, setDropSlotId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const subject = planData.subjects.find((item) => item.id === subjectId) ?? planData.subjects[0];
  const subjectIndex = planData.subjects.findIndex((item) => item.id === subject.id);
  const months = useMemo(() => normalizeSubject(subject), [subject]);
  const slots = useMemo(() => months.flatMap((month) => month.weeks), [months]);
  const originalPayloads = useMemo(
    () => new Map(slots.map((week) => [week.id, week.payload])),
    [slots],
  );
  const originalEvents = useMemo(
    () => new Map(slots.map((week) => [week.id, week.events])),
    [slots],
  );
  const originalOrder = useMemo(() => slots.map((week) => week.id), [slots]);
  const storedOrder = orders[subject.id];
  const validStoredOrder = storedOrder && storedOrder.length === originalOrder.length &&
    storedOrder.every((id) => originalPayloads.has(id));
  const activeOrder = validStoredOrder ? storedOrder : originalOrder;
  const payloadBySlot = useMemo(() => new Map(slots.map((slot, index) => [
    slot.id,
    originalPayloads.get(activeOrder[index]) ?? slot.payload,
  ])), [activeOrder, originalPayloads, slots]);
  const storedEventLayout = eventLayouts[subject.id];
  const eventsBySlot = useMemo(() => new Map(slots.map((slot) => [
    slot.id,
    storedEventLayout?.[slot.id] ?? originalEvents.get(slot.id) ?? slot.events,
  ])), [originalEvents, slots, storedEventLayout]);
  const payloadChanged = activeOrder.some((id, index) => id !== originalOrder[index]);
  const eventChanged = slots.some((slot) => {
    const currentEvents = eventsBySlot.get(slot.id) ?? [];
    const sourceEvents = originalEvents.get(slot.id) ?? [];
    return currentEvents.length !== sourceEvents.length ||
      currentEvents.some((eventText, index) => eventText !== sourceEvents[index]);
  });
  const changed = payloadChanged || eventChanged;

  useEffect(() => {
    let active = true;
    let savedOrders: StoredOrders = {};
    let savedEventLayouts: StoredEventLayouts = {};
    try {
      const saved = window.localStorage.getItem(payloadStorageKey);
      if (saved) savedOrders = JSON.parse(saved) as StoredOrders;
      const savedEvents = window.localStorage.getItem(eventStorageKey);
      if (savedEvents) savedEventLayouts = JSON.parse(savedEvents) as StoredEventLayouts;
    } catch {
      // 브라우저 저장소를 사용할 수 없어도 현재 편집은 계속할 수 있습니다.
    }
    queueMicrotask(() => {
      if (!active) return;
      setOrders(savedOrders);
      setEventLayouts(savedEventLayouts);
      setStorageReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(payloadStorageKey, JSON.stringify(orders));
      window.localStorage.setItem(eventStorageKey, JSON.stringify(eventLayouts));
    } catch {
      // 저장 실패는 복사 및 현재 세션 편집을 막지 않습니다.
    }
  }, [eventLayouts, orders, storageReady]);

  const changeSubject = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    setCopyStatus("");
    setDraggedItem(null);
    setDropSlotId(null);
  };

  const reorderPayloads = (sourceSlotId: string, targetSlotId: string) => {
    if (sourceSlotId === targetSlotId) return;
    const sourceIndex = slots.findIndex((slot) => slot.id === sourceSlotId);
    const targetIndex = slots.findIndex((slot) => slot.id === targetSlotId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextOrder = [...activeOrder];
    const [movedPayload] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedPayload);
    setOrders((current) => ({ ...current, [subject.id]: nextOrder }));
    setCopyStatus("변경사항이 이 기기에 임시 저장되었습니다.");
  };

  const movePayload = (slotId: string, direction: -1 | 1) => {
    const index = slots.findIndex((slot) => slot.id === slotId);
    const target = slots[index + direction];
    if (target) reorderPayloads(slotId, target.id);
  };

  const moveEventToSlot = (sourceSlotId: string, eventIndex: number, targetSlotId: string) => {
    if (sourceSlotId === targetSlotId) return;
    const nextLayout = Object.fromEntries(slots.map((slot) => [
      slot.id,
      [...(eventsBySlot.get(slot.id) ?? [])],
    ]));
    const sourceEvents = nextLayout[sourceSlotId];
    const targetEvents = nextLayout[targetSlotId];
    if (!sourceEvents || !targetEvents) return;
    const [movedEvent] = sourceEvents.splice(eventIndex, 1);
    if (!movedEvent) return;
    targetEvents.push(movedEvent);
    setEventLayouts((current) => ({ ...current, [subject.id]: nextLayout }));
    setCopyStatus("행사 병합 행의 위치가 이 기기에 임시 저장되었습니다.");
  };

  const moveEvent = (slotId: string, eventIndex: number, direction: -1 | 1) => {
    const index = slots.findIndex((slot) => slot.id === slotId);
    const target = slots[index + direction];
    if (target) moveEventToSlot(slotId, eventIndex, target.id);
  };

  const resetSubject = () => {
    setOrders((current) => {
      const next = { ...current };
      delete next[subject.id];
      return next;
    });
    setEventLayouts((current) => {
      const next = { ...current };
      delete next[subject.id];
      return next;
    });
    setCopyStatus("현재 과목을 원본 순서로 되돌렸습니다.");
  };

  const copyForHancom = async () => {
    const content = buildHancomCopy(subject, months, payloadBySlot, eventsBySlot);
    try {
      if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([content.html], { type: "text/html" }),
          "text/plain": new Blob([content.plain], { type: "text/plain" }),
        })]);
        setCopyStatus("현재 과목의 전체 월 표를 한글용 형식으로 복사했습니다.");
      } else {
        await navigator.clipboard.writeText(content.plain);
        setCopyStatus("표 복사가 제한되어 셀 붙여넣기용 텍스트로 복사했습니다.");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(content.plain);
        setCopyStatus("표 복사가 제한되어 셀 붙여넣기용 텍스트로 복사했습니다.");
      } catch {
        setCopyStatus("복사 권한을 허용한 뒤 다시 시도해 주세요.");
      }
    }
  };

  return (
    <main className={styles.page} lang="ko">
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>2026학년도 · 1학년 · 2학기</p>
          <h1>교수학습 및 평가 운영계획</h1>
          <p className={styles.description}>월별 표를 한 화면에서 확인하고, 주차별 수업 내용과 병합 행사 행을 원하는 순서로 배치할 수 있습니다.</p>
        </div>
        <div className={styles.topActions}>
          <a href={planData.sourceUrl} target="_blank" rel="noreferrer">원본 파일</a>
          <button type="button" onClick={() => window.print()}>인쇄</button>
        </div>
      </header>

      <section className={styles.controls} aria-label="운영계획 편집">
        <div className={styles.subjectControl}>
          <label htmlFor="subject-select">과목</label>
          <div className={styles.subjectRow}>
            <button
              type="button"
              aria-label="이전 과목"
              disabled={subjectIndex === 0}
              onClick={() => changeSubject(planData.subjects[subjectIndex - 1].id)}
            >
              이전
            </button>
            <select id="subject-select" value={subject.id} onChange={(event) => changeSubject(event.target.value)}>
              {planData.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button
              type="button"
              aria-label="다음 과목"
              disabled={subjectIndex === planData.subjects.length - 1}
              onClick={() => changeSubject(planData.subjects[subjectIndex + 1].id)}
            >
              다음
            </button>
          </div>
          <p>{subjectIndex + 1} / {planData.subjects.length}과목</p>
        </div>

        <div className={styles.monthControl}>
          <span>월 바로가기</span>
          <nav className={styles.monthTabs} aria-label="월 바로가기">
            {months.map((month) => (
              <a key={month.month} href={`#month-${subject.id}-${month.month}`}>{month.month}월</a>
            ))}
          </nav>
        </div>

        <div className={styles.editActions}>
          <span className={changed ? styles.changedBadge : styles.savedBadge}>
            {changed ? "순서 변경됨" : "원본 순서"}
          </span>
          <button type="button" onClick={resetSubject} disabled={!changed}>원본 순서로</button>
          <button type="button" className={styles.copyButton} onClick={copyForHancom}>한글용 전체 표 복사</button>
        </div>
      </section>

      <section className={styles.paper} aria-labelledby="plan-title">
        <div className={styles.paperHeading}>
          <p>2026학년도 1학년 2학기</p>
          <h2 id="plan-title">({subject.name}) 교수학습 및 평가 운영 계획</h2>
        </div>

        <div className={styles.sectionTitle}>
          <strong>1</strong>
          <span>{subject.name} 교수학습 운영 계획</span>
        </div>

        <aside className={styles.editGuide}>
          <strong>주차 내용 순서 변경</strong>
          <p>주차·날짜는 그대로 유지됩니다. 주차 칸의 <b>내용 이동</b>은 수업 내용 묶음을, 회색 병합 행의 <b>행사 이동</b>은 대체공휴일 같은 행사 행 하나를 옮깁니다. 내용이 없는 주는 행사 1건이 전체 영역을 차지하고, 행사 2건 이상이면 행사별 행으로 자동 분할됩니다.</p>
          <p>편집 후 <b>한글용 전체 표 복사</b>를 누르고 한글 문서에서 기존 표를 선택해 붙여넣으세요.</p>
        </aside>

        {months.map((month) => {
          const monthRowCount = month.weeks.reduce((sum, week) => {
            const payload = payloadBySlot.get(week.id) ?? week.payload;
            const eventCount = (eventsBySlot.get(week.id) ?? week.events).length;
            return sum + Math.max(1, eventCount + (payloadIsEmpty(payload) ? 0 : 1));
          }, 0);
          let monthCellRendered = false;
          return (
            <section key={month.month} id={`month-${subject.id}-${month.month}`} className={styles.monthSection}>
              <div className={styles.monthHeading}><span>■</span> {month.month}월</div>
              <div className={styles.tableScroller} tabIndex={0} aria-label={`${subject.name} ${month.month}월 운영계획 편집 표`}>
                <table className={styles.originalTable}>
                  <colgroup>
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2}>월</th>
                      <th rowSpan={2}>주</th>
                      <th rowSpan={2}>단원명<br />(영역명)</th>
                      <th rowSpan={2}>교육과정 성취기준</th>
                      <th colSpan={2}>탐구-실행-성찰과정</th>
                    </tr>
                    <tr>
                      <th>수업방법</th>
                      <th>평가방법</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.weeks.map((week) => {
                      const slotIndex = slots.findIndex((slot) => slot.id === week.id);
                      const payload = payloadBySlot.get(week.id) ?? week.payload;
                      const events = eventsBySlot.get(week.id) ?? week.events;
                      const hasContent = !payloadIsEmpty(payload);
                      const weekRowCount = Math.max(1, events.length + (hasContent ? 1 : 0));
                      const monthCell = !monthCellRendered ? (
                        <td rowSpan={monthRowCount} className={styles.compactCell}>{month.month}</td>
                      ) : null;
                      monthCellRendered = true;
                      const weekCell = (
                        <td rowSpan={weekRowCount} className={`${styles.compactCell} ${styles.weekCell}`}>
                          <span>{week.week}</span>
                          <div className={styles.rowTools}>
                            <button
                              type="button"
                              className={styles.dragHandle}
                              draggable
                              onDragStart={(event) => {
                                setDraggedItem({ kind: "payload", slotId: week.id });
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", `payload:${week.id}`);
                              }}
                              onDragEnd={() => {
                                setDraggedItem(null);
                                setDropSlotId(null);
                              }}
                              aria-label={`${week.week.replace(/\n/g, " ")} 내용 이동`}
                            >
                              <span className={styles.desktopDragLabel}>⋮⋮ 내용 이동</span>
                              <span className={styles.mobileDragLabel}>이동</span>
                            </button>
                            <span className={styles.arrowTools}>
                              <button type="button" disabled={slotIndex === 0} onClick={() => movePayload(week.id, -1)} aria-label="이전 주차와 내용 바꾸기">↑</button>
                              <button type="button" disabled={slotIndex === slots.length - 1} onClick={() => movePayload(week.id, 1)} aria-label="다음 주차와 내용 바꾸기">↓</button>
                            </span>
                          </div>
                        </td>
                      );
                      const payloadCells = (
                        <>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.unit}</td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.achievement}</td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.teaching}</td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.evaluation}</td>
                        </>
                      );
                      const dropHandlers = {
                        onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
                          if (!draggedItem) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropSlotId(week.id);
                        },
                        onDragLeave: () => setDropSlotId((current) => current === week.id ? null : current),
                        onDrop: (event: DragEvent<HTMLTableRowElement>) => {
                          event.preventDefault();
                          if (draggedItem?.kind === "payload") reorderPayloads(draggedItem.slotId, week.id);
                          if (draggedItem?.kind === "event" && draggedItem.eventIndex !== undefined) {
                            moveEventToSlot(draggedItem.slotId, draggedItem.eventIndex, week.id);
                          }
                          setDraggedItem(null);
                          setDropSlotId(null);
                        },
                      };
                      const rowClass = `${dropSlotId === week.id ? styles.dropTarget : ""} ${draggedItem?.slotId === week.id ? styles.draggingRow : ""}`;

                      if (events.length) {
                        return (
                          <Fragment key={week.id}>
                            {events.map((eventText, eventIndex) => (
                              <tr key={`${week.id}:event:${eventIndex}`} className={`${styles.weekGroup} ${rowClass}`} {...dropHandlers}>
                                {eventIndex === 0 ? monthCell : null}
                                {eventIndex === 0 ? weekCell : null}
                                <td colSpan={4} className={styles.eventCell}>
                                  <span className={styles.eventText}>{eventText}</span>
                                  <span className={styles.eventTools}>
                                    <button
                                      type="button"
                                      className={styles.dragHandle}
                                      draggable
                                      onDragStart={(event) => {
                                        setDraggedItem({ kind: "event", slotId: week.id, eventIndex });
                                        event.dataTransfer.effectAllowed = "move";
                                        event.dataTransfer.setData("text/plain", `event:${week.id}:${eventIndex}`);
                                      }}
                                      onDragEnd={() => {
                                        setDraggedItem(null);
                                        setDropSlotId(null);
                                      }}
                                      aria-label={`${eventText} 행사 행 이동`}
                                    >
                                      ⋮⋮ 행사 이동
                                    </button>
                                    <span className={styles.arrowTools}>
                                      <button type="button" disabled={slotIndex === 0} onClick={() => moveEvent(week.id, eventIndex, -1)} aria-label={`${eventText} 행사 행을 이전 주차로 이동`}>↑</button>
                                      <button type="button" disabled={slotIndex === slots.length - 1} onClick={() => moveEvent(week.id, eventIndex, 1)} aria-label={`${eventText} 행사 행을 다음 주차로 이동`}>↓</button>
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {hasContent ? (
                              <tr className={`${styles.weekGroup} ${rowClass}`} {...dropHandlers}>{payloadCells}</tr>
                            ) : null}
                          </Fragment>
                        );
                      }

                      return (
                        <tr key={week.id} className={`${styles.weekGroup} ${rowClass}`} {...dropHandlers}>
                          {monthCell}
                          {weekCell}
                          {payloadCells}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <p className={styles.notice}>※ {planData.notice}</p>
        <p className={styles.copyStatus} aria-live="polite">{copyStatus}</p>
      </section>

      <footer className={styles.footer}>
        <p>원본: {planData.sourceName}</p>
        <p>요청에 따라 제외된 열은 표시하지 않으며, 편집 내용은 현재 브라우저에 임시 저장됩니다.</p>
      </footer>
    </main>
  );
}
