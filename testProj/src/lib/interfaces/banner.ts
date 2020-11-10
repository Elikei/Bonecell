export interface IFindIn {
  pageName: string;
}

export interface IFindOut {
  count: number;
  rows: Array<{
    [k: string]: any;
  }>;
  [k: string]: any;
}

export interface ISwiperIn {
  type: string;
  areaId: string;
}

export interface ISwiperOut {
  [k: string]: any;
}
