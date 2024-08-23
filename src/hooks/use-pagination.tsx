import { useUncontrolled } from './use-uncontrolled'
import { useMemo } from 'react'

const range = (start: number, end: number) => {
  const length = end - start + 1
  return Array.from({ length }, (_, index) => index + start)
}

export type usePaginationOptions = {
  // Page selected on initial render, defaults to 1
  initialPage?: number
  // Controlled active page number
  page?: number
  // Total amount of pages
  total: number
  // Siblings amount on left/right side of selected page, defaults to 1
  siblings?: number
  // Amount of elements visible on left/right edges, defaults to 1
  boundaries?: number
  // String to display as dots, defaults to '...'
  dots?: string
  // Callback fired after change of each page
  onChange?: (page: number) => void
}

export function usePagination(options: usePaginationOptions) {
  const {
    total,
    siblings = 1,
    boundaries = 1,
    page,
    dots = '...',
    initialPage = 1,
    onChange,
  } = options || {}

  const _total = Math.max(Math.trunc(total), 0)
  const [activePage, setActivePage] = useUncontrolled({
    value: page,
    onChange,
    defaultValue: initialPage,
    finalValue: initialPage,
  })

  const setPage = (pageNumber: number) => {
    if (pageNumber <= 0) {
      setActivePage(1)
    } else if (pageNumber > _total) {
      setActivePage(_total)
    } else {
      setActivePage(pageNumber)
    }
  }

  const next = () => setPage(activePage + 1)
  const previous = () => setPage(activePage - 1)
  const first = () => setPage(1)
  const last = () => setPage(_total)

  const paginationRange = useMemo((): (number | typeof dots)[] => {
    const totalPageNumbers = siblings * 2 + 3 + boundaries * 2
    if (totalPageNumbers >= _total) {
      return range(1, _total)
    }

    const leftSiblingIndex = Math.max(activePage - siblings, boundaries)
    const rightSiblingIndex = Math.min(
      activePage + siblings,
      _total - boundaries
    )

    const shouldShowLeftDots = leftSiblingIndex > boundaries + 2
    const shouldShowRightDots = rightSiblingIndex < _total - (boundaries + 1)

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = siblings * 2 + boundaries + 2
      return [
        ...range(1, leftItemCount),
        dots,
        ...range(_total - (boundaries - 1), _total),
      ]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = boundaries + 1 + 2 * siblings
      return [
        ...range(1, boundaries),
        dots,
        ...range(_total - rightItemCount, _total),
      ]
    }

    return [
      ...range(1, boundaries),
      dots,
      ...range(leftSiblingIndex, rightSiblingIndex),
      dots,
      ...range(_total - boundaries + 1, _total),
    ]
  }, [_total, siblings, activePage, boundaries, dots])

  return {
    range: paginationRange,
    active: activePage,
    setPage,
    next,
    previous,
    first,
    last,
  }
}
