import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { normalizeSubject, normalizedLabel, payloadIsEmpty } from "./plan-model";
import type {
  FieldKey,
  NormalizedWeek,
  PlanCell,
  PlanData,
  PlanSubject,
  PlanTable,
  StoredEventLayouts,
  StoredOrders,
  WeekPayload,
} from "./plan-types";

const HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph";
const HWPUNITCHAR_NS = "http://www.hancom.co.kr/hwpml/2016/HwpUnitChar";
const SECTION_PATH = /^Contents\/section(\d+)\.xml$/;
const DEFAULT_NOTICE = "운영계획은 학교의 학사일정이나 교사의 교수·학습 재구성에 따라 변경될 수 있습니다.";
const FIELD_OLD_COLUMNS: Record<FieldKey, number> = {
  unit: 2,
  achievement: 3,
  teaching: 5,
  focus: 7,
};
const FIELD_NEW_COLUMNS: Record<FieldKey, number> = {
  unit: 2,
  achievement: 3,
  teaching: 4,
  focus: 5,
};

type PageDef = {
  width: number;
  height: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  marginHeader: number;
  marginFooter: number;
  marginGutter: number;
};

export type PreparedHwpx = {
  bytes: Uint8Array;
  pageDefs?: PageDef[];
  sourceName: string;
};

type SaveOptions = {
  planData: PlanData;
  orders: StoredOrders;
  eventLayouts: StoredEventLayouts;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function childrenByName(parent: Element, localName: string) {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

function descendantsByName(parent: Element | XMLDocument, localName: string) {
  return Array.from(parent.getElementsByTagName("*")).filter((child) => child.localName === localName);
}

function firstDescendant(parent: Element, localName: string) {
  return descendantsByName(parent, localName)[0];
}

function cellParagraphs(cell: Element) {
  const subList = firstDescendant(cell, "subList");
  if (!subList) return [];
  return childrenByName(subList, "p")
    .map((paragraph) => compact(paragraph.textContent ?? ""))
    .filter(Boolean);
}

function cellText(cell: Element) {
  return cellParagraphs(cell).join("\n");
}

function tableCells(table: Element) {
  return childrenByName(table, "tr").flatMap((row) => childrenByName(row, "tc"));
}

function tableText(table: Element) {
  return tableCells(table).map(cellText).filter(Boolean).join(" | ");
}

function numberAttribute(element: Element | undefined, name: string, fallback = 0) {
  if (!element) return fallback;
  const value = Number.parseInt(element.getAttribute(name) ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMonth(value: string) {
  const match = value.match(/(?:^|\D)(1[0-2]|[1-9])(?:월)?(?:\D|$)/);
  return match?.[1] ?? compact(value.replace("월", ""));
}

function subjectFromTitle(title: string) {
  const match = title.match(/\(([^()]+)\)\s*교수학습/);
  if (match) return compact(match[1]);
  return compact(title.split("교수학습", 1)[0].replace(/^.*?2학기\s*/, "").replace(/[()]/g, ""));
}

function parsePlanTable(table: Element, sourceIndex: number): PlanTable | null {
  const cells = tableCells(table);
  const parsed: PlanCell[] = cells.map((cell, cellIndex) => {
    const address = firstDescendant(cell, "cellAddr");
    const span = firstDescendant(cell, "cellSpan");
    const size = firstDescendant(cell, "cellSz");
    const row = numberAttribute(address, "rowAddr");
    return {
      row,
      col: numberAttribute(address, "colAddr"),
      rowspan: numberAttribute(span, "rowSpan", 1),
      colspan: numberAttribute(span, "colSpan", 1),
      width: numberAttribute(size, "width"),
      height: numberAttribute(size, "height"),
      text: cellText(cell),
      header: row <= 1,
      sourceIndex: cellIndex,
    };
  });
  const headerLabels = parsed.filter((cell) => cell.header).map((cell) => normalizedLabel(cell.text));
  const required = ["월", "주", "단원명", "교육과정성취기준", "수업방법", "수업평가연계의주안점"];
  if (!required.every((label) => headerLabels.some((header) => header.includes(label)))) return null;
  const monthCell = parsed.find((cell) => !cell.header && cell.col === 0 && cell.text);
  if (!monthCell) return null;
  return {
    month: normalizeMonth(monthCell.text),
    rows: numberAttribute(table, "rowCnt"),
    cols: numberAttribute(table, "colCnt"),
    cells: parsed,
    sourceIndex,
  };
}

function parsePlanData(hwpx: Uint8Array, sourceName: string): PlanData {
  const archive = unzipSync(hwpx);
  const sectionName = Object.keys(archive).find((name) => SECTION_PATH.test(name));
  if (!sectionName) throw new Error("HWPX 본문 구역을 찾을 수 없습니다.");
  const sectionXml = strFromU8(archive[sectionName]);
  const document = new DOMParser().parseFromString(sectionXml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("변환된 HWPX 본문을 읽지 못했습니다.");

  const allTables = descendantsByName(document, "tbl");
  const subjects: PlanSubject[] = [];
  let currentSubject: PlanSubject | null = null;
  let sourceIndex = 0;
  let titleCount = 0;
  let planCount = 0;

  for (const table of allTables) {
    const text = tableText(table);
    if (normalizedLabel(text).includes("교수학습및평가운영계획")) {
      titleCount += 1;
      currentSubject = {
        id: `subject-${subjects.length + 1}`,
        name: subjectFromTitle(text),
        months: [],
      };
      subjects.push(currentSubject);
      continue;
    }
    const planTable = parsePlanTable(table, sourceIndex);
    if (!planTable) continue;
    planCount += 1;
    sourceIndex += 1;
    if (!currentSubject) continue;
    let month = currentSubject.months.find((item) => item.month === planTable.month);
    if (!month) {
      month = { month: planTable.month, tables: [] };
      currentSubject.months.push(month);
    }
    month.tables.push(planTable);
  }

  const validSubjects = subjects.filter((subject) => subject.months.length > 0);
  if (!validSubjects.length) {
    throw new Error(`'교수학습 및 평가 운영 계획' 표를 찾지 못했습니다. ${sectionName} ${sectionXml.length}자 · 루트 ${document.documentElement.localName} · 표 ${allTables.length}개 · 제목 ${titleCount}개 · 월표 ${planCount}개`);
  }
  return {
    title: "교수학습 및 평가 운영계획",
    sourceName,
    sourceUrl: "",
    notice: DEFAULT_NOTICE,
    subjects: validSubjects,
  };
}

function estimateTextWidth(font: string, text: string) {
  const match = String(font).match(/([0-9.]+)px/);
  const size = match ? Number.parseFloat(match[1]) : 12;
  return Array.from(String(text)).reduce((width, character) => (
    width + ((character.codePointAt(0) ?? 0) >= 0x1100 ? size : size * 0.55)
  ), 0);
}

let rhwpReady: Promise<typeof import("./vendor/rhwp.js")> | null = null;

async function loadRhwp() {
  if (!rhwpReady) {
    rhwpReady = import("./vendor/rhwp.js").then(async (rhwp) => {
      (globalThis as typeof globalThis & { measureTextWidth?: typeof estimateTextWidth }).measureTextWidth = estimateTextWidth;
      const response = await fetch("/vendor/rhwp_bg.wasm");
      if (!response.ok) throw new Error("HWP 변환 엔진을 불러오지 못했습니다.");
      await rhwp.default({ module_or_path: await response.arrayBuffer() });
      return rhwp;
    });
  }
  return rhwpReady;
}

export async function prepareUploadedDocument(file: File) {
  const source = new Uint8Array(await file.arrayBuffer());
  const isZip = source[0] === 0x50 && source[1] === 0x4b;
  let prepared: PreparedHwpx;
  if (isZip) {
    prepared = { bytes: source, sourceName: file.name };
  } else {
    const rhwp = await loadRhwp();
    const document = new rhwp.HwpDocument(source);
    try {
      const pageDefs = Array.from({ length: document.getSectionCount() }, (_, index) => (
        JSON.parse(document.getPageDef(index)) as PageDef
      ));
      prepared = { bytes: document.exportHwpx(), pageDefs, sourceName: file.name };
    } finally {
      document.free();
    }
  }
  return { prepared, planData: parsePlanData(prepared.bytes, file.name) };
}

function setCellGeometry(cell: Element, row: number, col: number, rowSpan: number, colSpan: number, width: number, height: number) {
  const address = firstDescendant(cell, "cellAddr");
  const span = firstDescendant(cell, "cellSpan");
  const size = firstDescendant(cell, "cellSz");
  address?.setAttribute("rowAddr", String(row));
  address?.setAttribute("colAddr", String(col));
  span?.setAttribute("rowSpan", String(rowSpan));
  span?.setAttribute("colSpan", String(colSpan));
  size?.setAttribute("width", String(Math.max(1, Math.round(width))));
  size?.setAttribute("height", String(Math.max(1, Math.round(height))));
  descendantsByName(cell, "linesegarray").forEach((item) => item.remove());
}

function setCellText(cell: Element, value: string) {
  const subList = firstDescendant(cell, "subList");
  if (!subList) return;
  const paragraphs = childrenByName(subList, "p");
  const paragraphTemplate = paragraphs[0];
  if (!paragraphTemplate) return;
  const lines = value.split("\n");
  paragraphs.forEach((paragraph) => paragraph.remove());
  lines.forEach((line, index) => {
    const sourceParagraph = paragraphs[Math.min(index, paragraphs.length - 1)] ?? paragraphTemplate;
    const paragraph = sourceParagraph.cloneNode(true) as Element;
    paragraph.setAttribute("id", String(index));
    descendantsByName(paragraph, "linesegarray").forEach((item) => item.remove());
    const runs = childrenByName(paragraph, "run");
    const runTemplate = runs[0];
    runs.forEach((run) => run.remove());
    if (runTemplate) {
      const run = runTemplate.cloneNode(true) as Element;
      const texts = descendantsByName(run, "t");
      if (texts[0]) {
        texts[0].textContent = line;
        texts.slice(1).forEach((text) => text.remove());
      } else {
        const text = paragraph.ownerDocument.createElementNS(HP_NS, "hp:t");
        text.textContent = line;
        run.appendChild(text);
      }
      paragraph.appendChild(run);
    }
    subList.appendChild(paragraph);
  });
}

function directSize(table: Element) {
  return childrenByName(table, "sz")[0];
}

function createRow(document: XMLDocument, cells: Element[]) {
  const row = document.createElementNS(HP_NS, "hp:tr");
  cells.forEach((cell) => row.appendChild(cell));
  return row;
}

function planHeader(table: PlanTable, predicate: (label: string) => boolean) {
  return table.cells.find((cell) => cell.header && predicate(normalizedLabel(cell.text)));
}

function scaledColumnWidths(table: PlanTable) {
  const headers = [
    planHeader(table, (label) => label === "월"),
    planHeader(table, (label) => label === "주"),
    planHeader(table, (label) => label.includes("단원명")),
    planHeader(table, (label) => label.includes("교육과정성취기준")),
    planHeader(table, (label) => label === "수업방법"),
    planHeader(table, (label) => label.includes("수업평가연계의주안점")),
  ];
  const topHeaders = table.cells.filter((cell) => cell.header && cell.row === 0);
  const total = topHeaders.reduce((sum, cell) => sum + cell.width, 0) || 47836;
  const fallback = [2264, 3138, 4415, 9375, 4848, 12685];
  const visible = headers.map((header, index) => header?.width || fallback[index]);
  const visibleTotal = visible.reduce((sum, width) => sum + width, 0);
  const scaled = visible.map((width) => Math.round((width / visibleTotal) * total));
  scaled[scaled.length - 1] += total - scaled.reduce((sum, width) => sum + width, 0);
  return { widths: scaled, total };
}

function weekRowHeightsHwp(week: NormalizedWeek, eventCount: number, hasContent: boolean) {
  const eventMinimum = 1366;
  const total = Math.max(eventMinimum, week.height);
  if (!eventCount) return [total];
  if (!hasContent) {
    const base = Math.floor(total / eventCount);
    return Array.from({ length: eventCount }, (_, index) => base + (index === eventCount - 1 ? total - base * eventCount : 0));
  }
  const content = Math.max(eventMinimum, total - eventMinimum * eventCount);
  return [...Array.from({ length: eventCount }, () => eventMinimum), content];
}

function rewritePlanTable(
  tableElement: Element,
  planTable: PlanTable,
  weeks: NormalizedWeek[],
  sourceSlots: Map<string, NormalizedWeek>,
  payloadSourceByTarget: Map<string, string>,
  eventsByTarget: Map<string, string[]>,
  originalTables: Map<number, Element[]>,
  eventCellsByText: Map<string, Element>,
) {
  const document = tableElement.ownerDocument;
  const originalCells = originalTables.get(planTable.sourceIndex ?? -1);
  if (!originalCells) return;
  const sourceCell = (tableIndex: number | undefined, cellIndex: number | undefined) => {
    if (tableIndex === undefined || cellIndex === undefined) return undefined;
    return originalTables.get(tableIndex)?.[cellIndex];
  };
  const genericByColumn = new Map<number, Element>();
  originalCells.forEach((cell) => {
    const address = firstDescendant(cell, "cellAddr");
    const row = numberAttribute(address, "rowAddr");
    const col = numberAttribute(address, "colAddr");
    if (row >= 2 && !genericByColumn.has(col)) genericByColumn.set(col, cell);
  });
  const { widths, total } = scaledColumnWidths(planTable);
  const rows = childrenByName(tableElement, "tr");
  const headerCells = rows.slice(0, 2).flatMap((row) => childrenByName(row, "tc"));
  const headerAt = (row: number, col: number) => headerCells.find((cell) => {
    const address = firstDescendant(cell, "cellAddr");
    return numberAttribute(address, "rowAddr") === row && numberAttribute(address, "colAddr") === col;
  });

  const roleHeaders = [
    planHeader(planTable, (label) => label === "월"),
    planHeader(planTable, (label) => label === "주"),
    planHeader(planTable, (label) => label.includes("단원명")),
    planHeader(planTable, (label) => label.includes("교육과정성취기준")),
  ];
  const topHeader = roleHeaders.flatMap((roleHeader, col) => {
    const source = roleHeader ? headerAt(roleHeader.row, roleHeader.col) : undefined;
    if (!source) return [];
    const cell = source.cloneNode(true) as Element;
    setCellGeometry(cell, 0, col, 2, 1, widths[col], numberAttribute(firstDescendant(source, "cellSz"), "height", 4104));
    return [cell];
  });
  const groupHeader = planHeader(planTable, (label) => label.includes("탐구-실행-성찰과정"));
  const groupSource = groupHeader ? headerAt(groupHeader.row, groupHeader.col) : undefined;
  if (groupSource) {
    const group = groupSource.cloneNode(true) as Element;
    setCellGeometry(group, 0, 4, 1, 2, widths[4] + widths[5], numberAttribute(firstDescendant(groupSource, "cellSz"), "height", 1466));
    topHeader.push(group);
  }
  const methodHeader = planHeader(planTable, (label) => label === "수업방법");
  const focusHeader = planHeader(planTable, (label) => label.includes("수업평가연계의주안점"));
  const secondHeader = [methodHeader, focusHeader].flatMap((roleHeader, index) => {
    const source = roleHeader ? headerAt(roleHeader.row, roleHeader.col) : undefined;
    if (!source) return [];
    const cell = source.cloneNode(true) as Element;
    setCellGeometry(cell, 1, index + 4, 1, 1, widths[index + 4], numberAttribute(firstDescendant(source, "cellSz"), "height", 2638));
    return [cell];
  });
  const newRows: Element[] = [createRow(document, topHeader), createRow(document, secondHeader)];
  let rowIndex = 2;
  const oldFieldColumns: Record<FieldKey, number> = {
    unit: planHeader(planTable, (label) => label.includes("단원명"))?.col ?? FIELD_OLD_COLUMNS.unit,
    achievement: planHeader(planTable, (label) => label.includes("교육과정성취기준"))?.col ?? FIELD_OLD_COLUMNS.achievement,
    teaching: methodHeader?.col ?? FIELD_OLD_COLUMNS.teaching,
    focus: focusHeader?.col ?? FIELD_OLD_COLUMNS.focus,
  };

  for (const week of weeks) {
    const sourcePayloadId = payloadSourceByTarget.get(week.id) ?? week.id;
    const payloadSlot = sourceSlots.get(sourcePayloadId) ?? week;
    const payload = payloadSlot.payload;
    const events = eventsByTarget.get(week.id) ?? week.events;
    const hasContent = !payloadIsEmpty(payload);
    const rowCount = Math.max(1, events.length + (hasContent ? 1 : 0));
    const heights = weekRowHeightsHwp(week, events.length, hasContent);
    const monthSource = sourceCell(week.sourceTableIndex, week.sourceCellIndexes.month) ?? genericByColumn.get(0);
    const weekSource = sourceCell(week.sourceTableIndex, week.sourceCellIndexes.week) ?? genericByColumn.get(1);
    const monthCell = monthSource?.cloneNode(true) as Element | undefined;
    const weekCell = weekSource?.cloneNode(true) as Element | undefined;
    if (monthCell) setCellGeometry(monthCell, rowIndex, 0, rowCount, 1, widths[0], week.height);
    if (weekCell) setCellGeometry(weekCell, rowIndex, 1, rowCount, 1, widths[1], week.height);

    events.forEach((eventText, eventIndex) => {
      const template = eventCellsByText.get(eventText) ?? genericByColumn.get(2);
      if (!template) return;
      const eventCell = template.cloneNode(true) as Element;
      setCellText(eventCell, eventText);
      setCellGeometry(eventCell, rowIndex + eventIndex, 2, 1, 4, widths.slice(2).reduce((sum, width) => sum + width, 0), heights[eventIndex]);
      newRows.push(createRow(document, [
        ...(eventIndex === 0 && monthCell ? [monthCell] : []),
        ...(eventIndex === 0 && weekCell ? [weekCell] : []),
        eventCell,
      ]));
    });

    if (hasContent || events.length === 0) {
      const contentRowIndex = rowIndex + events.length;
      const contentHeight = heights[heights.length - 1];
      const contentCells = (["unit", "achievement", "teaching", "focus"] as FieldKey[]).map((field) => {
        const source = sourceCell(payloadSlot.sourceTableIndex, payloadSlot.sourceCellIndexes[field]) ?? genericByColumn.get(oldFieldColumns[field]);
        if (!source) throw new Error("원본 표의 수업 셀 서식을 찾지 못했습니다.");
        const cell = source.cloneNode(true) as Element;
        if (cellText(cell) !== payload[field]) setCellText(cell, payload[field]);
        const newCol = FIELD_NEW_COLUMNS[field];
        setCellGeometry(cell, contentRowIndex, newCol, 1, 1, widths[newCol], contentHeight);
        return cell;
      });
      newRows.push(createRow(document, [
        ...(events.length === 0 && monthCell ? [monthCell] : []),
        ...(events.length === 0 && weekCell ? [weekCell] : []),
        ...contentCells,
      ]));
    }
    rowIndex += rowCount;
  }

  rows.forEach((row) => row.remove());
  newRows.forEach((row) => tableElement.appendChild(row));
  tableElement.setAttribute("rowCnt", String(rowIndex));
  tableElement.setAttribute("colCnt", "6");
  const size = directSize(tableElement);
  size?.setAttribute("width", String(total));
  size?.setAttribute("height", String(4104 + weeks.reduce((sum, week) => sum + Math.max(1366, week.height), 0)));
}

function normalizeSection(document: XMLDocument, pageDef?: PageDef) {
  const root = document.documentElement;
  if (!root.hasAttribute("xmlns:hwpunitchar")) root.setAttribute("xmlns:hwpunitchar", HWPUNITCHAR_NS);
  descendantsByName(document, "linesegarray").forEach((item) => item.remove());
  descendantsByName(document, "t").forEach((text) => {
    if ((text.textContent ?? "").trim()) return;
    let sibling = text.nextSibling;
    while (sibling && sibling.nodeType === Node.TEXT_NODE && !(sibling.textContent ?? "").trim()) sibling = sibling.nextSibling;
    if (sibling instanceof Element && sibling.localName === "tbl") text.remove();
  });
  if (pageDef) {
    const pagePr = descendantsByName(document, "pagePr")[0];
    const margin = pagePr ? firstDescendant(pagePr, "margin") : undefined;
    pagePr?.setAttribute("width", String(pageDef.width));
    pagePr?.setAttribute("height", String(pageDef.height));
    const margins: Array<[string, keyof PageDef]> = [
      ["left", "marginLeft"], ["right", "marginRight"], ["top", "marginTop"],
      ["bottom", "marginBottom"], ["header", "marginHeader"], ["footer", "marginFooter"], ["gutter", "marginGutter"],
    ];
    margins.forEach(([name, key]) => margin?.setAttribute(name, String(pageDef[key])));
  }
  descendantsByName(document, "pic").forEach((picture) => {
    const clip = firstDescendant(picture, "imgClip");
    const current = firstDescendant(picture, "curSz");
    const width = numberAttribute(clip, "right") || numberAttribute(current, "width");
    const height = numberAttribute(clip, "bottom") || numberAttribute(current, "height");
    if (!width || !height) return;
    const original = firstDescendant(picture, "orgSz");
    const dimension = firstDescendant(picture, "imgDim");
    if (numberAttribute(original, "width") === 0) original?.setAttribute("width", String(width));
    if (numberAttribute(original, "height") === 0) original?.setAttribute("height", String(height));
    if (numberAttribute(dimension, "dimwidth") === 0) dimension?.setAttribute("dimwidth", String(width));
    if (numberAttribute(dimension, "dimheight") === 0) dimension?.setAttribute("dimheight", String(height));
  });
}

export function saveEditedHwpx(prepared: PreparedHwpx, options: SaveOptions) {
  const archive = unzipSync(prepared.bytes);
  const sectionNames = Object.keys(archive).filter((name) => SECTION_PATH.test(name)).sort();
  if (!sectionNames.length) throw new Error("HWPX 본문 구역을 찾을 수 없습니다.");

  const subjectSlots = new Map<string, NormalizedWeek[]>();
  const allSourceSlots = new Map<string, NormalizedWeek>();
  const payloadSourceByTarget = new Map<string, string>();
  const eventsByTarget = new Map<string, string[]>();
  options.planData.subjects.forEach((subject) => {
    const slots = normalizeSubject(subject).flatMap((month) => month.weeks);
    subjectSlots.set(subject.id, slots);
    slots.forEach((slot) => allSourceSlots.set(slot.id, slot));
    const originalOrder = slots.map((slot) => slot.id);
    const storedOrder = options.orders[subject.id];
    const order = storedOrder?.length === originalOrder.length && storedOrder.every((id) => allSourceSlots.has(id))
      ? storedOrder
      : originalOrder;
    slots.forEach((slot, index) => {
      payloadSourceByTarget.set(slot.id, order[index]);
      eventsByTarget.set(slot.id, options.eventLayouts[subject.id]?.[slot.id] ?? slot.events);
    });
  });

  let planTableOffset = 0;
  const previewParagraphs: string[] = [];
  sectionNames.forEach((sectionName, sectionIndex) => {
    const document = new DOMParser().parseFromString(strFromU8(archive[sectionName]), "application/xml");
    if (document.querySelector("parsererror")) throw new Error("HWPX 본문 XML을 읽지 못했습니다.");
    const candidateTables = descendantsByName(document, "tbl");
    const planElements = candidateTables.filter((table) => {
      const labels = tableCells(table).filter((cell) => numberAttribute(firstDescendant(cell, "cellAddr"), "rowAddr") <= 1).map((cell) => normalizedLabel(cellText(cell)));
      return ["월", "주", "단원명", "교육과정성취기준", "수업방법", "수업평가연계의주안점"].every((label) => labels.some((item) => item.includes(label)));
    });
    const originalTables = new Map(planElements.map((table, index) => [
      index + planTableOffset,
      tableCells(table).map((cell) => cell.cloneNode(true) as Element),
    ]));
    const eventCellsByText = new Map<string, Element>();
    options.planData.subjects.flatMap((subject) => normalizeSubject(subject).flatMap((month) => month.weeks)).forEach((week) => {
      week.events.forEach((eventText, index) => {
        const source = originalTables.get(week.sourceTableIndex ?? -1)?.[week.sourceCellIndexes.events[index]];
        if (source && !eventCellsByText.has(eventText)) eventCellsByText.set(eventText, source);
      });
    });

    options.planData.subjects.forEach((subject) => {
      const slots = subjectSlots.get(subject.id) ?? [];
      subject.months.flatMap((month) => month.tables).forEach((planTable) => {
        const globalIndex = planTable.sourceIndex;
        if (globalIndex === undefined || globalIndex < planTableOffset || globalIndex >= planTableOffset + planElements.length) return;
        const localIndex = globalIndex - planTableOffset;
        const weeks = slots.filter((week) => week.sourceTableIndex === globalIndex);
        rewritePlanTable(
          planElements[localIndex],
          planTable,
          weeks,
          allSourceSlots,
          payloadSourceByTarget,
          eventsByTarget,
          originalTables,
          eventCellsByText,
        );
      });
    });
    normalizeSection(document, prepared.pageDefs?.[sectionIndex]);
    descendantsByName(document, "p").forEach((paragraph) => {
      const text = compact(paragraph.textContent ?? "");
      if (text) previewParagraphs.push(text);
    });
    archive[sectionName] = strToU8(new XMLSerializer().serializeToString(document));
    planTableOffset += planElements.length;
  });

  if (archive["Contents/content.hpf"]) {
    const content = strFromU8(archive["Contents/content.hpf"]).replace(
      /<opf:item\b(?=[^>]*\bmedia-type=["']image\/)[^>]*?\/>/gi,
      (item) => /\bisEmbeded\s*=/i.test(item) ? item : item.replace(/\s*\/>$/, ' isEmbeded="1"/>'),
    );
    archive["Contents/content.hpf"] = strToU8(content);
  }
  archive["Preview/PrvText.txt"] = strToU8(`${previewParagraphs.join("\r\n")}\r\n`);
  const output: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  if (archive.mimetype) output.mimetype = [archive.mimetype, { level: 0 }];
  Object.entries(archive).forEach(([name, data]) => {
    if (name !== "mimetype") output[name] = data;
  });
  return zipSync(output, { level: 6 });
}

export function editedFileName(sourceName: string) {
  return `${sourceName.replace(/\.(?:hwp|hwpx)$/i, "")}_수정본.hwpx`;
}

export function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.hancom.hwpx" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
