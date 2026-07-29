"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import rawPlanData from "./plan-data.json";
import {
  downloadBytes,
  editedFileName,
  prepareUploadedDocument,
  saveEditedHwpx,
} from "./hwpx-client";
import type { PreparedHwpx } from "./hwpx-client";
import {
  fieldKeys,
  normalizeSubject,
  normalizedLabel,
  originalEightColumnLayout,
  originalSixColumnLayout,
  payloadIsEmpty,
} from "./plan-model";
import type {
  NormalizedMonth,
  NormalizedWeek,
  PlanData,
  PlanSubject,
  PlanTable,
  StoredEventLayouts,
  StoredOrders,
  WeekPayload,
} from "./plan-types";
import styles from "./teaching-plan.module.css";

type DraggedItem = {
  kind: "week" | "payload" | "event";
  slotId: string;
  eventIndex?: number;
};

type HancomCopyScope = "all" | "month";
type HancomCopyHiddenFieldKey = "activity" | "evaluation";
type HancomCopyPayload = WeekPayload & Record<HancomCopyHiddenFieldKey, string>;
type HancomCopyFieldKey = keyof HancomCopyPayload;
type ColumnRange = { start: number; end: number };

const initialPlanData = rawPlanData as unknown as PlanData;
const payloadStorageKey = "teaching-plan-week-order-v1";
const eventStorageKey = "teaching-plan-event-layout-v2";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const hancomBodyFont = "font-family:'맑은 고딕','Malgun Gothic',sans-serif;mso-fareast-font-family:'맑은 고딕';font-size:8pt;font-weight:400;font-stretch:95%;letter-spacing:-0.8pt;line-height:130%;color:#000;";
const hancomHeaderFont = "font-family:'맑은 고딕','Malgun Gothic',sans-serif;mso-fareast-font-family:'맑은 고딕';font-size:9pt;font-weight:700;font-stretch:95%;letter-spacing:-0.9pt;line-height:130%;color:#000;";

function htmlText(value: string, style = hancomBodyFont) {
  const lines = value.split("\n");
  return lines.map((line, index) => (
    `${index ? "<br>" : ""}<span lang="ko" style="${style}">${escapeHtml(line)}</span>`
  )).join("");
}

function headerText(value: string) {
  return htmlText(value, hancomHeaderFont);
}

const hwpUnitsPerMillimeter = 7200 / 25.4;
function millimeters(hwpUnits: number) {
  return Math.round((hwpUnits / hwpUnitsPerMillimeter) * 100) / 100;
}

function hancomTableLayout(subject: PlanSubject, month: NormalizedMonth) {
  const sourceMonth = subject.months.find((item) => item.month === month.month);
  const sourceTable = sourceMonth?.tables.find((table) => (
    table.cells.some((cell) => cell.header && cell.text.includes("단원명"))
  ));
  const layout = originalSixColumnLayout(sourceTable);

  return {
    tableWidthMm: millimeters(layout.total),
    columnWidthsMm: layout.widths.map(millimeters),
    headerRowHeightsMm: layout.headerHeights.map(millimeters),
  };
}

function hancomCopyTableLayout(subject: PlanSubject, month: NormalizedMonth) {
  const sourceMonth = subject.months.find((item) => item.month === month.month);
  const sourceTable = sourceMonth?.tables.find((table) => (
    table.cells.some((cell) => cell.header && cell.text.includes("단원명"))
  ));
  const layout = originalEightColumnLayout(sourceTable);

  return {
    tableWidthMm: millimeters(layout.total),
    columnWidthsMm: layout.widths.map(millimeters),
    headerRowHeightsMm: layout.headerHeights.map(millimeters),
  };
}

function sourcePlanTable(subject: PlanSubject, sourceIndex: number | undefined, month?: string) {
  const tables = subject.months.flatMap((sourceMonth) => (
    sourceMonth.tables.map((table) => ({ month: sourceMonth.month, table }))
  ));
  if (sourceIndex !== undefined) {
    const indexedTable = tables.find((item) => item.table.sourceIndex === sourceIndex)?.table;
    if (indexedTable) return indexedTable;
  }
  return tables.find((item) => item.month === month && item.table.cells.some((cell) => (
    cell.header && cell.text.includes("단원명")
  )))?.table;
}

function sourceHeaderRange(table: PlanTable, predicate: (label: string) => boolean): ColumnRange | undefined {
  const header = table.cells.find((cell) => cell.header && predicate(normalizedLabel(cell.text)));
  if (!header) return undefined;
  return { start: header.col, end: header.col + header.colspan };
}

function sourceFieldRanges(table: PlanTable): Partial<Record<HancomCopyFieldKey, ColumnRange>> {
  return {
    unit: sourceHeaderRange(table, (label) => label.includes("단원명")),
    achievement: sourceHeaderRange(table, (label) => label.includes("교육과정성취기준")),
    activity: sourceHeaderRange(table, (label) => label.includes("탐구과정")),
    teaching: sourceHeaderRange(table, (label) => label === "수업방법"),
    evaluation: sourceHeaderRange(table, (label) => label === "평가방법"),
    focus: sourceHeaderRange(table, (label) => label.includes("수업평가연계의주안점")),
  };
}

function overlapsColumnRange(cell: PlanTable["cells"][number], range: ColumnRange | undefined) {
  return Boolean(range && cell.col < range.end && cell.col + cell.colspan > range.start);
}

function sourceHiddenFieldValue(subject: PlanSubject, sourceWeek: NormalizedWeek, field: HancomCopyHiddenFieldKey) {
  const table = sourcePlanTable(subject, sourceWeek.sourceTableIndex, sourceWeek.month);
  if (!table) return "";
  const ranges = sourceFieldRanges(table);
  const fieldRange = ranges[field];
  const weekRange = sourceHeaderRange(table, (label) => label === "주");
  const indexedWeekCell = sourceWeek.sourceCellIndexes.week === undefined
    ? undefined
    : table.cells.find((cell) => cell.sourceIndex === sourceWeek.sourceCellIndexes.week);
  const weekCell = indexedWeekCell ??
    table.cells.find((cell) => (
      !cell.header &&
      overlapsColumnRange(cell, weekRange) &&
      cell.text.trim() === sourceWeek.week.trim()
    ));
  if (!fieldRange || !weekCell) return "";
  const rowStart = weekCell.row;
  const rowEnd = weekCell.row + weekCell.rowspan;
  const copyFieldKeys: HancomCopyFieldKey[] = ["unit", "achievement", "activity", "teaching", "evaluation", "focus"];
  const values = table.cells
    .filter((cell) => {
      if (cell.header || !cell.text.trim()) return false;
      if (cell.row >= rowEnd || cell.row + cell.rowspan <= rowStart) return false;
      const matchedFields = copyFieldKeys.filter((key) => overlapsColumnRange(cell, ranges[key]));
      return matchedFields.length === 1 && matchedFields[0] === field;
    })
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((cell) => cell.text.trim());
  return Array.from(new Set(values)).join("\n");
}

function hancomCopyPayload(subject: PlanSubject, sourceWeek: NormalizedWeek, payload: WeekPayload): HancomCopyPayload {
  return {
    ...payload,
    activity: sourceHiddenFieldValue(subject, sourceWeek, "activity"),
    evaluation: sourceHiddenFieldValue(subject, sourceWeek, "evaluation"),
  };
}

function weekHtml(value: string) {
  const [weekNumber = "", ...dates] = value.split("\n");
  return `<span lang="ko" style="${hancomBodyFont}font-size:9pt;letter-spacing:-0.9pt;">${escapeHtml(weekNumber)}</span>` +
    dates.map((line) => `<br><span lang="ko" style="${hancomBodyFont}letter-spacing:-1.44pt;">${escapeHtml(line)}</span>`).join("");
}

function weekRowHeights(week: NormalizedWeek, eventCount: number, hasContent: boolean) {
  const eventMinimum = millimeters(1366);
  const weekHeight = Math.max(eventMinimum, millimeters(week.height));
  if (!eventCount) return [weekHeight];
  if (!hasContent) {
    return Array.from({ length: eventCount }, () => Math.round((weekHeight / eventCount) * 100) / 100);
  }
  const contentHeight = Math.max(eventMinimum, weekHeight - eventMinimum * eventCount);
  return [...Array.from({ length: eventCount }, () => eventMinimum), contentHeight];
}

function buildHancomCopy(
  subject: PlanSubject,
  months: NormalizedMonth[],
  payloadBySlot: Map<string, HancomCopyPayload>,
  eventsBySlot: Map<string, string[]>,
  scope: HancomCopyScope,
) {
  const font = hancomBodyFont;
  const border = "border:0.12mm solid #000;padding:0.5mm 1.8mm;mso-padding-alt:0.5mm 1.8mm 0.5mm 1.8mm;vertical-align:middle;white-space:normal;word-break:keep-all;overflow-wrap:break-word;";
  const header = `${border}${font}background-color:#fff;font-size:9pt;font-weight:700;text-align:center;`;
  const body = `${border}${font}`;
  const centered = `${body}text-align:center;`;
  const achievement = `${body}text-align:justify;text-justify:inter-character;`;
  const focus = `${body}text-align:left;`;
  const event = `${centered}height:auto;`;
  const htmlMonths = months.map((month) => {
    const layout = hancomCopyTableLayout(subject, month);
    const columnWidth = (start: number, span = 1) => (
      Math.round(layout.columnWidthsMm.slice(start, start + span).reduce((sum, width) => sum + width, 0) * 100) / 100
    );
    const widthStyle = (start: number, span = 1) => `width:${columnWidth(start, span)}mm;mso-width-source:userset;`;
    const tableWidthPx = Math.round((layout.tableWidthMm / 25.4) * 96);
    const columns = layout.columnWidthsMm.map((width) => (
      `<col width="${Math.round((width / 25.4) * 96)}" style="width:${width}mm;mso-width-source:userset;">`
    )).join("");
    const rows = month.weeks.map((week) => {
      const payload = payloadBySlot.get(week.id) ?? hancomCopyPayload(subject, week, week.payload);
      const events = eventsBySlot.get(week.id) ?? week.events;
      const hasContent = !payloadIsEmpty(payload);
      const weekRowCount = Math.max(1, events.length + (hasContent ? 1 : 0));
      const rowHeights = weekRowHeights(week, events.length, hasContent);
      const monthCell = `<td rowspan="${weekRowCount}" lang="ko" style="${centered}font-size:9pt;${widthStyle(0)}">${htmlText(month.month, `${hancomBodyFont}font-size:9pt;letter-spacing:-0.9pt;`)}</td>`;
      const weekCell = `<td rowspan="${weekRowCount}" style="${centered}${widthStyle(1)}">${weekHtml(week.week)}</td>`;
      const contentCells = `<td lang="ko" style="${centered}${widthStyle(2)}">${htmlText(payload.unit)}</td>` +
        `<td style="${achievement}${widthStyle(3)}">${htmlText(payload.achievement)}</td>` +
        `<td style="${centered}${widthStyle(4)}">${htmlText(payload.activity)}</td>` +
        `<td style="${centered}${widthStyle(5)}">${htmlText(payload.teaching)}</td>` +
        `<td style="${centered}${widthStyle(6)}">${htmlText(payload.evaluation)}</td>` +
        `<td style="${focus}${widthStyle(7)}">${htmlText(payload.focus)}</td>`;
      const eventRows = events.map((eventText, index) => (
        `<tr style="height:${rowHeights[index]}mm;">${index === 0 ? monthCell + weekCell : ""}` +
        `<td colspan="6" lang="ko" style="${event}${widthStyle(2, 6)}">${htmlText(eventText)}</td></tr>`
      )).join("");
      if (events.length && hasContent) {
        return `${eventRows}<tr style="height:${rowHeights[rowHeights.length - 1]}mm;">${contentCells}</tr>`;
      }
      if (events.length) return eventRows;
      return `<tr style="height:${rowHeights[0]}mm;">${monthCell}${weekCell}${contentCells}</tr>`;
    }).join("");

    const monthHeading = scope === "all"
      ? `<p style="font-family:'HY헤드라인M','맑은 고딕',sans-serif;font-size:12pt;line-height:160%;margin:5.6mm 0 1.5mm 0;">■ ${escapeHtml(month.month)}월</p>`
      : "";
    return monthHeading +
      `<table border="1" cellspacing="0" cellpadding="0" width="${tableWidthPx}" style="width:${layout.tableWidthMm}mm;border-collapse:collapse;border-spacing:0;table-layout:fixed;margin:0;border:0.12mm solid #000;mso-table-layout-alt:fixed;">` +
      `<colgroup>${columns}</colgroup>` +
      `<thead><tr style="height:${layout.headerRowHeightsMm[0]}mm;"><th rowspan="2" lang="ko" style="${header}${widthStyle(0)}">${headerText("월")}</th><th rowspan="2" lang="ko" style="${header}${widthStyle(1)}">${headerText("주")}</th>` +
      `<th rowspan="2" lang="ko" style="${header}${widthStyle(2)}">${headerText("단원명\n(영역명)")}</th><th rowspan="2" lang="ko" style="${header}${widthStyle(3)}">${headerText("교육과정 성취기준")}</th>` +
      `<th colspan="4" lang="ko" style="${header}${widthStyle(4, 4)}">${headerText("탐구-실행-성찰과정")}</th></tr>` +
      `<tr style="height:${layout.headerRowHeightsMm[1]}mm;"><th lang="ko" style="${header}${widthStyle(4)}">${headerText("탐구과정\n(기능)")}</th><th lang="ko" style="${header}${widthStyle(5)}">${headerText("수업방법")}</th><th lang="ko" style="${header}${widthStyle(6)}">${headerText("평가방법")}</th><th lang="ko" style="${header}${widthStyle(7)}">${headerText("수업‧평가 연계의 주안점")}</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="ko" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@font-face{font-family:'맑은 고딕';src:local('맑은 고딕'),local('Malgun Gothic')}p{margin:0}table,td,th,span{mso-fareast-font-family:'맑은 고딕';}</style></head><body><!--StartFragment--><div lang="ko" style="margin:0;padding:0;${hancomBodyFont}">${htmlMonths}</div><!--EndFragment--></body></html>`;
  const plain = months.flatMap((month) => [
    ...(scope === "all" ? [`■ ${month.month}월`] : []),
    "월\t주\t단원명(영역명)\t교육과정 성취기준\t탐구과정(기능)\t수업방법\t평가방법\t수업‧평가 연계의 주안점",
    ...month.weeks.flatMap((week) => {
      const payload = payloadBySlot.get(week.id) ?? hancomCopyPayload(subject, week, week.payload);
      const events = eventsBySlot.get(week.id) ?? week.events;
      const contentRow = [month.month, week.week, payload.unit, payload.achievement, payload.activity, payload.teaching, payload.evaluation, payload.focus]
        .map((value) => value.replace(/\n/g, " / "))
        .join("\t");
      if (!events.length) return [contentRow];
      const eventRows = events.map((eventText) => [month.month, week.week, eventText, "", "", "", "", ""].join("\t"));
      return payloadIsEmpty(payload) ? eventRows : [...eventRows, contentRow];
    }),
  ]).join("\n");

  return { html, plain };
}

function copyRichHtmlWithSelection(html: string) {
  const container = document.createElement("div");
  container.contentEditable = "true";
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  const selection = window.getSelection();
  const savedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    selection?.removeAllRanges();
    savedRanges.forEach((savedRange) => selection?.addRange(savedRange));
    container.remove();
  }
  return copied;
}

export function PlanViewer() {
  const [planData, setPlanData] = useState(initialPlanData);
  const [preparedHwpx, setPreparedHwpx] = useState<PreparedHwpx | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentStatus, setDocumentStatus] = useState("HWP 또는 HWPX 문서를 첨부하면 같은 양식으로 불러올 수 있습니다.");
  const [subjectId, setSubjectId] = useState(initialPlanData.subjects[0].id);
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
  const sourceSlotsById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot])), [slots]);
  const copyPayloadBySlot = useMemo(() => new Map(slots.map((slot, index) => {
    const sourceSlot = sourceSlotsById.get(activeOrder[index]) ?? slot;
    const payload = payloadBySlot.get(slot.id) ?? sourceSlot.payload;
    return [slot.id, hancomCopyPayload(subject, sourceSlot, payload)];
  })), [activeOrder, payloadBySlot, slots, sourceSlotsById, subject]);
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

  const uploadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.hwpx?$/i.test(file.name)) {
      setDocumentStatus(".hwp 또는 .hwpx 파일만 첨부할 수 있습니다.");
      return;
    }
    setDocumentBusy(true);
    setDocumentStatus("문서를 분석하고 있습니다. 큰 문서는 잠시 걸릴 수 있습니다.");
    try {
      const loaded = await prepareUploadedDocument(file);
      setPlanData(loaded.planData);
      setPreparedHwpx(loaded.prepared);
      setSubjectId(loaded.planData.subjects[0].id);
      setOrders({});
      setEventLayouts({});
      setCopyStatus("");
      const monthCount = loaded.planData.subjects.reduce((sum, item) => sum + item.months.length, 0);
      setDocumentStatus(`${file.name} · ${loaded.planData.subjects.length}과목 · ${monthCount}개월 표를 불러왔습니다.`);
    } catch (error) {
      setDocumentStatus(error instanceof Error ? error.message : "문서를 불러오지 못했습니다.");
    } finally {
      setDocumentBusy(false);
    }
  };

  const saveDocument = () => {
    if (!preparedHwpx) {
      setDocumentStatus("먼저 원본 HWP 또는 HWPX 문서를 첨부해 주세요.");
      return;
    }
    setDocumentBusy(true);
    setDocumentStatus("현재 순서와 병합 행사 행을 HWPX에 반영하고 있습니다.");
    window.setTimeout(() => {
      try {
        const output = saveEditedHwpx(preparedHwpx, { planData, orders, eventLayouts });
        const fileName = editedFileName(preparedHwpx.sourceName);
        downloadBytes(output, fileName);
        setDocumentStatus(`${fileName} 저장을 시작했습니다. 원본 파일은 변경하지 않았습니다.`);
      } catch (error) {
        setDocumentStatus(error instanceof Error ? error.message : "HWPX 저장에 실패했습니다.");
      } finally {
        setDocumentBusy(false);
      }
    }, 0);
  };

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
    setCopyStatus("단원명부터 수업·평가 연계의 주안점까지의 수업 행만 이동했습니다.");
  };

  const movePayload = (slotId: string, direction: -1 | 1) => {
    const index = slots.findIndex((slot) => slot.id === slotId);
    const target = slots[index + direction];
    if (target) reorderPayloads(slotId, target.id);
  };

  const reorderWeeks = (sourceSlotId: string, targetSlotId: string) => {
    if (sourceSlotId === targetSlotId) return;
    const sourceIndex = slots.findIndex((slot) => slot.id === sourceSlotId);
    const targetIndex = slots.findIndex((slot) => slot.id === targetSlotId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextOrder = [...activeOrder];
    const [movedPayload] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedPayload);

    const eventGroups = slots.map((slot) => [...(eventsBySlot.get(slot.id) ?? [])]);
    const [movedEvents] = eventGroups.splice(sourceIndex, 1);
    eventGroups.splice(targetIndex, 0, movedEvents);
    const nextLayout = Object.fromEntries(slots.map((slot, index) => [slot.id, eventGroups[index]]));

    setOrders((current) => ({ ...current, [subject.id]: nextOrder }));
    setEventLayouts((current) => ({ ...current, [subject.id]: nextLayout }));
    setCopyStatus("해당 주의 수업 행과 행사 행을 모두 함께 이동했습니다.");
  };

  const moveWeek = (slotId: string, direction: -1 | 1) => {
    const index = slots.findIndex((slot) => slot.id === slotId);
    const target = slots[index + direction];
    if (target) reorderWeeks(slotId, target.id);
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

  const moveWholeWeekToNext = (sourceSlotId: string) => {
    const sourceIndex = slots.findIndex((slot) => slot.id === sourceSlotId);
    const targetSlot = slots[sourceIndex + 1];
    if (sourceIndex < 0 || !targetSlot) {
      setCopyStatus("마지막 주차는 다음 주로 전체 이동할 수 없습니다.");
      return;
    }

    const sourcePayload = payloadBySlot.get(sourceSlotId) ?? slots[sourceIndex].payload;
    const targetPayload = payloadBySlot.get(targetSlot.id) ?? targetSlot.payload;
    const sourceEvents = eventsBySlot.get(sourceSlotId) ?? [];
    const targetEvents = eventsBySlot.get(targetSlot.id) ?? [];
    if (!payloadIsEmpty(targetPayload) || targetEvents.length > 0) {
      setCopyStatus("다음 주에 일정이 있어 전체 이동하지 않았습니다. 다음 주를 먼저 비워 주세요.");
      return;
    }

    if (!payloadIsEmpty(sourcePayload)) {
      const nextOrder = [...activeOrder];
      [nextOrder[sourceIndex], nextOrder[sourceIndex + 1]] = [
        nextOrder[sourceIndex + 1],
        nextOrder[sourceIndex],
      ];
      setOrders((current) => ({ ...current, [subject.id]: nextOrder }));
    }

    const nextLayout = Object.fromEntries(slots.map((slot) => [
      slot.id,
      [...(eventsBySlot.get(slot.id) ?? [])],
    ]));
    nextLayout[sourceSlotId] = [];
    nextLayout[targetSlot.id] = [...sourceEvents];
    setEventLayouts((current) => ({ ...current, [subject.id]: nextLayout }));
    setCopyStatus("해당 주의 전체 일정을 빈 다음 주로 이동했습니다.");
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

  const copyPlanForHancom = async (
    targetMonths: NormalizedMonth[],
    scope: HancomCopyScope,
    successMessage: string,
    textFallbackMessage: string,
  ) => {
    const content = buildHancomCopy(subject, targetMonths, copyPayloadBySlot, eventsBySlot, scope);
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([content.html], { type: "text/html" }),
          "text/plain": new Blob([content.plain], { type: "text/plain" }),
        })]);
        setCopyStatus(successMessage);
      } else if (copyRichHtmlWithSelection(content.html)) {
        setCopyStatus(successMessage);
      } else {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(content.plain);
        setCopyStatus(textFallbackMessage);
      }
    } catch {
      try {
        if (copyRichHtmlWithSelection(content.html)) {
          setCopyStatus(successMessage);
        } else {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
          await navigator.clipboard.writeText(content.plain);
          setCopyStatus(textFallbackMessage);
        }
      } catch {
        setCopyStatus("복사 권한을 허용한 뒤 다시 시도해 주세요.");
      }
    }
  };

  const copyForHancom = () => copyPlanForHancom(
    months,
    "all",
    "현재 과목의 전체 월 표를 한글용 형식으로 복사했습니다.",
    "전체 월 표를 셀 붙여넣기용 텍스트로 복사했습니다.",
  );

  const copyMonthForHancom = (month: NormalizedMonth) => copyPlanForHancom(
    [month],
    "month",
    `${month.month}월 표를 한글용 형식으로 복사했습니다.`,
    `${month.month}월 표를 셀 붙여넣기용 텍스트로 복사했습니다.`,
  );

  return (
    <main className={styles.page} lang="ko">
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>2026학년도 · 1학년 · 2학기</p>
          <h1>교수학습 및 평가 운영계획</h1>
          <p className={styles.description}>월별 표를 한 화면에서 확인하고, 주차별 수업 내용과 병합 행사 행을 원하는 순서로 배치할 수 있습니다.</p>
        </div>
        <div className={styles.documentArea}>
          <div className={styles.topActions}>
            {planData.sourceUrl ? <a href={planData.sourceUrl} target="_blank" rel="noreferrer">원본 파일</a> : null}
            <label className={styles.uploadButton}>
              {documentBusy ? "처리 중…" : "HWP 첨부"}
              <input type="file" accept=".hwp,.hwpx" disabled={documentBusy} onChange={uploadDocument} />
            </label>
            <button type="button" disabled={documentBusy || !preparedHwpx} onClick={saveDocument}>HWPX 저장하기</button>
            <button type="button" onClick={() => window.print()}>인쇄</button>
          </div>
          <p className={styles.documentStatus} aria-live="polite">{documentStatus}</p>
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
          <strong>이동 단위</strong>
          <p>주차·날짜는 그대로 유지됩니다. 주 칸의 <b>주 전체</b> 드래그·상하 버튼은 해당 주의 수업 행과 모든 행사 행을 함께 이동합니다. 단원명 칸의 <b>수업행</b> 버튼은 단원명·성취기준·수업방법·수업·평가 연계의 주안점만, 회색 병합 행의 <b>행사</b> 버튼은 해당 행사 하나만 이동합니다. 행사 행의 <b>전체</b>는 해당 주 전체를 빈 다음 주로 옮깁니다. 내용이 없는 주는 행사 1건이 전체 영역을 차지하고, 행사 2건 이상이면 행사별 행으로 자동 분할됩니다.</p>
          <p><b>HWP 첨부</b>로 원본 문서를 불러온 뒤 <b>HWPX 저장하기</b>를 누르면, 현재 순서와 행사 병합 구조를 원본 셀 서식에 반영한 별도 파일을 내려받습니다. 원본 HWP는 변경하지 않습니다.</p>
          <p>필요한 월만 붙여넣을 때는 월 제목 오른쪽의 <b>월 표 복사</b>를 누르세요. 월별 복사는 제목 없이 표만 담기므로, 원본 한글 문서의 해당 월 표 전체를 선택한 뒤 붙여넣어 대체할 수 있습니다. 전 월은 <b>한글용 전체 표 복사</b>를 누르세요.</p>
        </aside>

        {months.map((month) => {
          const tableLayout = hancomTableLayout(subject, month);
          const totalColumnWidth = tableLayout.columnWidthsMm.reduce((sum, width) => sum + width, 0);
          return (
            <section key={month.month} id={`month-${subject.id}-${month.month}`} className={styles.monthSection}>
              <div className={styles.monthHeading}>
                <span className={styles.monthTitle}><span className={styles.monthBullet}>■</span> {month.month}월</span>
                <button
                  type="button"
                  className={styles.monthCopyButton}
                  onClick={() => copyMonthForHancom(month)}
                  aria-label={`${subject.name} ${month.month}월 표를 한글용 형식으로 복사`}
                >
                  {month.month}월 표 복사
                </button>
              </div>
              <div className={styles.tableScroller} tabIndex={0} aria-label={`${subject.name} ${month.month}월 운영계획 편집 표`}>
                <table className={styles.originalTable}>
                  <colgroup>
                    {tableLayout.columnWidthsMm.map((width, index) => (
                      <col key={index} style={{ width: `${(width / totalColumnWidth) * 100}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr style={{ height: `${tableLayout.headerRowHeightsMm[0]}mm` }}>
                      <th rowSpan={2}>월</th>
                      <th rowSpan={2}>주</th>
                      <th rowSpan={2}>단원명<br />(영역명)</th>
                      <th rowSpan={2}>교육과정 성취기준</th>
                      <th colSpan={2}>탐구-실행-성찰과정</th>
                    </tr>
                    <tr style={{ height: `${tableLayout.headerRowHeightsMm[1]}mm` }}>
                      <th>수업방법</th>
                      <th>수업·평가 연계의 주안점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.weeks.map((week) => {
                      const slotIndex = slots.findIndex((slot) => slot.id === week.id);
                      const payload = payloadBySlot.get(week.id) ?? week.payload;
                      const events = eventsBySlot.get(week.id) ?? week.events;
                      const hasContent = !payloadIsEmpty(payload);
                      const weekRowCount = Math.max(1, events.length + (hasContent ? 1 : 0));
                      const monthCell = (
                        <td rowSpan={weekRowCount} className={styles.compactCell}>{month.month}</td>
                      );
                      const weekCell = (
                        <td rowSpan={weekRowCount} className={`${styles.compactCell} ${styles.weekCell}`}>
                          <span>{week.week}</span>
                          <div className={styles.rowTools}>
                            <button
                              type="button"
                              className={styles.dragHandle}
                              draggable
                              onDragStart={(event) => {
                                setDraggedItem({ kind: "week", slotId: week.id });
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", `week:${week.id}`);
                              }}
                              onDragEnd={() => {
                                setDraggedItem(null);
                                setDropSlotId(null);
                              }}
                              aria-label={`${week.week.replace(/\n/g, " ")} 주 전체 이동`}
                            >
                              <span className={styles.desktopDragLabel}>⋮⋮ 주 전체</span>
                              <span className={styles.mobileDragLabel}>전체</span>
                            </button>
                            <span className={styles.arrowTools}>
                              <button type="button" disabled={slotIndex === 0} onClick={() => moveWeek(week.id, -1)} aria-label="이전 주차로 주 전체 이동">↑</button>
                              <button type="button" disabled={slotIndex === slots.length - 1} onClick={() => moveWeek(week.id, 1)} aria-label="다음 주차로 주 전체 이동">↓</button>
                            </span>
                          </div>
                        </td>
                      );
                      const payloadCells = (
                        <>
                          <td className={`${styles.unitCell} ${payloadIsEmpty(payload) ? styles.emptyPayload : ""}`}>
                            <span className={styles.unitText}>{payload.unit}</span>
                            {hasContent ? (
                              <div className={`${styles.rowTools} ${styles.unitTools}`}>
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
                                  aria-label={`${week.week.replace(/\n/g, " ")} 수업 행만 이동`}
                                >
                                  <span className={styles.desktopDragLabel}>⋮⋮ 수업행</span>
                                  <span className={styles.mobileDragLabel}>수업행</span>
                                </button>
                                <span className={styles.arrowTools}>
                                  <button type="button" disabled={slotIndex === 0} onClick={() => movePayload(week.id, -1)} aria-label="이전 주차로 수업 행만 이동">↑</button>
                                  <button type="button" disabled={slotIndex === slots.length - 1} onClick={() => movePayload(week.id, 1)} aria-label="다음 주차로 수업 행만 이동">↓</button>
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.achievement}</td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.teaching}</td>
                          <td className={payloadIsEmpty(payload) ? styles.emptyPayload : ""}>{payload.focus}</td>
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
                          if (draggedItem?.kind === "week") reorderWeeks(draggedItem.slotId, week.id);
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
                                      ⋮⋮ 행사만
                                    </button>
                                    {eventIndex === 0 ? (
                                      <button
                                        type="button"
                                        className={styles.wholeMoveButton}
                                        onClick={() => moveWholeWeekToNext(week.id)}
                                        aria-label={`${week.week.replace(/\n/g, " ")} 전체 일정을 다음 주로 이동`}
                                      >
                                        전체
                                      </button>
                                    ) : null}
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
        <p>요청에 따라 제외된 열은 표시하지 않습니다. 첨부한 파일과 편집 내용은 외부 저장소에 업로드하지 않고 이 브라우저 안에서 처리합니다.</p>
      </footer>
    </main>
  );
}
