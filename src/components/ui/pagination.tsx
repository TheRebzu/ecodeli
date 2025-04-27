import { ButtonHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

interface PaginationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

function PaginationButton({ children, className, isActive, ...props }: PaginationButtonProps) {
  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="icon"
      className={cn('h-9 w-9', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Early return if there's only 1 page
  if (totalPages <= 1) {
    return null;
  }

  // Helper function to create a range array
  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // Calculate the range of pages to show
  const getPageRange = () => {
    const totalPageNumbers = siblingCount * 2 + 3; // siblingCount on each side + first + last + current

    // Case 1: If the number of pages is less than the page numbers we want to show
    if (totalPages <= totalPageNumbers) {
      return range(1, totalPages);
    }

    // Calculate left and right sibling index
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    // Show dots if there's a gap
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    // Case 2: No left dots, but right dots
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 1 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, -1, totalPages];
    }

    // Case 3: No right dots, but left dots
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 1 + 2 * siblingCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [1, -1, ...rightRange];
    }

    // Case 4: Both left and right dots
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, -1, ...middleRange, -1, totalPages];
    }

    return [];
  };

  const pageRange = getPageRange();

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <PaginationButton
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </PaginationButton>

      {pageRange.map((pageNumber, i) =>
        pageNumber === -1 ? (
          <Button key={`dots-${i}`} variant="outline" size="icon" className="h-9 w-9" disabled>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        ) : (
          <PaginationButton
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            isActive={pageNumber === currentPage}
            aria-label={`Go to page ${pageNumber}`}
          >
            {pageNumber}
          </PaginationButton>
        )
      )}

      <PaginationButton
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </PaginationButton>
    </div>
  );
}
