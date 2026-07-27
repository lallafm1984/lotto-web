#!/usr/bin/env python3
"""Extract subject/month teaching-plan tables from pyhwp's nested XML output."""

from __future__ import annotations

import argparse
import json
import re
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path


HEADER_LABELS = {
    "month": ("월",),
    "week": ("주",),
    "unit": ("단원명",),
    "standard": ("교육과정 성취기준",),
    "activity": ("탐구과정",),
    "method": ("수업방법",),
    "evaluation": ("평가방법",),
    "focus": ("수업‧평가 연계의 주안점", "수업·평가 연계의 주안점"),
}


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def node_text(node: ET.Element) -> str:
    return compact("".join(text.text or "" for text in node.iter("Text")))


def cell_text(cell: ET.Element) -> str:
    paragraphs: list[str] = []
    for paragraph in cell.findall("./Paragraph"):
        text = compact("".join(item.text or "" for item in paragraph.iter("Text")))
        if text:
            paragraphs.append(text)
    if paragraphs:
        return "\n".join(paragraphs)
    return node_text(cell)


def table_text(table: ET.Element) -> str:
    return " | ".join(filter(None, (node_text(cell) for cell in table.iter("TableCell"))))


def subject_from_title(title: str) -> str:
    match = re.search(r"\(([^()]+)\)\s*교수학습", title)
    if match:
        return compact(match.group(1))
    prefix = title.split("교수학습", 1)[0]
    prefix = re.sub(r"^.*?2학기\s*", "", prefix)
    return compact(prefix.strip("() "))


def header_columns(table: ET.Element) -> tuple[dict[str, int], int]:
    columns: dict[str, int] = {}
    header_last_row = 0
    for cell in table.iter("TableCell"):
        text = node_text(cell)
        row = int(cell.get("row", "0"))
        if row > 1:
            continue
        col = int(cell.get("col", "0"))
        for key, labels in HEADER_LABELS.items():
            if any(label in text for label in labels):
                columns.setdefault(key, col)
                header_last_row = max(header_last_row, row)
    return columns, header_last_row


def original_table(table: ET.Element) -> dict[str, object] | None:
    columns, header_last_row = header_columns(table)
    required = {"month", "week", "unit", "standard", "method", "evaluation", "focus"}
    if not required.issubset(columns):
        return None

    body = table.find(".//TableBody")
    if body is None:
        return None

    cells: list[dict[str, object]] = []
    month = ""
    for cell in table.iter("TableCell"):
        row = int(cell.get("row", "0"))
        col = int(cell.get("col", "0"))
        text = cell_text(cell)
        if row > header_last_row and col == columns["month"] and not month:
            month = normalize_month(text)
        cells.append(
            {
                "row": row,
                "col": col,
                "rowspan": int(cell.get("rowspan", "1")),
                "colspan": int(cell.get("colspan", "1")),
                "width": int(cell.get("width", "0")),
                "height": int(cell.get("height", "0")),
                "text": text,
                "header": row <= header_last_row,
            }
        )

    if not month:
        return None
    return {
        "month": month,
        "rows": int(body.get("rows", "0")),
        "cols": int(body.get("cols", "0")),
        "cells": cells,
    }


def build_grid(table: ET.Element) -> tuple[list[list[ET.Element | None]], int]:
    body = table.find(".//TableBody")
    if body is None:
        return [], 0
    row_count = int(body.get("rows", "0"))
    col_count = int(body.get("cols", "0"))
    grid: list[list[ET.Element | None]] = [[None] * col_count for _ in range(row_count)]
    for cell in table.iter("TableCell"):
        row = int(cell.get("row", "0"))
        col = int(cell.get("col", "0"))
        rowspan = int(cell.get("rowspan", "1"))
        colspan = int(cell.get("colspan", "1"))
        for row_index in range(row, min(row + rowspan, row_count)):
            for col_index in range(col, min(col + colspan, col_count)):
                grid[row_index][col_index] = cell
    return grid, col_count


def row_value(row: list[ET.Element | None], col: int | None) -> str:
    if col is None or col >= len(row) or row[col] is None:
        return ""
    return node_text(row[col])


def normalize_month(value: str) -> str:
    match = re.search(r"(?:^|\D)(1[0-2]|[1-9])(?:월)?(?:\D|$)", value)
    return match.group(1) if match else compact(value.replace("월", ""))


def extract_schedule_table(table: ET.Element) -> list[dict[str, object]]:
    columns, header_last_row = header_columns(table)
    required = {"month", "week", "unit", "standard", "activity", "method", "evaluation", "focus"}
    if not required.issubset(columns):
        return []

    grid, col_count = build_grid(table)
    groups: "OrderedDict[tuple[str, str], dict[str, object]]" = OrderedDict()
    current_month = ""
    current_week = ""

    for row_index, row in enumerate(grid):
        if row_index <= header_last_row:
            continue

        month = normalize_month(row_value(row, columns["month"])) or current_month
        week = row_value(row, columns["week"]) or current_week
        if month:
            current_month = month
        if week:
            current_week = week
        if not month or not week:
            continue

        key = (month, week)
        group = groups.setdefault(
            key,
            {"month": month, "week": week, "events": [], "lessons": []},
        )

        values = {name: row_value(row, col) for name, col in columns.items()}
        mapped_cells = {row[col] for col in columns.values() if col < col_count and row[col] is not None}
        row_cells = []
        for cell in table.iter("TableCell"):
            if int(cell.get("row", "0")) == row_index:
                row_cells.append(cell)

        event_texts: list[str] = []
        for cell in row_cells:
            text = node_text(cell)
            if not text:
                continue
            col = int(cell.get("col", "0"))
            colspan = int(cell.get("colspan", "1"))
            if col >= columns["unit"] and colspan > 1:
                event_texts.append(text)

        lesson_fields = [
            values["standard"],
            values["activity"],
            values["method"],
            values["evaluation"],
            values["focus"],
        ]
        is_lesson = bool(values["unit"] and any(lesson_fields))

        if is_lesson:
            lesson = {
                "unit": values["unit"],
                "standard": values["standard"],
                "activity": values["activity"],
                "method": values["method"],
                "evaluation": values["evaluation"],
                "focus": values["focus"],
            }
            if lesson not in group["lessons"]:
                group["lessons"].append(lesson)
        elif values["unit"] and values["unit"] not in event_texts:
            event_texts.append(values["unit"])

        for event in event_texts:
            if event not in group["events"]:
                group["events"].append(event)

    return list(groups.values())


def extract_plan(xml_path: Path) -> dict[str, object]:
    root = ET.parse(xml_path).getroot()
    tables = list(root.iter("TableControl"))
    subjects: list[dict[str, object]] = []

    title_indexes = [
        index
        for index, table in enumerate(tables)
        if "교수학습 및 평가 운영 계획" in table_text(table)
    ]

    for position, title_index in enumerate(title_indexes):
        end_index = title_indexes[position + 1] if position + 1 < len(title_indexes) else len(tables)
        subject = subject_from_title(table_text(tables[title_index]))
        schedule_tables: list[dict[str, object]] = []
        for table in tables[title_index + 1 : end_index]:
            extracted_table = original_table(table)
            if extracted_table is not None:
                schedule_tables.append(extracted_table)

        months: "OrderedDict[str, list[dict[str, object]]]" = OrderedDict()
        for schedule_table in schedule_tables:
            months.setdefault(str(schedule_table["month"]), []).append(schedule_table)

        subjects.append(
            {
                "id": f"subject-{position + 1}",
                "name": subject,
                "months": [
                    {"month": month, "tables": month_tables}
                    for month, month_tables in months.items()
                ],
            }
        )

    return {
        "title": "2026학년도 1학년 2학기 교수학습 및 평가 운영계획",
        "sourceName": "2026학년도 1학년 2학기 교수학습 및 평가 운영 계획(초안_이유리).hwp",
        "sourceUrl": "https://drive.google.com/file/d/1xt6IPZ1CCtIhWBQApwyPcOSKvliOeoJq/view?usp=drivesdk",
        "notice": "운영계획은 학교의 학사일정이나 교사의 교수·학습 재구성에 따라 변경될 수 있습니다.",
        "subjects": subjects,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("xml", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = extract_plan(args.xml)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "subjects": len(result["subjects"]),
                "months": sum(len(subject["months"]) for subject in result["subjects"]),
                "weeks": sum(
                    len(month["tables"])
                    for subject in result["subjects"]
                    for month in subject["months"]
                ),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
