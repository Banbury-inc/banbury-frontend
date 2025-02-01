import { Order } from '../types';

export function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
  return array
    .map((el, index) => ({ el, index }))
    .sort((a, b) => {
      const order = comparator(a.el, b.el);
      if (order !== 0) return order;
      return a.index - b.index;
    })
    .map(({ el }) => el);
}

export function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
} 