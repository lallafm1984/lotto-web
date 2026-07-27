import type {
  FieldKey,
  NormalizedMonth,
  PlanCell,
  PlanSubject,
  PlanTable,
  WeekPayload,
} from "./plan-types";

export const fieldKeys: FieldKey[] = ["unit", "achievement", "teaching", "focus"];

const originalColumnWidthFallback = [2264, 3138, 4415, 9375] as const;
const originalProcessGroupWidthFallback = 28644;
const originalVisibleProcessWidthsFallback = [4848, 12685] as const;
const originalHeaderHeightFallback = 4104;
const originalGroupHeaderHeightFallback = 1466;

type FieldRange = { start: number; end: number };

export function normalizedLabel(text: string) {
  return text.replace(/[\s·‧()]/g, "");
}

export function originalSixColumnLayout(table?: PlanTable) {
  const header = (predicate: (label: string) => boolean) => (
    table?.cells.find((cell) => cell.header && predicate(normalizedLabel(cell.text)))
  );
  const headerWidth = (predicate: (label: string) => boolean) => header(predicate)?.width ?? 0;
  const fixedWidths = [
    headerWidth((label) => label === "월") || originalColumnWidthFallback[0],
    headerWidth((label) => label === "주") || originalColumnWidthFallback[1],
    headerWidth((label) => label.includes("단원명")) || originalColumnWidthFallback[2],
    headerWidth((label) => label.includes("교육과정성취기준")) || originalColumnWidthFallback[3],
  ];
  const processGroupWidth = headerWidth((label) => label.includes("탐구-실행-성찰과정"))
    || originalProcessGroupWidthFallback;
  const methodSourceWidth = headerWidth((label) => label === "수업방법")
    || originalVisibleProcessWidthsFallback[0];
  const focusSourceWidth = headerWidth((label) => label.includes("수업평가연계의주안점"))
    || originalVisibleProcessWidthsFallback[1];
  const visibleProcessTotal = methodSourceWidth + focusSourceWidth;
  const methodWidth = Math.round((methodSourceWidth / visibleProcessTotal) * processGroupWidth);
  const widths = [...fixedWidths, methodWidth, processGroupWidth - methodWidth];
  const headerHeight = header((label) => label === "월")?.height || originalHeaderHeightFallback;
  const groupHeaderHeight = header((label) => label.includes("탐구-실행-성찰과정"))?.height
    || originalGroupHeaderHeightFallback;

  return {
    widths,
    total: fixedWidths.reduce((sum, width) => sum + width, 0) + processGroupWidth,
    headerHeights: [groupHeaderHeight, Math.max(1, headerHeight - groupHeaderHeight)],
  };
}

export function visibleTable(table: PlanTable): PlanTable {
  const hiddenColumns = new Set<number>();
  for (const cell of table.cells) {
    const normalized = normalizedLabel(cell.text);
    const hiddenHeader = cell.header && (
      cell.text.includes("탐구과정") ||
      normalized === "평가방법"
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
    focus: findHeader((label) => label.includes("수업평가연계의주안점")),
  };
}

function overlaps(cell: PlanCell, range: FieldRange) {
  return cell.col < range.end && cell.col + cell.colspan > range.start;
}

export function normalizeSubject(subject: PlanSubject): NormalizedMonth[] {
  return subject.months.map((month) => {
    const weeks: NormalizedMonth["weeks"] = [];

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
        const uniqueFieldCells = Object.fromEntries(fieldKeys.map((key) => {
          const matched = cellsInWeek
            .filter((cell) => {
              const matchedFields = fieldOverlaps(cell);
              return matchedFields.length === 1 && matchedFields[0] === key && cell.text.trim();
            })
            .sort((a, b) => a.row - b.row || a.col - b.col);
          return [key, matched];
        })) as Record<FieldKey, PlanCell[]>;
        const payload = Object.fromEntries(fieldKeys.map((key) => [
          key,
          Array.from(new Set(uniqueFieldCells[key].map((cell) => cell.text.trim()))).join("\n"),
        ])) as WeekPayload;
        const monthCell = cellsInWeek.find((cell) => cell.col === 0);

        weeks.push({
          id: `${subject.id}:${month.month}:${tableIndex}:${weekIndex}`,
          month: month.month,
          week: weekCell.text.trim(),
          height: weekCell.height,
          events,
          payload,
          sourceTableIndex: rawTable.sourceIndex,
          sourceCellIndexes: {
            month: monthCell?.sourceIndex,
            week: weekCell.sourceIndex,
            unit: uniqueFieldCells.unit[0]?.sourceIndex,
            achievement: uniqueFieldCells.achievement[0]?.sourceIndex,
            teaching: uniqueFieldCells.teaching[0]?.sourceIndex,
            focus: uniqueFieldCells.focus[0]?.sourceIndex,
            events: eventCells.flatMap((cell) => cell.sourceIndex === undefined ? [] : [cell.sourceIndex]),
          },
        });
      });
    });

    return { month: month.month, weeks };
  });
}

export function payloadIsEmpty(payload: WeekPayload) {
  return fieldKeys.every((key) => !payload[key].trim());
}
