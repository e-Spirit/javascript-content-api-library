export enum ComparisonQueryOperatorEnum {
  GREATER_THAN_EQUALS = '$gte',
  GREATER_THAN = '$gt',
  EQUALS = '$eq',
  IN = '$in',
  LESS_THAN = '$lt',
  LESS_THAN_EQUALS = '$lte',
  NOT_EQUALS = '$ne',
  NOT_IN = '$nin'
}
export type ComparisonFilterValue = string | number | RegExp

export type ComparisonFilter =
  | {
      field: string
      operator:
        | ComparisonQueryOperatorEnum.GREATER_THAN
        | ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS
        | ComparisonQueryOperatorEnum.LESS_THAN
        | ComparisonQueryOperatorEnum.LESS_THAN_EQUALS
      value: number
    }
  | {
      field: string
      operator: ComparisonQueryOperatorEnum.IN | ComparisonQueryOperatorEnum.NOT_IN
      value: ComparisonFilterValue[]
    }
  | {
      field: string
      operator: ComparisonQueryOperatorEnum.EQUALS | ComparisonQueryOperatorEnum.NOT_EQUALS
      value: ComparisonFilterValue | ComparisonFilterValue[]
    }

export enum LogicalQueryOperatorEnum {
  AND = '$and',
  NOT = '$not',
  NOR = '$nor',
  OR = '$or'
}

export type LogicalFilter =
  | {
      operator: LogicalQueryOperatorEnum.AND
      filters: (LogicalFilter | ComparisonFilter)[]
    }
  | {
      field: string
      operator: LogicalQueryOperatorEnum.NOT
      filter: {
        operator: ComparisonQueryOperatorEnum
        value: any
      }
    }
  | {
      operator: LogicalQueryOperatorEnum.NOR
      filters: (LogicalFilter | ComparisonFilter)[]
    }
  | {
      operator: LogicalQueryOperatorEnum.OR
      filters: (LogicalFilter | ComparisonFilter)[]
    }

export enum ArrayQueryOperatorEnum {
  ALL = '$all'
}

export type ArrayFilter = {
  field: string
  operator: ArrayQueryOperatorEnum.ALL
  value: string[] | number[]
}

export type QueryBuilderQuery = LogicalFilter | ComparisonFilter | ArrayFilter

export enum QueryBuilderErrors {
  MISSING_OPERATOR = 'You have to specify an operator',
  UNKNOWN_OPERATOR = 'Unknown operator passed',
  MISSING_FIELD = 'The filter query requires a field',
  MISSING_VALUE = 'The filter query requires a value',
  MISSING_FILTERS = 'No filters property was specified',
  NOT_A_NUMBER = 'This filter requires a number as value',
  NOT_AN_ARRAY = 'This filter requires an array as value'
}
export interface MappedFilter {
  [key: string]: MappedFilter | MappedFilter[] | ComparisonFilterValue | ComparisonFilterValue[]
}
