import { MappedFilter, QueryBuilderQuery } from '../types'
import { Logger } from './Logger'
import { isValidRegex } from '../utils'

export enum ComparisonQueryOperatorEnum {
  GREATER_THAN_EQUALS = '$gte',
  GREATER_THAN = '$gt',
  EQUALS = '$eq',
  IN = '$in',
  LESS_THAN = '$lt',
  LESS_THAN_EQUALS = '$lte',
  NOT_EQUALS = '$ne',
  NOT_IN = '$nin',
}

export enum EvaluationQueryOperatorEnum {
  REGEX = '$regex',
}

export enum LogicalQueryOperatorEnum {
  AND = '$and',
  NOT = '$not',
  NOR = '$nor',
  OR = '$or',
}

export enum ArrayQueryOperatorEnum {
  ALL = '$all',
}

export enum QueryBuilderErrors {
  MISSING_OPERATOR = 'You have to specify an operator',
  UNKNOWN_OPERATOR = 'Unknown operator passed',
  MISSING_FIELD = 'The filter query requires a field',
  MISSING_VALUE = 'The filter query requires a value',
  MISSING_FILTERS = 'No filters property was specified',
  NOT_A_NUMBER = 'This filter requires a number as value',
  NOT_AN_ARRAY = 'This filter requires an array as value',
  NOT_A_STRING = 'This filter requires a strinig as value',
  INVALID_REGEX = 'This is not a valid regular expression',
}

export class QueryBuilder {
  logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  buildAll(filters: QueryBuilderQuery[]): MappedFilter[] {
    return filters.map(this.build.bind(this)).filter(Boolean) as MappedFilter[]
  }

  build(filter: QueryBuilderQuery): MappedFilter | null {
    // throw an error if no operator is specified
    this.logger.debug('[QueryBuilder.build]: Received Filter', filter)
    if (filter.operator == null)
      throw new Error(QueryBuilderErrors.MISSING_OPERATOR)

    switch (filter.operator) {
      case LogicalQueryOperatorEnum.AND:
      case LogicalQueryOperatorEnum.NOR:
      case LogicalQueryOperatorEnum.OR:
        // throw an error if no filters are specified
        if (filter.filters == null)
          throw new Error(QueryBuilderErrors.MISSING_FILTERS)
        const childFilters = filter.filters
          .map((child) => this.build(child))
          .filter(Boolean) as MappedFilter[]
        // we do not want to add a logical filter with no children
        if (childFilters.length === 0) return null
        // we do not need a logical query for only one child --> return the child-query instead
        if (childFilters.length === 1) return childFilters[0]
        return {
          [filter.operator]: childFilters,
        }
      case LogicalQueryOperatorEnum.NOT:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        const mappedFilter = this.build({
          ...filter.filter,
          field: filter.field,
        })
        return mappedFilter
          ? {
              [LogicalQueryOperatorEnum.NOT]: mappedFilter,
            }
          : null
      case ComparisonQueryOperatorEnum.EQUALS:
      case ComparisonQueryOperatorEnum.NOT_EQUALS:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value && filter.value !== null)
          throw new Error(QueryBuilderErrors.MISSING_VALUE)
        // if array is empty we will invalidate this query
        if (Array.isArray(filter.value) && filter.value.length === 0)
          return null
        return {
          [filter.field]: {
            [filter.operator]: filter.value,
          },
        }
      case ComparisonQueryOperatorEnum.GREATER_THAN:
      case ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS:
      case ComparisonQueryOperatorEnum.LESS_THAN:
      case ComparisonQueryOperatorEnum.LESS_THAN_EQUALS:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        return {
          [filter.field]: {
            [filter.operator]: filter.value,
          },
        }
      case EvaluationQueryOperatorEnum.REGEX:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        // throw an error if not a string
        if (typeof filter.value !== 'string')
          throw new Error(QueryBuilderErrors.NOT_A_STRING)
        // throw error if regex is invalid
        if (filter.validateRegex !== false && !isValidRegex(filter.value))
          throw new Error(QueryBuilderErrors.INVALID_REGEX)
        return {
          [filter.field]: {
            [filter.operator]: filter.value,
          },
        }
      case ComparisonQueryOperatorEnum.IN:
      case ComparisonQueryOperatorEnum.NOT_IN:
      case ArrayQueryOperatorEnum.ALL:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        if (!Array.isArray(filter.value))
          throw new Error(QueryBuilderErrors.NOT_AN_ARRAY)
        return {
          [filter.field]: {
            [filter.operator]: filter.value,
          },
        }
      default:
        throw new Error(QueryBuilderErrors.UNKNOWN_OPERATOR)
    }
  }
}
