"use client";

import { useMemo, useState } from "react";
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

const planData = rawPlanData as unknown as PlanData;

function visibleTable(table: PlanTable): PlanTable {
  const hiddenColumns = new Set<number>();
  for (const cell of table.cells) {
    const normalized = cell.text.replace(/[\s·‧]/g, "");
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

function columnWidths(table: PlanTable) {
  const widths = Array.from({ length: table.cols }, () => 0);
  for (const cell of table.cells) {
    if (cell.colspan === 1 && cell.width > widths[cell.col]) {
      widths[cell.col] = cell.width;
    }
  }
  const fallback = 1000;
  const total = widths.reduce((sum, width) => sum + (width || fallback), 0);
  return widths.map((width) => `${(((width || fallback) / total) * 100).toFixed(3)}%`);
}

function OriginalPlanTable({ table }: { table: PlanTable }) {
  const displayedTable = useMemo(() => visibleTable(table), [table]);
  const rows = useMemo(() => {
    const grouped = Array.from({ length: displayedTable.rows }, () => [] as PlanCell[]);
    for (const cell of displayedTable.cells) grouped[cell.row]?.push(cell);
    for (const row of grouped) row.sort((a, b) => a.col - b.col);
    return grouped;
  }, [displayedTable]);
  const widths = useMemo(() => columnWidths(displayedTable), [displayedTable]);

  return (
    <table className={styles.originalTable}>
      <colgroup>
        {widths.map((width, index) => <col key={index} style={{ width }} />)}
      </colgroup>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell) => {
              const Tag = cell.header ? "th" : "td";
              const eventRow = !cell.header && cell.col >= 2 && cell.colspan > 1;
              const compactColumn = cell.col === 0 || cell.col === 1;
              return (
                <Tag
                  key={`${cell.row}-${cell.col}`}
                  rowSpan={cell.rowspan}
                  colSpan={cell.colspan}
                  className={`${eventRow ? styles.eventCell : ""} ${compactColumn ? styles.compactCell : ""}`}
                >
                  {cell.text}
                </Tag>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PlanViewer() {
  const [subjectId, setSubjectId] = useState(planData.subjects[0].id);
  const subject = planData.subjects.find((item) => item.id === subjectId) ?? planData.subjects[0];
  const [month, setMonth] = useState(subject.months[0].month);
  const availableMonth = subject.months.some((item) => item.month === month)
    ? month
    : subject.months[0].month;
  const selectedMonth = subject.months.find((item) => item.month === availableMonth) ?? subject.months[0];
  const subjectIndex = planData.subjects.findIndex((item) => item.id === subject.id);

  const changeSubject = (nextId: string) => {
    const nextSubject = planData.subjects.find((item) => item.id === nextId);
    setSubjectId(nextId);
    if (nextSubject && !nextSubject.months.some((item) => item.month === month)) {
      setMonth(nextSubject.months[0].month);
    }
  };

  return (
    <main className={styles.page} lang="ko">
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>2026학년도 · 1학년 · 2학기</p>
          <h1>교수학습 및 평가 운영계획</h1>
          <p className={styles.description}>과목과 월을 선택하면 원본 표 양식에서 필요한 항목만 확인할 수 있습니다.</p>
        </div>
        <div className={styles.topActions}>
          <a href={planData.sourceUrl} target="_blank" rel="noreferrer">원본 파일</a>
          <button type="button" onClick={() => window.print()}>인쇄</button>
        </div>
      </header>

      <section className={styles.controls} aria-label="운영계획 선택">
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
          <span>월</span>
          <div className={styles.monthTabs} role="tablist" aria-label="월 선택">
            {subject.months.map((item) => (
              <button
                key={item.month}
                type="button"
                role="tab"
                aria-selected={item.month === availableMonth}
                className={item.month === availableMonth ? styles.activeMonth : ""}
                onClick={() => setMonth(item.month)}
              >
                {item.month}월
              </button>
            ))}
          </div>
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

        <div className={styles.monthHeading}>
          <span>■</span> {selectedMonth.month}월
        </div>

        <div className={styles.tableScroller} tabIndex={0} aria-label={`${subject.name} ${selectedMonth.month}월 운영계획 원본 표`}>
          {selectedMonth.tables.map((table, index) => <OriginalPlanTable key={index} table={table} />)}
        </div>

        <p className={styles.notice}>※ {planData.notice}</p>
      </section>

      <footer className={styles.footer}>
        <p>원본: {planData.sourceName}</p>
        <p>원본 표의 셀 병합 구조를 유지하고, 탐구과정 및 수업·평가 연계 주안점 열은 제외했습니다.</p>
      </footer>
    </main>
  );
}
