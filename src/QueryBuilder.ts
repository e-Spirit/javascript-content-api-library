import {
  ArrayQueryOperatorEnum,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum,
  MappedFilter,
  QueryBuilderErrors,
  QueryBuilderQuery
} from './types/QueryBuilder'

class QueryBuilder {
  buildAll(filters: QueryBuilderQuery[]): MappedFilter[] {
    return filters.map(this.build).filter(Boolean) as MappedFilter[]
  }

  build(filter: QueryBuilderQuery): MappedFilter | null {
    // throw an error if no operator is specified
    if (filter.operator == null) throw new Error(QueryBuilderErrors.MISSING_OPERATOR)

    switch (filter.operator) {
      case LogicalQueryOperatorEnum.AND:
      case LogicalQueryOperatorEnum.NOR:
      case LogicalQueryOperatorEnum.OR:
        // throw an error if no filters are specified
        if (filter.filters == null) throw new Error(QueryBuilderErrors.MISSING_FILTERS)
        const childFilters = filter.filters
          .map(child => this.build(child))
          .filter(Boolean) as MappedFilter[]
        // we do not want to add a logical filter with no children
        if (childFilters.length === 0) return null
        // we do not need a logical query for only one child --> return the child-query instead
        if (childFilters.length === 1) return childFilters[0]
        return {
          [filter.operator]: childFilters
        }
      case LogicalQueryOperatorEnum.NOT:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        const mappedFilter = this.build({
          ...filter.filter,
          field: filter.field
        })
        return mappedFilter
          ? {
              [LogicalQueryOperatorEnum.NOT]: mappedFilter
            }
          : null
      case ComparisonQueryOperatorEnum.EQUALS:
      case ComparisonQueryOperatorEnum.NOT_EQUALS:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        // if array is empty we will invalidate this query
        if (Array.isArray(filter.value) && filter.value.length === 0) return null
        return {
          [filter.field]: {
            [filter.operator]: filter.value
          }
        }
      case ComparisonQueryOperatorEnum.GREATER_THAN:
      case ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS:
      case ComparisonQueryOperatorEnum.LESS_THAN:
      case ComparisonQueryOperatorEnum.LESS_THAN_EQUALS:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        // throw an error if value is not a number
        if (isNaN(filter.value)) throw new Error(QueryBuilderErrors.NOT_A_NUMBER)
        return {
          [filter.field]: {
            [filter.operator]: filter.value
          }
        }
      case ComparisonQueryOperatorEnum.IN:
      case ComparisonQueryOperatorEnum.NOT_IN:
      case ArrayQueryOperatorEnum.ALL:
        if (!filter.field) throw new Error(QueryBuilderErrors.MISSING_FIELD)
        if (!filter.value) throw new Error(QueryBuilderErrors.MISSING_VALUE)
        if (!Array.isArray(filter.value)) throw new Error(QueryBuilderErrors.NOT_AN_ARRAY)
        // if array is empty we will invalidate this query
        if (filter.value.length === 0) return null
        return {
          [filter.field]: {
            [filter.operator]: filter.value
          }
        }
    }
    throw new Error(QueryBuilderErrors.UNKNOWN_OPERATOR)
  }
}
export default QueryBuilder
