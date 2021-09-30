import {
  QueryBuilder,
  ArrayQueryOperatorEnum,
  ComparisonQueryOperatorEnum,
  LogicalQueryOperatorEnum,
  QueryBuilderErrors,
  Logger,
  LogLevel,
} from '.'
import { MappedFilter } from '../types'

const builder = new QueryBuilder(new Logger(LogLevel.NONE, 'Querybuilder'))
const foobar = 'foobar'

describe('QueryBuilder', () => {
  describe('build', () => {
    it('should throw an error if no operator is provided', () => {
      expect(() =>
        builder.build({
          field: 'foo.bar',
          // @ts-ignore
          value: 'foobar',
        })
      ).toThrow(QueryBuilderErrors.MISSING_OPERATOR)
    })

    it('should throw an error if no known operator is provided', () => {
      expect(() =>
        builder.build({
          field: 'foo.bar',
          // @ts-ignore
          operator: 'foobar',
        })
      ).toThrow(QueryBuilderErrors.UNKNOWN_OPERATOR)
    })

    describe(LogicalQueryOperatorEnum.AND, () => {
      it('should return null if no child-filters are passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.AND,
            filters: [],
          })
        ).toEqual(null)
      })

      it('should return child query directly if only one child-filter is passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.AND,
            filters: [
              {
                operator: ComparisonQueryOperatorEnum.EQUALS,
                field: 'foo.bar',
                value: 'foobar',
              },
            ],
          })
        ).toEqual({ 'foo.bar': { [ComparisonQueryOperatorEnum.EQUALS]: 'foobar' } })
      })

      it('should return filter array if two or more child filters are passed', () => {
        const filter = builder.build({
          operator: LogicalQueryOperatorEnum.AND,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
          ],
        })
        expect(filter).toBeTruthy()
        expect(Array.isArray(filter![LogicalQueryOperatorEnum.AND])).toBe(true)
      })

      it('should throw an error if no filters are provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: LogicalQueryOperatorEnum.AND,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FILTERS)
      })
    })

    describe(LogicalQueryOperatorEnum.NOR, () => {
      it('should return null if no child-filters are passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.NOR,
            filters: [],
          })
        ).toEqual(null)
      })

      it('should return child query directly if only one child-filter is passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.NOR,
            filters: [
              {
                operator: ComparisonQueryOperatorEnum.EQUALS,
                field: 'foo.bar',
                value: 'foobar',
              },
            ],
          })
        ).toEqual({ 'foo.bar': { [ComparisonQueryOperatorEnum.EQUALS]: 'foobar' } })
      })

      it('should return filter array if two or more child filters are passed', () => {
        const filter = builder.build({
          operator: LogicalQueryOperatorEnum.NOR,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
          ],
        })
        expect(filter).toBeTruthy()
        expect(Array.isArray(filter![LogicalQueryOperatorEnum.NOR])).toBe(true)
      })

      it('should throw an error if no filters are provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: LogicalQueryOperatorEnum.NOR,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FILTERS)
      })
    })

    describe(LogicalQueryOperatorEnum.OR, () => {
      it('should return null if no child-filters are passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.OR,
            filters: [],
          })
        ).toEqual(null)
      })

      it('should return child query directly if only one child-filter is passed', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.OR,
            filters: [
              {
                operator: ComparisonQueryOperatorEnum.EQUALS,
                field: 'foo.bar',
                value: 'foobar',
              },
            ],
          })
        ).toEqual({ 'foo.bar': { [ComparisonQueryOperatorEnum.EQUALS]: 'foobar' } })
      })

      it('should return filter array if two or more child filters are passed', () => {
        const filter = builder.build({
          operator: LogicalQueryOperatorEnum.OR,
          filters: [
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
            {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              field: 'foo.bar',
              value: 'foobar',
            },
          ],
        })
        expect(filter).toBeTruthy()
        expect(Array.isArray(filter![LogicalQueryOperatorEnum.OR])).toBe(true)
      })

      it('should throw an error if no filters are provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: LogicalQueryOperatorEnum.OR,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FILTERS)
      })
    })

    describe(LogicalQueryOperatorEnum.NOT, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          builder.build({
            operator: LogicalQueryOperatorEnum.NOT,
            // @ts-ignore
            filter: {},
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should return null if child query is null', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.NOT,
            field: 'foo.bar',
            filter: {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: [],
            },
          })
        ).toBe(null)
      })

      it('should return the mapped query', () => {
        expect(
          builder.build({
            operator: LogicalQueryOperatorEnum.NOT,
            field: 'foo.bar',
            filter: {
              operator: ComparisonQueryOperatorEnum.EQUALS,
              value: 'foobar',
            },
          })
        ).toEqual({
          [LogicalQueryOperatorEnum.NOT]: {
            'foo.bar': {
              [ComparisonQueryOperatorEnum.EQUALS]: 'foobar',
            },
          },
        })
      })
    })

    describe(ComparisonQueryOperatorEnum.EQUALS, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.EQUALS,
            value: 'foobar',
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.EQUALS,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should return null if an empty array is passed as value', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.EQUALS,
            value: [],
            field: foobar,
          })
        ).toBe(null)
      })

      it('should return single value if no array is passed', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: 'foo',
          field: foobar,
        })
        expect(filter).toBeTruthy()
        expect(
          (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.EQUALS as string]
        ).toBe('foo')
      })

      it('should return an array as value if array is passed', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.EQUALS,
          value: ['foo', 'bar'],
          field: foobar,
        })
        expect(filter).toBeTruthy()
        expect(
          Array.isArray(
            (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.EQUALS as string]
          )
        ).toBe(true)
      })
    })

    describe(ComparisonQueryOperatorEnum.NOT_EQUALS, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_EQUALS,
            value: 'foobar',
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_EQUALS,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should return null if an empty array is passed as value', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_EQUALS,
            value: [],
            field: foobar,
          })
        ).toBe(null)
      })

      it('should return single value if no array is passed', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.NOT_EQUALS,
          value: 'foo',
          field: foobar,
        })
        expect(filter).toBeTruthy()
        expect(
          (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.NOT_EQUALS as string]
        ).toBe('foo')
      })

      it('should return an array as value if array is passed', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.NOT_EQUALS,
          value: ['foo', 'bar'],
          field: foobar,
        })
        expect(filter).toBeTruthy()
        expect(
          Array.isArray(
            (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.NOT_EQUALS as string]
          )
        ).toBe(true)
      })
    })

    describe(ComparisonQueryOperatorEnum.GREATER_THAN, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN,
            value: 2,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no valid number is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_A_NUMBER)
      })

      it('should return the correct value', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.GREATER_THAN,
          field: foobar,
          value: 2,
        })
        expect(filter).toBeTruthy()
        expect(
          (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.GREATER_THAN]
        ).toEqual(2)
      })
    })

    describe(ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS,
            value: 2,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no valid number is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_A_NUMBER)
      })

      it('should return the correct value', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS,
          field: foobar,
          value: 2,
        })
        expect(filter).toBeTruthy()
        expect(
          (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.GREATER_THAN_EQUALS]
        ).toEqual(2)
      })
    })

    describe(ComparisonQueryOperatorEnum.LESS_THAN, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN,
            value: 2,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no valid number is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_A_NUMBER)
      })

      it('should return the correct value', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.LESS_THAN,
          field: foobar,
          value: 2,
        })
        expect(filter).toBeTruthy()
        expect((filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.LESS_THAN]).toEqual(
          2
        )
      })
    })

    describe(ComparisonQueryOperatorEnum.LESS_THAN_EQUALS, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN_EQUALS,
            value: 2,
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN_EQUALS,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no valid number is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.LESS_THAN_EQUALS,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_A_NUMBER)
      })

      it('should return the correct value', () => {
        const filter = builder.build({
          operator: ComparisonQueryOperatorEnum.LESS_THAN_EQUALS,
          field: foobar,
          value: 2,
        })
        expect(filter).toBeTruthy()
        expect(
          (filter!['foobar'] as MappedFilter)[ComparisonQueryOperatorEnum.LESS_THAN_EQUALS]
        ).toEqual(2)
      })
    })

    describe(ComparisonQueryOperatorEnum.IN, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.IN,
            value: [],
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.IN,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no array is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.IN,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_AN_ARRAY)
      })

      it('should return a query which includes an empty array', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.IN,
            value: [],
            field: foobar,
          })
        ).toEqual({ foobar: { $in: [] } })
      })

      it('should return the correct markup', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.IN,
            value: ['foo', 'bar'],
            field: foobar,
          })
        ).toEqual({
          foobar: {
            [ComparisonQueryOperatorEnum.IN]: ['foo', 'bar'],
          },
        })
      })
    })

    describe(ComparisonQueryOperatorEnum.NOT_IN, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_IN,
            value: [],
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_IN,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no array is provided', () => {
        expect(() =>
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_IN,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_AN_ARRAY)
      })

      it('should return an empty array if an empty array is passed', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_IN,
            value: [],
            field: foobar,
          })
        ).toEqual({ foobar: { $nin: [] } })
      })

      it('should return the correct markup', () => {
        expect(
          builder.build({
            operator: ComparisonQueryOperatorEnum.NOT_IN,
            value: ['foo', 'bar'],
            field: foobar,
          })
        ).toEqual({
          foobar: {
            [ComparisonQueryOperatorEnum.NOT_IN]: ['foo', 'bar'],
          },
        })
      })
    })

    describe(ArrayQueryOperatorEnum.ALL, () => {
      it('should throw an error if no field is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ArrayQueryOperatorEnum.ALL,
            value: [],
          })
        ).toThrow(QueryBuilderErrors.MISSING_FIELD)
      })

      it('should throw an error if no value is provided', () => {
        expect(() =>
          // @ts-ignore
          builder.build({
            operator: ArrayQueryOperatorEnum.ALL,
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.MISSING_VALUE)
      })

      it('should throw an error if no array is provided', () => {
        expect(() =>
          builder.build({
            operator: ArrayQueryOperatorEnum.ALL,
            // @ts-ignore
            value: 'foobar',
            field: foobar,
          })
        ).toThrow(QueryBuilderErrors.NOT_AN_ARRAY)
      })

      it('should return an empty array if an empty array is passed', () => {
        expect(
          builder.build({
            operator: ArrayQueryOperatorEnum.ALL,
            value: [],
            field: foobar,
          })
        ).toEqual({ foobar: { $all: [] } })
      })

      it('should return the correct markup', () => {
        expect(
          builder.build({
            operator: ArrayQueryOperatorEnum.ALL,
            value: ['foo', 'bar'],
            field: foobar,
          })
        ).toEqual({
          foobar: {
            [ArrayQueryOperatorEnum.ALL]: ['foo', 'bar'],
          },
        })
      })
    })
  })
})
