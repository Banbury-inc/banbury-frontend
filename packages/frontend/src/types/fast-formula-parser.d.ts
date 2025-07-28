declare module 'fast-formula-parser' {
  export interface FormulaParserConfig {
    isColumnAbsolute?: boolean;
    isRowAbsolute?: boolean;
    ignoreCase?: boolean;
    allowMultipleReferences?: boolean;
  }

  export default class FormulaParser {
    constructor(config?: FormulaParserConfig);
    parse(formula: string, position?: { row: number; col: number }): any;
    getDepCells(formula: string, position?: { row: number; col: number }): any[];
  }
} 