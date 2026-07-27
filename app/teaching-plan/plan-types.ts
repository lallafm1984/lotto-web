export type PlanCell = {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  width: number;
  height: number;
  text: string;
  header: boolean;
  sourceIndex?: number;
};

export type PlanTable = {
  month: string;
  rows: number;
  cols: number;
  cells: PlanCell[];
  sourceIndex?: number;
};

export type PlanMonth = {
  month: string;
  tables: PlanTable[];
};

export type PlanSubject = {
  id: string;
  name: string;
  months: PlanMonth[];
};

export type PlanData = {
  title: string;
  sourceName: string;
  sourceUrl: string;
  notice: string;
  subjects: PlanSubject[];
};

export type FieldKey = "unit" | "achievement" | "teaching" | "evaluation";

export type WeekPayload = Record<FieldKey, string>;

export type NormalizedWeek = {
  id: string;
  month: string;
  week: string;
  height: number;
  events: string[];
  payload: WeekPayload;
  sourceTableIndex?: number;
  sourceCellIndexes: {
    month?: number;
    week?: number;
    unit?: number;
    achievement?: number;
    teaching?: number;
    evaluation?: number;
    events: number[];
  };
};

export type NormalizedMonth = {
  month: string;
  weeks: NormalizedWeek[];
};

export type StoredOrders = Record<string, string[]>;
export type StoredEventLayouts = Record<string, Record<string, string[]>>;
